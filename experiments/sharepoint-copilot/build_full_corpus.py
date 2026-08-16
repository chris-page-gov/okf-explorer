#!/usr/bin/env python3
"""Build the complete 293-family SharePoint retrieval corpus.

This extends the frozen 20-family pilot without changing its files.  Every
document is generated from the same pinned OKF UK Living snapshot and uses the
already-tested ``word-retrieval-v2`` representation.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import tempfile
import zipfile
from pathlib import Path
from typing import Any

from build_family_word import SOURCE_COMMIT, SourceBinding, read_governed_record
from build_pilot_corpus import (
    EXPECTED_PROJECTION_SHA256,
    EXPECTED_RECORD_SCHEMA,
    RETRIEVAL_HARD_LIMIT_CHARACTERS,
    RETRIEVAL_TARGET_CHARACTERS,
    build_retrieval_document,
    document_text,
    expected_identity,
    normalise_docx_package,
    serialise_jsonl,
    sha256_file,
    validate_governed_record,
    verify_projection_blob,
    verify_retrieval_structure,
    write_text_if_changed,
)


EXPERIMENT_DIR = Path(__file__).resolve().parent
PROFILE_NAME = "word-retrieval-v2-all-293"
PROFILE_DIR = EXPERIMENT_DIR / "profiles" / PROFILE_NAME
MANIFEST_PATH = EXPERIMENT_DIR / "full-corpus-manifest.json"
CASES_PATH = EXPERIMENT_DIR / "full-corpus-cases.v1.jsonl"
PROJECTION_PATH = "explore/journey-projection.json"
EXPECTED_FAMILY_COUNT = 293


def parse_args() -> argparse.Namespace:
    default_source_repo = EXPERIMENT_DIR.parents[2] / "okf-uk-living"
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-repo", type=Path, default=default_source_repo)
    parser.add_argument(
        "--check",
        action="store_true",
        help="Verify the complete corpus without rebuilding it.",
    )
    return parser.parse_args()


def read_projection(source_repo: Path) -> tuple[bytes, dict[str, Any]]:
    completed = subprocess.run(
        [
            "git",
            "-C",
            str(source_repo),
            "show",
            f"{SOURCE_COMMIT}:{PROJECTION_PATH}",
        ],
        check=True,
        capture_output=True,
    )
    projection_bytes = completed.stdout
    projection = json.loads(projection_bytes)
    actual_sha256 = hashlib.sha256(projection_bytes).hexdigest()
    if actual_sha256 != EXPECTED_PROJECTION_SHA256:
        raise ValueError(
            "Pinned journey projection identity changed: "
            f"expected {EXPECTED_PROJECTION_SHA256}, got {actual_sha256}"
        )
    families = projection.get("families")
    if not isinstance(families, list) or len(families) != EXPECTED_FAMILY_COUNT:
        raise ValueError(
            f"Expected {EXPECTED_FAMILY_COUNT} projection families, got "
            f"{len(families) if isinstance(families, list) else 'invalid'}"
        )
    return projection_bytes, projection


def family_ids_from_projection(projection: dict[str, Any]) -> tuple[str, ...]:
    family_ids = tuple(family["id"] for family in projection["families"])
    if len(set(family_ids)) != len(family_ids):
        raise ValueError("The pinned projection contains duplicate family IDs")
    if family_ids != tuple(sorted(family_ids)):
        raise ValueError("The pinned projection family order is not deterministic")
    return family_ids


def make_case(
    position: int,
    record: dict[str, Any],
    binding: SourceBinding,
) -> dict[str, Any]:
    family = record["family"]
    situation = family["situations"][0]
    return {
        "schema": "explore-okf-full-corpus-case.v1",
        "case_id": f"full-positive-{position:03d}",
        "case_kind": "clear_authored_situation",
        "situation": situation,
        "expected_behaviour": "select_one_family",
        "expected": expected_identity(record, binding),
        "evidence": {
            "family_id": family["id"],
            "field": "family.situations[0]",
            "text": situation,
        },
        "synthetic_personal_data": False,
        "development_only": True,
    }


def build_document_entry(
    output: Path,
    record: dict[str, Any],
    binding: SourceBinding,
    manifest_path: Path,
) -> dict[str, Any]:
    build_retrieval_document(record, binding, output)
    normalise_docx_package(output)
    visible_text = document_text(output)
    text_characters = len(visible_text)
    if text_characters > RETRIEVAL_HARD_LIMIT_CHARACTERS:
        raise ValueError(
            f"{binding.family_id} retrieval profile contains {text_characters} "
            f"characters; hard limit is {RETRIEVAL_HARD_LIMIT_CHARACTERS}"
        )
    with zipfile.ZipFile(output, "r") as package:
        corrupt_member = package.testzip()
    if corrupt_member is not None:
        raise ValueError(f"Corrupt DOCX member in {output}: {corrupt_member}")
    verify_retrieval_structure(output, record, binding)
    return {
        "family_id": binding.family_id,
        "path": str(manifest_path.relative_to(EXPERIMENT_DIR)),
        "sha256": sha256_file(output),
        "bytes": output.stat().st_size,
        "text_characters": text_characters,
        "body_text_sha256": hashlib.sha256(
            visible_text.encode("utf-8")
        ).hexdigest(),
        "within_retrieval_target": text_characters <= RETRIEVAL_TARGET_CHARACTERS,
    }


def build(source_repo: Path) -> None:
    projection_bytes, projection = read_projection(source_repo)
    family_ids = family_ids_from_projection(projection)
    profile_parent = PROFILE_DIR.parent
    profile_parent.mkdir(parents=True, exist_ok=True)

    cases: list[dict[str, Any]] = []
    families: list[dict[str, Any]] = []
    documents: list[dict[str, Any]] = []
    projection_verified = False

    with tempfile.TemporaryDirectory(
        dir=profile_parent,
        prefix=f".{PROFILE_NAME}-",
    ) as temporary_directory:
        temporary_profile = Path(temporary_directory) / PROFILE_NAME
        temporary_profile.mkdir()

        for position, family_id in enumerate(family_ids, start=1):
            record_text, record, binding = read_governed_record(
                source_repo,
                SOURCE_COMMIT,
                family_id,
            )
            del record_text
            validate_governed_record(record, binding)
            if not projection_verified:
                verify_projection_blob(source_repo, SOURCE_COMMIT, record)
                projection_verified = True
            output = temporary_profile / f"{family_id}.docx"
            entry = build_document_entry(
                output,
                record,
                binding,
                PROFILE_DIR / output.name,
            )
            documents.append(entry)
            cases.append(make_case(position, record, binding))
            family = record["family"]
            families.append(
                {
                    "id": family_id,
                    "title": family["title"],
                    "domain_id": family["domain"]["id"],
                    "aliases": family["aliases"],
                    "jurisdictions": [
                        item["jurisdiction"] for item in family["applicability"]
                    ],
                    "population_status": family["status"],
                    "specialist_review": family["review"]["specialist_review"],
                    "source_path": binding.source_path,
                    "public_url": binding.public_url,
                    "family_html_sha256": binding.html_sha256,
                    "governed_record_sha256": binding.record_sha256,
                }
            )

        if PROFILE_DIR.exists():
            active_locks = sorted(PROFILE_DIR.glob("~$*.docx"))
            if active_locks:
                raise RuntimeError(
                    "Close Word before rebuilding the complete profile; active lock "
                    f"files: {', '.join(str(path) for path in active_locks)}"
                )
            backup = profile_parent / f".{PROFILE_NAME}-previous"
            if backup.exists():
                shutil.rmtree(backup)
            PROFILE_DIR.rename(backup)
            try:
                temporary_profile.rename(PROFILE_DIR)
            except Exception:
                backup.rename(PROFILE_DIR)
                raise
            else:
                shutil.rmtree(backup)
        else:
            temporary_profile.rename(PROFILE_DIR)

    write_text_if_changed(CASES_PATH, serialise_jsonl(cases))
    manifest = {
        "schema": "explore-okf-sharepoint-full-corpus.v1",
        "purpose": (
            "Complete governed-family corpus for SharePoint folder retrieval and "
            "natural-language discovery experiments"
        ),
        "source": {
            "repository": "okf-uk-living",
            "commit": SOURCE_COMMIT,
            "record_schema": EXPECTED_RECORD_SCHEMA,
            "source_projection_path": PROJECTION_PATH,
            "source_projection_bytes": len(projection_bytes),
            "source_projection_sha256": EXPECTED_PROJECTION_SHA256,
        },
        "profile": {
            "name": PROFILE_NAME,
            "document_count": len(documents),
            "retrieval_target_characters": RETRIEVAL_TARGET_CHARACTERS,
            "retrieval_hard_limit_characters": RETRIEVAL_HARD_LIMIT_CHARACTERS,
            "documents_within_target": sum(
                1 for document in documents if document["within_retrieval_target"]
            ),
            "minimum_text_characters": min(
                document["text_characters"] for document in documents
            ),
            "maximum_text_characters": max(
                document["text_characters"] for document in documents
            ),
            "documents": documents,
        },
        "corpus_size": len(families),
        "families": families,
        "cases": {
            "path": str(CASES_PATH.relative_to(EXPERIMENT_DIR)),
            "count": len(cases),
            "sha256": sha256_file(CASES_PATH),
            "coverage": "one authored positive situation for every family",
            "status": "development_only_not_final_holdout",
        },
        "publication": {
            "status": "private_experiment_not_release_grade",
            "bundle_rebuild_required": False,
            "official_advice": False,
        },
    }
    write_text_if_changed(
        MANIFEST_PATH,
        f"{json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True)}\n",
    )
    verify(source_repo)


def expected_family_entry(
    record: dict[str, Any],
    binding: SourceBinding,
) -> dict[str, Any]:
    family = record["family"]
    return {
        "id": binding.family_id,
        "title": family["title"],
        "domain_id": family["domain"]["id"],
        "aliases": family["aliases"],
        "jurisdictions": [
            item["jurisdiction"] for item in family["applicability"]
        ],
        "population_status": family["status"],
        "specialist_review": family["review"]["specialist_review"],
        "source_path": binding.source_path,
        "public_url": binding.public_url,
        "family_html_sha256": binding.html_sha256,
        "governed_record_sha256": binding.record_sha256,
    }


def verify(source_repo: Path) -> None:
    projection_bytes, projection = read_projection(source_repo)
    family_ids = family_ids_from_projection(projection)
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    if manifest["schema"] != "explore-okf-sharepoint-full-corpus.v1":
        raise ValueError(f"Unexpected manifest schema: {manifest['schema']!r}")
    if manifest["source"]["commit"] != SOURCE_COMMIT:
        raise ValueError("Complete corpus source commit is not pinned as expected")
    if manifest["source"]["source_projection_sha256"] != EXPECTED_PROJECTION_SHA256:
        raise ValueError("Complete corpus projection digest does not match")
    expected_source = {
        "repository": "okf-uk-living",
        "commit": SOURCE_COMMIT,
        "record_schema": EXPECTED_RECORD_SCHEMA,
        "source_projection_path": PROJECTION_PATH,
        "source_projection_bytes": len(projection_bytes),
        "source_projection_sha256": EXPECTED_PROJECTION_SHA256,
    }
    if manifest["source"] != expected_source:
        raise ValueError("Complete corpus source binding does not match")
    if manifest["corpus_size"] != EXPECTED_FAMILY_COUNT:
        raise ValueError("Complete corpus size does not match")

    documents = manifest["profile"]["documents"]
    if len(documents) != EXPECTED_FAMILY_COUNT:
        raise ValueError(f"Expected {EXPECTED_FAMILY_COUNT} documents")
    if [document["family_id"] for document in documents] != list(family_ids):
        raise ValueError("Document order does not match the pinned projection")
    if len({document["family_id"] for document in documents}) != len(documents):
        raise ValueError("Duplicate document family IDs in the manifest")
    listed_paths = {
        str((EXPERIMENT_DIR / document["path"]).resolve())
        for document in documents
    }
    actual_paths = {str(path.resolve()) for path in PROFILE_DIR.glob("*.docx")}
    if listed_paths != actual_paths:
        raise ValueError("Complete profile files do not match the manifest")

    case_lines = [
        line for line in CASES_PATH.read_text(encoding="utf-8").splitlines() if line
    ]
    if len(case_lines) != EXPECTED_FAMILY_COUNT:
        raise ValueError(f"Expected {EXPECTED_FAMILY_COUNT} full-corpus cases")
    if sha256_file(CASES_PATH) != manifest["cases"]["sha256"]:
        raise ValueError("Complete-corpus case digest mismatch")
    cases = [json.loads(line) for line in case_lines]
    families = manifest["families"]
    if len(families) != EXPECTED_FAMILY_COUNT:
        raise ValueError(f"Expected {EXPECTED_FAMILY_COUNT} family entries")
    if [family["id"] for family in families] != list(family_ids):
        raise ValueError("Family order does not match the pinned projection")

    expected_projection = {
        "path": PROJECTION_PATH,
        "bytes": len(projection_bytes),
        "sha256": EXPECTED_PROJECTION_SHA256,
    }
    actual_text_characters: list[int] = []
    actual_target_count = 0
    for position, (family_id, document, family_entry, case) in enumerate(
        zip(family_ids, documents, families, cases, strict=True),
        start=1,
    ):
        _, record, binding = read_governed_record(
            source_repo,
            SOURCE_COMMIT,
            family_id,
        )
        validate_governed_record(record, binding)
        if record["source_projection"] != expected_projection:
            raise ValueError(
                f"Source projection binding mismatch in {binding.family_id}"
            )
        if family_entry != expected_family_entry(record, binding):
            raise ValueError(f"Family manifest entry mismatch for {binding.family_id}")
        if case != make_case(position, record, binding):
            raise ValueError(f"Full-corpus case mismatch for {binding.family_id}")

        expected_path = PROFILE_DIR / f"{binding.family_id}.docx"
        path = EXPERIMENT_DIR / document["path"]
        if path.resolve() != expected_path.resolve():
            raise ValueError(f"DOCX path mismatch for {binding.family_id}")
        if sha256_file(path) != document["sha256"]:
            raise ValueError(f"DOCX digest mismatch for {path}")
        if path.stat().st_size != document["bytes"]:
            raise ValueError(f"DOCX byte-count mismatch for {path}")
        text = document_text(path)
        text_characters = len(text)
        actual_text_characters.append(text_characters)
        within_target = text_characters <= RETRIEVAL_TARGET_CHARACTERS
        actual_target_count += int(within_target)
        if text_characters != document["text_characters"]:
            raise ValueError(f"DOCX character-count mismatch for {path}")
        if within_target != document["within_retrieval_target"]:
            raise ValueError(f"DOCX target classification mismatch for {path}")
        if text_characters > RETRIEVAL_HARD_LIMIT_CHARACTERS:
            raise ValueError(f"DOCX hard retrieval limit exceeded for {path}")
        if hashlib.sha256(text.encode("utf-8")).hexdigest() != document[
            "body_text_sha256"
        ]:
            raise ValueError(f"DOCX body-text digest mismatch for {path}")
        with zipfile.ZipFile(path, "r") as package:
            corrupt_member = package.testzip()
        if corrupt_member is not None:
            raise ValueError(f"Corrupt DOCX member in {path}: {corrupt_member}")
        verify_retrieval_structure(path, record, binding)

    profile_summary = manifest["profile"]
    expected_profile_summary = {
        "name": PROFILE_NAME,
        "document_count": EXPECTED_FAMILY_COUNT,
        "retrieval_target_characters": RETRIEVAL_TARGET_CHARACTERS,
        "retrieval_hard_limit_characters": RETRIEVAL_HARD_LIMIT_CHARACTERS,
        "documents_within_target": actual_target_count,
        "minimum_text_characters": min(actual_text_characters),
        "maximum_text_characters": max(actual_text_characters),
    }
    for key, expected_value in expected_profile_summary.items():
        if profile_summary.get(key) != expected_value:
            raise ValueError(f"Profile summary mismatch for {key}")
    if manifest["cases"]["count"] != EXPECTED_FAMILY_COUNT:
        raise ValueError("Manifest case count does not match")
    if manifest["cases"]["path"] != str(CASES_PATH.relative_to(EXPERIMENT_DIR)):
        raise ValueError("Manifest case path does not match")
    print(
        f"Verified {len(documents)} Word documents and {len(case_lines)} "
        "full-corpus cases"
    )


def main() -> None:
    args = parse_args()
    if args.check:
        verify(args.source_repo)
    else:
        build(args.source_repo)
        print(MANIFEST_PATH)


if __name__ == "__main__":
    main()
