#!/usr/bin/env python3
"""Validate the checked-in complete legislation OKF publication pack."""

from __future__ import annotations

import json
import gzip
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "legislation"
MINIMUM_COMPLETE_WORKS = 300_000
REQUIRED_TYPE_CODES = {"ukpga", "uksi", "asp", "ssi", "anaw", "asc", "wsi", "nia", "nisr", "eur"}


def load(path: Path):
    if path.suffix == ".gz":
        return json.loads(gzip.decompress(path.read_bytes()).decode("utf-8"))
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    errors: list[str] = []
    descriptor_path = PACK / "okf-explorer.json"
    manifest_path = PACK / "data" / "manifest.json"
    if not descriptor_path.is_file() or not manifest_path.is_file():
        print("Legislation OKF check failed: generated pack is missing")
        return 1
    descriptor = load(descriptor_path)
    manifest = load(manifest_path)
    counts = manifest.get("counts", {})
    if descriptor.get("kind") != "okf-large-corpus":
        errors.append("descriptor kind is not okf-large-corpus")
    if counts.get("works", 0) < MINIMUM_COMPLETE_WORKS:
        errors.append(f"work count {counts.get('works', 0):,} is below completeness floor {MINIMUM_COMPLETE_WORKS:,}")
    extension = descriptor.get("extensions", {}).get("okf-legislation-corpus.v1", {})
    if extension.get("mode") != "complete-work-index-live-subdivision-resolver":
        errors.append("legislation progressive-discovery extension is absent")
    for name in ("data_manifest", "overview_index", "analysis_overview", "search_manifest", "markdown_index", "ontology", "evaluation"):
        target = descriptor.get("entrypoints", {}).get(name)
        if not target:
            errors.append(f"descriptor entrypoint {name} is missing")
            continue
        resolved = (PACK / target).resolve()
        if not resolved.is_file():
            errors.append(f"descriptor entrypoint {name} does not resolve: {target}")

    work_files = manifest.get("chunks", {}).get("datasets", [])
    works = 0
    type_codes: set[str] = set()
    ids: set[str] = set()
    for relative in work_files:
        path = PACK / relative
        if not path.is_file():
            errors.append(f"missing work chunk: {relative}")
            continue
        for record in load(path):
            works += 1
            record_id = record.get("id")
            if record_id in ids:
                errors.append(f"duplicate work ID: {record_id}")
            ids.add(record_id)
            type_codes.add(record.get("type_code", ""))
            if not str(record_id).startswith("https://www.legislation.gov.uk/id/"):
                errors.append(f"non-official work ID: {record_id}")
            if not str(record.get("structure_url", "")).startswith("https://www.legislation.gov.uk/"):
                errors.append(f"missing official CLML structure URL: {record_id}")
            if record.get("record_type") != "Legislation Work":
                errors.append(f"wrong normalized record type: {record_id}")
            if len(errors) > 100:
                break
        if len(errors) > 100:
            break
    if works != counts.get("works"):
        errors.append(f"manifest says {counts.get('works')} works but chunks contain {works}")
    missing_types = sorted(REQUIRED_TYPE_CODES - type_codes)
    if missing_types:
        errors.append(f"required primary/secondary/devolved/EU type codes absent: {', '.join(missing_types)}")

    search_manifest = load(PACK / manifest["indexes"]["search"])
    if search_manifest.get("counts", {}).get("documents") != counts.get("works"):
        errors.append("static search document count does not equal work count")
    facets = load(PACK / manifest["indexes"]["facets"])
    for key in ("category", "type_code", "document_type", "creation_year", "jurisdiction", "topic", "format"):
        if not facets.get(key):
            errors.append(f"required progressive-discovery facet is empty: {key}")
    for required in ("ontology/index.md", "access/index.md", "methodology/index.md", "topics/index.md", "types/index.md"):
        if not (PACK / required).is_file():
            errors.append(f"required Markdown concept index missing: {required}")
    oversized = [path.relative_to(ROOT).as_posix() for path in PACK.rglob("*") if path.is_file() and path.stat().st_size >= 100_000_000]
    if oversized:
        errors.append(f"GitHub-incompatible files >=100MB: {', '.join(oversized)}")

    if errors:
        print("Legislation OKF check failed:")
        for error in errors[:100]:
            print(f"- {error}")
        return 1
    print(f"Legislation OKF check passed: {works:,} unique works, {len(type_codes)} type codes, {len(work_files)} work chunks")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
