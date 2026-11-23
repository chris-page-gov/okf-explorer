#!/usr/bin/env python3
"""Inspect one bounded Markdown source bundle against pinned OKF 0.3 rules.

This is source and projection evidence only. It never executes bundle assets,
fetches a URL, or certifies a deployment, a client answer or a release.
"""

from __future__ import annotations

import argparse
from datetime import date
import hashlib
import json
import math
from pathlib import Path
import re
import tempfile
from typing import Any

from ruamel.yaml import YAML

from import_okf_directory import project
from okf_semantic import SemanticError
from okf_skill import GuardError, make_snapshot, verify_package, verify_runtime

SPECIFICATION = "https://github.com/open-knowledge-format/open-knowledge-format/blob/527e81aff55992be21507e97004286789126f88c/SPEC.md"


def split_source(text: str) -> tuple[bool, dict, str]:
    """Read YAML 1.2 without interpreting an unknown extension as executable code."""
    lines = text.splitlines()
    if not lines or lines[0] != "---":
        return False, {}, text
    try:
        closing = lines.index("---", 1)
    except ValueError as error:
        raise ValueError("the closing frontmatter delimiter is missing") from error
    parser = YAML(typ="safe", pure=True)
    parser.version = (1, 2)
    parser.allow_duplicate_keys = False
    try:
        metadata = parser.load("\n".join(lines[1:closing]))
    except Exception as error:
        # Do not copy arbitrary YAML values or local paths into public receipts.
        raise ValueError("frontmatter must be a YAML 1.2 mapping with unique keys") from error
    if not isinstance(metadata, dict):
        raise ValueError("frontmatter must be a YAML mapping")
    return True, metadata, "\n".join(lines[closing + 1:])


def canonical_bytes(value: Any) -> bytes:
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, allow_nan=False,
                       separators=(",", ":")) + "\n").encode("utf-8")


def bounded_representation(value: Any) -> bool:
    """Do not expand cyclic or exponentially shared YAML into a JSON projection.

    Such a representation may still be valid YAML. Refusal is a projection
    limitation, not a core syntax failure. Count occurrences rather than unique
    objects, because JSON serialisation duplicates shared YAML values.
    """
    stack = [value]
    items = size = 0
    while stack:
        item = stack.pop()
        items += 1
        if items > 100_000 or size > 2 * 1024 * 1024:
            return False
        if isinstance(item, dict):
            stack.extend(item.keys())
            stack.extend(item.values())
        elif isinstance(item, list):
            stack.extend(item)
        elif isinstance(item, str):
            size += len(item.encode("utf-8"))
        else:
            size += 32
    return True


def inspect_bundle(bundle: Path) -> tuple[dict, dict | None]:
    """Bind every inspected Markdown byte to a core result and Reader projection.

    The reviewed snapshot boundary refuses symlinks, special files, unreadable
    inputs and exceeded budgets. Independently declared nested roots are listed
    separately; an estate completion gate must inspect those roots in their turn.
    Asset contents are deliberately outside this source check.
    """
    errors: list[dict] = []
    warnings: list[dict] = []
    concepts: list[str] = []
    reserved: list[str] = []
    version = None
    projection = None
    projection_bounded = True
    receipt: dict = {
        "schema": "okf-0.3-source-check.v1",
        "specification": SPECIFICATION,
        "scope": "Bounded Markdown source and deterministic Explorer import only; no asset-content, published-graph, live-browser, AI-answer or release acceptance.",
        "coverage": "incomplete",
        "core_conformant": False,
        "declares_okf_0_3": False,
        "errors": errors,
        "warnings": warnings,
        "tool_sha256": {name: hashlib.sha256((Path(__file__).parent / name).read_bytes()).hexdigest()
                        for name in ("check_okf_03_source.py", "okf_skill.py", "import_okf_directory.py")},
    }
    with tempfile.TemporaryDirectory(prefix="okf03-source-") as directory:
        snapshot = Path(directory) / "bundle"
        snapshot.mkdir()
        try:
            inventory = make_snapshot(bundle, snapshot)
        except (GuardError, OSError, ValueError) as error:
            receipt["inspection_refused"] = type(error).__name__
            errors.append({"path": ".", "rule": "inspection-boundary", "message": "The source snapshot could not be inspected completely; no conformance result is issued."})
            return receipt, None
        receipt["inspection"] = inventory
        for relative in sorted(inventory["markdown_sha256"]):
            path = snapshot / relative
            try:
                present, metadata, body = split_source(path.read_text(encoding="utf-8"))
            except (UnicodeError, ValueError) as error:
                errors.append({"path": relative, "rule": "4", "message": str(error) if isinstance(error, ValueError) else "Markdown must be UTF-8"})
                continue
            if not bounded_representation(metadata):
                projection_bounded = False
                warnings.append({"path": relative, "rule": "projection-budget", "message": "YAML representation cannot be expanded within the JSON projection budget"})
            if path.name in {"index.md", "log.md"}:
                reserved.append(relative)
                if path.name == "log.md":
                    if present:
                        errors.append({"path": relative, "rule": "9", "message": "log.md has no frontmatter"})
                    for line in body.splitlines():
                        if not line.startswith("## "):
                            continue
                        heading = line[3:].strip()
                        try:
                            if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", heading):
                                raise ValueError
                            date.fromisoformat(heading)
                        except ValueError:
                            errors.append({"path": relative, "rule": "9", "message": "Log date headings must be valid YYYY-MM-DD dates"})
                elif relative != "index.md" and present:
                    errors.append({"path": relative, "rule": "8", "message": "A directory index below the bundle root has no frontmatter"})
                elif relative == "index.md":
                    version = metadata.get("okf_version")
                continue
            if isinstance(metadata.get("type"), str) and metadata["type"].strip():
                concepts.append(relative)
            else:
                warnings.append({"path": relative, "rule": "3.2", "message": "This Markdown file is not a concept"})

        receipt.update({
            "coverage": "complete-for-declared-root",
            "declared_okf_version": version if isinstance(version, (str, int, type(None))) or (isinstance(version, float) and math.isfinite(version)) else "unexpected-value-shape",
            "declares_okf_0_3": version == "0.3",
            "core_conformant": not errors,
            "concept_paths": concepts,
            "reserved_navigation_paths": reserved,
        })
        if not errors and not projection_bounded:
            receipt["explorer_import"] = {"status": "failed", "message": "YAML representation exceeds the bounded JSON projection budget"}
        elif not errors:
            try:
                projection = project(snapshot)
                # This is an independent comparison with the source classification.
                if set(projection["nodes"]) != set(concepts):
                    raise ValueError("Reader concept coverage differs from source classification")
                content = canonical_bytes(projection)
                receipt["explorer_import"] = {
                    "status": "passed", "concepts": len(concepts),
                    "edges": len(projection["edges"]),
                    "sha256": hashlib.sha256(content).hexdigest(), "bytes": len(content),
                }
            except (SemanticError, ValueError, TypeError, OSError):
                projection = None
                receipt["explorer_import"] = {"status": "failed", "message": "The Reader cannot faithfully project this source; core syntax conformance does not establish Reader compatibility."}
        receipt["source_inventory_sha256"] = hashlib.sha256(canonical_bytes(inventory["markdown_sha256"])).hexdigest()
    return receipt, projection


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("bundle", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--projection", type=Path)
    parser.add_argument("--require-0.3", action="store_true", dest="require_03")
    args = parser.parse_args()
    verify_runtime()
    verify_package()
    root = args.bundle.resolve(strict=True)
    for output in (args.output, args.projection):
        if output and output.resolve().is_relative_to(root):
            parser.error("Write evidence outside the inspected source bundle")
    # Retain the selected path so the snapshot boundary can refuse a symlink
    # at the root itself, as well as symlinks among its contents.
    receipt, projection = inspect_bundle(args.bundle)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(canonical_bytes(receipt))
    if args.projection and projection is not None:
        args.projection.parent.mkdir(parents=True, exist_ok=True)
        args.projection.write_bytes(canonical_bytes(projection))
    passed = receipt["core_conformant"] and receipt.get("explorer_import", {}).get("status") == "passed"
    if args.require_03:
        passed = passed and receipt["declares_okf_0_3"]
    print(f"Source core={'passed' if receipt['core_conformant'] else 'failed'}; Explorer import={receipt.get('explorer_import', {}).get('status', 'not-run')}; declared version={receipt.get('declared_okf_version')!r}")
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
