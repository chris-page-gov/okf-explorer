#!/usr/bin/env python3
"""Validate an OKF domain profile's schema, references and equivalent form."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import unicodedata
from collections import Counter
from datetime import datetime
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlsplit

from jsonschema import Draft202012Validator, FormatChecker
from ruamel.yaml import YAML


ROOT = Path(__file__).resolve().parents[1]
SCHEMA_PATH = ROOT / "profiles" / "authoring" / "v1" / "domain-profile.schema.json"

SKOS_MAPPING_PREDICATES = {
    "exact-match": "http://www.w3.org/2004/02/skos/core#exactMatch",
    "close-match": "http://www.w3.org/2004/02/skos/core#closeMatch",
    "broad-match": "http://www.w3.org/2004/02/skos/core#broadMatch",
    "narrow-match": "http://www.w3.org/2004/02/skos/core#narrowMatch",
    "related-match": "http://www.w3.org/2004/02/skos/core#relatedMatch",
}
IDENTITY_PREDICATES = {"http://www.w3.org/2002/07/owl#sameAs"}
RESERVED_MAPPING_PREDICATES = set(SKOS_MAPPING_PREDICATES.values()) | IDENTITY_PREDICATES
APPROVAL_GRADE_VERIFICATION = {"support-checked", "independently-verified"}


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


def canonical_bytes(value: Any) -> bytes:
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


def _date_time(value: Any) -> datetime | None:
    if not isinstance(value, str):
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _canonical_candidate_id(value: Any) -> bool:
    return bool(
        isinstance(value, str)
        and value == value.strip()
        and 0 < len(value) <= 1024
        and unicodedata.normalize("NFC", value) == value
        and not any(ord(character) < 32 or ord(character) == 127 for character in value)
    )


def _candidate_list_sha256(candidate_ids: list[str]) -> str:
    payload = (
        json.dumps(
            sorted(candidate_ids),
            ensure_ascii=False,
            separators=(",", ":"),
        )
        + "\n"
    ).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def _coverage_result_sha256(result: dict[str, Any]) -> str:
    return hashlib.sha256(canonical_bytes(result)).hexdigest()


def _approval_grade_evidence(evidence: Any) -> bool:
    digest = evidence.get("sha256") if isinstance(evidence, dict) else None
    return bool(
        isinstance(evidence, dict)
        and isinstance(digest, str)
        and len(digest) == 64
        and all(character in "0123456789abcdef" for character in digest)
        and evidence.get("verification") in APPROVAL_GRADE_VERIFICATION
    )


def _http_origin(value: str) -> tuple[str, str, int] | None:
    try:
        parsed = urlsplit(value)
        hostname = parsed.hostname
        port = parsed.port
    except ValueError:
        return None
    if parsed.scheme.casefold() not in {"http", "https"} or not hostname:
        return None
    if parsed.username is not None or parsed.password is not None:
        return None
    default_port = 443 if parsed.scheme.casefold() == "https" else 80
    return parsed.scheme.casefold(), hostname.casefold(), port or default_port


def _safe_decoded_path(value: str) -> str | None:
    # An encoded path delimiter is not a child-boundary separator. Reject it
    # rather than decoding `/source%2Fevil` into an apparent `/source/evil`.
    if re.search(r"%(?:2f|5c)", value, flags=re.IGNORECASE):
        return None
    try:
        decoded = unquote(value, errors="strict")
    except (UnicodeDecodeError, ValueError):
        return None
    if "\\" in decoded or any(ord(character) < 32 for character in decoded):
        return None
    if any(segment in {".", ".."} for segment in decoded.split("/")):
        return None
    return decoded or "/"


def _iri_in_namespace(target_iri: Any, namespace_iri: Any) -> bool:
    """Return URI-aware membership for an HTTP path or hash namespace."""

    if not isinstance(target_iri, str) or not isinstance(namespace_iri, str):
        return False
    target_origin = _http_origin(target_iri)
    namespace_origin = _http_origin(namespace_iri)
    if (
        target_origin is None
        or namespace_origin is None
        or target_origin != namespace_origin
    ):
        return False
    target = urlsplit(target_iri)
    namespace = urlsplit(namespace_iri)
    if namespace_iri.endswith("#"):
        return bool(
            target.path == namespace.path
            and target.query == namespace.query
            and target.fragment
        )
    if namespace.query or namespace.fragment:
        return False
    target_path = _safe_decoded_path(target.path)
    namespace_path = _safe_decoded_path(namespace.path)
    if target_path is None or namespace_path is None:
        return False
    if namespace_path.endswith("/"):
        return target_path.startswith(namespace_path)
    return target_path == namespace_path or target_path.startswith(
        namespace_path + "/"
    )


def _valid_http_namespace(value: Any) -> bool:
    if not isinstance(value, str) or _http_origin(value) is None:
        return False
    parsed = urlsplit(value)
    if parsed.query or parsed.fragment:
        return False
    return _safe_decoded_path(parsed.path) is not None


def _canonical_http_identity(value: str) -> tuple[Any, ...] | None:
    """Normalise the HTTP origin and safe decoded path for duplicate detection."""

    origin = _http_origin(value)
    if origin is None:
        return None
    parsed = urlsplit(value)
    path = _safe_decoded_path(parsed.path)
    if path is None:
        return None
    return (*origin, path, parsed.query, parsed.fragment)


def semantic_linking_errors(value: dict[str, Any]) -> list[str]:
    """Validate identity-bound, evidence-bearing external-link coverage."""

    linking = value.get("semantic_linking")
    if not isinstance(linking, dict):
        return []

    denominators = {
        item["id"]: item
        for item in linking.get("eligible_entity_denominators", [])
        if isinstance(item, dict) and isinstance(item.get("id"), str)
    }
    evidence_by_id = {
        item["id"]: item
        for item in value.get("evidence", [])
        if isinstance(item, dict) and isinstance(item.get("id"), str)
    }
    input_snapshot = value.get("input_snapshot")
    input_snapshot = input_snapshot if isinstance(input_snapshot, dict) else {}
    prepared_at = _date_time(value.get("prepared_at"))
    approved = value.get("status") == "approved"
    errors: list[str] = []

    for identifier, denominator in denominators.items():
        candidate_ids = denominator.get("candidate_ids")
        eligible_count = denominator.get("eligible_count")
        if (
            isinstance(candidate_ids, list)
            and isinstance(eligible_count, int)
            and len(candidate_ids) != eligible_count
        ):
            errors.append(
                f"semantic link denominator {identifier!r} eligible_count must "
                "equal the number of candidate_ids"
            )
        if isinstance(candidate_ids, list):
            for candidate_id in candidate_ids:
                if not _canonical_candidate_id(candidate_id):
                    errors.append(
                        f"semantic link denominator {identifier!r} candidate ID "
                        f"{candidate_id!r} must be trimmed, control-free, bounded "
                        "and NFC-normalised"
                    )
            candidate_strings = [
                item for item in candidate_ids if isinstance(item, str)
            ]
            declared_digest = denominator.get("candidate_list_sha256")
            if isinstance(declared_digest, str) and declared_digest != "unknown":
                expected_digest = _candidate_list_sha256(candidate_strings)
                if declared_digest != expected_digest:
                    errors.append(
                        f"semantic link denominator {identifier!r} "
                        "candidate_list_sha256 must equal the canonical sorted "
                        f"candidate_ids digest {expected_digest}"
                    )
            if approved and declared_digest == "unknown":
                errors.append(
                    f"approved profile semantic link denominator {identifier!r} "
                    "must pin candidate_list_sha256"
                )
        if denominator.get("source_snapshot_id") != input_snapshot.get("snapshot_id"):
            errors.append(
                f"semantic link denominator {identifier!r} source_snapshot_id must "
                "equal input_snapshot.snapshot_id"
            )
        if not _canonical_candidate_id(denominator.get("source_snapshot_id")):
            errors.append(
                f"semantic link denominator {identifier!r} source_snapshot_id "
                "must be trimmed, control-free, bounded and NFC-normalised"
            )
        if approved and input_snapshot.get("inventory_sha256") == "unknown":
            errors.append(
                f"approved profile semantic link denominator {identifier!r} "
                "cannot use an unpinned input snapshot inventory"
            )
    if approved:
        for evidence_ref in sorted(set(referenced_values(linking, "evidence_refs"))):
            evidence = evidence_by_id.get(evidence_ref)
            if not _approval_grade_evidence(evidence):
                errors.append(
                    "approved profile semantic linking requires support-checked "
                    "or independently verified, digest-bound evidence "
                    f"{evidence_ref!r}"
                )

    for link_set in linking.get("link_sets", []):
        if not isinstance(link_set, dict):
            continue
        identifier = link_set.get("id", "<unknown>")
        mapping_relation = link_set.get("mapping_relation")
        predicate_iri = link_set.get("predicate_iri")
        if not _valid_http_namespace(link_set.get("target_namespace")):
            errors.append(
                f"semantic link set {identifier!r} target_namespace must be a "
                "safe HTTP origin and path, optionally ending with a hash delimiter"
            )
        expected_mapping_predicate = SKOS_MAPPING_PREDICATES.get(mapping_relation)
        if expected_mapping_predicate is not None and predicate_iri != expected_mapping_predicate:
            errors.append(
                f"semantic link set {identifier!r} mapping_relation "
                f"{mapping_relation!r} requires predicate_iri "
                f"{expected_mapping_predicate!r}"
            )
        elif mapping_relation == "identity" and predicate_iri not in IDENTITY_PREDICATES:
            errors.append(
                f"semantic link set {identifier!r} identity mapping requires an "
                "approved identity predicate"
            )
        elif (
            mapping_relation == "domain-relationship"
            and predicate_iri in RESERVED_MAPPING_PREDICATES
        ):
            errors.append(
                f"semantic link set {identifier!r} domain-relationship cannot use "
                "an identity or SKOS mapping predicate"
            )
        denominator_ref = link_set.get("denominator_ref")
        denominator = denominators.get(denominator_ref)
        if denominator is None:
            errors.append(
                f"semantic link set {identifier!r} references unknown "
                f"denominator_ref {denominator_ref!r}"
            )
            continue

        result = link_set.get("coverage_result")
        if not isinstance(result, dict):
            continue
        expected_result_digest = _coverage_result_sha256(result)
        if link_set.get("coverage_result_sha256") != expected_result_digest:
            errors.append(
                f"semantic link set {identifier!r} coverage_result_sha256 must "
                "equal canonical coverage_result digest "
                f"{expected_result_digest}"
            )
        count_keys = (
            "eligible_count",
            "linked_count",
            "unresolved_count",
            "excluded_count",
            "conflicting_count",
        )
        if not all(isinstance(result.get(key), int) for key in count_keys):
            continue

        eligible = result["eligible_count"]
        linked = result["linked_count"]
        linked_assertions = result.get("linked_assertion_count")
        unresolved = result["unresolved_count"]
        excluded = result["excluded_count"]
        conflicting = result["conflicting_count"]

        if eligible != denominator.get("eligible_count"):
            errors.append(
                f"semantic link set {identifier!r} coverage eligible_count must "
                f"equal denominator {denominator_ref!r} eligible_count"
            )
        if eligible != linked + unresolved + excluded + conflicting:
            errors.append(
                f"semantic link set {identifier!r} coverage counts must reconcile "
                "exactly: eligible_count = linked_count + unresolved_count + "
                "excluded_count + conflicting_count"
            )

        outcome_specs = (
            ("linked", linked, "linked_candidate_ids"),
            ("unresolved", unresolved, "unresolved_candidate_ids"),
            ("conflicting", conflicting, "conflicting_candidate_ids"),
        )
        outcome_ids: dict[str, list[str]] = {}
        for outcome, count, field in outcome_specs:
            raw_ids = result.get(field)
            ids = [item for item in raw_ids or [] if isinstance(item, str)]
            outcome_ids[outcome] = ids
            for candidate_id in ids:
                if not _canonical_candidate_id(candidate_id):
                    errors.append(
                        f"semantic link set {identifier!r} {outcome} candidate ID "
                        f"{candidate_id!r} must be trimmed, control-free, bounded "
                        "and NFC-normalised"
                    )
            if isinstance(raw_ids, list) and count != len(raw_ids):
                errors.append(
                    f"semantic link set {identifier!r} {outcome}_count must equal "
                    f"the number of {field}"
                )

        declared_exclusions = {
            item["id"]: item
            for item in denominator.get("exclusions", [])
            if isinstance(item, dict) and isinstance(item.get("id"), str)
        }
        exclusion_results = result.get("exclusion_results")
        seen_excluded_candidate_ids: set[str] = set()
        if isinstance(exclusion_results, list):
            seen_exclusion_refs: set[str] = set()
            eligible_candidate_ids = {
                candidate_id
                for candidate_id in denominator.get("candidate_ids", [])
                if isinstance(candidate_id, str)
            }
            reconciled_excluded_count = 0
            for exclusion_result in exclusion_results:
                if not isinstance(exclusion_result, dict):
                    continue
                exclusion_ref = exclusion_result.get("exclusion_ref")
                count = exclusion_result.get("count")
                candidate_ids = exclusion_result.get("candidate_ids")
                if isinstance(exclusion_ref, str):
                    if exclusion_ref in seen_exclusion_refs:
                        errors.append(
                            f"semantic link set {identifier!r} repeats exclusion_ref "
                            f"{exclusion_ref!r}"
                        )
                    seen_exclusion_refs.add(exclusion_ref)
                    if exclusion_ref not in declared_exclusions:
                        errors.append(
                            f"semantic link set {identifier!r} references unknown "
                            f"exclusion_ref {exclusion_ref!r}"
                        )
                if isinstance(count, int):
                    reconciled_excluded_count += count
                    if isinstance(candidate_ids, list) and count != len(candidate_ids):
                        errors.append(
                            f"semantic link set {identifier!r} exclusion_ref "
                            f"{exclusion_ref!r} count must equal the number of "
                            "candidate_ids"
                        )
                if isinstance(candidate_ids, list):
                    for candidate_id in candidate_ids:
                        if not _canonical_candidate_id(candidate_id):
                            errors.append(
                                f"semantic link set {identifier!r} excluded candidate "
                                f"ID {candidate_id!r} must be trimmed, control-free, "
                                "bounded and NFC-normalised"
                            )
                    unknown_candidates = sorted(
                        {
                            candidate_id
                            for candidate_id in candidate_ids
                            if isinstance(candidate_id, str)
                            and candidate_id not in eligible_candidate_ids
                        }
                    )
                    for candidate_id in unknown_candidates:
                        errors.append(
                            f"semantic link set {identifier!r} excluded candidate "
                            f"{candidate_id!r} is not in denominator "
                            f"{denominator_ref!r} candidate_ids"
                        )
                    duplicate_candidates = sorted(
                        {
                            candidate_id
                            for candidate_id in candidate_ids
                            if isinstance(candidate_id, str)
                            and candidate_id in seen_excluded_candidate_ids
                        }
                    )
                    for candidate_id in duplicate_candidates:
                        errors.append(
                            f"semantic link set {identifier!r} excluded candidate "
                            f"{candidate_id!r} occurs in more than one exclusion result"
                        )
                    seen_excluded_candidate_ids.update(
                        candidate_id
                        for candidate_id in candidate_ids
                        if isinstance(candidate_id, str)
                    )
            if reconciled_excluded_count != excluded:
                errors.append(
                    f"semantic link set {identifier!r} excluded_count must equal "
                    "the sum of its evidence-bearing exclusion_results"
                )

        eligible_candidate_ids = {
            candidate_id
            for candidate_id in denominator.get("candidate_ids", [])
            if isinstance(candidate_id, str)
        }
        coverage_outcomes = {
            "linked": set(outcome_ids.get("linked", [])),
            "unresolved": set(outcome_ids.get("unresolved", [])),
            "excluded": seen_excluded_candidate_ids,
            "conflicting": set(outcome_ids.get("conflicting", [])),
        }
        outcome_membership = Counter(
            candidate_id
            for candidate_ids in coverage_outcomes.values()
            for candidate_id in candidate_ids
        )
        for candidate_id, membership_count in sorted(outcome_membership.items()):
            if membership_count > 1:
                errors.append(
                    f"semantic link set {identifier!r} candidate {candidate_id!r} "
                    "occurs in more than one coverage outcome"
                )
        classified_candidate_ids = set(outcome_membership)
        for candidate_id in sorted(classified_candidate_ids - eligible_candidate_ids):
            errors.append(
                f"semantic link set {identifier!r} coverage candidate "
                f"{candidate_id!r} is not in denominator {denominator_ref!r}"
            )
        missing_candidate_ids = sorted(
            eligible_candidate_ids - classified_candidate_ids
        )
        if missing_candidate_ids:
            errors.append(
                f"semantic link set {identifier!r} does not classify denominator "
                "candidates exactly once: " + ", ".join(missing_candidate_ids)
            )

        assertions = result.get("link_assertions")
        assertion_ids: list[str] = []
        assertion_candidate_ids: set[str] = set()
        assertion_pairs: list[tuple[str, tuple[Any, ...] | str]] = []
        if isinstance(assertions, list):
            for assertion in assertions:
                if not isinstance(assertion, dict):
                    continue
                assertion_id = assertion.get("id")
                candidate_id = assertion.get("candidate_id")
                if isinstance(assertion_id, str):
                    assertion_ids.append(assertion_id)
                    if not _canonical_candidate_id(assertion_id):
                        errors.append(
                            f"semantic link set {identifier!r} assertion ID "
                            f"{assertion_id!r} must be trimmed, control-free, "
                            "bounded and NFC-normalised"
                        )
                if isinstance(candidate_id, str):
                    assertion_candidate_ids.add(candidate_id)
                    if not _canonical_candidate_id(candidate_id):
                        errors.append(
                            f"semantic link set {identifier!r} assertion candidate ID "
                            f"{candidate_id!r} must be trimmed, control-free, "
                            "bounded and NFC-normalised"
                        )
                    if candidate_id not in coverage_outcomes["linked"]:
                        errors.append(
                            f"semantic link set {identifier!r} assertion "
                            f"{assertion_id!r} belongs to non-linked candidate "
                            f"{candidate_id!r}"
                        )
                target_iri = assertion.get("target_iri")
                if isinstance(target_iri, str):
                    if not _iri_in_namespace(
                        target_iri, link_set.get("target_namespace")
                    ):
                        errors.append(
                            f"semantic link set {identifier!r} assertion "
                            f"{assertion_id!r} target_iri is outside its governed "
                            "target_namespace"
                        )
                    if isinstance(candidate_id, str):
                        assertion_pairs.append(
                            (
                                candidate_id,
                                _canonical_http_identity(target_iri) or target_iri,
                            )
                        )
                if mapping_relation == "identity":
                    assertion_evidence = [
                        evidence_by_id.get(evidence_ref)
                        for evidence_ref in assertion.get("evidence_refs", [])
                    ]
                    if not any(
                        _approval_grade_evidence(evidence)
                        and evidence.get("verification") == "independently-verified"
                        for evidence in assertion_evidence
                    ):
                        errors.append(
                            f"semantic link set {identifier!r} identity assertion "
                            f"{assertion_id!r} requires independently verified, "
                            "digest-bound evidence"
                        )
            duplicate_assertion_ids = sorted(
                assertion_id
                for assertion_id, count in Counter(assertion_ids).items()
                if count > 1
            )
            for assertion_id in duplicate_assertion_ids:
                errors.append(
                    f"semantic link set {identifier!r} repeats link assertion ID "
                    f"{assertion_id!r}"
                )
            duplicate_assertion_pairs = sorted(
                (
                    pair
                    for pair, count in Counter(assertion_pairs).items()
                    if count > 1
                ),
                key=repr,
            )
            for candidate_id, target_identity in duplicate_assertion_pairs:
                errors.append(
                    f"semantic link set {identifier!r} repeats the semantic "
                    f"assertion for candidate {candidate_id!r} and target "
                    f"{target_identity!r}"
                )
            if isinstance(linked_assertions, int) and linked_assertions != len(assertions):
                errors.append(
                    f"semantic link set {identifier!r} linked_assertion_count must "
                    "equal the number of link_assertions"
                )
            if assertion_candidate_ids != coverage_outcomes["linked"]:
                errors.append(
                    f"semantic link set {identifier!r} link_assertions must cover "
                    "every linked candidate and no other candidate"
                )
        if isinstance(linked_assertions, int):
            if linked_assertions < linked:
                errors.append(
                    f"semantic link set {identifier!r} linked_assertion_count must "
                    "be at least linked_count"
                )
            if (linked == 0) != (linked_assertions == 0):
                errors.append(
                    f"semantic link set {identifier!r} linked_count and "
                    "linked_assertion_count must either both be zero or both be "
                    "non-zero"
                )

        effective_denominator = eligible - excluded
        expected_percent = (
            Decimal("100.00")
            if effective_denominator == 0
            else (
                Decimal(linked) * Decimal(100) / Decimal(effective_denominator)
            ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        )
        try:
            actual_percent = Decimal(str(result.get("achieved_coverage_percent")))
        except InvalidOperation:
            actual_percent = Decimal("NaN")
        if actual_percent != expected_percent:
            errors.append(
                f"semantic link set {identifier!r} achieved_coverage_percent must "
                f"equal {expected_percent} for linked_count over eligible_count "
                "minus excluded_count"
            )

        dereference = result.get("dereference")
        if isinstance(dereference, dict):
            attempted = dereference.get("attempted_count")
            succeeded = dereference.get("succeeded_count")
            failed = dereference.get("failed_count")
            dereference_results = dereference.get("results")
            if all(isinstance(item, int) for item in (attempted, succeeded, failed)):
                if attempted != succeeded + failed:
                    errors.append(
                        f"semantic link set {identifier!r} dereference counts must "
                        "reconcile exactly: attempted_count = succeeded_count + "
                        "failed_count"
                    )
                if isinstance(linked_assertions, int) and attempted != linked_assertions:
                    errors.append(
                        f"semantic link set {identifier!r} must dereference every "
                        "linked assertion exactly once according to "
                        "linked_assertion_count"
                    )
                if isinstance(dereference_results, list):
                    result_refs = [
                        item.get("assertion_ref")
                        for item in dereference_results
                        if isinstance(item, dict)
                        and isinstance(item.get("assertion_ref"), str)
                    ]
                    for assertion_ref in result_refs:
                        if not _canonical_candidate_id(assertion_ref):
                            errors.append(
                                f"semantic link set {identifier!r} dereference "
                                f"assertion_ref {assertion_ref!r} must be trimmed, "
                                "control-free, bounded and NFC-normalised"
                            )
                    duplicate_result_refs = sorted(
                        assertion_ref
                        for assertion_ref, count in Counter(result_refs).items()
                        if count > 1
                    )
                    for assertion_ref in duplicate_result_refs:
                        errors.append(
                            f"semantic link set {identifier!r} repeats dereference "
                            f"result for assertion {assertion_ref!r}"
                        )
                    if set(result_refs) != set(assertion_ids):
                        errors.append(
                            f"semantic link set {identifier!r} dereference results "
                            "must identify every link assertion exactly once"
                        )
                    if attempted != len(dereference_results):
                        errors.append(
                            f"semantic link set {identifier!r} attempted_count must "
                            "equal the number of dereference results"
                        )
                    observed_succeeded = sum(
                        1
                        for item in dereference_results
                        if isinstance(item, dict)
                        and item.get("outcome") == "succeeded"
                    )
                    observed_failed = sum(
                        1
                        for item in dereference_results
                        if isinstance(item, dict)
                        and item.get("outcome") == "failed"
                    )
                    if succeeded != observed_succeeded or failed != observed_failed:
                        errors.append(
                            f"semantic link set {identifier!r} dereference success "
                            "and failure counts must equal their identity-bound "
                            "results"
                        )
                    for dereference_result in dereference_results:
                        if not isinstance(dereference_result, dict):
                            continue
                        terminal_kind = dereference_result.get("terminal_kind")
                        http_status = dereference_result.get("http_status")
                        expected_outcome = (
                            "succeeded"
                            if terminal_kind == "http-status"
                            and isinstance(http_status, int)
                            and 200 <= http_status < 400
                            else "failed"
                        )
                        if dereference_result.get("outcome") != expected_outcome:
                            errors.append(
                                f"semantic link set {identifier!r} dereference "
                                f"result {dereference_result.get('assertion_ref')!r} "
                                "outcome contradicts its machine-readable terminal "
                                "result"
                            )

        observed_at = _date_time(result.get("observed_at"))
        if approved:
            observation_evidence = [
                evidence_by_id.get(evidence_ref)
                for evidence_ref in result.get("evidence_refs", [])
            ]
            if observed_at is None or not any(
                _approval_grade_evidence(evidence)
                and _date_time(evidence.get("observed_at")) == observed_at
                and evidence.get("sha256") == expected_result_digest
                for evidence in observation_evidence
            ):
                errors.append(
                    f"approved profile semantic link set {identifier!r} must bind "
                    "the canonical coverage result digest and observed_at to "
                    "the same approval-grade evidence item"
                )
        freshness = result.get("freshness_policy")
        if (
            prepared_at is not None
            and observed_at is not None
            and isinstance(freshness, dict)
            and isinstance(freshness.get("maximum_age_days"), int)
        ):
            age = prepared_at - observed_at
            if age.total_seconds() < 0:
                errors.append(
                    f"semantic link set {identifier!r} coverage observed_at cannot "
                    "be later than profile prepared_at"
                )
            else:
                maximum_seconds = freshness["maximum_age_days"] * 86_400
                expected_status = (
                    "current"
                    if age.total_seconds() <= maximum_seconds
                    else "stale"
                )
                if result.get("freshness_status") != expected_status:
                    errors.append(
                        f"semantic link set {identifier!r} freshness_status must be "
                        f"{expected_status!r} under its profile-prepared-at policy"
                    )

        if (
            approved
            and result.get("freshness_status") == "stale"
            and isinstance(freshness, dict)
            and freshness.get("stale_result_action") == "fail-closed"
        ):
            errors.append(
                f"approved profile semantic link set {identifier!r} cannot use a "
                "stale coverage result under a fail-closed freshness policy"
            )

        minimum = denominator.get("minimum_coverage_percent")
        if (
            approved
            and isinstance(minimum, (int, float))
            and actual_percent.is_finite()
            and actual_percent < Decimal(str(minimum))
        ):
            errors.append(
                f"approved profile semantic link set {identifier!r} does not meet "
                f"its minimum coverage of {minimum}%"
            )

    return errors


def reference_errors(value: dict[str, Any]) -> list[str]:
    objects = walk_objects(value)
    ids = [item["id"] for item in objects if isinstance(item.get("id"), str)]
    counts = Counter(ids)
    errors = [
        f"id {identifier!r} is declared {count} times"
        for identifier, count in sorted(counts.items())
        if count > 1
    ]
    errors.extend(semantic_linking_errors(value))

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
