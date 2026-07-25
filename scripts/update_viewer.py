#!/usr/bin/env python3
"""Synchronize viewer.html with the OKF Markdown corpus."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Any
from urllib.parse import unquote

import okf_semantic

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
# The Explorer authoring profile is intentionally stricter than OKF core.
# Reserved index/log files are synthesized as Explorer nodes without changing
# their spec-defined Markdown representation.
PROFILE_REQUIRED_FIELDS = ("type", "title", "description")
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


def parse_frontmatter(path: Path) -> tuple[dict[str, Any], str]:
    try:
        document = (
            okf_semantic.parse_optional_frontmatter(path)
            if path.name in {"index.md", "log.md"}
            else okf_semantic.parse_markdown(path)
        )
    except okf_semantic.SemanticError as exc:
        raise ValueError(str(exc).replace(str(ROOT) + "/", "")) from exc
    return document.metadata, document.body


def heading_title(body: str, fallback: str) -> str:
    match = re.search(r"^#\s+(.+?)\s*$", body, re.MULTILINE)
    return match.group(1).strip() if match else fallback


def introductory_description(body: str, fallback: str) -> str:
    for block in re.split(r"\n\s*\n", body):
        candidate = " ".join(line.strip() for line in block.splitlines()).strip()
        if candidate and not candidate.startswith(("#", "-", "*", "|", "```")):
            return candidate
    return fallback


def reserved_metadata(path_id: str, metadata: dict[str, Any], body: str) -> dict[str, Any]:
    path = Path(path_id)
    if path.name == "index.md":
        fallback = "Bundle index" if path_id == "index.md" else path.parent.name.replace("-", " ").title()
        return {
            **metadata,
            "type": "Index",
            "title": heading_title(body, fallback),
            "description": introductory_description(
                body,
                "Progressive-disclosure index represented as an Explorer navigation node.",
            ),
            "status": "stable",
        }
    if path.name == "log.md":
        return {
            **metadata,
            "type": "Log",
            "title": heading_title(body, "Change log"),
            "description": "Chronological OKF bundle update log.",
            "status": "stable",
        }
    return metadata


def validate_v02_core(path_id: str, metadata: dict[str, Any], body: str) -> list[str]:
    path = Path(path_id)
    errors: list[str] = []
    if path.name == "index.md":
        allowed = {"okf_version"} if path_id == "index.md" else set()
        unexpected = sorted(set(metadata) - allowed)
        if unexpected:
            errors.append(f"reserved index frontmatter contains unsupported keys: {', '.join(unexpected)}")
        if path_id == "index.md" and metadata.get("okf_version") != "0.2":
            errors.append('bundle-root index.md must declare okf_version: "0.2" for this exemplar')
        if not re.search(r"^#\s+\S", body, re.MULTILINE):
            errors.append("reserved index must contain a top-level heading")
        return errors
    if path.name == "log.md":
        if metadata:
            errors.append("reserved log.md must not contain frontmatter")
        headings = re.findall(r"^##\s+(\S+)\s*$", body, re.MULTILINE)
        invalid = [heading for heading in headings if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", heading)]
        if invalid:
            errors.append(f"log date headings must use YYYY-MM-DD: {', '.join(invalid)}")
        if headings != sorted(headings, reverse=True):
            errors.append("log date headings must be newest first")
        return errors
    return okf_semantic.validate_v02_concept(metadata, body)


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
    nodes: dict[str, dict[str, Any]] = {}
    errors: list[str] = []
    parsed: dict[str, tuple[dict[str, Any], str]] = {}

    for path in iter_okf_markdown():
        path_id = rel(path)
        try:
            meta, body = parse_frontmatter(path)
        except ValueError as exc:
            errors.append(f"OKF v0.2 core: {exc}")
            continue
        parsed[path_id] = (meta, body)
        core_errors = validate_v02_core(path_id, meta, body)
        errors.extend(f"{path_id}: OKF v0.2 core: {error}" for error in core_errors)
        display_meta = reserved_metadata(path_id, meta, body)
        if path.name not in {"index.md", "log.md"}:
            for field in PROFILE_REQUIRED_FIELDS:
                if not display_meta.get(field):
                    errors.append(f"{path_id}: Explorer profile requires frontmatter field {field}")
            if not okf_semantic.generated_at(display_meta):
                errors.append(f"{path_id}: Explorer profile requires generated.at")
        effective_timestamp = okf_semantic.generated_at(display_meta)
        nodes[path_id] = {
            **display_meta,
            "type": display_meta.get("type", ""),
            "title": display_meta.get("title", path_id),
            "description": display_meta.get("description", ""),
            "resource": display_meta.get("resource", ""),
            # Compatibility projection for the classic viewer and v0.1-aware
            # clients. `generated` remains intact and has precedence.
            "timestamp": effective_timestamp,
            "aliases": display_meta.get("aliases", []),
            "section": section_for(path_id),
            "body": body,
            "trust_tier": okf_semantic.trust_tier(display_meta),
            "stale": okf_semantic.is_stale(display_meta),
        }

    known_ids = set(nodes)
    edge_set: set[tuple[str, str]] = set()
    for path_id, (_meta, body) in parsed.items():
        edges, link_errors = find_edges(path_id, body, known_ids)
        edge_set.update(edges)
        errors.extend(f"Explorer profile: {error}" for error in link_errors)

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
