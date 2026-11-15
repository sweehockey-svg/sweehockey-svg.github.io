"""Discover official ECL '27 Winter divisions and export completed match rows."""

from __future__ import annotations

import csv
import os
import re
from pathlib import Path

DIVISION = re.compile(r"ecl\s*['’‘]?\s*27\s*:?\s*winter\s*[-–—:]?\s*(elite|pro|lite|core|neo)", re.I)
MATCH_FILE = Path("/tmp/ecl27_winter_matches.csv")


def division_for_name(name):
    match = DIVISION.fullmatch(str(name or "").strip())
    return match.group(1).title() if match else None


def select_divisions(rows):
    selected = {}
    for row in rows:
        division = division_for_name(row["leagueName"])
        league_id = int(row["leagueID"])
        if not division or league_id == 535:
            continue
        if division in selected and selected[division][0] != league_id:
            raise RuntimeError(f"Multiple official ECL '27 Winter {division} IDs")
        selected[division] = (league_id, bool(row["has_results"]))
    return selected


def write_matches(league_id, division, matches, team_meta):
    from export_recordbook_ecl_history import played_at_iso

    columns = ("match_id", "league_id", "division", "stage", "group_name", "played_at",
               "home_id", "away_id", "home_team", "away_team", "home_score", "away_score", "overtime")
    with MATCH_FILE.open("w", newline="", encoding="utf-8") as destination:
        writer = csv.writer(destination)
        writer.writerow(columns)
        for match in matches:
            mid, raw_stage, match_date, match_time, home, away, hg, ag, overtime = match
            played_at = played_at_iso(match_date, match_time)
            if not mid or not played_at or home not in team_meta or away not in team_meta:
                continue
            stage = "slutspel" if raw_stage == "playoffs" else "gruppspel"
            home_name, home_group = team_meta[home]
            away_name, away_group = team_meta[away]
            group = home_group if stage == "gruppspel" and home_group == away_group else ""
            writer.writerow((mid, league_id, division, stage, group, played_at, home, away,
                             home_name, away_name, hg, ag, "OT" if overtime else ""))


def connect():
    import pymysql

    via_ssh = bool(os.environ.get("SSH_HOST"))
    return pymysql.connect(
        host="127.0.0.1" if via_ssh else os.environ["DB_HOST"],
        port=int(os.environ.get("SSH_LOCAL_DB_PORT") or 3307) if via_ssh else int(os.environ.get("DB_PORT") or 3306),
        user=os.environ["DB_USER"], password=os.environ["DB_PASSWORD"], database=os.environ["DB_NAME"],
        charset="utf8mb4", cursorclass=pymysql.cursors.DictCursor, connect_timeout=20, read_timeout=120,
        autocommit=True, init_command="SET SESSION TRANSACTION READ ONLY",
    )


def main():
    from export_swedish_player_stats import select

    connection = connect()
    try:
        rows = select(connection, """
            select l.leagueID, l.leagueName,
                   exists(select 1 from nhlgamer_matches m where m.leagueID=l.leagueID
                     and coalesce(m.matchIgnore,0)<>1 and m.goalsHome is not null
                     and m.goalsAway is not null and m.goalsHome<>m.goalsAway) as has_results
            from nhlgamer_leagues l
            where l.leagueName like %s and exists(
              select 1 from nhlgamer_leagueTeams t where t.leagueID=l.leagueID)
            order by l.leagueID
            """, ("%ECL%27%Winter%",))
    finally:
        connection.close()
    selected = select_divisions(rows)
    with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as output:
        output.write("league_ids=" + ",".join(str(v[0]) for v in selected.values()) + "\n")
        output.write("played_ids=" + ",".join(str(v[0]) for v in selected.values() if v[1]) + "\n")
    print(f"Official ECL '27 Winter divisions with teams: {selected}")


if __name__ == "__main__":
    main()
