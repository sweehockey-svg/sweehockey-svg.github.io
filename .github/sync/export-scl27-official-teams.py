#!/usr/bin/env python3
"""Export SCL 27 teams and rosters from SportsGamer in read-only mode.

SportsGamer has used more than one league-roster schema. This exporter
discovers the available columns and supports both direct league/team columns
and the newer leagueTeamID relation instead of assuming one fixed layout.
"""

from __future__ import annotations

import csv
import os
import re
from collections import defaultdict
from pathlib import Path
from typing import Any, Iterable

import pymysql


LEAGUE_ID = 527
FCL_LEAGUE_ID = 529
TEAM_OUT = Path("/tmp/scl27_official_teams.csv")
ROSTER_OUT = Path("/tmp/scl27_official_roster.csv")
CONFLICT_OUT = Path("/tmp/scl_fcl_roster_conflicts.csv")
POSITION_BY_ID = {1: "LW", 2: "C", 3: "RW", 4: "LD", 5: "RD", 6: "G"}


def diagnostic_stage(value: str) -> None:
    output = os.environ.get("GITHUB_OUTPUT")
    if output:
        with open(output, "a", encoding="utf-8") as handle:
            handle.write(f"diagnostic_stage={value}\n")


def text(value: Any) -> str:
    return "" if value is None else str(value).strip()


def integer(value: Any) -> int:
    try:
        number = int(value or 0)
    except (TypeError, ValueError):
        return 0
    return number if number > 0 else 0


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


def chunks(values: list[int], size: int = 300) -> Iterable[list[int]]:
    for start in range(0, len(values), size):
        yield values[start:start + size]


def select(connection: Any, sql: str, parameters: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    if not re.match(r"^\s*select\b", sql, re.I):
        raise RuntimeError("Safety stop: only SELECT statements are allowed on SportsGamer")
    with connection.cursor() as cursor:
        cursor.execute(sql, parameters)
        return list(cursor.fetchall())


def table_inventory(connection: Any) -> dict[str, list[str]]:
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
    inventory: dict[str, list[str]] = defaultdict(list)
    for row in rows:
        inventory[str(row["detected_table_name"])].append(str(row["detected_column_name"]))
    return dict(inventory)


def fetch_by_ids(connection: Any, table: str, id_column: str, values: list[int]) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for part in chunks(values):
        placeholders = ",".join(["%s"] * len(part))
        result.extend(select(
            connection,
            f"select * from {safe_identifier(table)} where {safe_identifier(id_column)} in ({placeholders})",
            tuple(part),
        ))
    return result


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
        read_timeout=180,
        write_timeout=10,
        autocommit=True,
        init_command="SET SESSION TRANSACTION READ ONLY",
    )


def load_source_rows(connection: Any) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[int, dict[str, Any]], dict[int, dict[str, Any]]]:
    diagnostic_stage("schema_inventory")
    inventory = table_inventory(connection)
    team_columns = inventory.get("nhlgamer_leagueTeams", [])
    league_column = column_name(team_columns, "leagueID", "league_id")
    team_column = column_name(team_columns, "teamID", "team_id")
    if not league_column or not team_column:
        raise RuntimeError("SportsGamer leagueTeams is missing league/team identifiers")

    diagnostic_stage("registered_teams")
    league_logo_column = column_name(
        team_columns,
        "teamLogo", "team_logo", "logo", "logoUrl", "teamImage", "team_image",
    )
    league_logo_select = (
        f"{safe_identifier(league_logo_column)} as __teamLogo, "
        "1 as __leagueLogoColumnPresent, "
        if league_logo_column
        else "NULL as __teamLogo, NULL as __leagueLogoColumnPresent, "
    )
    team_rows = select(
        connection,
        "select *, "
        f"{safe_identifier(league_column)} as __leagueID, "
        f"{safe_identifier(team_column)} as __teamID, "
        + league_logo_select +
        "0 as __scl27_export_marker "
        "from `nhlgamer_leagueTeams` "
        f"where {safe_identifier(league_column)}=%s",
        (LEAGUE_ID,),
    )
    team_ids = sorted({integer(first(row, "__teamID", "teamID", "team_id")) for row in team_rows} - {0})
    if not team_ids:
        raise RuntimeError(f"No registered teams found for SportsGamer league {LEAGUE_ID}")

    global_teams: dict[int, dict[str, Any]] = {}
    global_team_columns = inventory.get("nhlgamer_teams", [])
    global_team_id = column_name(global_team_columns, "teamID", "team_id", "id")
    if global_team_id:
        for row in fetch_by_ids(connection, "nhlgamer_teams", global_team_id, team_ids):
            global_teams[integer(first(row, "teamID", "team_id", "id"))] = row

    diagnostic_stage("registered_roster")
    roster_columns = inventory.get("nhlgamer_leagueRosters", [])
    roster_rows: list[dict[str, Any]] = []
    roster_league = column_name(roster_columns, "leagueID", "league_id")
    roster_team = column_name(roster_columns, "teamID", "team_id")
    roster_player = column_name(roster_columns, "playerID", "player_id")
    roster_link = column_name(roster_columns, "leagueTeamID", "league_team_id")
    league_team_link = column_name(team_columns, "leagueTeamID", "league_team_id", "id")

    if roster_league and roster_team and roster_player:
        roster_rows = select(
            connection,
            "select *, "
            f"{safe_identifier(roster_team)} as __teamID "
            "from `nhlgamer_leagueRosters` "
            f"where {safe_identifier(roster_league)}=%s",
            (LEAGUE_ID,),
        )
    elif roster_link and league_team_link and roster_player:
        try:
            roster_rows = select(
                connection,
                "select r.*, "
                f"lt.{safe_identifier(team_column)} as __teamID "
                "from `nhlgamer_leagueRosters` r "
                "join `nhlgamer_leagueTeams` lt "
                f"on lt.{safe_identifier(league_team_link)}=r.{safe_identifier(roster_link)} "
                f"where lt.{safe_identifier(league_column)}=%s",
                (LEAGUE_ID,),
            )
        except Exception:
            roster_rows = []

    # Some SportsGamer generations keep the current registered roster in a
    # participant/invite table rather than leagueRosters. This is the same
    # fallback order used by the already proven Fantasy roster exporter, but
    # the resulting data is imported only into the central SCL/team tables.
    if not roster_rows:
        candidates: list[tuple[int, str, str]] = []
        for table, columns in inventory.items():
            candidate_league = column_name(columns, "leagueID", "league_id")
            candidate_player = column_name(columns, "playerID", "player_id")
            candidate_team = column_name(columns, "teamID", "team_id")
            if not candidate_league or not candidate_player or not candidate_team:
                continue
            name = table.lower()
            score = (100 if name == "nhlgamer_leaguerosters" else 0)
            score += 60 if "roster" in name else 0
            score += 30 if "invite" in name else 0
            score += 10 if "league" in name else 0
            score += 5 if "participant" in name else 0
            candidates.append((score, table, candidate_league))

        for _, table, candidate_league in sorted(candidates, reverse=True):
            try:
                rows = select(
                    connection,
                    f"select * from {safe_identifier(table)} "
                    f"where {safe_identifier(candidate_league)}=%s",
                    (LEAGUE_ID,),
                )
            except Exception:
                continue
            usable = [
                row for row in rows
                if integer(first(row, "playerID", "player_id"))
                and integer(first(row, "teamID", "team_id")) in team_ids
            ]
            if "invite" in table.lower():
                accepted = [
                    row for row in usable
                    if integer(first(row, "inviteStatus", "invite_status", "status")) == 2
                ]
                if accepted:
                    usable = accepted
            if usable:
                roster_rows = usable
                break

    if not roster_rows:
        print(f"Warning: no current roster rows found for SportsGamer league {LEAGUE_ID}; importing teams only.")

    diagnostic_stage("player_profiles")
    player_ids = sorted({integer(first(row, "playerID", "player_id")) for row in roster_rows} - {0})
    players: dict[int, dict[str, Any]] = {}
    player_columns = inventory.get("nhlgamer_players", [])
    player_id_column = column_name(player_columns, "playerID", "player_id", "id")
    if player_ids and player_id_column:
        for row in fetch_by_ids(connection, "nhlgamer_players", player_id_column, player_ids):
            players[integer(first(row, "playerID", "player_id", "id"))] = row
    return team_rows, roster_rows, global_teams, players


def load_cross_league_conflicts(connection: Any) -> list[dict[str, Any]]:
    """Find players registered in both SCL 27 (527) and FCL (529).

    This intentionally mirrors the admin SQL check against nhlgamer_leagueRosters:
    a player is a conflict when the same playerID appears in both leagues.
    """
    diagnostic_stage("scl_fcl_conflicts")
    inventory = table_inventory(connection)
    roster_columns = inventory.get("nhlgamer_leagueRosters", [])
    roster_league = column_name(roster_columns, "leagueID", "league_id")
    roster_team = column_name(roster_columns, "teamID", "team_id")
    roster_player = column_name(roster_columns, "playerID", "player_id")
    if not roster_league or not roster_team or not roster_player:
        print("Warning: cannot run SCL/FCL duplicate check; leagueRosters direct identifiers are missing.")
        return []

    rows = select(
        connection,
        "select "
        f"{safe_identifier(roster_player)} as __playerID, "
        f"max(case when {safe_identifier(roster_league)}=%s then {safe_identifier(roster_team)} end) as __sclTeamID, "
        f"max(case when {safe_identifier(roster_league)}=%s then {safe_identifier(roster_team)} end) as __fclTeamID "
        "from `nhlgamer_leagueRosters` "
        f"where {safe_identifier(roster_league)} in (%s,%s) "
        f"group by {safe_identifier(roster_player)} "
        f"having count(distinct {safe_identifier(roster_league)})=2",
        (LEAGUE_ID, FCL_LEAGUE_ID, LEAGUE_ID, FCL_LEAGUE_ID),
    )

    player_ids = sorted({integer(first(row, "__playerID")) for row in rows} - {0})
    team_ids = sorted({
        integer(first(row, "__sclTeamID")) for row in rows
    } | {
        integer(first(row, "__fclTeamID")) for row in rows
    } - {0})

    players: dict[int, dict[str, Any]] = {}
    player_columns = inventory.get("nhlgamer_players", [])
    player_id_column = column_name(player_columns, "playerID", "player_id", "id")
    if player_ids and player_id_column:
        for row in fetch_by_ids(connection, "nhlgamer_players", player_id_column, player_ids):
            players[integer(first(row, "playerID", "player_id", "id"))] = row

    global_teams: dict[int, dict[str, Any]] = {}
    global_team_columns = inventory.get("nhlgamer_teams", [])
    global_team_id = column_name(global_team_columns, "teamID", "team_id", "id")
    if team_ids and global_team_id:
        for row in fetch_by_ids(connection, "nhlgamer_teams", global_team_id, team_ids):
            global_teams[integer(first(row, "teamID", "team_id", "id"))] = row

    league_names: dict[tuple[int, int], str] = {}
    team_columns = inventory.get("nhlgamer_leagueTeams", [])
    league_column = column_name(team_columns, "leagueID", "league_id")
    team_column = column_name(team_columns, "teamID", "team_id")
    if league_column and team_column:
        league_rows = select(
            connection,
            "select * from `nhlgamer_leagueTeams` "
            f"where {safe_identifier(league_column)} in (%s,%s)",
            (LEAGUE_ID, FCL_LEAGUE_ID),
        )
        for row in league_rows:
            league_id = integer(first(row, "leagueID", "league_id"))
            team_id = integer(first(row, "teamID", "team_id"))
            if not league_id or not team_id:
                continue
            name = text(first(row, "teamName", "team_name", "name"))
            if name:
                league_names[(league_id, team_id)] = name

    result: list[dict[str, Any]] = []
    for row in rows:
        player_id = integer(first(row, "__playerID"))
        scl_team_id = integer(first(row, "__sclTeamID"))
        fcl_team_id = integer(first(row, "__fclTeamID"))
        player = players.get(player_id, {})
        display = (
            text(first(player, "psntag", "gamertag", "EAID", "playerName", "username"))
            or f"Player {player_id}"
        )

        def team_name(league_id: int, team_id: int) -> str:
            league_name = league_names.get((league_id, team_id), "")
            if league_name:
                return league_name
            global_team = global_teams.get(team_id, {})
            return text(first(global_team, "teamName", "team_name", "name")) or f"Team {team_id}"

        result.append({
            "sports_gamer_player_id": player_id,
            "display_gamertag": display,
            "scl_team_id": scl_team_id,
            "scl_team_name": team_name(LEAGUE_ID, scl_team_id),
            "fcl_team_id": fcl_team_id,
            "fcl_team_name": team_name(FCL_LEAGUE_ID, fcl_team_id),
        })

    return sorted(result, key=lambda item: (item["display_gamertag"].casefold(), item["sports_gamer_player_id"]))


def main() -> int:
    diagnostic_stage("connect")
    connection = connect()
    try:
        team_rows, roster_rows, global_teams, players = load_source_rows(connection)
        conflicts = load_cross_league_conflicts(connection)
    finally:
        connection.close()

    diagnostic_stage("normalize")
    teams: dict[int, dict[str, Any]] = {}
    for row in team_rows:
        team_id = integer(first(row, "__teamID", "teamID", "team_id"))
        if not team_id:
            continue
        global_team = global_teams.get(team_id, {})
        team_name = text(first(row, "teamName", "team_name", "name")) or text(first(global_team, "teamName", "team_name", "name")) or f"Team {team_id}"
        # League-specific branding must win when that schema exposes a logo
        # column. Teams are sometimes renamed/reused between competitions, so
        # falling back to the global team logo in that case can resurrect an
        # old identity. An explicitly empty league logo also has meaning: no logo.
        has_league_logo_column = first(row, "__leagueLogoColumnPresent") is not None
        league_logo = text(first(row, "__teamLogo"))
        global_logo = text(first(
            global_team,
            "teamLogo", "team_logo", "logo", "logoUrl", "teamImage", "team_image",
        ))
        teams[team_id] = {
            "sports_gamer_league_id": LEAGUE_ID,
            "sports_gamer_team_id": team_id,
            "team_name": team_name,
            "team_logo_url": league_logo if has_league_logo_column else global_logo,
            "captain_player_id": integer(first(row, "teamCaptainID", "captainPlayerID", "captainID")) or "",
            "assistant_1_player_id": integer(first(row, "teamAssistantCaptainID", "assistantCaptainID", "assistant1PlayerID")) or "",
            "assistant_2_player_id": integer(first(row, "teamAssistantCaptainID2", "assistantCaptainID2", "assistant2PlayerID")) or "",
            "registered_at": "",
        }

    roster: dict[tuple[int, int], dict[str, Any]] = {}
    for row in roster_rows:
        team_id = integer(first(row, "__teamID", "teamID", "team_id"))
        player_id = integer(first(row, "playerID", "player_id"))
        if not team_id or not player_id or team_id not in teams:
            continue
        player = players.get(player_id, {})
        display = text(first(player, "psntag", "gamertag", "EAID", "playerName", "username")) or text(first(row, "psntag", "gamertag", "EAID", "playerName")) or f"Player {player_id}"
        preferred_id = integer(first(row, "preferredPositionID", "positionID", "preferred_position_id")) or integer(first(player, "preferredPositionID", "positionID", "preferred_position_id"))
        team = teams[team_id]
        role = "C" if player_id == team["captain_player_id"] else "A" if player_id in {team["assistant_1_player_id"], team["assistant_2_player_id"]} else ""
        roster[(team_id, player_id)] = {
            "sports_gamer_league_id": LEAGUE_ID,
            "sports_gamer_team_id": team_id,
            "sports_gamer_player_id": player_id,
            "display_gamertag": display,
            "player_country": text(first(player, "country", "countryCode", "nationality")).upper(),
            "player_image": text(first(player, "playerImage", "image", "avatar", "profileImage")),
            "player_number": integer(first(row, "playerNumber", "jerseyNumber", "number")) or integer(first(player, "playerNumber", "jerseyNumber", "number")) or "",
            "preferred_position": POSITION_BY_ID.get(preferred_id, ""),
            "captain_role": role,
        }

    diagnostic_stage("write_csv")
    TEAM_OUT.parent.mkdir(parents=True, exist_ok=True)
    team_fields = ["sports_gamer_league_id", "sports_gamer_team_id", "team_name", "team_logo_url", "captain_player_id", "assistant_1_player_id", "assistant_2_player_id", "registered_at"]
    with TEAM_OUT.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=team_fields)
        writer.writeheader()
        writer.writerows(sorted(teams.values(), key=lambda item: (item["team_name"].casefold(), item["sports_gamer_team_id"])))

    roster_fields = ["sports_gamer_league_id", "sports_gamer_team_id", "sports_gamer_player_id", "display_gamertag", "player_country", "player_image", "player_number", "preferred_position", "captain_role"]
    with ROSTER_OUT.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=roster_fields)
        writer.writeheader()
        writer.writerows(sorted(roster.values(), key=lambda item: (item["sports_gamer_team_id"], item["display_gamertag"].casefold())))

    conflict_fields = ["sports_gamer_player_id", "display_gamertag", "scl_team_id", "scl_team_name", "fcl_team_id", "fcl_team_name"]
    with CONFLICT_OUT.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=conflict_fields)
        writer.writeheader()
        writer.writerows(conflicts)

    output = os.environ.get("GITHUB_OUTPUT")
    if output:
        with open(output, "a", encoding="utf-8") as handle:
            handle.write(
                f"team_count={len(teams)}\n"
                f"player_count={len(roster)}\n"
                f"conflict_count={len(conflicts)}\n"
                f"league_id={LEAGUE_ID}\n"
                "diagnostic_stage=complete\n"
            )
    print(f"Exported {len(teams)} teams and {len(roster)} roster players for league {LEAGUE_ID}.")
    print(f"SCL/FCL duplicate roster check found {len(conflicts)} player(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
