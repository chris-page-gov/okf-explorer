#!/usr/bin/env python3
"""Content-addressed output primitives for the heritage evaluation builder.

The module deliberately knows nothing about heritage source normalization.  It
owns the smaller publication concern: stable plane classification, atomic
changed-only writes, and cleanup constrained to paths listed by the previous
builder manifest.
"""

from __future__ import annotations

import fnmatch
import hashlib
import json
import os
import tempfile
from collections import defaultdict
from pathlib import Path
from typing import Any, Iterable


BUILD_MANIFEST = Path("assurance/build-manifest.json")
PLANE_ROOTS = Path("assurance/plane-roots.json")
BUILD_MANIFEST_SCHEMA = "okf-evaluation-build-manifest.v2"
PLANE_ROOTS_SCHEMA = "okf-evaluation-plane-roots.v2"
PLANES = ("control", "data", "search", "semantic", "presentation")


def canonical_json(value: Any) -> str:
    return json.dumps(
        value,
        ensure_ascii=False,
        indent=2,
        sort_keys=True,
        separators=(",", ": "),
    ) + "\n"


def content_bytes(content: str | bytes) -> bytes:
    return content if isinstance(content, bytes) else content.encode("utf-8")


def sha256_bytes(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def classify_output_plane(path: Path) -> str:
    """Classify a generated path, checking specific subplanes first.

    The order is intentional.  The former builder classified every
    ``data/semantic`` artifact as generic Data because it checked ``data/``
    before the semantic prefix.
    """

    value = path.as_posix()
    if value.startswith("data/semantic/") or value.endswith((".yamlld", ".jsonld")):
        return "semantic"
    if value.startswith("data/search/"):
        return "search"
    if value.startswith("data/"):
        return "data"
    if value.endswith((".md", ".html")):
        return "presentation"
    return "control"


def file_entry(path: Path, content: str | bytes, *, plane: str | None = None) -> dict[str, Any]:
    raw = content_bytes(content)
    return {
        "path": path.as_posix(),
        "plane": plane or classify_output_plane(path),
        "bytes": len(raw),
        "sha256": sha256_bytes(raw),
    }


def _semantic_representation_document(
    path: Path, content: str | bytes
) -> dict[str, Any]:
    """Parse a root YAML-LD/JSON-LD representation without network access."""

    import okf_semantic  # Local import avoids coupling non-semantic callers at import time.

    try:
        text = content_bytes(content).decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        raise ValueError(f"semantic representation must be UTF-8: {path}") from exc
    if path.suffix == ".yamlld":
        document = okf_semantic.load_yaml_ld_text(text, source=path.as_posix())
    else:
        try:
            document = json.loads(text)
        except json.JSONDecodeError as exc:
            raise ValueError(f"invalid JSON-LD representation: {path}: {exc}") from exc
    if not isinstance(document, dict):
        raise ValueError(f"semantic representation must contain one mapping: {path}")
    return document


def semantic_file_identities(
    files: dict[Path, str | bytes]
) -> dict[Path, dict[str, Any]]:
    """Return normalized graph identities for root semantic serializations.

    Generated candidates bind a precomputed URDNA2015 digest to the canonical
    parsed data-model digest, avoiding a second expensive normalization during
    receipt construction. Ad-hoc callers without that manifest normalize each
    distinct data model and share the result across equivalent serializations.
    """

    import okf_semantic

    identities: dict[Path, dict[str, Any]] = {}
    by_data_model: dict[bytes, dict[str, Any]] = {}
    declared_identity: dict[str, Any] | None = None
    semantic_manifest = files.get(Path("data/semantic/manifest.json"))
    if semantic_manifest is not None:
        try:
            manifest = json.loads(content_bytes(semantic_manifest).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ValueError("invalid data/semantic/manifest.json") from exc
        candidate = manifest.get("semantic_identity") if isinstance(manifest, dict) else None
        if not isinstance(candidate, dict):
            raise ValueError("semantic manifest does not declare semantic_identity")
        digest_fields = (
            candidate.get("sha256"),
            candidate.get("source_data_model_sha256"),
        )
        if (
            candidate.get("algorithm") != "URDNA2015"
            or candidate.get("media_type") != "application/n-quads"
            or not isinstance(candidate.get("statements"), int)
            or candidate["statements"] < 0
            or any(
                not isinstance(value, str)
                or len(value) != 64
                or any(character not in "0123456789abcdef" for character in value)
                for value in digest_fields
            )
        ):
            raise ValueError("semantic manifest has an invalid semantic_identity")
        declared_identity = dict(candidate)
    for path, content in sorted(files.items(), key=lambda row: row[0].as_posix()):
        if path.suffix not in {".yamlld", ".jsonld"}:
            continue
        document = _semantic_representation_document(path, content)
        model = okf_semantic.canonical_json_bytes(document)
        if declared_identity is not None:
            if sha256_bytes(model) != declared_identity["source_data_model_sha256"]:
                raise ValueError(
                    f"semantic representation does not match the manifest data model: {path}"
                )
            identity = declared_identity
        else:
            identity = by_data_model.get(model)
            if identity is None:
                identity = {
                    **okf_semantic.semantic_graph_identity(document),
                    "source_data_model_sha256": sha256_bytes(model),
                }
                by_data_model[model] = identity
        identities[path] = identity
    return identities


def stable_bucket(value: str, *, buckets: int = 64) -> str:
    if buckets <= 0 or buckets > 256:
        raise ValueError("stable shard bucket count must be between 1 and 256")
    digest = hashlib.sha256(value.encode("utf-8")).digest()
    return f"{int.from_bytes(digest[:2], 'big') % buckets:02x}"


def matches_selectors(path: Path, selectors: Iterable[str]) -> bool:
    patterns = tuple(selectors)
    return not patterns or any(fnmatch.fnmatchcase(path.as_posix(), pattern) for pattern in patterns)


def safe_relative_path(value: str | Path) -> Path:
    path = Path(value)
    if path.is_absolute() or path == Path(".") or ".." in path.parts:
        raise ValueError(f"unsafe builder-owned relative path: {value}")
    return path


def manifest_paths(entries: Iterable[dict[str, Any]]) -> set[Path]:
    return set(manifest_entry_map(entries))


def manifest_entry_map(entries: Iterable[dict[str, Any]]) -> dict[Path, dict[str, Any]]:
    result: dict[Path, dict[str, Any]] = {}
    for row in entries:
        if not isinstance(row, dict) or not row.get("path"):
            continue
        path = safe_relative_path(row["path"])
        if path in result:
            raise ValueError(f"duplicate builder-owned manifest path: {path}")
        result[path] = dict(row)
    return result


def safe_output_target(output: Path, relative: Path) -> Path:
    relative = safe_relative_path(relative)
    target = output / relative
    resolved_output = output.resolve()
    resolved_parent = target.parent.resolve()
    if not resolved_parent.is_relative_to(resolved_output):
        raise ValueError(f"builder-owned path escapes output through a symlink: {relative}")
    return target


def plane_entries(files: dict[Path, str | bytes]) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    semantic_identities = semantic_file_identities(files)
    for path, content in sorted(files.items(), key=lambda row: row[0].as_posix()):
        if path in {BUILD_MANIFEST, PLANE_ROOTS}:
            continue
        entry = file_entry(path, content)
        if path in semantic_identities:
            identity = semantic_identities[path]
            entry.update(
                {
                    "semantic_algorithm": identity["algorithm"],
                    "semantic_media_type": identity["media_type"],
                    "semantic_sha256": identity["sha256"],
                    "semantic_statements": identity["statements"],
                    "semantic_source_data_model_sha256": identity[
                        "source_data_model_sha256"
                    ],
                }
            )
        grouped[entry["plane"]].append(
            {key: value for key, value in entry.items() if key != "plane"}
        )
    return dict(grouped)


def plane_roots_receipt(
    files: dict[Path, str | bytes],
    *,
    previous: dict[str, Any] | None = None,
    replaced_planes: set[str] | None = None,
    selectors: tuple[str, ...] = (),
) -> dict[str, Any]:
    """Create roots for a full output set or merge a selected rebuild.

    A selected rebuild may replace complete planes, or paths matching explicit
    selectors.  Unaffected entries come from the prior receipt and must still
    exist on disk when the caller writes/checks the merged candidate.
    """

    current = plane_entries(files)
    merged: dict[str, list[dict[str, Any]]] = {}
    previous_planes = (previous or {}).get("planes", {})
    all_planes = set(previous_planes) | set(current)
    if previous is None:
        merged = current
    else:
        replaced = replaced_planes or set()
        for plane in all_planes:
            old_entries = [dict(row) for row in previous_planes.get(plane, {}).get("entries", [])]
            new_entries = current.get(plane, [])
            if plane in replaced and not selectors:
                merged[plane] = new_entries
                continue
            by_path = {row["path"]: row for row in old_entries}
            if selectors:
                for path in tuple(by_path):
                    if matches_selectors(Path(path), selectors):
                        del by_path[path]
            for row in new_entries:
                by_path[row["path"]] = row
            merged[plane] = sorted(by_path.values(), key=lambda row: row["path"])

    planes: dict[str, Any] = {}
    for plane, entries in sorted(merged.items()):
        entries = sorted(entries, key=lambda row: row["path"])
        artifact_canonical = canonical_json(entries).encode("utf-8")
        identity_entries = [
            (
                {
                    "path": row["path"],
                    "semantic_algorithm": row["semantic_algorithm"],
                    "semantic_media_type": row["semantic_media_type"],
                    "semantic_sha256": row["semantic_sha256"],
                    "semantic_statements": row["semantic_statements"],
                    "semantic_source_data_model_sha256": row[
                        "semantic_source_data_model_sha256"
                    ],
                }
                if row.get("semantic_sha256")
                else {
                    "path": row["path"],
                    "bytes": row["bytes"],
                    "sha256": row["sha256"],
                }
            )
            for row in entries
        ]
        identity_canonical = canonical_json(identity_entries).encode("utf-8")
        planes[plane] = {
            "files": len(entries),
            "bytes": sum(row["bytes"] for row in entries),
            "root_sha256": sha256_bytes(identity_canonical),
            "artifact_root_sha256": sha256_bytes(artifact_canonical),
            "entries": entries,
        }
    release_basis = [
        {"plane": plane, "root_sha256": value["root_sha256"]}
        for plane, value in sorted(planes.items())
    ]
    return {
        "schema": PLANE_ROOTS_SCHEMA,
        "algorithm": (
            "sha256-over-canonical-ordered-entry-identities; root YAML-LD and "
            "JSON-LD use URDNA2015 graph identity while artifact_root_sha256 "
            "retains exact-byte identity"
        ),
        "planes": planes,
        "release_root_sha256": sha256_bytes(canonical_json(release_basis).encode("utf-8")),
    }


def build_manifest(
    files: dict[Path, str | bytes],
    *,
    previous: dict[str, Any] | None = None,
    replaced_planes: set[str] | None = None,
    selectors: tuple[str, ...] = (),
) -> dict[str, Any]:
    """Return the exact cleanup ownership manifest for this builder."""

    old_entries = {
        row["path"]: dict(row)
        for row in (previous or {}).get("entries", [])
        if row.get("path") != BUILD_MANIFEST.as_posix()
    }
    replaced = replaced_planes or set()
    if previous is None:
        old_entries = {}
    elif selectors:
        old_entries = {
            path: row
            for path, row in old_entries.items()
            if not matches_selectors(Path(path), selectors)
        }
    elif replaced:
        old_entries = {
            path: row for path, row in old_entries.items() if row.get("plane") not in replaced
        }
    for path, content in files.items():
        if path == BUILD_MANIFEST:
            continue
        old_entries[path.as_posix()] = file_entry(path, content)
    entries = sorted(old_entries.values(), key=lambda row: row["path"])
    return {
        "schema": BUILD_MANIFEST_SCHEMA,
        "ownership": "Only listed paths may be changed or removed by the heritage builder.",
        "entries": entries,
        "counts": {
            "files": len(entries),
            "bytes": sum(row["bytes"] for row in entries),
            "planes": {
                plane: sum(row["plane"] == plane for row in entries)
                for plane in PLANES
                if any(row["plane"] == plane for row in entries)
            },
        },
    }


def load_json(path: Path) -> dict[str, Any] | None:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return payload if isinstance(payload, dict) else None


def finalize_full_candidate(files: dict[Path, str | bytes]) -> dict[Path, str | bytes]:
    result = dict(files)
    result[PLANE_ROOTS] = canonical_json(plane_roots_receipt(result))
    result[BUILD_MANIFEST] = canonical_json(build_manifest(result))
    return result


def finalize_selected_candidate(
    output: Path,
    files: dict[Path, str | bytes],
    *,
    replaced_planes: set[str],
    selectors: tuple[str, ...] = (),
) -> dict[Path, str | bytes]:
    previous_roots = load_json(output / PLANE_ROOTS)
    previous_manifest = load_json(output / BUILD_MANIFEST)
    if previous_roots is None or previous_manifest is None:
        raise ValueError("selective build requires an existing v2 plane receipt and build manifest")
    result = dict(files)
    result[PLANE_ROOTS] = canonical_json(
        plane_roots_receipt(
            result,
            previous=previous_roots,
            replaced_planes=replaced_planes,
            selectors=selectors,
        )
    )
    result[BUILD_MANIFEST] = canonical_json(
        build_manifest(
            result,
            previous=previous_manifest,
            replaced_planes=replaced_planes,
            selectors=selectors,
        )
    )
    return result


def _atomic_write_if_changed(path: Path, content: str | bytes) -> bool:
    raw = content_bytes(content)
    try:
        if path.is_file() and path.read_bytes() == raw:
            return False
    except OSError:
        pass
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "wb") as stream:
            stream.write(raw)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()
    return True


def atomic_write_if_changed(path: Path, content: str | bytes) -> bool:
    """Public wrapper used for evidence envelopes outside the candidate."""

    return _atomic_write_if_changed(path, content)


def write_managed_files(output: Path, files: dict[Path, str | bytes]) -> dict[str, int]:
    """Atomically write changed files and remove only previously owned stale files."""

    previous = load_json(output / BUILD_MANIFEST) or {}
    old_entries = manifest_entry_map(previous.get("entries", []))
    if not old_entries:
        # One-time migration from the v1 integrity receipt.  Those entries are
        # an explicit generated-file manifest, so adopting them does not grant
        # permission to scan or delete arbitrary neighbours such as .DS_Store.
        prior_roots = load_json(output / PLANE_ROOTS) or {}
        old_entries = manifest_entry_map(
            row
            for plane in prior_roots.get("planes", {}).values()
            for row in plane.get("entries", [])
        )
    next_manifest_text = files.get(BUILD_MANIFEST)
    if next_manifest_text is None:
        raise ValueError("managed output set has no assurance/build-manifest.json")
    next_manifest = json.loads(content_bytes(next_manifest_text).decode("utf-8"))
    next_paths = manifest_paths(next_manifest.get("entries", []))

    stale_paths = set(old_entries) - next_paths
    for relative in sorted(stale_paths, key=lambda path: path.as_posix()):
        target = safe_output_target(output, relative)
        if not target.exists() and not target.is_symlink():
            continue
        if target.is_symlink() or not target.is_file():
            raise ValueError(f"refusing to remove modified builder-owned path: {relative}")
        expected_sha256 = old_entries[relative].get("sha256")
        current_sha256 = sha256_bytes(target.read_bytes())
        if not expected_sha256 or current_sha256 != expected_sha256:
            raise ValueError(f"refusing to remove modified builder-owned file: {relative}")

    changed = 0
    for path, content in sorted(
        ((path, content) for path, content in files.items() if path != BUILD_MANIFEST),
        key=lambda row: row[0].as_posix(),
    ):
        changed += int(_atomic_write_if_changed(safe_output_target(output, path), content))

    removed = 0
    for relative in sorted(stale_paths, key=lambda path: len(path.parts), reverse=True):
        target = safe_output_target(output, relative)
        if target.is_file() or target.is_symlink():
            target.unlink()
            removed += 1
        parent = target.parent
        while parent != output:
            try:
                parent.rmdir()
            except OSError:
                break
            parent = parent.parent
    changed += int(
        _atomic_write_if_changed(
            safe_output_target(output, BUILD_MANIFEST), files[BUILD_MANIFEST]
        )
    )
    return {"changed": changed, "unchanged": len(files) - changed, "removed": removed}


def check_managed_files(output: Path, files: dict[Path, str | bytes]) -> list[str]:
    errors: list[str] = []
    for relative, expected in sorted(files.items(), key=lambda row: row[0].as_posix()):
        target = output / relative
        if not target.is_file():
            errors.append(f"{target} is missing")
        elif target.read_bytes() != content_bytes(expected):
            errors.append(f"{target} is out of date")
    expected_manifest_text = files.get(BUILD_MANIFEST)
    if expected_manifest_text is not None:
        expected_manifest = json.loads(content_bytes(expected_manifest_text).decode("utf-8"))
        expected_owned = {row["path"] for row in expected_manifest.get("entries", [])}
        current_manifest = load_json(output / BUILD_MANIFEST) or {}
        current_owned = {row["path"] for row in current_manifest.get("entries", [])}
        for stale in sorted(current_owned - expected_owned):
            errors.append(f"{output / stale} is a stale builder-owned file")
    return errors
