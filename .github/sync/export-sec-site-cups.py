#!/usr/bin/env python3
"""Read SEC cup data from SportsGamer without modifying the source database."""

from __future__ import annotations

import argparse
import json
import os
import re
from pathlib import Path

import pymysql


FORBIDDEN_SQL = re.compile(
    r"\b(insert|update|delete|replace|create|alter|drop|truncate|call|grant|revoke|lock)\b|"
    r"\binto\s+(outfile|dumpfile)\b",
    re.IGNORECASE,
)


def env(name: str, default: str = "") -> str:
    value = str(os.environ.get(name, "")).strip()
    return value or default


def latest_only(sql: str) -> tuple[str, int]:
    pattern = re.compile(
        r"WITH\s+league_map\s+AS\s*\(\s*(.*?)\s*\),\s*normalized_teams\s+AS\s*\(",
        re.IGNORECASE | re.DOTALL,
    )
    match = pattern.search(sql)
    if not match:
        raise RuntimeError("Kunde inte hitta league_map i SEC-frågan.")

    candidates: list[tuple[int, str]] = []
    for row in re.split(r"\s+UNION\s+ALL\s+", match.group(1).strip(), flags=re.IGNORECASE):
        league = re.search(r"\b(\d+)\s+AS\s+leagueId\b", row, re.IGNORECASE)
        if league:
            candidates.append((int(league.group(1)), row.strip()))
    if not candidates:
        raise RuntimeError("league_map saknar leagueId-rader.")

    league_id, row = max(candidates, key=lambda item: item[0])
    replacement = "WITH league_map AS (\n  " + row + "\n),\nnormalized_teams AS ("
    return sql[: match.start()] + replacement + sql[match.end() :], league_id


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sql", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--mode", choices=("latest", "all"), default="latest")
    args = parser.parse_args()

    sql = Path(args.sql).read_text(encoding="utf-8-sig").strip().rstrip(";")
    session_prefix = re.compile(
        r"^\s*SET\s+SESSION\s+group_concat_max_len\s*=\s*1000000\s*;",
        re.IGNORECASE,
    )
    sql = session_prefix.sub("", sql, count=1).strip()
    guard_sql = re.sub(r"/\*.*?\*/", " ", sql, flags=re.DOTALL)
    guard_sql = re.sub(r"(?m)^\s*--.*$", " ", guard_sql).strip()
    if FORBIDDEN_SQL.search(guard_sql):
        raise RuntimeError("Säkerhetsstopp: SEC-frågan innehåller ett skrivande SQL-kommando.")
    if not re.match(r"^(with|select)\b", guard_sql, re.IGNORECASE):
        raise RuntimeError("Säkerhetsstopp: SEC-frågan måste vara SELECT/CTE.")

    league_id = None
    if args.mode == "latest":
        sql, league_id = latest_only(sql)

    ssh_enabled = bool(env("SSH_HOST"))
    host = env("DB_HOST", "127.0.0.1" if ssh_enabled else "")
    port = int(env("SSH_LOCAL_DB_PORT", "3307") if ssh_enabled else env("DB_PORT", "3306"))
    database = env("DB_NAME")
    user = env("DB_USER")
    password = env("DB_PASSWORD")
    if not all((host, database, user, password)):
        raise RuntimeError("SportsGamer-anslutningen saknar host, databas, användare eller lösenord.")

    connection = pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database,
        charset="utf8mb4",
        autocommit=False,
        connect_timeout=20,
        read_timeout=900,
        write_timeout=30,
    )
    try:
        with connection.cursor() as cursor:
            cursor.execute("SET SESSION group_concat_max_len = 1000000")
            cursor.execute("START TRANSACTION READ ONLY")
            cursor.execute(sql)
            row = cursor.fetchone()
            if not row or row[0] is None:
                raise RuntimeError("SportsGamer-frågan returnerade ingen SEC-data.")
            raw = row[0]
        connection.rollback()
    finally:
        connection.close()

    document = json.loads(raw if isinstance(raw, str) else raw.decode("utf-8"))
    cups = document.get("cups")
    expected = 1 if args.mode == "latest" else 2
    if not isinstance(cups, list) or len(cups) < expected:
        raise RuntimeError(
            f"Säkerhetsstopp: förväntade minst {expected} cupobjekt, fick "
            f"{len(cups) if isinstance(cups, list) else 0}."
        )

    Path(args.output).write_text(
        json.dumps(document, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        f"Läste {len(cups)} SEC-cupobjekt från SportsGamer i READ ONLY-transaktion"
        + (f" (leagueId {league_id})" if league_id is not None else "")
        + "."
    )


if __name__ == "__main__":
    main()
