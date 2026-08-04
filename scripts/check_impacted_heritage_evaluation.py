#!/usr/bin/env python3
"""Run only the heritage builder checks selected by an impact plan."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BUILDER = ROOT / "scripts" / "build_heritage_evaluation.py"
FIXTURE_ORDER = ("tiny", "faithful", "synthetic")
PLANE_ORDER = ("control", "data", "search", "semantic", "presentation")


def string_list(value: str, label: str) -> list[str]:
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError as error:
        raise ValueError(f"{label} must be a JSON array: {error}") from error
    if not isinstance(parsed, list) or any(not isinstance(item, str) for item in parsed):
        raise ValueError(f"{label} must be a JSON array of strings")
    return parsed


def selected_commands(fixtures_json: str, planes_json: str) -> list[list[str]]:
    fixtures = set(string_list(fixtures_json, "fixtures"))
    planes = set(string_list(planes_json, "planes"))
    unknown_fixtures = fixtures.difference(FIXTURE_ORDER)
    unknown_planes = planes.difference(PLANE_ORDER)
    if unknown_fixtures:
        raise ValueError(f"unknown builder fixtures: {sorted(unknown_fixtures)}")
    if unknown_planes:
        raise ValueError(f"unknown builder planes: {sorted(unknown_planes)}")
    selected_planes = [plane for plane in PLANE_ORDER if not planes or plane in planes]
    return [
        [
            sys.executable,
            str(BUILDER),
            "--check",
            "--fixture",
            fixture,
            *(
                argument
                for plane in selected_planes
                for argument in ("--plane", plane)
            ),
        ]
        for fixture in FIXTURE_ORDER
        if fixture in fixtures
    ]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fixtures-json", required=True)
    parser.add_argument("--planes-json", required=True)
    args = parser.parse_args(argv)
    try:
        commands = selected_commands(args.fixtures_json, args.planes_json)
    except ValueError as error:
        parser.error(str(error))
    if not commands:
        print("impact plan selected no heritage candidate builder checks")
        return 0
    for command in commands:
        print("running impacted builder check: " + " ".join(command[2:]))
        result = subprocess.run(command, cwd=ROOT, check=False)
        if result.returncode:
            return result.returncode
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
