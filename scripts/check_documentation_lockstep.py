#!/usr/bin/env python3
"""Require contract-declared documentation and changelog publication lockstep."""

from __future__ import annotations

import argparse
import subprocess
import sys
from collections.abc import Iterable, Mapping
from pathlib import Path
from typing import Any

from okf_publication import (
    CONTRACT_NAME,
    PublicationContractError,
    load_publication_contract,
    matches_any,
)


ROOT = Path(__file__).resolve().parents[1]


def git_lines(root: Path, args: list[str]) -> list[str]:
    result = subprocess.run(
        ["git", *args], cwd=root, check=True, text=True, capture_output=True
    )
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def changed_files(root: Path, base: str | None) -> set[str]:
    if base:
        return set(git_lines(root, ["diff", "--name-only", base]))
    files = set(git_lines(root, ["diff", "--name-only"]))
    files.update(git_lines(root, ["diff", "--cached", "--name-only"]))
    files.update(git_lines(root, ["ls-files", "--others", "--exclude-standard"]))
    return files


def lockstep_errors(
    contract: Mapping[str, Any], changed: Iterable[str]
) -> tuple[list[str], list[str], list[str]]:
    """Return errors, controlled paths and documentation paths."""

    files = set(changed)
    lockstep = contract["lockstep"]
    controlled = sorted(
        path for path in files if matches_any(path, lockstep["controlled_paths"])
    )
    if not controlled:
        return [], [], []
    documentation = sorted(
        path for path in files if matches_any(path, lockstep["documentation_paths"])
    )
    errors: list[str] = []
    if not documentation:
        errors.append(
            "controlled publication files changed without a contract-declared documentation change"
        )
    changelog = lockstep["changelog_path"]
    if changelog not in files:
        errors.append(f"controlled publication files changed without {changelog}")
    return errors, controlled, documentation


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", help="git diff range to inspect, for example origin/main...HEAD")
    parser.add_argument("--root", type=Path, default=ROOT, help="repository root")
    parser.add_argument(
        "--contract",
        type=Path,
        default=Path(CONTRACT_NAME),
        help="publication contract path, relative to the repository root",
    )
    args = parser.parse_args()
    root = args.root.resolve()

    try:
        contract = load_publication_contract(root, args.contract)
        files = changed_files(root, args.base)
        errors, controlled, documentation = lockstep_errors(contract, files)
    except (PublicationContractError, subprocess.CalledProcessError) as error:
        print(f"documentation lockstep could not be evaluated: {error}", file=sys.stderr)
        return 2

    if not controlled:
        print("documentation lockstep: no controlled publication files changed")
        return 0
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

    print(
        "documentation lockstep: "
        f"{len(controlled)} controlled file(s), "
        f"{len(documentation)} documentation file(s), changelog updated"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
