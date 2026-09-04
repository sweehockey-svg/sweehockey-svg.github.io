#!/usr/bin/env python3
"""Read every tournament row for canonical Swedish SportsGamer players.

The source connection is deliberately opened read-only and every statement is
validated to start with SELECT.  The resulting CSV is upserted into Supabase by
the companion psql script; nothing is ever written to SportsGamer.
"""

from __future__ import annotations

import csv
import os
import re
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any, Iterable

import pymysql


KEYS = ("sports_gamer_league_id", "sports_gamer_team_id", "sports_gamer_player_id")
LEAGUE_COLUMNS = [
    "official_league_name", "league_phase", "league_stage", "league_platform_id",
    "video_game_id", "game_mode_id", "active_league", "registration_end",
    "regular_season_end",
]
TEAM_COLUMNS = ["team_name_in_league", "current_global_team_name"]
PLAYER_COLUMNS = [
    "sports_gamer_user_id", "display_gamertag", "psn_tag", "xbox_gamertag",
    "first_name", "last_name", "player_number", "player_country", "player_city",
    "player_image", "captain_role", "global_preferred_position_id",
    "global_preferred_position_name", "global_preferred_position_abbreviation",
    "roster_preferred_position_id", "roster_preferred_position_name",
    "roster_preferred_position_abbreviation", "regular_skater_position_id",
    "regular_skater_position_name", "regular_skater_position_abbreviation",
    "playoff_skater_position_id", "playoff_skater_position_name",
    "playoff_skater_position_abbreviation", "roster_position_lw", "roster_position_c",
    "roster_position_rw", "roster_position_ld", "roster_position_rd", "roster_position_g",
    "has_full_license", "has_backup_license", "roster_platform_id", "listed_in_roster",
    "has_any_statistics",
]

SKATER_MAP = [
    ("skater_games", "gamesPlayed"), ("goals", "goals"), ("assists", "assists"),
    ("points", "points"), ("plus_minus", "plusMinus"),
    ("penalty_minutes", "penaltyMinutes"), ("powerplay_goals", "ppGoals"),
    ("powerplay_assists", "ppAssists"), ("shorthanded_goals", "shGoals"),
    ("game_winning_goals", "gameWinningGoals"), ("overtime_goals", "otGoals"),
    ("penalty_shot_goals", "penaltyShotGoals"), ("shots", "shots"),
    ("hits", "hits"), ("blocked_shots", "blockedShots"),
    ("faceoff_wins", "faceoffWins"), ("faceoff_losses", "faceoffLosses"),
    ("takeaways", "takeaways"), ("giveaways", "giveaways"),
    ("deflections", "deflections"), ("interceptions", "interceptions"),
    ("penalties_drawn", "penaltiesDrawn"), ("pass_attempts", "passAttempts"),
    ("completed_passes", "passes"), ("saucer_passes", "saucerPasses"),
    ("shot_attempts", "shotAttempts"), ("possession", "possession"),
    ("pk_clear_zone", "pkClearZone"),
]
GOALIE_MAP = [
    ("games", "gamesPlayed"), ("played_minutes", "playedMinutes"),
    ("goals", "goals"), ("assists", "assists"), ("wins", "wins"),
    ("losses", "losses"), ("overtime_wins", "otWins"),
    ("overtime_losses", "otLosses"), ("ties", "ties"), ("saves", "saves"),
    ("goals_allowed", "goalsAllowed"), ("shots_against", "shotsAgainst"),
    ("shutouts", "shutouts"), ("breakaway_shots", "breakawayShots"),
    ("breakaway_saves", "breakawaySaves"),
    ("desperation_saves", "desperationSaves"), ("pk_clear_zone", "pkClearZone"),
    ("pokechecks", "pokechecks"), ("shutout_periods", "shutoutPeriods"),
]
STAT_COLUMNS = (
    [f"{stage}_{name}" for stage in ("regular", "playoff") for name, _ in SKATER_MAP]
    + [
        field
        for stage in ("regular", "playoff")
        for field in (
            [f"{stage}_goalie_{name}" for name, _ in GOALIE_MAP[:12]]
            + [f"{stage}_goalie_save_percentage", f"{stage}_goalie_goals_against_average"]
            + [f"{stage}_goalie_{name}" for name, _ in GOALIE_MAP[12:]]
        )
    ]
    + [
        "participant_regular_games", "participant_regular_ice_time_seconds",
        "participant_playoff_games", "participant_playoff_ice_time_seconds",
        "regular_statistics_source", "playoff_statistics_source",
        "sports_gamer_player_url", "sports_gamer_team_tournament_url",
    ]
)
FIELDS = list(KEYS[:1]) + LEAGUE_COLUMNS + list(KEYS[1:2]) + TEAM_COLUMNS + list(KEYS[2:]) + PLAYER_COLUMNS + STAT_COLUMNS

POSITION = {
    1: ("Left Wing", "LW"), 2: ("Center", "C"), 3: ("Right Wing", "RW"),
    4: ("Left Defenseman", "LD"), 5: ("Right Defenseman", "RD"), 6: ("Goalie", "G"),
}


def required(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def chunks(values: list[int], size: int = 300) -> Iterable[list[int]]:
    for start in range(0, len(values), size):
        yield values[start:start + size]


def select(connection: Any, sql: str, parameters: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    if not re.match(r"^\s*select\b", sql, re.I):
        raise RuntimeError("Safety stop: only SELECT statements are allowed on SportsGamer")
    with connection.cursor() as cursor:
        cursor.execute(sql, parameters)
        return list(cursor.fetchall())


def select_for_players(connection: Any, table: str, columns: str, player_ids: list[int]) -> list[dict[str, Any]]:
    allowed = {
        "nhlgamer_players", "nhlgamer_leagueRosters", "nhlgamer_playerStats",
        "nhlgamer_goalieStats", "nhlgamer_participants",
    }
    if table not in allowed:
        raise RuntimeError(f"Safety stop: unapproved source table {table}")
    rows: list[dict[str, Any]] = []
    for part in chunks(player_ids):
        placeholders = ",".join(["%s"] * len(part))
        rows.extend(select(connection, f"select {columns} from {table} where playerID in ({placeholders})", tuple(part)))
    return rows


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


def stage(value: Any) -> str:
    return "regular" if str(value or "").strip().lower() == "regular" else "playoff"


def position_fields(position_id: Any) -> tuple[Any, Any, Any]:
    pid = integer(position_id)
    label = POSITION.get(pid)
    return (pid or None, label[0] if label else None, label[1] if label else None)


def key(row: dict[str, Any]) -> tuple[int, int, int]:
    return integer(row.get("leagueID")), integer(row.get("teamID")), integer(row.get("playerID"))


def main() -> int:
    ids_file = Path(os.environ.get("PLAYER_IDS_FILE", "/tmp/swedish_player_ids.csv"))
    output = Path(os.environ.get("EXPORT_FILE", "/tmp/swedish_player_stats.csv"))
    with ids_file.open("r", encoding="utf-8-sig", newline="") as handle:
        player_ids = sorted({integer(row["sports_gamer_player_id"]) for row in csv.DictReader(handle) if integer(row.get("sports_gamer_player_id")) > 0})
    if len(player_ids) < int(os.environ.get("MIN_PLAYER_COUNT", "500")):
        raise RuntimeError(f"Safety stop: only {len(player_ids)} canonical Swedish IDs")

    via_ssh = bool(os.environ.get("SSH_HOST", "").strip())
    connection = pymysql.connect(
        host="127.0.0.1" if via_ssh else required("DB_HOST"),
        port=integer(os.environ.get("SSH_LOCAL_DB_PORT") or 3307) if via_ssh else integer(os.environ.get("DB_PORT") or 3306),
        user=required("DB_USER"), password=required("DB_PASSWORD"), database=required("DB_NAME"),
        charset="utf8mb4", cursorclass=pymysql.cursors.DictCursor,
        connect_timeout=20, read_timeout=300, write_timeout=10, autocommit=True,
        init_command="SET SESSION TRANSACTION READ ONLY",
    )
    try:
        players = select_for_players(connection, "nhlgamer_players", "playerID,userID,gamertag,psntag,EAID,firstName,lastName,playerNumber,nationality,country,city,playerImage,preferredPositionID", player_ids)
        rosters = select_for_players(connection, "nhlgamer_leagueRosters", "leagueID,teamID,playerID,positionLW,positionC,positionRW,positionLD,positionRD,positionG,preferredPositionID,hasLicense,hasBackupLicense,platformID", player_ids)
        skaters = select_for_players(connection, "nhlgamer_playerStats", "leagueID,teamID,playerID,gameType,positionID,gamesPlayed,goals,assists,points,plusMinus,penaltyMinutes,ppGoals,ppAssists,shGoals,gameWinningGoals,otGoals,penaltyShotGoals,shots,hits,blockedShots,faceoffWins,faceoffLosses,takeaways,giveaways,deflections,interceptions,penaltiesDrawn,passAttempts,passes,saucerPasses,shotAttempts,possession,pkClearZone", player_ids)
        goalies = select_for_players(connection, "nhlgamer_goalieStats", "leagueID,teamID,playerID,gameType,gamesPlayed,playedMinutes,goals,assists,wins,losses,otWins,otLosses,ties,shotsAgainst,saves,goalsAllowed,shutouts,breakawayShots,breakawaySaves,desperationSaves,pkClearZone,pokechecks,shutoutPeriods", player_ids)
        participants = select_for_players(connection, "nhlgamer_participants", "matchID,matchType,leagueID,teamID,playerID,totalIceTimeInSeconds", player_ids)

        valid = lambda r: all(part > 0 for part in key(r))
        all_keys = {key(r) for r in rosters + skaters + goalies + participants if valid(r)}
        if not all_keys:
            raise RuntimeError("Safety stop: source returned no tournament rows")
        league_team_keys = {(item[0], item[1]) for item in all_keys}
        league_ids = sorted({item[0] for item in all_keys})
        leagues: dict[int, dict[str, Any]] = {}
        league_teams: dict[tuple[int, int], dict[str, Any]] = {}
        for part in chunks(league_ids):
            placeholders = ",".join(["%s"] * len(part))
            for row in select(connection, f"select leagueID,leagueName,leaguePhase,leagueStage,platformID,videoGameID,gameModeID,activeLeague,registrationEnd,regularSeasonEnd from nhlgamer_leagues where leagueID in ({placeholders})", tuple(part)):
                leagues[integer(row["leagueID"])] = row
            for row in select(connection, f"select leagueID,teamID,teamName,teamCaptainID,teamAssistantCaptainID,teamAssistantCaptainID2 from nhlgamer_leagueTeams where leagueID in ({placeholders})", tuple(part)):
                pair = integer(row["leagueID"]), integer(row["teamID"])
                if pair in league_team_keys:
                    league_teams[pair] = row
    finally:
        connection.close()

    player_by_id = {integer(row["playerID"]): row for row in players}
    roster_by_key: dict[tuple[int, int, int], dict[str, Any]] = {}
    for source in rosters:
        k = key(source)
        current = roster_by_key.setdefault(k, dict(source))
        for name in ("positionLW", "positionC", "positionRW", "positionLD", "positionRD", "positionG", "hasLicense", "hasBackupLicense"):
            current[name] = max(integer(current.get(name)), integer(source.get(name)))

    skater_by_key: dict[tuple[int, int, int], dict[str, Any]] = defaultdict(dict)
    skater_position: dict[tuple[tuple[int, int, int], str], tuple[int, int]] = {}
    for source in skaters:
        k, group = key(source), stage(source.get("gameType"))
        target = skater_by_key[k]
        for out_name, source_name in SKATER_MAP:
            field = f"{group}_{out_name}"
            target[field] = integer(target.get(field)) + integer(source.get(source_name))
        games = integer(source.get("gamesPlayed"))
        if games >= skater_position.get((k, group), (-1, 0))[0]:
            skater_position[(k, group)] = (games, integer(source.get("positionID")))

    goalie_by_key: dict[tuple[int, int, int], dict[str, Any]] = defaultdict(dict)
    skater_sources: set[tuple[tuple[int, int, int], str]] = set()
    goalie_sources: set[tuple[tuple[int, int, int], str]] = set()
    for source in skaters:
        if integer(source.get("gamesPlayed")) > 0:
            skater_sources.add((key(source), stage(source.get("gameType"))))
    for source in goalies:
        k, group = key(source), stage(source.get("gameType"))
        if integer(source.get("gamesPlayed")) > 0:
            goalie_sources.add((k, group))
        target = goalie_by_key[k]
        for out_name, source_name in GOALIE_MAP:
            field = f"{group}_goalie_{out_name}"
            target[field] = integer(target.get(field)) + integer(source.get(source_name))

    participant_matches: dict[tuple[tuple[int, int, int], str], dict[int, int]] = defaultdict(dict)
    for source in participants:
        k, group, match_id = key(source), stage(source.get("matchType")), integer(source.get("matchID"))
        if match_id > 0:
            participant_matches[(k, group)][match_id] = max(
                participant_matches[(k, group)].get(match_id, 0), integer(source.get("totalIceTimeInSeconds"))
            )

    rows: list[dict[str, Any]] = []
    for league_id, team_id, player_id in sorted(all_keys):
        k = (league_id, team_id, player_id)
        league, team, player = leagues.get(league_id, {}), league_teams.get((league_id, team_id), {}), player_by_id.get(player_id, {})
        roster, skater, goalie = roster_by_key.get(k, {}), skater_by_key.get(k, {}), goalie_by_key.get(k, {})
        row = {field: None for field in FIELDS}
        row.update({
            "sports_gamer_league_id": league_id, "official_league_name": league.get("leagueName"),
            "league_phase": league.get("leaguePhase"), "league_stage": league.get("leagueStage"),
            "league_platform_id": league.get("platformID"), "video_game_id": league.get("videoGameID"),
            "game_mode_id": league.get("gameModeID"), "active_league": league.get("activeLeague"),
            "registration_end": league.get("registrationEnd"), "regular_season_end": league.get("regularSeasonEnd"),
            "sports_gamer_team_id": team_id, "team_name_in_league": team.get("teamName"),
            "current_global_team_name": team.get("teamName"), "sports_gamer_player_id": player_id,
            "sports_gamer_user_id": player.get("userID"),
            "display_gamertag": player.get("gamertag") or player.get("psntag") or player.get("EAID") or f"SportsGamer #{player_id}",
            "psn_tag": player.get("psntag"), "xbox_gamertag": player.get("EAID"),
            "first_name": player.get("firstName"), "last_name": player.get("lastName"),
            "player_number": player.get("playerNumber"), "player_country": player.get("country") or player.get("nationality"),
            "player_city": player.get("city"), "player_image": player.get("playerImage"),
            "global_preferred_position_id": player.get("preferredPositionID"),
            "roster_preferred_position_id": roster.get("preferredPositionID"),
            "roster_position_lw": integer(roster.get("positionLW")), "roster_position_c": integer(roster.get("positionC")),
            "roster_position_rw": integer(roster.get("positionRW")), "roster_position_ld": integer(roster.get("positionLD")),
            "roster_position_rd": integer(roster.get("positionRD")), "roster_position_g": integer(roster.get("positionG")),
            "has_full_license": integer(roster.get("hasLicense")), "has_backup_license": integer(roster.get("hasBackupLicense")),
            "roster_platform_id": roster.get("platformID"), "listed_in_roster": 1 if roster else 0,
            "has_any_statistics": 1 if skater or goalie or any((k, s) in participant_matches for s in ("regular", "playoff")) else 0,
            "sports_gamer_player_url": f"https://sportsgamer.gg/players/{player_id}",
            "sports_gamer_team_tournament_url": f"https://sportsgamer.gg/leagues/{league_id}/teams/{team_id}",
        })
        for prefix, pid in (("global_preferred", player.get("preferredPositionID")), ("roster_preferred", roster.get("preferredPositionID"))):
            _, row[f"{prefix}_position_name"], row[f"{prefix}_position_abbreviation"] = position_fields(pid)
        for group in ("regular", "playoff"):
            pid = skater_position.get((k, group), (0, 0))[1]
            row[f"{group}_skater_position_id"], row[f"{group}_skater_position_name"], row[f"{group}_skater_position_abbreviation"] = position_fields(pid)
            matches = participant_matches.get((k, group), {})
            row[f"participant_{group}_games"] = len(matches)
            row[f"participant_{group}_ice_time_seconds"] = sum(matches.values())
            if (k, group) in skater_sources:
                source_name = "nhlgamer_playerStats"
            elif (k, group) in goalie_sources:
                source_name = "nhlgamer_goalieStats"
            elif matches:
                source_name = "nhlgamer_participants"
            else:
                source_name = "roster_only"
            row[f"{group}_statistics_source"] = source_name
        captain_ids = {integer(team.get("teamCaptainID")): "C", integer(team.get("teamAssistantCaptainID")): "A", integer(team.get("teamAssistantCaptainID2")): "A"}
        row["captain_role"] = captain_ids.get(player_id)
        row.update(skater)
        row.update(goalie)
        for group in ("regular", "playoff"):
            saves = number(row.get(f"{group}_goalie_saves")); shots = number(row.get(f"{group}_goalie_shots_against"))
            goals_allowed = number(row.get(f"{group}_goalie_goals_allowed")); games = number(row.get(f"{group}_goalie_games"))
            row[f"{group}_goalie_save_percentage"] = round(saves / shots, 4) if shots else None
            row[f"{group}_goalie_goals_against_average"] = round(goals_allowed / games, 4) if games else None
        rows.append(row)

    current_ids = {integer(row.get("playerID")) for row in players}
    missing_profiles = sorted(set(player_ids) - current_ids)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows({field: "" if row.get(field) is None else row.get(field) for field in FIELDS} for row in rows)
    print(f"Read-only export complete: {len(player_ids)} Swedish IDs, {len(rows)} tournament/team/player rows, {len(missing_profiles)} profiles absent from the current source.")
    github_output = os.environ.get("GITHUB_OUTPUT")
    if github_output:
        with open(github_output, "a", encoding="utf-8") as handle:
            handle.write(f"player_count={len(player_ids)}\nrow_count={len(rows)}\nmissing_profile_count={len(missing_profiles)}\n")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"Export failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
