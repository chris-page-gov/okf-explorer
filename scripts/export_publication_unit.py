#!/usr/bin/env python3
"""Validate and materialize one independently publishable OKF data unit."""

from __future__ import annotations

import argparse
import gzip
import hashlib
import html
import json
import os
import posixpath
import re
import uuid
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import quote, unquote, urlsplit, urlunsplit

from jsonschema import Draft202012Validator, FormatChecker
from markdown_it import MarkdownIt

from plane_root_validation import validate_plane_roots


ROOT = Path(__file__).resolve().parents[1]
SCHEMA_PATH = ROOT / "publication-units" / "publication-unit.v1.schema.json"
MANIFEST_SCHEMA = "okf-publication-unit-manifest.v1"
MANIFEST_NAME = "publication-unit-manifest.json"
TEXT_SUFFIXES = {
    ".css",
    ".html",
    ".js",
    ".json",
    ".jsonld",
    ".md",
    ".svg",
    ".txt",
    ".yaml",
    ".yamlld",
    ".yml",
}
FORBIDDEN_NAMES = {".DS_Store"}
FIXTURE_CORPUS_SOURCE_PREFIX = b"../../../evaluation/heritage/"
FIXTURE_CORPUS_TARGET_PREFIX = b"../../../"
FIXTURE_SCRIPT_SOURCE_PREFIX = b"../../../scripts/"
FIXTURE_SCRIPT_TARGET_PREFIX = (
    b"https://github.com/chris-page-gov/okf-explorer/blob/main/scripts/"
)


def canonical_json(value: object) -> bytes:
    return (
        json.dumps(
            value,
            ensure_ascii=False,
            separators=(",", ":"),
            sort_keys=True,
        )
        + "\n"
    ).encode("utf-8")


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def safe_relative(value: str) -> Path:
    path = Path(value)
    if (
        not value
        or path.is_absolute()
        or path.as_posix() != value
        or value.startswith("../")
        or "/../" in value
        or "\\" in value
    ):
        raise RuntimeError(f"unsafe publication-unit path: {value!r}")
    return path


def load_descriptor(path: Path, root: Path = ROOT) -> dict[str, object]:
    descriptor = json.loads(path.read_text(encoding="utf-8"))
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    errors = sorted(
        Draft202012Validator(schema, format_checker=FormatChecker()).iter_errors(descriptor),
        key=lambda error: tuple(str(part) for part in error.absolute_path),
    )
    if errors:
        details = "\n".join(
            f"- {'/'.join(str(part) for part in error.absolute_path) or '<root>'}: "
            f"{error.message}"
            for error in errors
        )
        raise RuntimeError(f"invalid publication-unit descriptor:\n{details}")
    targets: set[str] = set()
    for material in descriptor["materials"]:
        assert isinstance(material, dict)
        source = safe_relative(str(material["source"]))
        target = safe_relative(str(material["target"]))
        if target.as_posix() in targets:
            raise RuntimeError(f"duplicate publication-unit target: {target}")
        targets.add(target.as_posix())
        if not (root / source).exists():
            raise RuntimeError(f"publication-unit source does not exist: {source}")
    return descriptor


def rewrite_pairs(
    descriptor: dict[str, object],
    *,
    root: Path = ROOT,
) -> list[tuple[bytes, bytes]]:
    retarget = descriptor["retarget"]
    assert isinstance(retarget, dict)
    old_base = str(retarget["from_base_url"])
    new_base = str(retarget["to_base_url"])
    pairs: set[tuple[str, str]] = set()
    for material in descriptor["materials"]:
        assert isinstance(material, dict)
        if material["role"] not in {"corpus", "fixture", "documentation"}:
            continue
        source = str(material["source"])
        target = str(material["target"])
        old = f"{old_base}{source}"
        new = new_base if target == "." else f"{new_base}{target}"
        pairs.add((old, new))
        if (root / str(material["source"])).is_dir():
            pairs.add((f"{old.rstrip('/')}/", f"{new.rstrip('/')}/"))
    replacements: list[tuple[bytes, bytes]] = []
    for old, new in sorted(pairs, key=lambda pair: len(pair[0]), reverse=True):
        replacements.append((old.encode("utf-8"), new.encode("utf-8")))
        replacements.append(
            (
                quote(old, safe="").encode("ascii"),
                quote(new, safe="").encode("ascii"),
            )
        )
    return replacements


def retarget_bytes(path: Path, raw: bytes, replacements: list[tuple[bytes, bytes]]) -> bytes:
    compressed = path.name.endswith(".json.gz")
    value = gzip.decompress(raw) if compressed else raw
    if not compressed and path.suffix.lower() not in TEXT_SUFFIXES:
        return raw
    updated = value
    for old, new in replacements:
        updated = updated.replace(old, new)
    if updated == value:
        return raw
    if compressed:
        return gzip.compress(updated, compresslevel=9, mtime=0)
    return updated


def iter_source_files(source: Path) -> list[Path]:
    if source.is_file():
        return [source]
    return sorted(
        path
        for path in source.rglob("*")
        if path.is_file()
        and path.name not in FORBIDDEN_NAMES
        and not path.name.startswith("~$")
        and path.suffix.lower() not in {".pyc"}
        and "/results/" not in f"/{path.as_posix()}/"
        and "evidence" not in path.relative_to(source).parts
    )


def relocate_publication_path(
    source_path: str,
    relocations: list[tuple[str, str]],
) -> str:
    for source, target in relocations:
        if source_path == source or source_path.startswith(f"{source}/"):
            suffix = source_path.removeprefix(source).lstrip("/")
            if target == ".":
                return suffix
            return posixpath.join(target, suffix) if suffix else target
    return source_path


def rewrite_markdown_for_export(
    markdown: str,
    *,
    source_path: Path,
    output_path: Path,
    owned_paths: set[str],
    relocations: list[tuple[str, str]],
    fallback_base_url: str,
) -> str:
    """Retarget ordinary inline Markdown links after a publication move."""

    pattern = re.compile(r"(?P<prefix>\]\()(?P<href>[^)\s]+)(?P<suffix>(?:\s+[^)]*)?\))")

    def replace(match: re.Match[str]) -> str:
        href = match.group("href")
        parts = urlsplit(href)
        if parts.scheme or parts.netloc or not parts.path or parts.path.startswith("/"):
            return match.group(0)
        original = posixpath.normpath(
            posixpath.join(source_path.parent.as_posix(), unquote(parts.path))
        )
        relocated = relocate_publication_path(original, relocations)
        if relocated in owned_paths:
            new_path = posixpath.relpath(
                relocated,
                start=output_path.parent.as_posix(),
            )
        else:
            fallback = original
            if fallback.lower().endswith(".md"):
                fallback = str(Path(fallback).with_suffix(".html"))
            new_path = f"{fallback_base_url}{fallback}"
        rewritten = urlunsplit(("", "", new_path, parts.query, parts.fragment))
        return f"{match.group('prefix')}{rewritten}{match.group('suffix')}"

    return pattern.sub(replace, markdown)


def render_markdown(
    markdown: str,
    route: Path,
    source_path: Path,
    canonical_url: str,
    *,
    owned_paths: set[str],
    relocations: list[tuple[str, str]],
    fallback_base_url: str,
) -> bytes:
    frontmatter = ""
    body_markdown = markdown
    if markdown.startswith("---\n"):
        end = markdown.find("\n---\n", 4)
        if end != -1:
            frontmatter = markdown[4:end]
            body_markdown = markdown[end + 5 :]
    renderer = MarkdownIt(
        "commonmark",
        {"html": False, "breaks": False, "typographer": False},
    ).enable(["table", "strikethrough"])

    def render_link_open(tokens, index, options, env):
        href = tokens[index].attrGet("href")
        if href:
            parts = urlsplit(href)
            if not parts.scheme and not parts.netloc and parts.path:
                original = posixpath.normpath(
                    posixpath.join(
                        source_path.parent.as_posix(),
                        unquote(parts.path),
                    )
                )
                relocated = relocate_publication_path(original, relocations)
                output_target = relocated
                if output_target.lower().endswith(".md"):
                    output_target = str(Path(output_target).with_suffix(".html"))
                if output_target in owned_paths:
                    rewritten_path = posixpath.relpath(
                        output_target,
                        start=route.parent.as_posix(),
                    )
                else:
                    fallback = original
                    if fallback.lower().endswith(".md"):
                        fallback = str(Path(fallback).with_suffix(".html"))
                    rewritten_path = f"{fallback_base_url}{fallback}"
                tokens[index].attrSet(
                    "href",
                    urlunsplit(
                        (
                            "",
                            "",
                            rewritten_path,
                            parts.query,
                            parts.fragment,
                        )
                    ),
                )
        return renderer.renderer.renderToken(tokens, index, options, env)

    renderer.renderer.rules["link_open"] = render_link_open
    heading_counts: dict[str, int] = {}

    def render_heading_open(tokens, index, options, env):
        inline = tokens[index + 1] if index + 1 < len(tokens) else None
        label = inline.content if inline and inline.type == "inline" else "section"
        base = re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", label.casefold())).strip("-")
        base = base or "section"
        occurrence = heading_counts.get(base, 0)
        heading_counts[base] = occurrence + 1
        tokens[index].attrSet("id", base if occurrence == 0 else f"{base}-{occurrence}")
        return renderer.renderer.renderToken(tokens, index, options, env)

    renderer.renderer.rules["heading_open"] = render_heading_open
    body = renderer.render(body_markdown)
    frontmatter_title = re.search(
        r'^title:\s*["\']?(.*?)["\']?\s*$',
        frontmatter,
        flags=re.MULTILINE,
    )
    title_match = next(
        (
            line.removeprefix("# ").strip()
            for line in body_markdown.splitlines()
            if line.startswith("# ")
        ),
        (
            frontmatter_title.group(1)
            if frontmatter_title is not None
            else route.stem.replace("-", " ").title()
        ),
    )
    rendered = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title_match)}</title>
<link rel="canonical" href="{html.escape(canonical_url, quote=True)}">
<style>body{{font:16px/1.55 system-ui,sans-serif;max-width:78rem;margin:auto;padding:2rem}}pre,code{{overflow:auto}}table{{border-collapse:collapse}}td,th{{border:1px solid #bbb;padding:.4rem}}</style>
</head>
<body><main>{body}</main></body>
</html>
"""
    return rendered.encode("utf-8")


def expected_files(
    descriptor_path: Path,
    descriptor: dict[str, object],
    *,
    root: Path = ROOT,
) -> tuple[dict[str, bytes], dict[str, str]]:
    files: dict[str, bytes] = {}
    roles: dict[str, str] = {}
    origins: dict[str, Path] = {}
    replacements = rewrite_pairs(descriptor, root=root)
    relocations = [
        (str(material["source"]), str(material["target"]))
        for material in descriptor["materials"]
        if isinstance(material, dict)
    ]

    def add(path: Path, raw: bytes, role: str, *, origin: Path | None = None) -> None:
        relative = safe_relative(path.as_posix()).as_posix()
        previous = files.get(relative)
        if previous is not None and previous != raw:
            raise RuntimeError(f"publication-unit material collision: {relative}")
        files[relative] = raw
        roles[relative] = role
        origins[relative] = origin or path

    for material in descriptor["materials"]:
        assert isinstance(material, dict)
        source = root / safe_relative(str(material["source"]))
        target = safe_relative(str(material["target"]))
        role = str(material["role"])
        for path in iter_source_files(source):
            relative = Path() if source.is_file() else path.relative_to(source)
            if role == "fixture" and "evidence" in relative.parts:
                continue
            output = target if source.is_file() else target / relative
            if target == Path("."):
                output = relative
            raw = path.read_bytes()
            if role == "corpus":
                published = raw
                inspected = gzip.decompress(raw) if path.name.endswith(".json.gz") else raw
                if path.suffix.lower() in TEXT_SUFFIXES or path.name.endswith(".json.gz"):
                    for old, _new in replacements:
                        if old in inspected:
                            raise RuntimeError(
                                "rooted publication material still names its former "
                                f"public base and must be regenerated, not rewritten: {path}"
                            )
            else:
                published = retarget_bytes(path, raw, replacements)
                if role == "fixture" and (
                    path.suffix.lower() in TEXT_SUFFIXES
                    or path.name.endswith(".json.gz")
                ):
                    compressed = path.name.endswith(".json.gz")
                    fixture_value = gzip.decompress(published) if compressed else published
                    fixture_value = fixture_value.replace(
                        FIXTURE_CORPUS_SOURCE_PREFIX,
                        FIXTURE_CORPUS_TARGET_PREFIX,
                    )
                    fixture_value = fixture_value.replace(
                        FIXTURE_SCRIPT_SOURCE_PREFIX,
                        FIXTURE_SCRIPT_TARGET_PREFIX,
                    )
                    published = (
                        gzip.compress(fixture_value, compresslevel=9, mtime=0)
                        if compressed
                        else fixture_value
                    )
            add(output, published, role, origin=path.relative_to(root))

    descriptor_relative = descriptor_path.resolve().relative_to(root.resolve())
    schema_relative = SCHEMA_PATH.resolve().relative_to(root.resolve())
    add(descriptor_relative, descriptor_path.read_bytes(), "policy")
    add(schema_relative, SCHEMA_PATH.read_bytes(), "policy")

    base_url = str(descriptor["publication"]["pages_base_url"])
    fallback_base_url = str(descriptor["retarget"]["from_base_url"])
    raw_owned_paths = set(files)
    for path, raw in list(files.items()):
        if not path.lower().endswith(".md") or roles[path] not in {
            "fixture",
            "documentation",
        }:
            continue
        files[path] = rewrite_markdown_for_export(
            raw.decode("utf-8"),
            source_path=origins[path],
            output_path=Path(path),
            owned_paths=raw_owned_paths,
            relocations=relocations,
            fallback_base_url=fallback_base_url,
        ).encode("utf-8")
        origins[path] = Path(path)
    owned_paths = set(files)
    owned_paths.update(
        str(Path(path).with_suffix(".html"))
        for path in files
        if path.lower().endswith(".md")
    )
    for path, raw in list(files.items()):
        if not path.lower().endswith(".md"):
            continue
        route = Path(path).with_suffix(".html")
        canonical_url = f"{base_url}{route.as_posix()}"
        add(
            route,
            render_markdown(
                raw.decode("utf-8"),
                route,
                origins[path],
                canonical_url,
                owned_paths=owned_paths,
                relocations=relocations,
                fallback_base_url=fallback_base_url,
            ),
            "reading-page",
        )
    return files, roles


class LinkCollector(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[str] = []
        self.identifiers: set[str] = set()

    def handle_starttag(self, tag: str, attrs) -> None:
        attributes = dict(attrs)
        if attributes.get("id"):
            self.identifiers.add(attributes["id"])
        if tag == "a" and attributes.get("href"):
            self.links.append(attributes["href"])


def validate_internal_html_links(files: dict[str, bytes]) -> None:
    errors: list[str] = []
    parsed: dict[str, LinkCollector] = {}

    def parse(path: str) -> LinkCollector:
        if path not in parsed:
            parser = LinkCollector()
            parser.feed(files[path].decode("utf-8"))
            parsed[path] = parser
        return parsed[path]

    for path, raw in sorted(files.items()):
        if not path.endswith(".html"):
            continue
        parser = parse(path)
        for href in parser.links:
            parts = urlsplit(href)
            if parts.scheme or parts.netloc or parts.path.startswith("/"):
                continue
            target = (
                path
                if not parts.path
                else posixpath.normpath(
                    posixpath.join(posixpath.dirname(path), unquote(parts.path))
                )
            )
            if target.startswith("../"):
                errors.append(f"{path}: link escapes publication root: {href}")
            elif target not in files:
                errors.append(f"{path}: missing internal target: {href} -> {target}")
            elif parts.fragment and target.endswith(".html"):
                if unquote(parts.fragment) not in parse(target).identifiers:
                    errors.append(
                        f"{path}: missing fragment #{parts.fragment} in {target}"
                    )
    if errors:
        raise RuntimeError(
            "publication-unit rendered-link validation failed:\n"
            + "\n".join(f"- {error}" for error in errors)
        )


def export_manifest(
    descriptor: dict[str, object],
    files: dict[str, bytes],
    roles: dict[str, str],
) -> dict[str, object]:
    materials = [
        {
            "path": path,
            "role": roles[path],
            "bytes": len(raw),
            "sha256": sha256_bytes(raw),
        }
        for path, raw in sorted(files.items())
    ]
    return {
        "schema": MANIFEST_SCHEMA,
        "algorithm": "sha256-canonical-json-materials-v1",
        "publication_unit": descriptor["id"],
        "owner_repository": descriptor["owner_repository"],
        "pages_base_url": descriptor["publication"]["pages_base_url"],
        "file_count": len(materials),
        "tree_sha256": sha256_bytes(canonical_json(materials)),
        "materials": materials,
    }


def validate_rooted_corpus_receipts(files: dict[str, bytes]) -> None:
    """Verify the exported byte-for-byte corpus against both root manifests."""

    roots_path = "assurance/plane-roots.json"
    if roots_path not in files:
        raise RuntimeError("exported corpus has no assurance/plane-roots.json")
    roots = json.loads(files[roots_path])
    validate_plane_roots(
        roots,
        read_bytes=lambda path: files[path],
        owned_paths=set(files),
        label="exported corpus plane roots",
    )

    build_manifest_path = "assurance/build-manifest.json"
    if build_manifest_path in files:
        build_manifest = json.loads(files[build_manifest_path])
        for entry in build_manifest["entries"]:
            path = entry["path"]
            raw = files.get(path)
            if raw is None:
                raise RuntimeError(f"build manifest references missing exported file: {path}")
            if len(raw) != entry["bytes"] or sha256_bytes(raw) != entry["sha256"]:
                raise RuntimeError(f"build manifest entry differs after export: {path}")


def write_export(output: Path, files: dict[str, bytes], manifest: dict[str, object]) -> None:
    previous: dict[str, dict[str, object]] = {}
    manifest_path = output / MANIFEST_NAME
    if manifest_path.is_file():
        raw_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        if raw_manifest.get("schema") != MANIFEST_SCHEMA:
            raise RuntimeError(f"unrecognized publication manifest: {manifest_path}")
        previous = {item["path"]: item for item in raw_manifest["materials"]}
    elif output.exists() and any(output.iterdir()):
        raise RuntimeError(
            "refusing to adopt a non-empty export without a publication-unit manifest"
        )
    output.mkdir(parents=True, exist_ok=True)
    for path, raw in sorted(files.items()):
        target = output / safe_relative(path)
        if target.is_file() and target.read_bytes() == raw:
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        temporary = target.with_name(f".{target.name}.{uuid.uuid4().hex}.tmp")
        temporary.write_bytes(raw)
        os.replace(temporary, target)
    for stale in sorted(set(previous).difference(files)):
        target = output / safe_relative(stale)
        if not target.exists():
            continue
        raw = target.read_bytes()
        claim = previous[stale]
        if len(raw) != claim["bytes"] or sha256_bytes(raw) != claim["sha256"]:
            raise RuntimeError(f"refusing to remove modified stale export material: {stale}")
        target.unlink()
    for directory in sorted(
        (path for path in output.rglob("*") if path.is_dir()),
        key=lambda path: len(path.parts),
        reverse=True,
    ):
        try:
            directory.rmdir()
        except OSError:
            pass
    temporary_manifest = manifest_path.with_name(f".{MANIFEST_NAME}.{uuid.uuid4().hex}.tmp")
    temporary_manifest.write_bytes(canonical_json(manifest))
    os.replace(temporary_manifest, manifest_path)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--descriptor", type=Path, required=True)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args(argv)
    descriptor_path = args.descriptor
    if not descriptor_path.is_absolute():
        descriptor_path = ROOT / descriptor_path
    descriptor = load_descriptor(descriptor_path)
    files, roles = expected_files(
        descriptor_path,
        descriptor,
    )
    validate_rooted_corpus_receipts(files)
    validate_internal_html_links(files)
    manifest = export_manifest(descriptor, files, roles)
    if args.check:
        print(
            f"publication unit {descriptor['id']} is valid: "
            f"files={manifest['file_count']} tree_sha256={manifest['tree_sha256']}"
        )
        return 0
    if args.output is None:
        parser.error("--output is required unless --check is used")
    output = args.output if args.output.is_absolute() else ROOT / args.output
    write_export(output, files, manifest)
    print(
        f"exported {descriptor['id']} to {output}: "
        f"files={manifest['file_count']} tree_sha256={manifest['tree_sha256']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
