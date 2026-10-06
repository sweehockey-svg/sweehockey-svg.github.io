#!/usr/bin/env python3
"""Reuse SCL roster/match exports, including players who left after a match."""
import csv
from pathlib import Path


def collect_ids(roster_path: Path, matches_path: Path) -> list[int]:
    ids: set[int] = set()
    for path, column in (
        (roster_path, "sports_gamer_player_id"),
        (matches_path, "source_player_id"),
    ):
        with path.open(encoding="utf-8", newline="") as handle:
            reader = csv.DictReader(handle)
            if column not in (reader.fieldnames or []):
                raise ValueError(f"Missing {column} in {path.name}")
            for row in reader:
                league = row.get("sports_gamer_league_id", row.get("source_league_id"))
                if int(league or 0) != 527:
                    raise ValueError("Only SCL league 527 is allowed")
                player_id = int(row[column])
                if player_id <= 0:
                    raise ValueError("Invalid player ID")
                ids.add(player_id)
    if not ids:
        raise ValueError("Refusing an empty SCL player-statistics export")
    return sorted(ids)


if __name__ == "__main__":
    ids = collect_ids(Path("/tmp/scl27_official_roster.csv"),
                      Path("/tmp/fantasy_match_player_stats.csv"))
    with Path("/tmp/scl_stat_player_ids.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["sports_gamer_player_id"])
        writer.writerows((player_id,) for player_id in ids)
    print(f"Reused exported SCL roster/matches: {len(ids)} statistics players")
