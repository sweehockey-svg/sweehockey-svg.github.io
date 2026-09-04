#!/usr/bin/env python3
"""Export Swedish SportsGamer profiles to a CSV consumed by psql."""

from __future__ import annotations

import csv
import os
import sys
from pathlib import Path

import pymysql


QUERY = r"""
select
  playerID as player_id,
  case when userID is not null and userID > 0 then userID else null end as user_id,
  coalesce(
    nullif(trim(gamertag), ''),
    nullif(trim(psntag), ''),
    nullif(trim(EAID), ''),
    concat('SportsGamer #', playerID)
  ) as display_gamertag,
  nullif(trim(gamertag), '') as gamertag,
  nullif(trim(psntag), '') as psn_tag,
  nullif(trim(EAID), '') as ea_id,
  nullif(trim(nationality), '') as nationality,
  nullif(trim(country), '') as country,
  nullif(trim(playerImage), '') as player_image,
  preferredPositionID as preferred_position_id
from nhlgamer_players
where playerID is not null
  and playerID > 0
  and (
    upper(trim(coalesce(nationality, ''))) in
      ('SE', 'SWE', 'SWEDEN', 'SVERIGE', 'SWEDISH', 'SVENSK')
    or upper(trim(coalesce(country, ''))) in
      ('SE', 'SWE', 'SWEDEN', 'SVERIGE', 'SWEDISH', 'SVENSK')
  )
order by playerID
"""

FIELDS = (
    "player_id",
    "user_id",
    "display_gamertag",
    "gamertag",
    "psn_tag",
    "ea_id",
    "nationality",
    "country",
    "player_image",
    "preferred_position_id",
)


def required(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def main() -> int:
    via_ssh = bool(os.environ.get("SSH_HOST", "").strip())
    host = "127.0.0.1" if via_ssh else required("DB_HOST")
    port = int(
        os.environ.get("SSH_LOCAL_DB_PORT", "3307")
        if via_ssh
        else os.environ.get("DB_PORT", "3306")
    )
    output = Path(os.environ.get("EXPORT_FILE", "/tmp/swedish_players.csv"))
    minimum = int(os.environ.get("MIN_PLAYER_COUNT", "100"))

    connection = pymysql.connect(
        host=host,
        port=port,
        user=required("DB_USER"),
        password=required("DB_PASSWORD"),
        database=required("DB_NAME"),
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        connect_timeout=20,
        read_timeout=120,
        write_timeout=30,
        autocommit=True,
    )
    try:
        with connection.cursor() as cursor:
            cursor.execute(QUERY)
            rows = cursor.fetchall()
    finally:
        connection.close()

    if len(rows) < minimum:
        raise RuntimeError(
            f"Safety stop: SportsGamer returned {len(rows)} profiles; expected at least {minimum}."
        )

    seen: set[int] = set()
    for row in rows:
        player_id = int(row["player_id"])
        if player_id <= 0 or player_id in seen:
            raise RuntimeError(f"Safety stop: invalid or duplicate player_id {player_id}.")
        seen.add(player_id)

    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow({field: "" if row[field] is None else row[field] for field in FIELDS})

    print(f"Exported {len(rows)} Swedish SportsGamer profiles.")
    github_output = os.environ.get("GITHUB_OUTPUT")
    if github_output:
        with open(github_output, "a", encoding="utf-8") as handle:
            handle.write(f"profile_count={len(rows)}\n")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"Export failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
