#!/usr/bin/env python3
"""Find public OKF bundle candidates in a GitHub owner's default branches."""

from __future__ import annotations

import argparse
import base64
import json
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from pathlib import PurePosixPath
from urllib.parse import quote

from okf_semantic import SemanticError, load_yaml_ld_text


MARKERS = {
    "okf-bundle.json": "runtime", "okf-explorer.json": "runtime",
    "okf-bundle.jsonld": "graph", "okf-bundle.yamlld": "graph",
    "okf.config.json": "configuration", "okf.semantic.json": "contract",
    "okf.publication.json": "contract",
}


def github(endpoint):
    """Use the user's gh session without placing credentials in output or arguments."""
    try:
        result = subprocess.run(["gh", "api", "--hostname", "github.com", endpoint],
                                capture_output=True, timeout=45, check=False)
    except subprocess.TimeoutExpired as exc:
        raise ValueError("GitHub request timed out") from exc
    if result.returncode:
        status = re.search(rb"HTTP (\d{3})", result.stderr)
        raise ValueError("GitHub HTTP " + status[1].decode() if status else "GitHub request failed")
    return json.loads(result.stdout)


def index_version(blob):
    if blob.get("encoding") != "base64":
        raise ValueError("unrecognised blob encoding")
    text = base64.b64decode(blob["content"]).decode("utf-8-sig").replace("\r\n", "\n")
    block = re.match(r"\A---\n(.*?)^---(?:\n|$)", text, re.MULTILINE | re.DOTALL)
    if not block or not block[1].strip():
        return None
    metadata = load_yaml_ld_text(block[1])
    value = metadata.get("okf_version")
    return str(value) if isinstance(value, (str, float, int)) and not isinstance(value, bool) else None


def walk_tree(prefix, sha, api):
    """Split truncated recursive responses by directory until coverage is complete."""
    pending = [("", sha)]
    while pending:
        parent, subtree = pending.pop()
        endpoint = f"{prefix}/git/trees/{subtree}"
        listing = api(endpoint + "?recursive=1")
        if listing["sha"] != subtree:
            raise ValueError("tree identity mismatch")
        if listing["truncated"]:
            listing = api(endpoint)
            if listing["sha"] != subtree or listing["truncated"]:
                raise ValueError("incomplete directory listing")
            for item in listing["tree"]:
                if item["type"] == "tree" and not item["path"].startswith("."):
                    pending.append((parent + item["path"] + "/", item["sha"]))
        for item in listing["tree"]:
            if item["type"] == "blob":
                yield {**item, "path": parent + item["path"]}


def inspect_repo(repo, inspect_indexes, api):
    name = repo["full_name"]
    branch = repo.get("default_branch")
    row = {"repository": name, "branch": branch, "archived": repo["archived"], "fork": repo["fork"],
           "roots": [], "pending_indexes": [], "errors": []}
    if not branch:
        return {**row, "status": "empty"}
    prefix = "repos/" + name
    try:
        try:
            commit = api(f"{prefix}/commits/{quote(branch, safe='')}")
        except ValueError as exc:
            if str(exc) == "GitHub HTTP 409":
                return {**row, "status": "empty"}
            raise
        row["commit"] = commit["sha"]
        row["tree"] = commit["commit"]["tree"]["sha"]
        roots = {}
        for member in walk_tree(prefix, row["tree"], api):
            path = PurePosixPath(member["path"])
            if member["type"] != "blob" or member.get("mode") == "120000" or any(p.startswith(".") for p in path.parts):
                continue
            kind = MARKERS.get(path.name)
            evidence = {"path": str(path), "blob": member["sha"]}
            if path.name == "index.md":
                if not inspect_indexes or member.get("size", 0) > 1024 * 1024:
                    row["pending_indexes"].append(str(path))
                    continue
                try:
                    version = index_version(api(f"{prefix}/git/blobs/{member['sha']}"))
                except (ValueError, KeyError, SemanticError):
                    row["pending_indexes"].append(str(path))
                    continue
                if version is None:
                    continue
                kind = "declared-index"
                evidence["okf_version"] = version
            if kind:
                roots.setdefault(str(path.parent), []).append({**evidence, "kind": kind})
        row["roots"] = [{"root": root, "evidence": sorted(items, key=lambda x: x["path"])}
                        for root, items in sorted(roots.items())]
        row["status"] = "tree-read"
    except (KeyError, TypeError, ValueError, OSError) as exc:
        row["errors"].append(str(exc) if isinstance(exc, ValueError) else type(exc).__name__)
        row["status"] = "error"
    return row


def catalogue(owner, *, inspect_indexes=False, workers=2, api=github):
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9-]{0,38}", owner):
        raise ValueError("invalid GitHub owner")
    public = {}
    errors = []
    page = 1
    try:
        while True:
            batch = api(f"users/{owner}/repos?type=owner&sort=full_name&per_page=100&page={page}")
            if not isinstance(batch, list):
                raise ValueError("unexpected repository listing")
            for repo in batch:
                if (repo.get("private") is False and repo.get("visibility") == "public"
                        and repo["owner"]["login"].casefold() == owner.casefold()):
                    public[repo["full_name"]] = repo
            if len(batch) < 100:
                break
            page += 1
    except (ValueError, KeyError, TypeError, OSError) as exc:
        errors.append(str(exc) if isinstance(exc, ValueError) else type(exc).__name__)
    with ThreadPoolExecutor(max_workers=workers) as pool:
        rows = list(pool.map(lambda name: inspect_repo(public[name], inspect_indexes, api), sorted(public)))
    partial = bool(errors) or any(row["status"] in {"truncated", "error"} for row in rows)
    return {"schema": "okf-public-owner-candidates.v1", "owner": owner,
            "observed_at": datetime.now(UTC).isoformat(), "enumeration_errors": errors,
            "tree_coverage": "partial" if partial else "complete",
            "public_repositories": len(rows),
            "candidate_repositories": sum(bool(row["roots"]) for row in rows),
            "index_inspection_requested": inspect_indexes,
            "scope": "Default-branch candidates. Undeclared Markdown-only and release-only bundles require review.",
            "repositories": rows}


def candidate_snapshot(inventory):
    rows = inventory["repositories"]
    return {**inventory,
            "repository_states": {state: sum(row["status"] == state for row in rows)
                                  for state in sorted({row["status"] for row in rows})},
            "uninspected_indexes": sum(len(row["pending_indexes"]) for row in rows),
            "repositories": [row for row in rows if row["roots"] or row["errors"] or row["pending_indexes"]]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("owner")
    parser.add_argument("--inspect-indexes", action="store_true",
                        help="inspect index.md blobs up to 1 MiB for declared OKF versions; may consume many API requests")
    parser.add_argument("--workers", type=int, choices=range(1, 5), default=2)
    parser.add_argument("--candidates-only", action="store_true",
                        help="retain candidate and incomplete rows with whole-owner coverage totals")
    args = parser.parse_args()
    data = catalogue(args.owner, inspect_indexes=args.inspect_indexes, workers=args.workers)
    if args.candidates_only:
        data = candidate_snapshot(data)
    json.dump(data, sys.stdout, ensure_ascii=False, indent=2)
    print()
    return 0 if data["tree_coverage"] == "complete" else 2


if __name__ == "__main__":
    raise SystemExit(main())
