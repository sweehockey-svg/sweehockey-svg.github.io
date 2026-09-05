#!/usr/bin/env python3
"""Export verified podiums for tournaments containing Swedish players.

SportsGamer is opened in a read-only transaction and this program only runs
SELECT statements. Final and bronze placements are derived from completed,
non-ignored playoff matches linked to the official playoff bracket.
"""

from __future__ import annotations

import csv
import os
import re
import sys
from pathlib import Path
from typing import Any, Iterable

import pymysql


FIELDS = [
    "sports_gamer_league_id", "official_league_name", "league_phase",
    "league_stage", "playoff_type_id", "bracket_type", "active_league",
    "regular_season_end", "sports_gamer_team_id", "team_name_in_league",
    "current_global_team_name", "qualified_for_playoffs",
    "final_playoff_stage", "reached_playoff_stage", "playoff_round_code",
    "playoff_round_name", "playoff_status_code", "playoff_status_name",
    "final_placement", "series_played", "series_won", "series_lost",
    "matched_playoff_games", "matched_playoff_game_wins",
    "matched_playoff_game_losses", "playoff_first_match_date",
    "playoff_last_match_date", "final_winner_team_id",
    "final_opponent_team_id", "final_team_game_wins",
    "final_opponent_game_wins", "won_bronze_series", "lost_bronze_series",
    "sports_gamer_team_url",
]


def required(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def integer(value: Any) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def chunks(values: list[int], size: int = 250) -> Iterable[list[int]]:
    for start in range(0, len(values), size):
        yield values[start:start + size]


def select(connection: Any, sql: str, parameters: tuple[Any, ...]) -> list[dict[str, Any]]:
    if not re.match(r"^\s*select\b", sql, re.I):
        raise RuntimeError("Safety stop: only SELECT statements are allowed on SportsGamer")
    with connection.cursor() as cursor:
        cursor.execute(sql, parameters)
        return list(cursor.fetchall())


def excluded_competition(name: Any) -> bool:
    normalized = re.sub(r"\s+", " ", str(name or "")).strip().lower()
    return bool(re.search(r"\b(qualifier|qualification|kval|wildcard)\b", normalized))


def result_row(series: dict[str, Any], team_id: int, placement: int) -> dict[str, Any]:
    home_id = integer(series["homeTeamID"])
    away_id = integer(series["awayTeamID"])
    home_wins = integer(series["homeWins"])
    away_wins = integer(series["awayWins"])
    winner_id = home_id if home_wins > away_wins else away_id
    opponent_id = away_id if team_id == home_id else home_id
    team_wins = home_wins if team_id == home_id else away_wins
    opponent_wins = away_wins if team_id == home_id else home_wins
    is_bronze = placement == 3
    status_code = {1: "CHAMPION", 2: "RUNNER_UP", 3: "BRONZE"}[placement]
    status_name = {1: "Mästare", 2: "Finalist", 3: "Brons"}[placement]
    round_code = "BRONZE" if is_bronze else "FINAL"
    round_name = "Bronsmatch" if is_bronze else "Final"
    team_name = series["homeTeamName"] if team_id == home_id else series["awayTeamName"]
    return {
        "sports_gamer_league_id": integer(series["leagueID"]),
        "official_league_name": series["leagueName"],
        "league_phase": series["leaguePhase"],
        "league_stage": series["leagueStage"],
        "playoff_type_id": series["playoffTypeID"],
        "bracket_type": series["bracketType"],
        "active_league": series["activeLeague"],
        "regular_season_end": series["regularSeasonEnd"],
        "sports_gamer_team_id": team_id,
        "team_name_in_league": team_name,
        "current_global_team_name": team_name,
        "qualified_for_playoffs": 1,
        "final_playoff_stage": integer(series["playoffStage"]),
        "reached_playoff_stage": integer(series["playoffStage"]),
        "playoff_round_code": round_code,
        "playoff_round_name": round_name,
        "playoff_status_code": status_code,
        "playoff_status_name": status_name,
        "final_placement": placement,
        "series_played": 1,
        "series_won": 0 if placement == 2 else 1,
        "series_lost": 1 if placement == 2 else 0,
        "matched_playoff_games": integer(series["matchedGames"]),
        "matched_playoff_game_wins": team_wins,
        "matched_playoff_game_losses": opponent_wins,
        "playoff_first_match_date": series["firstMatchDate"],
        "playoff_last_match_date": series["lastMatchDate"],
        "final_winner_team_id": winner_id if not is_bronze else None,
        "final_opponent_team_id": opponent_id if not is_bronze else None,
        "final_team_game_wins": team_wins if not is_bronze else None,
        "final_opponent_game_wins": opponent_wins if not is_bronze else None,
        "won_bronze_series": 1 if is_bronze else 0,
        "lost_bronze_series": 0,
        "sports_gamer_team_url": f"https://sportsgamer.gg/leagues/{integer(series['leagueID'])}/teams/{team_id}",
    }


def main() -> int:
    stats_file = Path(os.environ.get("PLAYER_STATS_FILE", "/tmp/swedish_player_stats.csv"))
    output = Path(os.environ.get("PODIUM_EXPORT_FILE", "/tmp/swedish_tournament_podiums.csv"))
    with stats_file.open("r", encoding="utf-8-sig", newline="") as handle:
        league_ids = sorted({integer(row.get("sports_gamer_league_id")) for row in csv.DictReader(handle) if integer(row.get("sports_gamer_league_id")) > 0})
    if not league_ids:
        raise RuntimeError("Safety stop: player export contains no tournament IDs")

    via_ssh = bool(os.environ.get("SSH_HOST", "").strip())
    connection = pymysql.connect(
        host="127.0.0.1" if via_ssh else required("DB_HOST"),
        port=integer(os.environ.get("SSH_LOCAL_DB_PORT") or 3307) if via_ssh else integer(os.environ.get("DB_PORT") or 3306),
        user=required("DB_USER"), password=required("DB_PASSWORD"), database=required("DB_NAME"),
        charset="utf8mb4", cursorclass=pymysql.cursors.DictCursor,
        connect_timeout=20, read_timeout=300, write_timeout=10, autocommit=True,
        init_command="SET SESSION TRANSACTION READ ONLY",
    )
    series_rows: list[dict[str, Any]] = []
    try:
        for part in chunks(league_ids):
            placeholders = ",".join(["%s"] * len(part))
            series_rows.extend(select(connection, f"""
                select
                  p.leagueID, p.playoffStage, p.homeTeamID, p.awayTeamID,
                  p.winnerTeamID as bracketWinnerTeamID,
                  l.leagueName, l.leaguePhase, l.leagueStage, l.playoffTypeID,
                  l.bracketType, l.activeLeague, l.regularSeasonEnd,
                  coalesce(homeLeagueTeam.teamName, homeTeam.teamName) as homeTeamName,
                  coalesce(awayLeagueTeam.teamName, awayTeam.teamName) as awayTeamName,
                  coalesce(pt.bronzeGame, 0) as hasBronzeGame,
                  count(distinct m.matchID) as matchedGames,
                  sum(case
                    when m.homeTeamID = p.homeTeamID and m.goalsHome > m.goalsAway then 1
                    when m.awayTeamID = p.homeTeamID and m.goalsAway > m.goalsHome then 1
                    else 0 end) as homeWins,
                  sum(case
                    when m.homeTeamID = p.awayTeamID and m.goalsHome > m.goalsAway then 1
                    when m.awayTeamID = p.awayTeamID and m.goalsAway > m.goalsHome then 1
                    else 0 end) as awayWins,
                  min(m.matchDate) as firstMatchDate,
                  max(m.matchDate) as lastMatchDate
                from nhlgamer_playoffs p
                join nhlgamer_leagues l on l.leagueID = p.leagueID
                left join nhlgamer_playoffTypes pt on pt.playoffTypeID = l.playoffTypeID
                join nhlgamer_matches m
                  on m.leagueID = p.leagueID
                 and ((m.homeTeamID = p.homeTeamID and m.awayTeamID = p.awayTeamID)
                   or (m.homeTeamID = p.awayTeamID and m.awayTeamID = p.homeTeamID))
                 and coalesce(m.matchType, 'playoffs') = 'playoffs'
                 and coalesce(m.matchIgnore, 0) <> 1
                 and coalesce(m.complete, 0) = 1
                left join nhlgamer_leagueTeams homeLeagueTeam on homeLeagueTeam.leagueID=p.leagueID and homeLeagueTeam.teamID=p.homeTeamID
                left join nhlgamer_leagueTeams awayLeagueTeam on awayLeagueTeam.leagueID=p.leagueID and awayLeagueTeam.teamID=p.awayTeamID
                left join nhlgamer_teams homeTeam on homeTeam.teamID=p.homeTeamID
                left join nhlgamer_teams awayTeam on awayTeam.teamID=p.awayTeamID
                where p.leagueID in ({placeholders}) and p.playoffStage in (0, 1)
                group by p.leagueID,p.playoffStage,p.homeTeamID,p.awayTeamID,p.winnerTeamID,
                  l.leagueName,l.leaguePhase,l.leagueStage,l.playoffTypeID,l.bracketType,
                  l.activeLeague,l.regularSeasonEnd,homeLeagueTeam.teamName,homeTeam.teamName,
                  awayLeagueTeam.teamName,awayTeam.teamName,pt.bronzeGame
            """, tuple(part)))
    finally:
        connection.close()

    rows: list[dict[str, Any]] = []
    skipped_incomplete = 0
    skipped_mismatch = 0
    skipped_ambiguous = 0
    verified_by_league: dict[int, dict[int, dict[tuple[int, int], dict[str, Any]]]] = {}
    for series in series_rows:
        if excluded_competition(series.get("leagueName")):
            continue
        home_id, away_id = integer(series.get("homeTeamID")), integer(series.get("awayTeamID"))
        home_wins, away_wins = integer(series.get("homeWins")), integer(series.get("awayWins"))
        if not home_id or not away_id or home_wins == away_wins:
            skipped_incomplete += 1
            continue
        winner_id = home_id if home_wins > away_wins else away_id
        bracket_winner_id = integer(series.get("bracketWinnerTeamID"))
        if bracket_winner_id and bracket_winner_id != winner_id:
            skipped_mismatch += 1
            continue
        league_id = integer(series.get("leagueID"))
        playoff_stage = integer(series.get("playoffStage"))
        pair = (min(home_id, away_id), max(home_id, away_id))
        verified_by_league.setdefault(league_id, {}).setdefault(playoff_stage, {})[pair] = series

    for stages in verified_by_league.values():
        finals = list(stages.get(1, {}).values())
        if len(finals) != 1:
            if len(finals) > 1:
                skipped_ambiguous += 1
            continue
        final = finals[0]
        home_id, away_id = integer(final["homeTeamID"]), integer(final["awayTeamID"])
        winner_id = home_id if integer(final["homeWins"]) > integer(final["awayWins"]) else away_id
        loser_id = away_id if winner_id == home_id else home_id
        rows.append(result_row(final, winner_id, 1))
        rows.append(result_row(final, loser_id, 2))

        bronze_series = list(stages.get(0, {}).values())
        if len(bronze_series) == 1 and integer(bronze_series[0].get("hasBronzeGame")) == 1:
            bronze = bronze_series[0]
            bronze_winner = integer(bronze["homeTeamID"]) if integer(bronze["homeWins"]) > integer(bronze["awayWins"]) else integer(bronze["awayTeamID"])
            rows.append(result_row(bronze, bronze_winner, 3))

    unique = {(integer(row["sports_gamer_league_id"]), integer(row["sports_gamer_team_id"])): row for row in rows}
    rows = [unique[key] for key in sorted(unique)]
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows({field: "" if row.get(field) is None else row.get(field) for field in FIELDS} for row in rows)

    champions = sum(integer(row["final_placement"]) == 1 for row in rows)
    print(f"Read-only podium export complete: {len(league_ids)} relevant tournaments, {champions} verified champions, {len(rows)} podium rows, {skipped_incomplete} unfinished series, {skipped_mismatch} bracket mismatches, {skipped_ambiguous} ambiguous multi-final tournaments skipped.")
    github_output = os.environ.get("GITHUB_OUTPUT")
    if github_output:
        with open(github_output, "a", encoding="utf-8") as handle:
            handle.write(f"podium_row_count={len(rows)}\n")
            handle.write(f"champion_count={champions}\n")
            handle.write(f"podium_mismatch_count={skipped_mismatch}\n")
            handle.write(f"podium_ambiguous_count={skipped_ambiguous}\n")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"Podium export failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
