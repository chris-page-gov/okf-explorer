#!/usr/bin/env python3
"""Persist the canonical external publication identity in frozen snapshots.

The heritage producer deliberately treats the frozen snapshot as the source of
its public namespace.  This small migration is therefore separate from the
builder's ``--public-base`` preview: once a cutover is accepted, ordinary builds
and ``--check`` runs must need no hidden or command-line publication setting.
"""

from __future__ import annotations

import argparse
import gzip
import io
import json
from pathlib import Path
from typing import Any
from urllib.parse import quote


ROOT = Path(__file__).resolve().parents[1]
FIXTURE_ROOT = ROOT / "evaluation-foundry" / "fixtures" / "heritage-warwickshire"
FAMILY_BASE = "https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/"
OLD_FAMILY_BASE = "https://chris-page-gov.github.io/okf-explorer/evaluation/heritage/"
SNAPSHOTS = {
    "faithful": FIXTURE_ROOT / "source-snapshot.json.gz",
    "tiny": FIXTURE_ROOT / "tiny" / "source-snapshot.json",
    "synthetic": FIXTURE_ROOT / "synthetic" / "source-snapshot.json",
}


def publication_base(role: str) -> str:
    return FAMILY_BASE if role == "faithful" else f"{FAMILY_BASE}{role}/"


def replace_public_urls(value: Any) -> Any:
    if isinstance(value, str):
        return value.replace(OLD_FAMILY_BASE, FAMILY_BASE).replace(
            quote(OLD_FAMILY_BASE, safe=""),
            quote(FAMILY_BASE, safe=""),
        )
    if isinstance(value, list):
        return [replace_public_urls(item) for item in value]
    if isinstance(value, dict):
        return {key: replace_public_urls(item) for key, item in value.items()}
    return value


def load_snapshot(path: Path) -> dict[str, Any]:
    raw = gzip.decompress(path.read_bytes()) if path.suffix == ".gz" else path.read_bytes()
    value = json.loads(raw)
    if not isinstance(value, dict) or value.get("schema") != "heritage-evaluation-source-snapshot.v1":
        raise RuntimeError(f"unexpected heritage snapshot: {path}")
    return value


def deterministic_gzip(raw: bytes) -> bytes:
    output = io.BytesIO()
    with gzip.GzipFile(
        filename="",
        mode="wb",
        fileobj=output,
        compresslevel=9,
        mtime=0,
    ) as stream:
        stream.write(raw)
    return output.getvalue()


def expected_bytes(role: str, path: Path) -> bytes:
    snapshot = replace_public_urls(load_snapshot(path))
    publication = snapshot.get("publication")
    if not isinstance(publication, dict):
        raise RuntimeError(f"snapshot has no publication object: {path}")
    publication["public_base"] = publication_base(role)
    publication["family_public_base"] = FAMILY_BASE
    if path.suffix == ".gz":
        rendered = (
            json.dumps(snapshot, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
            + "\n"
        ).encode("utf-8")
        return deterministic_gzip(rendered)
    return (json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args(argv)
    stale: list[str] = []
    for role, path in SNAPSHOTS.items():
        expected = expected_bytes(role, path)
        if path.read_bytes() == expected:
            continue
        if args.check:
            stale.append(path.relative_to(ROOT).as_posix())
        else:
            path.write_bytes(expected)
            print(f"retargeted {role} snapshot: {path.relative_to(ROOT)}")
    if stale:
        for path in stale:
            print(f"stale heritage publication identity: {path}")
        return 1
    if args.check:
        print("heritage source snapshots use the canonical external publication base")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
