#!/usr/bin/env python3
"""Export the current SportsGamer league roster for an eHockey Fantasy pool.

Read-only by design: every statement sent to SportsGamer is SELECT-only.
The exporter discovers roster/player/team columns at runtime because the
SportsGamer schema has changed between NHLGamer generations.
"""

from __future__ import annotations

import csv
import json
import os
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Iterable

import pymysql


def parse_league_ids() -> list[int]:
    raw = (os.environ.get("LEAGUE_IDS") or os.environ.get("LEAGUE_ID") or "").strip()
    values: list[int] = []
    for part in re.split(r"[\s,;]+", raw):
        if not part:
            continue
        value = int(part)
        if value <= 0:
            raise RuntimeError(f"Invalid SportsGamer league ID: {value}")
        if value not in values:
            values.append(value)
    if not values:
        raise RuntimeError("At least one SportsGamer league ID is required")
    if len(values) > 10:
        raise RuntimeError("A maximum of 10 SportsGamer league IDs is supported")
    return values


LEAGUE_IDS = parse_league_ids()
POOL_OUTPUT = Path(os.environ.get("POOL_OUTPUT", "/tmp/fantasy_player_pool.csv"))

POOL_FIELDS = [
    "source_league_id",
    "source_team_id",
    "source_player_id",
    "display_gamertag",
    "team_name",
    "country_code",
    "primary_position",
    "eligible_slots",
    "team_logo_url",
    "raw_player",
]

POSITION_IDS = {
    1: "LW",
    2: "C",
    3: "RW",
    4: "LD",
    5: "RD",
    6: "G",
}


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
    return {str(key).lower(): value for key, value in row.items()}


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
        select table_name as detected_table_name, column_name as detected_column_name
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


def fetch_by_ids(
    connection: Any,
    table: str,
    id_column: str,
    values: list[int],
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    table_sql = safe_identifier(table)
    column_sql = safe_identifier(id_column)
    for part in chunks(values):
        placeholders = ",".join(["%s"] * len(part))
        rows.extend(
            select(
                connection,
                f"select * from {table_sql} where {column_sql} in ({placeholders})",
                tuple(part),
            )
        )
    return rows


def column_name(columns: list[str], *candidates: str) -> str | None:
    low = {column.lower(): column for column in columns}
    for candidate in candidates:
        if candidate.lower() in low:
            return low[candidate.lower()]
    return None


def choose_roster_source(
    connection: Any,
    inventory: dict[str, list[str]],
) -> tuple[str, list[dict[str, Any]], str]:
    # Common SportsGamer layout: leagueRosters points at leagueTeams through
    # leagueTeamID, while leagueTeams carries the actual leagueID/teamID.
    roster_columns = inventory.get("nhlgamer_leagueRosters", [])
    league_team_columns = inventory.get("nhlgamer_leagueTeams", [])
    roster_link = column_name(roster_columns, "leagueTeamID", "league_team_id")
    league_team_link = column_name(league_team_columns, "leagueTeamID", "league_team_id", "id")
    joined_league = column_name(league_team_columns, "leagueID", "league_id")
    joined_team = column_name(league_team_columns, "teamID", "team_id")
    roster_player = column_name(roster_columns, "playerID", "player_id")

    if roster_link and league_team_link and joined_league and joined_team and roster_player:
        placeholders = ",".join(["%s"] * len(LEAGUE_IDS))
        try:
            rows = select(
                connection,
                "select r.*, "
                f"lt.{safe_identifier(joined_league)} as __leagueID, "
                f"lt.{safe_identifier(joined_team)} as __teamID "
                "from `nhlgamer_leagueRosters` r "
                "join `nhlgamer_leagueTeams` lt "
                f"on lt.{safe_identifier(league_team_link)}=r.{safe_identifier(roster_link)} "
                f"where lt.{safe_identifier(joined_league)} in ({placeholders})",
                tuple(LEAGUE_IDS),
            )
            usable = [
                row for row in rows
                if integer(first(row, "playerID", "player_id")) > 0
                and integer(first(row, "__teamID", "teamID", "team_id")) > 0
            ]
            if usable:
                return "nhlgamer_leagueRosters + nhlgamer_leagueTeams", usable, joined_league
        except Exception:
            pass

    candidates: list[tuple[int, str, str]] = []
    for table, columns in inventory.items():
        league_column = column_name(columns, "leagueID", "league_id")
        player_column = column_name(columns, "playerID", "player_id")
        team_column = column_name(columns, "teamID", "team_id")
        if not league_column or not player_column or not team_column:
            continue

        name = table.lower()
        score = 0
        if name == "nhlgamer_leaguerosters":
            score += 100
        if "roster" in name:
            score += 60
        if "league" in name:
            score += 10
        if "participant" in name:
            score += 5
        if "invite" in name:
            score += 30
        candidates.append((score, table, league_column))

    for _, table, league_column in sorted(candidates, reverse=True):
        table_sql = safe_identifier(table)
        league_sql = safe_identifier(league_column)
        placeholders = ",".join(["%s"] * len(LEAGUE_IDS))
        try:
            rows = select(
                connection,
                f"select * from {table_sql} where {league_sql} in ({placeholders})",
                tuple(LEAGUE_IDS),
            )
        except Exception:
            continue

        usable = [
            row for row in rows
            if integer(first(row, "playerID", "player_id")) > 0
            and integer(first(row, "__teamID", "teamID", "team_id")) > 0
        ]

        # Accepted SportsGamer team invites are a reliable preseason roster
        # fallback when the dedicated league-roster table cannot be joined.
        if "invite" in table.lower():
            accepted = [
                row for row in usable
                if integer(first(row, "inviteStatus", "invite_status", "status")) == 2
            ]
            if accepted:
                usable = accepted

        if usable:
            return table, usable, league_column

    raise RuntimeError(
        f"No current roster rows found for SportsGamer leagues {LEAGUE_IDS}. "
        "The league may not have registered teams/players yet."
    )


def choose_entity_table(
    inventory: dict[str, list[str]],
    entity: str,
) -> tuple[str | None, str | None]:
    best: tuple[int, str, str] | None = None
    for table, columns in inventory.items():
        if entity == "player":
            id_column = column_name(columns, "playerID", "player_id", "id")
            wanted = ("psntag", "gamertag", "playername", "username", "country")
            exact = "nhlgamer_players"
        else:
            id_column = column_name(columns, "teamID", "team_id", "id")
            wanted = ("teamname", "name", "logo", "country")
            exact = "nhlgamer_teams"

        if not id_column:
            continue
        low_columns = {column.lower() for column in columns}
        score = sum(3 for item in wanted if item in low_columns)
        lname = table.lower()
        if lname == exact:
            score += 100
        if entity in lname:
            score += 10

        current = (score, table, id_column)
        if best is None or current > best:
            best = current

    return (best[1], best[2]) if best else (None, None)


def normalize_country(value: Any) -> str:
    raw = str(value or "").strip().upper()
    mapping = {
        "SWEDEN": "SE", "SWE": "SE",
        "FINLAND": "FI", "FIN": "FI",
        "NORWAY": "NO", "NOR": "NO",
        "DENMARK": "DK", "DEN": "DK",
        "GERMANY": "DE", "GER": "DE",
        "SWITZERLAND": "CH", "SUI": "CH", "SWI": "CH",
        "AUSTRIA": "AT", "AUT": "AT",
        "CZECHIA": "CZ", "CZECH REPUBLIC": "CZ", "CZE": "CZ",
        "LATVIA": "LV", "LAT": "LV",
        "POLAND": "PL", "POL": "PL",
        "UNITED KINGDOM": "GB", "GREAT BRITAIN": "GB", "GBR": "GB",
        "UNITED STATES": "US", "USA": "US",
        "CANADA": "CA", "CAN": "CA",
    }
    if raw in mapping:
        return mapping[raw]
    if len(raw) == 2 and raw.isalpha():
        return raw
    return raw[:3] if len(raw) == 3 and raw.isalpha() else ""


def normalize_position(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (int, float)) or str(value).strip().isdigit():
        return POSITION_IDS.get(integer(value), "")

    raw = re.sub(r"[^A-Z]", "", str(value).upper())
    mapping = {
        "LW": "LW", "LEFTWING": "LW",
        "C": "C", "CENTER": "C", "CENTRE": "C",
        "RW": "RW", "RIGHTWING": "RW",
        "LD": "LD", "LEFTDEFENSE": "LD", "LEFTDEFENCE": "LD",
        "RD": "RD", "RIGHTDEFENSE": "RD", "RIGHTDEFENCE": "RD",
        "G": "G", "GK": "G", "GOALIE": "G", "GOALTENDER": "G",
        "F": "F", "FORWARD": "F",
        "D": "D", "DEF": "D", "DEFENSE": "D", "DEFENCE": "D",
    }
    return mapping.get(raw, "")


def slots_for_position(position: str) -> list[str]:
    if position in {"LW", "C", "RW", "LD", "RD", "G"}:
        return [position]
    if position == "F":
        return ["LW", "C", "RW"]
    if position == "D":
        return ["LD", "RD"]
    # Unknown newcomers remain selectable until enough real position history exists.
    return ["LW", "C", "RW", "LD", "RD", "G"]


def json_safe(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, default=str, separators=(",", ":"))


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
        inventory = table_inventory(connection)
        roster_table, roster_rows, _ = choose_roster_source(connection, inventory)

        # Prefer the first configured source league if a player somehow occurs in multiple divisions.
        league_rank = {league_id: index for index, league_id in enumerate(LEAGUE_IDS)}
        roster_rows.sort(
            key=lambda row: (
                league_rank.get(integer(first(row, "__leagueID", "leagueID", "league_id")), 999),
                -integer(first(row, "id", "rosterID", "leagueRosterID")),
            )
        )

        deduped: dict[int, dict[str, Any]] = {}
        for row in roster_rows:
            player_id = integer(first(row, "playerID", "player_id"))
            if player_id and player_id not in deduped:
                deduped[player_id] = row

        player_ids = sorted(deduped)
        team_ids = sorted({
            integer(first(row, "__teamID", "teamID", "team_id"))
            for row in deduped.values()
            if integer(first(row, "__teamID", "teamID", "team_id")) > 0
        })

        player_table, player_id_column = choose_entity_table(inventory, "player")
        team_table, team_id_column = choose_entity_table(inventory, "team")

        player_meta: dict[int, dict[str, Any]] = {}
        if player_table and player_id_column:
            for row in fetch_by_ids(connection, player_table, player_id_column, player_ids):
                pid = integer(first(row, "playerID", "player_id", "id"))
                if pid:
                    player_meta[pid] = row

        team_meta: dict[int, dict[str, Any]] = {}
        if team_table and team_id_column:
            for row in fetch_by_ids(connection, team_table, team_id_column, team_ids):
                tid = integer(first(row, "teamID", "team_id", "id"))
                if tid:
                    team_meta[tid] = row

        # If games already exist, use observed current-league positions as another hint.
        observed_positions: dict[int, Counter[str]] = defaultdict(Counter)
        participant_columns = inventory.get("nhlgamer_participants", [])
        if participant_columns:
            league_col = column_name(participant_columns, "leagueID", "league_id")
            player_col = column_name(participant_columns, "playerID", "player_id")
            pos_col = column_name(participant_columns, "positionID", "position", "position_id")
            if league_col and player_col and pos_col:
                placeholders = ",".join(["%s"] * len(LEAGUE_IDS))
                rows = select(
                    connection,
                    f"select {safe_identifier(player_col)} as playerID, {safe_identifier(pos_col)} as positionValue "
                    f"from `nhlgamer_participants` where {safe_identifier(league_col)} in ({placeholders})",
                    tuple(LEAGUE_IDS),
                )
                for row in rows:
                    pos = normalize_position(row.get("positionValue"))
                    if pos:
                        observed_positions[integer(row.get("playerID"))][pos] += 1

        output_rows: list[dict[str, Any]] = []
        for player_id, roster in deduped.items():
            team_id = integer(first(roster, "__teamID", "teamID", "team_id"))
            league_id = integer(first(roster, "__leagueID", "leagueID", "league_id"))
            player = player_meta.get(player_id, {})
            team = team_meta.get(team_id, {})

            tag = str(
                first(player, "psntag", "psnTag", "gamertag", "gamerTag", "playerName", "username", "name")
                or first(roster, "psntag", "gamertag", "playerName")
                or f"Player {player_id}"
            ).strip()

            team_name = str(
                first(team, "teamName", "name", "team_name")
                or first(roster, "teamName", "team_name")
                or f"Team {team_id}"
            ).strip()

            country = normalize_country(
                first(player, "country", "countryCode", "country_code", "nationality")
                or first(roster, "country", "countryCode", "country_code", "nationality")
            )

            position = normalize_position(
                first(roster, "positionID", "position", "primaryPosition", "mainPosition", "preferredPosition")
                or first(player, "positionID", "position", "primaryPosition", "mainPosition", "preferredPosition")
            )
            if not position and observed_positions.get(player_id):
                position = observed_positions[player_id].most_common(1)[0][0]

            slots = slots_for_position(position)
            primary = position if position in {"LW", "C", "RW", "LD", "RD", "G"} else ""

            logo = str(
                first(team, "teamLogo", "teamLogoUrl", "logo", "logoUrl", "image", "imageUrl")
                or first(roster, "teamLogo", "teamLogoUrl", "logo", "logoUrl")
                or ""
            ).strip()

            output_rows.append({
                "source_league_id": league_id,
                "source_team_id": team_id,
                "source_player_id": player_id,
                "display_gamertag": tag,
                "team_name": team_name,
                "country_code": country,
                "primary_position": primary,
                "eligible_slots": "|".join(slots),
                "team_logo_url": logo,
                "raw_player": json_safe({
                    "roster_source": roster_table,
                    "player_source": player_table,
                    "team_source": team_table,
                    "roster": roster,
                    "player": player or None,
                    "team": team or None,
                }),
            })

    finally:
        connection.close()

    POOL_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with POOL_OUTPUT.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=POOL_FIELDS)
        writer.writeheader()
        writer.writerows(output_rows)

    print(
        f"Fantasy roster export complete: {len(output_rows)} current players "
        f"from {roster_table} for leagues {LEAGUE_IDS}."
    )

    github_output = os.environ.get("GITHUB_OUTPUT")
    if github_output:
        with open(github_output, "a", encoding="utf-8") as handle:
            handle.write(f"player_count={len(output_rows)}\n")
            handle.write(f"roster_source={roster_table}\n")
            handle.write(f"player_source={player_table or ''}\n")
            handle.write(f"team_source={team_table or ''}\n")

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"Fantasy SportsGamer roster export failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
