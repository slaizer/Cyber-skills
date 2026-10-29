#!/usr/bin/env python3
"""Validate this list against the rules it states in CONTRIBUTING.md.

The list has three kinds of line and they are held to different rules:

  cases   entries under the case sections. These are the ones that make
          claims about other people, so a case must carry a tag, must state
          its license, and must have a row in docs/is-it-rea.md.
  tools   entries under the plugins, guides and related-tools sections.
          These are catalogues, not claims, so a tag is not required.
  records rows in docs/is-it-rea.md and docs/by-app.md. These are the
          evidence table and the index, so they are checked for parity and
          for broken anchors, not for tags.

Checks:

  1. tags       every case carries a tag from the documented set
  2. licenses   every case states its license, or says plainly that there is none
  3. coverage   every case tagged REA has a row in docs/is-it-rea.md
  4. parity     the English and Chinese files list the same projects
  5. anchors    every in-page link resolves to a heading in the same file
  6. mirrors    no mirror or pure fork of the upstream project is listed

Run with no arguments to check the working tree:

    python3 scripts/validate_list.py

Add --json for machine-readable output.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

EN_README, ZH_README = "README.md", "README.zh-CN.md"
EN_BY_APP, ZH_BY_APP = "docs/by-app.md", "docs/by-app.zh-CN.md"
EN_ISIT, ZH_ISIT = "docs/is-it-rea.md", "docs/is-it-rea.zh-CN.md"
EN_XPOSTS, ZH_XPOSTS = "docs/x-posts.md", "docs/x-posts.zh-CN.md"
EN_PRESS, ZH_PRESS = "docs/press-and-posts.md", "docs/press-and-posts.zh-CN.md"

# Documents that are translations of each other and must therefore carry the
# same links. Each entry is (english, chinese).
DOC_PAIRS = [
    (EN_XPOSTS, ZH_XPOSTS),
    (EN_PRESS, ZH_PRESS),
]

# Sections whose entries are claims about other people's work.
CASE_SECTIONS = {
    "community cases built with rea",
    "the wider wave: without confirmed rea",
    "official showcases",
    "社区案例：用 rea 做出来的东西",
    "同一波浪潮：未写明使用 rea 的 ai 逆向项目",
    "官方案例",
}

# Sections that a table of contents is not expected to list.
BOILERPLATE = {
    "contributing",
    "license",
    "code-of-conduct",
    "security",
    "contents",
    "贡献",
    "许可",
    "许可证",
    "行为准则",
    "目录",
}

# Tag vocabulary from CONTRIBUTING.md, including the Chinese forms.
TAGS = {
    "REA",
    "AI-RE",
    "AI 逆向",
    "Rebuild",
    "重写",
    "Claim?",
    "待核实",
    "Manual RE",
    "手工逆向",
}
# A tag may be qualified: `REA (showcase)`, `REA (partial)`, `REA (author's post)`.
TAG_RE = re.compile(r"`([^`]+)`")

LICENSE_PATTERNS = [
    re.compile(r"\bMIT\b", re.I),
    re.compile(r"Apache-2\.0", re.I),
    re.compile(r"GPL-?[23](?:\.0)?(?:-or-later)?", re.I),
    re.compile(r"CC0(?:-1\.0)?", re.I),
    re.compile(r"\bUnlicensed\b", re.I),
    re.compile(r"\bno license file\b", re.I),
    re.compile(r"source-available", re.I),
    re.compile(r"\bno license\b", re.I),
    re.compile(r"\bnone\b", re.I),
    # Chinese: "仓库未附许可证", "无许可证", "没有许可协议"
    re.compile(r"(未附|无|没有)[^，。；、]{0,4}(许可|授权|协议)"),
]

UPSTREAM = "morluto/rea"

# CONTRIBUTING rule 4: no mirrors, pure forks, or re-uploads of the upstream project.
MIRROR_NAME = re.compile(r"https-github(\.|-)com-morluto-rea", re.I)
MIRROR_NAME_EXACT = re.compile(
    r"^[^/]+/(npx-)?(rea|rea-agents|rea-agents-[\d.]+|morluto-rea|rea-backup"
    r"|morluto-rea-backup|rea-agents-setup|rea-independent|morluto-rea-explainer)$",
    re.I,
)
# The description has to say the project itself is a mirror, not that it
# mentions or warns about mirrors.
MIRROR_DESC = re.compile(
    r"\b(?:is|an?|the)\s+(?:independent\s+)?(?:git\s+)?(?:mirror|copy|backup|fork|clone)\b"
    r"|\bmirror(?:s|ed)?\s+(?:of|backup of|copy of)\b"
    r"|\bunofficial\s+(?:port|mirror|fork|clone)\b",
    re.I,
)
UPSTREAM_TAGLINE = re.compile(
    r"reverse engineer anything with agents, from app behavior down to native binaries", re.I
)

BULLET = re.compile(r"^\s*[-*]\s+(.*)$")
LINK = re.compile(r"\[([^\]]+)\]\((https?://[^)\s]+)\)")
# Relative links, e.g. docs/by-app.md or ../README.md
REL_LINK = re.compile(r"\[([^\]]+)\]\((?!https?://|#)([^)\s]+)\)")
HEADING = re.compile(r"^(#{1,6})\s+(.*)$")


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def repo_of(url: str) -> str | None:
    """owner/name when the link points at a GitHub repository."""
    m = re.match(r"https?://github\.com/([^/#?]+)/([^/#?]+)", url)
    if not m:
        return None
    owner, name = m.group(1), m.group(2).split("#")[0]
    if name.endswith(".git"):
        name = name[:-4]
    return f"{owner}/{name}"


def normalise_link(url: str) -> str:
    """Collapse a link so the English and Chinese editions of a document match.

    Each edition points at its own language sibling, so `x-posts.md` and
    `x-posts.zh-CN.md` are the same target for parity purposes.
    """
    if re.match(r"^[a-z]+://", url):
        return url
    base = url.rsplit("/", 1)[-1]
    if base.endswith(".zh-CN.md"):
        base = base[: -len(".zh-CN.md")] + ".md"
    elif base.endswith("-zh-CN.md"):
        base = base[: -len("-zh-CN.md")] + ".md"
    prefix = url[: len(url) - len(url.rsplit("/", 1)[-1])]
    return prefix + base


def all_links(path: Path) -> set[str]:
    return {normalise_link(url) for _, url in LINK.findall(read(path))}


class Entry:
    def __init__(self, file: str, line_no: int, name: str, url: str, text: str, section: str):
        self.file = file
        self.line_no = line_no
        self.name = name
        self.url = url
        self.text = text
        self.section = section
        self.tags: list[str] = []
        self.has_license = False

    @property
    def repo(self) -> str | None:
        return repo_of(self.url)

    @property
    def tag(self) -> str | None:
        return self.tags[0] if self.tags else None

    @property
    def is_case(self) -> bool:
        return self.section.lower() in CASE_SECTIONS

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"<Entry {self.file}:{self.line_no} {self.repo or self.url} {self.tag}>"


def parse_file(path: Path) -> tuple[list[Entry], set[str]]:
    """Return the entries in a file and every GitHub repo it links to."""
    entries: list[Entry] = []
    all_repos: set[str] = set()
    section = "(top)"
    for line_no, raw in enumerate(read(path).splitlines(), start=1):
        heading = HEADING.match(raw)
        if heading:
            section = heading.group(2).strip()
            continue

        links = LINK.findall(raw)
        for _, url in links:
            repo = repo_of(url)
            if repo:
                all_repos.add(repo)

        # A bullet or a table row that starts with a link is an entry.
        first = links[0] if links else None
        if first is None:
            continue
        is_row = raw.lstrip().startswith("|")
        if is_row:
            if not BULLET.match(raw) and not raw.lstrip().startswith("|"):
                continue
        name, url = first
        text = raw
        entries.append(Entry(path.name, line_no, name, url, text, section))
    return entries, all_repos


def attach_metadata(entries: list[Entry]) -> None:
    for entry in entries:
        for match in TAG_RE.finditer(entry.text):
            candidate = match.group(1).strip()
            base = candidate.split("(")[0].strip()
            if candidate in TAGS or base in TAGS:
                entry.tags.append(candidate)
        entry.has_license = any(p.search(entry.text) for p in LICENSE_PATTERNS)


def anchor_of(heading: str) -> str:
    slug = heading.strip().lower()
    slug = re.sub(r"[^\w\s一-鿿-]", "", slug)
    return re.sub(r"\s+", "-", slug)


def check_toc(path: Path, toc_name: str) -> list[str]:
    """Every table-of-contents entry must point at a heading, in order.

    Entries that link a file rather than an anchor cannot be matched, and
    they break the pairing for everything after them. Only the headings
    that come after the table of contents are paired with it; a section
    that sits above the contents is not part of it.
    """
    text = read(path)
    problems: list[str] = []
    match = re.search(
        r"^##\s+" + re.escape(toc_name) + r"\s*\n\n(.*?)\n\n", text, re.M | re.S
    )
    if not match:
        return [f"{path.name} has no table of contents under {toc_name!r}"]
    toc_start = match.start()
    headings = [
        anchor_of(h)
        for h in re.findall(r"^##\s+(.*)$", text[toc_start:], re.M)
        if h.strip() != toc_name and anchor_of(h) not in BOILERPLATE
    ]
    items = re.findall(r"^- \[([^\]]+)\]\(#([^)]+)\)", match.group(1), re.M)
    for (label, anchor), heading in zip(items, headings):
        if anchor != heading:
            problems.append(
                f"{path.name} table of contents points at #{anchor} but the next "
                f"heading is #{heading}"
            )
    if len(items) != len(headings):
        problems.append(
            f"{path.name} table of contents has {len(items)} entries for "
            f"{len(headings)} headings"
        )
    return problems


def check_anchors(path: Path) -> list[str]:
    text = read(path)
    anchors = set()
    for line in text.splitlines():
        heading = HEADING.match(line)
        if heading:
            anchors.add(anchor_of(heading.group(2)))
    problems = []
    for line_no, line in enumerate(text.splitlines(), start=1):
        for target in re.findall(r"\]\(#([^)]+)\)", line):
            if target not in anchors:
                problems.append(f"{path.name}:{line_no} broken anchor #{target}")
    return problems


def check_tables(path: Path) -> list[str]:
    """Every row of a table must have the same number of cells as its header.

    A row with the wrong count renders as a broken table on GitHub, and it
    is the one mistake that alignment cannot fix.
    """
    problems: list[str] = []
    expected: int | None = None
    for line_no, line in enumerate(read(path).splitlines(), start=1):
        stripped = line.strip()
        if not (stripped.startswith("|") and stripped.endswith("|")):
            expected = None
            continue
        cells = len(stripped[1:-1].split("|"))
        if expected is None:
            expected = cells
        elif cells != expected:
            problems.append(
                f"{path.name}:{line_no} table row has {cells} cells, the header has "
                f"{expected}"
            )
    return problems


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", action="store_true", help="machine-readable output")
    args = parser.parse_args()

    errors: list[str] = []
    warnings: list[str] = []

    files = [EN_README, ZH_README, EN_BY_APP, ZH_BY_APP, EN_ISIT, ZH_ISIT]
    files += [name for pair in DOC_PAIRS for name in pair]
    entries_by_file: dict[str, list[Entry]] = {}
    repos_by_file: dict[str, set[str]] = {}
    for name in files:
        path = ROOT / name
        if not path.exists():
            errors.append(f"missing file: {name}")
            continue
        entries, repos = parse_file(path)
        attach_metadata(entries)
        entries_by_file[name] = entries
        repos_by_file[name] = repos

    # 1. tags on cases
    for name in (EN_README, ZH_README):
        for entry in entries_by_file.get(name, []):
            if entry.repo is None or not entry.is_case:
                continue
            if not entry.tags:
                errors.append(
                    f"{name}:{entry.line_no} {entry.repo} is a case but carries no tag "
                    f"from the documented set"
                )

    # 2. licenses on cases
    for name in (EN_README, ZH_README):
        for entry in entries_by_file.get(name, []):
            if entry.repo is None or not entry.is_case:
                continue
            if entry.has_license:
                continue
            warnings.append(
                f"{name}:{entry.line_no} {entry.repo} does not state a license"
            )

    # 3. coverage: every REA case has a row in is-it-rea
    for readme, isit in ((EN_README, EN_ISIT), (ZH_README, ZH_ISIT)):
        isit_repos = repos_by_file.get(isit, set())
        for entry in entries_by_file.get(readme, []):
            if entry.repo is None or not entry.is_case or not entry.tags:
                continue
            if entry.tag.split("(")[0].strip() != "REA":
                continue
            if entry.repo == UPSTREAM:
                continue
            if entry.repo not in isit_repos:
                warnings.append(
                    f"{readme}:{entry.line_no} {entry.repo} is tagged REA but has no row "
                    f"in {isit}"
                )

    # 4. parity between the English and Chinese file of each pair
    for en_name, zh_name in ((EN_README, ZH_README), (EN_BY_APP, ZH_BY_APP), (EN_ISIT, ZH_ISIT)):
        en_repos = repos_by_file.get(en_name, set())
        zh_repos = repos_by_file.get(zh_name, set())
        for repo in sorted(en_repos - zh_repos):
            errors.append(f"{en_name} lists {repo} but {zh_name} does not")
        for repo in sorted(zh_repos - en_repos):
            errors.append(f"{zh_name} lists {repo} but {en_name} does not")

    # 4b. documents that are translations of each other must carry the same links
    for en_name, zh_name in DOC_PAIRS:
        en_path, zh_path = ROOT / en_name, ROOT / zh_name
        if not (en_path.exists() and zh_path.exists()):
            continue
        en_links, zh_links = all_links(en_path), all_links(zh_path)
        for url in sorted(en_links - zh_links):
            errors.append(f"{en_name} links {url} but {zh_name} does not")
        for url in sorted(zh_links - en_links):
            errors.append(f"{zh_name} links {url} but {en_name} does not")

    # 5. anchors
    for name in files:
        path = ROOT / name
        if path.exists():
            errors.extend(check_anchors(path))

    # 5b. the table of contents must match the headings
    errors.extend(check_toc(ROOT / EN_README, "Contents"))
    errors.extend(check_toc(ROOT / ZH_README, "目录"))

    # 5c. table rows must have the same number of cells as their header
    for name in files:
        path = ROOT / name
        if path.exists():
            errors.extend(check_tables(path))

    # 6. mirrors
    for name in files:
        for entry in entries_by_file.get(name, []):
            repo = entry.repo
            if repo is None or repo == UPSTREAM:
                continue
            if MIRROR_NAME.search(repo) or MIRROR_NAME_EXACT.match(repo):
                errors.append(
                    f"{name}:{entry.line_no} {repo} looks like a mirror or re-upload of "
                    f"the upstream project, which rule 4 rejects"
                )
            elif MIRROR_DESC.search(entry.text) or UPSTREAM_TAGLINE.search(entry.text):
                errors.append(
                    f"{name}:{entry.line_no} {repo} reads like a mirror of the upstream project"
                )

    # 7. an English document must not send the reader to a Chinese-only file,
    # but only when the English counterpart exists. Pointing at the Chinese
    # edition is correct while no English edition has been written yet.
    # The one other allowed case is the language switcher on line 3, which
    # links a document to its own Chinese sibling. Chinese documents may
    # link their English siblings too, which is how a reader switches
    # language.
    for name in files:
        if name.endswith(".zh-CN.md"):
            continue
        path = ROOT / name
        if not path.exists():
            continue
        sibling = Path(name).name.replace(".md", ".zh-CN.md")
        text = read(path)
        for line_no, line in enumerate(text.splitlines(), start=1):
            for _, url in REL_LINK.findall(line):
                if not url.endswith(".zh-CN.md"):
                    continue
                base = url.rsplit("/", 1)[-1]
                if base == sibling:
                    continue
                # Resolve the English counterpart relative to the link's own
                # directory, not the current file's.
                english_url = url[: -len(".zh-CN.md")] + ".md"
                if not (path.parent / english_url).resolve().exists():
                    continue
                errors.append(
                    f"{name}:{line_no} links {url}, which is the Chinese edition of a "
                    f"document that also exists in English. Link the English file."
                )

    if args.json:
        print(json.dumps({"errors": errors, "warnings": warnings}, indent=2))
        return 1 if errors else 0

    for message in errors:
        print(f"ERROR   {message}")
    for message in warnings:
        print(f"WARNING {message}")
    print()
    print(f"{len(errors)} error(s), {len(warnings)} warning(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
