#!/usr/bin/env python3
"""Export Swedish player statistics only for current/recent SportsGamer leagues.

This is a lightweight wrapper around export_swedish_player_stats.py.  It keeps
all of the established row-building logic, but filters league-bound source
queries before data is read from SportsGamer.

LEAGUE_IDS may contain a comma-separated explicit list.  When omitted, the
wrapper selects recent active leagues automatically.
"""

from __future__ import annotations

import importlib.util
import os
import re
import sys
from pathlib import Path
from typing import Any


BASE_PATH = Path(__file__).with_name("export_swedish_player_stats.py")
SPEC = importlib.util.spec_from_file_location("seh_full_player_stats_export", BASE_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"Could not load {BASE_PATH}")
base = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(base)


def parse_ids(raw: str) -> list[int]:
    result: list[int] = []
    for part in re.split(r"[\s,;]+", raw.strip()):
        if not part:
            continue
        value = int(part)
        if value <= 0:
            raise ValueError(f"Invalid league id: {part}")
        if value not in result:
            result.append(value)
    return sorted(result)


REQUESTED_IDS = parse_ids(os.environ.get("LEAGUE_IDS", ""))
RECENT_WINDOW = max(1, int(os.environ.get("CURRENT_LEAGUE_WINDOW", "8")))
SELECTED_IDS: list[int] = []
SELECTED_META: list[dict[str, Any]] = []

# Keep automatic discovery focused on competitions the Svensk eHockey site
# actually presents.  Explicit LEAGUE_IDS always overrides this filter.
CURRENT_NAME_RE = re.compile(
    r"\b(ECL|SCL|SEC|FCL|GCL|WECL|ROECL)\b|WORLD\s*CUP|CHAMPIONSHIP\s+LEAGUE",
    re.I,
)


def resolve_leagues(connection: Any) -> list[int]:
    global SELECTED_IDS, SELECTED_META
    if SELECTED_IDS:
        return SELECTED_IDS

    if REQUESTED_IDS:
        placeholders = ",".join(["%s"] * len(REQUESTED_IDS))
        meta = base.select(
            connection,
            f"select leagueID,leagueName,activeLeague,registrationEnd,regularSeasonEnd "
            f"from nhlgamer_leagues where leagueID in ({placeholders}) order by leagueID",
            tuple(REQUESTED_IDS),
        )
        found = {base.integer(row.get("leagueID")) for row in meta}
        missing = sorted(set(REQUESTED_IDS) - found)
        if missing:
            raise RuntimeError(f"Unknown SportsGamer league IDs: {missing}")
        SELECTED_META = meta
        SELECTED_IDS = REQUESTED_IDS
    else:
        active = base.select(
            connection,
            "select leagueID,leagueName,activeLeague,registrationEnd,regularSeasonEnd "
            "from nhlgamer_leagues where activeLeague=1 order by leagueID desc",
        )
        if not active:
            raise RuntimeError("No active SportsGamer leagues were found")

        max_id = max(base.integer(row.get("leagueID")) for row in active)
        recent = [
            row for row in active
            if base.integer(row.get("leagueID")) >= max_id - RECENT_WINDOW
        ]
        recognised = [
            row for row in recent
            if CURRENT_NAME_RE.search(str(row.get("leagueName") or ""))
        ]
        SELECTED_META = recognised or recent
        SELECTED_IDS = sorted({base.integer(row.get("leagueID")) for row in SELECTED_META})

    if not SELECTED_IDS:
        raise RuntimeError("Current league selection is empty")

    print("Current-stat league selection:")
    for row in sorted(SELECTED_META, key=lambda item: base.integer(item.get("leagueID"))):
        print(
            f"  {base.integer(row.get('leagueID'))}: "
            f"{row.get('leagueName') or 'Unnamed league'} "
            f"(active={base.integer(row.get('activeLeague'))})"
        )
    return SELECTED_IDS


ORIGINAL_SELECT_FOR_PLAYERS = base.select_for_players


def current_select_for_players(
    connection: Any,
    table: str,
    columns: str,
    player_ids: list[int],
) -> list[dict[str, Any]]:
    if table == "nhlgamer_players":
        return ORIGINAL_SELECT_FOR_PLAYERS(connection, table, columns, player_ids)

    allowed = {
        "nhlgamer_leagueRosters", "nhlgamer_playerStats",
        "nhlgamer_goalieStats", "nhlgamer_participants",
    }
    if table not in allowed:
        raise RuntimeError(f"Safety stop: unapproved source table {table}")

    league_ids = resolve_leagues(connection)
    rows: list[dict[str, Any]] = []
    league_placeholders = ",".join(["%s"] * len(league_ids))
    for part in base.chunks(player_ids):
        player_placeholders = ",".join(["%s"] * len(part))
        sql = (
            f"select {columns} from {table} "
            f"where playerID in ({player_placeholders}) "
            f"and leagueID in ({league_placeholders})"
        )
        rows.extend(base.select(connection, sql, tuple(part) + tuple(league_ids)))
    return rows


base.select_for_players = current_select_for_players


def write_metadata() -> None:
    if not SELECTED_IDS:
        return

    output = os.environ.get("GITHUB_OUTPUT")
    if output:
        with open(output, "a", encoding="utf-8") as handle:
            handle.write(f"league_ids_csv={','.join(map(str, SELECTED_IDS))}\n")
            handle.write(f"league_count={len(SELECTED_IDS)}\n")

    summary = Path("/tmp/current-swedish-player-leagues.md")
    lines = ["### Turneringar som uppdaterades", "", "| ID | Turnering |", "| ---: | --- |"]
    by_id = {base.integer(row.get("leagueID")): row for row in SELECTED_META}
    for league_id in SELECTED_IDS:
        row = by_id.get(league_id, {})
        name = str(row.get("leagueName") or f"SportsGamer {league_id}").replace("|", "\\|")
        lines.append(f"| {league_id} | {name} |")
    lines.append("")
    summary.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    result = base.main()
    write_metadata()
    return result


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"Current stats export failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
