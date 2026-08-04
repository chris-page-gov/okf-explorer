#!/usr/bin/env python3
"""Build the separate source-backed heritage assurance fixture.

The command performs no network access.  It extracts three exact source rows
from the frozen Coventry and Warwickshire snapshot:

* NHLE 1342941, Coventry Cathedral, as a stable journey/search anchor;
* NHLE 1184627, Church of St Peter at Radway; and
* the matching 2025 Heritage at Risk entry for NHLE 1184627.

The resulting JSON records both the parent snapshot digests and per-selection
digests.  ``--check`` compares the committed fixture byte-for-byte without
rewriting it.
"""

from __future__ import annotations

import argparse
import copy
import gzip
import hashlib
import json
import sys
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = (
    ROOT
    / "evaluation-foundry"
    / "fixtures"
    / "heritage-warwickshire"
    / "source-snapshot.json.gz"
)
DEFAULT_OUTPUT = DEFAULT_SOURCE.with_name("tiny") / "source-snapshot.json"
SOURCE_LABEL = "evaluation-foundry/fixtures/heritage-warwickshire/source-snapshot.json.gz"

NHLE_SELECTIONS: tuple[tuple[str, str], ...] = (
    (
        "1342941",
        "Coventry Cathedral search, Grade I facet and real-record journey anchor",
    ),
    (
        "1184627",
        "NHLE side of the source-declared 2025 Heritage at Risk relationship",
    ),
)
HAR_YEAR = 2025
HAR_EVENT_TYPE = "entry"
HAR_LIST_ENTRY = "1184627"
BOUNDARY_CODES = ("E08000026", "E07000221")
SOURCE_IDS = (
    "ons-lad-dec-2025-bfc",
    "historic-england-nhle-v02",
    "historic-england-har-2025-workbook",
    "historic-england-har-2025-mapped-layer",
)


class SnapshotSelectionError(ValueError):
    """Raised when the frozen parent no longer satisfies the tiny contract."""


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def canonical_json_bytes(value: Any) -> bytes:
    """Return the compact canonical representation used for object receipts."""

    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")


def rendered_json_bytes(value: Any) -> bytes:
    """Return stable, review-friendly bytes for the committed fixture."""

    return (
        json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n"
    ).encode("utf-8")


def normalize_identifier(value: Any) -> str:
    if value is None or isinstance(value, bool):
        return ""
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    text = str(value).strip()
    return text[:-2] if text.endswith(".0") and text[:-2].isdigit() else text


def feature_list_entry(feature: dict[str, Any]) -> str:
    attributes = feature.get("attributes", {})
    if not isinstance(attributes, dict):
        return ""
    for key in ("ListEntry", "List_Entry", "List Entry"):
        identifier = normalize_identifier(attributes.get(key))
        if identifier:
            return identifier
    return ""


def row_list_entry(row: dict[str, Any]) -> str:
    mappings: list[dict[str, Any]] = [row]
    mappings.extend(
        value
        for key in ("normalized_fields", "source_values")
        if isinstance((value := row.get(key)), dict)
    )
    preferred = (
        "List Entry",
        "ListEntry",
        "List_Entry",
        "List Entry Number (LEN) or Conservation Area Number (CAN)",
        "LEN or CAN or LENs of dual designations",
        "LEN or CAN or LENS of dual designations",
    )
    for mapping in mappings:
        for key in preferred:
            identifier = normalize_identifier(mapping.get(key))
            if identifier:
                return identifier
    return ""


def exactly_one(values: Iterable[Any], label: str) -> Any:
    rows = list(values)
    if len(rows) != 1:
        raise SnapshotSelectionError(
            f"{label} must resolve exactly once in the frozen source; found {len(rows)}"
        )
    return rows[0]


def load_parent(path: Path) -> tuple[dict[str, Any], bytes, bytes]:
    compressed = path.read_bytes()
    try:
        payload = gzip.decompress(compressed) if path.suffix == ".gz" else compressed
        parent = json.loads(payload.decode("utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise SnapshotSelectionError(f"cannot read frozen parent snapshot: {exc}") from exc
    if parent.get("schema") != "heritage-evaluation-source-snapshot.v1":
        raise SnapshotSelectionError(
            "parent must use heritage-evaluation-source-snapshot.v1"
        )
    if parent.get("scope", {}).get("assertion_scope") != "real-world":
        raise SnapshotSelectionError("parent must contain real-world source assertions")
    return parent, compressed, payload


def selected_nhle_layers(
    parent: dict[str, Any],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    locations: dict[str, tuple[dict[str, Any], dict[str, Any]]] = {}
    for layer in parent.get("nhle", {}).get("layers", []):
        for feature in layer.get("features", []):
            list_entry = feature_list_entry(feature)
            if list_entry not in {item[0] for item in NHLE_SELECTIONS}:
                continue
            if list_entry in locations:
                raise SnapshotSelectionError(
                    f"NHLE {list_entry} occurs in more than one canonical source feature"
                )
            locations[list_entry] = (layer, feature)

    missing = [identifier for identifier, _ in NHLE_SELECTIONS if identifier not in locations]
    if missing:
        raise SnapshotSelectionError(
            f"required NHLE selection missing: {', '.join(missing)}"
        )

    by_layer: dict[int, dict[str, Any]] = {}
    receipts: list[dict[str, Any]] = []
    for identifier, reason in NHLE_SELECTIONS:
        source_layer, feature = locations[identifier]
        layer_id = int(source_layer["id"])
        if layer_id not in by_layer:
            reduced_layer = copy.deepcopy(source_layer)
            reduced_layer["features"] = []
            reduced_layer["source_feature_count"] = len(source_layer.get("features", []))
            reduced_layer["subset_role"] = "tiny-assurance-selection"
            by_layer[layer_id] = reduced_layer
        selected_feature = copy.deepcopy(feature)
        by_layer[layer_id]["features"].append(selected_feature)
        attributes = selected_feature.get("attributes", {})
        receipts.append(
            {
                "kind": "nhle-feature",
                "list_entry": identifier,
                "reason": reason,
                "source_layer_id": layer_id,
                "source_object_id": attributes.get("OBJECTID"),
                "source_object_sha256": sha256_bytes(
                    canonical_json_bytes(selected_feature)
                ),
            }
        )

    return [by_layer[key] for key in sorted(by_layer)], receipts


def selected_har_annual(
    parent: dict[str, Any],
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    section = exactly_one(
        (
            annual
            for annual in parent.get("har", {}).get("annual", [])
            if int(annual.get("year", 0)) == HAR_YEAR
            and str(annual.get("event_type", "")).strip().casefold()
            == HAR_EVENT_TYPE
        ),
        f"HAR {HAR_YEAR} {HAR_EVENT_TYPE} section",
    )
    row = exactly_one(
        (
            candidate
            for candidate in section.get("rows", [])
            if row_list_entry(candidate) == HAR_LIST_ENTRY
        ),
        f"HAR {HAR_YEAR} {HAR_EVENT_TYPE} row for NHLE {HAR_LIST_ENTRY}",
    )
    selected = copy.deepcopy(section)
    selected["rows"] = [copy.deepcopy(row)]
    selected["subset"] = {
        "role": "tiny-assurance-selection",
        "parent_scope_rows": len(section.get("rows", [])),
        "retained_rows": 1,
        "selector": {
            "event_type": HAR_EVENT_TYPE,
            "list_entry": HAR_LIST_ENTRY,
            "year": HAR_YEAR,
        },
    }
    receipt = {
        "event_type": HAR_EVENT_TYPE,
        "kind": "heritage-at-risk-row",
        "list_entry": HAR_LIST_ENTRY,
        "reason": "HAR side of the source-declared NHLE relationship and graph path",
        "source_object_sha256": sha256_bytes(canonical_json_bytes(row)),
        "source_record_id": row.get("record_id"),
        "source_row": row.get("source_row"),
        "source_sheet": row.get("source_sheet"),
        "year": HAR_YEAR,
    }
    return [selected], receipt


def compact_boundaries(parent: dict[str, Any]) -> list[dict[str, Any]]:
    parent_boundaries = {
        boundary.get("code"): boundary
        for boundary in parent.get("scope", {}).get("boundaries", [])
    }
    result: list[dict[str, Any]] = []
    for code in BOUNDARY_CODES:
        boundary = parent_boundaries.get(code)
        if not isinstance(boundary, dict):
            raise SnapshotSelectionError(f"required scope boundary missing: {code}")
        compact = copy.deepcopy(boundary)
        geometry = compact.pop("geometry", None)
        if not isinstance(geometry, dict):
            raise SnapshotSelectionError(f"scope boundary has no source geometry: {code}")
        compact["source_geometry_receipt"] = {
            "algorithm": "sha256-over-canonical-json",
            "geometry_omitted_from_tiny_fixture": True,
            "sha256": sha256_bytes(canonical_json_bytes(geometry)),
        }
        result.append(compact)
    return result


def selected_sources(parent: dict[str, Any]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    sources_by_id = {source.get("id"): source for source in parent.get("sources", [])}
    sources: list[dict[str, Any]] = []
    request_ids: set[str] = set()
    for source_id in SOURCE_IDS:
        source = sources_by_id.get(source_id)
        if not isinstance(source, dict):
            raise SnapshotSelectionError(f"required source receipt missing: {source_id}")
        sources.append(copy.deepcopy(source))
        for key, value in source.items():
            if key == "request_id" or key.endswith("_request_id"):
                if isinstance(value, str) and value:
                    request_ids.add(value)
            elif key.endswith("_request_ids") and isinstance(value, list):
                request_ids.update(str(item) for item in value if str(item))

    requests_by_id = {row.get("id"): row for row in parent.get("requests", [])}
    receipts: list[dict[str, Any]] = []
    for request_id in sorted(request_ids):
        request = requests_by_id.get(request_id)
        if not isinstance(request, dict):
            raise SnapshotSelectionError(
                f"source refers to missing parent request receipt: {request_id}"
            )
        receipts.append(
            {
                key: copy.deepcopy(request[key])
                for key in (
                    "id",
                    "method",
                    "url",
                    "final_url",
                    "status",
                    "response_media_type",
                    "response_bytes",
                    "response_digest_basis",
                    "response_sha256",
                )
                if key in request
            }
        )
    return sources, receipts


def build_tiny_snapshot(
    parent: dict[str, Any],
    *,
    source_file_bytes: bytes,
    source_payload_bytes: bytes,
    source_label: str = SOURCE_LABEL,
) -> dict[str, Any]:
    geometry_delivery = parent.get("geometry_delivery")
    if not isinstance(geometry_delivery, dict) or geometry_delivery.get("crs") != "EPSG:4326":
        raise SnapshotSelectionError(
            "parent must declare its retained source geometries as ArcGIS-delivered EPSG:4326"
        )
    layers, selection_receipts = selected_nhle_layers(parent)
    annual, har_receipt = selected_har_annual(parent)
    selection_receipts.append(har_receipt)
    sources, requests = selected_sources(parent)

    scope = {
        key: copy.deepcopy(value)
        for key, value in parent.get("scope", {}).items()
        if key != "boundaries"
    }
    scope["boundaries"] = compact_boundaries(parent)
    scope["subset_note"] = (
        "The full-resolution source boundary geometries were used during parent "
        "acquisition. This tiny derivative keeps their identity and canonical "
        "geometry digests while omitting the large coordinate arrays."
    )

    parent_har = parent.get("har", {})
    workbook_schema = exactly_one(
        (
            row
            for row in parent_har.get("workbook_schemas", [])
            if int(row.get("year", 0)) == HAR_YEAR
        ),
        f"HAR {HAR_YEAR} workbook schema",
    )
    mapped_join = exactly_one(
        (
            row
            for row in parent_har.get("mapped_geometry_join", [])
            if int(row.get("year", 0)) == HAR_YEAR
        ),
        f"HAR {HAR_YEAR} mapped-geometry reconciliation",
    )

    parent_nhle_reconciliation = parent.get("nhle", {}).get("reconciliation", {})
    snapshot_id = f"{parent.get('snapshot_id', 'heritage-source')}-tiny-v1"
    return {
        "schema": "heritage-evaluation-source-snapshot.v1",
        "snapshot_id": snapshot_id,
        "observed_at": parent.get("observed_at", ""),
        "publication": {
            "description": (
                "Three exact Historic England source records for fast, deterministic "
                "producer and real-consumer assurance."
            ),
            "license": "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
            "public_base": "https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/tiny/",
            "family_public_base": "https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/",
            "publisher": "https://historicengland.org.uk/",
            "publisher_title": "Historic England",
            "role": "tiny",
            "status": "assurance-fixture",
            "title": "Tiny source-backed heritage assurance fixture",
        },
        "scope": scope,
        "source_title": "Deterministic subset of the frozen Coventry and Warwickshire heritage evaluation sources",
        "source_url": parent.get("source_url", ""),
        "source_data_url": parent.get("source_data_url", ""),
        "source_adapter": "heritage-evaluation-tiny-subset-v1",
        "geometry_delivery": copy.deepcopy(geometry_delivery),
        "sources": sources,
        "denominators": [
            {
                "count": 2,
                "definition": (
                    "The two declared NHLE assurance anchors, selected by exact "
                    "ListEntry from the complete parent spatial intersection."
                ),
                "id": "tiny-declared-nhle-records",
                "method": "Exact ListEntry allow-list: 1342941 and 1184627",
                "status": "complete-for-declared-assurance-subset",
            },
            {
                "count": 1,
                "definition": (
                    "The single declared 2025 HAR entry linked to NHLE 1184627."
                ),
                "id": "tiny-declared-har-records",
                "method": "Exact year, event type and List Entry selection",
                "status": "complete-for-declared-assurance-subset",
            },
        ],
        "nhle": {
            "layers": layers,
            "reconciliation": {
                "expected_unique_list_entries": 2,
                "observed_unique_list_entries": sum(
                    len(layer.get("features", [])) for layer in layers
                ),
                "selection_role": "declared-assurance-subset-not-a-geographic-denominator",
                "parent_reconciliation_sha256": sha256_bytes(
                    canonical_json_bytes(parent_nhle_reconciliation)
                ),
            },
        },
        "har": {
            "annual": annual,
            "mapped_geometry_completeness": parent_har.get(
                "mapped_geometry_completeness", ""
            ),
            "parent_mapped_geometry_join": [copy.deepcopy(mapped_join)],
            "workbook_schemas": [copy.deepcopy(workbook_schema)],
        },
        "requests": requests,
        "limitations": [
            "This fixture is an intentionally declared assurance subset, not a geographic or annual-register denominator.",
            "It contains only source-backed real-world records; no fields or relationships are invented.",
            "Full boundary coordinate arrays are omitted after their canonical digests are recorded; each selected feature retains the parent's exact spatial-membership evidence.",
        ],
        "link_validation": {"live_receipts": []},
        "subset_provenance": {
            "schema": "heritage-evaluation-subset-receipt.v1",
            "algorithm": "exact-identity-selection-from-frozen-parent-v1",
            "network_access": "none",
            "parent": {
                "compressed_file_sha256": sha256_bytes(source_file_bytes),
                "observed_at": parent.get("observed_at", ""),
                "snapshot_id": parent.get("snapshot_id", ""),
                "source_path": source_label,
                "uncompressed_json_sha256": sha256_bytes(source_payload_bytes),
            },
            "selection": selection_receipts,
            "counts": {
                "har_rows": 1,
                "nhle_features": 2,
                "records": 3,
                "scope_boundaries": 2,
            },
        },
    }


def source_label(path: Path) -> str:
    try:
        return path.resolve().relative_to(ROOT.resolve()).as_posix()
    except ValueError:
        return path.name


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args(argv)

    source = args.source if args.source.is_absolute() else ROOT / args.source
    output = args.output if args.output.is_absolute() else ROOT / args.output
    if not source.is_file():
        print(f"missing frozen parent snapshot: {source}", file=sys.stderr)
        return 1
    try:
        parent, compressed, payload = load_parent(source)
        tiny = build_tiny_snapshot(
            parent,
            source_file_bytes=compressed,
            source_payload_bytes=payload,
            source_label=source_label(source),
        )
        rendered = rendered_json_bytes(tiny)
    except (OSError, SnapshotSelectionError) as exc:
        print(f"tiny heritage snapshot build failed: {exc}", file=sys.stderr)
        return 1

    if args.check:
        if not output.is_file():
            print(f"tiny heritage snapshot is missing: {output}", file=sys.stderr)
            return 1
        if output.read_bytes() != rendered:
            print(
                "tiny heritage snapshot is not synchronized with the frozen parent",
                file=sys.stderr,
            )
            return 1
        print("tiny heritage snapshot is synchronized (2 NHLE + 1 HAR record)")
        return 0

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(rendered)
    label = output.relative_to(ROOT) if output.is_relative_to(ROOT) else output
    print(f"wrote 3 source-backed records to {label}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
