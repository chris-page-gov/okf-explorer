#!/usr/bin/env python3
"""Collect private evidence for the heritage Evaluation Foundry postmortem.

The collector deliberately writes only beneath the ignored ``postmortem/``
tree.  Public, redacted and normalized derivatives are produced separately by
``build_heritage_foundry_postmortem.py``.
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import subprocess
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PRIVATE_ROOT = ROOT / "postmortem" / "evidence"
REPOSITORY = "chris-page-gov/okf-explorer"
SESSION_ID = "019fc471-90ec-7633-abde-8e72fcdd5280"
PULL_REQUESTS = (67, 68, 69)
RUN_IDS = (
    30799819042,
    30800609874,
    30812594912,
    30813485357,
    30818372899,
    30819232224,
)
RELEASE_TAG = "heritage-coventry-warwickshire-20260803"
PAGES_TAR_SHA256 = {
    30800609874: "ab7fea01c0298a849eb0a049de0f6011823960eef096f9ed28412f44b377c071",
    30813485357: "341391ab234c8a34a372e01e3b971561601ed0f4e3ab6b5a6bf15e195601b976",
    30819232224: "dfd9472a78bf1fd0378abe9ede5b4980b44b77d4342c03a350b01c88df259be3",
}

PR_FIELDS = ",".join(
    (
        "number",
        "title",
        "state",
        "author",
        "body",
        "createdAt",
        "updatedAt",
        "closedAt",
        "mergedAt",
        "mergeCommit",
        "headRefName",
        "headRefOid",
        "baseRefName",
        "additions",
        "deletions",
        "changedFiles",
        "commits",
        "files",
        "comments",
        "reviews",
        "reviewDecision",
        "statusCheckRollup",
        "url",
    )
)
RUN_FIELDS = ",".join(
    (
        "attempt",
        "conclusion",
        "createdAt",
        "displayTitle",
        "event",
        "headBranch",
        "headSha",
        "jobs",
        "name",
        "startedAt",
        "status",
        "updatedAt",
        "url",
        "workflowDatabaseId",
    )
)
RELEASE_FIELDS = ",".join(
    (
        "apiUrl",
        "assets",
        "author",
        "body",
        "createdAt",
        "databaseId",
        "isDraft",
        "isImmutable",
        "isPrerelease",
        "name",
        "publishedAt",
        "tagName",
        "targetCommitish",
        "url",
    )
)


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def sha256_gzip_payload(path: Path) -> str:
    digest = hashlib.sha256()
    with gzip.open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_bytes(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_bytes(data)
    temporary.replace(path)


def write_json(path: Path, value: Any) -> None:
    write_bytes(
        path,
        (json.dumps(value, indent=2, ensure_ascii=False) + "\n").encode("utf-8"),
    )


def command_bytes(args: list[str]) -> bytes:
    try:
        result = subprocess.run(
            args,
            cwd=ROOT,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
    except FileNotFoundError as exc:
        raise SystemExit(f"Required executable is unavailable: {args[0]}") from exc
    except subprocess.CalledProcessError as exc:
        detail = exc.stderr.decode("utf-8", errors="replace").strip()
        raise SystemExit(f"Command failed ({' '.join(args)}): {detail}") from exc
    return result.stdout


def command_json(args: list[str]) -> Any:
    return json.loads(command_bytes(args))


def find_session_path() -> Path:
    codex_home = Path.home() / ".codex"
    matches = sorted(
        [
            *codex_home.glob(f"sessions/**/rollout-*{SESSION_ID}.jsonl"),
            *codex_home.glob(f"archived_sessions/rollout-*{SESSION_ID}.jsonl"),
        ]
    )
    if len(matches) != 1:
        raise SystemExit(
            f"Expected one rollout JSONL for {SESSION_ID}; found {len(matches)}."
        )
    return matches[0]


def collect_local(private_root: Path, session_path: Path) -> list[dict[str, Any]]:
    collected: list[dict[str, Any]] = []
    git_root = private_root / "git"
    commands = {
        "status.txt": ["git", "status", "--short", "--branch"],
        "worktrees.txt": ["git", "worktree", "list", "--porcelain"],
        "branches.txt": [
            "git",
            "for-each-ref",
            "--format=%(refname:short)%09%(objectname)%09%(committerdate:iso8601)%09%(subject)",
            "refs/heads",
            "refs/remotes/origin",
        ],
        "heritage-log.txt": [
            "git",
            "log",
            "--reverse",
            "--format=%H%x09%T%x09%P%x09%aI%x09%cI%x09%s",
            "f5d38674..0b5d748d",
        ],
        "heritage-reflog.txt": [
            "git",
            "reflog",
            "--all",
            "--date=iso",
            "--format=%H%x09%h%x09%gD%x09%gs",
        ],
        "heritage-numstat.txt": [
            "git",
            "diff",
            "--numstat",
            "f5d38674..0b5d748d",
        ],
    }
    for filename, args in commands.items():
        path = git_root / filename
        write_bytes(path, command_bytes(args))
        collected.append(
            {
                "kind": "git-command-output",
                "path": path.relative_to(private_root).as_posix(),
                "command": args,
            }
        )

    session_manifest = {
        "session_id": SESSION_ID,
        "source_path": "[CODEX_SESSION_JSONL]",
        "source_sha256": sha256_file(session_path),
        "source_bytes": session_path.stat().st_size,
        "source_lines": sum(1 for _line in session_path.open("rb")),
        "extraction_policy": (
            "Visible user and assistant messages only; hidden instructions, reasoning, "
            "tool arguments and tool outputs are excluded from the public trace."
        ),
    }
    path = private_root / "codex" / "session-manifest.json"
    write_json(path, session_manifest)
    collected.append(
        {
            "kind": "codex-session-manifest",
            "path": path.relative_to(private_root).as_posix(),
            "source": "[CODEX_SESSION_JSONL]",
        }
    )

    pages_root = private_root / "github" / "pages"
    pages_archives: list[dict[str, Any]] = []
    for run_id, expected_tar_sha256 in PAGES_TAR_SHA256.items():
        archive = pages_root / str(run_id) / "artifact.tar.gz"
        if not archive.exists():
            continue
        actual_payload_sha256 = sha256_gzip_payload(archive)
        if actual_payload_sha256 != expected_tar_sha256:
            raise SystemExit(
                f"Pages archive {archive} does not reproduce the downloaded tar digest."
            )
        pages_archives.append(
            {
                "run_id": run_id,
                "path": archive.relative_to(private_root).as_posix(),
                "stored_bytes": archive.stat().st_size,
                "stored_sha256": sha256_file(archive),
                "decompressed_tar_sha256": actual_payload_sha256,
            }
        )
    path = pages_root / "archive-manifest.json"
    write_json(path, pages_archives)
    collected.append(
        {
            "kind": "pages-archive-manifest",
            "path": path.relative_to(private_root).as_posix(),
            "archives": len(pages_archives),
        }
    )
    return collected


def collect_github(private_root: Path) -> list[dict[str, Any]]:
    collected: list[dict[str, Any]] = []
    github_root = private_root / "github"

    for number in PULL_REQUESTS:
        path = github_root / "pull-requests" / f"{number}.json"
        value = command_json(
            ["gh", "pr", "view", str(number), "--repo", REPOSITORY, "--json", PR_FIELDS]
        )
        write_json(path, value)
        collected.append(
            {
                "kind": "github-pull-request",
                "path": path.relative_to(private_root).as_posix(),
                "source": value["url"],
            }
        )

    for run_id in RUN_IDS:
        run_root = github_root / "actions" / str(run_id)
        value = command_json(
            ["gh", "run", "view", str(run_id), "--repo", REPOSITORY, "--json", RUN_FIELDS]
        )
        metadata_path = run_root / "run.json"
        write_json(metadata_path, value)
        collected.append(
            {
                "kind": "github-actions-run",
                "path": metadata_path.relative_to(private_root).as_posix(),
                "source": value["url"],
            }
        )

        raw_log = command_bytes(
            ["gh", "run", "view", str(run_id), "--repo", REPOSITORY, "--log"]
        )
        log_path = run_root / "run.log.gz"
        write_bytes(log_path, gzip.compress(raw_log, compresslevel=6, mtime=0))
        collected.append(
            {
                "kind": "github-actions-log",
                "path": log_path.relative_to(private_root).as_posix(),
                "source": value["url"],
                "uncompressed_bytes": len(raw_log),
                "uncompressed_sha256": sha256_bytes(raw_log),
            }
        )

    release_root = github_root / "release" / RELEASE_TAG
    release = command_json(
        [
            "gh",
            "release",
            "view",
            RELEASE_TAG,
            "--repo",
            REPOSITORY,
            "--json",
            RELEASE_FIELDS,
        ]
    )
    release_path = release_root / "release.json"
    write_json(release_path, release)
    collected.append(
        {
            "kind": "github-release",
            "path": release_path.relative_to(private_root).as_posix(),
            "source": release["url"],
        }
    )
    release_root.mkdir(parents=True, exist_ok=True)
    command_bytes(
        [
            "gh",
            "release",
            "download",
            RELEASE_TAG,
            "--repo",
            REPOSITORY,
            "--dir",
            str(release_root),
            "--clobber",
        ]
    )
    for asset in release.get("assets", []):
        asset_path = release_root / asset["name"]
        if asset_path.exists():
            collected.append(
                {
                    "kind": "github-release-asset",
                    "path": asset_path.relative_to(private_root).as_posix(),
                    "source": asset.get("url"),
                }
            )
    return collected


def finalize_register(
    private_root: Path,
    collected_at: str,
    records: list[dict[str, Any]],
) -> None:
    for record in records:
        path = private_root / record["path"]
        record["bytes"] = path.stat().st_size
        record["sha256"] = sha256_file(path)
    records.sort(key=lambda item: item["path"])
    write_json(
        private_root / "collection-register.json",
        {
            "schema": "okf-heritage-postmortem-private-evidence.v1",
            "collected_at": collected_at,
            "repository": REPOSITORY,
            "records": records,
        },
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--private-root", type=Path, default=DEFAULT_PRIVATE_ROOT)
    parser.add_argument("--session-path", type=Path)
    parser.add_argument(
        "--local-only",
        action="store_true",
        help="Refresh Git/session/archive evidence without calling GitHub.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    private_root = args.private_root.resolve()
    session_path = (args.session_path or find_session_path()).resolve()
    collected_at = datetime.now(tz=UTC).isoformat().replace("+00:00", "Z")
    records = collect_local(private_root, session_path)
    if args.local_only:
        # A final local/session refresh must not discard already collected
        # GitHub records, especially the deployment archives whose one-day
        # retention may already have expired.
        register_path = private_root / "collection-register.json"
        if register_path.exists():
            existing = json.loads(register_path.read_text(encoding="utf-8"))
            refreshed_paths = {record["path"] for record in records}
            for record in existing.get("records", []):
                if record.get("path") in refreshed_paths:
                    continue
                retained = {
                    key: value
                    for key, value in record.items()
                    if key not in {"bytes", "sha256"}
                }
                records.append(retained)
    else:
        records.extend(collect_github(private_root))
    finalize_register(private_root, collected_at, records)
    print(
        f"Collected {len(records)} evidence records beneath "
        f"{private_root.relative_to(ROOT)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
