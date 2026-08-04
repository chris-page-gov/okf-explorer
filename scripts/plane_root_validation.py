#!/usr/bin/env python3
"""Shared validation for Evaluation Foundry plane-root receipts.

Version 2 separates semantic identity from serialization identity: root
YAML-LD and JSON-LD entries contribute their normalized RDF identity to the
plane root, while ``artifact_root_sha256`` continues to bind every exact byte.
Publication exporters and standalone release validators must use this same
algorithm so a release check cannot accidentally regress to the v1 byte-root
calculation.
"""

from __future__ import annotations

import hashlib
import json
from collections.abc import Callable, Collection
from pathlib import PurePosixPath
from typing import Any


V1_SCHEMA = "okf-evaluation-plane-roots.v1"
V2_SCHEMA = "okf-evaluation-plane-roots.v2"
SHA256_HEX = set("0123456789abcdef")
SEMANTIC_FIELDS = (
    "semantic_algorithm",
    "semantic_media_type",
    "semantic_sha256",
    "semantic_statements",
    "semantic_source_data_model_sha256",
)


def canonical_root_json(value: object) -> bytes:
    return (
        json.dumps(
            value,
            ensure_ascii=False,
            indent=2,
            sort_keys=True,
            separators=(",", ": "),
        )
        + "\n"
    ).encode("utf-8")


def digest(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def is_sha256(value: object) -> bool:
    return (
        isinstance(value, str)
        and len(value) == 64
        and set(value).issubset(SHA256_HEX)
    )


def safe_path(value: object) -> str:
    if not isinstance(value, str) or not value or "\\" in value:
        raise RuntimeError(f"unsafe plane-root path: {value!r}")
    path = PurePosixPath(value)
    if path.is_absolute() or path.as_posix() != value or ".." in path.parts:
        raise RuntimeError(f"unsafe plane-root path: {value!r}")
    return value


def identity_entry(entry: dict[str, Any]) -> dict[str, Any]:
    present = [field for field in SEMANTIC_FIELDS if field in entry]
    if not present:
        return {
            "path": entry["path"],
            "bytes": entry["bytes"],
            "sha256": entry["sha256"],
        }
    if len(present) != len(SEMANTIC_FIELDS):
        missing = sorted(set(SEMANTIC_FIELDS).difference(present))
        raise RuntimeError(
            f"semantic plane entry {entry['path']} is missing identity fields: {missing}"
        )
    if (
        entry["semantic_algorithm"] != "URDNA2015"
        or entry["semantic_media_type"] != "application/n-quads"
        or not is_sha256(entry["semantic_sha256"])
        or not is_sha256(entry["semantic_source_data_model_sha256"])
        or not isinstance(entry["semantic_statements"], int)
        or entry["semantic_statements"] < 0
        or PurePosixPath(entry["path"]).suffix not in {".yamlld", ".jsonld"}
    ):
        raise RuntimeError(
            f"semantic plane entry {entry['path']} has an invalid normalized identity"
        )
    return {
        "path": entry["path"],
        **{field: entry[field] for field in SEMANTIC_FIELDS},
    }


def validate_plane_roots(
    roots: dict[str, Any],
    *,
    read_bytes: Callable[[str], bytes],
    owned_paths: Collection[str] | None = None,
    label: str = "plane roots",
) -> dict[str, Any]:
    """Validate exact artifacts, v2 semantic identities, and the release root."""

    schema = roots.get("schema")
    if schema not in {V1_SCHEMA, V2_SCHEMA}:
        raise RuntimeError(f"{label} has unsupported schema: {schema!r}")
    planes = roots.get("planes")
    if not isinstance(planes, dict) or not planes:
        raise RuntimeError(f"{label} must declare nonempty planes")
    release_basis: list[dict[str, str]] = []
    observed_paths: set[str] = set()
    for plane, value in sorted(planes.items()):
        if not isinstance(value, dict) or not isinstance(value.get("entries"), list):
            raise RuntimeError(f"{label} plane {plane} has invalid entries")
        entries = value["entries"]
        if entries != sorted(entries, key=lambda item: item.get("path", "")):
            raise RuntimeError(f"{label} plane {plane} entries are not path ordered")
        for entry in entries:
            if not isinstance(entry, dict):
                raise RuntimeError(f"{label} plane {plane} contains a non-object entry")
            path = safe_path(entry.get("path"))
            if path in observed_paths:
                raise RuntimeError(f"{label} contains duplicate material: {path}")
            observed_paths.add(path)
            if owned_paths is not None and path not in owned_paths:
                raise RuntimeError(f"plane {plane} references unowned material: {path}")
            raw = read_bytes(path)
            if (
                not isinstance(entry.get("bytes"), int)
                or entry["bytes"] < 0
                or not is_sha256(entry.get("sha256"))
                or len(raw) != entry["bytes"]
                or digest(raw) != entry["sha256"]
            ):
                raise RuntimeError(f"plane {plane} entry differs: {path}")
        if value.get("files") != len(entries):
            raise RuntimeError(f"plane {plane} file count differs")
        if value.get("bytes") != sum(entry["bytes"] for entry in entries):
            raise RuntimeError(f"plane {plane} byte count differs")
        artifact_root = digest(canonical_root_json(entries))
        if schema == V2_SCHEMA:
            if artifact_root != value.get("artifact_root_sha256"):
                raise RuntimeError(f"plane artifact root differs: {plane}")
            identity_entries = [identity_entry(entry) for entry in entries]
            observed_root = digest(canonical_root_json(identity_entries))
        else:
            observed_root = artifact_root
        if observed_root != value.get("root_sha256"):
            raise RuntimeError(f"plane root differs: {plane}")
        release_basis.append({"plane": plane, "root_sha256": observed_root})
    observed_release = digest(canonical_root_json(release_basis))
    if observed_release != roots.get("release_root_sha256"):
        raise RuntimeError("release root differs")
    return {
        "schema": schema,
        "files": len(observed_paths),
        "bytes": sum(value["bytes"] for value in planes.values()),
        "release_root_sha256": observed_release,
    }
