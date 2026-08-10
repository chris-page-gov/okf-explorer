"""Produce a compact, read-only orientation report for an OKF repository."""

from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path
from typing import Any

DESCRIPTOR_CANDIDATES = (
    "okf-explorer.json",
    "publication/okf-explorer.json",
    "bundle/okf-explorer.json",
    "okf-bundle.json",
    "bundle/okf-bundle.json",
)

AUTHORED_MARKERS = (
    "index.md",
    "research",
    "source",
    "domain-profile",
    "profiles",
    "ontology",
    "schemas",
    "shapes",
    "evaluation",
)

GENERATED_MARKERS = (
    "bundle",
    "generated",
    "large",
    "dist",
    "_site",
    "pages",
    "release-assurance",
    "validation",
)

CONTROL_MARKERS = (
    "AGENTS.md",
    "README.md",
    "REPOSITORY_STATUS.md",
    "PLANNING.md",
    "TRACKING.md",
    "CHANGELOG.md",
    "okf.config.json",
    "pyproject.toml",
    "uv.lock",
    "Makefile",
)

COMMAND_PREFIXES = (
    "python ",
    "python3 ",
    ".venv/bin/python ",
    "uv run ",
    "make ",
    "node ",
    "pnpm ",
    "npm ",
    "pytest ",
    "ruff ",
    "bash ",
    "./",
)


def run_git(root: Path, *args: str) -> tuple[int, str]:
    result = subprocess.run(
        ("git", *args),
        cwd=root,
        check=False,
        capture_output=True,
        text=True,
    )
    return result.returncode, result.stdout.strip()


def resolve_root(path: Path) -> tuple[Path, bool]:
    candidate = path.expanduser().resolve()
    if candidate.is_file():
        candidate = candidate.parent
    code, output = run_git(candidate, "rev-parse", "--show-toplevel")
    if code == 0 and output:
        return Path(output).resolve(), True
    return candidate, False


def load_json(path: Path) -> tuple[dict[str, Any] | None, str | None]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        return None, str(exc)
    if not isinstance(value, dict):
        return None, "top level is not an object"
    return value, None


def compact_descriptor(path: Path, root: Path) -> dict[str, Any]:
    value, error = load_json(path)
    relative = path.relative_to(root).as_posix()
    if error or value is None:
        return {"path": relative, "error": error}
    return {
        "path": relative,
        "okf_version": value.get("okf_version"),
        "kind": value.get("kind"),
        "schema": value.get("schema"),
        "status": value.get("status"),
        "snapshot": value.get("snapshot"),
        "title": value.get("title"),
        "counts": value.get("counts"),
        "entrypoints": sorted(value.get("entrypoints", {}).keys())
        if isinstance(value.get("entrypoints"), dict)
        else [],
    }


def extract_commands(path: Path) -> list[str]:
    if not path.is_file():
        return []
    lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    commands: list[str] = []
    in_fence = False
    buffer = ""
    for raw in lines:
        stripped = raw.strip()
        if stripped.startswith("```"):
            in_fence = not in_fence
            buffer = ""
            continue
        if not in_fence or not stripped or stripped.startswith("#"):
            continue
        if buffer:
            buffer = f"{buffer} {stripped}"
        elif stripped.startswith(COMMAND_PREFIXES):
            buffer = stripped
        else:
            continue
        if buffer.endswith("\\"):
            buffer = buffer[:-1].rstrip()
            continue
        commands.append(buffer)
        buffer = ""
    return list(dict.fromkeys(commands))


def classify(root: Path, descriptors: list[dict[str, Any]]) -> list[str]:
    roles: list[str] = []
    if (root / "apps/okf-explorer").is_dir():
        roles.append("consumer-and-profile-implementation")
    if (root / "domain-profile").exists() or (
        root / "profiles/okf-domain-profile.v1.yaml"
    ).is_file():
        roles.append("governed-producer")
    if any(item.get("kind") == "okf-large-corpus" for item in descriptors):
        roles.append("large-corpus-producer")
    if (root / "whole-law").is_dir() or any(
        item.get("kind") in {"okf-federation", "okf-explorer-federation"}
        for item in descriptors
    ):
        roles.append("federation")
    if (root / "okf-bundle.json").is_file() or (
        root / "bundle/okf-bundle.json"
    ).is_file():
        roles.append("small-bundle-producer")
    return roles or ["unclassified"]


def inspect(root: Path, is_git: bool) -> dict[str, Any]:
    descriptors = [
        compact_descriptor(root / relative, root)
        for relative in DESCRIPTOR_CANDIDATES
        if (root / relative).is_file()
    ]
    git: dict[str, Any] = {"is_repository": is_git}
    if is_git:
        _, branch = run_git(root, "branch", "--show-current")
        _, status = run_git(root, "status", "--short")
        _, head = run_git(root, "log", "-1", "--format=%h %cs %s")
        git.update(
            {
                "branch": branch or "detached",
                "head": head,
                "working_tree_clean": not bool(status),
                "changes": status.splitlines(),
            }
        )

    commands = list(
        dict.fromkeys(
            extract_commands(root / "AGENTS.md") + extract_commands(root / "README.md")
        )
    )
    warnings: list[str] = []
    config_path = root / "okf.config.json"
    if config_path.is_file():
        config, error = load_json(config_path)
        if error:
            warnings.append(f"okf.config.json is invalid: {error}")
        elif config and isinstance(config.get("profile"), str):
            profile = config["profile"]
            versions = {
                item.get("okf_version")
                for item in descriptors
                if item.get("okf_version")
            }
            if "v0.1" in profile and "0.2" in versions:
                warnings.append(
                    "okf.config.json labels v0.1 while a descriptor declares OKF 0.2"
                )
    if is_git and not git.get("working_tree_clean", True):
        warnings.append("working tree contains changes; preserve unrelated work")
    if not (root / "AGENTS.md").is_file():
        warnings.append("no root AGENTS.md was found")
    if not descriptors:
        warnings.append("no standard OKF bundle or Explorer descriptor was found")

    return {
        "root": str(root),
        "roles": classify(root, descriptors),
        "git": git,
        "controls": [name for name in CONTROL_MARKERS if (root / name).exists()],
        "authored_markers": [
            name for name in AUTHORED_MARKERS if (root / name).exists()
        ],
        "generated_markers": [
            name for name in GENERATED_MARKERS if (root / name).exists()
        ],
        "descriptors": descriptors,
        "declared_commands": commands,
        "warnings": warnings,
    }


def format_markdown(report: dict[str, Any]) -> str:
    git = report["git"]
    lines = [
        "# OKF repository inspection",
        "",
        f"- Root: `{report['root']}`",
        f"- Roles: {', '.join(f'`{role}`' for role in report['roles'])}",
        f"- Git: {'yes' if git['is_repository'] else 'no'}",
    ]
    if git["is_repository"]:
        lines.extend(
            [
                f"- Branch: `{git['branch']}`",
                f"- HEAD: `{git['head']}`",
                f"- Working tree: {'clean' if git['working_tree_clean'] else 'changed'}",
            ]
        )

    lines.extend(
        [
            "",
            "## Boundaries",
            "",
            f"- Controls: {', '.join(f'`{item}`' for item in report['controls']) or 'none detected'}",
            f"- Authored markers: {', '.join(f'`{item}`' for item in report['authored_markers']) or 'none detected'}",
            f"- Generated markers: {', '.join(f'`{item}`' for item in report['generated_markers']) or 'none detected'}",
            "",
            "## Descriptors",
            "",
        ]
    )
    if not report["descriptors"]:
        lines.append("- None detected.")
    for descriptor in report["descriptors"]:
        if descriptor.get("error"):
            lines.append(f"- `{descriptor['path']}`: invalid ({descriptor['error']})")
            continue
        identity = ", ".join(
            f"{key}={descriptor[key]}"
            for key in ("okf_version", "kind", "schema", "status", "snapshot")
            if descriptor.get(key) is not None
        )
        lines.append(f"- `{descriptor['path']}`: {identity or 'JSON object'}")

    lines.extend(["", "## Declared commands", ""])
    if report["declared_commands"]:
        lines.extend(f"- `{command}`" for command in report["declared_commands"])
    else:
        lines.append(
            "- No shell commands were extracted from root `AGENTS.md` or `README.md`."
        )

    lines.extend(["", "## Warnings", ""])
    if report["warnings"]:
        lines.extend(f"- {warning}" for warning in report["warnings"])
    else:
        lines.append("- None detected by this bounded inspection.")
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("repository", nargs="?", default=".")
    parser.add_argument("--json", action="store_true", help="emit JSON")
    args = parser.parse_args()

    root, is_git = resolve_root(Path(args.repository))
    report = inspect(root, is_git)
    if args.json:
        print(json.dumps(report, indent=2, sort_keys=True))
    else:
        print(format_markdown(report), end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
