#!/usr/bin/env python3
"""Validate an OKF domain profile's schema, references and equivalent form."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from collections import Counter
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator, FormatChecker
from ruamel.yaml import YAML


ROOT = Path(__file__).resolve().parents[1]
SCHEMA_PATH = ROOT / "profiles" / "authoring" / "v1" / "domain-profile.schema.json"


def load_document(path: Path) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8")
    if path.suffix.lower() == ".json":
        value = json.loads(text)
    elif path.suffix.lower() in {".yaml", ".yml"}:
        value = YAML(typ="safe").load(text)
    else:
        raise ValueError(f"{path}: expected .json, .yaml or .yml")
    if not isinstance(value, dict):
        raise ValueError(f"{path}: profile must be an object")
    return value


def canonical_bytes(value: dict[str, Any]) -> bytes:
    return (
        json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        + "\n"
    ).encode("utf-8")


def schema_errors(value: dict[str, Any]) -> list[str]:
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    Draft202012Validator.check_schema(schema)
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    errors = sorted(validator.iter_errors(value), key=lambda item: list(item.absolute_path))
    rendered: list[str] = []
    for error in errors:
        location = ".".join(str(part) for part in error.absolute_path) or "$"
        rendered.append(f"{location}: {error.message}")
    return rendered


def walk_objects(value: Any) -> list[dict[str, Any]]:
    found: list[dict[str, Any]] = []
    if isinstance(value, dict):
        found.append(value)
        for child in value.values():
            found.extend(walk_objects(child))
    elif isinstance(value, list):
        for child in value:
            found.extend(walk_objects(child))
    return found


def referenced_values(value: dict[str, Any], key: str) -> list[str]:
    result: list[str] = []
    for item in walk_objects(value):
        refs = item.get(key)
        if isinstance(refs, list):
            result.extend(ref for ref in refs if isinstance(ref, str))
    return result


def reference_errors(value: dict[str, Any]) -> list[str]:
    objects = walk_objects(value)
    ids = [item["id"] for item in objects if isinstance(item.get("id"), str)]
    counts = Counter(ids)
    errors = [
        f"id {identifier!r} is declared {count} times"
        for identifier, count in sorted(counts.items())
        if count > 1
    ]

    sections: dict[str, set[str]] = {}
    for section in (
        "sources",
        "users",
        "tasks",
        "terminology",
        "standards",
        "rights_access_privacy",
        "validation",
        "constraints",
        "gaps",
        "decisions",
        "traceability",
        "evidence",
    ):
        rows = value.get(section, [])
        sections[section] = {
            row["id"]
            for row in rows
            if isinstance(row, dict) and isinstance(row.get("id"), str)
        }

    expected_refs = {
        "evidence_refs": sections["evidence"],
        "user_ids": sections["users"],
        "task_refs": sections["tasks"],
        "validation_refs": sections["validation"],
    }
    for key, allowed in expected_refs.items():
        missing = sorted(set(referenced_values(value, key)) - allowed)
        errors.extend(f"{key} references unknown id {identifier!r}" for identifier in missing)

    rights_ids = sections["rights_access_privacy"]
    for source in value.get("sources", []):
        if isinstance(source, dict) and source.get("rights_ref") not in rights_ids:
            errors.append(
                f"source {source.get('id', '<unknown>')!r} references unknown rights_ref "
                f"{source.get('rights_ref')!r}"
            )

    decisions = {
        item["id"]: item
        for item in value.get("decisions", [])
        if isinstance(item, dict) and isinstance(item.get("id"), str)
    }
    declared_blockers = set(
        value.get("build_recommendation", {}).get("blocking_decision_ids", [])
    )
    actual_blockers = {
        identifier
        for identifier, item in decisions.items()
        if item.get("blocking_for_build") is True and item.get("status") == "open"
    }
    for identifier in sorted(declared_blockers - set(decisions)):
        errors.append(f"blocking_decision_ids references unknown decision {identifier!r}")
    if declared_blockers != actual_blockers:
        errors.append(
            "build_recommendation.blocking_decision_ids must exactly match open "
            "decisions with blocking_for_build=true"
        )

    if value.get("status") == "approved" and actual_blockers:
        errors.append("an approved domain profile cannot retain an open build-blocking decision")

    return errors


def validate(value: dict[str, Any]) -> list[str]:
    errors = schema_errors(value)
    if not errors:
        errors.extend(reference_errors(value))
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("profile", type=Path, help="domain-profile JSON or YAML")
    parser.add_argument(
        "--equivalent",
        type=Path,
        help="optional JSON/YAML counterpart that must represent exactly the same data",
    )
    args = parser.parse_args()

    try:
        profile = load_document(args.profile)
        errors = validate(profile)
        if args.equivalent:
            equivalent = load_document(args.equivalent)
            equivalent_errors = validate(equivalent)
            errors.extend(
                f"{args.equivalent}: {error}" for error in equivalent_errors
            )
            if canonical_bytes(profile) != canonical_bytes(equivalent):
                errors.append(
                    f"{args.profile} and {args.equivalent} do not represent the same data"
                )
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"domain profile validation failed: {error}", file=sys.stderr)
        return 1

    if errors:
        print("domain profile validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    digest = hashlib.sha256(canonical_bytes(profile)).hexdigest()
    print(
        "domain profile validation passed: "
        f"{profile['profile_id']} version {profile['version']} "
        f"canonical-sha256 {digest}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
