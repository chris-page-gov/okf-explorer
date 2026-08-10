#!/usr/bin/env python3
"""Validate OKF v0.2 core plus the Explorer authoring profile.

Scope: the Markdown corpus only. The generated uk-government-apis/
large-corpus artefact is exercised separately in CI via the
fixture-based generator run; see docs/okf-conformance.md.
"""

from __future__ import annotations

import sys
from pathlib import Path

import build_okf_bundle
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

    bundle, bundle_errors = build_okf_bundle.build_bundle()
    errors.extend(f"runtime bundle: {error}" for error in bundle_errors)
    if not bundle_errors:
        semantic, semantic_errors = build_okf_bundle.build_semantic_document(bundle)
        errors.extend(f"semantic bundle: {error}" for error in semantic_errors)
        if not semantic_errors:
            try:
                yaml_ld, json_ld = build_okf_bundle.render_semantic_outputs(semantic)
            except Exception as exc:
                errors.append(f"semantic bundle: {exc}")
            else:
                expected = {
                    ROOT / "okf-bundle.json": build_okf_bundle.render_bundle(bundle),
                    ROOT / "okf-bundle.yamlld": yaml_ld,
                    ROOT / "okf-bundle.jsonld": json_ld,
                }
                for path, content in expected.items():
                    if not path.is_file() or path.read_text(encoding="utf-8") != content:
                        errors.append(
                            f"{path.name} is not synchronized; run python3 scripts/build_okf_bundle.py"
                        )

    if errors:
        print("OKF validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print(
        "OKF v0.2 core and Explorer profile validation passed: "
        f"{len(graph['nodes'])} nodes, {len(graph['edges'])} edges, "
        f"{len(next(iter(bundle['corpora'].values()))['relationships'])} semantic assertions"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
