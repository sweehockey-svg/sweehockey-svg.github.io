#!/usr/bin/env python3
"""Export SCL 27 official teams and rosters directly from SportsGamer.

This sync is deliberately independent from Fantasy. It reads SportsGamer in
read-only mode and writes two CSV snapshots consumed by the Svensk eHockey
central league/team import.
"""

from __future__ import annotations

import csv
import os
from pathlib import Path

import pymysql


LEAGUE_ID = 527
TEAM_OUT = Path("/tmp/scl27_official_teams.csv")
ROSTER_OUT = Path("/tmp/scl27_official_roster.csv")

POSITION_BY_ID = {
    1: "LW",
    2: "C",
    3: "RW",
    4: "LD",
    5: "RD",
    6: "G",
}


def text(value) -> str:
    return "" if value is None else str(value).strip()


def integer(value) -> int | None:
    try:
        number = int(value)
    except (TypeError, ValueError):
        return None
    return number if number > 0 else None


def connect():
    host = os.environ.get("DB_HOST", "")
    port = int(os.environ.get("DB_PORT", "3306"))
    if os.environ.get("SSH_HOST"):
        host = "127.0.0.1"
        port = int(os.environ.get("SSH_LOCAL_DB_PORT", "3307"))

    return pymysql.connect(
        host=host,
        port=port,
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
        database=os.environ["DB_NAME"],
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        connect_timeout=20,
        read_timeout=180,
        write_timeout=10,
        autocommit=True,
        init_command="SET SESSION TRANSACTION READ ONLY",
    )


def main() -> int:
    connection = connect()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                select
                  lt.leagueID,
                  lt.teamID,
                  lt.teamName as leagueTeamName,
                  lt.teamCaptainID,
                  lt.teamAssistantCaptainID,
                  lt.teamAssistantCaptainID2,
                  t.teamName as globalTeamName,
                  t.teamLogo,
                  t.teamRegistered
                from nhlgamer_leagueTeams lt
                left join nhlgamer_teams t on t.teamID=lt.teamID
                where lt.leagueID=%s
                order by coalesce(nullif(lt.teamName,''),t.teamName),lt.teamID
                """,
                (LEAGUE_ID,),
            )
            team_rows = list(cursor.fetchall())

            cursor.execute(
                """
                select
                  r.leagueID,
                  r.teamID,
                  r.playerID,
                  r.preferredPositionID as rosterPreferredPositionID,
                  p.psntag,
                  p.gamertag,
                  p.EAID,
                  p.country,
                  p.playerImage,
                  p.playerNumber,
                  p.preferredPositionID as playerPreferredPositionID
                from nhlgamer_leagueRosters r
                left join nhlgamer_players p on p.playerID=r.playerID
                where r.leagueID=%s
                order by r.teamID,r.playerID
                """,
                (LEAGUE_ID,),
            )
            roster_rows = list(cursor.fetchall())
    finally:
        connection.close()

    if not team_rows:
        raise RuntimeError(f"No registered teams found for SportsGamer league {LEAGUE_ID}")

    teams: dict[int, dict] = {}
    for row in team_rows:
        team_id = integer(row.get("teamID"))
        if not team_id:
            continue
        team_name = text(row.get("leagueTeamName")) or text(row.get("globalTeamName")) or f"Team {team_id}"
        teams[team_id] = {
            "sports_gamer_league_id": LEAGUE_ID,
            "sports_gamer_team_id": team_id,
            "team_name": team_name,
            "team_logo_url": text(row.get("teamLogo")),
            "captain_player_id": integer(row.get("teamCaptainID")) or "",
            "assistant_1_player_id": integer(row.get("teamAssistantCaptainID")) or "",
            "assistant_2_player_id": integer(row.get("teamAssistantCaptainID2")) or "",
            # teamRegistered is the club creation/registration date, not necessarily
            # the SCL 27 signup date. Leave the league registration date unset.
            "registered_at": "",
        }

    roster: dict[tuple[int, int], dict] = {}
    for row in roster_rows:
        team_id = integer(row.get("teamID"))
        player_id = integer(row.get("playerID"))
        if not team_id or not player_id or team_id not in teams:
            continue

        display = (
            text(row.get("psntag"))
            or text(row.get("gamertag"))
            or text(row.get("EAID"))
            or f"Player {player_id}"
        )
        preferred_id = integer(row.get("rosterPreferredPositionID")) or integer(row.get("playerPreferredPositionID"))
        team = teams[team_id]
        captain_role = ""
        if player_id == team["captain_player_id"]:
            captain_role = "C"
        elif player_id in {team["assistant_1_player_id"], team["assistant_2_player_id"]}:
            captain_role = "A"

        roster[(team_id, player_id)] = {
            "sports_gamer_league_id": LEAGUE_ID,
            "sports_gamer_team_id": team_id,
            "sports_gamer_player_id": player_id,
            "display_gamertag": display,
            "player_country": text(row.get("country")).upper(),
            "player_image": text(row.get("playerImage")),
            "player_number": integer(row.get("playerNumber")) or "",
            "preferred_position": POSITION_BY_ID.get(preferred_id or 0, ""),
            "captain_role": captain_role,
        }

    TEAM_OUT.parent.mkdir(parents=True, exist_ok=True)
    with TEAM_OUT.open("w", newline="", encoding="utf-8") as handle:
        fields = [
            "sports_gamer_league_id",
            "sports_gamer_team_id",
            "team_name",
            "team_logo_url",
            "captain_player_id",
            "assistant_1_player_id",
            "assistant_2_player_id",
            "registered_at",
        ]
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for row in sorted(teams.values(), key=lambda item: (item["team_name"].casefold(), item["sports_gamer_team_id"])):
            writer.writerow(row)

    with ROSTER_OUT.open("w", newline="", encoding="utf-8") as handle:
        fields = [
            "sports_gamer_league_id",
            "sports_gamer_team_id",
            "sports_gamer_player_id",
            "display_gamertag",
            "player_country",
            "player_image",
            "player_number",
            "preferred_position",
            "captain_role",
        ]
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for row in sorted(roster.values(), key=lambda item: (item["sports_gamer_team_id"], item["display_gamertag"].casefold())):
            writer.writerow(row)

    output = os.environ.get("GITHUB_OUTPUT")
    if output:
        with open(output, "a", encoding="utf-8") as handle:
            handle.write(f"team_count={len(teams)}\n")
            handle.write(f"player_count={len(roster)}\n")
            handle.write(f"league_id={LEAGUE_ID}\n")

    print(f"Exported {len(teams)} teams and {len(roster)} roster players for league {LEAGUE_ID}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
