#!/usr/bin/env python3
"""Strict producer helpers for the additive Explore OKF v1 profile."""

from __future__ import annotations

import json
import re
from typing import Any
from urllib.parse import quote, unquote, urlsplit

try:
    from .okf_semantic import SemanticError, schema_errors
except ImportError:  # Direct script-path imports used by repository tooling.
    from okf_semantic import SemanticError, schema_errors

EXPLORE_OKF_PROFILE_URL = (
    "https://chris-page-gov.github.io/okf-explorer/profile/explore-okf/v1/"
)
ENDPOINT_LABEL_INDEX_SCHEMA = "okf-explorer-endpoint-label-index.v1"
ENDPOINT_LABEL_INDEX_SCHEMA_PATH = (
    "explore-okf/v1/endpoint-label-index.schema.json"
)
EXPLORATORY_PUBLICATION_SCHEMA = "okf-exploratory-publication.v1"
EXPLORATORY_PUBLICATION_SCHEMA_PATH = (
    "explore-okf/v1/exploratory-publication.schema.json"
)
EXPLORATORY_BANNER_MESSAGE = (
    "This is an incomplete research view, not an authoritative service or "
    "released data product. Content and links may change. Check the cited "
    "official source before making a decision."
)
ENDPOINT_LABEL_AUTHORITY_CLASSES = frozenset(
    {"source-native", "domain-profile", "editorial"}
)
MAX_ENDPOINT_LABEL_TEXT_UNITS = 48 * 1024 * 1024
MAX_ENDPOINT_LABEL_JSON_BYTES = 64 * 1024 * 1024
UNSAFE_HTTP_URL_CHARACTER = re.compile(r"[^\x21-\x7e]|[\"'<>\\^`{|}]")
MALFORMED_PERCENT_ESCAPE = re.compile(r"%(?![0-9A-Fa-f]{2})")
SAFE_HTTP_URL_PREFIX = re.compile(
    r"^https?://(?:\[[0-9A-Fa-f:.]+\]|"
    r"[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?)"
    r"(?::(?:[1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|"
    r"65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5]))?(?:[/?#]|$)",
    re.IGNORECASE,
)
INTRINSIC_OPAQUE_IDENTIFIER = re.compile(
    r"^(?:publisher|source|activity|rights|catalogue-record)-[0-9a-f]{12,}$",
    re.IGNORECASE,
)


def encode_endpoint_route_segment(value: str) -> str:
    """Return the canonical RFC 3986 segment used by Explorer routes."""

    if not isinstance(value, str) or not value:
        raise SemanticError("endpoint route segment must be a non-empty string")
    return quote(value, safe="-._~", encoding="utf-8", errors="strict")


def metadata_endpoint_route(kind: str, value: str) -> str:
    """Build a canonical metadata endpoint route with no ambiguous slashes."""

    if not re.fullmatch(r"[a-z][a-z0-9-]*", kind):
        raise SemanticError("endpoint route kind is malformed")
    return f"{kind}/{encode_endpoint_route_segment(value)}"


def _is_canonical_endpoint_route(route: str) -> bool:
    parts = route.split("/")
    if len(parts) < 2 or not re.fullmatch(r"[a-z][a-z0-9-]*", parts[0]):
        return False
    try:
        return all(
            segment
            and encode_endpoint_route_segment(
                unquote(segment, encoding="utf-8", errors="strict")
            )
            == segment
            for segment in parts[1:]
        )
    except (SemanticError, UnicodeDecodeError):
        return False


def _credential_free_http_url(value: object, *, https_only: bool = False) -> bool:
    if not isinstance(value, str) or not value or value.strip() != value:
        return False
    if (
        UNSAFE_HTTP_URL_CHARACTER.search(value)
        or MALFORMED_PERCENT_ESCAPE.search(value)
        or not SAFE_HTTP_URL_PREFIX.match(value)
    ):
        return False
    try:
        parsed = urlsplit(value)
        port = parsed.port
    except ValueError:
        return False
    protocols = {"https"} if https_only else {"http", "https"}
    return bool(
        parsed.scheme in protocols
        and parsed.netloc
        and not parsed.username
        and not parsed.password
        and port != 0
    )


def _utf16_text_units(value: str) -> int:
    return len(value.encode("utf-16-le")) // 2


def _endpoint_label_retained_text_units(index: dict[str, Any]) -> int:
    total = 0
    for entry in index.get("entries", []):
        if not isinstance(entry, dict):
            continue
        authority = entry.get("label_authority")
        values = [
            entry.get("route"),
            entry.get("iri"),
            entry.get("label"),
            entry.get("language"),
            entry.get("type"),
        ]
        if isinstance(authority, dict):
            values.extend([authority.get("class"), authority.get("source")])
        total += sum(
            _utf16_text_units(value)
            for value in values
            if isinstance(value, str)
        )
    return total


def endpoint_label_index_json_bytes(index: dict[str, Any]) -> int:
    """Return UTF-8 bytes for the governed compact canonical JSON form."""

    return len(
        json.dumps(
            index,
            ensure_ascii=False,
            separators=(",", ":"),
            sort_keys=True,
        ).encode("utf-8")
    )


def _matches_opaque_label_pattern(value: str, pattern: str) -> bool:
    candidates = {value.casefold(), value.rsplit("/", 1)[-1].casefold()}
    if pattern.endswith("*"):
        prefix = pattern[:-1].casefold()
        return any(candidate.startswith(prefix) for candidate in candidates)
    return pattern.casefold() in candidates


def _is_intrinsically_opaque_label(value: str) -> bool:
    return bool(INTRINSIC_OPAQUE_IDENTIFIER.fullmatch(value.rsplit("/", 1)[-1]))


def validate_endpoint_label_index(
    index: dict[str, Any],
    *,
    expected_snapshot: str = "",
    graph_reachable_routes: set[str] | None = None,
) -> list[str]:
    """Validate and reconcile the compact endpoint-label projection."""

    errors = schema_errors(index, ENDPOINT_LABEL_INDEX_SCHEMA_PATH)
    entries = index.get("entries")
    patterns = index.get("opaque_identifier_patterns")
    if not isinstance(entries, list) or not isinstance(patterns, list):
        return errors
    if expected_snapshot and index.get("snapshot") != expected_snapshot:
        errors.append("snapshot differs from the governed bundle snapshot")
    counts = index.get("counts")
    if not isinstance(counts, dict) or counts.get("entries") != len(entries):
        errors.append("counts.entries differs from entries length")

    if _endpoint_label_retained_text_units(index) > MAX_ENDPOINT_LABEL_TEXT_UNITS:
        errors.append("endpoint label index exceeds its retained-text ceiling")
    if endpoint_label_index_json_bytes(index) > MAX_ENDPOINT_LABEL_JSON_BYTES:
        errors.append("endpoint label index exceeds its compact JSON byte ceiling")

    routes: set[str] = set()
    for position, entry in enumerate(entries):
        if not isinstance(entry, dict):
            continue
        route = str(entry.get("route") or "")
        label = str(entry.get("label") or "")
        type_label = str(entry.get("type") or "")
        authority = entry.get("label_authority")
        if not _is_canonical_endpoint_route(route):
            errors.append(f"entries[{position}].route is not canonical: {route}")
        if route in routes:
            errors.append(f"entries[{position}].route is duplicated: {route}")
        routes.add(route)
        for field, visible_label in (("label", label), ("type", type_label)):
            if visible_label == "Missing label":
                errors.append(
                    f"entries[{position}].{field} uses the reserved missing-label sentinel"
                )
            elif _is_intrinsically_opaque_label(visible_label) or any(
                _matches_opaque_label_pattern(visible_label, str(pattern))
                for pattern in patterns
            ):
                errors.append(
                    f"entries[{position}].{field} matches an opaque identifier pattern"
                )
        if isinstance(authority, dict):
            if authority.get("class") not in ENDPOINT_LABEL_AUTHORITY_CLASSES:
                errors.append(
                    f"entries[{position}].label_authority.class is unsupported"
                )
            if not _credential_free_http_url(authority.get("source")):
                errors.append(
                    f"entries[{position}].label_authority.source must be a "
                    "credential-free absolute HTTP(S) URL"
                )

    if graph_reachable_routes is not None:
        missing = sorted(graph_reachable_routes.difference(routes))
        extra = sorted(routes.difference(graph_reachable_routes))
        errors.extend(
            f"graph-reachable route has no endpoint label: {route}"
            for route in missing
        )
        errors.extend(
            f"endpoint label route is not graph-reachable: {route}"
            for route in extra
        )
    return errors


def build_endpoint_label_index(
    entries: list[dict[str, Any]],
    relationships: list[dict[str, Any]],
    *,
    graph_reachable_routes: set[str],
    snapshot: str,
    generated_at_value: str,
    opaque_identifier_patterns: list[str] | None = None,
    default_language: str = "en-GB",
) -> dict[str, Any]:
    """Build a deterministic label index for every relationship endpoint."""

    if not graph_reachable_routes:
        raise SemanticError(
            "graph_reachable_routes must declare the complete Explorer graph denominator"
        )
    graph_routes = {
        str(route).strip()
        for route in graph_reachable_routes
        if str(route).strip()
    }
    if len(graph_routes) != len(graph_reachable_routes):
        raise SemanticError("graph_reachable_routes contains an empty or duplicate route")
    for position, relationship in enumerate(relationships):
        if not isinstance(relationship, dict):
            raise SemanticError(
                f"relationship {position + 1} must be a mapping"
            )
        for endpoint in ("source", "target"):
            route = str(relationship.get(endpoint) or "").strip()
            if not route:
                raise SemanticError(
                    f"relationship {position + 1} has no {endpoint} route"
                )
            if route not in graph_routes:
                raise SemanticError(
                    f"relationship {position + 1} {endpoint} is absent from "
                    f"graph_reachable_routes: {route}"
                )

    patterns = sorted(
        set(
            opaque_identifier_patterns
            or [
                "activity-*",
                "catalogue-record-*",
                "publisher-*",
                "rights-*",
                "source-*",
            ]
        )
    )
    ordered_entries = sorted(
        (dict(entry) for entry in entries),
        key=lambda entry: str(entry.get("route") or ""),
    )
    index = {
        "schema": ENDPOINT_LABEL_INDEX_SCHEMA,
        "snapshot": snapshot,
        "generated_at": generated_at_value,
        "default_language": default_language,
        "opaque_identifier_patterns": patterns,
        "entries": ordered_entries,
        "counts": {"entries": len(ordered_entries)},
    }
    errors = validate_endpoint_label_index(
        index,
        expected_snapshot=snapshot,
        graph_reachable_routes=graph_routes,
    )
    if errors:
        raise SemanticError(
            "invalid endpoint label index:\n- " + "\n- ".join(errors)
        )
    return index


def validate_exploratory_publication(
    publication: dict[str, Any],
    *,
    descriptor_snapshot: str,
    descriptor_generated_at: str,
    descriptor_plane_roots: dict[str, str] | None = None,
    data_plane_manifest_root_sha256: str = "",
) -> list[str]:
    """Validate the exploratory block against its descriptor envelope."""

    errors = schema_errors(publication, EXPLORATORY_PUBLICATION_SCHEMA_PATH)
    if publication.get("snapshot_id") != descriptor_snapshot:
        errors.append("snapshot_id differs from the descriptor snapshot")
    if publication.get("generated_at") != descriptor_generated_at:
        errors.append("generated_at differs from the descriptor generation time")
    banner = publication.get("banner")
    if not isinstance(banner, dict) or banner.get("message") != EXPLORATORY_BANNER_MESSAGE:
        errors.append("banner.message differs from the governed v1 warning")

    publisher = publication.get("publisher")
    if isinstance(publisher, dict) and "url" in publisher:
        if not _credential_free_http_url(publisher.get("url"), https_only=True):
            errors.append("publisher.url must be a credential-free absolute HTTPS URL")
    if isinstance(banner, dict) and not _credential_free_http_url(
        banner.get("feedback_url")
    ):
        errors.append(
            "banner.feedback_url must be a credential-free absolute HTTP(S) URL"
        )

    envelope_roots = dict(descriptor_plane_roots or {})
    if data_plane_manifest_root_sha256:
        previous = envelope_roots.get("data_plane_manifest")
        if previous and previous != data_plane_manifest_root_sha256:
            errors.append(
                "descriptor plane_roots and data_plane_manifest_root_sha256 conflict"
            )
        envelope_roots["data_plane_manifest"] = data_plane_manifest_root_sha256
    roots = publication.get("applicable_plane_roots")
    if isinstance(roots, dict):
        for plane, digest in roots.items():
            if envelope_roots.get(str(plane)) != digest:
                errors.append(
                    f"applicable plane root differs from the descriptor: {plane}"
                )
    return errors


def build_exploratory_publication(
    *,
    snapshot: str,
    generated_at_value: str,
    applicable_plane_roots: dict[str, str],
    publisher_name: str,
    publisher_authority_status: str,
    feedback_url: str,
    limitations: list[str],
    permitted_claims: list[str],
    prohibited_claims: list[str],
    promotion_rule: str,
    publisher_url: str = "",
    indexing_policy: str = "noindex",
) -> dict[str, Any]:
    """Build the strict descriptor block for a reviewable Explore OKF stage."""

    publisher = {
        "name": publisher_name,
        **({"url": publisher_url} if publisher_url else {}),
        "authority_status": publisher_authority_status,
    }
    publication = {
        "schema": EXPLORATORY_PUBLICATION_SCHEMA,
        "publication_state": "exploratory",
        "snapshot_id": snapshot,
        "generated_at": generated_at_value,
        "applicable_plane_roots": dict(sorted(applicable_plane_roots.items())),
        "publisher": publisher,
        "banner": {
            "label": "Exploratory",
            "message": EXPLORATORY_BANNER_MESSAGE,
            "feedback_url": feedback_url,
            "preserve_route": True,
        },
        "indexing_policy": indexing_policy,
        "limitations": limitations,
        "permitted_claims": permitted_claims,
        "prohibited_claims": prohibited_claims,
        "promotion_rule": promotion_rule,
    }
    errors = validate_exploratory_publication(
        publication,
        descriptor_snapshot=snapshot,
        descriptor_generated_at=generated_at_value,
        descriptor_plane_roots=applicable_plane_roots,
    )
    if errors:
        raise SemanticError(
            "invalid exploratory publication contract:\n- "
            + "\n- ".join(errors)
        )
    return publication
