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
        init_command="SET SESSION TRANSACTION READ ONLY",
    )
    inventory: dict[str, object] = {
        "tables": {},
        "candidate_leagues": [],
        "metric_candidates": [],
        "metric_tables": [],
        "metric_views": [],
        "rating_defense_samples": [],
    }
    try:
        with connection.cursor() as cursor:
            cursor.execute("select database() as database_name")
            database_name = cursor.fetchone()["database_name"]
            cursor.execute(
                """
                select table_name as detected_table_name
                from information_schema.tables
                where table_schema = %s
                  and (
                    lower(table_name) like '%%league%%'
                    or lower(table_name) like '%%playerstat%%'
                    or lower(table_name) like '%%goaliestat%%'
                    or lower(table_name) like '%%match%%'
                    or lower(table_name) like '%%playoff%%'
                    or lower(table_name) like '%%bracket%%'
                    or lower(table_name) like '%%series%%'
                  )
                order by table_name
                """,
                (database_name,),
            )
            table_names = [row["detected_table_name"] for row in cursor.fetchall()]

            cursor.execute(
                """
                select
                  table_name as detected_table_name,
                  column_name as detected_column_name,
                  data_type as detected_data_type
                from information_schema.columns
                where table_schema = %s
                  and (
                    lower(column_name) like '%%dim%%'
                    or lower(column_name) like '%%impact%%'
                    or lower(column_name) like '%%rating%%'
                    or lower(column_name) like '%%defen%%'
                  )
                order by table_name, ordinal_position
                """,
                (database_name,),
            )
            inventory["metric_candidates"] = [
                {
                    "table_name": row["detected_table_name"],
                    "column_name": row["detected_column_name"],
                    "data_type": row["detected_data_type"],
                }
                for row in cursor.fetchall()
            ]

            cursor.execute(
                """
                select table_name as detected_table_name
                from information_schema.tables
                where table_schema = %s
                  and (
                    lower(table_name) like '%%stat%%'
                    or lower(table_name) like '%%rating%%'
                    or lower(table_name) like '%%impact%%'
                    or lower(table_name) like '%%participant%%'
                    or lower(table_name) like '%%metric%%'
                  )
                order by table_name
                """,
                (database_name,),
            )
            inventory["metric_tables"] = [
                row["detected_table_name"] for row in cursor.fetchall()
            ]
            table_names = sorted(set(table_names) | set(inventory["metric_tables"]))

            cursor.execute(
                """
                select table_name as detected_view_name, view_definition
                from information_schema.views
                where table_schema = %s
                  and (
                    lower(coalesce(view_definition,'')) like '%%ratingdefense%%'
                    or lower(coalesce(view_definition,'')) like '%%defensive%%'
                    or lower(coalesce(view_definition,'')) like '%% dim %%'
                  )
                order by table_name
                """,
                (database_name,),
            )
            inventory["metric_views"] = [
                {
                    "view_name": row["detected_view_name"],
                    "view_definition": row["view_definition"],
                }
                for row in cursor.fetchall()
            ]

            cursor.execute(
                """
                select
                  p.leagueID,
                  p.teamID,
                  p.playerID,
                  p.positionID,
                  count(*) as games,
                  round(avg(p.ratingDefense),4) as avg_rating_defense,
                  round(sum(p.ratingDefense),4) as sum_rating_defense,
                  min(p.ratingDefense) as min_rating_defense,
                  max(p.ratingDefense) as max_rating_defense,
                  sum(p.interceptions) as interceptions,
                  sum(p.blockedShots) as blocked_shots,
                  sum(p.takeaways) as takeaways,
                  sum(p.giveaways) as giveaways,
                  sum(p.hits) as hits
                from nhlgamer_participants p
                where p.leagueID in (507,508,509,510,511)
                  and p.positionID in (4,5)
                group by p.leagueID,p.teamID,p.playerID,p.positionID
                having count(*) > 0
                order by p.leagueID desc, avg_rating_defense desc
                limit 80
                """
            )
            inventory["rating_defense_samples"] = list(cursor.fetchall())

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
                    select
                      column_name as detected_column_name,
                      data_type as detected_data_type
                    from information_schema.columns
                    where table_schema = %s and table_name = %s
                    order by ordinal_position
                    """,
                    (database_name, table_name),
                )
                columns = cursor.fetchall()
                if columns:
                    inventory["tables"][table_name] = [
                        {
                            "column_name": row["detected_column_name"],
                            "data_type": row["detected_data_type"],
                        }
                        for row in columns
                    ]

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
    print("=== DIM / RATING / IMPACT CANDIDATES ===")
    for row in inventory["metric_candidates"]:
        print(f"{row['table_name']}\t{row['column_name']}\t{row['data_type']}")
    print("Metric-like tables:", ", ".join(inventory["metric_tables"]))
    print("Metric views:", ", ".join(row["view_name"] for row in inventory["metric_views"]))
    print("=== RATING DEFENSE SAMPLES ===")
    for row in inventory["rating_defense_samples"][:20]:
        print(json.dumps(row, ensure_ascii=False, default=str))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"Discovery failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
