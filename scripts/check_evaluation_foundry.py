#!/usr/bin/env python3
"""Validate Evaluation Foundry control artifacts and fixture isolation."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import parse_qs, parse_qsl, unquote, urljoin, urlsplit

from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource
from ruamel.yaml import YAML
from ruamel.yaml.tokens import AliasToken, AnchorToken, TagToken


ROOT = Path(__file__).resolve().parents[1]
FOUNDRY_ROOT = ROOT / "evaluation-foundry"
DEFAULT_FIXTURES_ROOT = FOUNDRY_ROOT / "fixtures"
SCHEMA_ROOT = FOUNDRY_ROOT / "schemas"
MAX_CONTROL_FILE_BYTES = 2 * 1024 * 1024
EXPECTED_QUESTION_COUNT = 100
JOURNEY_SCHEMA = "okf-explorer-interaction-suite.v1"
QUESTION_SUITE_SCHEMA = "okf-explorer-evaluation-suite.v1"
GENUINE_BROWSER_RECEIPT_SCHEMA = "okf-genuine-browser-link-receipt.v1"
GENUINE_BROWSER_VERIFICATION_CHANNEL = "genuine-browser-receipt"
CREDENTIAL_QUERY_KEY = re.compile(
    r"^(?:api[_-]?key|client[_-]?secret|access[_-]?token|refresh[_-]?token|"
    r"password|passwd|bearer|token)$",
    re.IGNORECASE,
)
TIMEZONE_QUALIFIED_TIMESTAMP = re.compile(r"(?:Z|[+-]\d{2}:\d{2})$")
REQUIRED_ARTIFACTS = {
    "profile": "evaluation-profile.yaml",
    "mappings": "mapping-proposals.yaml",
    "coverage": "feature-coverage.json",
    "journeys": "journeys.json",
}
SCHEMA_FILES = {
    "profile": "okf-evaluation-profile.v1.schema.json",
    "profile_v2": "okf-evaluation-profile.v2.schema.json",
    "mappings": "mapping-proposal.v1.schema.json",
    "coverage": "feature-coverage.v1.schema.json",
}
PROFILE_SCHEMA_VALIDATORS = {
    "okf-evaluation-profile.v1": "profile",
    "okf-evaluation-profile.v2": "profile_v2",
}
DOMAIN_PROFILE_SCHEMA = (
    ROOT / "profiles" / "authoring" / "v1" / "domain-profile.schema.json"
)
DOMAIN_PROFILE_LOCAL_REF_URI = (
    "https://chris-page-gov.github.io/okf-explorer/"
    "profiles/authoring/v1/domain-profile.schema.json"
)
LOCAL_FILE_SUFFIXES = {
    ".csv",
    ".gz",
    ".geojson",
    ".html",
    ".json",
    ".jsonl",
    ".jsonld",
    ".md",
    ".ndjson",
    ".parquet",
    ".tsv",
    ".txt",
    ".yaml",
    ".yamlld",
    ".yml",
    ".zip",
}
# These fields contain evaluator match expressions, not resources to load.  In
# particular, an ``href_includes`` value may deliberately be a host/path
# fragment ending in ``/`` so it works for either an absolute or proxied URL.
NON_LOCAL_REFERENCE_FIELDS = {"href_includes"}
CAPABILITY_REF_KEYS = {
    "capability",
    "capability_id",
    "capability_ref",
    "capabilities",
    "capability_ids",
    "capability_refs",
}
MAPPING_REF_KEYS = {
    "mapping",
    "mapping_id",
    "mapping_ref",
    "mapping_proposal",
    "mapping_proposal_id",
    "mapping_proposal_ref",
    "mappings",
    "mapping_ids",
    "mapping_refs",
    "mapping_proposal_ids",
    "mapping_proposal_refs",
}
JOURNEY_ACTIONS = {
    "history_round_trip",
    "load_full_record",
    "open_external_link_new_tab",
    "open_facet",
    "open_first_result",
    "open_raw_source_new_tab",
    "open_source_inspector",
    "resize_relationship_drawer",
    "search",
    "select_facet_value",
    "select_graph_edge",
    "select_map_filter",
    "select_map_record",
    "select_view",
    "set_sort",
    "toggle_disclosure",
    "verify_url",
}
JOURNEY_ASSERTIONS = {
    "disclosure_defaults_observed",
    "disclosure_toggle_observed",
    "external_link_opened_in_new_tab",
    "graph_edge_selected",
    "history_round_trip_restored",
    "map_filter_applied",
    "map_marker_visible",
    "map_record_selected",
    "relationship_drawer_resized",
    "result_count_min",
    "search_value",
    "sort_value",
    "source_inspector_visible",
    "url_param_absent",
    "url_param_equals",
    "url_param_includes",
    "visible_text",
}


class DuplicateKeyError(ValueError):
    pass


def _json_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise DuplicateKeyError(f"duplicate mapping key {key!r}")
        result[key] = value
    return result


def _reject_json_constant(value: str) -> None:
    raise ValueError(f"non-finite JSON number {value!r} is not supported")


def _validate_json_value(value: Any, location: str = "$") -> None:
    if isinstance(value, float):
        if not math.isfinite(value):
            raise ValueError(f"{location}: non-finite numbers are not supported")
        return
    if isinstance(value, dict):
        for key, child in value.items():
            if not isinstance(key, str):
                raise ValueError(f"{location}: mapping keys must be strings")
            _validate_json_value(child, f"{location}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            _validate_json_value(child, f"{location}[{index}]")
    elif value is not None and not isinstance(value, (bool, int, str)):
        raise ValueError(
            f"{location}: {type(value).__name__} is not a JSON-compatible value"
        )


def load_document(path: Path) -> dict[str, Any]:
    try:
        raw = path.read_bytes()
    except OSError as error:
        raise ValueError(f"{path}: cannot read file: {error}") from error
    if len(raw) > MAX_CONTROL_FILE_BYTES:
        raise ValueError(
            f"{path}: control file exceeds {MAX_CONTROL_FILE_BYTES} bytes"
        )
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as error:
        raise ValueError(f"{path}: control file must be UTF-8") from error
    try:
        if path.suffix.casefold() == ".json":
            value = json.loads(
                text,
                object_pairs_hook=_json_object,
                parse_constant=_reject_json_constant,
            )
        elif path.suffix.casefold() in {".yaml", ".yml"}:
            yaml = YAML(typ="safe", pure=True)
            yaml.allow_duplicate_keys = False
            for token in yaml.scan(text):
                if isinstance(token, (AliasToken, AnchorToken, TagToken)):
                    raise ValueError(
                        "anchors, aliases and explicit tags are not supported"
                    )
            value = yaml.load(text)
        else:
            raise ValueError("expected a JSON or YAML control file")
    except (DuplicateKeyError, ValueError) as error:
        raise ValueError(f"{path}: unsafe or invalid document: {error}") from error
    except Exception as error:
        raise ValueError(f"{path}: invalid document: {error}") from error
    if not isinstance(value, dict):
        raise ValueError(f"{path}: document must be an object")
    _validate_json_value(value)
    return value


def schema_validators() -> dict[str, Draft202012Validator]:
    schemas = {
        key: json.loads((SCHEMA_ROOT / filename).read_text(encoding="utf-8"))
        for key, filename in SCHEMA_FILES.items()
    }
    domain_schema = json.loads(DOMAIN_PROFILE_SCHEMA.read_text(encoding="utf-8"))
    resources = [*schemas.values(), domain_schema]
    registry = Registry()
    for schema in resources:
        Draft202012Validator.check_schema(schema)
        identifier = schema.get("$id")
        if not isinstance(identifier, str) or not identifier:
            raise ValueError("every Evaluation Foundry schema resource must have an $id")
        registry = registry.with_resource(identifier, Resource.from_contents(schema))
    registry = registry.with_resource(
        DOMAIN_PROFILE_LOCAL_REF_URI,
        Resource.from_contents(domain_schema),
    )

    validators: dict[str, Draft202012Validator] = {}
    for key, schema in schemas.items():
        validators[key] = Draft202012Validator(
            schema,
            format_checker=FormatChecker(),
            registry=registry,
        )
    return validators


def rendered_schema_errors(
    label: str,
    value: dict[str, Any],
    validator: Draft202012Validator,
) -> list[str]:
    errors = sorted(
        validator.iter_errors(value),
        key=lambda item: [str(part) for part in item.absolute_path],
    )
    rendered: list[str] = []
    for error in errors:
        location = ".".join(str(part) for part in error.absolute_path) or "$"
        rendered.append(f"{label}:{location}: {error.message}")
    return rendered


def walk(value: Any, location: str = "$") -> Iterable[tuple[str, Any]]:
    yield location, value
    if isinstance(value, dict):
        for key, child in value.items():
            yield from walk(child, f"{location}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            yield from walk(child, f"{location}[{index}]")


def duplicate_id_errors(label: str, value: dict[str, Any]) -> list[str]:
    occurrences: dict[str, list[str]] = {}
    for location, child in walk(value):
        if isinstance(child, dict) and isinstance(child.get("id"), str):
            identifier = child["id"].strip()
            if identifier:
                occurrences.setdefault(identifier, []).append(f"{location}.id")
    return [
        f"{label}: id {identifier!r} is not unique ({', '.join(locations)})"
        for identifier, locations in sorted(occurrences.items())
        if len(locations) > 1
    ]


def cross_document_id_errors(documents: dict[str, dict[str, Any]]) -> list[str]:
    occurrences: dict[str, list[str]] = {}
    for label, document in documents.items():
        for location, child in walk(document):
            if isinstance(child, dict) and isinstance(child.get("id"), str):
                identifier = child["id"].strip()
                if identifier:
                    occurrences.setdefault(identifier, []).append(
                        f"{label}:{location}.id"
                    )
    return [
        f"id {identifier!r} is declared in multiple artifacts ({', '.join(locations)})"
        for identifier, locations in sorted(occurrences.items())
        if len({location.split(":", 1)[0] for location in locations}) > 1
    ]


def duplicate_scalar_errors(label: str, field: str, values: Any) -> list[str]:
    if not isinstance(values, list):
        return []
    strings = [value for value in values if isinstance(value, str)]
    counts = Counter(strings)
    return [
        f"{label}: {field} contains duplicate reference {value!r}"
        for value, count in sorted(counts.items())
        if count > 1
    ]


def object_ids(value: Any, field: str) -> set[str]:
    if not isinstance(value, dict) or not isinstance(value.get(field), list):
        return set()
    return {
        str(item["id"])
        for item in value[field]
        if isinstance(item, dict) and isinstance(item.get("id"), str)
    }


def reference_values(value: Any, keys: set[str]) -> list[tuple[str, str]]:
    found: list[tuple[str, str]] = []
    for location, child in walk(value):
        if not isinstance(child, dict):
            continue
        for key in keys:
            raw = child.get(key)
            if isinstance(raw, str):
                found.append((f"{location}.{key}", raw))
            elif isinstance(raw, list):
                found.extend(
                    (f"{location}.{key}[{index}]", item)
                    for index, item in enumerate(raw)
                    if isinstance(item, str)
                )
    return found


def referenced_values(value: Any, key: str) -> set[str]:
    """Return string members of every array named *key* in a document."""

    result: set[str] = set()
    for _location, child in walk(value):
        if not isinstance(child, dict) or not isinstance(child.get(key), list):
            continue
        result.update(item for item in child[key] if isinstance(item, str))
    return result


def referenced_scalars(value: Any, key: str) -> set[str]:
    """Return every scalar string named *key* in a document."""

    return {
        child[key]
        for _location, child in walk(value)
        if isinstance(child, dict) and isinstance(child.get(key), str)
    }


def profile_reference_errors(
    profile: dict[str, Any],
    mappings: dict[str, Any],
    coverage: dict[str, Any],
    journeys: dict[str, Any],
) -> list[str]:
    errors: list[str] = []
    profile_id = profile.get("profile_id")
    for label, document in (("mapping proposals", mappings), ("feature coverage", coverage)):
        if document.get("profile_id") != profile_id:
            errors.append(
                f"{label}: profile_id {document.get('profile_id')!r} differs from "
                f"evaluation profile {profile_id!r}"
            )
    if "profile_id" in journeys and journeys.get("profile_id") != profile_id:
        errors.append(
            f"journeys: profile_id {journeys.get('profile_id')!r} differs from "
            f"evaluation profile {profile_id!r}"
        )

    proposal_ids = object_ids(mappings, "proposals")
    mapping_refs = {
        item for item in profile.get("mapping_proposals", []) if isinstance(item, str)
    }
    for identifier in sorted(mapping_refs - proposal_ids):
        errors.append(f"evaluation profile references unknown mapping {identifier!r}")
    for identifier in sorted(proposal_ids - mapping_refs):
        errors.append(f"mapping proposal {identifier!r} is not declared by the profile")

    profile_capabilities = {
        item for item in profile.get("capabilities", []) if isinstance(item, str)
    }
    coverage_capabilities = object_ids(coverage, "capabilities")
    for identifier in sorted(profile_capabilities - coverage_capabilities):
        errors.append(f"evaluation profile references unknown capability {identifier!r}")
    for identifier in sorted(coverage_capabilities - profile_capabilities):
        errors.append(f"feature coverage capability {identifier!r} is not declared by the profile")

    for proposal in mappings.get("proposals", []):
        if not isinstance(proposal, dict):
            continue
        for identifier in proposal.get("feature_effects", []):
            if isinstance(identifier, str) and identifier not in profile_capabilities:
                errors.append(
                    f"mapping {proposal.get('id', '<unknown>')!r} references unknown "
                    f"capability {identifier!r}"
                )

    journey_ids = object_ids(journeys, "journeys")
    persona_ids = object_ids(journeys, "personas")
    story_ids = object_ids(journeys, "stories")
    for capability in coverage.get("capabilities", []):
        if not isinstance(capability, dict):
            continue
        journey = capability.get("journey")
        if journey not in journey_ids:
            errors.append(
                f"coverage capability {capability.get('id', '<unknown>')!r} "
                f"references unknown journey {journey!r}"
            )

    for location, identifier in reference_values(journeys, {"persona_ids"}):
        if identifier not in persona_ids:
            errors.append(f"journeys:{location} references unknown persona {identifier!r}")
    for location, identifier in reference_values(journeys, {"story_ids"}):
        if identifier not in story_ids:
            errors.append(f"journeys:{location} references unknown story {identifier!r}")

    for location, identifier in reference_values(journeys, CAPABILITY_REF_KEYS):
        if identifier not in profile_capabilities:
            errors.append(f"journeys:{location} references unknown capability {identifier!r}")
    for location, identifier in reference_values(journeys, MAPPING_REF_KEYS):
        if identifier not in proposal_ids:
            errors.append(f"journeys:{location} references unknown mapping {identifier!r}")
    return errors


def evaluation_v2_contract_errors(
    profile: dict[str, Any],
    profile_path: Path,
    fixture_dir: Path,
    repository_root: Path,
) -> list[str]:
    """Apply the shared Foundry contract's semantic invariants to v2 profiles."""

    if profile.get("schema") != "okf-evaluation-profile.v2":
        return []
    errors: list[str] = []
    contract = profile.get("consumer_contract")
    if not isinstance(contract, dict):
        return errors

    inventory = contract.get("inventory", [])
    consumer_ids = {
        item["id"]
        for item in inventory
        if isinstance(item, dict) and isinstance(item.get("id"), str)
    }
    validation_ids = object_ids(profile, "validation")
    planes = contract.get("planes", [])
    plane_ids = {
        item["id"]
        for item in planes
        if isinstance(item, dict) and isinstance(item.get("id"), str)
    }
    graph = contract.get("dependency_graph", {})
    nodes = graph.get("nodes", []) if isinstance(graph, dict) else []
    node_ids = {
        item["id"]
        for item in nodes
        if isinstance(item, dict) and isinstance(item.get("id"), str)
    }

    lock = contract.get("lock", {})
    locked_consumers = (
        set(lock.get("consumer_ids", [])) if isinstance(lock, dict) else set()
    )
    if locked_consumers != consumer_ids:
        errors.append(
            "consumer_contract.lock.consumer_ids must exactly match the consumer inventory"
        )
    if isinstance(lock, dict):
        lock_reference = lock.get("path")
        lock_digest = lock.get("sha256")
        if isinstance(lock_reference, str):
            lock_path = resolve_local_reference(
                lock_reference,
                profile_path,
                fixture_dir,
                repository_root,
            )
            if lock_path is not None and isinstance(lock_digest, str):
                observed = hashlib.sha256(lock_path.read_bytes()).hexdigest()
                if observed != lock_digest:
                    errors.append(
                        "consumer_contract.lock.sha256 does not match "
                        f"{lock_reference!r}: expected {lock_digest}, observed {observed}"
                    )
        if lock_digest == "unknown":
            errors.append("a v2 candidate profile must pin the consumer lock SHA-256")

    for consumer in inventory:
        if not isinstance(consumer, dict):
            continue
        version = str(consumer.get("version_or_digest", ""))
        if "latest" in version.casefold():
            errors.append(
                f"consumer {consumer.get('id', '<unknown>')!r} uses an unpinned "
                "version_or_digest containing 'latest'"
            )

    connected: set[str] = set()
    referenced_validation_ids: set[str] = set()
    edges = graph.get("edges", []) if isinstance(graph, dict) else []
    for edge in edges:
        if not isinstance(edge, dict):
            continue
        for field in ("from_node", "to_node"):
            identifier = edge.get(field)
            if identifier not in node_ids:
                errors.append(
                    f"dependency edge {edge.get('id', '<unknown>')!r} references "
                    f"unknown {field} {identifier!r}"
                )
            elif isinstance(identifier, str):
                connected.add(identifier)
        referenced_validation_ids.update(
            item for item in edge.get("validation_refs", []) if isinstance(item, str)
        )
    for identifier in sorted(node_ids - connected):
        errors.append(f"dependency graph node {identifier!r} is not connected to an edge")

    graph_consumers = {
        item.get("consumer_ref")
        for item in nodes
        if isinstance(item, dict) and item.get("kind") == "consumer"
    }
    for identifier in sorted(consumer_ids - graph_consumers):
        errors.append(f"dependency graph has no consumer node for {identifier!r}")
    graph_planes = {
        item.get("plane_ref")
        for item in nodes
        if isinstance(item, dict) and item.get("kind") == "plane"
    }
    for identifier in sorted(plane_ids - graph_planes):
        errors.append(f"dependency graph has no plane node for {identifier!r}")

    unknown_consumers = sorted(
        (
            set(referenced_values(contract, "consumer_refs"))
            | set(referenced_scalars(contract, "consumer_ref"))
        )
        - consumer_ids
    )
    errors.extend(
        f"consumer reference points to unknown consumer {identifier!r}"
        for identifier in unknown_consumers
    )
    unknown_planes = sorted(
        (
            set(referenced_values(contract, "affected_plane_refs"))
            | set(referenced_values(contract, "digest_plane_refs"))
            | set(referenced_scalars(contract, "plane_ref"))
        )
        - plane_ids
    )
    errors.extend(
        f"plane reference points to unknown plane {identifier!r}"
        for identifier in unknown_planes
    )
    referenced_validation_ids.update(referenced_values(contract, "validation_refs"))
    for identifier in sorted(referenced_validation_ids - validation_ids):
        errors.append(f"validation reference points to unknown validator {identifier!r}")
    for identifier in sorted(validation_ids - referenced_validation_ids):
        errors.append(f"validator {identifier!r} is not referenced by the consumer contract")

    fixture = contract.get("fixture_protocol", {})
    consumer_stage = fixture.get("consumer_stage", {}) if isinstance(fixture, dict) else {}
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
    for identifier in sorted(required_consumers - executed_consumers):
        errors.append(
            f"consumer fixture stage does not execute required consumer {identifier!r}"
        )

    compatibility = contract.get("compatibility", {})
    directions = {
        item.get("direction")
        for item in compatibility.get("cases", [])
        if isinstance(compatibility, dict) and isinstance(item, dict)
    }
    required_directions = {
        "backward-new-producer-old-consumer",
        "forward-old-producer-new-consumer",
    }
    if not required_directions <= directions:
        errors.append(
            "consumer compatibility cases must cover both producer/consumer directions"
        )

    window = (
        compatibility.get("window_decision", {})
        if isinstance(compatibility, dict)
        else {}
    )
    supported_contracts = {
        item
        for item in window.get("supported_producer_contracts", [])
        if isinstance(item, str)
    }
    declared_contract_sources: list[tuple[str, str]] = []
    impact_policy = profile.get("impact_policy", {})
    root_receipts = (
        impact_policy.get("root_receipts", [])
        if isinstance(impact_policy, dict)
        else []
    )
    for reference in root_receipts:
        if not isinstance(reference, str):
            continue
        resolved = resolve_local_reference(
            reference,
            profile_path,
            fixture_dir,
            repository_root,
        )
        if resolved is None:
            continue
        try:
            receipt = load_document(resolved)
        except ValueError as error:
            errors.append(str(error))
            continue
        schema = receipt.get("schema") if isinstance(receipt, dict) else None
        if isinstance(schema, str):
            declared_contract_sources.append((reference, schema))
    cases = compatibility.get("cases", []) if isinstance(compatibility, dict) else []
    for case in cases:
        if not isinstance(case, dict):
            continue
        reference = case.get("producer_fixture")
        if not isinstance(reference, str):
            continue
        resolved = resolve_local_reference(
            reference,
            profile_path,
            fixture_dir,
            repository_root,
        )
        if resolved is None:
            continue
        try:
            producer = load_document(resolved)
        except ValueError as error:
            errors.append(str(error))
            continue
        schema = producer.get("schema") if isinstance(producer, dict) else None
        if isinstance(schema, str):
            declared_contract_sources.append((reference, schema))
    for reference, schema in sorted(set(declared_contract_sources)):
        if schema not in supported_contracts:
            errors.append(
                "compatibility.window_decision.supported_producer_contracts "
                f"does not declare {schema!r} used by {reference!r}"
            )

    deep_link_consumers = {
        item.get("consumer_ref")
        for item in contract.get("post_deploy_deep_links", [])
        if isinstance(item, dict)
    }
    required_deep_links = {
        item["id"]
        for item in inventory
        if isinstance(item, dict) and item.get("deep_link_required") is True
    }
    for identifier in sorted(required_deep_links - deep_link_consumers):
        errors.append(f"post-deploy checks do not cover consumer {identifier!r}")

    public_candidate_roots = {
        item.get("consumer_ref"): item.get("location")
        for item in nodes
        if isinstance(item, dict)
        and item.get("kind") == "public-route"
        and isinstance(item.get("consumer_ref"), str)
        and isinstance(item.get("location"), str)
    }
    for link in contract.get("post_deploy_deep_links", []):
        if not isinstance(link, dict):
            continue
        consumer_ref = link.get("consumer_ref")
        candidate_root = public_candidate_roots.get(consumer_ref)
        url_template = link.get("url_template")
        if not isinstance(candidate_root, str) or not isinstance(url_template, str):
            continue
        try:
            candidate_parts = urlsplit(candidate_root)
            link_parts = urlsplit(url_template)
            bundle_values = parse_qs(link_parts.query, keep_blank_values=True).get(
                "bundle", []
            )
            expected_bundle = urljoin(
                candidate_root if candidate_root.endswith("/") else candidate_root + "/",
                "okf-explorer.json",
            )
        except ValueError:
            errors.append(
                f"post-deploy deep link {link.get('id', '<unknown>')!r} has an invalid URL"
            )
            continue
        if candidate_parts.scheme not in {"http", "https"}:
            errors.append(
                f"public-route for {consumer_ref!r} must be an HTTP(S) candidate root"
            )
        if bundle_values != [expected_bundle]:
            errors.append(
                f"post-deploy deep link {link.get('id', '<unknown>')!r} must bind "
                f"the exact external candidate descriptor {expected_bundle!r}"
            )

    root = repository_root.resolve()
    for node in nodes:
        if not isinstance(node, dict) or node.get("kind") != "validator":
            continue
        for repository_path in node.get("repository_paths", []):
            if not isinstance(repository_path, str):
                continue
            try:
                resolved = (root / repository_path).resolve()
            except (OSError, ValueError):
                resolved = Path("/")
            if not resolved.is_relative_to(root):
                errors.append(
                    f"validator node {node.get('id', '<unknown>')!r} has unsafe "
                    f"repository path {repository_path!r}"
                )
            elif not resolved.is_file():
                errors.append(
                    f"validator node {node.get('id', '<unknown>')!r} references "
                    f"absent repository path {repository_path!r}"
                )

    impact_policy = profile.get("impact_policy", {})
    rules = impact_policy.get("path_rules", []) if isinstance(impact_policy, dict) else []
    rule_ids: set[str] = set()
    for index, rule in enumerate(rules):
        if not isinstance(rule, dict):
            continue
        identifier = rule.get("id")
        if isinstance(identifier, str):
            if identifier in rule_ids:
                errors.append(f"impact policy rule id {identifier!r} is not unique")
            rule_ids.add(identifier)
        for node_ref in rule.get("node_refs", []):
            if isinstance(node_ref, str) and node_ref not in node_ids:
                errors.append(
                    f"impact policy rule {identifier or index!r} references unknown "
                    f"node {node_ref!r}"
                )
        for plane_ref in rule.get("plane_refs", []):
            if isinstance(plane_ref, str) and plane_ref not in plane_ids:
                errors.append(
                    f"impact policy rule {identifier or index!r} references unknown "
                    f"plane {plane_ref!r}"
                )
        for validation_ref in rule.get("validation_refs", []):
            if isinstance(validation_ref, str) and validation_ref not in validation_ids:
                errors.append(
                    f"impact policy rule {identifier or index!r} references unknown "
                    f"validator {validation_ref!r}"
                )
        for pattern in rule.get("patterns", []):
            if not isinstance(pattern, str):
                continue
            parts = pattern.replace("\\", "/").split("/")
            if (
                pattern != pattern.strip()
                or pattern.startswith(("/", "~"))
                or "\\" in pattern
                or ".." in parts
            ):
                errors.append(
                    f"impact policy rule {identifier or index!r} has unsafe pattern "
                    f"{pattern!r}"
                )
    return errors


def journey_shape_errors(journeys: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if journeys.get("schema") != JOURNEY_SCHEMA:
        errors.append(f"journeys: schema must be {JOURNEY_SCHEMA!r}")
    for field in ("title", "description", "target_bundle", "question_suite"):
        if not isinstance(journeys.get(field), str) or not journeys[field].strip():
            errors.append(f"journeys: {field} must be a nonempty string")
    for field in ("personas", "stories", "journeys"):
        rows = journeys.get(field)
        if not isinstance(rows, list):
            errors.append(f"journeys: {field} must be an array")
            continue
        for index, row in enumerate(rows):
            if not isinstance(row, dict):
                errors.append(f"journeys: {field}[{index}] must be an object")
            elif not isinstance(row.get("id"), str) or not row["id"].strip():
                errors.append(f"journeys: {field}[{index}].id must be a nonempty string")
    for index, persona in enumerate(journeys.get("personas", [])):
        if not isinstance(persona, dict):
            continue
        for field in ("name", "need"):
            if not isinstance(persona.get(field), str) or not persona[field].strip():
                errors.append(
                    f"journeys: personas[{index}].{field} must be a nonempty string"
                )
    for index, story in enumerate(journeys.get("stories", [])):
        if not isinstance(story, dict):
            continue
        if not isinstance(story.get("user_story"), str) or not story["user_story"].strip():
            errors.append(
                f"journeys: stories[{index}].user_story must be a nonempty string"
            )
        for field in ("persona_ids", "question_ids"):
            if not isinstance(story.get(field), list):
                errors.append(f"journeys: stories[{index}].{field} must be an array")
    for index, journey in enumerate(journeys.get("journeys", [])):
        if not isinstance(journey, dict):
            continue
        if not isinstance(journey.get("title"), str) or not journey["title"].strip():
            errors.append(f"journeys: journeys[{index}].title must be a nonempty string")
        if not isinstance(journey.get("start"), dict):
            errors.append(f"journeys: journeys[{index}].start must be an object")
        for field in ("persona_ids", "story_ids", "actions", "assertions"):
            if not isinstance(journey.get(field), list):
                errors.append(f"journeys: journeys[{index}].{field} must be an array")
        for action_index, action in enumerate(journey.get("actions", [])):
            if not isinstance(action, dict):
                errors.append(
                    f"journeys: journeys[{index}].actions[{action_index}] must be an object"
                )
            elif action.get("action") not in JOURNEY_ACTIONS:
                errors.append(
                    f"journeys: journeys[{index}].actions[{action_index}].action "
                    f"must be a supported evaluator action"
                )
            elif action["action"] == "open_external_link_new_tab" and (
                not isinstance(action.get("href_includes"), str)
                or not action["href_includes"].strip()
            ):
                errors.append(
                    f"journeys: journeys[{index}].actions[{action_index}] "
                    "must declare href_includes"
                )
            elif action["action"] == "verify_url" and any(
                not isinstance(action.get(field), str) or not action[field].strip()
                for field in ("value", "expected_text")
            ):
                errors.append(
                    f"journeys: journeys[{index}].actions[{action_index}] "
                    "must declare value and expected_text"
                )
            elif (
                action["action"] == "verify_url"
                and "expected_final_hash" in action
                and (
                    not isinstance(action["expected_final_hash"], str)
                    or not action["expected_final_hash"].startswith("#")
                    or len(action["expected_final_hash"]) < 2
                    or any(char.isspace() for char in action["expected_final_hash"])
                )
            ):
                errors.append(
                    f"journeys: journeys[{index}].actions[{action_index}] "
                    "expected_final_hash must be a nonempty URL hash without whitespace"
                )
            if not isinstance(action, dict) or action.get("action") != "verify_url":
                continue
            location = f"journeys: journeys[{index}].actions[{action_index}]"
            channel = action.get("verification_channel")
            if channel is not None and channel != GENUINE_BROWSER_VERIFICATION_CHANNEL:
                errors.append(
                    f"{location}.verification_channel must be "
                    f"{GENUINE_BROWSER_VERIFICATION_CHANNEL!r}"
                )
            if channel == GENUINE_BROWSER_VERIFICATION_CHANNEL:
                if _safe_fixture_relative_receipt_path(action.get("receipt")) is None:
                    errors.append(
                        f"{location}.receipt must be a safe fixture-relative JSON path"
                    )
            elif "receipt" in action:
                errors.append(
                    f"{location}.receipt requires verification_channel "
                    f"{GENUINE_BROWSER_VERIFICATION_CHANNEL!r}"
                )
            if _http_url_identity(action.get("value")) is None:
                errors.append(
                    f"{location}.value must be a credential-free http(s) URL"
                )
            if "expected_final_url" in action and _http_url_identity(
                action.get("expected_final_url"), allow_fragment=False
            ) is None:
                errors.append(
                    f"{location}.expected_final_url must be a credential-free http(s) "
                    "URL without a fragment"
                )
        for assertion_index, assertion in enumerate(journey.get("assertions", [])):
            if not isinstance(assertion, dict):
                errors.append(
                    f"journeys: journeys[{index}].assertions[{assertion_index}] "
                    "must be an object"
                )
            elif assertion.get("assertion") not in JOURNEY_ASSERTIONS:
                errors.append(
                    f"journeys: journeys[{index}].assertions[{assertion_index}].assertion "
                    f"must be a supported evaluator assertion"
                )
    return errors


def _safe_fixture_relative_receipt_path(value: Any) -> Path | None:
    """Return a normalized receipt path only when it stays fixture-relative."""

    if (
        not isinstance(value, str)
        or not value
        or value != value.strip()
        or any(character.isspace() for character in value)
        or "\\" in value
        or unquote(value) != value
    ):
        return None
    try:
        parsed = urlsplit(value)
    except ValueError:
        return None
    if parsed.scheme or parsed.netloc or parsed.query or parsed.fragment:
        return None
    path = Path(parsed.path)
    if (
        path.is_absolute()
        or not path.parts
        or any(part in {"", ".", ".."} for part in path.parts)
        or path.suffix.casefold() != ".json"
    ):
        return None
    return path


def _http_url_identity(
    value: Any,
    *,
    allow_fragment: bool = True,
) -> tuple[str, str, int | None, str, str] | None:
    """Return URL origin/path/query identity for a safe credential-free URL."""

    if (
        not isinstance(value, str)
        or not value
        or value != value.strip()
        or any(character.isspace() or ord(character) < 32 for character in value)
        or "\\" in value
    ):
        return None
    try:
        parsed = urlsplit(value)
        port = parsed.port
    except ValueError:
        return None
    scheme = parsed.scheme.casefold()
    if (
        scheme not in {"http", "https"}
        or not parsed.netloc
        or parsed.hostname is None
        or parsed.username is not None
        or parsed.password is not None
        or (not allow_fragment and bool(parsed.fragment))
    ):
        return None
    try:
        query_keys = (
            key
            for key, _value in parse_qsl(parsed.query, keep_blank_values=True)
        )
        if any(CREDENTIAL_QUERY_KEY.fullmatch(key) for key in query_keys):
            return None
    except ValueError:
        return None
    if (scheme, port) in {("http", 80), ("https", 443)}:
        port = None
    return (
        scheme,
        parsed.hostname.casefold(),
        port,
        parsed.path or "/",
        parsed.query,
    )


def _observed_at_timestamp(value: Any) -> datetime | None:
    """Parse an unambiguous ISO 8601 observation timestamp."""

    if (
        not isinstance(value, str)
        or not value.strip()
        or value != value.strip()
        or TIMEZONE_QUALIFIED_TIMESTAMP.search(value) is None
    ):
        return None
    normalized = f"{value[:-1]}+00:00" if value.endswith("Z") else value
    try:
        observed_at = datetime.fromisoformat(normalized)
    except ValueError:
        return None
    if observed_at.tzinfo is None or observed_at.utcoffset() is None:
        return None
    return observed_at


def genuine_browser_receipt_errors(
    journeys: dict[str, Any],
    fixture_dir: Path,
) -> list[str]:
    """Validate session-backed evidence used by protected ``verify_url`` actions."""

    errors: list[str] = []
    grouped_actions: dict[Path, list[tuple[str, dict[str, Any]]]] = {}
    fixture_root = fixture_dir.resolve()
    for journey_index, journey in enumerate(journeys.get("journeys", [])):
        if not isinstance(journey, dict):
            continue
        for action_index, action in enumerate(journey.get("actions", [])):
            if (
                not isinstance(action, dict)
                or action.get("action") != "verify_url"
                or action.get("verification_channel")
                != GENUINE_BROWSER_VERIFICATION_CHANNEL
            ):
                continue
            location = (
                f"journeys: journeys[{journey_index}].actions[{action_index}]"
            )
            relative_path = _safe_fixture_relative_receipt_path(action.get("receipt"))
            if relative_path is None:
                continue
            try:
                receipt_path = (fixture_dir / relative_path).resolve()
            except (OSError, ValueError):
                errors.append(f"{location}.receipt cannot be resolved safely")
                continue
            if not receipt_path.is_relative_to(fixture_root):
                errors.append(f"{location}.receipt must stay within the fixture directory")
                continue
            grouped_actions.setdefault(receipt_path, []).append((location, action))

    for receipt_path, actions in grouped_actions.items():
        receipt_label = f"browser receipt {receipt_path.relative_to(fixture_root)}"
        if not receipt_path.is_file():
            errors.append(f"{receipt_label}: file does not exist")
            continue
        try:
            receipt = load_document(receipt_path)
        except ValueError as error:
            errors.append(str(error))
            continue
        if receipt.get("schema") != GENUINE_BROWSER_RECEIPT_SCHEMA:
            errors.append(
                f"{receipt_label}: schema must be {GENUINE_BROWSER_RECEIPT_SCHEMA!r}"
            )
        receipt_observed_at = _observed_at_timestamp(receipt.get("observed_at"))
        if receipt_observed_at is None:
            errors.append(
                f"{receipt_label}: observed_at must be a timezone-qualified timestamp"
            )
        browser = receipt.get("browser")
        if not isinstance(browser, dict) or browser.get("webdriver") is not False:
            errors.append(f"{receipt_label}: browser.webdriver must be false")
        if (
            not isinstance(browser, dict)
            or not isinstance(browser.get("channel"), str)
            or not browser["channel"].strip()
        ):
            errors.append(f"{receipt_label}: browser.channel must be a nonempty string")
        if (
            not isinstance(browser, dict)
            or not isinstance(browser.get("user_agent"), str)
            or not browser["user_agent"].strip()
        ):
            errors.append(
                f"{receipt_label}: browser.user_agent must be a nonempty string"
            )
        records = receipt.get("records")
        if not isinstance(records, list) or not records:
            errors.append(f"{receipt_label}: records must be a nonempty array")
            continue

        records_by_url: dict[str, dict[str, Any]] = {}
        previous_observed_at: datetime | None = None
        for record_index, record in enumerate(records):
            record_label = f"{receipt_label}: records[{record_index}]"
            if not isinstance(record, dict):
                errors.append(f"{record_label} must be an object")
                continue
            observed_at = _observed_at_timestamp(record.get("observed_at"))
            if observed_at is None:
                errors.append(
                    f"{record_label}.observed_at must be a timezone-qualified "
                    "timestamp"
                )
            else:
                if (
                    previous_observed_at is not None
                    and observed_at < previous_observed_at
                ):
                    errors.append(
                        f"{receipt_label}: records must be ordered by observed_at"
                    )
                if (
                    receipt_observed_at is not None
                    and observed_at > receipt_observed_at
                ):
                    errors.append(
                        f"{record_label}.observed_at must not be later than the "
                        "receipt observed_at"
                    )
                previous_observed_at = observed_at
            requested_url = record.get("requested_url")
            if _http_url_identity(requested_url) is None:
                errors.append(
                    f"{record_label}.requested_url must be a credential-free http(s) URL"
                )
            elif requested_url in records_by_url:
                errors.append(
                    f"{receipt_label}: requested_url {requested_url!r} is not unique"
                )
            else:
                records_by_url[requested_url] = record
            if _http_url_identity(record.get("final_url")) is None:
                errors.append(
                    f"{record_label}.final_url must be a credential-free http(s) URL"
                )
            if (
                not isinstance(record.get("expected_text"), str)
                or not record["expected_text"].strip()
            ):
                errors.append(f"{record_label}.expected_text must be a nonempty string")
            if (
                not isinstance(record.get("title"), str)
                or not record["title"].strip()
            ):
                errors.append(f"{record_label}.title must be a nonempty string")
            if record.get("identity_source") != "document.body.innerText":
                errors.append(
                    f"{record_label}.identity_source must be "
                    "'document.body.innerText'"
                )
            identity_excerpt = record.get("identity_excerpt")
            if not isinstance(identity_excerpt, str) or not identity_excerpt.strip():
                errors.append(
                    f"{record_label}.identity_excerpt must be a nonempty string"
                )
            elif (
                isinstance(record.get("expected_text"), str)
                and record["expected_text"].strip()
                and record["expected_text"].casefold()
                not in identity_excerpt.casefold()
            ):
                errors.append(
                    f"{record_label}.identity_excerpt must contain expected_text"
                )
            response_status = record.get("response_status")
            if (
                isinstance(response_status, bool)
                or not isinstance(response_status, int)
                or not 200 <= response_status <= 399
            ):
                errors.append(f"{record_label}.response_status must be from 200 to 399")
            if record.get("identity_matched") is not True:
                errors.append(f"{record_label}.identity_matched must be true")

        if (
            receipt_observed_at is not None
            and previous_observed_at is not None
            and previous_observed_at != receipt_observed_at
        ):
            errors.append(
                f"{receipt_label}: observed_at must equal the latest ordered record "
                "observed_at"
            )

        for location, action in actions:
            requested_url = action.get("value")
            record = records_by_url.get(requested_url)
            if record is None:
                errors.append(
                    f"{location}: receipt has no record for requested URL {requested_url!r}"
                )
                continue
            if record.get("expected_text") != action.get("expected_text"):
                errors.append(
                    f"{location}: receipt expected_text must exactly match the action"
                )
            expected_final_url = action.get("expected_final_url", requested_url)
            final_identity = _http_url_identity(record.get("final_url"))
            expected_identity = _http_url_identity(expected_final_url)
            if (
                final_identity is not None
                and expected_identity is not None
                and final_identity != expected_identity
            ):
                errors.append(
                    f"{location}: receipt final origin/path/query does not match "
                    "expected_final_url or requested URL"
                )
    return errors


def load_question_suite(
    journeys: dict[str, Any],
    journeys_path: Path,
    fixture_dir: Path,
    repository_root: Path,
) -> tuple[tuple[Path, dict[str, Any]] | None, list[str]]:
    reference = journeys.get("question_suite")
    if not isinstance(reference, str) or not reference.strip():
        return None, []
    try:
        parsed = urlsplit(reference)
    except ValueError:
        parsed = None
    if (
        parsed is None
        or parsed.scheme
        or parsed.netloc
        or Path(unquote(parsed.path)).suffix.casefold() != ".json"
    ):
        return None, ["journeys: question_suite must reference a local JSON file"]
    resolved = resolve_local_reference(
        unquote(parsed.path),
        journeys_path,
        fixture_dir,
        repository_root,
    )
    if resolved is None:
        return None, [
            f"journeys: question_suite file does not exist: {reference!r}"
        ]
    try:
        return (resolved, load_document(resolved)), []
    except ValueError as error:
        return None, [str(error)]


def question_suite_errors(
    suite: dict[str, Any],
    journeys: dict[str, Any],
) -> list[str]:
    errors: list[str] = []
    if suite.get("schema") != QUESTION_SUITE_SCHEMA:
        errors.append(f"question suite: schema must be {QUESTION_SUITE_SCHEMA!r}")
    questions = suite.get("questions")
    if not isinstance(questions, list):
        return [*errors, "question suite: questions must be an array"]
    if len(questions) != EXPECTED_QUESTION_COUNT:
        errors.append(
            f"question suite: expected {EXPECTED_QUESTION_COUNT} questions, "
            f"found {len(questions)}"
        )
    question_ids: set[str] = set()
    for index, question in enumerate(questions):
        if not isinstance(question, dict):
            errors.append(f"question suite: questions[{index}] must be an object")
            continue
        identifier = question.get("id")
        if not isinstance(identifier, str) or not identifier.strip():
            errors.append(
                f"question suite: questions[{index}].id must be a nonempty string"
            )
        elif identifier in question_ids:
            errors.append(f"question suite: duplicate question id {identifier!r}")
        else:
            question_ids.add(identifier)
        for field in ("query", "intent"):
            if not isinstance(question.get(field), str) or not question[field].strip():
                errors.append(
                    f"question suite: questions[{index}].{field} must be a nonempty string"
                )
        expected_terms = question.get("expected_terms")
        if (
            not isinstance(expected_terms, list)
            or not expected_terms
            or any(not isinstance(term, str) or not term.strip() for term in expected_terms)
        ):
            errors.append(
                f"question suite: questions[{index}].expected_terms must contain strings"
            )
    rubric = suite.get("rubric")
    points: list[float] = []
    if isinstance(rubric, dict):
        for part in rubric.values():
            point = part.get("points") if isinstance(part, dict) else None
            if isinstance(point, (int, float)) and not isinstance(point, bool):
                points.append(float(point))
    if not points or not math.isclose(sum(points), 100):
        errors.append("question suite: rubric points must total 100")

    referenced: set[str] = set()
    for story_index, story in enumerate(journeys.get("stories", [])):
        if not isinstance(story, dict):
            continue
        for identifier in story.get("question_ids", []):
            if not isinstance(identifier, str):
                errors.append(
                    f"journeys: stories[{story_index}].question_ids must contain strings"
                )
            elif identifier not in question_ids:
                errors.append(
                    f"journeys: stories[{story_index}] references unknown question "
                    f"{identifier!r}"
                )
            else:
                referenced.add(identifier)
    for identifier in sorted(question_ids - referenced):
        errors.append(f"question suite: question {identifier!r} is not traced to a story")
    return errors


def _local_reference_path(value: str) -> str | None:
    if not value or value.strip() != value or any(character.isspace() for character in value):
        return None
    try:
        parsed = urlsplit(value)
    except ValueError:
        return None
    if parsed.scheme or parsed.netloc:
        return None
    candidate = unquote(parsed.path)
    if not candidate:
        return None
    suffix = Path(candidate.rstrip("/")).suffix.casefold()
    if (
        candidate.startswith(("./", "../", "/"))
        or candidate.endswith("/")
        or suffix in LOCAL_FILE_SUFFIXES
    ):
        return candidate
    return None


def local_references(
    documents: dict[str, tuple[Path, dict[str, Any]]],
) -> list[tuple[str, Path, str]]:
    found: list[tuple[str, Path, str]] = []
    for label, (source_path, document) in documents.items():
        for location, child in walk(document):
            if not isinstance(child, str):
                continue
            if ".impact_policy.path_rules[" in location and ".patterns[" in location:
                # These are repository glob expressions interpreted by the
                # impact planner, not resources to resolve while validating.
                continue
            field = location.rsplit(".", 1)[-1]
            if field in NON_LOCAL_REFERENCE_FIELDS:
                continue
            candidate = _local_reference_path(child)
            if candidate is not None:
                found.append((f"{label}:{location}", source_path, candidate))
    return found


def resolve_local_reference(
    reference: str,
    source_path: Path,
    fixture_dir: Path,
    repository_root: Path,
    additional_roots: Iterable[Path] = (),
) -> Path | None:
    raw = Path(reference)
    candidates = (
        [
            repository_root / reference.lstrip("/"),
            *(base / reference.lstrip("/") for base in additional_roots),
        ]
        if raw.is_absolute()
        else [
            source_path.parent / raw,
            fixture_dir / raw,
            *(base / raw for base in additional_roots),
            repository_root / raw,
        ]
    )
    root = repository_root.resolve()
    for candidate in candidates:
        try:
            resolved = candidate.resolve()
        except (OSError, ValueError):
            continue
        if not resolved.is_relative_to(root):
            continue
        if resolved.is_file():
            return resolved
    return None


def local_reference_errors(
    documents: dict[str, tuple[Path, dict[str, Any]]],
    fixture_dir: Path,
    repository_root: Path,
) -> list[str]:
    errors: list[str] = []
    seen: set[tuple[str, str]] = set()
    candidate_roots: list[Path] = []
    profile_document = documents.get("profile")
    if profile_document is not None:
        profile_path, profile = profile_document
        fixture_reference = profile.get("fixtures", {}).get("faithful")
        if isinstance(fixture_reference, str):
            descriptor = resolve_local_reference(
                fixture_reference,
                profile_path,
                fixture_dir,
                repository_root,
            )
            if descriptor is not None:
                candidate_roots.append(descriptor.parent)
    coverage_document = documents.get("coverage")
    if coverage_document is not None:
        coverage_path, coverage = coverage_document
        bundle_reference = coverage.get("bundle")
        if isinstance(bundle_reference, str):
            descriptor = resolve_local_reference(
                bundle_reference,
                coverage_path,
                fixture_dir,
                repository_root,
            )
            if descriptor is not None:
                candidate_roots.append(descriptor.parent)
    for location, source_path, reference in local_references(documents):
        key = (str(source_path), reference)
        if key in seen:
            continue
        seen.add(key)
        additional_roots = (
            candidate_roots
            if (
                location.startswith("coverage:$.candidate_evidence.")
                or (
                    location.startswith("journeys:$.journeys[")
                    and location.endswith(".start.bundle")
                )
            )
            else []
        )
        if resolve_local_reference(
            reference,
            source_path,
            fixture_dir,
            repository_root,
            additional_roots,
        ) is None:
            errors.append(f"{location}: local referenced file does not exist: {reference!r}")
    return errors


def descriptor_identity(document: dict[str, Any]) -> tuple[str, str]:
    corpus_id = ""
    for key in ("@id", "corpus_id"):
        if isinstance(document.get(key), str) and document[key].strip():
            corpus_id = document[key].strip()
            break
    namespace = ""
    for key in ("base_namespace", "namespace"):
        if isinstance(document.get(key), str) and document[key].strip():
            namespace = document[key].strip()
            break
    return corpus_id, namespace


def normalized_identity(value: str) -> str:
    try:
        parsed = urlsplit(value)
    except ValueError:
        return value.rstrip("/")
    if not parsed.scheme:
        return value.rstrip("/")
    return parsed._replace(
        scheme=parsed.scheme.casefold(),
        netloc=parsed.netloc.casefold(),
        path=parsed.path.rstrip("/"),
    ).geturl()


def fixture_isolation_errors(
    profile: dict[str, Any],
    profile_path: Path,
    fixture_dir: Path,
    repository_root: Path,
) -> list[str]:
    errors: list[str] = []
    fixture_refs = profile.get("fixtures", {})
    descriptors: dict[str, tuple[Path, dict[str, Any]]] = {}
    if not isinstance(fixture_refs, dict):
        return errors
    for kind in ("tiny", "faithful", "synthetic"):
        reference = fixture_refs.get(kind)
        if not isinstance(reference, str):
            continue
        resolved = resolve_local_reference(
            reference,
            profile_path,
            fixture_dir,
            repository_root,
        )
        if resolved is None or not resolved.is_file():
            errors.append(f"fixtures.{kind} must reference an existing descriptor file")
            continue
        try:
            descriptors[kind] = (resolved, load_document(resolved))
        except ValueError as error:
            errors.append(str(error))

    identities: dict[str, tuple[str, str]] = {}
    for kind, (_path, document) in descriptors.items():
        corpus_id, namespace = descriptor_identity(document)
        identities[kind] = (corpus_id, namespace)
        if not corpus_id:
            errors.append(f"fixtures.{kind} descriptor has no @id or corpus_id")
        if not namespace:
            errors.append(f"fixtures.{kind} descriptor has no base_namespace or namespace")

    synthetic_identity = identities.get("synthetic")
    if synthetic_identity:
        for kind in ("tiny", "faithful"):
            other = identities.get(kind)
            if not other:
                continue
            if (
                synthetic_identity[0]
                and normalized_identity(synthetic_identity[0])
                == normalized_identity(other[0])
            ):
                errors.append(f"synthetic corpus identity must differ from {kind}")
            if (
                synthetic_identity[1]
                and normalized_identity(synthetic_identity[1])
                == normalized_identity(other[1])
            ):
                errors.append(f"synthetic base namespace must differ from {kind}")

    faithful = descriptors.get("faithful", (Path(), {}))[1]
    if faithful and faithful.get("assertion_scope") != "real-world":
        errors.append("faithful descriptor assertion_scope must be 'real-world'")
    synthetic = descriptors.get("synthetic", (Path(), {}))[1]
    if synthetic:
        if synthetic.get("assertion_scope") != "synthetic-fixture":
            errors.append("synthetic descriptor assertion_scope must be 'synthetic-fixture'")
        for field in ("default_loaded", "include_in_counts", "include_in_search"):
            if synthetic.get(field) is not False:
                errors.append(f"synthetic descriptor {field} must be false")
    descriptor_documents = {
        f"fixtures.{kind}": descriptor
        for kind, descriptor in descriptors.items()
    }
    errors.extend(
        local_reference_errors(
            descriptor_documents,
            fixture_dir,
            repository_root,
        )
    )
    return errors


def publication_boundary_errors(
    profile: dict[str, Any], coverage: dict[str, Any]
) -> list[str]:
    errors: list[str] = []
    for label, document in (("evaluation profile", profile), ("feature coverage", coverage)):
        value = document.get("publication_boundary")
        if not isinstance(value, str) or not value.strip():
            errors.append(f"{label}: publication_boundary must be nonempty")
    return errors


def validate_fixture_family(
    fixture_dir: Path,
    repository_root: Path = ROOT,
    validators: dict[str, Draft202012Validator] | None = None,
) -> list[str]:
    errors: list[str] = []
    paths = {key: fixture_dir / filename for key, filename in REQUIRED_ARTIFACTS.items()}
    for key, path in paths.items():
        if not path.is_file():
            errors.append(f"{fixture_dir}: missing required {key} artifact {path.name}")
    if errors:
        return errors

    documents: dict[str, dict[str, Any]] = {}
    for key, path in paths.items():
        try:
            documents[key] = load_document(path)
        except ValueError as error:
            errors.append(str(error))
    if errors:
        return errors

    active_validators = validators or schema_validators()
    profile_validator_key = PROFILE_SCHEMA_VALIDATORS.get(
        str(documents["profile"].get("schema", ""))
    )
    if profile_validator_key is None:
        errors.append(
            "evaluation-profile.yaml:schema: unsupported Evaluation Foundry "
            f"profile schema {documents['profile'].get('schema')!r}"
        )
    schema_keys = {
        "profile": profile_validator_key,
        "mappings": "mappings",
        "coverage": "coverage",
    }
    for key in ("profile", "mappings", "coverage"):
        validator_key = schema_keys[key]
        if validator_key is None:
            continue
        errors.extend(
            rendered_schema_errors(
                paths[key].name,
                documents[key],
                active_validators[validator_key],
            )
        )
    for key, document in documents.items():
        errors.extend(duplicate_id_errors(paths[key].name, document))
    errors.extend(cross_document_id_errors(documents))
    errors.extend(
        duplicate_scalar_errors(
            paths["profile"].name,
            "mapping_proposals",
            documents["profile"].get("mapping_proposals"),
        )
    )
    errors.extend(
        duplicate_scalar_errors(
            paths["profile"].name,
            "capabilities",
            documents["profile"].get("capabilities"),
        )
    )
    errors.extend(journey_shape_errors(documents["journeys"]))
    errors.extend(
        genuine_browser_receipt_errors(
            documents["journeys"],
            fixture_dir,
        )
    )
    question_suite, question_errors = load_question_suite(
        documents["journeys"],
        paths["journeys"],
        fixture_dir,
        repository_root,
    )
    errors.extend(question_errors)
    if question_suite is not None:
        errors.extend(question_suite_errors(question_suite[1], documents["journeys"]))
    errors.extend(
        profile_reference_errors(
            documents["profile"],
            documents["mappings"],
            documents["coverage"],
            documents["journeys"],
        )
    )
    errors.extend(
        evaluation_v2_contract_errors(
            documents["profile"],
            paths["profile"],
            fixture_dir,
            repository_root,
        )
    )
    artifact_documents = {
        key: (paths[key], document) for key, document in documents.items()
    }
    if question_suite is not None:
        artifact_documents["question_suite"] = question_suite
    errors.extend(
        local_reference_errors(
            artifact_documents,
            fixture_dir,
            repository_root,
        )
    )
    errors.extend(
        fixture_isolation_errors(
            documents["profile"],
            paths["profile"],
            fixture_dir,
            repository_root,
        )
    )
    errors.extend(
        publication_boundary_errors(
            documents["profile"], documents["coverage"]
        )
    )
    return errors


def discover_fixture_families(fixtures_root: Path) -> list[Path]:
    if not fixtures_root.is_dir():
        return []
    return sorted(
        (
            path
            for path in fixtures_root.iterdir()
            if path.is_dir() and not path.name.startswith(".")
        ),
        key=lambda path: path.name,
    )


def validate_all(
    fixtures_root: Path = DEFAULT_FIXTURES_ROOT,
    repository_root: Path = ROOT,
) -> tuple[list[Path], list[str]]:
    families = discover_fixture_families(fixtures_root)
    if not families:
        return families, [f"{fixtures_root}: no Evaluation Foundry fixture families found"]
    validators = schema_validators()
    errors: list[str] = []
    for family in families:
        errors.extend(validate_fixture_family(family, repository_root, validators))
    return families, errors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--fixtures-root",
        type=Path,
        default=DEFAULT_FIXTURES_ROOT,
        help="directory containing Evaluation Foundry fixture families",
    )
    parser.add_argument(
        "--repository-root",
        type=Path,
        default=ROOT,
        help="root used to resolve repository-local references",
    )
    args = parser.parse_args(argv)
    families, errors = validate_all(
        args.fixtures_root.resolve(),
        args.repository_root.resolve(),
    )
    if errors:
        print("Evaluation Foundry validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    print(f"Evaluation Foundry validation passed for {len(families)} fixture family/families")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
