#!/usr/bin/env python3
"""Read Fantasy match-level statistics from SportsGamer in read-only mode.

The source schema has changed over SportsGamer/NHLGamer generations, so this
exporter discovers the best match-level skater and goalie tables at runtime.
It never writes to SportsGamer.
"""

from __future__ import annotations

import csv
import json
import os
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

import pymysql

LEAGUE_ID = int(os.environ.get("LEAGUE_ID", "447"))
MATCH_OUTPUT = Path(os.environ.get("MATCH_OUTPUT", "/tmp/fantasy_matches.csv"))
PLAYER_OUTPUT = Path(os.environ.get("PLAYER_OUTPUT", "/tmp/fantasy_match_player_stats.csv"))

POSITIONS = {
    1: ("LW", "F"),
    2: ("C", "F"),
    3: ("RW", "F"),
    4: ("LD", "D"),
    5: ("RD", "D"),
    6: ("G", "G"),
}

MATCH_FIELDS = [
    "source_league_id", "source_match_id", "match_type", "started_at",
    "team1_id", "team2_id", "team1_score", "team2_score", "raw_match",
]
PLAYER_FIELDS = [
    "source_league_id", "source_match_id", "source_team_id", "source_player_id",
    "match_type", "played_position", "scoring_role", "skater_games",
    "goals", "assists", "game_winning_goals", "blocked_shots",
    "goalie_games", "goalie_wins", "goalie_saves", "goalie_goals_allowed",
    "goalie_shutouts", "goalie_goals", "goalie_assists", "fantasy_points",
    "raw_stats",
]


def required(name: str) -> str:
    value = (os.environ.get(name) or "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def integer(value: Any) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def number(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def chunks(values: list[int], size: int = 300) -> Iterable[list[int]]:
    for start in range(0, len(values), size):
        yield values[start:start + size]


def safe_identifier(value: str) -> str:
    if not re.fullmatch(r"[A-Za-z0-9_]+", value):
        raise RuntimeError(f"Unsafe SportsGamer identifier: {value}")
    return f"`{value}`"


def select(connection: Any, sql: str, parameters: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    if not re.match(r"^\s*select\b", sql, re.I):
        raise RuntimeError("Safety stop: only SELECT statements are allowed on SportsGamer")
    with connection.cursor() as cursor:
        cursor.execute(sql, parameters)
        return list(cursor.fetchall())


def lower_map(row: dict[str, Any]) -> dict[str, Any]:
    return {str(k).lower(): v for k, v in row.items()}


def first(row: dict[str, Any], *names: str) -> Any:
    low = lower_map(row)
    for name in names:
        if name.lower() in low and low[name.lower()] is not None:
            return low[name.lower()]
    return None


def table_inventory(connection: Any) -> dict[str, list[str]]:
    db = select(connection, "select database() as db")[0]["db"]
    rows = select(
        connection,
        """
        select
          table_name as detected_table_name,
          column_name as detected_column_name
        from information_schema.columns
        where table_schema=%s
        order by table_name, ordinal_position
        """,
        (db,),
    )
    result: dict[str, list[str]] = defaultdict(list)
    for row in rows:
        result[str(row["detected_table_name"])].append(str(row["detected_column_name"]))
    return dict(result)


def candidate_score(table: str, columns: list[str], role: str) -> int:
    names = {c.lower() for c in columns}
    if not {"matchid", "playerid"}.issubset(names):
        return -1
    if table.lower() == "nhlgamer_participants":
        return -1

    score = 0
    if "teamid" in names:
        score += 3
    if "leagueid" in names:
        score += 2
    if "positionid" in names:
        score += 5

    if role == "skater":
        for key in ("goals", "assists", "blockedshots", "gamewinninggoals", "shots", "hits"):
            if key in names:
                score += 2
        if not ({"goals", "assists"} & names):
            return -1
    else:
        for key in ("saves", "goalsallowed", "shotsagainst", "shutouts", "wins"):
            if key in names:
                score += 3
        if not ({"saves", "goalsallowed", "shotsagainst"} & names):
            return -1

    lname = table.lower()
    if "match" in lname or "game" in lname:
        score += 5
    if role == "goalie" and "goalie" in lname:
        score += 5
    if role == "skater" and ("player" in lname or "skater" in lname):
        score += 3
    return score


def fetch_for_matches(connection: Any, table: str, match_ids: list[int]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    table_sql = safe_identifier(table)
    for part in chunks(match_ids, 200):
        placeholders = ",".join(["%s"] * len(part))
        rows.extend(select(connection, f"select * from {table_sql} where matchID in ({placeholders})", tuple(part)))
    return rows


def choose_source(
    connection: Any,
    inventory: dict[str, list[str]],
    match_ids: list[int],
    role: str,
) -> tuple[str | None, list[dict[str, Any]], list[dict[str, Any]]]:
    diagnostics: list[dict[str, Any]] = []
    candidates = sorted(
        (
            (candidate_score(table, columns, role), table)
            for table, columns in inventory.items()
        ),
        reverse=True,
    )

    best_table: str | None = None
    best_rows: list[dict[str, Any]] = []
    best_quality = -1

    for schema_score, table in candidates:
        if schema_score < 0:
            continue
        try:
            rows = fetch_for_matches(connection, table, match_ids)
        except Exception as exc:
            diagnostics.append({"table": table, "schema_score": schema_score, "error": str(exc)})
            continue

        usable = [
            row for row in rows
            if integer(first(row, "matchID")) > 0 and integer(first(row, "playerID")) > 0
        ]
        quality = schema_score * 100000 + len(usable)
        diagnostics.append({
            "table": table,
            "schema_score": schema_score,
            "rows_for_league_matches": len(usable),
        })
        if usable and quality > best_quality:
            best_quality = quality
            best_table = table
            best_rows = usable

    return best_table, best_rows, diagnostics


def match_table_source(
    connection: Any,
    inventory: dict[str, list[str]],
    match_ids: list[int],
) -> tuple[str | None, dict[int, dict[str, Any]]]:
    ranked: list[tuple[int, str]] = []
    for table, columns in inventory.items():
        names = {c.lower() for c in columns}
        if "matchid" not in names:
            continue
        score = 0
        if "leagueid" in names:
            score += 4
        if {"team1id", "team2id"}.issubset(names) or {"hometeamid", "awayteamid"}.issubset(names):
            score += 5
        if any(k in names for k in ("matchdate", "starttime", "datetime", "date")):
            score += 2
        if "match" in table.lower():
            score += 3
        ranked.append((score, table))

    for _, table in sorted(ranked, reverse=True):
        try:
            rows = fetch_for_matches(connection, table, match_ids)
        except Exception:
            continue
        by_id = {integer(first(row, "matchID")): row for row in rows if integer(first(row, "matchID")) > 0}
        if by_id:
            return table, by_id
    return None, {}


def json_safe(row: dict[str, Any]) -> str:
    return json.dumps(row, ensure_ascii=False, default=str, separators=(",", ":"))


def calculate_points(row: dict[str, Any]) -> float:
    role = row["scoring_role"]
    if role == "G":
        return round(
            row["goalie_games"] * 1
            + row["goalie_wins"] * 6
            + row["goalie_saves"] * 0.35
            - row["goalie_goals_allowed"] * 0.50
            + row["goalie_shutouts"] * 8
            + row["goalie_goals"] * 10
            + row["goalie_assists"] * 5,
            2,
        )
    if role == "D":
        return round(
            row["skater_games"] * 1
            + row["goals"] * 6
            + row["assists"] * 4
            + row["game_winning_goals"] * 2
            + row["blocked_shots"] * 0.25,
            2,
        )
    return round(
        row["skater_games"] * 1
        + row["goals"] * 5
        + row["assists"] * 3
        + row["game_winning_goals"] * 2,
        2,
    )


def main() -> int:
    via_ssh = bool((os.environ.get("SSH_HOST") or "").strip())
    connection = pymysql.connect(
        host="127.0.0.1" if via_ssh else required("DB_HOST"),
        port=int(os.environ.get("SSH_LOCAL_DB_PORT") or "3307") if via_ssh else int(os.environ.get("DB_PORT") or "3306"),
        user=required("DB_USER"),
        password=required("DB_PASSWORD"),
        database=required("DB_NAME"),
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        connect_timeout=20,
        read_timeout=300,
        write_timeout=10,
        autocommit=True,
        init_command="SET SESSION TRANSACTION READ ONLY",
    )

    try:
        participants = select(
            connection,
            """
            select matchID,matchType,leagueID,teamID,playerID,totalIceTimeInSeconds
            from nhlgamer_participants
            where leagueID=%s
            """,
            (LEAGUE_ID,),
        )
        participants = [
            row for row in participants
            if integer(row.get("matchID")) > 0 and integer(row.get("playerID")) > 0
        ]
        if not participants:
            raise RuntimeError(f"No participant rows found for SportsGamer league {LEAGUE_ID}")

        match_ids = sorted({integer(row["matchID"]) for row in participants})
        inventory = table_inventory(connection)

        skater_table, skater_rows, skater_diag = choose_source(
            connection, inventory, match_ids, "skater"
        )
        goalie_table, goalie_rows, goalie_diag = choose_source(
            connection, inventory, match_ids, "goalie"
        )
        match_table, raw_matches = match_table_source(connection, inventory, match_ids)

        print("=== MATCH-LEVEL SOURCE DISCOVERY ===")
        print(f"League: {LEAGUE_ID}")
        print(f"Participants: {len(participants)} rows / {len(match_ids)} matches")
        print(f"Skater source: {skater_table or 'NOT FOUND'} ({len(skater_rows)} rows)")
        print(f"Goalie source: {goalie_table or 'NOT FOUND'} ({len(goalie_rows)} rows)")
        print(f"Match source: {match_table or 'participant fallback'}")
        print("Skater candidates:", json.dumps(skater_diag[:15], ensure_ascii=False))
        print("Goalie candidates:", json.dumps(goalie_diag[:15], ensure_ascii=False))

        if not skater_table or not skater_rows:
            raise RuntimeError(
                "Could not find a SportsGamer table containing per-match skater position/statistics. "
                "Discovery diagnostics are printed above."
            )

        participant_by_pair: dict[tuple[int, int], list[dict[str, Any]]] = defaultdict(list)
        for row in participants:
            participant_by_pair[(integer(row["matchID"]), integer(row["playerID"]))].append(row)

        skater_by_pair: dict[tuple[int, int], list[dict[str, Any]]] = defaultdict(list)
        for row in skater_rows:
            skater_by_pair[(integer(first(row, "matchID")), integer(first(row, "playerID")))].append(row)

        goalie_by_pair: dict[tuple[int, int], list[dict[str, Any]]] = defaultdict(list)
        for row in goalie_rows:
            goalie_by_pair[(integer(first(row, "matchID")), integer(first(row, "playerID")))].append(row)

        player_rows: list[dict[str, Any]] = []
        used_pairs: set[tuple[int, int, int]] = set()

        for participant in participants:
            match_id = integer(participant["matchID"])
            player_id = integer(participant["playerID"])
            team_id = integer(participant["teamID"])
            unique_key = (match_id, team_id, player_id)
            if unique_key in used_pairs:
                continue
            used_pairs.add(unique_key)

            skaters = skater_by_pair.get((match_id, player_id), [])
            goalies = goalie_by_pair.get((match_id, player_id), [])

            def same_team(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
                exact = [r for r in rows if integer(first(r, "teamID")) == team_id]
                return exact or rows

            skater = same_team(skaters)[0] if skaters else {}
            goalie = same_team(goalies)[0] if goalies else {}

            position_id = integer(first(skater, "positionID", "position"))
            if not position_id and goalie:
                position_id = 6
            position, role = POSITIONS.get(position_id, (None, None))

            # A participant without a match-stat row is kept for diagnostics but
            # is not scored until an actual role can be determined.
            if not role:
                continue

            is_goalie = role == "G" or bool(goalie and not skater)
            if is_goalie:
                role = "G"
                position = "G"

            row = {
                "source_league_id": LEAGUE_ID,
                "source_match_id": match_id,
                "source_team_id": team_id,
                "source_player_id": player_id,
                "match_type": str(participant.get("matchType") or ""),
                "played_position": position,
                "scoring_role": role,
                "skater_games": 0 if role == "G" else 1,
                "goals": integer(first(skater, "goals")) if role != "G" else 0,
                "assists": integer(first(skater, "assists")) if role != "G" else 0,
                "game_winning_goals": integer(first(skater, "gameWinningGoals", "gameWinningGoal")) if role != "G" else 0,
                "blocked_shots": integer(first(skater, "blockedShots")) if role != "G" else 0,
                "goalie_games": 1 if role == "G" else 0,
                "goalie_wins": integer(first(goalie, "wins", "win")) if role == "G" else 0,
                "goalie_saves": integer(first(goalie, "saves")) if role == "G" else 0,
                "goalie_goals_allowed": integer(first(goalie, "goalsAllowed", "goalsAgainst")) if role == "G" else 0,
                "goalie_shutouts": integer(first(goalie, "shutouts", "shutout")) if role == "G" else 0,
                "goalie_goals": integer(first(goalie, "goals")) if role == "G" else 0,
                "goalie_assists": integer(first(goalie, "assists")) if role == "G" else 0,
                "fantasy_points": 0.0,
                "raw_stats": json_safe({
                    "participant": participant,
                    "skater": skater or None,
                    "goalie": goalie or None,
                    "skater_source_table": skater_table,
                    "goalie_source_table": goalie_table,
                }),
            }
            row["fantasy_points"] = calculate_points(row)
            player_rows.append(row)

        if not player_rows:
            raise RuntimeError("Match-level source was found, but no scoreable player rows could be built")

        # Build match rows even when the dedicated match table cannot be found.
        match_rows: list[dict[str, Any]] = []
        participant_match_types: dict[int, str] = {}
        participant_teams: dict[int, list[int]] = defaultdict(list)
        for p in participants:
            mid = integer(p["matchID"])
            participant_match_types[mid] = str(p.get("matchType") or "")
            tid = integer(p["teamID"])
            if tid and tid not in participant_teams[mid]:
                participant_teams[mid].append(tid)

        for match_id in match_ids:
            raw = raw_matches.get(match_id, {})
            teams = participant_teams.get(match_id, [])
            started = first(raw, "startTime", "matchDate", "dateTime", "datetime", "date", "scheduledTime")
            if isinstance(started, datetime):
                if started.tzinfo is None:
                    started = started.replace(tzinfo=timezone.utc)
                started = started.isoformat()

            match_rows.append({
                "source_league_id": LEAGUE_ID,
                "source_match_id": match_id,
                "match_type": str(first(raw, "matchType") or participant_match_types.get(match_id) or ""),
                "started_at": started or "",
                "team1_id": integer(first(raw, "team1ID", "homeTeamID", "teamHomeID")) or (teams[0] if teams else ""),
                "team2_id": integer(first(raw, "team2ID", "awayTeamID", "teamAwayID")) or (teams[1] if len(teams) > 1 else ""),
                "team1_score": first(raw, "team1Score", "homeScore", "score1") or "",
                "team2_score": first(raw, "team2Score", "awayScore", "score2") or "",
                "raw_match": json_safe({
                    "source_table": match_table,
                    "row": raw or None,
                }),
            })

    finally:
        connection.close()

    MATCH_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with MATCH_OUTPUT.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=MATCH_FIELDS)
        writer.writeheader()
        writer.writerows(match_rows)

    with PLAYER_OUTPUT.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=PLAYER_FIELDS)
        writer.writeheader()
        writer.writerows(player_rows)

    print(f"Fantasy export complete: {len(match_rows)} matches, {len(player_rows)} player-match rows.")
    output = os.environ.get("GITHUB_OUTPUT")
    if output:
        with open(output, "a", encoding="utf-8") as handle:
            handle.write(f"match_count={len(match_rows)}\n")
            handle.write(f"player_row_count={len(player_rows)}\n")
            handle.write(f"skater_source={skater_table or ''}\n")
            handle.write(f"goalie_source={goalie_table or ''}\n")
            handle.write(f"match_source={match_table or ''}\n")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"Fantasy SportsGamer export failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
