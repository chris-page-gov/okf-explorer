#!/usr/bin/env python3
"""Validate the machine-readable source constraint and escalation ledger."""

from __future__ import annotations

import sys
from pathlib import Path

import okf_semantic

ROOT = Path(__file__).resolve().parents[1]
LEDGER = ROOT / "constraints" / "source-constraints.yamlld"
REQUIRED = {"@id", "@type", "title", "constraintType", "status", "trigger", "impact", "response", "escalation", "evidence", "observedAt"}


def main() -> int:
    try:
        document = okf_semantic.load_yaml_ld(LEDGER)
        assert isinstance(document, dict)
        expanded = okf_semantic.expand(document)
    except okf_semantic.SemanticError as exc:
        print(f"constraint ledger validation failed: {exc}", file=sys.stderr)
        return 1
    errors: list[str] = []
    rows = document.get("constraints")
    if not isinstance(rows, list) or not rows:
        errors.append("constraints must be a non-empty list")
        rows = []
    ids: set[str] = set()
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            errors.append(f"constraint {index + 1} is not a mapping")
            continue
        missing = sorted(REQUIRED - set(row))
        if missing:
            errors.append(f"constraint {index + 1} missing: {', '.join(missing)}")
        identifier = str(row.get("@id", ""))
        if identifier in ids:
            errors.append(f"duplicate constraint ID: {identifier}")
        ids.add(identifier)
        if not str(row.get("status", "")):
            errors.append(f"constraint {identifier or index + 1} has empty status")
    if not expanded:
        errors.append("ledger expands to an empty graph")
    if errors:
        print("constraint ledger validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    print(f"constraint ledger validation passed ({len(rows)} constraints)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
