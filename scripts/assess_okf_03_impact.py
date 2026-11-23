#!/usr/bin/env python3
"""Measure the OKF 0.3 migration impact on tracked Markdown and bundle roots."""

from collections import Counter, defaultdict
from datetime import UTC, datetime
import json
from pathlib import Path, PurePosixPath
import subprocess

from import_okf_directory import concept_target, parse_optional_frontmatter, path_fields
from okf_semantic import SemanticError


def moment(raw):
    if not isinstance(raw, str):
        return None
    try:
        if len(raw) == 10:
            return datetime.strptime(raw, "%Y-%m-%d").replace(tzinfo=UTC)
        value = datetime.fromisoformat(raw)
        return value if value.utcoffset() is not None else None
    except ValueError:
        return None


def assess(root):
    revision = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root, text=True).strip()
    tracked = subprocess.check_output(["git", "ls-files", "-z"], cwd=root).decode().split("\0")
    files = {name for name in tracked if name and not any(p.startswith(".") for p in PurePosixPath(name).parts)}
    roots = {"."}
    documents = {}
    diagnostics = []
    for name in sorted(files):
        path = root / name
        if path.name in {"okf-explorer.json", "okf-bundle.json", "okf-bundle.yamlld", "okf.config.json"}:
            roots.add(str(PurePosixPath(name).parent))
        if not name.endswith(".md") or not path.is_file() or path.is_symlink():
            continue
        try:
            metadata = parse_optional_frontmatter(path).metadata
        except (SemanticError, ValueError) as exc:
            diagnostics.append({"path": name, "reason": str(exc).splitlines()[0].replace(str(root) + "/", "")})
            continue
        documents[name] = metadata
        if path.name == "index.md" and metadata.get("okf_version"):
            roots.add(str(PurePosixPath(name).parent))
    counts = {name: Counter() for name in sorted(roots)}
    members = defaultdict(set)
    owners = {}
    for name in sorted(files):
        owner = next(str(p) for p in PurePosixPath(name).parents if str(p) in roots)
        route = str(PurePosixPath(name).relative_to(owner))
        owners[name] = (owner, route)
        members[owner].add(route)
        members[owner].update(str(p) for p in PurePosixPath(route).parents)
    for name, metadata in documents.items():
        owner, route = owners[name]
        count = counts[owner]
        count["markdown"] += 1
        if not isinstance(metadata.get("type"), str) or not metadata["type"].strip():
            continue
        if PurePosixPath(name).name in {"index.md", "log.md"}:
            count["typed_reserved"] += 1
            continue
        count["concepts"] += 1
        if metadata.get("status", "stable") not in (None, "", "stable", "draft", "deprecated", []):
            count["unknown_status"] += 1
        generated = metadata.get("generated")
        changed = moment(generated.get("at")) if isinstance(generated, dict) else None
        events = metadata.get("verified")
        for event in events if isinstance(events, list) else [events]:
            if isinstance(event, dict) and changed and (at := moment(event.get("at"))) and at < changed:
                count["historical_events"] += 1
        for _, value in path_fields(metadata):
            target = concept_target(route, value, members[owner], legacy_field=False)
            if target is None and concept_target(route, value, members[owner], legacy_field=True):
                count["root_fallback_fields"] += 1
    return {"checkout_commit": revision, "basis": "tracked working tree; nearest descriptor or version-declaring index",
            "tracked_markdown": sum(name.endswith(".md") for name in tracked),
            "scope": "Non-hidden files. Source presence and migration indicators do not certify a producer.",
            "bundles": counts, "parse_diagnostics": diagnostics}


if __name__ == "__main__":
    print(json.dumps(assess(Path(__file__).resolve().parents[1]), indent=2, sort_keys=True))
