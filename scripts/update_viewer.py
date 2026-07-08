#!/usr/bin/env python3
"""Synchronize viewer.html with the OKF Markdown corpus."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
VIEWER = ROOT / "viewer.html"
OKF_ROOT_FILES = {"index.md", "sources-index.md", "log.md"}
OKF_DIRS = {
    "document",
    "federated",
    "frameworks",
    "glossary",
    "organisations",
    "research",
    "stack",
    "standards",
    "uk-government",
}
# Repo policy superset of OKF v0.1 §9 (only "type" is spec-required);
# see docs/okf-conformance.md.
REQUIRED_FIELDS = ("type", "title", "description", "timestamp")
LINK_RE = re.compile(r"(?<!!)\[[^\]]+\]\(([^)]+)\)")


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def iter_okf_markdown() -> list[Path]:
    paths: list[Path] = []
    for path in ROOT.rglob("*.md"):
        parts = path.relative_to(ROOT).parts
        if not parts or parts[0] in {"_site", "tmp"}:
            continue
        if parts[0] in OKF_DIRS or (len(parts) == 1 and parts[0] in OKF_ROOT_FILES):
            paths.append(path)
    return sorted(paths, key=rel)


def parse_frontmatter(path: Path) -> tuple[dict[str, str], str]:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        raise ValueError(f"{rel(path)} is missing YAML frontmatter")
    end = text.find("\n---", 4)
    if end == -1:
        raise ValueError(f"{rel(path)} has unterminated YAML frontmatter")
    raw = text[4:end]
    body = text[end + 4 :].lstrip("\n").strip("\n")
    meta: dict[str, str] = {}
    for line in raw.splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        value = value.strip()
        if value.startswith(("'", '"')) and value.endswith(("'", '"')):
            value = value[1:-1]
        meta[key.strip()] = value
    return meta, body


def section_for(path_id: str) -> str:
    first = path_id.split("/", 1)[0]
    return first if first in OKF_DIRS else "root"


def resolve_link(source_id: str, href: str) -> str | None:
    href = href.strip()
    if not href or href.startswith("#"):
        return None
    if re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:", href):
        return None
    href = href.split("#", 1)[0].split("?", 1)[0]
    if not href:
        return None
    href = unquote(href)
    if href.startswith("/"):
        target = Path(href.lstrip("/"))
    else:
        target = Path(source_id).parent / href
    normalized = os.path.normpath(target.as_posix())
    return normalized.replace("\\", "/")


def find_edges(path_id: str, body: str, known_ids: set[str]) -> tuple[list[tuple[str, str]], list[str]]:
    edges: set[tuple[str, str]] = set()
    errors: list[str] = []
    for match in LINK_RE.finditer(body):
        target = resolve_link(path_id, match.group(1))
        if not target:
            continue
        if target.endswith(".md"):
            if target in known_ids:
                edges.add((path_id, target))
            else:
                errors.append(f"{path_id} links to missing Markdown file {target}")
    return sorted(edges), errors


def build_graph() -> tuple[dict[str, object], list[str]]:
    nodes: dict[str, dict[str, str]] = {}
    errors: list[str] = []
    parsed: dict[str, tuple[dict[str, str], str]] = {}

    for path in iter_okf_markdown():
        path_id = rel(path)
        try:
            meta, body = parse_frontmatter(path)
        except ValueError as exc:
            errors.append(str(exc))
            continue
        parsed[path_id] = (meta, body)
        for field in REQUIRED_FIELDS:
            if not meta.get(field):
                errors.append(f"{path_id} is missing required frontmatter field {field}")
        nodes[path_id] = {
            "type": meta.get("type", ""),
            "title": meta.get("title", path_id),
            "description": meta.get("description", ""),
            "resource": meta.get("resource", ""),
            "timestamp": meta.get("timestamp", ""),
            "aliases": meta.get("aliases", ""),
            "section": section_for(path_id),
            "body": body,
        }

    known_ids = set(nodes)
    edge_set: set[tuple[str, str]] = set()
    for path_id, (_meta, body) in parsed.items():
        edges, link_errors = find_edges(path_id, body, known_ids)
        edge_set.update(edges)
        errors.extend(link_errors)

    graph = {"nodes": nodes, "edges": [list(edge) for edge in sorted(edge_set)]}
    return graph, errors


def rendered_viewer(graph: dict[str, object]) -> str:
    text = VIEWER.read_text(encoding="utf-8")
    start_marker = "const G="
    end_marker = ";\nconst COL="
    start = text.find(start_marker)
    if start == -1:
        raise ValueError("viewer.html does not contain const G=")
    start += len(start_marker)
    end = text.find(end_marker, start)
    if end == -1:
        raise ValueError("viewer.html does not contain const COL= after const G")
    graph_json = json.dumps(graph, ensure_ascii=False, separators=(",", ":"))
    return text[:start] + graph_json + text[end:]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="fail if viewer.html is not synchronized")
    args = parser.parse_args(argv)

    graph, errors = build_graph()
    if errors:
        for error in errors:
            print(error, file=sys.stderr)
        return 1

    updated = rendered_viewer(graph)
    current = VIEWER.read_text(encoding="utf-8")
    if args.check:
        if updated != current:
            print("viewer.html is not synchronized; run python3 scripts/update_viewer.py", file=sys.stderr)
            return 1
        print(f"viewer.html is synchronized with {len(graph['nodes'])} nodes and {len(graph['edges'])} edges")
        return 0

    if updated != current:
        VIEWER.write_text(updated, encoding="utf-8")
        print(f"updated viewer.html with {len(graph['nodes'])} nodes and {len(graph['edges'])} edges")
    else:
        print(f"viewer.html already synchronized with {len(graph['nodes'])} nodes and {len(graph['edges'])} edges")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
