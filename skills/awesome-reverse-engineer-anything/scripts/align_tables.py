#!/usr/bin/env python3
"""Align markdown tables the way remark-lint's table rules expect.

The rules are:

  table-pipe-alignment   every pipe in a column sits at the same offset, so
                          each cell is padded to the column's content width
  table-cell-padding     one space between a cell edge and its content

The delimiter row uses dashes filling the column width, so it lines up with
the rows above it.

Usage:  python3 scripts/align_tables.py [file ...]
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DELIMITER = re.compile(r"^[\s|:\-]+$")


def is_table_row(line: str) -> bool:
    stripped = line.strip()
    return stripped.startswith("|") and stripped.endswith("|") and len(stripped) > 1


def split_row(line: str) -> list[str]:
    inner = line.strip()[1:-1]
    return [c.strip() for c in inner.split("|")]


def render(rows: list[list[str]], widths: list[int]) -> list[str]:
    out = []
    for row in rows:
        cells = []
        for cell, width in zip(row, widths):
            cells.append(f" {cell.ljust(width)} ")
        out.append("|" + "|".join(cells) + "|")
    return out


def align_block(rows: list[list[str]]) -> list[str]:
    """rows[0] is the header, rows[1] the delimiter, the rest data."""
    header, delimiter, *data = rows
    body = [header] + data
    ncols = len(header)
    widths = [
        max(len(r[c]) for r in body if c < len(r))
        for c in range(ncols)
    ]
    out = render([header], widths)
    out.append("|" + "|".join(f" {'-' * w} " for w in widths) + "|")
    out.extend(render(data, widths))
    return out


def process(path: Path) -> bool:
    raw = path.read_bytes()
    crlf = raw.count(b"\r\n")
    lf = raw.count(b"\n") - crlf
    newline = "\r\n" if crlf >= lf else "\n"

    text = raw.decode("utf-8")
    lines = text.replace("\r\n", "\n").split("\n")
    out: list[str] = []
    i = 0
    changed = False
    while i < len(lines):
        if not is_table_row(lines[i]):
            out.append(lines[i])
            i += 1
            continue
        block = []
        while i < len(lines) and is_table_row(lines[i]):
            block.append(lines[i])
            i += 1
        rows = [split_row(l) for l in block]
        if len(rows) >= 2 and all(DELIMITER.match(c or "-") for c in rows[1]) and rows[1]:
            rendered = align_block(rows)
            if rendered != block:
                changed = True
            out.extend(rendered)
        else:
            out.extend(block)
    if changed:
        body = newline.join(out)
        path.write_bytes(body.encode("utf-8"))
    return changed


def main() -> int:
    targets = [Path(a) for a in sys.argv[1:]] or sorted(ROOT.rglob("*.md"))
    for target in targets:
        if ".git" in target.parts or not target.exists():
            continue
        if process(target):
            print(f"aligned {target.relative_to(ROOT) if target.is_absolute() else target}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
