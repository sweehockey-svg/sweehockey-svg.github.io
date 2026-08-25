from __future__ import annotations

import json
import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PLAYERS = ROOT / "players"
OUT = PLAYERS / "portrait-layouts.json"
MAX_SIDE = 220
ALPHA_THRESHOLD = 56


def analyze(path: Path):
    with Image.open(path) as src:
        natural_width, natural_height = src.size
        img = src.convert("RGBA")
        scale = min(1.0, MAX_SIDE / max(natural_width, natural_height))
        width = max(24, round(natural_width * scale))
        height = max(24, round(natural_height * scale))
        if (width, height) != img.size:
            img = img.resize((width, height), Image.Resampling.LANCZOS)

        alpha = img.getchannel("A")
        rows = [0] * height
        cols = [0] * width
        solid = 0

        for y in range(height):
            for x in range(width):
                if alpha.getpixel((x, y)) < ALPHA_THRESHOLD:
                    continue
                rows[y] += 1
                cols[x] += 1
                solid += 1

        if not solid:
            return None

        row_need = max(2, round(width * 0.018))
        col_need = max(2, round(height * 0.018))

        top = 0
        while top < height and rows[top] < row_need:
            top += 1
        bottom = height - 1
        while bottom >= 0 and rows[bottom] < row_need:
            bottom -= 1
        left = 0
        while left < width and cols[left] < col_need:
            left += 1
        right = width - 1
        while right >= 0 and cols[right] < col_need:
            right -= 1

        trim_mass = max(1, round(solid * 0.006))

        mass = 0
        q_top = 0
        for y, value in enumerate(rows):
            mass += value
            if mass >= trim_mass:
                q_top = y
                break

        mass = 0
        q_bottom = height - 1
        for y in range(height - 1, -1, -1):
            mass += rows[y]
            if mass >= trim_mass:
                q_bottom = y
                break

        mass = 0
        q_left = 0
        for x, value in enumerate(cols):
            mass += value
            if mass >= trim_mass:
                q_left = x
                break

        mass = 0
        q_right = width - 1
        for x in range(width - 1, -1, -1):
            mass += cols[x]
            if mass >= trim_mass:
                q_right = x
                break

        top = max(top, q_top)
        bottom = min(bottom, q_bottom)
        left = max(left, q_left)
        right = min(right, q_right)

        if top >= bottom or left >= right:
            return None

        bbox_width = (right - left + 1) / width
        bbox_height = (bottom - top + 1) / height
        coverage = solid / (width * height)

        # Old non-transparent/JPG-like portraits should keep the normal fallback.
        if coverage > 0.86 or (bbox_width > 0.985 and bbox_height > 0.985):
            return None

        return {
            "naturalWidth": natural_width,
            "naturalHeight": natural_height,
            "left": round(left / width, 6),
            "right": round((right + 1) / width, 6),
            "top": round(top / height, 6),
            "bottom": round((bottom + 1) / height, 6),
            "bboxWidth": round(bbox_width, 6),
            "bboxHeight": round(bbox_height, 6),
            "coverage": round(coverage, 6),
        }


def main():
    players = {}
    for path in sorted(PLAYERS.glob("*.png"), key=lambda p: p.name):
        match = re.fullmatch(r"(\d+)\.png", path.name, flags=re.I)
        if not match:
            continue
        metrics = analyze(path)
        if metrics:
            players[match.group(1)] = metrics

    payload = {"version": 1, "players": players}
    OUT.write_text(json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Wrote {OUT.relative_to(ROOT)} with {len(players)} portraits")


if __name__ == "__main__":
    main()

# Metadata is regenerated automatically when this script or a player PNG changes.
