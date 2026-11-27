#!/usr/bin/env python3
"""Check a retained producer manifest against a reviewed consumer profile.

This read-only compatibility check never executes contract commands and never
declares release readiness. The repository-specific release verifier remains
authoritative.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path, PurePosixPath
from typing import Any

PROFILE_SCHEMA = "okf-release-evidence-compatibility-profile.v1"
HEX64 = re.compile(r"^[0-9a-f]{64}$")
MAX_JSON_BYTES = 16 * 1024 * 1024


class CompatibilityError(ValueError):
    pass


def _unique_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise CompatibilityError(f"duplicate JSON key: {key}")
        result[key] = value
    return result


def load_json(path: Path, label: str) -> Any:
    if path.is_symlink() or not path.is_file():
        raise CompatibilityError(f"{label} is not a regular non-symlink file: {path}")
    if path.stat().st_size > MAX_JSON_BYTES:
        raise CompatibilityError(f"{label} exceeds the JSON size limit")
    try:
        return json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=_unique_object)
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise CompatibilityError(f"{label} is not valid UTF-8 JSON: {error}") from error


def pointer(value: Any, path: str) -> Any:
    if path == "":
        return value
    if not path.startswith("/"):
        raise CompatibilityError(f"JSON Pointer must start with '/': {path}")
    current = value
    for encoded in path[1:].split("/"):
        part = encoded.replace("~1", "/").replace("~0", "~")
        if isinstance(current, dict) and part in current:
            current = current[part]
        elif isinstance(current, list) and part.isdecimal() and int(part) < len(current):
            current = current[int(part)]
        else:
            raise KeyError(path)
    return current


def load_profile(path: Path) -> dict[str, Any]:
    value = load_json(path, "compatibility profile")
    if not isinstance(value, dict) or value.get("schema") != PROFILE_SCHEMA:
        raise CompatibilityError(f"profile schema must be {PROFILE_SCHEMA}")
    if not isinstance(value.get("producer"), dict):
        raise CompatibilityError("profile producer must be an object")
    if any(not isinstance(value["producer"].get(field), str) or not value["producer"][field] for field in ("name", "version")):
        raise CompatibilityError("profile producer needs a name and version")
    if not isinstance(value.get("schemas"), list) or not value["schemas"]:
        raise CompatibilityError("profile schemas must be a non-empty array")
    if not isinstance(value.get("manifest_expectations"), dict):
        raise CompatibilityError("profile manifest_expectations must be an object")
    allowed_profile = {"schema", "title", "purpose", "producer", "schemas", "manifest_expectations"}
    if set(value) - allowed_profile:
        raise CompatibilityError(f"unknown profile keys: {', '.join(sorted(set(value) - allowed_profile))}")
    for row in value["schemas"]:
        if not isinstance(row, dict) or set(row) - {"filename", "sha256", "required_schema_values"}:
            raise CompatibilityError("profile schema entry has an invalid shape")
        if "required_schema_values" in row and not isinstance(row["required_schema_values"], list):
            raise CompatibilityError("profile required_schema_values must be an array")
        for requirement in row.get("required_schema_values", []):
            if (
                not isinstance(requirement, dict)
                or set(requirement) != {"pointer", "contains"}
                or not isinstance(requirement.get("pointer"), str)
                or not requirement["pointer"].startswith("/")
                or not isinstance(requirement.get("contains"), list)
                or any(not isinstance(item, str) for item in requirement["contains"])
            ):
                raise CompatibilityError("profile required_schema_values entry has an invalid shape")
    allowed = {
        "producer_pointer", "required_paths", "equals", "required_non_empty",
        "forbidden_paths", "artifacts_pointer", "required_artifact_paths",
    }
    expectations = value["manifest_expectations"]
    unknown = set(expectations) - allowed
    if unknown:
        raise CompatibilityError(f"unknown manifest expectation keys: {', '.join(sorted(unknown))}")
    for key in ("required_paths", "required_non_empty", "forbidden_paths"):
        if key in expectations and (
            not isinstance(expectations[key], list)
            or any(not isinstance(item, str) or not item.startswith("/") for item in expectations[key])
        ):
            raise CompatibilityError(f"profile {key} must be an array of JSON Pointers")
    if "required_artifact_paths" in expectations and (
        not isinstance(expectations["required_artifact_paths"], list)
        or any(not isinstance(item, str) or not item for item in expectations["required_artifact_paths"])
    ):
        raise CompatibilityError("profile required_artifact_paths must be an array of relative paths")
    if not expectations.get("required_artifact_paths"):
        raise CompatibilityError("profile must declare required_artifact_paths")
    if "artifacts_pointer" not in expectations:
        raise CompatibilityError("profile must declare artifacts_pointer")
    if "artifacts_pointer" in expectations and (
        not isinstance(expectations["artifacts_pointer"], str)
        or not expectations["artifacts_pointer"].startswith("/")
    ):
        raise CompatibilityError("profile artifacts_pointer must be a JSON Pointer")
    if "equals" in expectations and (
        not isinstance(expectations["equals"], dict)
        or any(not isinstance(key, str) or not key.startswith("/") for key in expectations["equals"])
    ):
        raise CompatibilityError("profile equals must map JSON Pointers to expected values")
    return value


def check_schemas(profile: dict[str, Any], schema_dir: Path) -> list[str]:
    errors: list[str] = []
    for row in profile["schemas"]:
        if not isinstance(row, dict):
            errors.append("profile schema entry must be an object")
            continue
        name, expected_hash = row.get("filename"), row.get("sha256")
        if not isinstance(name, str) or Path(name).name != name or not HEX64.fullmatch(str(expected_hash)):
            errors.append("profile schema entry needs a filename and SHA-256")
            continue
        path = schema_dir / name
        try:
            schema = load_json(path, f"producer schema {name}")
            if hashlib.sha256(path.read_bytes()).hexdigest() != expected_hash:
                errors.append(f"producer schema {name} SHA-256 differs from the profile")
        except (OSError, CompatibilityError) as error:
            errors.append(str(error))
            continue
        for requirement in row.get("required_schema_values", []):
            try:
                actual = pointer(schema, requirement["pointer"])
            except (KeyError, TypeError):
                errors.append(f"producer schema {name} lacks {requirement.get('pointer')}")
                continue
            expected = requirement.get("contains")
            if not isinstance(actual, list) or not isinstance(expected, list) or not set(expected) <= set(actual):
                errors.append(f"producer schema {name} does not guarantee {expected} at {requirement.get('pointer')}")
    return errors


def artifact_file(root: Path, relative: str) -> Path:
    if root.is_symlink() or not root.is_dir():
        raise CompatibilityError(f"scan directory is not a regular directory: {root}")
    path = PurePosixPath(relative)
    if not relative or "\\" in relative or path.is_absolute() or ".." in path.parts or "." in path.parts:
        raise CompatibilityError(f"manifest artifact path is unsafe: {relative}")
    candidate = root.joinpath(*path.parts)
    current = root
    for part in path.parts:
        current /= part
        if current.is_symlink():
            raise CompatibilityError(f"manifest artifact path contains a symlink: {relative}")
    if not candidate.is_file() or not candidate.resolve().is_relative_to(root.resolve()):
        raise CompatibilityError(f"manifest artifact is missing or outside the scan directory: {relative}")
    return candidate


def check_manifest(profile: dict[str, Any], manifest_path: Path, scan_dir: Path | None) -> list[str]:
    try:
        manifest = load_json(manifest_path, "producer manifest")
    except CompatibilityError as error:
        return [str(error)]
    if not isinstance(manifest, dict):
        return ["producer manifest must be an object"]

    expectations = profile["manifest_expectations"]
    errors: list[str] = []
    for path in expectations.get("required_paths", []):
        try:
            pointer(manifest, path)
        except KeyError:
            errors.append(f"producer output lacks required field {path}")
    for path, expected in expectations.get("equals", {}).items():
        try:
            actual = pointer(manifest, path)
        except KeyError:
            errors.append(f"producer output lacks required field {path}")
            continue
        if actual != expected:
            errors.append(f"producer output {path} differs from the profile")
    for path in expectations.get("required_non_empty", []):
        try:
            actual = pointer(manifest, path)
        except KeyError:
            errors.append(f"producer output lacks required field {path}")
            continue
        if not isinstance(actual, str) or not actual.strip():
            errors.append(f"producer output {path} must be a non-empty string")
    for path in expectations.get("forbidden_paths", []):
        try:
            pointer(manifest, path)
        except KeyError:
            continue
        errors.append(f"producer output contains incompatible field {path}")
    try:
        producer = pointer(manifest, expectations.get("producer_pointer", "/scan/producer"))
        if producer != profile["producer"]:
            errors.append("producer name or version differs from the profile")
    except KeyError:
        errors.append("producer output lacks its declared producer identity")

    artifact_root = scan_dir or manifest_path.parent
    if scan_dir is not None or "required_artifact_paths" in expectations or "artifacts_pointer" in expectations:
        artifact_pointer = expectations.get("artifacts_pointer", "/scan/artifacts")
        try:
            rows = pointer(manifest, artifact_pointer)
        except KeyError:
            errors.append(f"producer output lacks required field {artifact_pointer}")
            rows = None
        if rows is None:
            errors.append("producer artifact inventory must be a non-null array")
        elif not isinstance(rows, list):
            errors.append("producer artifact inventory must be an array")
        else:
            paths: set[str] = set()
            for row in rows:
                if not isinstance(row, dict):
                    errors.append("manifest artifact entry must be an object")
                    continue
                relative, expected_hash = row.get("path"), row.get("sha256")
                if not isinstance(relative, str) or relative in paths:
                    errors.append("manifest artifact paths are missing or duplicated")
                    continue
                paths.add(relative)
                if not isinstance(expected_hash, str) or not HEX64.fullmatch(expected_hash):
                    errors.append(f"manifest artifact SHA-256 is invalid: {relative}")
                    continue
                try:
                    with artifact_file(artifact_root, relative).open("rb") as stream:
                        actual_hash = hashlib.file_digest(stream, "sha256").hexdigest()
                except CompatibilityError as error:
                    errors.append(str(error))
                    continue
                if actual_hash != expected_hash:
                    errors.append(f"producer artifact changed after sealing: {relative}")
            for required in expectations.get("required_artifact_paths", []):
                if required not in paths:
                    errors.append(f"sealed manifest does not bind required artifact {required}")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--profile", type=Path, required=True)
    parser.add_argument("--schema-dir", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--scan-dir", type=Path)
    args = parser.parse_args()
    try:
        profile = load_profile(args.profile)
        errors = check_schemas(profile, args.schema_dir)
        errors.extend(check_manifest(profile, args.manifest, args.scan_dir))
    except CompatibilityError as error:
        errors = [str(error)]
        profile = {"producer": {}}
    result = {
        "schema": "okf-release-evidence-compatibility-result.v1",
        "producer": profile["producer"],
        "compatibility": "incompatible" if errors else "compatible",
        "release_readiness": "not-assessed",
        "errors": errors,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
