#!/usr/bin/env python3
"""Create a deterministic, fail-closed Evaluation Foundry impact plan."""

from __future__ import annotations

import argparse
import fnmatch
import hashlib
import json
import os
import subprocess
import sys
import tempfile
from collections import defaultdict, deque
from pathlib import Path, PurePosixPath
from typing import Any, Iterable

from ruamel.yaml import YAML


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PROFILE = (
    ROOT
    / "evaluation-foundry"
    / "fixtures"
    / "heritage-warwickshire"
    / "evaluation-profile.yaml"
)
JOB_IDS = (
    "python",
    "app",
    "browser_targeted",
    "browser_full",
    "foundry",
    "site",
    "docs",
    "release",
)
FIXTURE_ORDER = ("adversarial", "tiny", "faithful", "synthetic")
PLANE_JOB_DEFAULTS = {
    "control": {"python", "foundry"},
    "data": {"python", "app", "foundry"},
    "search": {"python", "app", "browser_targeted", "foundry"},
    "semantic": {"python", "app", "browser_targeted", "foundry"},
    "presentation": {"python", "browser_targeted", "site", "docs"},
    "release": {"release"},
    "source": {"python", "foundry"},
}


class ImpactPlanError(ValueError):
    """A profile, selector or Git input cannot produce a trustworthy plan."""


def load_profile(path: Path) -> dict[str, Any]:
    try:
        value = YAML(typ="safe", pure=True).load(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, ValueError) as error:
        raise ImpactPlanError(f"cannot load profile {path}: {error}") from error
    if not isinstance(value, dict):
        raise ImpactPlanError(f"profile {path} must be an object")
    if value.get("schema") != "okf-evaluation-profile.v2":
        raise ImpactPlanError("impact planning requires okf-evaluation-profile.v2")
    return value


def canonical_profile_sha256(profile: dict[str, Any]) -> str:
    payload = (
        json.dumps(profile, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        + "\n"
    ).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def normalize_changed_path(value: str) -> str:
    normalized = value.replace("\\", "/").strip()
    path = PurePosixPath(normalized)
    if (
        not normalized
        or normalized.startswith(("/", "~"))
        or any(part in {"", ".", ".."} for part in path.parts)
        or "\x00" in normalized
    ):
        raise ImpactPlanError(f"unsafe changed path {value!r}")
    return path.as_posix()


def _run_git(repository_root: Path, arguments: list[str]) -> list[str]:
    result = subprocess.run(
        ["git", *arguments],
        cwd=repository_root,
        check=False,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        detail = result.stderr.strip() or result.stdout.strip() or "git command failed"
        raise ImpactPlanError(detail)
    return [line for line in result.stdout.splitlines() if line]


def git_changed_paths(
    repository_root: Path,
    changed_from: str | None,
    changed_to: str | None = None,
) -> list[str]:
    paths: set[str] = set()
    if changed_from:
        # Triple-dot models a pull request from the merge base. Local staged,
        # unstaged and untracked work is unioned so the same command is safe in
        # a developer worktree and in a clean CI checkout.
        paths.update(
            _run_git(
                repository_root,
                [
                    "diff",
                    "--name-only",
                    "--diff-filter=ACDMRTUXB",
                    f"{changed_from}...{changed_to or 'HEAD'}",
                ],
            )
        )
    if changed_to is None:
        paths.update(
            _run_git(
                repository_root,
                ["diff", "--name-only", "--diff-filter=ACDMRTUXB", "HEAD"],
            )
        )
        paths.update(
            _run_git(repository_root, ["ls-files", "--others", "--exclude-standard"])
        )
    return sorted(normalize_changed_path(path) for path in paths)


def _git_blob(repository_root: Path, revision: str, path: str) -> bytes:
    result = subprocess.run(
        ["git", "show", f"{revision}:{path}"],
        cwd=repository_root,
        check=False,
        capture_output=True,
    )
    if result.returncode != 0:
        detail = result.stderr.decode("utf-8", errors="replace").strip()
        raise ImpactPlanError(
            f"cannot read plane-root receipt {path!r} at {revision!r}: {detail}"
        )
    return result.stdout


def _rooted_json_sha256(value: object) -> str:
    payload = (
        json.dumps(
            value,
            ensure_ascii=False,
            indent=2,
            sort_keys=True,
            separators=(",", ": "),
        )
        + "\n"
    ).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def _receipt_root_sha256(schema: object, value: object) -> str:
    if schema == "okf-evaluation-plane-roots.v1":
        payload = (
            json.dumps(
                value,
                ensure_ascii=False,
                sort_keys=True,
                separators=(",", ":"),
            )
            + "\n"
        ).encode("utf-8")
        return hashlib.sha256(payload).hexdigest()
    return _rooted_json_sha256(value)


def _validated_plane_root_digests(receipt: dict[str, Any]) -> dict[str, str]:
    """Recompute every receipt root from its ordered entry claims.

    The impact planner cannot cheaply load every historical corpus blob, but it
    must never trust a root string that is inconsistent with the receipt's own
    closure. Publication validation separately checks those entry claims against
    the candidate files.
    """

    planes = receipt.get("planes")
    if not isinstance(planes, dict) or not planes:
        raise ImpactPlanError("receipt has no planes object")
    roots: dict[str, str] = {}
    claimed_roots: dict[str, str] = {}
    for role, plane in sorted(planes.items()):
        if not isinstance(role, str) or not isinstance(plane, dict):
            raise ImpactPlanError("receipt plane must be a named object")
        entries = plane.get("entries")
        if not isinstance(entries, list):
            raise ImpactPlanError(f"plane {role!r} has no entries array")
        paths: list[str] = []
        byte_total = 0
        for index, entry in enumerate(entries):
            if not isinstance(entry, dict):
                raise ImpactPlanError(
                    f"plane {role!r} entry {index} must be an object"
                )
            path = entry.get("path")
            size = entry.get("bytes")
            digest = entry.get("sha256")
            if not isinstance(path, str):
                raise ImpactPlanError(f"plane {role!r} entry {index} has no path")
            normalize_changed_path(path)
            if not isinstance(size, int) or isinstance(size, bool) or size < 0:
                raise ImpactPlanError(
                    f"plane {role!r} entry {path!r} has invalid bytes"
                )
            if not (
                isinstance(digest, str)
                and len(digest) == 64
                and all(char in "0123456789abcdef" for char in digest)
            ):
                raise ImpactPlanError(
                    f"plane {role!r} entry {path!r} has invalid SHA-256"
                )
            paths.append(path)
            byte_total += size
        if paths != sorted(paths) or len(paths) != len(set(paths)):
            raise ImpactPlanError(
                f"plane {role!r} entries must be uniquely path ordered"
            )
        if plane.get("files") != len(entries) or plane.get("bytes") != byte_total:
            raise ImpactPlanError(f"plane {role!r} count or byte total differs")
        observed = _receipt_root_sha256(receipt.get("schema"), entries)
        if plane.get("root_sha256") != observed:
            raise ImpactPlanError(f"plane {role!r} root differs from its entries")
        claimed_roots[role] = observed
        # Compare a schema-neutral canonical entry manifest so a supported
        # receipt-format migration does not masquerade as a corpus change.
        roots[role] = _rooted_json_sha256(entries)
    release_basis = [
        {"plane": role, "root_sha256": digest}
        for role, digest in sorted(claimed_roots.items())
    ]
    if receipt.get("release_root_sha256") != _receipt_root_sha256(
        receipt.get("schema"), release_basis
    ):
        raise ImpactPlanError("release root differs from recomputed plane roots")
    return roots


def compare_plane_root_receipts(
    profile: dict[str, Any],
    repository_root: Path,
    changed_from: str,
    changed_to: str | None = None,
) -> dict[str, Any]:
    """Compare all declared old/new roots, failing closed on missing evidence."""

    policy = profile.get("impact_policy", {})
    receipt_paths = policy.get("root_receipts", []) if isinstance(policy, dict) else []
    contract = profile.get("consumer_contract", {})
    planes = contract.get("planes", []) if isinstance(contract, dict) else []
    expected_roles = {
        str(plane.get("role"))
        for plane in planes
        if isinstance(plane, dict) and plane.get("role") not in {None, "release"}
    }
    changed_roles: set[str] = set()
    observed_roles: set[str] = set()
    release_root_changed = False
    comparisons: list[dict[str, Any]] = []
    errors: list[str] = []

    for raw_path in receipt_paths:
        if not isinstance(raw_path, str):
            errors.append("impact_policy.root_receipts must contain strings")
            continue
        try:
            path = normalize_changed_path(raw_path)
            old_bytes = _git_blob(repository_root, changed_from, path)
            new_bytes = (
                _git_blob(repository_root, changed_to, path)
                if changed_to is not None
                else (repository_root / path).read_bytes()
            )
            old = json.loads(old_bytes)
            new = json.loads(new_bytes)
            if not isinstance(old, dict) or not isinstance(new, dict):
                raise ImpactPlanError("receipt root must be an object")
            supported_receipt_schemas = {
                "okf-evaluation-plane-roots.v1",
                "okf-evaluation-plane-roots.v2",
            }
            old_schema = old.get("schema")
            new_schema = new.get("schema")
            if (
                old_schema not in supported_receipt_schemas
                or new_schema not in supported_receipt_schemas
            ):
                raise ImpactPlanError(
                    "receipt schema must be okf-evaluation-plane-roots.v1 or v2"
                )
            old_roots = _validated_plane_root_digests(old)
            new_roots = _validated_plane_root_digests(new)
            missing_roles = expected_roles - (set(old_roots) & set(new_roots))
            if missing_roles:
                raise ImpactPlanError(
                    "receipt omits required plane role(s): "
                    + ", ".join(sorted(missing_roles))
                )
            receipt_changed: list[str] = []
            for role in sorted(expected_roles):
                old_digest = old_roots[role]
                new_digest = new_roots[role]
                observed_roles.add(role)
                if old_digest != new_digest:
                    changed_roles.add(role)
                    receipt_changed.append(role)
            old_release = old.get("release_root_sha256")
            new_release = new.get("release_root_sha256")
            if not all(
                isinstance(value, str)
                and len(value) == 64
                and all(char in "0123456789abcdef" for char in value)
                for value in (old_release, new_release)
            ):
                raise ImpactPlanError("receipt has an invalid release_root_sha256")
            if old_release != new_release:
                release_root_changed = True
            comparisons.append(
                {
                    "path": path,
                    "old_schema": old_schema,
                    "new_schema": new_schema,
                    "changed_roles": receipt_changed,
                    "release_root_changed": old_release != new_release,
                }
            )
        except (ImpactPlanError, OSError, json.JSONDecodeError) as error:
            errors.append(f"{raw_path}: {error}")

    trusted = (
        bool(receipt_paths)
        and not errors
        and observed_roles == expected_roles
        and len(comparisons) == len(receipt_paths)
    )
    return {
        "trusted": trusted,
        "changed_from": changed_from,
        "changed_to": changed_to or "WORKTREE",
        "changed_roles": sorted(changed_roles),
        "unchanged_roles": sorted(expected_roles - changed_roles),
        "release_root_changed": release_root_changed,
        "receipts": sorted(comparisons, key=lambda item: item["path"]),
        "errors": sorted(errors),
    }


def pattern_matches(path: str, pattern: str) -> bool:
    pattern = pattern.replace("\\", "/")
    if pattern.endswith("/**") and not any(
        character in pattern[:-3] for character in "*?["
    ):
        prefix = pattern[:-3].rstrip("/")
        return path == prefix or path.startswith(f"{prefix}/")
    return fnmatch.fnmatchcase(path, pattern)


def stable_order(values: Iterable[str], preferred: Iterable[str] = ()) -> list[str]:
    found = set(values)
    ordered = [item for item in preferred if item in found]
    return [*ordered, *sorted(found - set(ordered))]


def _contract(profile: dict[str, Any]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    contract = profile.get("consumer_contract")
    policy = profile.get("impact_policy")
    if not isinstance(contract, dict) or not isinstance(policy, dict):
        raise ImpactPlanError("profile has no v2 consumer contract or impact policy")
    rules = policy.get("path_rules")
    if not isinstance(rules, list) or not rules:
        raise ImpactPlanError("impact policy must contain path rules")
    return contract, [rule for rule in rules if isinstance(rule, dict)]


def selector_catalog(profile: dict[str, Any]) -> dict[str, set[str]]:
    contract, rules = _contract(profile)
    planes = {
        str(plane["id"])
        for plane in contract.get("planes", [])
        if isinstance(plane, dict) and isinstance(plane.get("id"), str)
    }
    return {
        "planes": planes,
        "fixtures": {
            item
            for rule in rules
            for item in rule.get("fixtures", [])
            if isinstance(item, str)
        },
        "test_tags": {
            item
            for rule in rules
            for item in rule.get("test_tags", [])
            if isinstance(item, str)
        },
        "journey_groups": {
            item
            for rule in rules
            for item in rule.get("journey_groups", [])
            if isinstance(item, str)
        },
    }


def resolve_plane_selectors(
    requested: Iterable[str], contract: dict[str, Any]
) -> list[str]:
    planes = [
        plane
        for plane in contract.get("planes", [])
        if isinstance(plane, dict) and isinstance(plane.get("id"), str)
    ]
    aliases: dict[str, set[str]] = defaultdict(set)
    for plane in planes:
        identifier = str(plane["id"])
        role = str(plane.get("role", ""))
        aliases[identifier.casefold()].add(identifier)
        aliases[identifier.removeprefix("PLANE-").casefold()].add(identifier)
        if role:
            aliases[role.casefold()].add(identifier)
    resolved: set[str] = set()
    for raw in requested:
        matches = aliases.get(raw.casefold(), set())
        if len(matches) != 1:
            raise ImpactPlanError(
                f"unknown or ambiguous plane selector {raw!r}; choose one of "
                + ", ".join(sorted(plane["id"] for plane in planes))
            )
        resolved.update(matches)
    return sorted(resolved)


def validate_scalar_selectors(
    label: str, requested: Iterable[str], allowed: set[str]
) -> list[str]:
    selected = set(requested)
    unknown = sorted(selected - allowed)
    if unknown:
        raise ImpactPlanError(
            f"unknown {label} selector(s): {', '.join(unknown)}; allowed: "
            + ", ".join(sorted(allowed))
        )
    return sorted(selected)


def _filtered_or_requested(
    derived: set[str], requested: list[str], *, fail_closed: bool
) -> set[str]:
    if fail_closed or not requested:
        return derived
    if not derived:
        return set(requested)
    return derived & set(requested)


def build_impact_plan(
    profile: dict[str, Any],
    changed_paths: Iterable[str],
    *,
    changed_from: str | None = None,
    changed_to: str | None = None,
    root_delta: dict[str, Any] | None = None,
    planes: Iterable[str] = (),
    fixtures: Iterable[str] = (),
    test_tags: Iterable[str] = (),
    journey_groups: Iterable[str] = (),
) -> dict[str, Any]:
    contract, rules = _contract(profile)
    catalog = selector_catalog(profile)
    requested_planes = resolve_plane_selectors(planes, contract)
    requested_fixtures = validate_scalar_selectors(
        "fixture", fixtures, catalog["fixtures"]
    )
    requested_tags = validate_scalar_selectors(
        "test-tag", test_tags, catalog["test_tags"]
    )
    requested_groups = validate_scalar_selectors(
        "journey-group", journey_groups, catalog["journey_groups"]
    )
    normalized_paths = sorted({normalize_changed_path(path) for path in changed_paths})

    nodes = {
        node["id"]: node
        for node in contract.get("dependency_graph", {}).get("nodes", [])
        if isinstance(node, dict) and isinstance(node.get("id"), str)
    }
    edges = [
        edge
        for edge in contract.get("dependency_graph", {}).get("edges", [])
        if isinstance(edge, dict)
    ]
    adjacency: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for edge in edges:
        source = edge.get("from_node")
        if isinstance(source, str):
            adjacency[source].append(edge)
    for edge_list in adjacency.values():
        edge_list.sort(key=lambda item: str(item.get("id", "")))

    unknown_paths: list[str] = []
    matched_rule_ids: set[str] = set()
    root_narrowable_rule_ids: set[str] = set()
    affected_nodes: set[str] = set()
    affected_planes: set[str] = set()
    validation_ids: set[str] = set()
    direct_nodes: set[str] = set()
    direct_planes: set[str] = set()
    direct_validation_ids: set[str] = set()
    direct_jobs: set[str] = set()
    narrowed_jobs: set[str] = set()
    selected_fixtures: set[str] = set()
    selected_tags: set[str] = set()
    selected_groups: set[str] = set()
    selected_jobs: set[str] = set()
    explanations: list[dict[str, Any]] = []

    for path in normalized_paths:
        matched = [
            rule
            for rule in rules
            if any(
                isinstance(pattern, str) and pattern_matches(path, pattern)
                for pattern in rule.get("patterns", [])
            )
        ]
        matched.sort(key=lambda item: str(item.get("id", "")))
        if not matched:
            unknown_paths.append(path)
            explanations.append(
                {
                    "path": path,
                    "rule_ids": [],
                    "reason": "No declared path rule matched; the plan expands to the full fail-closed matrix.",
                }
            )
            continue
        rule_ids = [str(rule.get("id", "")) for rule in matched]
        explanations.append(
            {
                "path": path,
                "rule_ids": rule_ids,
                "reason": " | ".join(
                    str(rule.get("reason", "Declared profile path rule."))
                    for rule in matched
                ),
            }
        )
        for rule in matched:
            rule_id = str(rule.get("id", ""))
            matched_rule_ids.add(rule_id)
            rule_nodes = {
                item for item in rule.get("node_refs", []) if isinstance(item, str)
            }
            rule_planes = {
                item for item in rule.get("plane_refs", []) if isinstance(item, str)
            }
            rule_validations = {
                item
                for item in rule.get("validation_refs", [])
                if isinstance(item, str)
            }
            rule_jobs = {
                item for item in rule.get("jobs", []) if isinstance(item, str)
            }
            affected_nodes.update(rule_nodes)
            affected_planes.update(rule_planes)
            validation_ids.update(rule_validations)
            if rule.get("root_narrowable") is True:
                root_narrowable_rule_ids.add(rule_id)
                narrowed_jobs.update(
                    item
                    for item in rule.get("narrowed_jobs", [])
                    if isinstance(item, str)
                )
            else:
                direct_nodes.update(rule_nodes)
                direct_planes.update(rule_planes)
                direct_validation_ids.update(rule_validations)
                direct_jobs.update(rule_jobs)
            selected_fixtures.update(
                item for item in rule.get("fixtures", []) if isinstance(item, str)
            )
            selected_tags.update(
                item for item in rule.get("test_tags", []) if isinstance(item, str)
            )
            selected_groups.update(
                item for item in rule.get("journey_groups", []) if isinstance(item, str)
            )
            selected_jobs.update(
                item for item in rule.get("jobs", []) if isinstance(item, str)
            )

    root_narrowing_requested = bool(root_narrowable_rule_ids)
    trusted_root_delta = bool(root_delta and root_delta.get("trusted") is True)
    fail_closed = bool(unknown_paths) or (
        root_narrowing_requested and not trusted_root_delta
    )
    if root_narrowing_requested and not trusted_root_delta:
        explanations.append(
            {
                "path": "<plane-root-evidence>",
                "rule_ids": sorted(root_narrowable_rule_ids),
                "reason": "A multipurpose producer or plane-receipt path changed without a complete trusted old/new root comparison; the plan expands to the full fail-closed matrix.",
            }
        )

    def expand_closure(
        seed_nodes: set[str],
        seed_planes: set[str],
        seed_validations: set[str],
    ) -> tuple[set[str], set[str], set[str]]:
        closure_nodes = set(seed_nodes)
        closure_planes = set(seed_planes)
        closure_validations = set(seed_validations)
        queue = deque(sorted(closure_nodes))
        while queue:
            source = queue.popleft()
            node = nodes.get(source)
            if isinstance(node, dict) and isinstance(node.get("plane_ref"), str):
                closure_planes.add(node["plane_ref"])
            for edge in adjacency.get(source, []):
                target = edge.get("to_node")
                if isinstance(target, str) and target not in closure_nodes:
                    closure_nodes.add(target)
                    queue.append(target)
                closure_planes.update(
                    item
                    for item in edge.get("affected_plane_refs", [])
                    if isinstance(item, str)
                )
                closure_validations.update(
                    item
                    for item in edge.get("validation_refs", [])
                    if isinstance(item, str)
                )
        return closure_nodes, closure_planes, closure_validations

    if fail_closed:
        affected_nodes = set(nodes)
        affected_planes = set(catalog["planes"])
        validation_ids = {
            item["id"]
            for item in profile.get("validation", [])
            if isinstance(item, dict) and isinstance(item.get("id"), str)
        }
        selected_fixtures = set(catalog["fixtures"])
        selected_tags = set(catalog["test_tags"])
        selected_groups = set(catalog["journey_groups"])
        selected_jobs = set(JOB_IDS)
    elif root_narrowing_requested:
        role_to_plane_ids: dict[str, set[str]] = defaultdict(set)
        for plane in contract.get("planes", []):
            if isinstance(plane, dict) and isinstance(plane.get("id"), str):
                role_to_plane_ids[str(plane.get("role", ""))].add(plane["id"])
        delta_planes = {
            identifier
            for role in root_delta.get("changed_roles", [])
            if isinstance(role, str)
            for identifier in role_to_plane_ids.get(role, set())
        }
        if root_delta.get("release_root_changed") is True:
            delta_planes.update(role_to_plane_ids.get("release", set()))
        delta_nodes = {
            identifier
            for identifier, node in nodes.items()
            if isinstance(node, dict) and node.get("plane_ref") in delta_planes
        }
        delta_validations = {
            validation
            for plane in contract.get("planes", [])
            if isinstance(plane, dict) and plane.get("id") in delta_planes
            for validation in plane.get("validation_refs", [])
            if isinstance(validation, str)
        }
        direct_closure = expand_closure(
            direct_nodes, direct_planes, direct_validation_ids
        )
        delta_closure = expand_closure(
            delta_nodes, delta_planes, delta_validations
        )
        affected_nodes = direct_closure[0] | delta_closure[0]
        affected_planes = direct_closure[1] | delta_closure[1]
        validation_ids = direct_closure[2] | delta_closure[2]
        selected_jobs = direct_jobs | narrowed_jobs
    else:
        affected_nodes, affected_planes, validation_ids = expand_closure(
            affected_nodes, affected_planes, validation_ids
        )

    plane_roles = {
        plane["id"]: str(plane.get("role", ""))
        for plane in contract.get("planes", [])
        if isinstance(plane, dict) and isinstance(plane.get("id"), str)
    }
    affected_planes = _filtered_or_requested(
        affected_planes, requested_planes, fail_closed=fail_closed
    )
    selected_fixtures = _filtered_or_requested(
        selected_fixtures, requested_fixtures, fail_closed=fail_closed
    )
    selected_tags = _filtered_or_requested(
        selected_tags, requested_tags, fail_closed=fail_closed
    )
    selected_groups = _filtered_or_requested(
        selected_groups, requested_groups, fail_closed=fail_closed
    )
    for plane_id in affected_planes:
        selected_jobs.update(PLANE_JOB_DEFAULTS.get(plane_roles.get(plane_id, ""), set()))
    if requested_planes and not affected_planes and not fail_closed:
        selected_jobs.clear()

    jobs = {job: job in selected_jobs for job in JOB_IDS}
    selected_plane_roles = stable_order(
        (plane_roles.get(plane_id, "") for plane_id in affected_planes),
        ("control", "data", "search", "semantic", "presentation", "release"),
    )
    selected_plane_roles = [role for role in selected_plane_roles if role]
    builder_planes = [role for role in selected_plane_roles if role != "release"]
    builder_fixtures = [
        fixture
        for fixture in stable_order(selected_fixtures, FIXTURE_ORDER)
        if fixture != "adversarial"
    ]
    shadow = profile.get("impact_policy", {}).get("full_shadow", {})
    plan = {
        "schema": "okf-evaluation-impact-plan.v1",
        "profile_id": profile.get("profile_id"),
        "profile_schema": profile.get("schema"),
        "profile_sha256": canonical_profile_sha256(profile),
        "changed_from": changed_from,
        "changed_to": changed_to,
        "changed_paths": normalized_paths,
        "fail_closed": fail_closed,
        "unknown_paths": sorted(unknown_paths),
        "matched_rule_ids": sorted(matched_rule_ids),
        "root_delta": root_delta,
        "impact": {
            "node_ids": sorted(affected_nodes),
            "validation_ids": sorted(validation_ids),
        },
        "selectors": {
            "planes": sorted(affected_planes),
            "plane_roles": selected_plane_roles,
            "builder_planes": builder_planes,
            "fixtures": stable_order(selected_fixtures, FIXTURE_ORDER),
            "builder_fixtures": builder_fixtures,
            "test_tags": sorted(selected_tags),
            "journey_groups": sorted(selected_groups),
            "jobs": jobs,
        },
        "full_shadow": {
            "enabled": shadow.get("enabled") is True,
            "cadence": sorted(
                item for item in shadow.get("cadence", []) if isinstance(item, str)
            ),
        },
        "explanations": sorted(explanations, key=lambda item: item["path"]),
    }
    return plan


def atomic_write(path: Path, payload: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        dir=path.parent,
        prefix=f".{path.name}.",
        suffix=".tmp",
        delete=False,
    ) as handle:
        temporary = Path(handle.name)
        handle.write(payload)
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(temporary, path)


def write_github_output(path: Path, plan: dict[str, Any], output_path: str) -> None:
    selectors = plan["selectors"]
    lines = [
        f"impact_plan={output_path}",
        f"fail_closed={str(plan['fail_closed']).lower()}",
        f"planes={json.dumps(selectors['planes'], separators=(',', ':'))}",
        f"plane_roles={json.dumps(selectors['plane_roles'], separators=(',', ':'))}",
        f"builder_planes={json.dumps(selectors['builder_planes'], separators=(',', ':'))}",
        f"fixtures={json.dumps(selectors['fixtures'], separators=(',', ':'))}",
        f"builder_fixtures={json.dumps(selectors['builder_fixtures'], separators=(',', ':'))}",
        f"test_tags={json.dumps(selectors['test_tags'], separators=(',', ':'))}",
        f"journey_groups={json.dumps(selectors['journey_groups'], separators=(',', ':'))}",
    ]
    lines.extend(
        f"{job}={str(enabled).lower()}"
        for job, enabled in selectors["jobs"].items()
    )
    with path.open("a", encoding="utf-8") as handle:
        handle.write("\n".join(lines) + "\n")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--profile", type=Path, default=DEFAULT_PROFILE)
    parser.add_argument("--repository-root", type=Path, default=ROOT)
    parser.add_argument("--changed-from")
    parser.add_argument(
        "--changed-to",
        help="optional immutable comparison revision; defaults to the checked-out worktree",
    )
    parser.add_argument("--changed-path", action="append", default=[])
    parser.add_argument("--plane", action="append", default=[])
    parser.add_argument("--fixture", action="append", default=[])
    parser.add_argument("--test-tag", action="append", default=[])
    parser.add_argument("--journey-group", action="append", default=[])
    parser.add_argument("--output", type=Path)
    parser.add_argument("--github-output", type=Path)
    parser.add_argument(
        "--explain",
        action="store_true",
        help="print a path-to-rule explanation to stderr without changing JSON",
    )
    args = parser.parse_args(argv)

    try:
        repository_root = args.repository_root.resolve()
        profile = load_profile(args.profile.resolve())
        changed_paths = set(args.changed_path)
        if args.changed_from or not changed_paths:
            changed_paths.update(
                git_changed_paths(
                    repository_root,
                    args.changed_from,
                    args.changed_to,
                )
            )
        root_delta = (
            compare_plane_root_receipts(
                profile,
                repository_root,
                args.changed_from,
                args.changed_to,
            )
            if args.changed_from
            else None
        )
        plan = build_impact_plan(
            profile,
            changed_paths,
            changed_from=args.changed_from,
            changed_to=args.changed_to,
            root_delta=root_delta,
            planes=args.plane,
            fixtures=args.fixture,
            test_tags=args.test_tag,
            journey_groups=args.journey_group,
        )
    except (ImpactPlanError, OSError) as error:
        print(f"impact planning failed: {error}", file=sys.stderr)
        return 2

    payload = json.dumps(plan, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    if args.output is None:
        sys.stdout.write(payload)
        output_label = "-"
    else:
        atomic_write(args.output, payload)
        output_label = args.output.as_posix()
    if args.github_output is not None:
        write_github_output(args.github_output, plan, output_label)
    if args.explain:
        for item in plan["explanations"]:
            rule_text = ", ".join(item["rule_ids"]) or "FAIL-CLOSED"
            print(f"{item['path']}: {rule_text}: {item['reason']}", file=sys.stderr)
        if not plan["explanations"]:
            print("no changed paths: no jobs selected", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
