#!/usr/bin/env python3
"""Install or verify the reviewed personal OKF skills without enabling plugins."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

sys.path.insert(0, str(Path(__file__).resolve().parent))
import okf_skill as guard  # noqa: E402

NAMES = ("okf-plus-consume", "okf-plus-generate")


def check_installed(destination: Path, manifest: dict) -> None:
    for name in NAMES:
        skill = destination / name
        if skill.is_symlink() or not skill.is_dir():
            raise guard.GuardError(f"missing or unsafe installed skill: {name}")
        prefix = f"skills/{name}/"
        expected = {p.removeprefix(prefix): value for p, value in manifest["files"].items()
                    if p.startswith(prefix)}
        actual = set()
        for path in skill.rglob("*"):
            if path.is_symlink() or not (path.is_file() or path.is_dir()):
                raise guard.GuardError(f"unsafe installed entry: {path}")
            if path.is_file():
                actual.add(path.relative_to(skill).as_posix())
        if actual != set(expected) | {"INSTALLATION.json"}:
            raise guard.GuardError(f"installed file inventory differs: {name}")
        for path, value in expected.items():
            if guard.digest(skill / path) != value:
                raise guard.GuardError(f"installed skill digest mismatch: {name}/{path}")
        receipt = json.loads((skill / "INSTALLATION.json").read_text())
        if receipt.get("package_manifest_sha256") != guard.digest(guard.PACKAGE / "manifest.json"):
            raise guard.GuardError(f"installed package pin differs: {name}")
        if receipt.get("launcher") != str(guard.ROOT / "scripts/okf_skill.py"):
            raise guard.GuardError(f"installed launcher location differs: {name}")


def install(destination: Path, manifest: dict, replace: bool = False) -> dict:
    if destination.is_symlink():
        raise guard.GuardError("the destination must not be a symlink")
    for name in NAMES:
        current = destination / name
        if current.is_symlink() or (current.exists() and not current.is_dir()):
            raise guard.GuardError(f"unsafe installed destination: {current}")
        if current.exists() and not replace:
            raise guard.GuardError("existing skills require an explicit --replace")
    destination.mkdir(parents=True, exist_ok=True)
    backup = destination.parent / "okf-skill-backups" / datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S.%fZ")
    promoted, saved = [], []
    with tempfile.TemporaryDirectory(prefix=".okf-install-", dir=destination) as temporary:
        staged = Path(temporary)
        for name in NAMES:
            shutil.copytree(guard.PACKAGE / "skills" / name, staged / name)
            (staged / name / "INSTALLATION.json").write_text(json.dumps({
                "schema": "okf-guarded-skill-installation.v1", "version": manifest["version"],
                "package_manifest_sha256": guard.digest(guard.PACKAGE / "manifest.json"),
                "launcher": str(guard.ROOT / "scripts/okf_skill.py"),
                "source_checkout": str(guard.ROOT),
                "source_commit": subprocess.run(
                    ["git", "-C", str(guard.ROOT), "rev-parse", "HEAD"],
                    check=True, capture_output=True, text=True, timeout=10,
                ).stdout.strip(),
            }, indent=2) + "\n")
        check_installed(staged, manifest)
        try:
            for name in NAMES:
                current = destination / name
                if current.exists():
                    backup.mkdir(parents=True, exist_ok=True)
                    os.rename(current, backup / name)
                    saved.append(name)
                os.rename(staged / name, current)
                promoted.append(name)
            check_installed(destination, manifest)
        except Exception:
            for name in reversed(promoted):
                shutil.rmtree(destination / name)
            for name in saved:
                os.rename(backup / name, destination / name)
            raise
    return {"installed": list(NAMES), "version": manifest["version"],
            "backup": str(backup) if saved else None, "implicit_invocation": False}


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("operation", choices=("check", "install"))
    parser.add_argument("--destination", type=Path, default=Path.home() / ".agents/skills")
    parser.add_argument("--replace", action="store_true")
    args = parser.parse_args(argv)
    try:
        guard.verify_runtime()
        manifest = guard.verify_package()
        if args.operation == "check":
            if args.replace:
                raise guard.GuardError("checking does not accept --replace")
            check_installed(args.destination, manifest)
            print(json.dumps({"installed_integrity": "passed", "version": manifest["version"]}))
        else:
            print(json.dumps(install(args.destination, manifest, args.replace), indent=2))
        return 0
    except (guard.GuardError, OSError, ValueError) as error:
        print(f"OKF skill setup refused: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
