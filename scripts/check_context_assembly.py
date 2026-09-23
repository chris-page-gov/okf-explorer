#!/usr/bin/env python3
"""Validate additive context contracts with pinned local schemas only."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource

ROOT = Path(__file__).resolve().parents[1]
SCHEMAS = ROOT / "profiles/context-assembly/v1"
KINDS = {"index": "index", "package": "package", "case": "evaluation-case", "controls": "evaluation-controls", "corpus": "corpus-v2", "discovery_corpus": "corpus-v3", "discovery_cards": "discovery-cards", "discovery_postings": "discovery-postings", "context_adjacency": "context-adjacency"}


def validators() -> dict[str, Draft202012Validator]:
    resources = {}
    for path in sorted(SCHEMAS.glob("*.schema.json")):
        schema = json.loads(path.read_text())
        Draft202012Validator.check_schema(schema)
        resources[path.stem.removesuffix(".schema")] = schema
    registry = Registry().with_resources(
        (schema["$id"], Resource.from_contents(schema)) for schema in resources.values()
    )
    return {kind: Draft202012Validator(resources[name], registry=registry,
                                      format_checker=FormatChecker())
            for kind, name in KINDS.items()}


def validate_documents(documents: dict) -> dict:
    checks = validators()
    unknown = set(documents) - checks.keys()
    if unknown:
        raise ValueError(f"Unknown context document kinds: {sorted(unknown)}")
    if not documents:
        raise ValueError("No context documents supplied")
    errors = []
    for kind, document in documents.items():
        for error in checks[kind].iter_errors(document):
            location = "/".join(map(str, error.absolute_path))
            errors.append(f"{kind}/{location}: {error.message}")
    if errors:
        raise ValueError("\n".join(errors))
    return {"status": "passed-shape-validation", "documents": sorted(documents),
            "boundary": "Shape only; evidence integrity and sufficiency require separate engine and evaluation checks."}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--stdin", action="store_true", help="Read an object with index, case and/or package members")
    for kind in KINDS:
        parser.add_argument("--" + kind, type=Path)
    args = parser.parse_args()
    try:
        documents = json.load(sys.stdin) if args.stdin else {
            kind: json.loads(getattr(args, kind).read_text())
            for kind in KINDS if getattr(args, kind) is not None
        }
        print(json.dumps(validate_documents(documents), sort_keys=True))
        return 0
    except (ValueError, OSError) as exc:
        print(str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
