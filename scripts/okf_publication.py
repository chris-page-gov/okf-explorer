#!/usr/bin/env python3
"""Load and inspect an OKF repository publication contract safely.

Command strings in the contract are declarations.  This module validates and
selects their identifiers, but deliberately provides no command executor.
"""

from __future__ import annotations

import fnmatch
import json
from collections.abc import Iterable, Mapping, Sequence
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource


EXPLORER_ROOT = Path(__file__).resolve().parents[1]
PROFILE_ROOT = EXPLORER_ROOT / "profiles" / "publication-method" / "v1"
CONTRACT_NAME = "okf.publication.json"
SCHEMA_NAME = "repository-publication.schema.json"
SOURCE_FAMILY_SCHEMA_NAME = "source-family.schema.json"


class PublicationContractError(ValueError):
    """Raised when a publication contract cannot be trusted."""


def _json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as error:
        raise PublicationContractError(
            f"missing publication material: {path}"
        ) from error
    except json.JSONDecodeError as error:
        raise PublicationContractError(
            f"invalid JSON in {path}: line {error.lineno}, column {error.colno}: {error.msg}"
        ) from error


def _schema_validator(schema_root: Path) -> Draft202012Validator:
    schemas = [
        _json(schema_root / SCHEMA_NAME),
        _json(schema_root / SOURCE_FAMILY_SCHEMA_NAME),
    ]
    registry = Registry()
    for schema in schemas:
        if not isinstance(schema, dict) or not isinstance(schema.get("$id"), str):
            raise PublicationContractError("publication profile schema has no absolute $id")
        Draft202012Validator.check_schema(schema)
        registry = registry.with_resource(schema["$id"], Resource.from_contents(schema))
    return Draft202012Validator(
        schemas[0],
        registry=registry,
        format_checker=FormatChecker(),
    )


def _render_json_path(parts: Iterable[object]) -> str:
    rendered = "$"
    for part in parts:
        if isinstance(part, int):
            rendered += f"[{part}]"
        else:
            rendered += f".{part}"
    return rendered


def _normalise_changed_path(path: str) -> str:
    value = path.strip().replace("\\", "/")
    if not value or value.startswith("/"):
        raise PublicationContractError(f"changed path is not repository-relative: {path!r}")
    parts = value.split("/")
    if any(part in {"", ".", ".."} for part in parts):
        raise PublicationContractError(f"changed path is not canonical: {path!r}")
    return value


def path_matches(path: str, pattern: str) -> bool:
    """Match one canonical repository path against a contract path pattern.

    A trailing slash denotes a subtree.  In other patterns, ``*`` and ``?``
    stay within one path segment and ``**`` spans any number of segments.
    """

    path = _normalise_changed_path(path)
    if pattern.endswith("/"):
        return path.startswith(pattern)

    path_parts = path.split("/")
    pattern_parts = pattern.split("/")

    def match(path_index: int, pattern_index: int) -> bool:
        if pattern_index == len(pattern_parts):
            return path_index == len(path_parts)
        component = pattern_parts[pattern_index]
        if component == "**":
            return match(path_index, pattern_index + 1) or (
                path_index < len(path_parts) and match(path_index + 1, pattern_index)
            )
        return (
            path_index < len(path_parts)
            and fnmatch.fnmatchcase(path_parts[path_index], component)
            and match(path_index + 1, pattern_index + 1)
        )

    return match(0, 0)


def matches_any(path: str, patterns: Iterable[str]) -> bool:
    return any(path_matches(path, pattern) for pattern in patterns)


def _ids(
    items: Sequence[Mapping[str, Any]], label: str, errors: list[str]
) -> dict[str, Mapping[str, Any]]:
    result: dict[str, Mapping[str, Any]] = {}
    for item in items:
        identifier = str(item["id"])
        if identifier in result:
            errors.append(f"duplicate {label} ID: {identifier}")
        result[identifier] = item
    return result


def _referenced_ids(
    identifiers: Iterable[str],
    available: Mapping[str, Any],
    location: str,
    errors: list[str],
) -> None:
    for identifier in identifiers:
        if identifier not in available:
            errors.append(f"{location} references unknown ID: {identifier}")


def _safe_repository_target(root: Path, relative: str) -> Path:
    root = root.resolve()
    target = root.joinpath(*relative.split("/")).resolve(strict=False)
    if target != root and root not in target.parents:
        raise PublicationContractError(
            f"repository path escapes the repository: {relative}"
        )
    return target


def _require_file(root: Path, relative: str, location: str, errors: list[str]) -> None:
    try:
        target = _safe_repository_target(root, relative)
    except PublicationContractError as error:
        errors.append(f"{location}: {error}")
        return
    if not target.is_file():
        errors.append(f"{location} does not name an existing file: {relative}")


def _check_repository_path(
    root: Path, relative: str, location: str, errors: list[str]
) -> None:
    try:
        _safe_repository_target(root, relative)
    except PublicationContractError as error:
        errors.append(f"{location}: {error}")


def _check_plane_dag(planes: Mapping[str, Mapping[str, Any]], errors: list[str]) -> None:
    state: dict[str, int] = {}
    trail: list[str] = []

    def visit(identifier: str) -> None:
        current = state.get(identifier, 0)
        if current == 2:
            return
        if current == 1:
            start = trail.index(identifier)
            errors.append(
                "plane dependency cycle: "
                + " -> ".join([*trail[start:], identifier])
            )
            return
        state[identifier] = 1
        trail.append(identifier)
        for dependency in planes[identifier]["depends_on"]:
            if dependency in planes:
                visit(dependency)
        trail.pop()
        state[identifier] = 2

    for identifier in planes:
        visit(identifier)


def contract_errors(contract: Mapping[str, Any], root: Path) -> list[str]:
    """Return cross-reference, repository-path and plane-DAG errors."""

    errors: list[str] = []
    commands = _ids(contract["tooling"]["commands"], "command", errors)
    planes = _ids(contract["planes"], "plane", errors)
    source_families = _ids(contract["source_families"], "source family", errors)

    for identifier, plane in planes.items():
        dependencies = plane["depends_on"]
        _referenced_ids(dependencies, planes, f"plane {identifier}.depends_on", errors)
        if identifier in dependencies:
            errors.append(f"plane {identifier} depends on itself")
        _referenced_ids(
            plane["command_ids"], commands, f"plane {identifier}.command_ids", errors
        )
        for command_id in plane["command_ids"]:
            command = commands.get(command_id)
            if command is not None and identifier not in command["planes"]:
                errors.append(
                    f"plane {identifier} selects command {command_id}, "
                    "but the command does not declare that plane"
                )

    for identifier, command in commands.items():
        _referenced_ids(command["planes"], planes, f"command {identifier}.planes", errors)
        _require_file(root, command["source"], f"command {identifier}.source", errors)

    for identifier, family in source_families.items():
        _referenced_ids(
            family["invalidates"],
            planes,
            f"source family {identifier}.invalidates",
            errors,
        )
        _referenced_ids(
            family["extraction"]["command_ids"],
            commands,
            f"source family {identifier}.extraction.command_ids",
            errors,
        )
        controls = family.get("workbook_controls", {})
        for key in ("active_content_command_id", "external_refresh_command_id"):
            if key in controls:
                _referenced_ids(
                    [controls[key]],
                    commands,
                    f"source family {identifier}.{key}",
                    errors,
                )
        _check_repository_path(
            root,
            family["inventory"]["manifest_path"],
            f"source family {identifier}.inventory.manifest_path",
            errors,
        )

    for index, boundary in enumerate(contract["boundaries"]["authored"]):
        if "source_family_id" in boundary:
            _referenced_ids(
                [boundary["source_family_id"]],
                source_families,
                f"boundaries.authored[{index}].source_family_id",
                errors,
            )

    for index, boundary in enumerate(contract["boundaries"]["generated"]):
        plane_id = boundary["plane"]
        _referenced_ids([plane_id], planes, f"boundaries.generated[{index}].plane", errors)
        for key in ("build_command_ids", "check_command_ids"):
            _referenced_ids(
                boundary[key], commands, f"boundaries.generated[{index}].{key}", errors
            )
        if not any(character in boundary["path"] for character in "*?["):
            _check_repository_path(
                root,
                boundary["path"],
                f"boundaries.generated[{index}].path",
                errors,
            )

    lockstep_id = contract["lockstep"]["check_command_id"]
    _referenced_ids([lockstep_id], commands, "lockstep.check_command_id", errors)
    if lockstep_id in commands and commands[lockstep_id]["kind"] not in {"check", "test"}:
        errors.append("lockstep.check_command_id must select a check or test command")

    browser = contract["ci"]["browser"]
    for location, identifiers in (
        ("ci.browser.ordinary.command_ids", browser["ordinary"]["command_ids"]),
        ("ci.browser.cross_engine.command_ids", browser["cross_engine"]["command_ids"]),
        (
            "ci.browser.cross_engine.installation.command_ids",
            browser["cross_engine"]["installation"]["command_ids"],
        ),
    ):
        _referenced_ids(identifiers, commands, location, errors)

    _referenced_ids(
        contract["verification"]["command_ids"],
        commands,
        "verification.command_ids",
        errors,
    )

    _ids(contract["publication"]["targets"], "publication target", errors)
    _ids(contract["verification"]["journeys"], "verification journey", errors)

    _require_file(root, contract["repository"]["root_index"], "repository.root_index", errors)
    _require_file(root, contract["semantic_contract"]["path"], "semantic_contract.path", errors)
    _require_file(root, contract["lockstep"]["changelog_path"], "lockstep.changelog_path", errors)
    for index, path in enumerate(contract["ci"]["workflow_paths"]):
        _require_file(root, path, f"ci.workflow_paths[{index}]", errors)
    for index, path in enumerate(contract["publication"]["authority"]["evidence_paths"]):
        _require_file(
            root,
            path,
            f"publication.authority.evidence_paths[{index}]",
            errors,
        )
    for index, target in enumerate(contract["publication"]["targets"]):
        _require_file(
            root,
            target["workflow_path"],
            f"publication.targets[{index}].workflow_path",
            errors,
        )

    _check_plane_dag(planes, errors)
    return errors


def validate_publication_contract(
    contract: Any,
    *,
    root: Path,
    schema_root: Path = PROFILE_ROOT,
) -> dict[str, Any]:
    """Validate a decoded contract and return it with a precise dictionary type."""

    validator = _schema_validator(schema_root)
    schema_errors = sorted(
        validator.iter_errors(contract),
        key=lambda error: (list(error.absolute_path), error.message),
    )
    if schema_errors:
        messages = [
            f"{_render_json_path(error.absolute_path)}: {error.message}"
            for error in schema_errors
        ]
        raise PublicationContractError(
            "publication contract schema validation failed:\n- " + "\n- ".join(messages)
        )
    if not isinstance(contract, dict):
        raise PublicationContractError("publication contract must be a JSON object")
    errors = contract_errors(contract, root)
    if errors:
        raise PublicationContractError(
            "publication contract integrity checks failed:\n- " + "\n- ".join(errors)
        )
    return contract


def load_publication_contract(
    root: Path,
    contract_path: Path | None = None,
    *,
    schema_root: Path = PROFILE_ROOT,
) -> dict[str, Any]:
    root = root.resolve()
    path = contract_path or root / CONTRACT_NAME
    if not path.is_absolute():
        path = root / path
    return validate_publication_contract(_json(path), root=root, schema_root=schema_root)


def downstream_plane_closure(
    contract: Mapping[str, Any], direct: Iterable[str]
) -> list[str]:
    """Return directly affected planes and every transitive dependent plane."""

    affected = set(direct)
    changed = True
    while changed:
        changed = False
        for plane in contract["planes"]:
            if plane["id"] not in affected and affected.intersection(plane["depends_on"]):
                affected.add(plane["id"])
                changed = True
    return [plane["id"] for plane in contract["planes"] if plane["id"] in affected]


def build_impact_plan(
    contract: Mapping[str, Any], changed_paths: Iterable[str]
) -> dict[str, Any]:
    """Build a fail-closed dependency plan without executing declared commands."""

    paths = sorted({_normalise_changed_path(path) for path in changed_paths})
    direct: set[str] = set()
    unknown: list[str] = []
    matched_families: set[str] = set()
    for path in paths:
        matched = False
        for plane in contract["planes"]:
            if matches_any(path, plane["paths"]):
                direct.add(plane["id"])
                matched = True
        for family in contract["source_families"]:
            if matches_any(path, family["paths"]):
                direct.update(family["invalidates"])
                matched_families.add(family["id"])
                matched = True
        if not matched:
            unknown.append(path)

    fail_closed = bool(unknown)
    if fail_closed:
        closure = [plane["id"] for plane in contract["planes"]]
        command_ids = [command["id"] for command in contract["tooling"]["commands"]]
    else:
        closure = downstream_plane_closure(contract, direct)
        selected = {
            identifier
            for plane in contract["planes"]
            if plane["id"] in closure
            for identifier in plane["command_ids"]
        }
        selected.update(
            command["id"]
            for command in contract["tooling"]["commands"]
            if set(command["planes"]).intersection(closure)
        )
        command_ids = [
            command["id"]
            for command in contract["tooling"]["commands"]
            if command["id"] in selected
        ]

    return {
        "schema": "okf-publication-impact-plan.v1",
        "fail_closed": fail_closed,
        "changed_paths": paths,
        "unknown_paths": unknown,
        "matched_source_family_ids": sorted(matched_families),
        "direct_plane_ids": [
            plane["id"] for plane in contract["planes"] if plane["id"] in direct
        ],
        "affected_plane_ids": closure,
        "command_ids": command_ids,
    }
