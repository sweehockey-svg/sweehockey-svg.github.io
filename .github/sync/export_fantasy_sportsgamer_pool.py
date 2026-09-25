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
from bisect import bisect_right
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
PRICE_HISTORY_MAX_LEAGUE_ID = int(os.environ.get("FANTASY_PRICE_HISTORY_MAX_LEAGUE_ID") or "511")
PRICE_HISTORY_LABEL = (os.environ.get("FANTASY_PRICE_HISTORY_LABEL") or "ECL '26: Spring").strip()
PRICE_CONFIDENCE_GAMES = int(os.environ.get("FANTASY_PRICE_CONFIDENCE_GAMES") or "30")
PRICE_DIVISION_WEIGHTS = {
    "Elite": 1.00,
    "Pro": 0.90,
    "Lite": 0.75,
    "Core": 0.62,
    "Neo": 0.50,
    "National": 0.85,
    "Other": 0.75,
}
POOL_OUTPUT = Path(os.environ.get("POOL_OUTPUT", "/tmp/fantasy_player_pool.csv"))
TEAM_OUTPUT = Path(os.environ.get("TEAM_OUTPUT", "/tmp/fantasy_team_pool.csv"))

POOL_FIELDS = [
    "source_league_id",
    "source_team_id",
    "source_player_id",
    "display_gamertag",
    "team_name",
    "country_code",
    "primary_position",
    "eligible_slots",
    "suggested_price",
    "suggested_ranking_points",
    "history_games",
    "history_fantasy_points",
    "history_ppg",
    "team_logo_url",
    "raw_player",
]

TEAM_FIELDS = [
    "source_league_id",
    "source_team_id",
    "team_name",
    "team_logo_url",
    "registered_at",
    "raw_team",
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


def choose_registered_team_source(
    connection: Any,
    inventory: dict[str, list[str]],
) -> tuple[str, list[dict[str, Any]]]:
    columns = inventory.get("nhlgamer_leagueTeams", [])
    league_column = column_name(columns, "leagueID", "league_id")
    team_column = column_name(columns, "teamID", "team_id")
    if not league_column or not team_column:
        raise RuntimeError("SportsGamer nhlgamer_leagueTeams is missing league/team identifiers")

    placeholders = ",".join(["%s"] * len(LEAGUE_IDS))
    rows = select(
        connection,
        "select *, "
        f"{safe_identifier(league_column)} as __leagueID, "
        f"{safe_identifier(team_column)} as __teamID "
        "from `nhlgamer_leagueTeams` "
        f"where {safe_identifier(league_column)} in ({placeholders})",
        tuple(LEAGUE_IDS),
    )

    usable: list[dict[str, Any]] = []
    seen: set[tuple[int, int]] = set()
    for row in rows:
        league_id = integer(first(row, "__leagueID", "leagueID", "league_id"))
        team_id = integer(first(row, "__teamID", "teamID", "team_id"))
        key = (league_id, team_id)
        if league_id not in LEAGUE_IDS or team_id <= 0 or key in seen:
            continue
        seen.add(key)
        usable.append(row)

    if not usable:
        raise RuntimeError(
            f"No registered SportsGamer teams found in nhlgamer_leagueTeams for leagues {LEAGUE_IDS}"
        )

    return "nhlgamer_leagueTeams", usable


def date_text(value: Any) -> str:
    match = re.search(r"\d{4}-\d{2}-\d{2}", str(value or ""))
    return match.group(0) if match else ""


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


def explicit_roster_slots(roster: dict[str, Any], player: dict[str, Any]) -> list[str]:
    result: list[str] = []
    for slot, field in (
        ("LW", "positionLW"),
        ("C", "positionC"),
        ("RW", "positionRW"),
        ("LD", "positionLD"),
        ("RD", "positionRD"),
        ("G", "positionG"),
    ):
        value = first(roster, field)
        if value is None:
            value = first(player, field)
        if integer(value) > 0:
            result.append(slot)
    return result


def validated_cross_role_slots(
    slots: list[str],
    primary: str,
    performance: dict[str, Any] | None,
) -> list[str]:
    """Keep real goalie/skater hybrids but reject unchecked cross-role flags.

    SportsGamer position checkboxes are useful within the skater role, but old or
    accidental G flags occur. A player needs at least three recorded games in
    each role to be selectable in both. With no history, use the preferred role.
    """
    ordered = list(dict.fromkeys(slot for slot in slots if slot in {"LW", "C", "RW", "LD", "RD", "G"}))
    has_goalie = "G" in ordered
    has_skater = any(slot != "G" for slot in ordered)
    if not (has_goalie and has_skater):
        return ordered

    perf = performance or {}
    goalie_games = integer(perf.get("goalie_games"))
    skater_games = integer(perf.get("skater_games"))
    if goalie_games >= 3 and skater_games >= 3:
        return ordered
    if goalie_games >= 3:
        return ["G"]
    if skater_games >= 3:
        return [slot for slot in ordered if slot != "G"]
    if primary == "G":
        return ["G"]
    if primary in ordered:
        return [primary]
    return ordered[:1]


def json_safe(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, default=str, separators=(",", ":"))


def history_role(position: str) -> str:
    if position == "G":
        return "G"
    if position in {"LD", "RD", "D"}:
        return "D"
    return "F"


def league_strength(league_name: str) -> tuple[str, float]:
    """Return a stable historical strength tier from the official league name."""
    name = re.sub(r"\s+", " ", str(league_name or "").lower()).strip()
    detected = [
        tier for tier in ("Elite", "Pro", "Lite", "Core", "Neo")
        if re.search(rf"\b{re.escape(tier.lower())}\b", name)
    ]
    if detected:
        # Mixed pre-season leagues use the mean of their named divisions.
        return "+".join(detected), sum(PRICE_DIVISION_WEIGHTS[tier] for tier in detected) / len(detected)
    if any(token in name for token in ("scl", "eshl", "sec")):
        return "National", PRICE_DIVISION_WEIGHTS["National"]
    return "Other", PRICE_DIVISION_WEIGHTS["Other"]


def fetch_historical_league_names(
    connection: Any,
    inventory: dict[str, list[str]],
) -> dict[int, str]:
    columns = inventory.get("nhlgamer_leagues", [])
    league_id_col = column_name(columns, "leagueID", "league_id", "id")
    league_name_col = column_name(columns, "leagueName", "league_name", "name")
    if not league_id_col or not league_name_col:
        raise RuntimeError("SportsGamer league names are required for division-weighted Fantasy prices")
    rows = select(
        connection,
        f"select {safe_identifier(league_id_col)} as leagueID, "
        f"{safe_identifier(league_name_col)} as leagueName from `nhlgamer_leagues` "
        f"where {safe_identifier(league_id_col)}<=%s",
        (PRICE_HISTORY_MAX_LEAGUE_ID,),
    )
    return {
        integer(row.get("leagueID")): str(row.get("leagueName") or "")
        for row in rows
        if integer(row.get("leagueID")) > 0
    }


def fetch_historical_performance(
    connection: Any,
    inventory: dict[str, list[str]],
    player_ids: list[int],
    league_names: dict[int, str],
) -> dict[int, dict[str, Any]]:
    columns = inventory.get("nhlgamer_participants", [])
    player_col = column_name(columns, "playerID", "player_id")
    match_col = column_name(columns, "matchID", "match_id")
    pos_col = column_name(columns, "positionID", "position", "position_id")
    league_col = column_name(columns, "leagueID", "league_id")
    if not player_col or not match_col or not pos_col or not league_col:
        return {}

    def optional(*names: str) -> str | None:
        return column_name(columns, *names)

    field_map = {
        "goals": optional("goals"),
        "assists": optional("assists"),
        "blocked": optional("blockedShots", "blocked_shots"),
        "saves": optional("saves"),
        "goals_allowed": optional("goalsAllowed", "goals_allowed"),
    }

    selected = [
        f"{safe_identifier(player_col)} as playerID",
        f"{safe_identifier(match_col)} as matchID",
        f"{safe_identifier(pos_col)} as positionID",
        f"{safe_identifier(league_col)} as leagueID",
    ]
    for alias, source in field_map.items():
        selected.append(f"{safe_identifier(source)} as {safe_identifier(alias)}" if source else f"0 as {safe_identifier(alias)}")

    rows: list[dict[str, Any]] = []
    for part in chunks(player_ids, 250):
        placeholders = ",".join(["%s"] * len(part))
        rows.extend(select(
            connection,
            "select " + ",".join(selected) +
            f" from `nhlgamer_participants` where {safe_identifier(player_col)} in ({placeholders}) "
            f"and {safe_identifier(match_col)}>0 and {safe_identifier(pos_col)} between 1 and 6 "
            f"and {safe_identifier(league_col)}<=%s",
            tuple(part) + (PRICE_HISTORY_MAX_LEAGUE_ID,),
        ))

    totals: dict[int, dict[str, Any]] = defaultdict(lambda: {
        "games": 0,
        "points": 0.0,
        "skater_games": 0,
        "goalie_games": 0,
        "positions": Counter(),
        "roles": defaultdict(lambda: {
            "games": 0,
            "points": 0.0,
            "raw_points": 0.0,
            "division_games": Counter(),
        }),
        "seen": set(),
    })

    for row in rows:
        player_id = integer(row.get("playerID"))
        match_id = integer(row.get("matchID"))
        league_id = integer(row.get("leagueID"))
        position = normalize_position(row.get("positionID"))
        if not player_id or not match_id or not position:
            continue

        key = (player_id, match_id)
        if key in totals[player_id]["seen"]:
            continue
        totals[player_id]["seen"].add(key)

        goals = number(row.get("goals"))
        assists = number(row.get("assists"))
        blocked = number(row.get("blocked"))
        saves = number(row.get("saves"))
        goals_allowed = number(row.get("goals_allowed"))

        if position == "G":
            points = 1.0 + saves * 0.35 - goals_allowed * 0.50
            totals[player_id]["goalie_games"] += 1
        elif position in {"LD", "RD"}:
            points = 1.0 + goals * 6.0 + assists * 4.0 + blocked * 0.25
            totals[player_id]["skater_games"] += 1
        else:
            points = 1.0 + goals * 5.0 + assists * 3.0
            totals[player_id]["skater_games"] += 1

        role = history_role(position)
        division, strength = league_strength(league_names.get(league_id, ""))
        weighted_points = points * strength
        role_values = totals[player_id]["roles"][role]
        role_values["games"] += 1
        role_values["points"] += weighted_points
        role_values["raw_points"] += points
        role_values["division_games"][division] += 1

        totals[player_id]["games"] += 1
        totals[player_id]["points"] += weighted_points
        totals[player_id]["positions"][position] += 1

    result: dict[int, dict[str, Any]] = {}
    for player_id, values in totals.items():
        games = integer(values["games"])
        points = float(values["points"])
        roles = {}
        for role, role_values in values["roles"].items():
            role_games = integer(role_values["games"])
            role_points = float(role_values["points"])
            roles[role] = {
                "games": role_games,
                "points": round(role_points, 2),
                "raw_points": round(float(role_values["raw_points"]), 2),
                "ppg": round(role_points / role_games, 4) if role_games else 0.0,
                "division_games": dict(role_values["division_games"]),
            }
        result[player_id] = {
            "games": games,
            "points": round(points, 2),
            "ppg": round(points / games, 4) if games else 0.0,
            "skater_games": integer(values["skater_games"]),
            "goalie_games": integer(values["goalie_games"]),
            "primary_position": values["positions"].most_common(1)[0][0] if values["positions"] else "",
            "roles": roles,
        }
    return result


def role_performance(performance: dict[str, Any] | None, role: str) -> dict[str, Any]:
    if not performance:
        return {"games": 0, "points": 0.0, "ppg": 0.0, "division_games": {}}
    return dict((performance.get("roles") or {}).get(role) or {
        "games": 0,
        "points": 0.0,
        "ppg": 0.0,
        "division_games": {},
    })


def median(values: list[float]) -> float:
    ordered = sorted(values)
    if not ordered:
        return 0.0
    middle = len(ordered) // 2
    if len(ordered) % 2:
        return ordered[middle]
    return (ordered[middle - 1] + ordered[middle]) / 2.0


def build_frozen_price_reference(
    player_rows: list[dict[str, Any]],
    history: dict[int, dict[str, Any]],
) -> tuple[dict[str, float], dict[str, list[float]]]:
    raw_by_role: dict[str, list[tuple[int, float]]] = defaultdict(list)

    for player in player_rows:
        player_id = integer(first(player, "playerID", "player_id", "id"))
        perf = history.get(player_id)
        if not perf:
            continue
        for role in ("F", "D", "G"):
            role_perf = role_performance(perf, role)
            if integer(role_perf.get("games")) >= 3:
                raw_by_role[role].append((integer(role_perf.get("games")), number(role_perf.get("ppg"))))

    centers: dict[str, float] = {}
    scores: dict[str, list[float]] = {}

    for role in ("F", "D", "G"):
        centers[role] = median([ppg for _, ppg in raw_by_role.get(role, [])])
        center = centers[role]
        scores[role] = sorted(
            center + (ppg - center) * (games / (games + PRICE_CONFIDENCE_GAMES))
            for games, ppg in raw_by_role.get(role, [])
        )
    return centers, scores


def assign_history_prices(
    rows: list[dict[str, Any]],
    history: dict[int, dict[str, Any]],
    reference_centers: dict[str, float],
    reference_scores: dict[str, list[float]],
) -> None:
    for row in rows:
        player_id = integer(row["source_player_id"])
        performance = history.get(player_id)
        slot_roles = list(dict.fromkeys(
            history_role(slot)
            for slot in str(row.get("eligible_slots") or "").split("|")
            if slot
        ))
        primary_role = history_role(str(row.get("primary_position") or ""))
        candidate_roles = slot_roles or [primary_role]
        role_prices: dict[str, dict[str, Any]] = {}

        for role in candidate_roles:
            perf = role_performance(performance, role)
            games = integer(perf.get("games"))
            center = reference_centers.get(role, 0.0)
            adjusted = center
            if games < 3:
                price = 15
            else:
                confidence = games / (games + PRICE_CONFIDENCE_GAMES)
                adjusted = center + (number(perf.get("ppg")) - center) * confidence
                distribution = reference_scores.get(role, [])
                if len(distribution) <= 1:
                    pct = 0.5
                else:
                    rank = max(0, bisect_right(distribution, adjusted) - 1)
                    pct = min(1.0, rank / (len(distribution) - 1))
                price = int(round(8 + 22 * (pct ** 1.8)))
                price = max(8, min(30, price))
            role_prices[role] = {
                "price": price,
                "games": games,
                "points": round(number(perf.get("points")), 2),
                "ppg": round(number(perf.get("ppg")), 4),
                "ranking_points": round(number(adjusted), 4),
                "division_games": perf.get("division_games") or {},
            }

        # A hybrid keeps one public price. Use the highest eligible role price so
        # choosing an alternate position cannot turn the player into a bargain.
        priced_roles = [
            item for item, details in role_prices.items()
            if integer(details.get("games")) >= 3
        ] or list(role_prices)
        role = max(
            priced_roles,
            key=lambda item: (integer(role_prices[item]["price"]), item == primary_role),
        )
        selected = role_prices[role]
        row["suggested_price"] = selected["price"]
        row["suggested_ranking_points"] = selected["ranking_points"]
        row["history_games"] = selected["games"]
        row["history_fantasy_points"] = selected["points"]
        row["history_ppg"] = selected["ppg"]
        row["_pricing_role"] = role
        row["_role_prices"] = role_prices


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
        registered_team_table, registered_team_rows = choose_registered_team_source(connection, inventory)
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
        team_ids = sorted(
            {
                integer(first(row, "__teamID", "teamID", "team_id"))
                for row in deduped.values()
                if integer(first(row, "__teamID", "teamID", "team_id")) > 0
            }
            | {
                integer(first(row, "__teamID", "teamID", "team_id"))
                for row in registered_team_rows
                if integer(first(row, "__teamID", "teamID", "team_id")) > 0
            }
        )

        player_table, player_id_column = choose_entity_table(inventory, "player")
        team_table, team_id_column = choose_entity_table(inventory, "team")

        player_meta: dict[int, dict[str, Any]] = {}
        if player_table and player_id_column:
            for row in fetch_by_ids(connection, player_table, player_id_column, player_ids):
                pid = integer(first(row, "playerID", "player_id", "id"))
                if pid:
                    player_meta[pid] = row

        if not player_table or not player_id_column:
            raise RuntimeError("SportsGamer player table is required for the frozen Swedish price reference")

        all_player_rows = select(connection, f"select * from {safe_identifier(player_table)}")
        swedish_reference_rows = [
            row for row in all_player_rows
            if normalize_country(first(row, "country", "countryCode", "country_code", "nationality")) == "SE"
            and integer(first(row, "playerID", "player_id", "id")) > 0
        ]
        swedish_reference_ids = sorted({
            integer(first(row, "playerID", "player_id", "id"))
            for row in swedish_reference_rows
        })
        if not swedish_reference_ids:
            raise RuntimeError("No Swedish SportsGamer players found for the frozen Fantasy price reference")

        team_meta: dict[int, dict[str, Any]] = {}
        if team_table and team_id_column:
            for row in fetch_by_ids(connection, team_table, team_id_column, team_ids):
                tid = integer(first(row, "teamID", "team_id", "id"))
                if tid:
                    team_meta[tid] = row

        team_output_rows: list[dict[str, Any]] = []
        for registered in registered_team_rows:
            team_id = integer(first(registered, "__teamID", "teamID", "team_id"))
            league_id = integer(first(registered, "__leagueID", "leagueID", "league_id"))
            team = team_meta.get(team_id, {})

            team_name = str(
                first(team, "teamName", "name", "team_name")
                or first(registered, "teamName", "team_name")
                or f"Team {team_id}"
            ).strip()
            logo = str(
                first(team, "teamLogo", "teamLogoUrl", "logo", "logoUrl", "image", "imageUrl")
                or first(registered, "teamLogo", "teamLogoUrl", "logo", "logoUrl")
                or ""
            ).strip()
            registered_at = date_text(
                first(
                    registered,
                    "teamRegistered",
                    "registeredAt",
                    "registered_at",
                    "dateRegistered",
                    "createdAt",
                    "created_at",
                )
            )

            team_output_rows.append({
                "source_league_id": league_id,
                "source_team_id": team_id,
                "team_name": team_name,
                "team_logo_url": logo,
                "registered_at": registered_at,
                "raw_team": json_safe({
                    "registered_team_source": registered_team_table,
                    "team_source": team_table,
                    "league_team": registered,
                    "team": team or None,
                }),
            })

        # Freeze the market against every Swedish SportsGamer player's history through
        # the configured cutoff. Current SCL registrations therefore cannot move prices.
        historical_league_names = fetch_historical_league_names(connection, inventory)
        reference_history = fetch_historical_performance(
            connection,
            inventory,
            swedish_reference_ids,
            historical_league_names,
        )
        reference_centers, reference_scores = build_frozen_price_reference(
            swedish_reference_rows,
            reference_history,
        )
        if any(len(reference_scores.get(role, [])) < 2 for role in ("F", "D", "G")):
            raise RuntimeError("Frozen Fantasy price reference is missing enough Swedish F/D/G history")
        print(
            "Frozen Fantasy price reference: "
            f"through {PRICE_HISTORY_LABEL} (league <= {PRICE_HISTORY_MAX_LEAGUE_ID}); "
            + ", ".join(f"{role}={len(reference_scores[role])}" for role in ("F", "D", "G"))
        )

        historical_performance = dict(reference_history)
        foreign_or_missing_ids = [player_id for player_id in player_ids if player_id not in historical_performance]
        historical_performance.update(
            fetch_historical_performance(
                connection,
                inventory,
                foreign_or_missing_ids,
                historical_league_names,
            )
        )

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
                first(
                    roster,
                    "preferredPositionID",
                    "positionID",
                    "position",
                    "primaryPosition",
                    "mainPosition",
                    "preferredPosition",
                )
                or first(
                    player,
                    "preferredPositionID",
                    "positionID",
                    "position",
                    "primaryPosition",
                    "mainPosition",
                    "preferredPosition",
                )
            )
            if not position and observed_positions.get(player_id):
                position = observed_positions[player_id].most_common(1)[0][0]

            explicit_slots = explicit_roster_slots(roster, player)
            slots = explicit_slots or slots_for_position(position)

            slots = validated_cross_role_slots(slots, position, historical_performance.get(player_id))

            primary = position if position in {"LW", "C", "RW", "LD", "RD", "G"} else ""
            if not primary and slots:
                primary = slots[0]

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
                "suggested_price": 15,
                "suggested_ranking_points": 0,
                "history_games": 0,
                "history_fantasy_points": 0,
                "history_ppg": 0,
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

        assign_history_prices(
            output_rows,
            historical_performance,
            reference_centers,
            reference_scores,
        )

        for row in output_rows:
            raw = json.loads(row["raw_player"])
            raw["fantasy_pricing"] = {
                "model": "sports_gamer_division_weighted_roles_v3",
                "history_through": PRICE_HISTORY_LABEL,
                "history_max_league_id": PRICE_HISTORY_MAX_LEAGUE_ID,
                "reference_population": "all_swedish_sportsgamer_players",
                "confidence_games": PRICE_CONFIDENCE_GAMES,
                "division_weights": PRICE_DIVISION_WEIGHTS,
                "reference_player_counts": {
                    role: len(reference_scores.get(role, []))
                    for role in ("F", "D", "G")
                },
                "pricing_role": row.pop("_pricing_role"),
                "role_prices": row.pop("_role_prices"),
                "games": row["history_games"],
                "fantasy_points": row["history_fantasy_points"],
                "ppg": row["history_ppg"],
                "ranking_points": row["suggested_ranking_points"],
                "price": row["suggested_price"],
            }
            row["raw_player"] = json_safe(raw)

    finally:
        connection.close()

    POOL_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with POOL_OUTPUT.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=POOL_FIELDS)
        writer.writeheader()
        writer.writerows(output_rows)

    TEAM_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with TEAM_OUTPUT.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=TEAM_FIELDS)
        writer.writeheader()
        writer.writerows(team_output_rows)

    print(
        f"Fantasy SportsGamer export complete: {len(team_output_rows)} registered teams "
        f"and {len(output_rows)} current players for leagues {LEAGUE_IDS}."
    )

    github_output = os.environ.get("GITHUB_OUTPUT")
    if github_output:
        with open(github_output, "a", encoding="utf-8") as handle:
            handle.write(f"player_count={len(output_rows)}\n")
            handle.write(f"team_count={len(team_output_rows)}\n")
            handle.write(f"roster_source={roster_table}\n")
            handle.write(f"registered_team_source={registered_team_table}\n")
            handle.write(f"player_source={player_table or ''}\n")
            handle.write(f"team_source={team_table or ''}\n")

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"Fantasy SportsGamer roster export failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
