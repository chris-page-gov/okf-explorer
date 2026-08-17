#!/usr/bin/env python3
"""Build the local repository evidence inventory for the OKF evolution review.

The scan records observable files and Git history. It deliberately does not
infer that a repository is conformant, published or complete merely because a
file has an OKF-related name.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import subprocess
from pathlib import Path
from typing import Any


DEFAULT_REPOS_ROOT = Path("/Users/crpage/repos")
DEFAULT_OUTPUT = Path("research/okf-evolution-review/evidence/repository-scan.json")
SKIP_PARTS = {
    ".git",
    ".venv",
    "node_modules",
    "dist",
    "build",
    "__pycache__",
    ".mypy_cache",
    ".pytest_cache",
}
EXACT_MARKERS = {
    "LLM-WIKI.md",
    "okf.semantic.json",
    "okf-bundle.json",
    "okf-bundle.yamlld",
    "okf-bundle.jsonld",
    "okf-explorer.json",
    "okf-registry.json",
    "okf-registry.jsonld",
}
PATH_MARKERS = {
    "wiki/architecture/llm-wiki-architecture.md",
    "registry/okf-registry.yamlld",
    "MCP-Wiki/index.md",
}
TEXT_SUFFIXES = {".md", ".json", ".yaml", ".yml", ".toml"}
TEXT_TERMS = (
    "LLM-Wiki",
    "Open Knowledge Format",
    "OKF 0.1",
    "OKF 0.2",
    "YAML-LD",
    "Bundle Wiki",
)


def run_git(repo: Path, *args: str) -> str | None:
    completed = subprocess.run(
        ["git", "-C", str(repo), *args],
        check=False,
        capture_output=True,
        text=True,
        timeout=30,
    )
    if completed.returncode != 0:
        return None
    return completed.stdout.strip()


def discover_repositories(root: Path) -> list[Path]:
    repositories: set[Path] = set()
    for git_marker in root.glob("*/.git"):
        repositories.add(git_marker.parent.resolve())
    for git_marker in root.glob("*/*/.git"):
        repositories.add(git_marker.parent.resolve())
    return sorted(repositories, key=lambda item: str(item).casefold())


def candidate_files(repo: Path) -> list[Path]:
    found: list[Path] = []
    tracked = run_git(repo, "ls-files", "-z")
    if tracked is None:
        return found
    for relative_text in tracked.split("\0"):
        if not relative_text:
            continue
        relative = Path(relative_text)
        if any(part in SKIP_PARTS for part in relative.parts):
            continue
        candidate = repo / relative
        if not candidate.is_file():
            continue
        relative_posix = relative.as_posix()
        if candidate.name in EXACT_MARKERS or relative_posix in PATH_MARKERS:
            found.append(relative)
            continue
        if candidate.suffix.lower() not in TEXT_SUFFIXES:
            continue
        try:
            if candidate.stat().st_size > 2_000_000:
                continue
            text = candidate.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        if any(term.casefold() in text.casefold() for term in TEXT_TERMS):
            found.append(relative)
    return sorted(set(found), key=lambda item: item.as_posix().casefold())


def commit_record(raw: str | None) -> dict[str, str] | None:
    if not raw:
        return None
    first_line = raw.splitlines()[0]
    fields = first_line.split("\t", 2)
    if len(fields) != 3:
        return None
    return {"commit": fields[0], "committed_at": fields[1], "subject": fields[2]}


def git_history(repo: Path, reverse: bool) -> dict[str, str] | None:
    ordering = ["--reverse"] if reverse else []
    limit = [] if reverse else ["-1"]
    raw = run_git(
        repo,
        "log",
        "--all",
        *ordering,
        "-i",
        "--extended-regexp",
        "--grep=LLM[- ]Wiki|Open Knowledge Format|OKF|YAML-LD|Bundle Wiki",
        *limit,
        "--date=iso-strict",
        "--pretty=format:%H%x09%cI%x09%s",
    )
    return commit_record(raw)


def inspect_repository(repo: Path) -> dict[str, Any] | None:
    markers = candidate_files(repo)
    if not markers:
        return None
    remote = run_git(repo, "remote", "get-url", "origin")
    head = run_git(repo, "rev-parse", "HEAD")
    first_commit = commit_record(
        run_git(
            repo,
            "log",
            "--all",
            "--reverse",
            "--date=iso-strict",
            "--pretty=format:%H%x09%cI%x09%s",
        )
    )
    latest_commit = commit_record(
        run_git(
            repo,
            "log",
            "--all",
            "-1",
            "--date=iso-strict",
            "--pretty=format:%H%x09%cI%x09%s",
        )
    )
    return {
        "name": repo.name,
        "path": str(repo),
        "origin": remote,
        "head": head,
        "first_repository_commit": first_commit,
        "latest_repository_commit": latest_commit,
        "first_keyword_commit": git_history(repo, reverse=True),
        "latest_keyword_commit": git_history(repo, reverse=False),
        "marker_count": len(markers),
        "markers": [marker.as_posix() for marker in markers],
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repos-root", type=Path, default=DEFAULT_REPOS_ROOT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    repositories = discover_repositories(args.repos_root.resolve())
    inspected = [inspect_repository(repo) for repo in repositories]
    candidates = [item for item in inspected if item is not None]
    payload = {
        "schema": "okf-evolution-repository-scan.v1",
        "generated_at": dt.datetime.now(dt.UTC).isoformat(),
        "scope": {
            "repos_root": str(args.repos_root.resolve()),
            "repository_depth": 2,
            "selection": "observable filename, path or bounded text marker",
            "classification_warning": (
                "A marker is discovery evidence only. It does not establish OKF "
                "conformance, bundle completeness, publication or authorship."
            ),
        },
        "repositories_scanned": len(repositories),
        "candidate_repositories": len(candidates),
        "repositories": candidates,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
