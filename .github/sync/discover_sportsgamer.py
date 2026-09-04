#!/usr/bin/env python3
"""Read-only inventory of current SportsGamer league/statistics tables."""

from __future__ import annotations

import json
import os
import re
import sys

import pymysql


def required(name: str) -> str:
    value = (os.environ.get(name) or "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def quote_identifier(value: str) -> str:
    if not re.fullmatch(r"[A-Za-z0-9_]+", value):
        raise ValueError(f"Unsafe identifier: {value}")
    return f"`{value}`"


def main() -> int:
    via_ssh = bool((os.environ.get("SSH_HOST") or "").strip())
    host = "127.0.0.1" if via_ssh else required("DB_HOST")
    port = int(
        (os.environ.get("SSH_LOCAL_DB_PORT") or "3307").strip()
        if via_ssh
        else (os.environ.get("DB_PORT") or "3306").strip()
    )
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
        autocommit=True,
    )
    inventory: dict[str, object] = {"tables": {}, "candidate_leagues": []}
    try:
        with connection.cursor() as cursor:
            cursor.execute("select database() as database_name")
            database_name = cursor.fetchone()["database_name"]
            cursor.execute(
                """
                select table_name
                from information_schema.tables
                where table_schema = %s
                  and (
                    lower(table_name) like '%%league%%'
                    or lower(table_name) like '%%playerstat%%'
                    or lower(table_name) like '%%goaliestat%%'
                  )
                order by table_name
                """,
                (database_name,),
            )
            table_names = [row["table_name"] for row in cursor.fetchall()]
            important = {
                "nhlgamer_players",
                "nhlgamer_leagueRosters",
                "nhlgamer_leagueTeams",
                "nhlgamer_playerStats",
                "nhlgamer_goalieStats",
                "nhlgamer_participants",
            }
            for table_name in sorted(set(table_names) | important):
                cursor.execute(
                    """
                    select column_name, data_type
                    from information_schema.columns
                    where table_schema = %s and table_name = %s
                    order by ordinal_position
                    """,
                    (database_name, table_name),
                )
                columns = cursor.fetchall()
                if columns:
                    inventory["tables"][table_name] = columns

            for table_name, columns in inventory["tables"].items():
                names = {row["column_name"].lower(): row["column_name"] for row in columns}
                id_column = names.get("leagueid")
                name_column = next(
                    (names[key] for key in ("leaguename", "name", "title") if key in names),
                    None,
                )
                if not id_column or not name_column:
                    continue
                table_sql = quote_identifier(table_name)
                id_sql = quote_identifier(id_column)
                name_sql = quote_identifier(name_column)
                cursor.execute(
                    f"""
                    select distinct {id_sql} as league_id, {name_sql} as league_name
                    from {table_sql}
                    where lower(coalesce({name_sql}, '')) like '%%ecl%%'
                    order by {id_sql} desc
                    limit 80
                    """
                )
                for row in cursor.fetchall():
                    row["source_table"] = table_name
                    inventory["candidate_leagues"].append(row)
    finally:
        connection.close()

    with open("sportsgamer-discovery.json", "w", encoding="utf-8") as handle:
        json.dump(inventory, handle, ensure_ascii=False, indent=2, default=str)

    print("=== CURRENT ECL LEAGUES ===")
    for row in inventory["candidate_leagues"]:
        print(f"{row['league_id']}\t{row['league_name']}\t{row['source_table']}")
    print(f"Discovered {len(inventory['tables'])} relevant tables.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"Discovery failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
