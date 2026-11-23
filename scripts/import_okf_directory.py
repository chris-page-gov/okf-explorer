#!/usr/bin/env python3
"""Read an OKF Markdown directory as an Explorer small-bundle JSON projection."""

from __future__ import annotations

import argparse
import base64
import json
from pathlib import Path
import posixpath
import re
import sys
from typing import Any, Iterator
from urllib.parse import unquote, urlsplit

from markdown_it import MarkdownIt

from okf_semantic import MarkdownDocument, SemanticError, load_yaml_ld_text


def parse_optional_frontmatter(path: Path) -> MarkdownDocument:
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError as exc:
        raise SemanticError(f"{path}: Markdown must be UTF-8") from exc
    if not text.startswith("---\n"):
        return MarkdownDocument(metadata={}, body=text.strip("\n"))
    close = re.compile(r"^---$", re.MULTILINE).search(text, 4)
    if close is None:
        return MarkdownDocument(metadata={}, body=text.strip("\n"))
    raw = text[4:close.start()]
    metadata = load_yaml_ld_text(raw, source=f"{path.as_posix()} frontmatter") if raw.strip() else {}
    assert isinstance(metadata, dict)
    return MarkdownDocument(metadata=metadata, body=text[close.end():].strip("\n"))


def markdown_targets(body: str, parser: MarkdownIt, environment: dict[str, Any] | None = None, *, images: bool = False) -> Iterator[str]:
    for block in parser.parse(body, environment):
        for token in block.children or ():
            if not images and token.type == "link_open":
                yield token.attrs["href"]
            if images and token.type == "image":
                yield token.attrs["src"]


def path_fields(metadata: dict[str, Any]) -> Iterator[tuple[str, Any]]:
    for field in ("resource", "computation"):
        yield field, metadata.get(field)
    if metadata.get("status") == "deprecated":
        yield "superseded_by", metadata.get("superseded_by")
    sources = metadata.get("sources", [])
    for source in sources if isinstance(sources, list) else [sources]:
        if isinstance(source, dict):
            yield "sources[].resource", source.get("resource")
    for field in ("executor", "attester"):
        actor = metadata.get(field)
        if isinstance(actor, dict):
            yield f"{field}.resource", actor.get("resource")


def concept_target(source: str, reference: Any, files: set[str], *, legacy_field: bool) -> str | None:
    """Resolve only against known bundle members. Never open a path from a field."""
    if not isinstance(reference, str) or not reference or reference.startswith("//"):
        return None
    if re.search(r"[\s\\\\]|%(?![0-9A-Fa-f]{2})", reference):
        return None
    try:
        parsed = urlsplit(reference)
        if parsed.scheme or parsed.netloc:
            return None
        path = unquote(parsed.path, errors="strict")
    except (ValueError, UnicodeError):
        return None
    if path.endswith("/") or (path and path.split("/")[-1] in {".", ".."}):
        return None
    if not path:
        return source if reference.startswith("#") else None
    rooted = path.startswith("/")
    candidate = posixpath.normpath(path[1:] if rooted else posixpath.join(posixpath.dirname(source), path))
    if candidate == ".." or candidate.startswith(("../", "/")):
        return None
    if legacy_field and not rooted and candidate not in files:
        candidate = posixpath.normpath(path)
    return candidate if candidate in files else None


MAX_EMBEDDED_ASSET_BYTES = 8 * 1024 * 1024


def project(root: Path, *, embed_assets: bool = False) -> dict[str, Any]:
    root = root.resolve(strict=True)
    if not root.is_dir():
        raise ValueError(f"Expected a bundle directory: {root}")
    root_metadata: dict[str, Any] = {}
    parser = MarkdownIt("commonmark").enable("table")
    concepts: dict[str, dict[str, Any]] = {}
    navigation: dict[str, str] = {}
    files: set[str] = set()
    asset_paths: dict[str, Path] = {}
    for directory, subdirs, names in root.walk():
        subdirs[:] = sorted(name for name in subdirs if not name.startswith("."))
        files.update((directory / name).relative_to(root).as_posix() for name in subdirs)
        for name in sorted(names):
            path = directory / name
            if name.startswith(".") or path.is_symlink() or not path.is_file():
                continue
            route = path.relative_to(root).as_posix()
            files.add(route)
            if path.suffix != ".md":
                asset_paths[route] = path
                continue
            if name in {"index.md", "log.md"}:
                document = parse_optional_frontmatter(path)
                if route == "index.md":
                    root_metadata = document.metadata
                if document.body:
                    navigation[route] = document.body
                continue
            document = parse_optional_frontmatter(path)
            kind = document.metadata.get("type")
            if not isinstance(kind, str) or not kind.strip():
                continue
            # Preserve all authored YAML-LD, including keys which also name
            # runtime fields. The runtime route is always the actual file path.
            concepts[route] = {
                **document.metadata,
                "id": route,
                "title": document.metadata.get("title") or path.stem,
                "source_path": route,
                "section": route.split("/")[0] if "/" in route else "root",
                "body": document.body,
                "frontmatter": document.metadata,
            }

    version = root_metadata.get("okf_version")
    legacy = version is None or str(version) in ("", "0.1", "0.2")
    edges: dict[tuple[str, str], set[str]] = {}
    referenced_assets: set[str] = set()
    licence = concept_target("index.md", root_metadata.get("license"), files, legacy_field=False)
    if licence is not None and (root / licence).is_file():
        asset_paths[licence] = root / licence
        referenced_assets.add(licence)
    for route, node in sorted(concepts.items()):
        environment: dict[str, Any] = {}
        targets = [("markdown", href) for href in markdown_targets(node["body"], parser, environment)]
        node["markdown_references"] = {
            label: reference["href"]
            for label, reference in environment.get("references", {}).items()
        }
        targets.extend(("image", href) for href in markdown_targets(node["body"], parser, images=True))
        targets.extend(path_fields(node["frontmatter"]))
        markdown_links = {}
        asset_links = {}
        for field, href in targets:
            target = concept_target(route, href, files, legacy_field=legacy and field != "markdown")
            if target in asset_paths:
                referenced_assets.add(target)
                asset_links[href] = target
            if field != "image" and target != route and target in concepts:
                edges.setdefault((route, target), set()).add(field)
                if field == "markdown":
                    markdown_links[href] = target
        node["markdown_links"] = markdown_links
        node["asset_links"] = asset_links

    assets = {}
    remaining = MAX_EMBEDDED_ASSET_BYTES
    if embed_assets:
        for route in sorted(referenced_assets):
            with asset_paths[route].open("rb") as file:
                data = file.read(remaining + 1)
            if len(data) > remaining:
                raise ValueError("Referenced assets exceed the 8 MiB embedding limit")
            remaining -= len(data)
            assets[route] = base64.b64encode(data).decode("ascii")

    return {
        "schema": "okf-explorer-bundle.v0",
        "kind": "okf-bundle",
        "okf_version": version,
        "meta": {
            "title": root_metadata.get("title") or root.name,
            "description": root_metadata.get("description"),
            "license": root_metadata.get("license"),
            "license_asset": licence if licence in asset_paths else None,
            "assets": assets,
            "frontmatter": root_metadata,
            "navigation": [
                {
                    "path": route,
                    "body": body,
                    "concepts": sorted({
                        target
                        for href in markdown_targets(body, parser)
                        if (target := concept_target(route, href, files, legacy_field=False)) in concepts
                    }),
                }
                for route, body in sorted(navigation.items())
            ],
        },
        "nodes": dict(sorted(concepts.items())),
        "edges": [
            {"source": source, "target": target, "kind": "references", "source_fields": sorted(fields)}
            for (source, target), fields in sorted(edges.items())
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path, help="Root directory of the OKF bundle")
    parser.add_argument("--embed-assets", action="store_true", help="Include referenced assets up to 8 MiB in total")
    args = parser.parse_args()
    try:
        bundle = project(args.directory, embed_assets=args.embed_assets)
        print(json.dumps(bundle, ensure_ascii=False, allow_nan=False, indent=2, sort_keys=True))
    except (SemanticError, OSError, TypeError, ValueError) as exc:
        parser.exit(1, f"{exc}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
