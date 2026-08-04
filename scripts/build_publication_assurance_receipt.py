#!/usr/bin/env python3
"""Build fail-closed candidate, journey and candidate-release assurance receipts."""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from check_publication_unit_manifest import validate_publication_tree


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def timestamp(value: str | None = None) -> str:
    observed = (
        datetime.fromisoformat(value.replace("Z", "+00:00"))
        if value
        else datetime.now(timezone.utc)
    )
    if observed.tzinfo is None:
        raise RuntimeError("timestamp must include a timezone")
    return observed.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def load_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        raise RuntimeError(f"cannot read JSON {path}: {error}") from error
    if not isinstance(value, dict):
        raise RuntimeError(f"JSON document must be an object: {path}")
    return value


def write_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def candidate_subject(
    publication_root: Path,
    *,
    repository: str,
    source_commit: str,
    candidate_tag: str,
) -> dict[str, Any]:
    manifest = validate_publication_tree(publication_root)
    descriptor_path = publication_root / "okf-explorer.json"
    roots_path = publication_root / "assurance" / "plane-roots.json"
    link_manifest_path = (
        publication_root / "data" / "link-validation" / "manifest.json"
    )
    publication_manifest_path = publication_root / "publication-unit-manifest.json"
    roots = load_json(roots_path)
    for label, value, length in (
        ("source commit", source_commit, 40),
        ("descriptor SHA-256", sha256_file(descriptor_path), 64),
        ("release root SHA-256", roots.get("release_root_sha256"), 64),
        (
            "publication manifest SHA-256",
            sha256_file(publication_manifest_path),
            64,
        ),
        ("Site tree SHA-256", manifest.get("tree_sha256"), 64),
    ):
        if not isinstance(value, str) or len(value) != length:
            raise RuntimeError(f"invalid {label}")
    return {
        "repository": repository,
        "source_commit": source_commit,
        "candidate_tag": candidate_tag,
        "descriptor_sha256": sha256_file(descriptor_path),
        "release_root_sha256": roots["release_root_sha256"],
        "publication_manifest_sha256": sha256_file(publication_manifest_path),
        "site_tree_sha256": manifest["tree_sha256"],
        "site_file_count": manifest["file_count"],
        "link_manifest_sha256": sha256_file(link_manifest_path),
    }


def build_validation(args: argparse.Namespace) -> dict[str, Any]:
    subject = candidate_subject(
        args.publication_root.resolve(),
        repository=args.repository,
        source_commit=args.source_commit,
        candidate_tag=args.candidate_tag,
    )
    return {
        "schema": "okf-publication-validation-receipt.v1",
        "status": "passed",
        "observed_at": timestamp(args.observed_at),
        "subject": subject,
        # These aliases let the existing public-journey evaluator bind the
        # deployment without accepting a looser candidate identity.
        "candidate": {
            "heritage_descriptor_sha256": subject["descriptor_sha256"],
            "heritage_release_root_sha256": subject["release_root_sha256"],
        },
        "checks": {
            "publication_tree_exact": "passed",
            "plane_roots_recomputed": "passed",
            "link_manifest_bound": "passed",
        },
    }


def parse_engine_result(value: str) -> tuple[str, Path]:
    engine, separator, raw_path = value.partition("=")
    if separator != "=" or engine not in {"chromium", "firefox", "webkit"}:
        raise RuntimeError("--result must be chromium|firefox|webkit=PATH")
    return engine, Path(raw_path)


def build_journeys(args: argparse.Namespace) -> dict[str, Any]:
    validation = load_json(args.validation_receipt)
    if (
        validation.get("schema") != "okf-publication-validation-receipt.v1"
        or validation.get("status") != "passed"
    ):
        raise RuntimeError("journey assurance requires a passed validation receipt")
    rows: list[dict[str, Any]] = []
    observed: list[str] = []
    parsed_results = [parse_engine_result(value) for value in args.result]
    supplied = dict(parsed_results)
    if (
        len(parsed_results) != 3
        or len(supplied) != 3
        or set(supplied) != {"chromium", "firefox", "webkit"}
    ):
        raise RuntimeError("journey assurance requires exactly three browser engines")
    for engine in ("chromium", "firefox", "webkit"):
        result_path = supplied[engine]
        result = load_json(result_path)
        journeys = result.get("interaction_journeys", {})
        records = journeys.get("records", []) if isinstance(journeys, dict) else []
        selected = [
            row
            for row in records
            if isinstance(row, dict) and row.get("id") == "journey-publication"
        ]
        if len(selected) != 1:
            raise RuntimeError(f"{engine} result has no unique journey-publication")
        record = selected[0]
        actions = record.get("actions", [])
        assertions = record.get("assertions", [])
        if (
            record.get("status") != "passed"
            or len(actions) != args.expected_actions
            or not all(
                isinstance(item, dict) and item.get("passed") is True
                for item in actions
            )
            or not assertions
            or not all(
                isinstance(item, dict) and item.get("passed") is True
                for item in assertions
            )
        ):
            raise RuntimeError(f"{engine} publication journey did not fully pass")
        result_engine = result.get("metadata", {}).get("browser_engine")
        if result_engine != engine:
            raise RuntimeError(
                f"{engine} result metadata reports browser_engine={result_engine!r}"
            )
        generated_at = timestamp(str(result.get("generated_at")))
        observed.append(generated_at)
        result_name = f"journey-{engine}-results.json"
        retained_result = args.output.parent / result_name
        raw_result = result_path.read_bytes()
        if retained_result.resolve() != result_path.resolve():
            retained_result.parent.mkdir(parents=True, exist_ok=True)
            retained_result.write_bytes(raw_result)
        rows.append(
            {
                "engine": engine,
                "status": "passed",
                "result_ref": f"evidence/{result_name}",
                "result_sha256": hashlib.sha256(raw_result).hexdigest(),
                "observed_at": generated_at,
                "actions_passed": len(actions),
                "assertions_passed": len(assertions),
            }
        )
    return {
        "schema": "okf-publication-journey-receipt.v1",
        "status": "passed",
        "observed_at": max(observed),
        "subject": validation["subject"],
        "journey_id": "journey-publication",
        "expected_action_count": args.expected_actions,
        "assurance_source_commit": args.assurance_source_commit,
        "engines": rows,
    }


def build_release(args: argparse.Namespace) -> dict[str, Any]:
    validation = load_json(args.validation_receipt)
    subject = validation.get("subject")
    if (
        validation.get("schema") != "okf-publication-validation-receipt.v1"
        or validation.get("status") != "passed"
        or not isinstance(subject, dict)
    ):
        raise RuntimeError("candidate release requires a passed validation receipt")
    archive = args.archive.resolve()
    return {
        "schema": "okf-candidate-release-receipt.v1",
        "status": "passed",
        "observed_at": timestamp(args.observed_at),
        "subject": subject,
        "release_url": (
            f"https://github.com/{subject['repository']}/releases/tag/"
            f"{subject['candidate_tag']}"
        ),
        "archive": {
            "asset": archive.name,
            "bytes": archive.stat().st_size,
            "sha256": sha256_file(archive),
            "attestation_url": args.attestation_url,
            "attestation_issuer": args.attestation_issuer,
        },
    }


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(description=__doc__)
    subparsers = root.add_subparsers(dest="command", required=True)

    validation = subparsers.add_parser("validation")
    validation.add_argument("--publication-root", type=Path, required=True)
    validation.add_argument("--repository", required=True)
    validation.add_argument("--source-commit", required=True)
    validation.add_argument("--candidate-tag", required=True)
    validation.add_argument("--observed-at")
    validation.add_argument("--output", type=Path, required=True)

    journeys = subparsers.add_parser("journeys")
    journeys.add_argument("--validation-receipt", type=Path, required=True)
    journeys.add_argument("--result", action="append", required=True)
    journeys.add_argument("--expected-actions", type=int, default=32)
    journeys.add_argument("--assurance-source-commit", required=True)
    journeys.add_argument("--output", type=Path, required=True)

    release = subparsers.add_parser("release")
    release.add_argument("--validation-receipt", type=Path, required=True)
    release.add_argument("--archive", type=Path, required=True)
    release.add_argument("--attestation-url", required=True)
    release.add_argument("--attestation-issuer", required=True)
    release.add_argument("--observed-at")
    release.add_argument("--output", type=Path, required=True)
    return root


def main(argv: list[str] | None = None) -> int:
    args = parser().parse_args(argv)
    if args.command == "validation":
        receipt = build_validation(args)
    elif args.command == "journeys":
        receipt = build_journeys(args)
    else:
        receipt = build_release(args)
    write_json(args.output, receipt)
    print(
        f"publication assurance receipt passed: schema={receipt['schema']} "
        f"output={args.output}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
