#!/usr/bin/env python3
"""Validate an external Evaluation Foundry promotion envelope and its bindings."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.parse import parse_qsl, urlencode, urljoin, urlsplit

from jsonschema import Draft202012Validator, FormatChecker

from check_evaluation_foundry import load_document, rendered_schema_errors
from observe_link_intents import (
    canonical_url,
    load_intent_universe,
    load_publication_link_universe,
    matching_protected_response_rule,
    validated_protected_response_rules,
)


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ENVELOPE = ROOT / "release-assurance" / "heritage-publication-envelope.json"
LINK_POLICY_PATH = ROOT / "release-assurance" / "link-observation-policy.json"
SCHEMA_PATH = (
    ROOT
    / "evaluation-foundry"
    / "schemas"
    / "okf-evaluation-promotion-envelope.v1.schema.json"
)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def safe_bound_path(root: Path, value: Any) -> Path | None:
    if not isinstance(value, str) or not value or "\\" in value:
        return None
    relative = Path(value)
    if relative.is_absolute() or ".." in relative.parts:
        return None
    candidate = (root / relative).resolve()
    return candidate if candidate.is_relative_to(root.resolve()) else None


def pending_locations(value: Any, location: str = "$") -> list[str]:
    if value == "pending":
        return [location]
    if isinstance(value, dict):
        return [
            child
            for key, item in value.items()
            for child in pending_locations(item, f"{location}.{key}")
        ]
    if isinstance(value, list):
        return [
            child
            for index, item in enumerate(value)
            for child in pending_locations(item, f"{location}[{index}]")
        ]
    return []


def parse_timestamp(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value.strip() or value != value.strip():
        return None
    if not (value.endswith("Z") or "+" in value[10:] or "-" in value[10:]):
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        return None
    return parsed.astimezone(timezone.utc)


def expected_subject_identity(envelope: dict[str, Any]) -> dict[str, Any]:
    subject = envelope["subject"]
    return {
        "repository": subject["repository"],
        "source_commit": subject["source_commit"],
        "candidate_tag": subject["tag"],
        "descriptor_sha256": subject["descriptor"]["sha256"],
        "release_root_sha256": subject["plane_roots"]["release_root_sha256"],
        "publication_manifest_sha256": subject["site_artifact"][
            "manifest_sha256"
        ],
        "site_tree_sha256": subject["site_artifact"]["tree_sha256"],
        "site_file_count": subject["site_artifact"]["file_count"],
    }


def http_url_identity(value: Any) -> tuple[str, str, int | None, str, str] | None:
    if not isinstance(value, str) or not value or value != value.strip():
        return None
    try:
        parsed = urlsplit(value)
        port = parsed.port
    except ValueError:
        return None
    scheme = parsed.scheme.casefold()
    if (
        scheme not in {"http", "https"}
        or parsed.hostname is None
        or parsed.username is not None
        or parsed.password is not None
    ):
        return None
    if (scheme, port) in {("http", 80), ("https", 443)}:
        port = None
    return (
        scheme,
        parsed.hostname.casefold(),
        port,
        parsed.path or "/",
        urlencode(sorted(parse_qsl(parsed.query, keep_blank_values=True))),
    )


def publication_journey(publication_root: Path) -> dict[str, Any]:
    journeys = load_document(publication_root / "journeys.json")
    matches = [
        journey
        for journey in journeys.get("journeys", [])
        if isinstance(journey, dict) and journey.get("id") == "journey-publication"
    ]
    if len(matches) != 1:
        raise RuntimeError("candidate must declare exactly one journey-publication")
    return matches[0]


def publication_site_context(publication_root: Path, envelope: dict[str, Any]) -> dict[str, Any]:
    manifest = load_document(publication_root / "publication-unit-manifest.json")
    pages_base_url = manifest.get("pages_base_url")
    if http_url_identity(pages_base_url) is None:
        raise RuntimeError("publication manifest has no valid pages_base_url")
    subject = envelope["subject"]
    descriptor_path = subject["descriptor"]["path"]
    plane_roots_path = subject["plane_roots"]["path"]
    materials = {
        item.get("path"): {
            "path": item.get("path"),
            "bytes": item.get("bytes"),
            "sha256": item.get("sha256"),
        }
        for item in manifest.get("materials", [])
        if isinstance(item, dict) and isinstance(item.get("path"), str)
    }
    return {
        "manifest": manifest,
        "pages_base_url": pages_base_url,
        "bundle_url": urljoin(pages_base_url, descriptor_path),
        "manifest_url": urljoin(pages_base_url, "publication-unit-manifest.json"),
        "plane_roots_url": urljoin(pages_base_url, plane_roots_path),
        "descriptor_material": materials.get(descriptor_path),
        "plane_roots_material": materials.get(plane_roots_path),
    }


def result_evidence_errors(
    evidence: Any,
    action: dict[str, Any],
    *,
    prefix: str,
    genuine_receipt: dict[str, Any] | None,
    genuine_receipt_sha256: str | None,
) -> list[str]:
    errors: list[str] = []
    if not isinstance(evidence, dict):
        return [f"{prefix} has no evidence object"]
    expected_channel = action.get("verification_channel", "live-browser")
    exact = {
        "verificationChannel": expected_channel,
        "requestedUrl": action.get("value"),
        "expectedText": action.get("expected_text"),
        "identityMatched": True,
        "expectedFinalUrl": action.get("expected_final_url", action.get("value")),
        "finalLocationMatched": True,
        "expectedFinalHash": action.get("expected_final_hash"),
        "finalHashMatched": (
            True if action.get("expected_final_hash") is not None else None
        ),
    }
    for field, value in exact.items():
        if evidence.get(field) != value:
            errors.append(f"{prefix}.{field} differs from the declared action")
    status = evidence.get("status")
    if (
        isinstance(status, bool)
        or not isinstance(status, int)
        or not 200 <= status <= 399
    ):
        errors.append(f"{prefix}.status is not a successful HTTP status")
    final_url = evidence.get("finalUrl")
    expected_final = action.get("expected_final_url", action.get("value"))
    if http_url_identity(final_url) != http_url_identity(expected_final):
        errors.append(f"{prefix}.finalUrl differs from the declared final URL")
    expected_hash = action.get("expected_final_hash")
    if expected_hash and isinstance(final_url, str):
        if urlsplit(final_url).fragment != str(expected_hash).removeprefix("#"):
            errors.append(f"{prefix}.finalUrl differs from the declared final hash")

    if expected_channel == "genuine-browser-receipt":
        if genuine_receipt is None or genuine_receipt_sha256 is None:
            errors.append(f"{prefix} cannot resolve the genuine-browser receipt")
            return errors
        matching = [
            record
            for record in genuine_receipt.get("records", [])
            if isinstance(record, dict)
            and record.get("requested_url") == action.get("value")
            and record.get("expected_text") == action.get("expected_text")
        ]
        if len(matching) != 1:
            errors.append(f"{prefix} has no unique genuine-browser record")
            return errors
        record = matching[0]
        browser = genuine_receipt.get("browser", {})
        protected_exact = {
            "receipt": action.get("receipt"),
            "receiptSha256": genuine_receipt_sha256,
            "receiptObservedAt": genuine_receipt.get("observed_at"),
            "recordObservedAt": record.get("observed_at"),
            "title": record.get("title"),
            "identitySource": record.get("identity_source"),
            "identityExcerpt": record.get("identity_excerpt"),
            "browser": {
                "channel": browser.get("channel"),
                "userAgent": browser.get("user_agent"),
                "webdriver": browser.get("webdriver"),
            },
        }
        for field, value in protected_exact.items():
            if evidence.get(field) != value:
                errors.append(f"{prefix}.{field} differs from protected evidence")
    return errors


def raw_journey_result_errors(
    result: dict[str, Any],
    engine_row: dict[str, Any],
    envelope: dict[str, Any],
    *,
    publication_root: Path,
    validation_receipt_sha256: str | None,
    genuine_receipt: dict[str, Any] | None,
    genuine_receipt_sha256: str | None,
) -> list[str]:
    errors: list[str] = []
    engine = engine_row.get("engine")
    prefix = f"journey engine {engine!r} raw result"
    try:
        journey = publication_journey(publication_root)
        site = publication_site_context(publication_root, envelope)
    except (OSError, ValueError, RuntimeError) as error:
        return [f"{prefix} cannot load candidate journey identity: {error}"]
    expected = expected_subject_identity(envelope)
    bundle_url = site["bundle_url"]
    generated_at = result.get("generated_at")
    if parse_timestamp(generated_at) is None or generated_at != engine_row.get(
        "observed_at"
    ):
        errors.append(f"{prefix} generated_at differs from its receipt row")
    if result.get("schema") != "okf-explorer-evaluation-results.v1":
        errors.append(f"{prefix} has an unsupported schema")
    if result.get("bundle") != bundle_url:
        errors.append(f"{prefix} bundle differs from the exact public candidate URL")
    metadata = result.get("metadata")
    if not isinstance(metadata, dict) or any(
        metadata.get(field) != value
        for field, value in (
            ("browser_engine", engine),
            ("browser", "playwright"),
            ("mode", "browser-scored"),
            ("candidate_bundle_url", bundle_url),
        )
    ):
        errors.append(f"{prefix} metadata differs from the required browser candidate")

    candidate = result.get("candidate")
    if not isinstance(candidate, dict):
        errors.append(f"{prefix} has no candidate identity")
    else:
        for field, value in (
            ("bundle_url", bundle_url),
            ("descriptor_sha256", expected["descriptor_sha256"]),
        ):
            if candidate.get(field) != value:
                errors.append(f"{prefix} candidate.{field} differs")
        release = candidate.get("release_root")
        release_expected = {
            "plane_roots_url": site["plane_roots_url"],
            "plane_roots_sha256": envelope["subject"]["plane_roots"]["sha256"],
            "release_root_sha256": expected["release_root_sha256"],
        }
        if not isinstance(release, dict) or any(
            release.get(field) != value for field, value in release_expected.items()
        ):
            errors.append(f"{prefix} release-root identity differs")
        artifact = candidate.get("site_artifact")
        artifact_expected = {
            "manifest_url": site["manifest_url"],
            "publication_manifest_sha256": expected[
                "publication_manifest_sha256"
            ],
            "tree_sha256": expected["site_tree_sha256"],
            "file_count": expected["site_file_count"],
            "materials": {
                "descriptor": site["descriptor_material"],
                "plane_roots": site["plane_roots_material"],
            },
        }
        if artifact != artifact_expected:
            errors.append(f"{prefix} publication Site artifact identity differs")
        candidate_receipt = candidate.get("candidate_receipt")
        candidate_receipt_expected = {
            "schema": "okf-publication-validation-receipt.v1",
            "raw_sha256": validation_receipt_sha256,
            "expected_descriptor_sha256": expected["descriptor_sha256"],
            "expected_release_root_sha256": expected["release_root_sha256"],
            "expected_publication_manifest_sha256": expected[
                "publication_manifest_sha256"
            ],
            "expected_site_tree_sha256": expected["site_tree_sha256"],
            "expected_site_file_count": expected["site_file_count"],
        }
        if not isinstance(candidate_receipt, dict) or any(
            candidate_receipt.get(field) != value
            for field, value in candidate_receipt_expected.items()
        ):
            errors.append(f"{prefix} validation-receipt identity differs")

    interaction = result.get("interaction_journeys")
    if not isinstance(interaction, dict):
        return [*errors, f"{prefix} has no interaction_journeys"]
    if interaction.get("target_bundle") != bundle_url:
        errors.append(f"{prefix} target bundle differs")
    expected_summary = {
        "journeys_run": 1,
        "passed": 1,
        "failed": 0,
        "errors": 0,
        "validation_only": 0,
    }
    if interaction.get("summary") != expected_summary:
        errors.append(f"{prefix} summary is not one complete passing journey")
    records = interaction.get("records")
    if not isinstance(records, list) or len(records) != 1 or not isinstance(
        records[0], dict
    ):
        return [*errors, f"{prefix} does not contain exactly one journey record"]
    record = records[0]
    for field in ("id", "title", "persona_ids", "story_ids"):
        if record.get(field) != journey.get(field):
            errors.append(f"{prefix} record.{field} differs from journeys.json")
    if record.get("status") != "passed":
        errors.append(f"{prefix} journey status is not passed")
    start_url = record.get("start_url")
    start_identity = http_url_identity(start_url)
    base_identity = http_url_identity(result.get("base_url"))
    if start_identity is None or base_identity is None or start_identity[:4] != base_identity[:4]:
        errors.append(f"{prefix} start URL differs from the evaluated Explorer")
    else:
        start_query = dict(parse_qsl(urlsplit(str(start_url)).query, keep_blank_values=True))
        if start_query != {"bundle": bundle_url}:
            errors.append(f"{prefix} start URL does not bind only the candidate bundle")

    declared_actions = journey.get("actions")
    actions = record.get("actions")
    if not isinstance(declared_actions, list) or not isinstance(actions, list) or len(
        actions
    ) != len(declared_actions):
        errors.append(f"{prefix} action list differs from journeys.json")
    else:
        for index, (declared, actual) in enumerate(zip(declared_actions, actions)):
            action_prefix = f"{prefix} action {index + 1}"
            if not isinstance(declared, dict) or not isinstance(actual, dict):
                errors.append(f"{action_prefix} is not an object")
                continue
            if actual.get("action") != declared.get("action") or actual.get(
                "passed"
            ) is not True:
                errors.append(f"{action_prefix} name or result differs")
            if declared.get("action") == "verify_url":
                errors.extend(
                    result_evidence_errors(
                        actual.get("evidence"),
                        declared,
                        prefix=action_prefix,
                        genuine_receipt=genuine_receipt,
                        genuine_receipt_sha256=genuine_receipt_sha256,
                    )
                )

    declared_assertions = journey.get("assertions")
    assertions = record.get("assertions")
    if not isinstance(declared_assertions, list) or not isinstance(
        assertions, list
    ) or len(assertions) != len(declared_assertions):
        errors.append(f"{prefix} assertion list differs from journeys.json")
    else:
        for index, (declared, actual) in enumerate(
            zip(declared_assertions, assertions)
        ):
            if not isinstance(declared, dict) or not isinstance(actual, dict):
                errors.append(f"{prefix} assertion {index + 1} is not an object")
                continue
            if (
                actual.get("assertion") != declared.get("assertion")
                or actual.get("passed") is not True
                or actual.get("expected") != declared.get("value")
            ):
                errors.append(
                    f"{prefix} assertion {index + 1} differs from journeys.json"
                )
    return errors


def receipt_semantic_errors(
    label: str,
    receipt: dict[str, Any],
    envelope: dict[str, Any],
    *,
    publication_root: Path | None,
    repository_root: Path | None = None,
    promoted_at: datetime,
    link_policy: dict[str, Any],
    resolved_by_schema: dict[str, tuple[dict[str, Any], str]] | None = None,
) -> list[str]:
    errors: list[str] = []
    schema = receipt.get("schema")
    observed_at = parse_timestamp(receipt.get("observed_at"))
    if observed_at is None:
        errors.append(f"receipt {label} has no valid observed_at")
        return errors
    if observed_at > promoted_at + timedelta(minutes=5):
        errors.append(f"receipt {label} was observed after promotion")
    expected = expected_subject_identity(envelope)

    try:
        protected_response_rules = validated_protected_response_rules(link_policy)
    except RuntimeError as error:
        errors.append(f"link-observation policy is invalid: {error}")
        return errors

    if schema == "okf-publication-validation-receipt.v1":
        if receipt.get("status") != "passed":
            errors.append("validation receipt status is not passed")
        subject = receipt.get("subject")
        if not isinstance(subject, dict):
            errors.append("validation receipt has no subject")
        else:
            for field, value in expected.items():
                if subject.get(field) != value:
                    errors.append(
                        f"validation receipt subject.{field} differs from the envelope"
                    )
            if publication_root is not None:
                manifest_path = (
                    publication_root
                    / "data"
                    / "link-validation"
                    / "manifest.json"
                )
                if (
                    not manifest_path.is_file()
                    or (
                        manifest_path.is_file()
                        and subject.get("link_manifest_sha256")
                        != sha256_file(manifest_path)
                    )
                ):
                    errors.append(
                        "validation receipt does not bind the candidate link manifest"
                    )
                if manifest_path.is_file():
                    expected_subject = {
                        **expected,
                        "link_manifest_sha256": sha256_file(manifest_path),
                    }
                    if subject != expected_subject:
                        errors.append(
                            "validation receipt subject is not the exact candidate identity"
                        )
        candidate = receipt.get("candidate")
        if candidate != {
            "heritage_descriptor_sha256": expected["descriptor_sha256"],
            "heritage_release_root_sha256": expected["release_root_sha256"],
        }:
            errors.append("validation receipt candidate aliases differ")
        required_checks = {
            "publication_tree_exact": "passed",
            "plane_roots_recomputed": "passed",
            "link_manifest_bound": "passed",
        }
        if receipt.get("checks") != required_checks:
            errors.append("validation receipt does not contain the exact passing checks")
        return errors

    if schema == "okf-publication-journey-receipt.v1":
        if receipt.get("status") != "passed":
            errors.append("journey receipt status is not passed")
        if publication_root is None or repository_root is None:
            errors.append("journey receipt needs publication and repository roots")
            return errors
        manifest_path = publication_root / "data/link-validation/manifest.json"
        if not manifest_path.is_file():
            errors.append("journey receipt cannot resolve the candidate link manifest")
            return errors
        expected_subject = {
            **expected,
            "link_manifest_sha256": sha256_file(manifest_path),
        }
        if receipt.get("subject") != expected_subject:
            errors.append("journey receipt subject differs from the exact candidate")
        try:
            journey = publication_journey(publication_root)
        except (OSError, ValueError, RuntimeError) as error:
            errors.append(f"journey receipt cannot resolve journeys.json: {error}")
            return errors
        actions = journey.get("actions")
        expected_action_count = len(actions) if isinstance(actions, list) else -1
        if (
            receipt.get("journey_id") != "journey-publication"
            or receipt.get("expected_action_count") != expected_action_count
        ):
            errors.append("journey receipt does not cover every publication action")
        assurance_commit = receipt.get("assurance_source_commit")
        if (
            not isinstance(assurance_commit, str)
            or len(assurance_commit) != 40
            or any(character not in "0123456789abcdef" for character in assurance_commit)
        ):
            errors.append("journey receipt assurance_source_commit is not a Git SHA")
        engines = receipt.get("engines")
        required_engines = ["chromium", "firefox", "webkit"]
        if (
            not isinstance(engines, list)
            or [
                item.get("engine") if isinstance(item, dict) else None
                for item in engines
            ]
            != required_engines
        ):
            errors.append("journey receipt does not cover the required three engines")
        else:
            genuine = (resolved_by_schema or {}).get(
                "okf-genuine-browser-link-receipt.v1"
            )
            engine_observations: list[datetime] = []
            for item in engines:
                if (
                    item.get("status") != "passed"
                    or item.get("actions_passed") != expected_action_count
                    or not isinstance(item.get("assertions_passed"), int)
                    or item.get("assertions_passed")
                    != len(journey.get("assertions", []))
                ):
                    errors.append(
                        f"journey engine {item.get('engine')!r} did not fully pass"
                    )
                engine_observed_at = parse_timestamp(item.get("observed_at"))
                if engine_observed_at is None:
                    errors.append(
                        f"journey engine {item.get('engine')!r} has no valid observed_at"
                    )
                else:
                    engine_observations.append(engine_observed_at)
                    if engine_observed_at > promoted_at + timedelta(minutes=5):
                        errors.append(
                            f"journey engine {item.get('engine')!r} was observed after promotion"
                        )
                engine = item.get("engine")
                expected_ref = f"evidence/journey-{engine}-results.json"
                if item.get("result_ref") != expected_ref:
                    errors.append(
                        f"journey engine {engine!r} does not use {expected_ref}"
                    )
                    continue
                target = safe_bound_path(repository_root, item.get("result_ref"))
                if target is None or not target.is_file():
                    errors.append(
                        f"journey engine {engine!r} raw result cannot be resolved"
                    )
                    continue
                result_sha256 = sha256_file(target)
                if item.get("result_sha256") != result_sha256:
                    errors.append(
                        f"journey engine {engine!r} raw result SHA-256 differs"
                    )
                    continue
                try:
                    raw_result = load_document(target)
                except ValueError as error:
                    errors.append(str(error))
                    continue
                errors.extend(
                    raw_journey_result_errors(
                        raw_result,
                        item,
                        envelope,
                        publication_root=publication_root,
                        validation_receipt_sha256=envelope["receipts"]["validation"].get(
                            "sha256"
                        ),
                        genuine_receipt=(genuine[0] if genuine else None),
                        genuine_receipt_sha256=(genuine[1] if genuine else None),
                    )
                )
            if not engine_observations or max(engine_observations) != observed_at:
                errors.append(
                    "journey receipt observed_at is not the latest engine result time"
                )
        return errors

    if schema in {
        "okf-link-observation-receipt.v1",
        "okf-publication-link-closure-receipt.v1",
    }:
        if publication_root is None:
            errors.append("bulk link receipt needs a publication root")
            return errors
        if receipt.get("complete_manifest_coverage") is not True:
            errors.append("bulk link receipt is not complete-manifest coverage")
        if schema == "okf-publication-link-closure-receipt.v1":
            try:
                universe = load_publication_link_universe(publication_root)
            except (OSError, ValueError, RuntimeError, json.JSONDecodeError) as error:
                errors.append(f"cannot reconstruct exact publication link closure: {error}")
                return errors
            expected_shards = universe["selected_shards"]
            if (
                receipt.get("coverage") != universe["coverage"]
                or receipt.get("selected_shards") != expected_shards
                or receipt.get("manifest_shard_count") != len(expected_shards)
            ):
                errors.append(
                    "bulk link receipt does not bind the exact rendered-anchor and "
                    "three-manifest closure"
                )
            expected_shard_count = len(expected_shards)
        else:
            manifest_path = (
                publication_root / "data" / "link-validation" / "manifest.json"
            )
            if (
                not manifest_path.is_file()
                or receipt.get("candidate_manifest_sha256")
                != sha256_file(manifest_path)
            ):
                errors.append("bulk link receipt does not bind the candidate manifest")
            try:
                universe = load_intent_universe(manifest_path)
            except (OSError, ValueError, RuntimeError, json.JSONDecodeError) as error:
                errors.append(f"cannot reconstruct exact link-intent universe: {error}")
                return errors
            shards = universe["shards"]
            expected_buckets = [item["bucket"] for item in shards]
            if receipt.get("selected_buckets") != expected_buckets or receipt.get(
                "manifest_shard_count"
            ) != len(expected_buckets):
                errors.append("bulk link receipt does not cover each exact shard once")
            expected_shard_count = len(expected_buckets)
        policy_path = publication_root / "release-assurance/link-observation-policy.json"
        if not policy_path.is_file():
            policy_path = LINK_POLICY_PATH
        if receipt.get("policy_sha256") != sha256_file(policy_path):
            errors.append("bulk link receipt does not bind the exact observation policy")
        expected_cycle = (
            expected_shard_count + int(link_policy["shards_per_nightly_run"]) - 1
        ) // int(link_policy["shards_per_nightly_run"])
        if receipt.get("rotation_cycle_days") != expected_cycle:
            errors.append("bulk link receipt rotation cycle differs from policy")

        intents = universe["intents"]
        expected_bulk = {
            url: projection
            for url, projection in intents.items()
            if projection["risk"] != "protected-rich-page"
        }
        expected_delegated = {
            url: projection
            for url, projection in intents.items()
            if projection["risk"] == "protected-rich-page"
        }
        records = receipt.get("records")
        delegated = receipt.get("delegated")
        if not isinstance(records, list):
            errors.append("bulk link receipt records is not an array")
            records = []
        if not isinstance(delegated, list):
            errors.append("bulk link receipt delegated is not an array")
            delegated = []
        record_urls = [
            record.get("url") if isinstance(record, dict) else None
            for record in records
        ]
        delegated_urls = [
            record.get("url") if isinstance(record, dict) else None
            for record in delegated
        ]
        if record_urls != sorted(expected_bulk):
            errors.append("bulk link records are not the exact canonical bulk URL set")
        if delegated_urls != sorted(expected_delegated):
            errors.append("delegated links are not the exact canonical protected URL set")
        comparable_urls = [
            value if isinstance(value, str) else repr(value)
            for value in record_urls + delegated_urls
        ]
        if len(set(comparable_urls)) != len(comparable_urls):
            errors.append("bulk/delegated link sets overlap or contain duplicates")

        for index, record in enumerate(records):
            if not isinstance(record, dict):
                errors.append(f"bulk link record {index} is not an object")
                continue
            url = record.get("url")
            projection = expected_bulk.get(url) if isinstance(url, str) else None
            if projection is None:
                continue
            for field in (
                "kind",
                "risk",
                "identity_expectation",
                "intent_sha256",
            ):
                if record.get(field) != projection[field]:
                    errors.append(
                        f"bulk link record {index}.{field} differs from its intent"
                    )
            try:
                if canonical_url(str(url)) != url:
                    errors.append(f"bulk link record {index} URL is not canonical")
            except ValueError:
                errors.append(f"bulk link record {index} URL is invalid")
            http_status = record.get("http_status")
            record_observed_at = parse_timestamp(record.get("observed_at"))
            expires_at = parse_timestamp(record.get("expires_at"))
            freshness = int(link_policy["freshness_days"][projection["risk"]])
            expected_expiry = observed_at + timedelta(days=freshness)
            status = record.get("status")
            protected_rule = matching_protected_response_rule(
                link_policy,
                url=str(url),
                risk=str(projection["risk"]),
                http_status=http_status,
                validated_rules=protected_response_rules,
            )
            if status == "reachable":
                response_accepted = (
                    not isinstance(http_status, bool)
                    and isinstance(http_status, int)
                    and 200 <= http_status <= 399
                    and "validation_basis" not in record
                )
            elif status == "protected-origin":
                final_host = (
                    urlsplit(str(record.get("final_url"))).hostname
                    if isinstance(record.get("final_url"), str)
                    else None
                )
                response_accepted = (
                    protected_rule is not None
                    and record.get("validation_basis")
                    == protected_rule["validation_basis"]
                    and final_host is not None
                    and final_host.casefold() == protected_rule["host"]
                )
            else:
                response_accepted = False
            if not response_accepted or record.get("engine") != "python-urllib":
                errors.append(f"bulk link record {index} did not pass")
            if record_observed_at != observed_at:
                errors.append(f"bulk link record {index} observation time differs")
            if expires_at != expected_expiry or expected_expiry < promoted_at:
                errors.append(f"bulk link record {index} is stale or has wrong expiry")
            if http_url_identity(record.get("final_url")) is None:
                errors.append(f"bulk link record {index} final URL is invalid")

        for index, record in enumerate(delegated):
            if not isinstance(record, dict):
                errors.append(f"delegated link record {index} is not an object")
                continue
            record_url = record.get("url")
            projection = (
                expected_delegated.get(record_url)
                if isinstance(record_url, str)
                else None
            )
            if projection is None:
                continue
            for field in ("risk", "identity_expectation", "intent_sha256"):
                if record.get(field) != projection[field]:
                    errors.append(
                        f"delegated link record {index}.{field} differs from its intent"
                    )
            if record.get("channel") != link_policy["protected_browser_channel"]:
                errors.append(f"delegated link record {index} has the wrong channel")
            expiry = parse_timestamp(record.get("expires_at"))
            expected_expiry = observed_at + timedelta(
                days=int(link_policy["freshness_days"]["protected-rich-page"])
            )
            if expiry != expected_expiry or expected_expiry < promoted_at:
                errors.append(f"delegated link record {index} has wrong expiry")
        return errors

    if schema == "okf-genuine-browser-link-receipt.v1":
        browser = receipt.get("browser")
        if (
            not isinstance(browser, dict)
            or browser.get("webdriver") is not False
            or browser.get("channel") != link_policy["protected_browser_channel"]
            or not isinstance(browser.get("user_agent"), str)
            or not browser.get("user_agent", "").strip()
            or not isinstance(browser.get("languages"), list)
            or not browser.get("languages")
        ):
            errors.append(
                "genuine-browser receipt requires the policy channel and a real browser identity"
            )
        if observed_at + timedelta(
            days=int(link_policy["freshness_days"]["protected-rich-page"])
        ) < promoted_at:
            errors.append("genuine-browser receipt is stale at promotion")
        if publication_root is None:
            errors.append("genuine-browser receipt needs a publication root")
            return errors
        try:
            journey = publication_journey(publication_root)
        except (OSError, ValueError, RuntimeError) as error:
            errors.append(f"cannot resolve protected journey actions: {error}")
            return errors
        protected = [
            action
            for action in journey.get("actions", [])
            if isinstance(action, dict)
            and action.get("action") == "verify_url"
            and action.get("verification_channel") == "genuine-browser-receipt"
        ]
        sequences = [action.get("sequence") for action in protected]
        if len(sequences) != len(set(sequences)):
            errors.append("protected journey action sequences are not unique")
        scope = receipt.get("scope")
        if not isinstance(scope, dict) or scope.get(
            "journey_id"
        ) != "journey-publication" or scope.get("sequences") != sequences:
            errors.append("genuine-browser receipt scope differs from protected actions")
        records = receipt.get("records")
        if not isinstance(records, list) or len(records) != len(protected):
            errors.append(
                "genuine-browser receipt does not have one record per protected action"
            )
            return errors
        identity_keys: set[tuple[Any, Any]] = set()
        requested_urls: set[Any] = set()
        previous: datetime | None = None
        for index, (record, action) in enumerate(zip(records, protected)):
            if not isinstance(record, dict):
                errors.append(f"genuine-browser record {index} is not an object")
                continue
            requested_url = record.get("requested_url")
            record_expected_text = record.get("expected_text")
            key = (repr(requested_url), repr(record_expected_text))
            expected_key = (action.get("value"), action.get("expected_text"))
            if (requested_url, record_expected_text) != expected_key:
                errors.append(
                    f"genuine-browser record {index} is not ordered with its exact action"
                )
            requested_key = repr(requested_url)
            if key in identity_keys or requested_key in requested_urls:
                errors.append(f"genuine-browser record {index} is duplicated")
            identity_keys.add(key)
            requested_urls.add(requested_key)
            record_at = parse_timestamp(record.get("observed_at"))
            if record_at is None:
                errors.append(f"genuine-browser record {index} has no valid observed_at")
            else:
                if previous is not None and record_at < previous:
                    errors.append("genuine-browser records are not timestamp ordered")
                if record_at > observed_at:
                    errors.append(
                        f"genuine-browser record {index} is later than its receipt"
                    )
                previous = record_at
            expected_final = action.get("expected_final_url", action.get("value"))
            final_url = record.get("final_url")
            expected_hash = action.get("expected_final_hash")
            status = record.get("response_status")
            excerpt = record.get("identity_excerpt")
            expected_text = action.get("expected_text")
            if (
                record.get("identity_matched") is not True
                or record.get("identity_source") != "document.body.innerText"
                or not isinstance(record.get("title"), str)
                or not record.get("title", "").strip()
                or not isinstance(excerpt, str)
                or not isinstance(expected_text, str)
                or expected_text.casefold() not in excerpt.casefold()
                or isinstance(status, bool)
                or not isinstance(status, int)
                or not 200 <= status <= 399
            ):
                errors.append(f"genuine-browser record {index} did not pass")
            if http_url_identity(final_url) != http_url_identity(expected_final):
                errors.append(
                    f"genuine-browser record {index} final URL differs from its action"
                )
            if expected_hash and isinstance(final_url, str):
                if urlsplit(final_url).fragment != str(expected_hash).removeprefix("#"):
                    errors.append(
                        f"genuine-browser record {index} final hash differs from its action"
                    )
        if previous != observed_at:
            errors.append(
                "genuine-browser receipt observed_at is not the latest record time"
            )
        return errors

    errors.append(f"receipt {label} has unsupported schema {schema!r}")
    return errors


def validate_envelope(
    envelope: dict[str, Any],
    *,
    envelope_path: Path,
    repository_root: Path,
    publication_root: Path | None = None,
    require_promoted: bool = False,
) -> list[str]:
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    Draft202012Validator.check_schema(schema)
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    errors = rendered_schema_errors("promotion envelope", envelope, validator)
    if errors:
        return errors

    if publication_root is not None:
        candidate_root = publication_root.resolve()
        resolved_envelope = envelope_path.resolve()
        if resolved_envelope.is_relative_to(candidate_root):
            errors.append(
                "promotion envelope must remain outside the publication candidate/Site root"
            )
        subject = envelope["subject"]
        bindings = [
            subject["descriptor"],
            *subject["bundles"],
            subject["plane_roots"],
            subject["build_manifest"],
        ]
        for binding in bindings:
            target = safe_bound_path(candidate_root, binding.get("path"))
            if target is None:
                errors.append(f"unsafe candidate binding path {binding.get('path')!r}")
                continue
            expected = binding.get("sha256")
            if not target.is_file():
                if expected != "pending" or require_promoted:
                    errors.append(f"bound candidate file does not exist: {binding.get('path')}")
                continue
            if expected != "pending":
                observed = sha256_file(target)
                if observed != expected:
                    errors.append(
                        f"candidate digest mismatch for {binding.get('path')}: "
                        f"expected {expected}, observed {observed}"
                    )

        plane_path = safe_bound_path(candidate_root, subject["plane_roots"]["path"])
        if plane_path is not None and plane_path.is_file():
            try:
                plane_receipt = load_document(plane_path)
            except ValueError as error:
                errors.append(str(error))
            else:
                expected_root = subject["plane_roots"]["release_root_sha256"]
                if (
                    expected_root != "pending"
                    and plane_receipt.get("release_root_sha256") != expected_root
                ):
                    errors.append(
                        "plane_roots.release_root_sha256 does not match the bound receipt"
                    )

        site = subject["site_artifact"]
        site_manifest = safe_bound_path(candidate_root, site["manifest_path"])
        if site_manifest is None or not site_manifest.is_file():
            if require_promoted:
                errors.append("publication-unit-manifest.json is absent from the candidate")
        else:
            manifest_sha256 = sha256_file(site_manifest)
            if (
                site["manifest_sha256"] != "pending"
                and site["manifest_sha256"] != manifest_sha256
            ):
                errors.append(
                    "site_artifact.manifest_sha256 does not match publication-unit-manifest.json"
                )
            try:
                manifest = load_document(site_manifest)
            except ValueError as error:
                errors.append(str(error))
            else:
                for field in ("tree_sha256", "file_count"):
                    expected = site[field]
                    if expected != "pending" and manifest.get(field) != expected:
                        errors.append(
                            f"site_artifact.{field} does not match publication-unit-manifest.json"
                        )

    resolved_receipts: list[tuple[str, dict[str, Any]]] = []
    for receipt_kind, receipt in (
        ("validation", envelope["receipts"]["validation"]),
        ("journey", envelope["receipts"]["journey"]),
        *(
            (f"link_observations[{index}]", item)
            for index, item in enumerate(envelope["receipts"]["link_observations"])
        ),
    ):
        reference = receipt.get("ref")
        digest = receipt.get("sha256")
        target = safe_bound_path(repository_root, reference)
        if target is None or not target.is_file():
            if digest != "pending" or require_promoted:
                errors.append(f"receipt {receipt_kind} cannot be resolved: {reference!r}")
        elif digest != "pending" and sha256_file(target) != digest:
            errors.append(f"receipt {receipt_kind} SHA-256 does not match {reference!r}")
        elif target is not None and target.is_file():
            try:
                document = load_document(target)
            except ValueError as error:
                errors.append(str(error))
            else:
                resolved_receipts.append((receipt_kind, document))
                if receipt.get("observed_at") != document.get("observed_at"):
                    errors.append(
                        f"receipt {receipt_kind} binding observed_at differs from its document"
                    )

    if require_promoted:
        if envelope.get("state") != "promoted":
            errors.append("terminal promotion requires state='promoted'")
        subject = envelope.get("subject", {})
        repository = subject.get("repository")
        tag = subject.get("tag")
        expected_release_url = (
            f"https://github.com/{repository}/releases/tag/{tag}"
            if isinstance(repository, str) and isinstance(tag, str)
            else None
        )
        if subject.get("release_url") != expected_release_url:
            errors.append(
                "terminal promotion release_url must bind subject.repository and subject.tag"
            )
        container = envelope.get("promotion_container", {})
        promotion_tag = container.get("tag")
        expected_container_url = (
            f"https://github.com/{repository}/releases/tag/{promotion_tag}"
            if isinstance(repository, str) and isinstance(promotion_tag, str)
            else None
        )
        if container.get("repository") != repository:
            errors.append("promotion container repository differs from the subject")
        if promotion_tag == tag:
            errors.append("promotion container tag must differ from candidate tag")
        if container.get("release_url") != expected_container_url:
            errors.append(
                "promotion container release_url must bind its repository and tag"
            )
        promoted_at = parse_timestamp(envelope.get("promoted_at"))
        if promoted_at is None:
            errors.append("terminal promotion requires a valid promoted_at timestamp")
        else:
            policy_path = (
                publication_root / "release-assurance/link-observation-policy.json"
                if publication_root is not None
                and (
                    publication_root
                    / "release-assurance/link-observation-policy.json"
                ).is_file()
                else LINK_POLICY_PATH
            )
            try:
                link_policy = json.loads(policy_path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError) as error:
                errors.append(f"cannot load link-observation policy: {error}")
            else:
                schema_entries: dict[str, list[tuple[dict[str, Any], str]]] = {}
                for receipt_kind, document in resolved_receipts:
                    binding = (
                        envelope["receipts"][receipt_kind]
                        if receipt_kind in {"validation", "journey"}
                        else envelope["receipts"]["link_observations"][
                            int(receipt_kind.removeprefix("link_observations[").removesuffix("]"))
                        ]
                    )
                    schema_entries.setdefault(str(document.get("schema")), []).append(
                        (document, str(binding.get("sha256")))
                    )
                resolved_by_schema = {
                    schema: entries[0]
                    for schema, entries in schema_entries.items()
                    if len(entries) == 1
                }
                for label, document in resolved_receipts:
                    errors.extend(
                        receipt_semantic_errors(
                            label,
                            document,
                            envelope,
                            publication_root=publication_root,
                            repository_root=repository_root,
                            promoted_at=promoted_at,
                            link_policy=link_policy,
                            resolved_by_schema=resolved_by_schema,
                        )
                    )
                schemas = [document.get("schema") for _, document in resolved_receipts]
                for required_schema in (
                    "okf-publication-validation-receipt.v1",
                    "okf-publication-journey-receipt.v1",
                    "okf-publication-link-closure-receipt.v1",
                    "okf-genuine-browser-link-receipt.v1",
                ):
                    if schemas.count(required_schema) != 1:
                        errors.append(
                            "terminal receipt closure requires exactly one "
                            f"{required_schema}"
                        )

                if publication_root is not None:
                    journeys_path = publication_root / "journeys.json"
                    if journeys_path.is_file():
                        try:
                            journeys = load_document(journeys_path)
                        except ValueError as error:
                            errors.append(str(error))
                        else:
                            expected_rich = {
                                (
                                    action.get("value"),
                                    action.get("expected_text"),
                                )
                                for journey in journeys.get("journeys", [])
                                if isinstance(journey, dict)
                                for action in journey.get("actions", [])
                                if isinstance(action, dict)
                                and action.get("verification_channel")
                                == "genuine-browser-receipt"
                            }
                            genuine = next(
                                (
                                    document
                                    for _, document in resolved_receipts
                                    if document.get("schema")
                                    == "okf-genuine-browser-link-receipt.v1"
                                ),
                                None,
                            )
                            actual_rich = (
                                {
                                    (
                                        record.get("requested_url"),
                                        record.get("expected_text"),
                                    )
                                    for record in genuine.get("records", [])
                                    if isinstance(record, dict)
                                }
                                if isinstance(genuine, dict)
                                else set()
                            )
                            if actual_rich != expected_rich:
                                errors.append(
                                    "genuine-browser receipt does not exactly cover the "
                                    "declared protected rich pages"
                                )
        for location in pending_locations(envelope):
            errors.append(f"terminal promotion cannot contain pending value at {location}")
    return errors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("envelope", nargs="?", type=Path, default=DEFAULT_ENVELOPE)
    parser.add_argument("--repository-root", type=Path, default=ROOT)
    parser.add_argument("--publication-root", type=Path)
    parser.add_argument("--require-promoted", action="store_true")
    args = parser.parse_args(argv)
    try:
        envelope_path = args.envelope.resolve()
        envelope = load_document(envelope_path)
        errors = validate_envelope(
            envelope,
            envelope_path=envelope_path,
            repository_root=args.repository_root.resolve(),
            publication_root=(
                args.publication_root.resolve() if args.publication_root else None
            ),
            require_promoted=args.require_promoted,
        )
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"promotion envelope validation failed: {error}", file=sys.stderr)
        return 1
    if errors:
        print("promotion envelope validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    phase = "terminal" if args.require_promoted else "draft"
    print(f"promotion envelope validation passed ({phase} policy)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
