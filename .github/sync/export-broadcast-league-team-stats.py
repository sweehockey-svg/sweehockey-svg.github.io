#!/usr/bin/env python3
"""Export Broadcast Studio team standings directly from SportsGamer matches.

This intentionally derives the table from reported, non-ignored matches, matching
the direct SportsGamer source used by the SEC site instead of depending on an
older Supabase stats cache.
"""

from __future__ import annotations

import csv
import os
import re
from collections import defaultdict
from pathlib import Path
from typing import Any

import pymysql


LEAGUE_ID = int(os.environ.get("LEAGUE_ID") or "0")
if LEAGUE_ID <= 0:
    raise RuntimeError("LEAGUE_ID must be a positive SportsGamer league id")

OUT = Path("/tmp/broadcast_league_team_stats.csv")

FIELDS = [
    "sports_gamer_league_id", "official_league_name", "league_description",
    "platform_id", "video_game_id", "game_mode_id", "configured_team_count",
    "configured_group_count", "active_league", "featured_league", "league_phase",
    "league_stage", "registration_end", "regular_season_end", "league_logo",
    "league_landing_link", "league_info_link", "sports_gamer_team_id",
    "team_name_in_league", "current_global_team_name", "team_abbreviation",
    "registered_group_id", "statistics_group_id", "effective_group_id", "group_name",
    "registered_for_league", "country_in_league", "nationality_in_league",
    "city_in_league", "team_logo_in_league", "current_global_team_logo",
    "ea_club_id", "statistics_stage", "games_played", "wins", "losses",
    "overtime_wins", "overtime_losses", "total_wins", "table_points",
    "goals_for", "goals_against", "goal_difference", "statistics_status",
    "sports_gamer_team_url",
]


def text(value: Any) -> str:
    return "" if value is None else str(value).strip()


def int_or_none(value: Any) -> int | None:
    try:
        return int(value) if value is not None and str(value).strip() != "" else None
    except (TypeError, ValueError):
        return None


def posint(value: Any) -> int:
    number = int_or_none(value)
    return number if number is not None and number > 0 else 0


def lower_map(row: dict[str, Any]) -> dict[str, Any]:
    return {str(key).lower(): value for key, value in row.items()}


def first(row: dict[str, Any], *names: str) -> Any:
    low = lower_map(row)
    for name in names:
        if name.lower() in low and low[name.lower()] is not None:
            return low[name.lower()]
    return None


def column_name(columns: list[str], *candidates: str) -> str | None:
    low = {column.lower(): column for column in columns}
    for candidate in candidates:
        if candidate.lower() in low:
            return low[candidate.lower()]
    return None


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


def inventory(connection: Any) -> dict[str, list[str]]:
    database = select(connection, "select database() as db")[0]["db"]
    rows = select(
        connection,
        """
        select table_name as detected_table_name, column_name as detected_column_name
        from information_schema.columns
        where table_schema=%s
        order by table_name, ordinal_position
        """,
        (database,),
    )
    result: dict[str, list[str]] = defaultdict(list)
    for row in rows:
        result[str(row["detected_table_name"])].append(str(row["detected_column_name"]))
    return dict(result)


def connect():
    host = os.environ.get("DB_HOST", "")
    port = int(os.environ.get("DB_PORT") or "3306")
    if os.environ.get("SSH_HOST"):
        host = "127.0.0.1"
        port = int(os.environ.get("SSH_LOCAL_DB_PORT") or "3307")
    return pymysql.connect(
        host=host,
        port=port,
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
        database=os.environ["DB_NAME"],
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        connect_timeout=20,
        read_timeout=240,
        write_timeout=10,
        autocommit=True,
        init_command="SET SESSION TRANSACTION READ ONLY",
    )


def ignored(value: Any) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "y"}


def main() -> int:
    connection = connect()
    try:
        schema = inventory(connection)

        league_columns = schema.get("nhlgamer_leagues", [])
        league_id_col = column_name(league_columns, "leagueID", "league_id")
        if not league_id_col:
            raise RuntimeError("SportsGamer leagues table is missing leagueID")
        league_rows = select(
            connection,
            f"select * from `nhlgamer_leagues` where {safe_identifier(league_id_col)}=%s",
            (LEAGUE_ID,),
        )
        league = league_rows[0] if league_rows else {}

        team_columns = schema.get("nhlgamer_leagueTeams", [])
        team_league_col = column_name(team_columns, "leagueID", "league_id")
        team_id_col = column_name(team_columns, "teamID", "team_id")
        if not team_league_col or not team_id_col:
            raise RuntimeError("SportsGamer leagueTeams is missing league/team identifiers")
        team_rows = select(
            connection,
            f"select * from `nhlgamer_leagueTeams` where {safe_identifier(team_league_col)}=%s",
            (LEAGUE_ID,),
        )
        teams = {
            posint(first(row, "teamID", "team_id")): row
            for row in team_rows
            if posint(first(row, "teamID", "team_id"))
        }
        if not teams:
            raise RuntimeError(f"No registered teams found for SportsGamer league {LEAGUE_ID}")

        global_teams: dict[int, dict[str, Any]] = {}
        global_columns = schema.get("nhlgamer_teams", [])
        global_id_col = column_name(global_columns, "teamID", "team_id", "id")
        if global_id_col:
            ids = sorted(teams)
            placeholders = ",".join(["%s"] * len(ids))
            rows = select(
                connection,
                f"select * from `nhlgamer_teams` where {safe_identifier(global_id_col)} in ({placeholders})",
                tuple(ids),
            )
            global_teams = {
                posint(first(row, "teamID", "team_id", "id")): row
                for row in rows
                if posint(first(row, "teamID", "team_id", "id"))
            }

        match_columns = schema.get("nhlgamer_matches", [])
        match_league_col = column_name(match_columns, "leagueID", "league_id")
        if not match_league_col:
            raise RuntimeError("SportsGamer matches table is missing leagueID")
        matches = select(
            connection,
            f"select * from `nhlgamer_matches` where {safe_identifier(match_league_col)}=%s",
            (LEAGUE_ID,),
        )
    finally:
        connection.close()

    counters: dict[tuple[int, str], dict[str, int]] = {}
    for team_id in teams:
        for stage in ("regular", "playoffs"):
            counters[(team_id, stage)] = {
                "games_played": 0, "wins": 0, "losses": 0,
                "overtime_wins": 0, "overtime_losses": 0,
                "goals_for": 0, "goals_against": 0,
            }

    completed_matches = 0
    for match in matches:
        if ignored(first(match, "matchIgnore", "match_ignore", "ignored")):
            continue
        away_id = posint(first(match, "awayTeamID", "away_team_id"))
        home_id = posint(first(match, "homeTeamID", "home_team_id"))
        away_score = int_or_none(first(match, "goalsAway", "awayScore", "away_score"))
        home_score = int_or_none(first(match, "goalsHome", "homeScore", "home_score"))
        if not away_id or not home_id or away_score is None or home_score is None:
            continue
        if away_id not in teams and home_id not in teams:
            continue

        raw_type = text(first(match, "matchType", "gameType", "match_type")).lower()
        stage = "playoffs" if raw_type == "playoffs" else "regular"
        overtime = ignored(first(match, "overtime", "wentToOvertime", "went_to_overtime"))
        completed_matches += 1

        for team_id, gf, ga in (
            (away_id, away_score, home_score),
            (home_id, home_score, away_score),
        ):
            if team_id not in teams:
                continue
            row = counters[(team_id, stage)]
            row["games_played"] += 1
            row["goals_for"] += gf
            row["goals_against"] += ga
            if gf > ga:
                row["overtime_wins" if overtime else "wins"] += 1
            elif gf < ga:
                row["overtime_losses" if overtime else "losses"] += 1

    group_ids = {
        int_or_none(first(team, "groupID", "group_id"))
        for team in teams.values()
        if int_or_none(first(team, "groupID", "group_id")) is not None
    }
    configured_group_count = max(1, len(group_ids))

    rows: list[dict[str, Any]] = []
    for team_id, team in sorted(
        teams.items(),
        key=lambda item: (text(first(item[1], "teamName", "team_name", "name")).casefold(), item[0]),
    ):
        global_team = global_teams.get(team_id, {})
        team_name = (
            text(first(team, "teamName", "team_name", "name"))
            or text(first(global_team, "teamName", "team_name", "name"))
            or f"Team {team_id}"
        )
        global_name = text(first(global_team, "teamName", "team_name", "name")) or team_name
        league_logo = text(first(league, "leagueLogo", "logo", "league_logo"))
        global_logo = text(first(global_team, "teamLogo", "team_logo", "logo", "logoUrl"))
        team_logo = text(first(team, "teamLogo", "team_logo", "logo", "logoUrl")) or global_logo
        group_id = int_or_none(first(team, "groupID", "group_id"))
        group_name = "" if group_id is None else f"Group {group_id + 1}"

        for stage in ("regular", "playoffs"):
            stats = counters[(team_id, stage)]
            total_wins = stats["wins"] + stats["overtime_wins"]
            table_points = (
                stats["wins"] * 3
                + stats["overtime_wins"] * 2
                + stats["overtime_losses"]
            )
            row = {
                "sports_gamer_league_id": LEAGUE_ID,
                "official_league_name": text(first(league, "leagueName", "league_name")),
                "league_description": text(first(league, "leagueDescription", "description", "league_name")),
                "platform_id": int_or_none(first(league, "platformID", "platform_id")),
                "video_game_id": int_or_none(first(league, "videoGameID", "video_game_id")),
                "game_mode_id": int_or_none(first(league, "gameModeID", "game_mode_id")),
                "configured_team_count": len(teams),
                "configured_group_count": configured_group_count,
                "active_league": int_or_none(first(league, "activeLeague", "active_league")),
                "featured_league": int_or_none(first(league, "featuredLeague", "featured_league")),
                "league_phase": text(first(league, "leaguePhase", "league_phase")),
                "league_stage": int_or_none(first(league, "leagueStage", "league_stage")),
                "registration_end": first(league, "registrationEnd", "registration_end") or "",
                "regular_season_end": first(league, "regularSeasonEnd", "regular_season_end") or "",
                "league_logo": league_logo,
                "league_landing_link": text(first(league, "leagueLandingLink", "landingLink", "league_landing_link")),
                "league_info_link": text(first(league, "leagueInfoLink", "infoLink", "league_info_link")),
                "sports_gamer_team_id": team_id,
                "team_name_in_league": team_name,
                "current_global_team_name": global_name,
                "team_abbreviation": text(first(team, "teamAbbreviation", "abbreviation", "team_abbreviation")),
                "registered_group_id": group_id,
                "statistics_group_id": group_id,
                "effective_group_id": group_id,
                "group_name": group_name,
                "registered_for_league": first(team, "registeredForLeague", "registeredAt", "registrationDate", "registered_for_league") or "",
                "country_in_league": text(first(team, "country", "countryCode", "country_in_league")).upper(),
                "nationality_in_league": text(first(team, "nationality", "nationality_in_league")).upper(),
                "city_in_league": text(first(team, "city", "city_in_league")),
                "team_logo_in_league": team_logo,
                "current_global_team_logo": global_logo,
                "ea_club_id": int_or_none(first(team, "eaClubID", "clubID", "ea_club_id"))
                    or int_or_none(first(global_team, "eaClubID", "clubID", "ea_club_id")),
                "statistics_stage": stage,
                "games_played": stats["games_played"],
                "wins": stats["wins"],
                "losses": stats["losses"],
                "overtime_wins": stats["overtime_wins"],
                "overtime_losses": stats["overtime_losses"],
                "total_wins": total_wins,
                "table_points": table_points,
                "goals_for": stats["goals_for"],
                "goals_against": stats["goals_against"],
                "goal_difference": stats["goals_for"] - stats["goals_against"],
                "statistics_status": "HAS_STATISTICS" if stats["games_played"] else "NO_STATISTICS",
                "sports_gamer_team_url": f"https://sportsgamer.gg/leagues/{LEAGUE_ID}/teams/{team_id}",
            }
            rows.append(row)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)

    output = os.environ.get("GITHUB_OUTPUT")
    if output:
        with open(output, "a", encoding="utf-8") as handle:
            handle.write(f"team_stat_row_count={len(rows)}\n")
            handle.write(f"completed_match_count={completed_matches}\n")
    print(
        f"Exported {len(rows)} team-stage rows from {completed_matches} completed matches "
        f"for league {LEAGUE_ID}."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
