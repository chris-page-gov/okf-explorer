#!/usr/bin/env python3
"""Materialise deterministic local heritage browser evidence and its receipt."""

from __future__ import annotations

import argparse
import gzip
import hashlib
import io
import json
import math
import os
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Any
from urllib.parse import parse_qs, urljoin, urlparse

from plane_root_validation import validate_plane_roots


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_FIXTURE_ROOT = (
    ROOT / "evaluation-foundry" / "fixtures" / "heritage-warwickshire"
)
QUESTION_SUITE_PATH = (
    ROOT / "evaluation-foundry" / "fixtures" / "heritage-warwickshire"
    / "questions.json"
)
JOURNEY_MANIFEST_PATH = (
    ROOT / "evaluation-foundry" / "fixtures" / "heritage-warwickshire"
    / "journeys.json"
)
FAITHFUL_ROOT = ROOT / "evaluation" / "heritage"
CORPUS_ROOTS = {
    "faithful": FAITHFUL_ROOT,
    "tiny": FAITHFUL_ROOT / "tiny",
    "synthetic": FAITHFUL_ROOT / "synthetic",
}
APP_BUILD_ROOT = ROOT / "apps" / "okf-explorer" / "build"
APP_MANIFEST_PATH = APP_BUILD_ROOT / "okf-explorer-build-manifest.json"
EVALUATOR_PATH = ROOT / "scripts" / "evaluate_okf_explorer.mjs"
EVALUATOR_REFERENCE = "scripts/evaluate_okf_explorer.mjs"
QUESTION_RESULT_RELATIVE = Path("evidence/receipts/question-suite-results.json.gz")
JOURNEY_RESULT_RELATIVE = Path("evidence/receipts/local-journey-results.json.gz")
RECEIPT_RELATIVE = Path("evidence/local-candidate-receipt.json")
QUESTION_SUITE_REFERENCE = (
    "evaluation-foundry/fixtures/heritage-warwickshire/questions.json"
)
JOURNEY_MANIFEST_REFERENCE = (
    "evaluation-foundry/fixtures/heritage-warwickshire/journeys.json"
)
LOCAL_BASE_URL = "http://127.0.0.1:8002/"
LOCAL_PUBLICATION_PREFIX = "/publication/"
QUESTION_FAITHFUL_BUNDLE = f"{LOCAL_PUBLICATION_PREFIX}okf-explorer.json"
JOURNEY_FAITHFUL_BUNDLE = "/okf-explorer.json"
# Retained as the question-suite shorthand used by existing callers/tests.
FAITHFUL_BUNDLE = QUESTION_FAITHFUL_BUNDLE
LOCAL_JOURNEY_IDS = (
    "journey-tiny",
    "journey-faithful",
    "journey-synthetic-isolation",
)
SHA256_HEX = set("0123456789abcdef")
COMPARISON_TREE_ALGORITHM = (
    "sha256-over-canonical-json-path-bytes-digest-list-v1"
)
SITE_TREE_ALGORITHM = (
    "sha256-over-canonical-json-path-bytes-digest-list-excluding-receipt-v1"
)
PRODUCER_MATERIALS_SCHEMA = "okf-heritage-producer-materials.v1"
PRODUCER_MATERIALS_ALGORITHM = (
    "sha256-over-canonical-json-path-bytes-digest-list-v1"
)
PRODUCER_MATERIAL_PATHS = (
    "requirements-okf.txt",
    "scripts/build_heritage_evaluation.py",
    "scripts/build_uk_government_api_okf.py",
    "scripts/heritage_build_io.py",
    "scripts/okf_semantic.py",
)
MAX_PRODUCER_MATERIALS = 64
MAX_PRODUCER_MATERIAL_BYTES = 8 * 1024 * 1024
MAX_PRODUCER_MATERIALS_BYTES = 32 * 1024 * 1024


def digest(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def is_sha256(value: object) -> bool:
    return (
        isinstance(value, str)
        and len(value) == 64
        and set(value).issubset(SHA256_HEX)
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


def load_json_bytes(path: Path, label: str) -> tuple[dict[str, Any], bytes]:
    try:
        raw = path.read_bytes()
        value = json.loads(raw)
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        raise RuntimeError(f"cannot read {label} JSON {path}: {error}") from error
    if not isinstance(value, dict):
        raise RuntimeError(f"{label} JSON must be an object: {path}")
    return value, raw


def parse_timestamp(value: object, label: str) -> datetime:
    if not isinstance(value, str) or not value.strip():
        raise RuntimeError(f"{label} must be a timezone-qualified timestamp")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as error:
        raise RuntimeError(f"{label} must be a timezone-qualified timestamp") from error
    if parsed.tzinfo is None:
        raise RuntimeError(f"{label} must be a timezone-qualified timestamp")
    return parsed.astimezone(timezone.utc)


def format_timestamp(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def safe_relative_path(value: object, label: str) -> str:
    if not isinstance(value, str) or not value or "\\" in value or "\x00" in value:
        raise RuntimeError(f"unsafe {label} path: {value!r}")
    relative = PurePosixPath(value)
    if relative.is_absolute() or relative.as_posix() != value or ".." in relative.parts:
        raise RuntimeError(f"unsafe {label} path: {value!r}")
    return value


def _producer_file_identity(value: os.stat_result) -> tuple[int, ...]:
    return (
        value.st_dev,
        value.st_ino,
        value.st_mode,
        value.st_nlink,
        value.st_size,
        value.st_mtime_ns,
        value.st_ctime_ns,
    )


def read_producer_material(
    relative: str,
    *,
    root: Path = ROOT,
) -> bytes:
    """Read one bounded, stable producer input without following a link."""

    safe = safe_relative_path(relative, "producer material")
    path = root.joinpath(*PurePosixPath(safe).parts)
    try:
        before = path.lstat()
    except OSError as error:
        raise RuntimeError(f"cannot stat producer material {safe}: {error}") from error
    if (
        not path.is_file()
        or path.is_symlink()
        or before.st_nlink != 1
        or before.st_size < 1
        or before.st_size > MAX_PRODUCER_MATERIAL_BYTES
    ):
        raise RuntimeError(
            f"producer material is not a bounded independent regular file: {safe}"
        )
    flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0)
    try:
        descriptor = os.open(path, flags)
    except OSError as error:
        raise RuntimeError(f"cannot open producer material {safe}: {error}") from error
    try:
        opened = os.fstat(descriptor)
        if (
            _producer_file_identity(before) != _producer_file_identity(opened)
            or opened.st_size > MAX_PRODUCER_MATERIAL_BYTES
        ):
            raise RuntimeError(
                f"producer material changed before it was opened: {safe}"
            )
        chunks: list[bytes] = []
        remaining = opened.st_size
        while remaining:
            chunk = os.read(descriptor, min(1024 * 1024, remaining))
            if not chunk:
                raise RuntimeError(
                    f"producer material was truncated while it was read: {safe}"
                )
            chunks.append(chunk)
            remaining -= len(chunk)
        if os.read(descriptor, 1):
            raise RuntimeError(f"producer material grew while it was read: {safe}")
        after = os.fstat(descriptor)
        path_after = path.lstat()
        if (
            _producer_file_identity(opened) != _producer_file_identity(after)
            or _producer_file_identity(before)
            != _producer_file_identity(path_after)
        ):
            raise RuntimeError(
                f"producer material changed while it was read: {safe}"
            )
        return b"".join(chunks)
    finally:
        os.close(descriptor)


def validate_producer_materials(
    value: object,
    *,
    root: Path = ROOT,
) -> dict[str, Any]:
    """Validate the exact, bounded producer dependency closure and its root."""

    if not isinstance(value, dict):
        raise RuntimeError("producer_materials must be an object")
    expected_keys = {
        "schema",
        "algorithm",
        "file_count",
        "bytes",
        "root_sha256",
        "materials",
    }
    if set(value) != expected_keys:
        raise RuntimeError("producer_materials has an unexpected key set")
    if value.get("schema") != PRODUCER_MATERIALS_SCHEMA:
        raise RuntimeError("producer_materials has an unsupported schema")
    if value.get("algorithm") != PRODUCER_MATERIALS_ALGORITHM:
        raise RuntimeError("producer_materials has an unsupported root algorithm")
    materials = value.get("materials")
    if not isinstance(materials, list) or not materials:
        raise RuntimeError("producer_materials.materials must be a non-empty list")
    if len(materials) > MAX_PRODUCER_MATERIALS:
        raise RuntimeError("producer_materials exceeds its material-count bound")

    normalized: list[dict[str, Any]] = []
    for index, material in enumerate(materials):
        if not isinstance(material, dict) or set(material) != {
            "path",
            "bytes",
            "sha256",
        }:
            raise RuntimeError(
                f"producer_materials.materials[{index}] has an unexpected shape"
            )
        relative = safe_relative_path(
            material.get("path"),
            f"producer_materials.materials[{index}]",
        )
        byte_count = material.get("bytes")
        if (
            not isinstance(byte_count, int)
            or isinstance(byte_count, bool)
            or byte_count < 1
            or byte_count > MAX_PRODUCER_MATERIAL_BYTES
        ):
            raise RuntimeError(
                f"producer material has an invalid byte count: {relative}"
            )
        sha256 = material.get("sha256")
        if not is_sha256(sha256):
            raise RuntimeError(
                f"producer material has an invalid SHA-256: {relative}"
            )
        normalized.append(
            {"path": relative, "bytes": byte_count, "sha256": sha256}
        )

    paths = [material["path"] for material in normalized]
    if paths != sorted(paths) or len(paths) != len(set(paths)):
        raise RuntimeError(
            "producer_materials paths must be unique and sorted lexically"
        )
    expected_paths = list(PRODUCER_MATERIAL_PATHS)
    missing = sorted(set(expected_paths).difference(paths))
    if missing:
        raise RuntimeError(
            "producer_materials is missing required path(s): "
            + ", ".join(missing)
        )
    extra = sorted(set(paths).difference(expected_paths))
    if extra:
        raise RuntimeError(
            "producer_materials contains unexpected path(s): "
            + ", ".join(extra)
        )
    total_bytes = sum(material["bytes"] for material in normalized)
    if total_bytes > MAX_PRODUCER_MATERIALS_BYTES:
        raise RuntimeError("producer_materials exceeds its aggregate byte bound")
    if value.get("file_count") != len(normalized):
        raise RuntimeError("producer_materials.file_count differs from materials")
    if value.get("bytes") != total_bytes:
        raise RuntimeError("producer_materials.bytes differs from materials")
    expected_root = digest(canonical_json(normalized))
    if value.get("root_sha256") != expected_root:
        raise RuntimeError(
            "producer_materials.root_sha256 does not bind canonical materials"
        )

    for material in normalized:
        raw = read_producer_material(material["path"], root=root)
        if len(raw) != material["bytes"] or digest(raw) != material["sha256"]:
            raise RuntimeError(
                "producer material differs from exact current bytes: "
                f"{material['path']}"
            )
    return {
        "schema": PRODUCER_MATERIALS_SCHEMA,
        "algorithm": PRODUCER_MATERIALS_ALGORITHM,
        "file_count": len(normalized),
        "bytes": total_bytes,
        "root_sha256": expected_root,
        "materials": normalized,
    }


def producer_materials_identity(*, root: Path = ROOT) -> dict[str, Any]:
    """Build the exact-byte inventory for every direct heritage producer input."""

    materials = []
    for relative in PRODUCER_MATERIAL_PATHS:
        raw = read_producer_material(relative, root=root)
        materials.append(
            {"path": relative, "bytes": len(raw), "sha256": digest(raw)}
        )
    value = {
        "schema": PRODUCER_MATERIALS_SCHEMA,
        "algorithm": PRODUCER_MATERIALS_ALGORITHM,
        "file_count": len(materials),
        "bytes": sum(material["bytes"] for material in materials),
        "root_sha256": digest(canonical_json(materials)),
        "materials": materials,
    }
    return validate_producer_materials(value, root=root)


def corpus_identity(name: str, corpus_root: Path) -> dict[str, Any]:
    roots_path = corpus_root / "assurance" / "plane-roots.json"
    roots, roots_raw = load_json_bytes(roots_path, f"{name} plane roots")
    validated = validate_plane_roots(
        roots,
        read_bytes=lambda relative: (corpus_root / relative).read_bytes(),
        label=f"{name} plane roots",
    )
    generated_paths = {
        safe_relative_path(entry.get("path"), f"{name} generated material")
        for plane in roots["planes"].values()
        for entry in plane["entries"]
    }
    plane_roots_relative = "assurance/plane-roots.json"
    if plane_roots_relative in generated_paths:
        raise RuntimeError(f"{name} plane roots contain their own receipt")
    generated_paths.add(plane_roots_relative)
    tree_entries = []
    for relative in sorted(generated_paths):
        raw = (
            roots_raw
            if relative == plane_roots_relative
            else (corpus_root / relative).read_bytes()
        )
        tree_entries.append(
            {
                "path": relative,
                "bytes": len(raw),
                "sha256": digest(raw),
            }
        )
    return {
        "release_root_sha256": validated["release_root_sha256"],
        "builds": 1,
        "files_per_build": len(tree_entries),
        "differences": 0,
        "comparison_tree_sha256": digest(canonical_json(tree_entries)),
    }


def descriptor_identity() -> tuple[dict[str, Any], bytes]:
    descriptor, raw = load_json_bytes(
        FAITHFUL_ROOT / "okf-explorer.json", "faithful descriptor"
    )
    for field in ("schema", "snapshot", "generated_at"):
        if not isinstance(descriptor.get(field), str) or not descriptor[field]:
            raise RuntimeError(f"faithful descriptor must declare {field}")
    parse_timestamp(descriptor["generated_at"], "faithful descriptor generated_at")
    return descriptor, raw


def app_identity() -> dict[str, str]:
    manifest, manifest_raw = load_json_bytes(
        APP_MANIFEST_PATH, "Explorer build manifest"
    )
    if manifest.get("schema") != "okf-explorer-app-build-manifest.v1":
        raise RuntimeError("Explorer build manifest has an unsupported schema")
    if manifest.get("algorithm") != "sha256-canonical-json-materials-v1":
        raise RuntimeError("Explorer build manifest has an unsupported algorithm")
    materials = manifest.get("materials")
    if not isinstance(materials, list) or not materials:
        raise RuntimeError("Explorer build manifest must contain materials")
    if manifest.get("file_count") != len(materials):
        raise RuntimeError("Explorer build manifest file count differs")
    observed: list[dict[str, object]] = []
    paths: list[str] = []
    for entry in materials:
        if not isinstance(entry, dict):
            raise RuntimeError("Explorer build manifest material must be an object")
        relative = safe_relative_path(entry.get("path"), "Explorer build material")
        if relative in paths:
            raise RuntimeError(
                f"Explorer build manifest duplicates material: {relative}"
            )
        raw = (APP_BUILD_ROOT / relative).read_bytes()
        observed.append(
            {"path": relative, "bytes": len(raw), "sha256": digest(raw)}
        )
        paths.append(relative)
    if paths != sorted(paths):
        raise RuntimeError("Explorer build manifest materials are not path ordered")
    tree_raw = (
        json.dumps(observed, ensure_ascii=False, separators=(",", ":")) + "\n"
    ).encode("utf-8")
    tree_sha256 = digest(tree_raw)
    if materials != observed or manifest.get("tree_sha256") != tree_sha256:
        raise RuntimeError(
            "Explorer build manifest does not bind exact current app build bytes"
        )
    return {
        "tree_sha256": tree_sha256,
        "manifest_sha256": digest(manifest_raw),
    }


def evaluator_identity() -> dict[str, str]:
    try:
        raw = EVALUATOR_PATH.read_bytes()
    except OSError as error:
        raise RuntimeError(f"cannot read evaluator executable: {error}") from error
    if not raw:
        raise RuntimeError("evaluator executable is empty")
    return {"path": EVALUATOR_REFERENCE, "sha256": digest(raw)}


def result_explorer_build_identity(
    base_url: str, current_app: dict[str, str]
) -> dict[str, object]:
    manifest, _manifest_raw = load_json_bytes(
        APP_MANIFEST_PATH, "Explorer build manifest"
    )
    return {
        "manifest_url": urljoin(base_url, APP_MANIFEST_PATH.name),
        "manifest_sha256": current_app["manifest_sha256"],
        "schema": manifest["schema"],
        "algorithm": manifest["algorithm"],
        "file_count": manifest["file_count"],
        "tree_sha256": current_app["tree_sha256"],
    }


def validated_site_identity(
    receipt: dict[str, Any], current_app: dict[str, str]
) -> dict[str, Any]:
    if receipt.get("schema") != "okf-site-candidate-receipt.v1":
        raise RuntimeError("Site candidate receipt has an unsupported schema")
    if (
        receipt.get("algorithm")
        != "deterministic-pre-deploy-identity-without-observations-v1"
    ):
        raise RuntimeError("Site candidate receipt has an unsupported algorithm")
    if receipt.get("explorer") != current_app:
        raise RuntimeError(
            "Site candidate receipt Explorer identity differs from the "
            "current app build"
        )
    site = receipt.get("site")
    if not isinstance(site, dict):
        raise RuntimeError("Site candidate receipt must declare site identity")
    for field in ("reading_pages", "internal_references", "file_count"):
        if (
            not isinstance(site.get(field), int)
            or isinstance(site[field], bool)
            or site[field] < 0
        ):
            raise RuntimeError(f"Site candidate receipt site.{field} is invalid")
    if site["file_count"] < 1:
        raise RuntimeError("Site candidate receipt site.file_count must be positive")
    if site.get("tree_algorithm") != SITE_TREE_ALGORITHM:
        raise RuntimeError("Site candidate receipt site.tree_algorithm is invalid")
    if not is_sha256(site.get("tree_sha256")):
        raise RuntimeError("Site candidate receipt site.tree_sha256 is invalid")
    size = site.get("size_gate")
    if not isinstance(size, dict) or size.get("status") != "passed":
        raise RuntimeError("Site candidate receipt size gate did not pass")
    for field in ("limit_bytes", "site_bytes", "headroom_bytes"):
        if (
            not isinstance(size.get(field), int)
            or isinstance(size[field], bool)
            or size[field] < 0
        ):
            raise RuntimeError(f"Site candidate receipt size_gate.{field} is invalid")
    if (
        size["site_bytes"] > size["limit_bytes"]
        or size["headroom_bytes"] != size["limit_bytes"] - size["site_bytes"]
    ):
        raise RuntimeError("Site candidate receipt size gate arithmetic differs")
    return {
        "site_reading_pages": site["reading_pages"],
        "site_internal_references": site["internal_references"],
        "site_file_count": site["file_count"],
        "site_tree_algorithm": site["tree_algorithm"],
        "site_tree_sha256": site["tree_sha256"],
        "site_size_gate": {
            "status": "passed",
            "limit_bytes": size["limit_bytes"],
            "site_bytes": size["site_bytes"],
            "headroom_bytes": size["headroom_bytes"],
        },
    }


def expected_result_candidate(
    descriptor: dict[str, Any],
    descriptor_sha256: str,
    bundle_url: str,
    *,
    base_url: str,
    current_app: dict[str, str],
) -> dict[str, Any]:
    return {
        "bundle_url": bundle_url,
        "descriptor_sha256": descriptor_sha256,
        "schema": descriptor["schema"],
        "snapshot": descriptor["snapshot"],
        "generated_at": descriptor["generated_at"],
        "explorer_build": result_explorer_build_identity(base_url, current_app),
    }


def validated_local_base_url(value: object, label: str) -> str:
    """Accept a loopback publication root without binding evidence to one port."""

    if not isinstance(value, str):
        raise RuntimeError(f"{label} base URL is not a local publication root")
    parsed = urlparse(value)
    try:
        port = parsed.port
    except ValueError as error:
        raise RuntimeError(
            f"{label} base URL is not a local publication root"
        ) from error
    if (
        parsed.scheme != "http"
        or parsed.hostname not in {"127.0.0.1", "localhost", "::1"}
        or port is None
        or parsed.path != "/"
        or parsed.params
        or parsed.query
        or parsed.fragment
        or parsed.username
        or parsed.password
    ):
        raise RuntimeError(f"{label} base URL is not a local publication root")
    return value


def require_browser_result(result: dict[str, Any], label: str) -> datetime:
    if result.get("schema") != "okf-explorer-evaluation-results.v1":
        raise RuntimeError(f"{label} has an unsupported schema")
    generated_at = parse_timestamp(result.get("generated_at"), f"{label} generated_at")
    metadata = result.get("metadata")
    if (
        not isinstance(metadata, dict)
        or metadata.get("browser") != "playwright"
        or metadata.get("mode") != "browser-scored"
        or metadata.get("browser_engine") not in {"chromium", "firefox", "webkit"}
    ):
        raise RuntimeError(f"{label} is not genuine browser-scored evaluator output")
    if metadata.get("evaluator") != evaluator_identity():
        raise RuntimeError(f"{label} evaluator executable identity differs")
    return generated_at


def numeric(value: object, label: str) -> float:
    if (
        isinstance(value, bool)
        or not isinstance(value, (int, float))
        or not math.isfinite(value)
    ):
        raise RuntimeError(f"{label} must be a finite number")
    return float(value)


def rounded_average(values: list[float]) -> float:
    return round(sum(values) / len(values) + 1e-12, 1)


def validate_question_result(
    result: dict[str, Any],
    *,
    descriptor: dict[str, Any],
    descriptor_sha256: str,
    current_app: dict[str, str],
) -> tuple[dict[str, Any], datetime]:
    generated_at = require_browser_result(result, "question-suite result")
    base_url = validated_local_base_url(
        result.get("base_url"), "question-suite result"
    )
    if result.get("bundle") != QUESTION_FAITHFUL_BUNDLE:
        raise RuntimeError(
            "question-suite result does not target the local faithful bundle"
        )
    if result.get("suite") != QUESTION_SUITE_REFERENCE:
        raise RuntimeError("question-suite result suite path differs")
    candidate_url = urljoin(base_url, QUESTION_FAITHFUL_BUNDLE)
    if result.get("metadata", {}).get("candidate_bundle_url") != candidate_url:
        raise RuntimeError("question-suite result metadata candidate URL differs")
    expected_candidate = expected_result_candidate(
        descriptor,
        descriptor_sha256,
        candidate_url,
        base_url=base_url,
        current_app=current_app,
    )
    candidate = result.get("candidate")
    if (
        not isinstance(candidate, dict)
        or candidate.get("explorer_build") != expected_candidate["explorer_build"]
    ):
        raise RuntimeError("question-suite result Explorer build identity differs")
    if candidate != expected_candidate:
        raise RuntimeError("question-suite result candidate identity differs")

    suite, suite_raw = load_json_bytes(QUESTION_SUITE_PATH, "question suite")
    questions = suite.get("questions")
    if not isinstance(questions, list) or len(questions) != 100:
        raise RuntimeError("question suite must contain exactly 100 questions")
    if any(not isinstance(question, dict) for question in questions):
        raise RuntimeError("question suite contains a non-object question")
    expected_ids = [question.get("id") for question in questions]
    if any(not isinstance(value, str) or not value for value in expected_ids):
        raise RuntimeError("question suite contains an invalid question id")
    records = result.get("records")
    if (
        not isinstance(records, list)
        or any(not isinstance(row, dict) for row in records)
        or [row.get("id") for row in records] != expected_ids
    ):
        raise RuntimeError(
            "question-suite result records do not exactly cover the suite"
        )
    for question, record in zip(questions, records, strict=True):
        if any(
            record.get(field) != question.get(field)
            for field in ("query", "intent", "tags")
        ):
            raise RuntimeError(
                f"question {record.get('id')} result identity differs from the suite"
            )
        attempts = record.get("attempts")
        if (
            not isinstance(attempts, int)
            or isinstance(attempts, bool)
            or attempts < 1
        ):
            raise RuntimeError(f"question {record.get('id')} has no browser attempt")
    score_keys = ("total", "retrieval", "display", "accessibility", "govuk")
    scores: dict[str, list[float]] = {key: [] for key in score_keys}
    for record in records:
        score = record.get("score")
        evidence = record.get("evidence")
        if not isinstance(score, dict) or not isinstance(evidence, dict):
            raise RuntimeError(
                f"question {record.get('id')} has invalid browser evidence"
            )
        if evidence.get("error"):
            raise RuntimeError(
                f"question {record.get('id')} browser evidence has an error"
            )
        for key in score_keys:
            scores[key].append(
                numeric(score.get(key), f"question {record.get('id')} score.{key}")
            )
        component_values = {
            "retrieval": scores["retrieval"][-1],
            "display": scores["display"][-1],
            "accessibility": scores["accessibility"][-1],
            "govuk": scores["govuk"][-1],
        }
        component_limits = {
            "retrieval": 35,
            "display": 25,
            "accessibility": 20,
            "govuk": 20,
        }
        if any(
            value < 0 or value > component_limits[key]
            for key, value in component_values.items()
        ) or not math.isclose(
            scores["total"][-1],
            sum(component_values.values()),
            rel_tol=0,
            abs_tol=1e-9,
        ):
            raise RuntimeError(
                f"question {record.get('id')} score components differ"
            )
    if any(total < 80 for total in scores["total"]):
        raise RuntimeError(
            "question-suite result did not pass every question at 80 or above"
        )
    summary = {
        "questions_run": len(records),
        "questions_scored": len(records),
        "average_total": rounded_average(scores["total"]),
        "average_retrieval": rounded_average(scores["retrieval"]),
        "average_display": rounded_average(scores["display"]),
        "average_accessibility": rounded_average(scores["accessibility"]),
        "average_govuk": rounded_average(scores["govuk"]),
        "pass_count_80": sum(value >= 80 for value in scores["total"]),
        "fail_count_below_60": sum(value < 60 for value in scores["total"]),
    }
    if result.get("summary") != summary:
        raise RuntimeError("question-suite result summary differs from its records")
    return (
        {
            "status": "passed",
            "suite": QUESTION_SUITE_REFERENCE,
            "suite_sha256": digest(suite_raw),
            "base_url": base_url,
            "bundle": QUESTION_FAITHFUL_BUNDLE,
            "result": QUESTION_RESULT_RELATIVE.as_posix(),
            "questions_run": summary["questions_run"],
            "questions_scored": summary["questions_scored"],
            "average_total": summary["average_total"],
            "average_retrieval": summary["average_retrieval"],
            "average_display": summary["average_display"],
            "average_accessibility": summary["average_accessibility"],
            "average_plain_language_and_government_style": summary["average_govuk"],
            "scores_at_least_80": summary["pass_count_80"],
            "scores_below_60": summary["fail_count_below_60"],
        },
        generated_at,
    )


def journey_bundle_path(
    start_url: object, journey_id: str, *, base_url: str
) -> str:
    if not isinstance(start_url, str):
        raise RuntimeError(f"journey {journey_id} has no start URL")
    parsed_start = urlparse(start_url)
    local_base = urlparse(base_url)
    if (
        parsed_start.scheme != local_base.scheme
        or parsed_start.netloc != local_base.netloc
        or parsed_start.path != local_base.path
        or parsed_start.username
        or parsed_start.password
    ):
        raise RuntimeError(f"journey {journey_id} start URL is not local")
    values = parse_qs(parsed_start.query).get("bundle")
    if not values or len(values) != 1:
        raise RuntimeError(f"journey {journey_id} start URL has no unique bundle")
    bundle = urlparse(values[0])
    if (
        bundle.scheme != local_base.scheme
        or bundle.netloc != local_base.netloc
        or bundle.username
        or bundle.password
        or bundle.query
        or bundle.fragment
    ):
        raise RuntimeError(f"journey {journey_id} start bundle is not local")
    return bundle.path


def indexed_manifest_journeys(
    manifest: dict[str, Any],
) -> dict[str, dict[str, Any]]:
    declared = manifest.get("journeys")
    if not isinstance(declared, list) or any(
        not isinstance(journey, dict) for journey in declared
    ):
        raise RuntimeError("journey manifest has invalid journeys")
    by_id: dict[str, dict[str, Any]] = {}
    for journey in declared:
        journey_id = journey.get("id")
        if not isinstance(journey_id, str) or not journey_id:
            raise RuntimeError("journey manifest has an invalid journey id")
        if journey_id in by_id:
            raise RuntimeError(f"journey manifest duplicates {journey_id}")
        by_id[journey_id] = journey
    return by_id


def expected_local_journey_bundles(
    by_id: dict[str, dict[str, Any]],
    *,
    base_url: str,
) -> list[str]:
    expected: list[str] = []
    for journey_id in LOCAL_JOURNEY_IDS:
        journey = by_id.get(journey_id)
        start = journey.get("start") if journey else None
        bundle = start.get("bundle") if isinstance(start, dict) else None
        parsed = urlparse(bundle) if isinstance(bundle, str) else None
        if (
            parsed is None
            or not bundle.startswith("/")
            or "\\" in bundle
            or "\x00" in bundle
            or ".." in PurePosixPath(parsed.path).parts
            or parsed.scheme
            or parsed.netloc
            or parsed.query
            or parsed.fragment
        ):
            raise RuntimeError(
                f"journey manifest {journey_id} start bundle is invalid"
            )
        resolved = urljoin(
            urljoin(base_url, LOCAL_PUBLICATION_PREFIX.lstrip("/")),
            bundle.lstrip("/"),
        )
        expected.append(urlparse(resolved).path)
    return expected


def validate_journey_result(
    result: dict[str, Any],
    *,
    descriptor: dict[str, Any],
    descriptor_sha256: str,
    current_app: dict[str, str],
) -> tuple[dict[str, Any], datetime]:
    generated_at = require_browser_result(result, "local-journey result")
    base_url = validated_local_base_url(
        result.get("base_url"), "local-journey result"
    )
    manifest, manifest_raw = load_json_bytes(
        JOURNEY_MANIFEST_PATH, "journey manifest"
    )
    publication_target = manifest.get("target_bundle")
    parsed_publication_target = (
        urlparse(publication_target)
        if isinstance(publication_target, str)
        else None
    )
    if (
        parsed_publication_target is None
        or parsed_publication_target.scheme not in {"http", "https"}
        or not parsed_publication_target.netloc
        or parsed_publication_target.username
        or parsed_publication_target.password
    ):
        raise RuntimeError("journey manifest target_bundle is invalid")
    manifest_journeys = indexed_manifest_journeys(manifest)
    expected_start_bundles = expected_local_journey_bundles(
        manifest_journeys, base_url=base_url
    )
    candidate_url = urljoin(
        urljoin(base_url, LOCAL_PUBLICATION_PREFIX.lstrip("/")),
        JOURNEY_FAITHFUL_BUNDLE.lstrip("/"),
    )
    if result.get("bundle") != JOURNEY_FAITHFUL_BUNDLE:
        raise RuntimeError(
            "local-journey result does not target the local faithful bundle"
        )
    if result.get("suite") != QUESTION_SUITE_REFERENCE:
        raise RuntimeError("local-journey result suite path differs")
    metadata = result.get("metadata")
    if (
        not isinstance(metadata, dict)
        or metadata.get("candidate_bundle_url") != candidate_url
    ):
        raise RuntimeError("local-journey result metadata candidate URL differs")
    expected_candidate = expected_result_candidate(
        descriptor,
        descriptor_sha256,
        candidate_url,
        base_url=base_url,
        current_app=current_app,
    )
    candidate = result.get("candidate")
    if (
        not isinstance(candidate, dict)
        or candidate.get("explorer_build") != expected_candidate["explorer_build"]
    ):
        raise RuntimeError("local-journey result Explorer build identity differs")
    if candidate != expected_candidate:
        raise RuntimeError("local-journey result candidate identity differs")
    expected_top_summary = {
        "questions_run": 0,
        "questions_scored": 0,
        "average_total": None,
        "average_retrieval": None,
        "average_display": None,
        "average_accessibility": None,
        "average_govuk": None,
        "pass_count_80": 0,
        "fail_count_below_60": 0,
    }
    if result.get("records") != [] or result.get("summary") != expected_top_summary:
        raise RuntimeError("local-journey result is not journeys-only output")
    journeys = result.get("interaction_journeys")
    if not isinstance(journeys, dict):
        raise RuntimeError("local-journey result has no interaction journeys")
    if (
        journeys.get("manifest") != JOURNEY_MANIFEST_REFERENCE
        or journeys.get("target_bundle") != JOURNEY_FAITHFUL_BUNDLE
    ):
        raise RuntimeError("local-journey result manifest binding differs")
    records = journeys.get("records")
    if (
        not isinstance(records, list)
        or any(not isinstance(row, dict) for row in records)
        or [row.get("id") for row in records] != list(LOCAL_JOURNEY_IDS)
    ):
        raise RuntimeError(
            "local-journey result does not contain the exact local journeys"
        )
    start_bundles: list[str] = []
    for record in records:
        journey_id = record["id"]
        manifest_journey = manifest_journeys[journey_id]
        if any(
            record.get(field) != manifest_journey.get(field)
            for field in ("title", "persona_ids", "story_ids")
        ):
            raise RuntimeError(
                f"journey {journey_id} result identity differs from the manifest"
            )
        if record.get("status") != "passed":
            raise RuntimeError(f"journey {journey_id} did not pass")
        for evidence_kind, identity_key in (
            ("actions", "action"),
            ("assertions", "assertion"),
        ):
            evidence = record.get(evidence_kind)
            declared_evidence = manifest_journey.get(evidence_kind)
            if (
                not isinstance(evidence, list)
                or not evidence
                or not isinstance(declared_evidence, list)
                or any(not isinstance(item, dict) for item in evidence)
                or any(not isinstance(item, dict) for item in declared_evidence)
                or any(
                    not isinstance(item.get(identity_key), str)
                    or not item[identity_key]
                    for item in declared_evidence
                )
                or [item.get(identity_key) for item in evidence]
                != [item.get(identity_key) for item in declared_evidence]
                or not all(
                    isinstance(item, dict) and item.get("passed") is True
                    for item in evidence
                )
            ):
                raise RuntimeError(
                    f"journey {journey_id} {evidence_kind} did not all pass"
                )
        start_bundles.append(
            journey_bundle_path(
                record.get("start_url"), journey_id, base_url=base_url
            )
        )
    if start_bundles != expected_start_bundles:
        raise RuntimeError(
            "local-journey result start bundles differ from the local manifest"
        )
    summary = {
        "journeys_run": len(records),
        "passed": len(records),
        "failed": 0,
        "errors": 0,
        "validation_only": 0,
    }
    if journeys.get("summary") != summary:
        raise RuntimeError("local-journey result summary differs from its records")
    return (
        {
            "status": "passed",
            "manifest": JOURNEY_MANIFEST_REFERENCE,
            "manifest_sha256": digest(manifest_raw),
            "base_url": base_url,
            "start_bundles": start_bundles,
            "result": JOURNEY_RESULT_RELATIVE.as_posix(),
            "journeys_run": summary["journeys_run"],
            "passed": summary["passed"],
            "failed": summary["failed"],
            "errors": summary["errors"],
            "validation_only": summary["validation_only"],
            "journey_ids": list(LOCAL_JOURNEY_IDS),
        },
        generated_at,
    )


def deterministic_gzip(raw: bytes) -> bytes:
    output = io.BytesIO()
    with gzip.GzipFile(
        filename="",
        mode="wb",
        compresslevel=9,
        fileobj=output,
        mtime=0,
    ) as stream:
        stream.write(raw)
    return output.getvalue()


def with_result_hashes(
    section: dict[str, Any], raw: bytes, compressed: bytes
) -> dict[str, Any]:
    result = dict(section)
    result["result_gzip_sha256"] = digest(compressed)
    result["result_json_sha256"] = digest(raw)
    return result


def build_receipt(
    *,
    question_result: dict[str, Any],
    question_raw: bytes,
    journey_result: dict[str, Any],
    journey_raw: bytes,
    site_candidate: dict[str, Any],
    observed_at: str,
) -> tuple[dict[str, Any], bytes, bytes]:
    observed = parse_timestamp(observed_at, "--observed-at")
    descriptor, descriptor_raw = descriptor_identity()
    descriptor_sha256 = digest(descriptor_raw)
    candidate_generated = parse_timestamp(
        descriptor["generated_at"], "faithful descriptor generated_at"
    )
    current_app = app_identity()
    question_section, question_time = validate_question_result(
        question_result,
        descriptor=descriptor,
        descriptor_sha256=descriptor_sha256,
        current_app=current_app,
    )
    journey_section, journey_time = validate_journey_result(
        journey_result,
        descriptor=descriptor,
        descriptor_sha256=descriptor_sha256,
        current_app=current_app,
    )
    if question_section["base_url"] != journey_section["base_url"]:
        raise RuntimeError(
            "question-suite and local-journey results use different local publications"
        )
    for label, result_time in (
        ("question-suite result", question_time),
        ("local-journey result", journey_time),
    ):
        if result_time < candidate_generated:
            raise RuntimeError(f"{label} predates the faithful candidate")
        if observed < result_time:
            raise RuntimeError(f"--observed-at predates the {label}")

    site = validated_site_identity(site_candidate, current_app)
    corpora = {
        name: corpus_identity(name, root) for name, root in CORPUS_ROOTS.items()
    }

    question_gzip = deterministic_gzip(question_raw)
    journey_gzip = deterministic_gzip(journey_raw)
    question_section = with_result_hashes(
        question_section, question_raw, question_gzip
    )
    journey_section = with_result_hashes(journey_section, journey_raw, journey_gzip)
    faithful = corpora["faithful"]
    producer_materials = producer_materials_identity()
    receipt = {
        "schema": "okf-heritage-local-candidate-receipt.v1",
        "observed_at": format_timestamp(observed),
        "scope": (
            "Full local candidate rebuild binding the current faithful, tiny and "
            "synthetic corpus trees, current Explorer build, deterministic Site "
            "candidate identity and exact supplied browser-result bytes. This "
            "receipt does not claim that GitHub Pages is deployed."
        ),
        "producer_materials": producer_materials,
        "candidate": {
            "snapshot": descriptor["snapshot"],
            "generated_at": descriptor["generated_at"],
            "heritage_descriptor_sha256": descriptor_sha256,
            "heritage_release_root_sha256": faithful["release_root_sha256"],
            "tiny_release_root_sha256": corpora["tiny"]["release_root_sha256"],
            "synthetic_release_root_sha256": corpora["synthetic"][
                "release_root_sha256"
            ],
            "explorer_tree_sha256": current_app["tree_sha256"],
            "explorer_manifest_sha256": current_app["manifest_sha256"],
            **site,
        },
        "publication_shell_rebind": {
            "status": "passed",
            "change_class": "full-candidate-rebuild",
            "reused_unchanged_roots": [],
            "rerun_gates": [
                "faithful/tiny/synthetic corpus material and release-root validation",
                "faithful/tiny/synthetic deterministic tree identity",
                "100-question functionality evaluation",
                "faithful/tiny/synthetic local browser journeys",
                "Explorer build-manifest identity",
                "Exact heritage producer material identity",
                "Site inventory, capacity and tree identity",
            ],
            "reused_gates": [],
            "rationale": (
                "This receipt was materialised from a full current candidate: no "
                "corpus, Explorer, Site or browser-evidence identity was carried "
                "forward from the previous receipt."
            ),
        },
        "determinism": {
            "status": "passed",
            "builds": faithful["builds"],
            "files_per_build": faithful["files_per_build"],
            "differences": faithful["differences"],
            "comparison_tree_algorithm": COMPARISON_TREE_ALGORITHM,
            "comparison_tree_sha256": faithful["comparison_tree_sha256"],
            "corpora": {
                name: {
                    "builds": value["builds"],
                    "files_per_build": value["files_per_build"],
                    "differences": value["differences"],
                    "comparison_tree_sha256": value["comparison_tree_sha256"],
                }
                for name, value in corpora.items()
            },
        },
        "question_suite": question_section,
        "local_journeys": journey_section,
        "terminal_publication_gate": {
            "status": "pending",
            "journey_id": "journey-publication",
            "rich_page_identity_check": "pending-terminal-real-browser-check",
            "claim": "No public URL is verified by this local receipt.",
        },
    }
    return receipt, question_gzip, journey_gzip


def atomic_write(path: Path, raw: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    try:
        temporary.write_bytes(raw)
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def materialize(
    *,
    question_results: Path,
    journey_results: Path,
    site_candidate_receipt: Path,
    fixture_root: Path,
    output: Path,
    observed_at: str,
) -> dict[str, Any]:
    question_result, question_raw = load_json_bytes(
        question_results, "question-suite result"
    )
    journey_result, journey_raw = load_json_bytes(
        journey_results, "local-journey result"
    )
    site_candidate, _ = load_json_bytes(
        site_candidate_receipt, "Site candidate receipt"
    )
    receipt, question_gzip, journey_gzip = build_receipt(
        question_result=question_result,
        question_raw=question_raw,
        journey_result=journey_result,
        journey_raw=journey_raw,
        site_candidate=site_candidate,
        observed_at=observed_at,
    )
    receipt_raw = (
        json.dumps(receipt, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    ).encode("utf-8")
    question_target = fixture_root / QUESTION_RESULT_RELATIVE
    journey_target = fixture_root / JOURNEY_RESULT_RELATIVE
    resolved_targets = {
        question_target.resolve(),
        journey_target.resolve(),
        output.resolve(),
    }
    if len(resolved_targets) != 3:
        raise RuntimeError("receipt and result output paths must be distinct")
    atomic_write(question_target, question_gzip)
    atomic_write(journey_target, journey_gzip)
    atomic_write(output, receipt_raw)
    return receipt


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--question-results", required=True, type=Path)
    parser.add_argument("--journey-results", required=True, type=Path)
    parser.add_argument("--site-candidate-receipt", required=True, type=Path)
    parser.add_argument("--observed-at", required=True)
    parser.add_argument("--fixture-root", type=Path, default=DEFAULT_FIXTURE_ROOT)
    parser.add_argument(
        "--output",
        type=Path,
        help=(
            "receipt path (defaults to "
            "FIXTURE_ROOT/evidence/local-candidate-receipt.json)"
        ),
    )
    args = parser.parse_args(argv)
    fixture_root = args.fixture_root.resolve()
    output = (
        args.output.resolve()
        if args.output is not None
        else fixture_root / RECEIPT_RELATIVE
    )
    receipt = materialize(
        question_results=args.question_results.resolve(),
        journey_results=args.journey_results.resolve(),
        site_candidate_receipt=args.site_candidate_receipt.resolve(),
        fixture_root=fixture_root,
        output=output,
        observed_at=args.observed_at,
    )
    print(
        f"materialised local candidate receipt: {output} "
        f"questions={receipt['question_suite']['questions_run']} "
        f"journeys={receipt['local_journeys']['journeys_run']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
