#!/usr/bin/env python3
"""Fail closed unless an exported publication tree exactly matches its manifest."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath

from plane_root_validation import validate_plane_roots


MANIFEST_NAME = "publication-unit-manifest.json"
EXPECTED_SCHEMA = "okf-publication-unit-manifest.v1"
PROMOTION_ENVELOPE = "release-assurance/heritage-publication-envelope.json"


def canonical_json(value: object) -> bytes:
    return (
        json.dumps(
            value,
            ensure_ascii=False,
            separators=(",", ":"),
            sort_keys=True,
        )
        + "\n"
    ).encode("utf-8")


def digest(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def safe_path(value: object) -> PurePosixPath:
    if not isinstance(value, str) or not value or "\\" in value:
        raise RuntimeError(f"unsafe manifest path: {value!r}")
    path = PurePosixPath(value)
    if path.is_absolute() or path.as_posix() != value or ".." in path.parts:
        raise RuntimeError(f"unsafe manifest path: {value!r}")
    return path


def validate_rooted_receipts(root: Path, material_paths: set[str]) -> None:
    roots_path = "assurance/plane-roots.json"
    if roots_path not in material_paths:
        raise RuntimeError("publication tree has no assurance/plane-roots.json")
    roots = json.loads((root / roots_path).read_text(encoding="utf-8"))
    validate_plane_roots(
        roots,
        read_bytes=lambda path: (root / path).read_bytes(),
        owned_paths=material_paths,
        label="publication tree plane roots",
    )

    build_manifest_path = "assurance/build-manifest.json"
    if build_manifest_path not in material_paths:
        raise RuntimeError("publication tree has no assurance/build-manifest.json")
    build_manifest = json.loads(
        (root / build_manifest_path).read_text(encoding="utf-8")
    )
    for entry in build_manifest["entries"]:
        path = safe_path(entry["path"]).as_posix()
        if path not in material_paths:
            raise RuntimeError(f"build manifest references unowned material: {path}")
        raw = (root / path).read_bytes()
        if len(raw) != entry["bytes"] or digest(raw) != entry["sha256"]:
            raise RuntimeError(f"build manifest entry differs: {path}")


def validate_publication_tree(root: Path) -> dict[str, object]:
    root = root.resolve()
    manifest_path = root / MANIFEST_NAME
    if not manifest_path.is_file():
        raise RuntimeError(f"missing publication manifest: {manifest_path}")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("schema") != EXPECTED_SCHEMA:
        raise RuntimeError("unsupported publication manifest schema")
    materials = manifest.get("materials")
    if not isinstance(materials, list) or manifest.get("file_count") != len(materials):
        raise RuntimeError("publication manifest file count differs")
    if materials != sorted(materials, key=lambda item: item.get("path", "")):
        raise RuntimeError("publication manifest materials are not path ordered")
    if digest(canonical_json(materials)) != manifest.get("tree_sha256"):
        raise RuntimeError("publication manifest tree digest differs")

    claims: dict[str, dict[str, object]] = {}
    for item in materials:
        if not isinstance(item, dict):
            raise RuntimeError("publication manifest material is not an object")
        path = safe_path(item.get("path")).as_posix()
        if path in claims:
            raise RuntimeError(f"duplicate publication material: {path}")
        if path == MANIFEST_NAME or path == PROMOTION_ENVELOPE:
            raise RuntimeError(f"evidence/control file cannot be candidate material: {path}")
        target = root / path
        if target.is_symlink() or not target.is_file():
            raise RuntimeError(f"publication material is missing or a symlink: {path}")
        raw = target.read_bytes()
        if len(raw) != item.get("bytes") or digest(raw) != item.get("sha256"):
            raise RuntimeError(f"publication material differs from manifest: {path}")
        claims[path] = item

    observed: set[str] = set()
    for target in root.rglob("*"):
        if target.is_symlink():
            raise RuntimeError(
                f"publication tree contains a symlink: {target.relative_to(root)}"
            )
        if target.is_file():
            observed.add(target.relative_to(root).as_posix())
    expected = set(claims) | {MANIFEST_NAME}
    if observed != expected:
        added = sorted(observed - expected)
        missing = sorted(expected - observed)
        raise RuntimeError(
            f"publication tree closure differs: extra={added!r} missing={missing!r}"
        )
    validate_rooted_receipts(root, set(claims))
    return manifest


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("publication_root", type=Path)
    args = parser.parse_args(argv)
    manifest = validate_publication_tree(args.publication_root)
    print(
        f"publication tree is exact: files={manifest['file_count']} "
        f"tree_sha256={manifest['tree_sha256']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
