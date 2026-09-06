#!/usr/bin/env python3
"""Build Explorer and JSON-LD registries from one YAML-LD source."""

from __future__ import annotations

import argparse
import difflib
import json
import sys
from pathlib import Path
from typing import Any

import okf_semantic
from learning_catalogue import build_learning_outputs

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "registry" / "okf-registry.yamlld"
OUTPUTS = {
    ROOT / "okf-registry.json": "legacy",
    ROOT / "apps" / "okf-explorer" / "static" / "okf-registry.json": "legacy",
    ROOT / "okf-registry.jsonld": "semantic",
    ROOT / "apps/okf-explorer/src/lib/learning-registry.ts": "learning-registry",
    ROOT / "apps/okf-explorer/src/lib/learning-catalogue.json": "learning-catalogue",
    ROOT / "docs/onboarding/examples.md": "learning-docs",
}


def id_value(value: Any) -> str:
    if isinstance(value, dict):
        return str(value.get("@id", ""))
    return str(value or "")


def id_values(value: Any) -> list[str]:
    values = value if isinstance(value, list) else [value]
    return [item for item in (id_value(value) for value in values) if item]


def build() -> dict[str, str]:
    document = okf_semantic.load_yaml_ld(SOURCE)
    assert isinstance(document, dict)
    okf_semantic.expand(document)
    bundles = []
    for item in document.get("bundles", []):
        if not isinstance(item, dict):
            raise okf_semantic.SemanticError("registry bundles must be mappings")
        schema_document = {"@context": document.get("@context"), **item}
        schema_errors = okf_semantic.schema_errors(
            schema_document,
            "bundle.schema.json",
        )
        if schema_errors:
            identity = item.get("@id", "<unknown>")
            raise okf_semantic.SemanticError(
                f"registry bundle {identity} fails bundle.schema.json: "
                + " | ".join(schema_errors)
            )
        descriptor = id_value(item.get("descriptor"))
        if not descriptor:
            raise okf_semantic.SemanticError(f"registry bundle {item.get('@id', '<unknown>')} has no descriptor")
        alternate_descriptors = id_values(item.get("descriptorAlternates", []))
        bundle = {
            "id": str(item.get("@id", "")),
            "label": str(item.get("title", "")),
            "title": str(item.get("title", "")),
            "url": descriptor,
            "semantic_url": id_value(item.get("semanticDescriptor")),
            "home_url": id_value(item.get("home")),
            "profile": id_value(item.get("profile")),
            "version": str(item.get("version", "")),
            "status": str(item.get("status", "")),
            "publisher": id_value(item.get("publisher")),
            "license": id_value(item.get("license")),
            "kind": str(item.get("recordTypeLabel", "bundle")),
            "description": str(item.get("description", "")),
            "repository_url": id_value(item.get("repository")),
            "documentation_url": id_value(item.get("documentation")),
            "raw_subpath": str(item.get("rawSubpath", "")),
            "release_archive_url": id_value(item.get("releaseArchive")),
            "routes": [
                {
                    "kind": "raw" if "raw.githubusercontent.com" in url else "published",
                    "purpose": "descriptor",
                    "priority": (index + 1) * 10,
                    "url": url,
                }
                for index, url in enumerate(alternate_descriptors)
            ],
        }
        bundles.append({key: value for key, value in bundle.items() if value not in ("", [])})
    legacy = {
        "schema": "okf-explorer-registry.v1",
        "title": str(document.get("title", "OKF Explorer Registry")),
        "semantic_source": SOURCE.relative_to(ROOT).as_posix(),
        "profile": id_value(document.get("profile")),
        "bundles": bundles,
    }
    return {
        "legacy": json.dumps(legacy, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        "semantic": okf_semantic.semantic_json(document),
        **build_learning_outputs(bundles),
    }


def check_file(path: Path, expected: str) -> str | None:
    if not path.is_file():
        return f"{path.relative_to(ROOT)} is missing"
    actual = path.read_text(encoding="utf-8")
    if actual == expected:
        return None
    diff = "\n".join(
        difflib.unified_diff(
            actual.splitlines(),
            expected.splitlines(),
            fromfile=f"{path.relative_to(ROOT)} current",
            tofile=f"{path.relative_to(ROOT)} generated",
            lineterm="",
            n=2,
        )
    )
    return f"{path.relative_to(ROOT)} is out of date:\n{diff}"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args(argv)
    try:
        rendered = build()
    except (okf_semantic.SemanticError, ValueError, KeyError) as exc:
        print(f"registry build failed: {exc}", file=sys.stderr)
        return 1
    if args.check:
        errors = [error for path, kind in OUTPUTS.items() if (error := check_file(path, rendered[kind]))]
        if errors:
            print("registry check failed:", file=sys.stderr)
            for error in errors:
                print(f"- {error}", file=sys.stderr)
            return 1
        print(f"OKF registry is synchronized ({len(json.loads(rendered['legacy'])['bundles'])} bundles)")
        return 0
    for path, kind in OUTPUTS.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(rendered[kind], encoding="utf-8")
    print(f"wrote {len(OUTPUTS)} registry projections")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
