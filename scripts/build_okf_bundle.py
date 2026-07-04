#!/usr/bin/env python3
"""Build the normalized OKF Explorer bundle from the local Markdown corpus."""

from __future__ import annotations

import argparse
import difflib
import json
import re
import sys
from pathlib import Path
from typing import Any

import update_viewer

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "okf.config.json"
DEFAULT_OUTPUT = ROOT / "okf-bundle.json"


def route_slug(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "index"


def route_aliases(path_id: str, node: dict[str, str]) -> list[str]:
    aliases = {
        route_slug(Path(path_id).with_suffix("").as_posix()),
        path_id.lower(),
        path_id.removesuffix(".md").lower(),
    }
    if "/" not in path_id:
        aliases.add(route_slug(Path(path_id).stem))
    if path_id == "index.md":
        aliases.add("index")
    for alias in (node.get("aliases") or "").split(";"):
        alias = alias.strip()
        if alias:
            aliases.add(route_slug(alias))
    return sorted(aliases)


def edge_kind(source: dict[str, str], target: dict[str, str]) -> str:
    source_section = source.get("section", "root")
    target_section = target.get("section", "root")
    if target_section in {"document"} and target.get("type", "").lower().startswith("source"):
        return "source evidence"
    if target_section == "glossary":
        return "defines term"
    if source_section == "root" or source.get("type") == "Index":
        return "lists"
    if source_section == target_section:
        return "related"
    return "links to"


def ordered_sections(nodes: dict[str, dict[str, str]], preferred: list[str]) -> list[str]:
    sections = sorted({node.get("section", "root") for node in nodes.values()})
    ordered = [section for section in preferred if section in sections]
    ordered.extend(section for section in sections if section not in ordered)
    return ordered


def bundle_generated_at(nodes: dict[str, dict[str, str]]) -> str:
    timestamps = sorted(node.get("timestamp", "") for node in nodes.values() if node.get("timestamp"))
    return timestamps[-1] if timestamps else ""


def normalized_nodes(nodes: dict[str, dict[str, str]], source_root: str) -> dict[str, dict[str, Any]]:
    normalized: dict[str, dict[str, Any]] = {}
    prefix = "" if source_root in {"", "."} else f"{source_root.rstrip('/')}/"
    for path_id, node in nodes.items():
        normalized[path_id] = {
            "id": path_id,
            "type": node.get("type", ""),
            "title": node.get("title", path_id),
            "description": node.get("description", ""),
            "timestamp": node.get("timestamp", ""),
            "resource": node.get("resource", ""),
            "aliases": node.get("aliases", ""),
            "route_aliases": route_aliases(path_id, node),
            "section": node.get("section", "root"),
            "source": f"{prefix}{path_id}",
            "body": node.get("body", ""),
        }
    return normalized


def normalized_edges(graph: dict[str, Any]) -> list[dict[str, str]]:
    nodes = graph["nodes"]
    edges: list[dict[str, str]] = []
    for source_id, target_id in graph["edges"]:
        source = nodes[source_id]
        target = nodes[target_id]
        kind = edge_kind(source, target)
        edges.append(
            {
                "source": source_id,
                "target": target_id,
                "kind": kind,
                "label": kind,
            }
        )
    return edges


def load_config() -> dict[str, Any]:
    return json.loads(CONFIG.read_text(encoding="utf-8"))


def build_bundle() -> tuple[dict[str, Any], list[str]]:
    config = load_config()
    graph, errors = update_viewer.build_graph()
    if errors:
        return {}, errors

    corpus_config = config["corpora"][0]
    nodes = graph["nodes"]
    corpus_id = corpus_config["id"]
    corpus = {
        "id": corpus_id,
        "label": corpus_config["label"],
        "title": corpus_config["title"],
        "subtitle": corpus_config["subtitle"],
        "root": corpus_config["root"],
        "source_root": corpus_config["sourceRoot"],
        "markdown_url": corpus_config["markdownUrl"],
        "sections": ordered_sections(nodes, corpus_config.get("sectionOrder", [])),
        "nodes": normalized_nodes(nodes, corpus_config["sourceRoot"]),
        "edges": normalized_edges(graph),
    }
    bundle = {
        "schema": "okf-explorer-bundle.v0",
        "kind": "okf-bundle",
        "okf_version": "0.1",
        "generated_by": "scripts/build_okf_bundle.py",
        "generated_at": bundle_generated_at(nodes),
        "meta": {
            "title": config["siteTitle"],
            "default_corpus": corpus_id,
            "corpus_order": [corpus_id],
        },
        "corpora": {corpus_id: corpus},
    }
    return bundle, []


def render_bundle(bundle: dict[str, Any]) -> str:
    return json.dumps(bundle, ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def check_output(path: Path, content: str) -> list[str]:
    if not path.exists():
        return [f"{path.relative_to(ROOT)} is missing; regenerate it"]
    existing = path.read_text(encoding="utf-8")
    if existing == content:
        return []
    diff = "\n".join(
        difflib.unified_diff(
            existing.splitlines(),
            content.splitlines(),
            fromfile=f"{path.relative_to(ROOT)} (current)",
            tofile=f"{path.relative_to(ROOT)} (generated)",
            lineterm="",
            n=3,
        )
    )
    return [f"{path.relative_to(ROOT)} is out of date:\n{diff}"]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--check", action="store_true", help="fail if the bundle is not synchronized")
    args = parser.parse_args(argv)

    output = args.output if args.output.is_absolute() else ROOT / args.output
    bundle, errors = build_bundle()
    if errors:
        for error in errors:
            print(error, file=sys.stderr)
        return 1

    content = render_bundle(bundle)
    if args.check:
        errors = check_output(output, content)
        if errors:
            print("OKF bundle check failed:", file=sys.stderr)
            for error in errors:
                print(f"- {error}", file=sys.stderr)
            return 1
        print(f"okf-bundle.json is synchronized with {len(next(iter(bundle['corpora'].values()))['nodes'])} nodes")
        return 0

    output.write_text(content, encoding="utf-8")
    print(f"wrote {output.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
