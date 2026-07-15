#!/usr/bin/env python3
"""Require documentation and changelog updates for publication-affecting changes."""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

CONTROLLED_PREFIXES = (
    ".github/workflows/",
    "apps/okf-explorer/src/",
    "apps/okf-explorer/tests/",
    "explorer/",
    "scripts/",
    "sources/",
    "tests/",
    "uk-government-apis/",
    "legislation/",
    "evaluation/legislation/",
    "evaluation/okf-explorer/",
)
CONTROLLED_FILES = (
    "apps/okf-explorer/package.json",
    "apps/okf-explorer/pnpm-lock.yaml",
    "apps/okf-explorer/playwright.config.ts",
    "README.md",
)
DOCUMENTATION_PREFIXES = ("docs/", "sources/")
DOCUMENTATION_FILES = ("README.md", "CHANGELOG.md")
CHANGELOG = "CHANGELOG.md"


def git_lines(args: list[str]) -> list[str]:
    result = subprocess.run(["git", *args], cwd=ROOT, check=True, text=True, capture_output=True)
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def changed_files(base: str | None) -> set[str]:
    if base:
        return set(git_lines(["diff", "--name-only", base]))
    files = set(git_lines(["diff", "--name-only"]))
    files.update(git_lines(["diff", "--cached", "--name-only"]))
    files.update(git_lines(["ls-files", "--others", "--exclude-standard"]))
    return files


def is_controlled(path: str) -> bool:
    return path in CONTROLLED_FILES or path.startswith(CONTROLLED_PREFIXES)


def is_documentation(path: str) -> bool:
    return path in DOCUMENTATION_FILES or path.startswith(DOCUMENTATION_PREFIXES)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", help="git diff range to inspect, for example origin/main...HEAD")
    args = parser.parse_args()

    if os.environ.get("GITHUB_ACTOR") == "dependabot[bot]":
        print("documentation lockstep skipped for Dependabot dependency maintenance")
        return 0

    files = changed_files(args.base)
    controlled = sorted(path for path in files if is_controlled(path))
    if not controlled:
        print("documentation lockstep: no controlled publication files changed")
        return 0

    docs = sorted(path for path in files if is_documentation(path))
    errors: list[str] = []
    if not docs:
        errors.append("controlled publication files changed without README/docs/sources/CHANGELOG documentation changes")
    if CHANGELOG not in files:
        errors.append("controlled publication files changed without CHANGELOG.md")

    if errors:
        print("documentation lockstep failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        print("Controlled files:", file=sys.stderr)
        for path in controlled[:40]:
            print(f"- {path}", file=sys.stderr)
        if len(controlled) > 40:
            print(f"- ... {len(controlled) - 40} more", file=sys.stderr)
        return 1

    print(f"documentation lockstep: {len(controlled)} controlled file(s), {len(docs)} documentation file(s), changelog updated")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
