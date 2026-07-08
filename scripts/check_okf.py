#!/usr/bin/env python3
"""Validate the hand-authored Markdown OKF bundle before publication.

Scope: the Markdown corpus only. The generated uk-government-apis/
large-corpus artefact is exercised separately in CI via the
fixture-based generator run; see docs/okf-conformance.md.
"""

from __future__ import annotations

import sys
from pathlib import Path

import update_viewer

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    graph, errors = update_viewer.build_graph()

    required_nodes = [
        "index.md",
        "sources-index.md",
        "document/index.md",
        "glossary/index.md",
        "stack/index.md",
        "standards/index.md",
        "federated/index.md",
        "frameworks/index.md",
        "research/index.md",
    ]
    for node in required_nodes:
        if node not in graph["nodes"]:
            errors.append(f"{node} is missing from the OKF graph")
    if not (ROOT / "viewer.html").exists():
        errors.append("viewer.html is missing")
    if not (ROOT / "view.html").exists():
        errors.append("view.html compatibility alias is missing")

    try:
        updated = update_viewer.rendered_viewer(graph)
    except ValueError as exc:
        errors.append(str(exc))
        updated = ""

    if updated and updated != (ROOT / "viewer.html").read_text(encoding="utf-8"):
        errors.append("viewer.html is not synchronized; run python3 scripts/update_viewer.py")

    if errors:
        print("OKF validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print(f"OKF validation passed: {len(graph['nodes'])} nodes, {len(graph['edges'])} edges")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
