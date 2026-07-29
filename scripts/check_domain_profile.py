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


def referenced_scalars(value: dict[str, Any], key: str) -> list[str]:
    return [
        item[key]
        for item in walk_objects(value)
        if isinstance(item.get(key), str)
    ]


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
        "claims",
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
        "decision_refs": sections["decisions"],
        "gap_refs": sections["gaps"],
    }
    for key, allowed in expected_refs.items():
        missing = sorted(set(referenced_values(value, key)) - allowed)
        errors.extend(f"{key} references unknown id {identifier!r}" for identifier in missing)

    rights_ids = sections["rights_access_privacy"]
    for item in objects:
        if "rights_ref" in item and item.get("rights_ref") not in rights_ids:
            errors.append(
                f"{item.get('id', '<unknown>')!r} references unknown rights_ref "
                f"{item.get('rights_ref')!r}"
            )

    denominator_ids = {
        item["id"]
        for item in value.get("scope", {}).get("denominators", [])
        if isinstance(item, dict) and isinstance(item.get("id"), str)
    }
    for source in value.get("sources", []):
        denominator_ref = source.get("coverage_denominator_ref")
        if denominator_ref is not None and denominator_ref not in denominator_ids:
            errors.append(
                f"source {source.get('id', '<unknown>')!r} references unknown "
                f"coverage_denominator_ref {denominator_ref!r}"
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

    consumer_contract = value.get("consumer_contract")
    if isinstance(consumer_contract, dict):
        inventory = consumer_contract.get("inventory", [])
        consumer_ids = {
            item["id"]
            for item in inventory
            if isinstance(item, dict) and isinstance(item.get("id"), str)
        }
        lock = consumer_contract.get("lock", {})
        locked_consumers = (
            set(lock.get("consumer_ids", [])) if isinstance(lock, dict) else set()
        )
        if locked_consumers != consumer_ids:
            errors.append(
                "consumer_contract.lock.consumer_ids must exactly match the consumer inventory"
            )
        if (
            value.get("status") == "approved"
            and isinstance(lock, dict)
            and lock.get("sha256") == "unknown"
        ):
            errors.append("an approved domain profile must pin the consumer lock SHA-256")
        for consumer in inventory:
            if not isinstance(consumer, dict):
                continue
            version = str(consumer.get("version_or_digest", ""))
            if "latest" in version.casefold():
                errors.append(
                    f"consumer {consumer.get('id', '<unknown>')!r} uses an unpinned "
                    "version_or_digest containing 'latest'"
                )

        dependency_graph = consumer_contract.get("dependency_graph", {})
        nodes = dependency_graph.get("nodes", []) if isinstance(dependency_graph, dict) else []
        node_ids = {
            item["id"]
            for item in nodes
            if isinstance(item, dict) and isinstance(item.get("id"), str)
        }
        connected_node_ids: set[str] = set()
        for edge in (
            dependency_graph.get("edges", [])
            if isinstance(dependency_graph, dict)
            else []
        ):
            if not isinstance(edge, dict):
                continue
            for key in ("from_node", "to_node"):
                if edge.get(key) not in node_ids:
                    errors.append(
                        f"dependency edge {edge.get('id', '<unknown>')!r} references "
                        f"unknown {key} {edge.get(key)!r}"
                    )
                elif isinstance(edge.get(key), str):
                    connected_node_ids.add(edge[key])
        for identifier in sorted(node_ids - connected_node_ids):
            errors.append(
                f"dependency graph node {identifier!r} is not connected to an edge"
            )

        plane_ids = {
            item["id"]
            for item in consumer_contract.get("planes", [])
            if isinstance(item, dict) and isinstance(item.get("id"), str)
        }
        graph_consumers = {
            item.get("consumer_ref")
            for item in nodes
            if isinstance(item, dict) and item.get("kind") == "consumer"
        }
        missing_graph_consumers = sorted(consumer_ids - graph_consumers)
        if missing_graph_consumers:
            errors.append(
                "dependency graph has no consumer node for: "
                + ", ".join(missing_graph_consumers)
            )
        graph_planes = {
            item.get("plane_ref")
            for item in nodes
            if isinstance(item, dict) and item.get("kind") == "plane"
        }
        missing_graph_planes = sorted(plane_ids - graph_planes)
        if missing_graph_planes:
            errors.append(
                "dependency graph has no plane node for: "
                + ", ".join(missing_graph_planes)
            )
        unknown_consumers = sorted(
            (
                set(referenced_values(consumer_contract, "consumer_refs"))
                | set(referenced_scalars(consumer_contract, "consumer_ref"))
            )
            - consumer_ids
        )
        errors.extend(
            f"consumer reference points to unknown consumer {identifier!r}"
            for identifier in unknown_consumers
        )
        unknown_planes = sorted(
            (
                set(referenced_values(consumer_contract, "affected_plane_refs"))
                | set(referenced_values(consumer_contract, "digest_plane_refs"))
                | set(referenced_scalars(consumer_contract, "plane_ref"))
            )
            - plane_ids
        )
        errors.extend(
            f"plane reference points to unknown plane {identifier!r}"
            for identifier in unknown_planes
        )

        fixture = consumer_contract.get("fixture_protocol", {})
        consumer_stage = (
            fixture.get("consumer_stage", {}) if isinstance(fixture, dict) else {}
        )
        executed_consumers = (
            set(consumer_stage.get("consumer_refs", []))
            if isinstance(consumer_stage, dict)
            else set()
        )
        required_consumers = {
            item["id"]
            for item in inventory
            if isinstance(item, dict) and item.get("required_for_release") is True
        }
        if not required_consumers <= executed_consumers:
            missing = sorted(required_consumers - executed_consumers)
            errors.append(
                "consumer fixture stage does not execute every required consumer: "
                + ", ".join(missing)
            )

        compatibility = consumer_contract.get("compatibility", {})
        directions = {
            item.get("direction")
            for item in compatibility.get("cases", [])
            if isinstance(item, dict)
        } if isinstance(compatibility, dict) else set()
        required_directions = {
            "backward-new-producer-old-consumer",
            "forward-old-producer-new-consumer",
        }
        if directions != required_directions:
            errors.append(
                "consumer compatibility cases must cover both producer/consumer directions"
            )

        deep_link_consumers = {
            item.get("consumer_ref")
            for item in consumer_contract.get("post_deploy_deep_links", [])
            if isinstance(item, dict)
        }
        required_deep_links = {
            item["id"]
            for item in inventory
            if isinstance(item, dict) and item.get("deep_link_required") is True
        }
        if not required_deep_links <= deep_link_consumers:
            missing = sorted(required_deep_links - deep_link_consumers)
            errors.append(
                "post-deploy checks do not cover every deep-link consumer: "
                + ", ".join(missing)
            )

    return errors


def repository_path_errors(
    value: dict[str, Any], repository_root: Path
) -> list[str]:
    errors: list[str] = []
    root = repository_root.resolve()
    graph = value.get("consumer_contract", {}).get("dependency_graph", {})
    for node in graph.get("nodes", []) if isinstance(graph, dict) else []:
        if not isinstance(node, dict) or node.get("kind") != "validator":
            continue
        for relative in node.get("repository_paths", []):
            if not isinstance(relative, str):
                continue
            candidate = (root / relative).resolve()
            try:
                candidate.relative_to(root)
            except ValueError:
                errors.append(
                    f"validator node {node.get('id', '<unknown>')!r} has unsafe "
                    f"repository path {relative!r}"
                )
                continue
            if not candidate.is_file():
                errors.append(
                    f"validator node {node.get('id', '<unknown>')!r} references "
                    f"absent repository path {relative!r}"
                )
    return errors


def validate(
    value: dict[str, Any], repository_root: Path | None = None
) -> list[str]:
    errors = schema_errors(value)
    if not errors:
        errors.extend(reference_errors(value))
        if repository_root is not None:
            errors.extend(repository_path_errors(value, repository_root))
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("profile", type=Path, help="domain-profile JSON or YAML")
    parser.add_argument(
        "--equivalent",
        type=Path,
        help="optional JSON/YAML counterpart that must represent exactly the same data",
    )
    parser.add_argument(
        "--repository-root",
        type=Path,
        help=(
            "repository root used to resolve dependency-graph validator paths; "
            "defaults to the parent of a domain-profile directory"
        ),
    )
    args = parser.parse_args()

    try:
        repository_root = (
            args.repository_root
            if args.repository_root is not None
            else (
                args.profile.parent.parent
                if args.profile.parent.name == "domain-profile"
                else args.profile.parent
            )
        )
        profile = load_document(args.profile)
        errors = validate(profile, repository_root)
        if args.equivalent:
            equivalent = load_document(args.equivalent)
            equivalent_errors = validate(equivalent, repository_root)
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
