#!/usr/bin/env python3
"""Content-address and assemble independently reusable static Site components."""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable


COMPONENT_SCHEMA = "okf-site-component.v1"
ASSEMBLY_SCHEMA = "okf-site-assembly.v1"
TREE_ALGORITHM = "sha256-canonical-json-materials-v1"
IGNORED_PLATFORM_NAMES = {".DS_Store"}


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


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


def safe_relative_path(value: str) -> Path:
    path = Path(value)
    if (
        not value
        or path.is_absolute()
        or value.startswith("../")
        or "/../" in value
        or "\\" in value
        or path.as_posix() != value
    ):
        raise RuntimeError(f"unsafe component material path: {value!r}")
    return path


def tree_materials(root: Path) -> list[dict[str, object]]:
    materials: list[dict[str, object]] = []
    if not root.exists():
        return materials
    for path in sorted(
        (
            item
            for item in root.rglob("*")
            if item.is_file() and item.name not in IGNORED_PLATFORM_NAMES
        ),
        key=lambda item: item.relative_to(root).as_posix(),
    ):
        raw = path.read_bytes()
        materials.append(
            {
                "path": path.relative_to(root).as_posix(),
                "bytes": len(raw),
                "sha256": sha256_bytes(raw),
            }
        )
    return materials


def source_fingerprint(
    root: Path,
    sources: Iterable[Path],
    *,
    include: Callable[[Path], bool] | None = None,
) -> tuple[str, list[dict[str, object]]]:
    """Hash a stable, de-duplicated source closure without writing output."""

    selected: set[Path] = set()
    for source in sources:
        resolved = source.resolve()
        if resolved.is_dir():
            selected.update(item.resolve() for item in resolved.rglob("*") if item.is_file())
        elif resolved.is_file():
            selected.add(resolved)

    materials: list[dict[str, object]] = []
    root_resolved = root.resolve()
    for path in sorted(selected, key=lambda item: item.as_posix()):
        try:
            relative = path.relative_to(root_resolved)
        except ValueError as error:
            raise RuntimeError(f"component source escapes repository root: {path}") from error
        if include is not None and not include(relative):
            continue
        raw = path.read_bytes()
        materials.append(
            {
                "path": relative.as_posix(),
                "bytes": len(raw),
                "sha256": sha256_bytes(raw),
            }
        )
    return sha256_bytes(canonical_json(materials)), materials


@dataclass(frozen=True)
class ComponentArtifact:
    name: str
    input_sha256: str
    root: Path
    files: Path
    manifest: dict[str, object]


def _load_json(path: Path) -> dict[str, object]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise RuntimeError(f"cannot read component manifest {path}: {error}") from error
    if not isinstance(value, dict):
        raise RuntimeError(f"component manifest is not an object: {path}")
    return value


def verify_component(component_root: Path) -> ComponentArtifact:
    manifest_path = component_root / "component-manifest.json"
    manifest = _load_json(manifest_path)
    if manifest.get("schema") != COMPONENT_SCHEMA:
        raise RuntimeError(f"unsupported component manifest schema: {manifest_path}")
    name = manifest.get("component")
    input_sha256 = manifest.get("input_sha256")
    materials = manifest.get("materials")
    if not isinstance(name, str) or not isinstance(input_sha256, str):
        raise RuntimeError(f"invalid component identity: {manifest_path}")
    if not isinstance(materials, list):
        raise RuntimeError(f"invalid component materials: {manifest_path}")
    files = component_root / "files"
    observed = tree_materials(files)
    if observed != materials:
        raise RuntimeError(f"component bytes differ from manifest: {manifest_path}")
    tree_sha256 = sha256_bytes(canonical_json(observed))
    if manifest.get("tree_sha256") != tree_sha256:
        raise RuntimeError(f"component tree digest differs from manifest: {manifest_path}")
    return ComponentArtifact(name, input_sha256, component_root, files, manifest)


def materialize_component(
    cache_root: Path,
    name: str,
    input_sha256: str,
    input_materials: list[dict[str, object]],
    builder: Callable[[Path], None],
) -> tuple[ComponentArtifact, bool]:
    """Return one verified component, creating it atomically when absent."""

    component_root = cache_root / name / input_sha256
    if (component_root / "component-manifest.json").is_file():
        artifact = verify_component(component_root)
        if artifact.name != name or artifact.input_sha256 != input_sha256:
            raise RuntimeError(f"component cache identity mismatch: {component_root}")
        return artifact, True

    parent = component_root.parent
    parent.mkdir(parents=True, exist_ok=True)
    temporary = parent / f".build-{input_sha256}-{uuid.uuid4().hex}"
    files = temporary / "files"
    files.mkdir(parents=True)
    try:
        builder(files)
        materials = tree_materials(files)
        manifest = {
            "schema": COMPONENT_SCHEMA,
            "algorithm": TREE_ALGORITHM,
            "component": name,
            "input_sha256": input_sha256,
            "input_materials": input_materials,
            "file_count": len(materials),
            "tree_sha256": sha256_bytes(canonical_json(materials)),
            "materials": materials,
        }
        (temporary / "component-manifest.json").write_bytes(canonical_json(manifest))
        if component_root.exists():
            shutil.rmtree(temporary)
        else:
            os.replace(temporary, component_root)
    except BaseException:
        shutil.rmtree(temporary, ignore_errors=True)
        raise
    return verify_component(component_root), False


def _atomic_copy(source: Path, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_name(f".{target.name}.site-{uuid.uuid4().hex}.tmp")
    try:
        shutil.copy2(source, temporary)
        os.replace(temporary, target)
    finally:
        temporary.unlink(missing_ok=True)


def _remove_empty_directories(root: Path) -> None:
    if not root.exists():
        return
    for directory in sorted(
        (path for path in root.rglob("*") if path.is_dir()),
        key=lambda path: len(path.parts),
        reverse=True,
    ):
        try:
            directory.rmdir()
        except OSError:
            pass


def assemble_components(
    artifacts: list[ComponentArtifact],
    output: Path,
    state_path: Path,
    *,
    allowed_overrides: dict[str, str] | None = None,
) -> dict[str, object]:
    """Merge components with changed-only writes and manifest-owned cleanup."""

    allowed = allowed_overrides or {}
    final: dict[str, tuple[ComponentArtifact, dict[str, object]]] = {}
    for artifact in artifacts:
        materials = artifact.manifest["materials"]
        assert isinstance(materials, list)
        for material in materials:
            if not isinstance(material, dict) or not isinstance(material.get("path"), str):
                raise RuntimeError(f"invalid material in component {artifact.name}")
            path = material["path"]
            safe_relative_path(path)
            previous = final.get(path)
            if previous is not None:
                previous_artifact, previous_material = previous
                same_bytes = (
                    previous_material.get("bytes") == material.get("bytes")
                    and previous_material.get("sha256") == material.get("sha256")
                )
                if not same_bytes and allowed.get(path) != artifact.name:
                    raise RuntimeError(
                        "Site component collision without an explicit final owner: "
                        f"{path} ({previous_artifact.name}, {artifact.name})"
                    )
            final[path] = (artifact, material)

    previous_materials: dict[str, dict[str, object]] = {}
    if state_path.is_file():
        state = _load_json(state_path)
        if state.get("schema") != ASSEMBLY_SCHEMA:
            raise RuntimeError(f"unsupported Site assembly state: {state_path}")
        raw_materials = state.get("materials")
        if not isinstance(raw_materials, list):
            raise RuntimeError(f"invalid Site assembly state materials: {state_path}")
        for material in raw_materials:
            if not isinstance(material, dict) or not isinstance(material.get("path"), str):
                raise RuntimeError(f"invalid Site assembly state material: {state_path}")
            safe_relative_path(material["path"])
            previous_materials[material["path"]] = material
    elif output.exists():
        # One bounded migration from the old whole-tree builder. Subsequent
        # cleanup is strictly limited to paths recorded in the state manifest.
        shutil.rmtree(output)

    output.mkdir(parents=True, exist_ok=True)
    changed = 0
    reused = 0
    for path, (artifact, material) in sorted(final.items()):
        relative = safe_relative_path(path)
        source = artifact.files / relative
        target = output / relative
        raw_matches = False
        if target.is_file() and target.stat().st_size == material.get("bytes"):
            raw_matches = sha256_bytes(target.read_bytes()) == material.get("sha256")
        if raw_matches:
            reused += 1
        else:
            _atomic_copy(source, target)
            changed += 1

    stale = sorted(set(previous_materials).difference(final))
    for path in stale:
        target = output / safe_relative_path(path)
        if not target.exists():
            continue
        previous = previous_materials[path]
        if not target.is_file():
            raise RuntimeError(f"managed Site path became non-file: {path}")
        raw = target.read_bytes()
        if (
            len(raw) != previous.get("bytes")
            or sha256_bytes(raw) != previous.get("sha256")
        ):
            raise RuntimeError(
                f"refusing to remove locally modified stale Site material: {path}"
            )
        target.unlink()
    _remove_empty_directories(output)

    materials = [
        {
            "path": path,
            "bytes": material["bytes"],
            "sha256": material["sha256"],
            "component": artifact.name,
        }
        for path, (artifact, material) in sorted(final.items())
    ]
    state = {
        "schema": ASSEMBLY_SCHEMA,
        "algorithm": TREE_ALGORITHM,
        "components": [
            {
                "component": artifact.name,
                "input_sha256": artifact.input_sha256,
                "tree_sha256": artifact.manifest["tree_sha256"],
            }
            for artifact in artifacts
        ],
        "file_count": len(materials),
        "tree_sha256": sha256_bytes(canonical_json(materials)),
        "materials": materials,
    }
    state_path.parent.mkdir(parents=True, exist_ok=True)
    temporary_state = state_path.with_name(f".{state_path.name}.{uuid.uuid4().hex}.tmp")
    temporary_state.write_bytes(canonical_json(state))
    os.replace(temporary_state, state_path)
    return {
        "changed_files": changed,
        "reused_files": reused,
        "removed_files": len(stale),
        "state": state,
    }
