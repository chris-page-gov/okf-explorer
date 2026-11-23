#!/usr/bin/env python3
"""Check the authored OKF standards register and its catalogue pointers."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
COMMIT_RE = re.compile(r"^[0-9a-f]{40}$")


def load_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"Expected a JSON object: {path}")
    return value


def check_register(root: Path = ROOT) -> list[str]:
    errors: list[str] = []
    try:
        register = load_json(root / "registry/okf-standards.json")
        access = load_json(root / "registry/public-bundle-access.json")
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        return [str(exc)]

    if register.get("schema") != "okf-standards-register.v1":
        errors.append("Unexpected standards register schema")

    current = register.get("current_core", {})
    current_commit = current.get("pinned_commit")
    if current.get("version") != "0.3":
        errors.append("Current core version must be 0.3")
    if not isinstance(current_commit, str) or not COMMIT_RE.fullmatch(current_commit):
        errors.append("Current core must pin a full Git commit")
    else:
        if current.get("verified_default_branch_head") != current_commit:
            errors.append("Verified default-branch head must match the current pinned commit")
        if current_commit not in str(current.get("specification", "")):
            errors.append("Current specification URL must include its pinned commit")

    historical = {
        entry.get("version"): entry
        for entry in register.get("historical_core", [])
        if isinstance(entry, dict)
    }
    for version in ("0.1", "0.2"):
        entry = historical.get(version)
        if entry is None:
            errors.append(f"Missing historical OKF {version} reference")
            continue
        commit = entry.get("pinned_commit")
        if entry.get("status") != "historical" or not isinstance(commit, str) or not COMMIT_RE.fullmatch(commit):
            errors.append(f"OKF {version} must have a verified historical pin")
        if commit and commit not in str(entry.get("specification", "")):
            errors.append(f"OKF {version} specification URL must include its pin")
    old = historical.get("0.1", {})
    if old.get("verified") is not True or not old.get("verification", {}).get("raw_url"):
        errors.append("OKF 0.1 must retain its immutable-content verification evidence")

    profile = next(
        (item for item in register.get("profiles", []) if item.get("id") == "bundle-wiki"),
        None,
    )
    if not profile or profile.get("status") != "frozen" or profile.get("semantic_core_target") != "0.2":
        errors.append("Bundle Wiki profile v1 must remain separately recorded as frozen over core 0.2")

    catalogues = register.get("bundle_catalogues", {})
    for key in ("public_bundle_access", "public_owner_candidates"):
        item = catalogues.get(key, {})
        target = root / str(item.get("path", ""))
        if not item.get("url") or not target.is_file():
            errors.append(f"Missing local file or URL for catalogue {key}")

    expected_human = register.get("stable_human_reference")
    expected_machine = register.get("stable_machine_reference")
    links = access.get("standards_register", {})
    if links.get("human") != expected_human or links.get("machine") != expected_machine:
        errors.append("Public access directory does not link to the stable standards references")
    owner_path = access.get("owner_catalogue", {}).get("path")
    if owner_path != catalogues.get("public_owner_candidates", {}).get("path"):
        errors.append("Public access directory and standards register disagree on owner catalogue path")

    return errors


def main() -> int:
    errors = check_register()
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1
    print("OKF standards register and catalogue links are valid")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
