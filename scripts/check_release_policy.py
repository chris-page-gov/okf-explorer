#!/usr/bin/env python3
"""Require annotated-tag, immutable-release and verified attestation provenance."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
from collections.abc import Iterable
from pathlib import Path

from check_evaluation_foundry import load_document
from check_promotion_envelope import validate_envelope


ROOT = Path(__file__).resolve().parents[1]
POLICY_PATH = ROOT / "release-assurance" / "release-policy.json"


def run_git(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )


def run_git_in(repository_root: Path, *args: str) -> subprocess.CompletedProcess[str]:
    """Run Git against the candidate checkout, which may be separate from tooling."""

    resolved = repository_root.resolve()
    if resolved == ROOT:
        return run_git(*args)
    return subprocess.run(
        ["git", *args],
        cwd=resolved,
        text=True,
        capture_output=True,
        check=False,
    )


def run_gh(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["gh", *args],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )


def verify_attested_envelope(
    path: Path,
    repository: str,
    *,
    signer_workflow: str,
    signer_digest: str,
    source_ref: str,
    source_digest: str,
    repository_root: Path = ROOT,
    publication_root: Path | None = None,
) -> dict[str, str]:
    """Cryptographically verify the exact envelope bytes with GitHub CLI."""

    envelope_path = path.resolve()
    envelope = load_document(envelope_path)
    errors = validate_envelope(
        envelope,
        envelope_path=envelope_path,
        repository_root=repository_root,
        publication_root=publication_root,
        require_promoted=True,
    )
    if errors:
        raise RuntimeError("terminal promotion envelope is invalid: " + "; ".join(errors))
    if envelope.get("subject", {}).get("repository") != repository:
        raise RuntimeError(
            "attestation repository does not match promotion envelope subject.repository"
        )
    verification = run_gh(
        "attestation",
        "verify",
        str(envelope_path),
        "--repo",
        repository,
        "--signer-workflow",
        signer_workflow,
        "--signer-digest",
        signer_digest,
        "--source-ref",
        source_ref,
        "--source-digest",
        source_digest,
    )
    if verification.returncode != 0:
        details = verification.stderr.strip() or verification.stdout.strip()
        raise RuntimeError(
            "GitHub artifact attestation did not cryptographically verify: " + details
        )
    digest = hashlib.sha256(envelope_path.read_bytes()).hexdigest()
    subject = envelope["subject"]
    return {
        "repository": repository,
        "envelope_sha256": digest,
        "source_commit": str(subject["source_commit"]),
        "candidate_tag": str(subject["tag"]),
        "promotion_tag": str(envelope["promotion_container"]["tag"]),
    }


def verify_attested_asset(
    path: Path,
    repository: str,
    *,
    signer_workflow: str,
    signer_digest: str,
    source_ref: str,
    source_digest: str,
) -> str:
    verification = run_gh(
        "attestation",
        "verify",
        str(path.resolve()),
        "--repo",
        repository,
        "--signer-workflow",
        signer_workflow,
        "--signer-digest",
        signer_digest,
        "--source-ref",
        source_ref,
        "--source-digest",
        source_digest,
    )
    if verification.returncode != 0:
        details = verification.stderr.strip() or verification.stdout.strip()
        raise RuntimeError(
            "GitHub artifact attestation did not cryptographically verify: " + details
        )
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate_annotated_tag(
    tag: str,
    *,
    attestation_fallback: str | None,
    repository_root: Path = ROOT,
) -> dict[str, str]:
    allowed_fallbacks = {
        None,
        "verified-archive-attestation",
        "attested-promotion-envelope",
    }
    if attestation_fallback not in allowed_fallbacks:
        raise RuntimeError("unsupported annotated-tag attestation fallback")
    object_type = run_git_in(repository_root, "cat-file", "-t", tag)
    if object_type.returncode != 0:
        raise RuntimeError(f"release tag does not exist locally: {tag}")
    if object_type.stdout.strip() != "tag":
        raise RuntimeError(f"release tag must be annotated, not lightweight: {tag}")
    signature = run_git_in(repository_root, "verify-tag", "--raw", tag)
    authentication = "verified-signature"
    if signature.returncode != 0 and attestation_fallback is None:
        details = signature.stderr.strip() or signature.stdout.strip()
        raise RuntimeError(
            "release tag signature is not verified and no explicit validated "
            f"attestation fallback was supplied: {tag}: {details}"
        )
    if signature.returncode != 0:
        authentication = str(attestation_fallback)
    commit = run_git_in(repository_root, "rev-list", "-n", "1", tag)
    if commit.returncode != 0 or len(commit.stdout.strip()) < 40:
        raise RuntimeError(f"cannot resolve release tag commit: {tag}")
    return {
        "tag": tag,
        "commit": commit.stdout.strip(),
        "authentication": authentication,
    }


def validate_immutable_settings(settings: dict[str, object]) -> None:
    """Validate optional operator-side capability evidence.

    Release workflows deliberately do not call this administration endpoint: the
    least-privilege GITHUB_TOKEN cannot read it.  Published release identity is
    established by ``validate_release_json`` and verified release attestations.
    """

    if settings.get("enabled") is not True:
        raise RuntimeError("GitHub immutable releases are not enabled")
    enforced = settings.get("enforced_by_owner")
    if not isinstance(enforced, bool):
        raise RuntimeError("GitHub immutable-release capability response is invalid")


def validate_attestation_provenance(
    *,
    repository: str,
    workflow: str,
    workflow_ref: str,
    workflow_commit: str,
    source_ref: str,
    source_commit: str,
) -> None:
    """Keep assurance-workflow provenance distinct from candidate provenance."""

    for label, value in (
        ("workflow", workflow_commit),
        ("source", source_commit),
    ):
        if not re.fullmatch(r"[0-9a-f]{40}", value):
            raise RuntimeError(
                f"attestation assurance {label} commit is not a 40-hex SHA"
            )
    if not source_ref.startswith("refs/"):
        raise RuntimeError("attestation assurance source ref is not a full Git ref")
    expected = f"{repository}/.github/workflows/{workflow}@{source_ref}"
    if workflow_ref != expected:
        raise RuntimeError(
            "attestation workflow ref differs from exact assurance workflow provenance"
        )


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def parse_release_assets(specifications: Iterable[str]) -> dict[str, dict[str, object]]:
    assets: dict[str, dict[str, object]] = {}
    for specification in specifications:
        if "=" not in specification:
            raise RuntimeError("--release-asset must be NAME=PATH")
        name, raw_path = specification.split("=", 1)
        path = Path(raw_path).resolve()
        if not name or Path(name).name != name:
            raise RuntimeError(f"release asset name must be a basename: {name!r}")
        if name in assets:
            raise RuntimeError(f"duplicate release asset specification: {name}")
        if not path.is_file():
            raise RuntimeError(f"release asset is not a file: {path}")
        assets[name] = {
            "sha256": sha256_file(path),
            "size": path.stat().st_size,
            "path": str(path),
        }
    return assets


def expected_policy_asset_names(policy: dict[str, object], phase: str) -> set[str]:
    section = policy.get(f"{phase}_release")
    names = section.get("asset_names") if isinstance(section, dict) else None
    if (
        not isinstance(names, list)
        or not names
        or not all(isinstance(name, str) and Path(name).name == name for name in names)
        or len(names) != len(set(names))
    ):
        raise RuntimeError(f"{phase} release policy must declare unique asset_names")
    return set(names)


def _normalise_sha256(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    value = value.lower()
    if value.startswith("sha256:"):
        value = value.removeprefix("sha256:")
    return value if re.fullmatch(r"[0-9a-f]{64}", value) else None


def validate_release_json(
    release: dict[str, object],
    tag: str,
    expected_assets: dict[str, dict[str, object]] | None = None,
) -> None:
    if release.get("tag_name") != tag:
        raise RuntimeError("published release tag differs")
    if release.get("draft") is not False:
        raise RuntimeError("release is still a draft")
    if release.get("immutable") is not True:
        raise RuntimeError("published release is not platform immutable")
    if expected_assets is None:
        return
    raw_assets = release.get("assets")
    if not isinstance(raw_assets, list):
        raise RuntimeError("published release assets are absent")
    observed: dict[str, dict[str, object]] = {}
    for entry in raw_assets:
        if not isinstance(entry, dict) or not isinstance(entry.get("name"), str):
            raise RuntimeError("published release contains an invalid asset record")
        name = str(entry["name"])
        if name in observed:
            raise RuntimeError(f"published release contains duplicate asset: {name}")
        observed[name] = entry
    if set(observed) != set(expected_assets):
        missing = sorted(set(expected_assets) - set(observed))
        unexpected = sorted(set(observed) - set(expected_assets))
        raise RuntimeError(
            f"published release asset closure differs: missing={missing} unexpected={unexpected}"
        )
    for name, expected in expected_assets.items():
        entry = observed[name]
        digest = _normalise_sha256(entry.get("digest"))
        if digest != expected["sha256"]:
            raise RuntimeError(f"published release asset digest differs: {name}")
        if entry.get("size") != expected["size"]:
            raise RuntimeError(f"published release asset byte count differs: {name}")


def _walk_subjects(value: object) -> Iterable[tuple[str, str]]:
    """Yield verified in-toto subject name/SHA-256 pairs from gh JSON output."""

    if isinstance(value, list):
        for item in value:
            yield from _walk_subjects(item)
        return
    if not isinstance(value, dict):
        return
    name = value.get("name")
    digest = value.get("digest")
    if isinstance(name, str) and isinstance(digest, dict):
        sha256 = _normalise_sha256(digest.get("sha256"))
        if sha256 is not None:
            yield name, sha256
    for item in value.values():
        yield from _walk_subjects(item)


def validate_release_attestation_json(
    attestation: object,
    expected_assets: dict[str, dict[str, object]],
) -> None:
    """Require every exact release asset digest in verified `gh release verify` JSON."""

    subjects: dict[str, set[str]] = {}
    for name, digest in _walk_subjects(attestation):
        subjects.setdefault(Path(name).name, set()).add(digest)
    for name, expected in expected_assets.items():
        if expected["sha256"] not in subjects.get(name, set()):
            raise RuntimeError(
                f"verified release attestation does not bind exact asset digest: {name}"
            )


def validate_policy_shape(policy: dict[str, object]) -> None:
    if policy.get("schema") != "okf-release-policy.v2":
        raise RuntimeError("unsupported local release policy")
    github = policy.get("github")
    if not isinstance(github, dict) or {
        "immutable_releases_required": github.get("immutable_releases_required"),
        "immutable_release_evidence": github.get("immutable_release_evidence"),
        "administration_read_required": github.get("administration_read_required"),
    } != {
        "immutable_releases_required": True,
        "immutable_release_evidence": (
            "post-publication-release-json-and-gh-release-verify"
        ),
        "administration_read_required": False,
    }:
        raise RuntimeError("release policy does not enforce least-privilege immutability")
    closure = policy.get("closure")
    if not isinstance(closure, dict) or closure != {
        "envelope_subject": "candidate-release",
        "container_status": "verified-after-publish",
        "self_binding_forbidden": True,
        "final_container_observation_outside_envelope": True,
    }:
        raise RuntimeError("release closure policy is not cycle-free v2")
    expected_policy_asset_names(policy, "candidate")
    expected_policy_asset_names(policy, "promotion")


def validate_tag_pattern(policy: dict[str, object], phase: str, tag: str) -> None:
    section = policy.get(f"{phase}_release")
    pattern = section.get("tag_pattern") if isinstance(section, dict) else None
    if not isinstance(pattern, str) or re.fullmatch(pattern, tag) is None:
        raise RuntimeError(f"{phase} release tag does not match policy: {tag}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--phase", choices=("candidate", "promotion"), default="promotion")
    parser.add_argument("--tag", required=True)
    parser.add_argument("--candidate-tag")
    parser.add_argument(
        "--immutable-settings",
        type=Path,
        help=(
            "optional operator-supplied immutable-release capability response; "
            "workflow authority comes from post-publication release JSON"
        ),
    )
    parser.add_argument(
        "--attested-envelope",
        type=Path,
        required=False,
        help="promoted envelope whose exact bytes must pass gh attestation verify",
    )
    parser.add_argument(
        "--repository",
        required=True,
        help="OWNER/REPO attestation source",
    )
    parser.add_argument("--repository-root", type=Path, default=ROOT)
    parser.add_argument(
        "--source-repository-root",
        type=Path,
        default=ROOT,
        help="Git checkout containing the annotated candidate and promotion tags",
    )
    parser.add_argument("--publication-root", type=Path)
    parser.add_argument("--attested-archive", type=Path)
    parser.add_argument("--attestation-workflow-ref", required=True)
    parser.add_argument("--attestation-workflow-commit", required=True)
    parser.add_argument("--attestation-source-ref", required=True)
    parser.add_argument("--attestation-source-commit", required=True)
    parser.add_argument("--release-json", type=Path)
    parser.add_argument(
        "--release-attestation-json",
        type=Path,
        help="JSON emitted by a successful `gh release verify TAG --format json`",
    )
    parser.add_argument(
        "--release-asset",
        action="append",
        default=[],
        metavar="NAME=PATH",
        help="exact local release asset; repeat once for every policy asset",
    )
    args = parser.parse_args(argv)
    policy = json.loads(POLICY_PATH.read_text(encoding="utf-8"))
    validate_policy_shape(policy)
    validate_tag_pattern(policy, args.phase, args.tag)
    if args.immutable_settings is not None:
        settings = json.loads(args.immutable_settings.read_text(encoding="utf-8"))
        validate_immutable_settings(settings)
    if bool(args.release_json) != bool(args.release_attestation_json):
        raise RuntimeError(
            "post-publication verification requires both --release-json and "
            "--release-attestation-json"
        )
    release_assets = parse_release_assets(args.release_asset)
    if args.release_json:
        expected_names = expected_policy_asset_names(policy, args.phase)
        if set(release_assets) != expected_names:
            raise RuntimeError(
                "local release asset specifications differ from policy: "
                f"missing={sorted(expected_names - set(release_assets))} "
                f"unexpected={sorted(set(release_assets) - expected_names)}"
            )
        validate_release_json(
            json.loads(args.release_json.read_text(encoding="utf-8")),
            args.tag,
            release_assets,
        )
        validate_release_attestation_json(
            json.loads(args.release_attestation_json.read_text(encoding="utf-8")),
            release_assets,
        )
    elif release_assets:
        raise RuntimeError("--release-asset is only valid for post-publication verification")

    workflow_name = (
        "candidate-release.yml" if args.phase == "candidate" else "promotion-release.yml"
    )
    validate_attestation_provenance(
        repository=args.repository,
        workflow=workflow_name,
        workflow_ref=args.attestation_workflow_ref,
        workflow_commit=args.attestation_workflow_commit,
        source_ref=args.attestation_source_ref,
        source_commit=args.attestation_source_commit,
    )
    immutability = (
        "verified-post-publication" if args.release_json else "deferred-post-publication"
    )

    if args.phase == "candidate":
        if args.attested_archive is None:
            raise RuntimeError("candidate phase requires --attested-archive")
        identity = validate_annotated_tag(
            args.tag,
            attestation_fallback="verified-archive-attestation",
            repository_root=args.source_repository_root,
        )
        archive_sha256 = verify_attested_asset(
            args.attested_archive,
            args.repository,
            signer_workflow=(
                f"github.com/{args.repository}/.github/workflows/candidate-release.yml"
            ),
            signer_digest=args.attestation_workflow_commit,
            source_ref=args.attestation_source_ref,
            source_digest=args.attestation_source_commit,
        )
        print(
            "candidate release policy passed: "
            f"tag={identity['tag']} commit={identity['commit']} "
            f"tag_authentication={identity['authentication']} "
            f"immutability={immutability} "
            f"attestation_workflow_commit={args.attestation_workflow_commit} "
            f"archive_sha256={archive_sha256}"
        )
        return 0

    if (
        args.attested_envelope is None
        or args.publication_root is None
        or args.candidate_tag is None
    ):
        raise RuntimeError(
            "promotion phase requires --candidate-tag, --attested-envelope and "
            "--publication-root"
    )
    validate_tag_pattern(policy, "candidate", args.candidate_tag)
    candidate_identity = validate_annotated_tag(
        args.candidate_tag,
        attestation_fallback="attested-promotion-envelope",
        repository_root=args.source_repository_root,
    )
    promotion_identity = validate_annotated_tag(
        args.tag,
        attestation_fallback="attested-promotion-envelope",
        repository_root=args.source_repository_root,
    )
    attestation = verify_attested_envelope(
        args.attested_envelope,
        args.repository,
        signer_workflow=(
            f"github.com/{args.repository}/.github/workflows/promotion-release.yml"
        ),
        signer_digest=args.attestation_workflow_commit,
        source_ref=args.attestation_source_ref,
        source_digest=args.attestation_source_commit,
        repository_root=args.repository_root.resolve(),
        publication_root=args.publication_root.resolve(),
    )
    if attestation["candidate_tag"] != args.candidate_tag:
        raise RuntimeError("candidate tag differs from promotion envelope subject.tag")
    if attestation["promotion_tag"] != args.tag:
        raise RuntimeError("promotion tag differs from promotion envelope container.tag")
    if candidate_identity["commit"] != promotion_identity["commit"]:
        raise RuntimeError("candidate and promotion tags do not resolve to the same commit")
    if attestation["source_commit"] != candidate_identity["commit"]:
        raise RuntimeError("tag commit differs from promotion envelope source_commit")
    print(
        "promotion release policy passed: "
        f"candidate_tag={candidate_identity['tag']} promotion_tag={promotion_identity['tag']} "
        f"commit={candidate_identity['commit']} immutability={immutability} "
        f"tag_authentication={promotion_identity['authentication']} "
        f"attestation_workflow_commit={args.attestation_workflow_commit} "
        f"envelope_sha256={attestation['envelope_sha256']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
