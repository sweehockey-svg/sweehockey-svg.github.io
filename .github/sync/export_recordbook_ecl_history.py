#!/usr/bin/env python3
"""Export official ECL match and goal-event data from SportsGamer, read-only."""

from __future__ import annotations

import csv
import json
import os
import re
from datetime import date, datetime, time, timedelta
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

import pymysql

SYNC_VERSION = "ecl-recordbook-v1.2"
DEFAULT_LEAGUES = "4,5,17,18,19,20,23,24,25,28,29,27,42,36,37,35,40,41,55,56,57,58,66,67,65,68,96,97,95,94,123,122,121,120,119,171,172,173,174,170,191,192,193,194,190,250,251,252,253,254,305,306,307,308,309,342,339,340,341,338,380,381,382,383,379,413,414,415,411,412,461,462,463,464,465,488,489,490,491,487,508,511,507,509,510"
MATCH_OUTPUT = Path(os.environ.get("MATCH_OUTPUT", "/tmp/recordbook_ecl_matches.csv"))
GOAL_OUTPUT = Path(os.environ.get("GOAL_OUTPUT", "/tmp/recordbook_ecl_goals.csv"))
SOURCE_TZ = ZoneInfo("Europe/Helsinki")

MATCH_FIELDS = [
    "source_league_id", "source_match_id", "match_type", "played_at",
    "home_team_id", "away_team_id", "home_team_name", "away_team_name",
    "home_score", "away_score",
]
GOAL_FIELDS = [
    "source_league_id", "source_match_id", "source_team_id", "source_player_id",
    "goal_seconds",
]


def required(name: str) -> str:
    value = (os.environ.get(name) or "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def league_ids() -> list[int]:
    raw = (os.environ.get("LEAGUE_IDS") or DEFAULT_LEAGUES).strip()
    result: list[int] = []
    for part in re.split(r"[\s,;]+", raw):
        if not part:
            continue
        value = int(part)
        if value <= 0:
            raise RuntimeError(f"Invalid league ID: {value}")
        if value not in result:
            result.append(value)
    if not result or len(result) > 100:
        raise RuntimeError("Expected 1-100 SportsGamer league IDs")
    return result


def integer(value: Any) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0



def seconds_from_mysql_time(value: Any) -> int:
    if value is None:
        return -1
    if isinstance(value, timedelta):
        return max(0, int(value.total_seconds()))
    if isinstance(value, time):
        return value.hour * 3600 + value.minute * 60 + value.second
    text = str(value).strip()
    match = re.fullmatch(r"(?:(\d+):)?(\d{1,2}):(\d{2})", text)
    if not match:
        return -1
    hours = int(match.group(1) or 0)
    minutes = int(match.group(2))
    seconds = int(match.group(3))
    return hours * 3600 + minutes * 60 + seconds


def played_at_iso(match_date: Any, match_time: Any) -> str:
    if not match_date:
        return ""
    if isinstance(match_date, datetime):
        d = match_date.date()
    elif isinstance(match_date, date):
        d = match_date
    else:
        try:
            d = date.fromisoformat(str(match_date)[:10])
        except ValueError:
            return ""

    if isinstance(match_time, timedelta):
        total = int(match_time.total_seconds())
        hh = (total // 3600) % 24
        mm = (total % 3600) // 60
        ss = total % 60
        t = time(hh, mm, ss)
    elif isinstance(match_time, time):
        t = match_time
    else:
        raw = str(match_time or "00:00:00").strip()
        try:
            parts = [int(x) for x in raw.split(":")]
            while len(parts) < 3:
                parts.append(0)
            t = time(parts[0] % 24, parts[1], parts[2])
        except Exception:
            t = time(0, 0, 0)

    return datetime.combine(d, t, tzinfo=SOURCE_TZ).isoformat()


def select(connection: Any, sql: str, params: tuple[Any, ...]) -> list[dict[str, Any]]:
    if not re.match(r"^\s*select\b", sql, re.I):
        raise RuntimeError("Safety stop: SportsGamer connection is SELECT-only")
    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        return list(cursor.fetchall())


def main() -> int:
    ids = league_ids()
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

    placeholders = ",".join(["%s"] * len(ids))
    try:
        matches = select(
            connection,
            f"""
            select
              m.matchID,
              m.leagueID,
              m.matchType,
              m.matchDate,
              m.matchTime,
              m.homeTeamID,
              m.awayTeamID,
              m.goalsHome,
              m.goalsAway,
              ht.teamName as homeTeamName,
              at.teamName as awayTeamName
            from nhlgamer_matches m
            left join nhlgamer_teams ht on ht.teamID=m.homeTeamID
            left join nhlgamer_teams at on at.teamID=m.awayTeamID
            where m.leagueID in ({placeholders})
              and coalesce(m.matchIgnore,0)<>1
              and m.goalsHome is not null
              and m.goalsAway is not null
            order by m.leagueID,m.matchDate,m.matchTime,m.matchID
            """,
            tuple(ids),
        )

        goals = select(
            connection,
            f"""
            select
              g.matchID,
              g.teamID,
              g.goalPlayerID,
              g.goalTime,
              m.leagueID
            from nhlgamer_goals g
            join nhlgamer_matches m on m.matchID=g.matchID
            where m.leagueID in ({placeholders})
              and coalesce(m.matchIgnore,0)<>1
              and g.goalPlayerID is not null
            order by m.leagueID,g.matchID,g.goalTime
            """,
            tuple(ids),
        )
    finally:
        connection.close()

    match_rows: list[dict[str, Any]] = []
    valid_match_ids: set[int] = set()
    for row in matches:
        league_id = integer(row.get("leagueID"))
        match_id = integer(row.get("matchID"))
        if not league_id or not match_id:
            continue
        valid_match_ids.add(match_id)
        match_rows.append({
            "source_league_id": league_id,
            "source_match_id": match_id,
            "match_type": str(row.get("matchType") or ""),
            "played_at": played_at_iso(row.get("matchDate"), row.get("matchTime")),
            "home_team_id": integer(row.get("homeTeamID")) or "",
            "away_team_id": integer(row.get("awayTeamID")) or "",
            "home_team_name": str(row.get("homeTeamName") or ""),
            "away_team_name": str(row.get("awayTeamName") or ""),
            "home_score": integer(row.get("goalsHome")),
            "away_score": integer(row.get("goalsAway")),
        })

    goal_rows: list[dict[str, Any]] = []
    skipped_bad_time = 0
    for row in goals:
        match_id = integer(row.get("matchID"))
        player_id = integer(row.get("goalPlayerID"))
        if match_id not in valid_match_ids or not player_id:
            continue
        goal_seconds = seconds_from_mysql_time(row.get("goalTime"))
        if goal_seconds < 0:
            skipped_bad_time += 1
            continue
        goal_rows.append({
            "source_league_id": integer(row.get("leagueID")),
            "source_match_id": match_id,
            "source_team_id": integer(row.get("teamID")) or "",
            "source_player_id": player_id,
            "goal_seconds": goal_seconds,
        })

    MATCH_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with MATCH_OUTPUT.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=MATCH_FIELDS)
        writer.writeheader()
        writer.writerows(match_rows)
    with GOAL_OUTPUT.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=GOAL_FIELDS)
        writer.writeheader()
        writer.writerows(goal_rows)

    counts_by_league: dict[int, dict[str, int]] = {
        league_id: {"matches": 0, "goals": 0} for league_id in ids
    }
    for row in match_rows:
        counts_by_league[row["source_league_id"]]["matches"] += 1
    for row in goal_rows:
        counts_by_league[row["source_league_id"]]["goals"] += 1

    print("=== ECL RECORDBOOK EXPORT ===")
    print("Leagues:", ",".join(str(x) for x in ids))
    print("Matches:", len(match_rows))
    print("Official goal events:", len(goal_rows))
    print("Goal rows skipped due to invalid time:", skipped_bad_time)
    print("Per league:", json.dumps(counts_by_league, ensure_ascii=False, sort_keys=True))

    if len(match_rows) < 10000:
        raise RuntimeError(f"Safety stop: only {len(match_rows)} ECL matches exported")
    if len(goal_rows) < 10000:
        raise RuntimeError(f"Safety stop: only {len(goal_rows)} official ECL goal events exported")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
