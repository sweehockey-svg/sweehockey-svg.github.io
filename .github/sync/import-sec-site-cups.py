#!/usr/bin/env python3
"""Build a validated TSV snapshot for public.sec_site_cup_sources."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
from decimal import Decimal, InvalidOperation
from pathlib import Path


def clean(value: object) -> str:
    return str(value or "").strip()


def numeric_sort_order(value: object) -> str:
    try:
        return str(Decimal(str(value)))
    except (InvalidOperation, ValueError):
        return "0"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("sources", nargs="+")
    args = parser.parse_args()

    rows: list[list[str]] = []
    seen: set[tuple[str, str]] = set()

    for source_name in args.sources:
        source_path = Path(source_name)
        document = json.loads(source_path.read_text(encoding="utf-8-sig"))
        cups = document.get("cups")
        if not isinstance(cups, list):
            raise ValueError(f"{source_path}: cups måste vara en lista")

        source_key = source_path.stem.lower()
        generated_at = clean(document.get("generatedAt"))

        for cup in cups:
            if not isinstance(cup, dict):
                raise ValueError(f"{source_path}: ogiltigt cupobjekt")
            cup_key = clean(cup.get("id") or cup.get("code"))
            code = clean(cup.get("code") or cup.get("name") or cup_key)
            display_name = clean(cup.get("name") or cup.get("code") or cup_key)
            if not cup_key or not code or not display_name:
                raise ValueError(f"{source_path}: cup saknar id, code eller name")
            identity = (source_key, cup_key)
            if identity in seen:
                raise ValueError(f"{source_path}: dubblett {identity}")
            seen.add(identity)

            payload = json.dumps(cup, ensure_ascii=False, separators=(",", ":"))
            checksum = hashlib.sha256(payload.encode("utf-8")).hexdigest()
            rows.append([
                source_key,
                cup_key,
                numeric_sort_order(cup.get("sortOrder")),
                code,
                display_name,
                source_path.name,
                generated_at,
                payload,
                checksum,
            ])

    if len(rows) < 30:
        raise ValueError(f"Säkerhetsstopp: endast {len(rows)} SEC-cupobjekt hittades")

    output_path = Path(args.output)
    with output_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle, delimiter="\t", lineterminator="\n")
        writer.writerow([
            "source_key",
            "cup_key",
            "sort_order",
            "code",
            "display_name",
            "source_file",
            "source_generated_at",
            "payload",
            "content_sha256",
        ])
        writer.writerows(rows)

    print(f"Validated {len(rows)} SEC cup source objects from {len(args.sources)} files.")


if __name__ == "__main__":
    main()
