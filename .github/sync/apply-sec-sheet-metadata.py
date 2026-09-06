#!/usr/bin/env python3
import csv
import argparse
import io
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

SHEET_ID = os.environ.get(
    "SEC_SHEET_ID",
    "11uT6pvc1aK9W6lXbysanYXsjSdWFmeNlu03OZgBKucU",
).strip()

DATA_FILES = [
    Path("database-cups-1-13.json"),
    Path("database-cups-14-20.json"),
    Path("database-cups.json"),
]


def text(value):
    return str(value or "").strip()


def normalized_key(value):
    return re.sub(r"\s+", " ", text(value)).casefold()


def number_or_none(value):
    value = text(value).replace(",", ".")
    if not value:
        return None

    try:
        number = float(value)
        return int(number) if number.is_integer() else number
    except ValueError:
        return None


def fetch_sheet_rows(sheet_name):
    if not SHEET_ID:
        raise RuntimeError("SEC_SHEET_ID saknas.")

    query = urllib.parse.urlencode(
        {
            "tqx": "out:csv",
            "sheet": sheet_name,
        }
    )

    url = (
        f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/"
        f"gviz/tq?{query}"
    )

    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "sweehockey-sec-sheet-sync/1.0"
        },
    )

    with urllib.request.urlopen(request, timeout=30) as response:
        body = response.read().decode("utf-8-sig")

    rows = list(csv.reader(io.StringIO(body)))

    if not rows:
        raise RuntimeError(
            f"Google Sheet-fliken {sheet_name!r} gav inga rader."
        )

    return rows


def row_dicts(rows):
    headers = [text(value) for value in rows[0]]
    result = []

    for values in rows[1:]:
        if not any(text(value) for value in values):
            continue

        padded = list(values) + [""] * max(
            0,
            len(headers) - len(values)
        )

        result.append(
            {
                headers[index]: padded[index]
                for index in range(len(headers))
            }
        )

    return result


def first_value(row, *names):
    by_key = {
        normalized_key(key): value
        for key, value in row.items()
    }

    for name in names:
        value = by_key.get(normalized_key(name))

        if text(value):
            return text(value)

    return ""


def parse_rules(rows):
    result = {}

    for row in row_dicts(rows):
        code = first_value(row, "Cup")

        if not code:
            continue

        result[normalized_key(code)] = {
            "code": code,
            "settings": {
                "playoffCut1": number_or_none(
                    first_value(
                        row,
                        "slutspelsstreck  1",
                        "slutspelsstreck 1",
                    )
                ),
                "playoffCut2": number_or_none(
                    first_value(
                        row,
                        "slutspelsstreck  2",
                        "slutspelsstreck 2",
                    )
                ),
                "bestOf": {
                    "roundOf16": number_or_none(
                        first_value(
                            row,
                            "bo åtton",
                            "bo atton",
                        )
                    ),
                    "quarter": number_or_none(
                        first_value(
                            row,
                            "bo kvart",
                        )
                    ),
                    "semi": number_or_none(
                        first_value(
                            row,
                            "bo semi",
                        )
                    ),
                    "final": number_or_none(
                        first_value(
                            row,
                            "bo final",
                        )
                    ),
                },
                "minPlayers": number_or_none(
                    first_value(
                        row,
                        "Minst antal spelare",
                        "Min antal spelare",
                    )
                ),
                "maxPlayers": number_or_none(
                    first_value(
                        row,
                        "Max antal spelare",
                        "Max antal",
                    )
                ),
                "eligibility": first_value(
                    row,
                    "Behörighet:",
                    "Behörighet",
                    "Behorighet",
                ),
                "info": first_value(
                    row,
                    "Info",
                ),
            },
        }

    return result


def parse_winners(rows):
    result = {}

    for row in row_dicts(rows):
        code = first_value(
            row,
            "cup",
            "Cup",
        )

        if not code:
            continue

        result[normalized_key(code)] = {
            "winner": first_value(
                row,
                "1a",
                "1:a",
                "winner",
                "vinnare",
            ),
            "runnerUp": first_value(
                row,
                "2a",
                "2:a",
                "runnerUp",
                "runner up",
                "tvåa",
            ),
        }

    return result


def load_json(path):
    if not path.exists():
        raise RuntimeError(
            f"Saknar {path}."
        )

    with path.open(
        "r",
        encoding="utf-8-sig",
    ) as handle:
        payload = json.load(handle)

    cups = payload.get("cups")

    if not isinstance(cups, list):
        raise RuntimeError(
            f"{path} saknar cups-array."
        )

    return payload, cups


def apply_metadata(data_files=None):
    rules = parse_rules(
        fetch_sheet_rows("regler")
    )

    winners = parse_winners(
        fetch_sheet_rows("vinnare")
    )

    if len(rules) < 10:
        raise RuntimeError(
            "Orimligt få regelrader från Google Sheet: "
            f"{len(rules)}"
        )

    if len(winners) < 5:
        raise RuntimeError(
            "Orimligt få vinnarrader från Google Sheet: "
            f"{len(winners)}"
        )

    applied_rules = 0
    applied_winners = 0
    changed_files = []

    for path in (data_files or DATA_FILES):
        payload, cups = load_json(path)
        changed = False

        for cup in cups:
            if not isinstance(cup, dict):
                continue

            code = text(
                cup.get("code")
                or cup.get("name")
                or cup.get("id")
            )

            key = normalized_key(code)

            if not key:
                continue

            rule = rules.get(key)

            if rule:
                settings = rule["settings"]

                if cup.get("settings") != settings:
                    cup["settings"] = settings
                    changed = True

                applied_rules += 1

            placement = winners.get(key)

            if placement:
                winner = placement["winner"]
                runner_up = placement["runnerUp"]

                if winner and cup.get("winner") != winner:
                    cup["winner"] = winner
                    changed = True

                if runner_up and cup.get("runnerUp") != runner_up:
                    cup["runnerUp"] = runner_up
                    changed = True

                applied_winners += 1

        if changed:
            temporary_path = path.with_suffix(
                path.suffix + ".tmp"
            )

            with temporary_path.open(
                "w",
                encoding="utf-8",
                newline="\n",
            ) as handle:
                json.dump(
                    payload,
                    handle,
                    ensure_ascii=False,
                    indent=2,
                )
                handle.write("\n")

            temporary_path.replace(path)
            changed_files.append(str(path))

    if applied_rules == 0:
        raise RuntimeError(
            "Ingen cup i JSON-filerna matchade regler-fliken."
        )

    if applied_winners == 0:
        raise RuntimeError(
            "Ingen cup i JSON-filerna matchade vinnare-fliken."
        )

    print(
        f"Google Sheet regler: {len(rules)}"
    )
    print(
        f"Google Sheet vinnare: {len(winners)}"
    )
    print(
        "Matchade regelobjekt i JSON: "
        f"{applied_rules}"
    )
    print(
        "Matchade vinnarobjekt i JSON: "
        f"{applied_winners}"
    )
    print(
        "Ändrade filer: "
        + (
            ", ".join(changed_files)
            if changed_files
            else "inga"
        )
    )


if __name__ == "__main__":
    try:
        parser = argparse.ArgumentParser()
        parser.add_argument("sources", nargs="*", type=Path)
        arguments = parser.parse_args()
        apply_metadata(arguments.sources)
    except Exception as error:
        print(
            f"Sheet sync failed: {error}",
            file=sys.stderr,
        )
        raise
