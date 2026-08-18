#!/usr/bin/env python3
"""Plan contract-declared OKF publication checks from changed repository paths."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

from okf_publication import (
    CONTRACT_NAME,
    PublicationContractError,
    build_impact_plan,
    load_publication_contract,
)


ROOT = Path(__file__).resolve().parents[1]


def git_changed_paths(root: Path, base: str | None) -> list[str]:
    args = ["git", "diff", "--name-only"]
    if base:
        args.append(base)
    result = subprocess.run(args, cwd=root, check=True, text=True, capture_output=True)
    paths = {line.strip() for line in result.stdout.splitlines() if line.strip()}
    if not base:
        for extra in (
            ["git", "diff", "--cached", "--name-only"],
            ["git", "ls-files", "--others", "--exclude-standard"],
        ):
            result = subprocess.run(
                extra, cwd=root, check=True, text=True, capture_output=True
            )
            paths.update(line.strip() for line in result.stdout.splitlines() if line.strip())
    return sorted(paths)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="*", help="changed repository-relative paths")
    parser.add_argument("--base", help="git diff range to inspect when paths are omitted")
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
        paths = args.paths or git_changed_paths(root, args.base)
        plan = build_impact_plan(contract, paths)
    except (PublicationContractError, subprocess.CalledProcessError) as error:
        print(f"publication impact could not be evaluated: {error}", file=sys.stderr)
        return 2

    print(json.dumps(plan, indent=2, ensure_ascii=False) + "\n", end="")
    return 1 if plan["fail_closed"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
