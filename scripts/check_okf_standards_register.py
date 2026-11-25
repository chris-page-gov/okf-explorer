#!/usr/bin/env python3
"""Check the authored OKF standards register and its catalogue pointers."""

from __future__ import annotations

import json
import re
from hashlib import sha256
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
COMMIT_RE = re.compile(r"^[0-9a-f]{40}$")


def load_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"Expected a JSON object: {path}")
    return value


def check_current_owner_catalogue(root: Path, entry: dict[str, Any], access: dict[str, Any]) -> list[str]:
    """Check the published derivative and distinguish retained evidence from candidates."""
    day = entry.get("observed_on", "")
    path = entry.get("path", "")
    if (not isinstance(day, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", day)
            or path != f"docs/evidence/okf-public-owner-candidates-{day}.json"):
        return ["Invalid current public owner catalogue path"]
    try:
        raw = (root / path).read_bytes()
        catalogue = json.loads(raw)
        rows = catalogue["repositories"]
        retained = catalogue["retained_verification_roots"]
        root_keys = {(row["repository"], item["root"]) for row in rows for item in row["roots"]}
        retained_keys = {(item["repository"], item["root"]) for item in retained}
    except (OSError, ValueError, KeyError, TypeError) as exc:
        return [f"Cannot read current public owner catalogue: {exc}"]

    errors = []
    url = "https://raw.githubusercontent.com/chris-page-gov/okf-explorer/main/" + path
    if entry.get("url") != url or access.get("machine") != url or access.get("observed_on") != day:
        errors.append("Current public owner catalogue links or dates do not agree")
    digest = sha256(raw).hexdigest()
    if entry.get("sha256") != digest or access.get("sha256") != digest:
        errors.append("Current public owner catalogue digest does not match both references")
    if (catalogue.get("owner") != "chris-page-gov" or catalogue.get("visibility") != "public"
            or catalogue.get("discovery_coverage") != "complete"
            or not catalogue.get("index_inspection_requested")
            or not str(catalogue.get("observed_at", "")).startswith(day + "T")
            or any(row.get("visibility") != "public"
                   or not re.fullmatch(r"chris-page-gov/[A-Za-z0-9_.-]+", row["repository"]) for row in rows)):
        errors.append("Current owner catalogue must contain only verified public discovery rows")
    public_count = catalogue.get("public_repositories")
    if (public_count != entry.get("public_repositories") or public_count != catalogue.get("repositories_seen")
            or sum(bool(row["roots"]) for row in rows) != entry.get("candidate_repositories")
            or entry.get("candidate_repositories") != catalogue.get("candidate_repositories")
            or len(root_keys) != sum(len(row["roots"]) for row in rows)
            or len(root_keys) != catalogue.get("marker_root_count") or len(root_keys) != entry.get("marker_roots")
            or len({row["repository"] for row in rows}) != len(rows)):
        errors.append("Current public owner catalogue count does not match its rows or reference")
    if (not retained_keys <= root_keys or len(retained_keys) != len(retained)
            or len(retained) != entry.get("retained_verification_roots")
            or any(item.get("role") not in {"captured verification evidence", "retained diagnostic projection"} for item in retained)):
        errors.append("Retained verification roots must refer to distinct labelled scan rows")
    return errors


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
    for key in ("public_bundle_access", "public_owner_candidates", "prior_public_owner_candidates"):
        item = catalogues.get(key, {})
        target = root / str(item.get("path", ""))
        if not item.get("url") or not target.is_file():
            errors.append(f"Missing local file or URL for catalogue {key}")

    for producer in register.get("reviewed_public_producer_sources", []):
        repository = producer.get("repository", "")
        commit = producer.get("observed_commit", "")
        if (producer.get("visibility") != "public"
                or not re.fullmatch(r"https://github.com/chris-page-gov/[A-Za-z0-9_.-]+", repository)
                or not COMMIT_RE.fullmatch(commit)
                or not producer.get("source_reference", "").startswith(repository + "/blob/" + commit + "/")):
            errors.append("Public producer source must have public visibility and a pinned owned source reference")

    expected_human = register.get("stable_human_reference")
    expected_machine = register.get("stable_machine_reference")
    links = access.get("standards_register", {})
    if links.get("human") != expected_human or links.get("machine") != expected_machine:
        errors.append("Public access directory does not link to the stable standards references")
    owner_path = access.get("owner_catalogue", {}).get("path")
    if owner_path != catalogues.get("public_owner_candidates", {}).get("path"):
        errors.append("Public access directory and standards register disagree on owner catalogue path")
    errors.extend(check_current_owner_catalogue(root, catalogues.get("public_owner_candidates", {}), access.get("owner_catalogue", {})))

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
