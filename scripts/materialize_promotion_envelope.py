#!/usr/bin/env python3
"""Materialize a terminal promotion envelope after candidate assurance closes."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

from check_publication_unit_manifest import validate_publication_tree


def load_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise RuntimeError(f"JSON document must be an object: {path}")
    return value


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def repository_reference(path: Path, repository_root: Path) -> str:
    resolved = path.resolve()
    root = repository_root.resolve()
    if not resolved.is_relative_to(root):
        raise RuntimeError(f"receipt must be inside the promotion workspace: {path}")
    return resolved.relative_to(root).as_posix()


def resolve_repository_reference(value: object, repository_root: Path) -> Path:
    if not isinstance(value, str) or not value or "\\" in value:
        raise RuntimeError(f"unsafe evidence reference: {value!r}")
    relative = Path(value)
    if relative.is_absolute() or ".." in relative.parts:
        raise RuntimeError(f"unsafe evidence reference: {value!r}")
    target = (repository_root.resolve() / relative).resolve()
    if not target.is_relative_to(repository_root.resolve()):
        raise RuntimeError(f"evidence reference escapes the promotion workspace: {value!r}")
    return target


def receipt_binding(path: Path, repository_root: Path) -> dict[str, str]:
    receipt = load_json(path)
    observed_at = receipt.get("observed_at")
    if not isinstance(observed_at, str):
        raise RuntimeError(f"receipt has no observed_at: {path}")
    return {
        "ref": repository_reference(path, repository_root),
        "sha256": sha256_file(path),
        "observed_at": observed_at,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--template", type=Path, required=True)
    parser.add_argument("--publication-root", type=Path, required=True)
    parser.add_argument("--repository-root", type=Path, required=True)
    parser.add_argument("--candidate-release-receipt", type=Path, required=True)
    parser.add_argument("--validation-receipt", type=Path, required=True)
    parser.add_argument("--journey-receipt", type=Path, required=True)
    parser.add_argument("--link-receipt", type=Path, action="append", required=True)
    parser.add_argument("--promotion-tag", required=True)
    parser.add_argument("--promoted-at", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args(argv)

    publication_root = args.publication_root.resolve()
    repository_root = args.repository_root.resolve()
    manifest = validate_publication_tree(publication_root)
    template = load_json(args.template)
    candidate_release = load_json(args.candidate_release_receipt)
    validation = load_json(args.validation_receipt)
    journey = load_json(args.journey_receipt)
    if (
        candidate_release.get("schema") != "okf-candidate-release-receipt.v1"
        or candidate_release.get("status") != "passed"
        or validation.get("schema") != "okf-publication-validation-receipt.v1"
        or validation.get("status") != "passed"
        or journey.get("schema") != "okf-publication-journey-receipt.v1"
        or journey.get("status") != "passed"
    ):
        raise RuntimeError("candidate, validation and journey receipts must pass")
    subject_identity = validation.get("subject")
    if subject_identity != candidate_release.get("subject"):
        raise RuntimeError("candidate release and validation receipts bind different subjects")
    if not isinstance(subject_identity, dict):
        raise RuntimeError("candidate subject is absent")
    if journey.get("subject") != subject_identity:
        raise RuntimeError("journey and validation receipts bind different subjects")
    engines = journey.get("engines")
    if not isinstance(engines, list) or [
        row.get("engine") if isinstance(row, dict) else None for row in engines
    ] != ["chromium", "firefox", "webkit"]:
        raise RuntimeError("journey receipt must retain exactly three raw engine results")
    for row in engines:
        engine = row.get("engine") if isinstance(row, dict) else None
        expected_ref = f"evidence/journey-{engine}-results.json"
        if engine not in {"chromium", "firefox", "webkit"} or row.get(
            "result_ref"
        ) != expected_ref:
            raise RuntimeError("journey receipt has a non-standard raw result reference")
        result_path = resolve_repository_reference(row["result_ref"], repository_root)
        if not result_path.is_file():
            raise RuntimeError(f"journey raw result is absent: {row['result_ref']}")
        if sha256_file(result_path) != row.get("result_sha256"):
            raise RuntimeError(
                f"journey raw result digest differs: {row['result_ref']}"
            )
    repository = str(subject_identity["repository"])
    source_commit = str(subject_identity["source_commit"])
    candidate_tag = str(subject_identity["candidate_tag"])
    publication_manifest_path = publication_root / "publication-unit-manifest.json"
    roots_path = publication_root / "assurance/plane-roots.json"
    roots = load_json(roots_path)
    expected_identity = {
        "descriptor_sha256": sha256_file(publication_root / "okf-explorer.json"),
        "release_root_sha256": roots["release_root_sha256"],
        "publication_manifest_sha256": sha256_file(publication_manifest_path),
        "site_tree_sha256": manifest["tree_sha256"],
        "site_file_count": manifest["file_count"],
        "link_manifest_sha256": sha256_file(
            publication_root / "data/link-validation/manifest.json"
        ),
    }
    for field, value in expected_identity.items():
        if subject_identity.get(field) != value:
            raise RuntimeError(
                f"candidate subject {field} differs from the publication tree"
            )

    envelope = json.loads(json.dumps(template))
    envelope["state"] = "promoted"
    envelope["promoted_at"] = args.promoted_at
    envelope["subject"].update(
        {
            "repository": repository,
            "source_commit": source_commit,
            "tag": candidate_tag,
            "release_url": candidate_release["release_url"],
        }
    )
    bindings = [
        envelope["subject"]["descriptor"],
        *envelope["subject"]["bundles"],
        envelope["subject"]["plane_roots"],
        envelope["subject"]["build_manifest"],
    ]
    for binding in bindings:
        target = publication_root / binding["path"]
        if not target.is_file():
            raise RuntimeError(f"candidate binding is absent: {binding['path']}")
        binding["sha256"] = sha256_file(target)
    envelope["subject"]["plane_roots"]["release_root_sha256"] = roots[
        "release_root_sha256"
    ]
    envelope["subject"]["site_artifact"].update(
        {
            "manifest_sha256": sha256_file(publication_manifest_path),
            "tree_sha256": manifest["tree_sha256"],
            "file_count": manifest["file_count"],
        }
    )
    envelope["promotion_container"].update(
        {
            "repository": repository,
            "tag": args.promotion_tag,
            "release_url": (
                f"https://github.com/{repository}/releases/tag/{args.promotion_tag}"
            ),
            "envelope_asset": "heritage-publication-envelope.json",
            "attestation_sidecar_asset": (
                "heritage-publication-envelope.attestation.json"
            ),
            "status_claim": "identity-only",
            "verification_after_publish": True,
        }
    )
    envelope["receipts"] = {
        "validation": receipt_binding(args.validation_receipt, repository_root),
        "journey": receipt_binding(args.journey_receipt, repository_root),
        "link_observations": [
            receipt_binding(path, repository_root) for path in args.link_receipt
        ],
    }
    archive = candidate_release.get("archive", {})
    envelope["attestations"] = [
        {
            "kind": "github-artifact-attestation",
            "asset": archive["asset"],
            "url": archive["attestation_url"],
            "subject_digest": archive["sha256"],
            "issuer": archive["attestation_issuer"],
        }
    ]
    envelope["signature"] = {
        "mechanism": "github-artifact-attestation",
        "identity": (
            f"https://github.com/{repository}/.github/workflows/"
            "promotion-release.yml"
        ),
        "reference": "heritage-publication-envelope.attestation.json",
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(envelope, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(
        "promotion envelope materialized: "
        f"candidate_tag={candidate_tag} promotion_tag={args.promotion_tag} "
        f"site_tree={manifest['tree_sha256']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
