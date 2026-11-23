#!/usr/bin/env python3
# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""List the concepts in an OKF v0.3 bundle with their trust and freshness.

The script reads only frontmatter, so an agent can find the concepts that
matter before it opens any full document. It applies the SPEC.md consumer
rules: concepts (section 3.2), trust tiers from current verification events
(5.3), status and superseded_by (5.4), staleness (5.5), and the value rules
of section 11.2.

Usage:
    scan.py BUNDLE_ROOT [--type TYPE] [--tag TAG] [--grep TEXT] [--current]
            [--stale] [--deprecated] [--unverified] [--now DATETIME] [--json]

Filters combine with AND. Exit status is 0, or 2 for a usage or setup problem.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.parse
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:
    print("scan.py needs PyYAML. Install it with: pip install pyyaml", file=sys.stderr)
    sys.exit(2)

DATETIME_RE = re.compile(r"^\d{4}-\d{2}-\d{2}[Tt]\d{2}:\d{2}:\d{2}(\.\d+)?([Zz]|[+-]\d{2}:\d{2})$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
TRUST_ORDER = ("human-reviewed", "machine-confirmed", "unverified")
CURRENT_STATUSES = ("stable", "draft")
BOM = "\ufeff"


class _Loader(yaml.SafeLoader):
    """SafeLoader that keeps timestamps as the text the author wrote."""


_Loader.yaml_implicit_resolvers = {
    ch: [(tag, rx) for tag, rx in resolvers if tag != "tag:yaml.org,2002:timestamp"]
    for ch, resolvers in yaml.SafeLoader.yaml_implicit_resolvers.items()
}


def read_frontmatter(path: Path) -> tuple[dict, str | None]:
    """Return (frontmatter, problem). problem is None when the block is readable."""
    lines = path.read_text(encoding="utf-8").lstrip(BOM).splitlines()
    if not lines or lines[0].rstrip("\r") != "---":
        return {}, "no frontmatter"
    for index in range(1, len(lines)):
        if lines[index].rstrip("\r") == "---":
            try:
                meta = yaml.load("\n".join(lines[1:index]), Loader=_Loader)
            except yaml.YAMLError:
                return {}, "frontmatter does not parse"
            if meta is None:
                meta = {}
            if not isinstance(meta, dict):
                return {}, "frontmatter is not a mapping"
            return meta, None
    return {}, "frontmatter is not closed"


def blank(value: Any) -> bool:
    """Section 11.2: null, an empty string, and an empty list mean an absent key."""
    return value is None or value == "" or value == []


def as_list(value: Any) -> list:
    """Section 11.2: one item stands for a list with one item."""
    if blank(value):
        return []
    return value if isinstance(value, list) else [value]


def parse_timestamp(value: Any) -> datetime | None:
    """Parse the two RFC 3339 forms of section 5. A date means 00:00 UTC that day."""
    if not isinstance(value, str):
        return None
    try:
        if DATE_RE.match(value):
            return datetime.fromisoformat(value + "T00:00:00+00:00")
        if DATETIME_RE.match(value):
            # Python 3.9 and 3.10 fromisoformat() does not accept "Z".
            return datetime.fromisoformat(value.upper().replace("Z", "+00:00"))  # noqa: FURB162
    except ValueError:
        return None
    return None


def as_tags(value: Any) -> list[str]:
    """Section 11.2: a scalar tags value is one tag. Do not split it at commas."""
    return [str(t) for t in as_list(value) if not blank(t)]


class Bundle:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.metadata: dict = {}
        index = root / "index.md"
        if index.is_file():
            meta, _ = read_frontmatter(index)
            self.metadata = meta
        version = self.metadata.get("okf_version")
        self.okf_version = str(version) if version is not None else None
        try:
            declared = tuple(int(p) for p in self.okf_version.split(".")) if self.okf_version else None
        except ValueError:
            declared = None
        # Section 12.1: older bundles may resolve bare path fields from the root.
        self.root_fallback = declared is None or declared <= (0, 2)

    def inside(self, path: Path) -> bool:
        try:
            path.relative_to(self.root)
        except ValueError:
            return False
        return True

    def concept_id(self, source: Path, target: Any) -> str | None:
        """Resolve a path field (section 6) to a concept ID, or None."""
        if not isinstance(target, str) or re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:", target):
            return None
        clean = urllib.parse.unquote(target.split("#", 1)[0])
        base = self.root if clean.startswith("/") else source.parent
        candidates = [Path(os.path.normpath(base / clean.lstrip("/")))]
        if self.root_fallback and not clean.startswith("/"):
            candidates.append(Path(os.path.normpath(self.root / clean)))
        for candidate in candidates:
            if self.inside(candidate) and candidate.is_file() and candidate.suffix == ".md":
                return candidate.relative_to(self.root).with_suffix("").as_posix()
        return None


def describe(bundle: Bundle, path: Path, meta: dict, now: datetime) -> dict:
    concept_id = path.relative_to(bundle.root).with_suffix("").as_posix()
    generated = meta.get("generated") if isinstance(meta.get("generated"), dict) else None
    generated_at_text = (generated or {}).get("at") or meta.get("timestamp")  # timestamp: v0.1 fallback
    generated_at = parse_timestamp(generated_at_text)

    # Section 5.3: an event is current when at >= generated.at, or when
    # generated is absent. An event without both by and at is ignored.
    events = [
        e for e in as_list(meta.get("verified"))
        if isinstance(e, dict) and not blank(e.get("by")) and parse_timestamp(e.get("at"))
    ]
    current = [e for e in events if generated_at is None or parse_timestamp(e.get("at")) >= generated_at]
    if not current:
        trust = "unverified"
    elif any(str(e.get("by")).startswith("human:") for e in current):
        trust = "human-reviewed"
    else:
        trust = "machine-confirmed"

    notes = []
    stale_after_text = meta.get("stale_after")
    stale_after = parse_timestamp(stale_after_text)
    malformed_stale = not blank(stale_after_text) and stale_after is None
    if malformed_stale:
        notes.append(f"stale_after {stale_after_text!r} is malformed, so the concept counts as stale")
    if events and not current:
        notes.append("verified only before the last change")

    status = meta.get("status")
    status = "stable" if blank(status) else str(status)
    if status not in ("stable", "draft", "deprecated"):
        notes.append(f"unknown status {status!r}: not current")
    superseded_by = meta.get("superseded_by")
    replacement = bundle.concept_id(path, superseded_by) if status == "deprecated" else None

    title = meta.get("title") or path.stem.replace("-", " ").replace("_", " ").strip()
    return {
        "id": concept_id,
        "path": path.relative_to(bundle.root).as_posix(),
        "type": meta.get("type"),
        "title": str(title),
        "description": meta.get("description"),
        "tags": as_tags(meta.get("tags")),
        "resource": meta.get("resource"),
        "status": status,
        "current": status in CURRENT_STATUSES,
        "superseded_by": None if blank(superseded_by) else str(superseded_by),
        "replacement_id": replacement,
        "trust": trust,
        "verified_before_change": bool(events and not current),
        "generated_at": None if blank(generated_at_text) else str(generated_at_text),
        "stale_after": None if blank(stale_after_text) else str(stale_after_text),
        "stale": malformed_stale or bool(stale_after and now >= stale_after),
        "runtime": meta.get("runtime"),
        "notes": notes,
    }


def freshness(concept: dict) -> str:
    if concept["stale"]:
        if concept["stale_after"] and any("malformed" in n for n in concept["notes"]):
            return "stale (malformed stale_after)"
        return f"stale since {concept['stale_after']}"
    if concept["stale_after"]:
        return f"fresh until {concept['stale_after']}"
    return "no stale_after"


def matches(concept: dict, args: argparse.Namespace, root: Path) -> bool:
    if args.type and str(concept["type"] or "").casefold() != args.type.casefold():
        return False
    if args.tag and args.tag.casefold() not in {t.casefold() for t in concept["tags"]}:
        return False
    if args.grep:
        # Search the whole file, so that a value stated only in a body is found.
        text = (root / concept["path"]).read_text(encoding="utf-8")
        haystack = " ".join([concept["id"], concept["title"], text]).casefold()
        if args.grep.casefold() not in haystack:
            return False
    if args.current and not concept["current"]:
        return False
    if args.stale and not concept["stale"]:
        return False
    if args.deprecated and concept["status"] != "deprecated":
        return False
    return not (args.unverified and concept["trust"] != "unverified")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="List OKF concepts with trust tier, status, and freshness.")
    parser.add_argument("bundle", type=Path, help="bundle root directory")
    parser.add_argument("--type", help="only concepts of this type (case-insensitive)")
    parser.add_argument("--tag", help="only concepts with this tag (case-insensitive)")
    parser.add_argument("--grep", help="only concepts whose ID, frontmatter, or body contains TEXT")
    parser.add_argument("--current", action="store_true", help="only current concepts (stable or draft)")
    parser.add_argument("--stale", action="store_true", help="only stale concepts")
    parser.add_argument("--deprecated", action="store_true", help="only deprecated concepts")
    parser.add_argument("--unverified", action="store_true", help="only unverified concepts")
    parser.add_argument("--now", help="current time as an RFC 3339 date-time, for staleness")
    parser.add_argument("--json", action="store_true", help="print JSON")
    args = parser.parse_args(argv)

    root = args.bundle.resolve()
    if not root.is_dir():
        print(f"scan.py: {args.bundle} is not a directory", file=sys.stderr)
        return 2
    now = datetime.now(timezone.utc)  # noqa: UP017 (datetime.UTC needs Python 3.11)
    if args.now:
        parsed = parse_timestamp(args.now)
        if parsed is None:
            print("scan.py: --now must be an RFC 3339 date-time with an offset", file=sys.stderr)
            return 2
        now = parsed

    bundle = Bundle(root)
    concepts, not_concepts = [], []
    for path in sorted(root.rglob("*.md")):
        rel = path.relative_to(root)
        if path.name in ("index.md", "log.md") or any(p.startswith(".") for p in rel.parts):
            continue
        if not bundle.inside(path.resolve()):
            continue
        meta, problem = read_frontmatter(path)
        concept_type = meta.get("type")
        if problem or not isinstance(concept_type, str) or not concept_type.strip():
            not_concepts.append({"path": rel.as_posix(), "reason": problem or "no type"})
            continue
        concepts.append(describe(bundle, path, meta, now))
    selected = [c for c in concepts if matches(c, args, root)]

    summary = {
        "concepts": len(concepts),
        "selected": len(selected),
        "not_concepts": len(not_concepts),
        "types": dict(Counter(str(c["type"]) for c in concepts).most_common()),
        "trust": {tier: sum(c["trust"] == tier for c in concepts) for tier in TRUST_ORDER},
        "stale": sum(c["stale"] for c in concepts),
        "deprecated": sum(c["status"] == "deprecated" for c in concepts),
        "draft": sum(c["status"] == "draft" for c in concepts),
        "not_current": sum(not c["current"] for c in concepts),
    }
    meta = bundle.metadata
    bundle_info = {
        "path": str(root),
        "title": meta.get("title"),
        "description": meta.get("description"),
        "license": meta.get("license"),
    }

    if args.json:
        print(json.dumps({
            "bundle": bundle_info,
            "okf_version": bundle.okf_version,
            "now": now.isoformat(),
            "summary": summary,
            "concepts": selected,
            "not_concepts": not_concepts,
        }, indent=2))
        return 0

    name = bundle_info["title"] or root.name
    print(f"Bundle {name}: {summary['concepts']} concepts, okf_version {bundle.okf_version or 'not declared'}, now {now.isoformat()}")
    if bundle_info["description"]:
        print(f"Scope: {bundle_info['description']}")
    print("Types: " + ", ".join(f"{t} {n}" for t, n in summary["types"].items()))
    print("Trust: " + ", ".join(f"{t} {n}" for t, n in summary["trust"].items())
          + f". Stale {summary['stale']}, deprecated {summary['deprecated']}, draft {summary['draft']}, not current {summary['not_current']}.")
    if not_concepts:
        print(f"Skipped {len(not_concepts)} Markdown files that are not concepts: "
              + ", ".join(f"{n['path']} ({n['reason']})" for n in not_concepts))
    if summary["selected"] != summary["concepts"]:
        print(f"Showing {summary['selected']} concepts that match the filters.")
    print()
    for c in selected:
        line = f"{c['id']}  [{c['type']}]  {c['trust']}, {c['status']}, {freshness(c)}"
        if c["status"] == "deprecated" and c["superseded_by"]:
            line += f", superseded by {c['replacement_id'] or c['superseded_by']}"
        print(line)
        text = f"    {c['title']}"
        if c["description"]:
            text += f": {c['description']}"
        print(text)
        for note in c["notes"]:
            print(f"    note: {note}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
