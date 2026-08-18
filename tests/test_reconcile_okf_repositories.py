from __future__ import annotations

import copy
import gzip
import hashlib
import importlib.util
import io
import json
import shutil
import sys
import tempfile
import unittest
from collections.abc import Callable
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path
from unittest.mock import patch

from jsonschema import Draft202012Validator, FormatChecker


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "reconcile_okf_repositories.py"
SPEC = importlib.util.spec_from_file_location("reconcile_okf_repositories", SCRIPT)
assert SPEC and SPEC.loader
reconcile = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = reconcile
SPEC.loader.exec_module(reconcile)


RICH_RUNTIME_PATH = "large/data/relationship-runtime/manifest.json"
RICH_CHUNK_PATH = (
    "large/data/relationship-runtime/planes/core/relationships-000.json.gz"
)
RICH_LOCATOR_PATH = "large/data/relationship-runtime/route-locator/manifest.json"


def _fixture_json_bytes(value: object) -> bytes:
    return (
        json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        + "\n"
    ).encode("utf-8")


def _fixture_write_json(path: Path, value: object) -> bytes:
    path.parent.mkdir(parents=True, exist_ok=True)
    data = _fixture_json_bytes(value)
    path.write_bytes(data)
    return data


def _fixture_write_gzip_json(path: Path, value: object) -> bytes:
    path.parent.mkdir(parents=True, exist_ok=True)
    data = gzip.compress(_fixture_json_bytes(value), mtime=0)
    path.write_bytes(data)
    return data


def _fixture_digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _bind_runtime(repo: Path, runtime: dict[str, object]) -> None:
    runtime_data = _fixture_write_json(repo / RICH_RUNTIME_PATH, runtime)
    reference = {
        "path": RICH_RUNTIME_PATH,
        "sha256": _fixture_digest(runtime_data),
        "bytes": len(runtime_data),
    }
    descriptor_path = repo / "okf-explorer.json"
    descriptor = json.loads(descriptor_path.read_text(encoding="utf-8"))
    descriptor["entrypoints"]["relationship_runtime"] = reference
    descriptor["entrypoint_integrity"]["relationship_runtime"] = reference
    _fixture_write_json(descriptor_path, descriptor)
    manifest_path = repo / "large/data/manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["indexes"]["relationship_runtime"] = reference
    _fixture_write_json(manifest_path, manifest)


def _bind_locator(
    repo: Path,
    locator: dict[str, object],
    runtime: dict[str, object],
) -> None:
    locator_data = _fixture_write_json(repo / RICH_LOCATOR_PATH, locator)
    runtime["route_locator"]["sha256"] = _fixture_digest(locator_data)  # type: ignore[index]
    _bind_runtime(repo, runtime)


def _rewrite_fixture_chunk(
    repo: Path,
    runtime: dict[str, object],
    mutate: Callable[[dict[str, object]], None],
) -> None:
    chunk_path = repo / RICH_CHUNK_PATH
    rows = json.loads(gzip.decompress(chunk_path.read_bytes()))
    mutate(rows[0])
    chunk_data = _fixture_write_gzip_json(chunk_path, rows)
    chunk = runtime["planes"][0]["chunks"][0]  # type: ignore[index]
    chunk.update(bytes=len(chunk_data), sha256=_fixture_digest(chunk_data))
    _bind_runtime(repo, runtime)


def _write_rich_runtime_fixture(
    repo: Path,
    *,
    contract_repository_name: str | None = None,
) -> None:
    repo.mkdir()
    (repo / "index.md").write_text(
        '---\nokf_version: "0.2"\n---\n\n# UK living fixture\n',
        encoding="utf-8",
    )
    _fixture_write_json(
        repo / "schemas/semantic-assertion.schema.json",
        {
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "$id": "https://example.test/schema/semantic-assertion.json",
            "type": "object",
        },
    )
    for name, (discriminator, required) in (
        reconcile.RICH_RUNTIME_SCHEMA_CONTRACTS.items()
    ):
        _fixture_write_json(
            repo / "schemas" / name,
            {
                "$schema": "https://json-schema.org/draft/2020-12/schema",
                "$id": f"https://example.test/schema/{name}",
                "type": "object",
                "required": list(required),
                "properties": {
                    **{field: {} for field in required},
                    "schema": {"const": discriminator},
                },
            },
        )
    _fixture_write_json(
        repo / "generated/semantic/life-course-corpus.jsonld",
        {"@context": {}, "@graph": []},
    )

    snapshot = "fixture-2026-08-12"
    assertion_id = "urn:okf:assertion:one"
    route = "dataset/work-one"
    row = {
        "schema": "okf-relationship-runtime-row.v1",
        "id": assertion_id,
        "assertion_id": assertion_id,
        "source": route,
        "target": route,
        "source_route": route,
        "target_route": route,
        "source_iri": "https://example.test/id/work-one",
        "target_iri": "https://example.test/id/work-one",
        "predicate": "https://example.test/vocabulary/related",
        "predicate_iri": "https://example.test/vocabulary/related",
        "kind": "related",
        "label": "is related to",
        "inverse_label": "is related from",
        "direction": "source-to-target",
        "assertion_status": "normalized",
        "assertion_scope": "real-world",
        "authority": {
            "class": "derived",
            "label": "Fixture derivation",
            "source": "https://example.test/source",
        },
        "derivation": "urn:okf:derivation:fixture",
        "observed_at": "2026-08-12T00:00:00Z",
        "evidence": [
            {
                "@id": "urn:okf:evidence:fixture",
                "type": "SourceRecord",
                "url": "https://example.test/source",
                "source_field": "fixture",
                "source_value_sha256": "1" * 64,
                "retrieved_at": "2026-08-12T00:00:00Z",
            }
        ],
        "rights": {
            "source": "https://example.test/rights",
            "assertion": "Fixture rights statement",
        },
        "plane": "urn:okf:plane:core",
        "lifecycle": "active",
        "active": True,
    }
    chunk_data = _fixture_write_gzip_json(repo / RICH_CHUNK_PATH, [row])
    chunk = {
        "id": "urn:okf:chunk:core-000",
        "path": RICH_CHUNK_PATH,
        "media_type": "application/json",
        "content_encoding": "gzip",
        "bytes": len(chunk_data),
        "sha256": _fixture_digest(chunk_data),
        "count": 1,
        "records": 1,
    }

    prefix = _fixture_digest(route.encode("utf-8"))[:2]
    bucket_path = (
        f"large/data/relationship-runtime/route-locator/bucket-{prefix}.json.gz"
    )
    assertion_digest = reconcile._rich_runtime_assertion_digest([assertion_id])
    bucket = {
        "schema": reconcile.RICH_RUNTIME_LOCATOR_BUCKET_SCHEMA,
        "hash_algorithm": reconcile.RICH_RUNTIME_LOCATOR_ALGORITHM,
        "bucket": prefix,
        "generated_at": "2026-08-12T00:00:00Z",
        "routes": [
            {
                "route": route,
                "chunks": [RICH_CHUNK_PATH],
                "planes": [
                    {
                        "name": "core",
                        "chunks": [RICH_CHUNK_PATH],
                        "assertions": 1,
                        "assertion_ids_sha256": assertion_digest,
                    }
                ],
            }
        ],
        "counts": {"routes": 1, "chunk_references": 1},
    }
    bucket_data = _fixture_write_gzip_json(repo / bucket_path, bucket)
    locator = {
        "schema": reconcile.RICH_RUNTIME_LOCATOR_SCHEMA,
        "hash_algorithm": reconcile.RICH_RUNTIME_LOCATOR_ALGORITHM,
        "generated_at": "2026-08-12T00:00:00Z",
        "bucket_path_template": (
            "large/data/relationship-runtime/route-locator/bucket-{prefix}.json.gz"
        ),
        "buckets": [
            {
                "bucket": prefix,
                "path": bucket_path,
                "content_encoding": "gzip",
                "bytes": len(bucket_data),
                "sha256": _fixture_digest(bucket_data),
                "routes": 1,
                "chunk_references": 1,
            }
        ],
        "counts": {"routes": 1, "buckets": 1, "chunk_references": 1},
    }
    locator_data = _fixture_write_json(repo / RICH_LOCATOR_PATH, locator)
    runtime = {
        "schema": reconcile.RICH_RUNTIME_SCHEMA,
        "@id": "urn:okf:runtime:uk-living",
        "snapshot": snapshot,
        "generated_at": "2026-08-12T00:00:00Z",
        "semantic_manifest": "generated/semantic/life-course-corpus.jsonld",
        "assertion_contract": "schemas/semantic-assertion.schema.json",
        "row_contract": "schemas/relationship-runtime-row.schema.json",
        "default_planes": ["core"],
        "planes": [
            {
                "name": "core",
                "id": "urn:okf:plane:core",
                "active": True,
                "lifecycle": "active",
                "authority_classes": ["derived"],
                "assertions": 1,
                "chunks": [chunk],
            }
        ],
        "totals": {
            "active_assertions": 1,
            "historical_assertions": 0,
            "rejected_assertions": 0,
            "all_assertions": 1,
            "chunks": 1,
        },
        "loading_policy": "bounded-route-hydration",
        "route_locator": {
            "id": "urn:okf:route-locator:uk-living",
            "path": RICH_LOCATOR_PATH,
            "routes": 1,
            "buckets": 1,
            "sha256": _fixture_digest(locator_data),
        },
    }
    _fixture_write_json(
        repo / "okf-explorer.json",
        {
            "okf_version": "0.2",
            "snapshot": snapshot,
            "entrypoints": {"data_manifest": "large/data/manifest.json"},
            "entrypoint_integrity": {},
        },
    )
    _fixture_write_json(
        repo / "large/data/manifest.json",
        {"snapshot": snapshot, "indexes": {}},
    )
    _bind_runtime(repo, runtime)

    preset = reconcile.PRESETS["okf-uk-living"]
    contract = reconcile.contract_for(
        contract_repository_name or repo.name,
        preset,
    )
    contract["semantic_layer"]["profile"] = "https://example.test/profile/"
    contract["semantic_layer"]["authoritative_inputs"] = ["index.md"]
    retained_roles = {
        "explorer-runtime",
        "relationship-runtime-manifest",
        "relationship-runtime",
        "relationship-route-locator",
        "relationship-runtime-schema",
        "relationship-schema",
    }
    contract["semantic_layer"]["outputs"] = [
        declaration
        for declaration in contract["semantic_layer"]["outputs"]
        if declaration["role"] in retained_roles
    ]
    contract["relationship_contract"]["schema"] = (
        "https://example.test/schema/semantic-assertion.json"
    )
    _fixture_write_json(repo / "okf.semantic.json", contract)


class ReconcileOkfRepositoriesTests(unittest.TestCase):
    def test_uk_living_preset_requires_the_reader_rich_runtime_surfaces(self) -> None:
        preset = reconcile.PRESETS["okf-uk-living"]

        self.assertTrue(preset.requires_rich_relationship_runtime)
        rich_outputs = {
            (declaration[0], declaration[1])
            for declaration in preset.outputs
            if declaration[1].startswith("relationship-")
        }
        self.assertTrue(
            {
                (RICH_RUNTIME_PATH, "relationship-runtime-manifest"),
                (
                    "large/data/relationship-runtime/planes/*/relationships-*.json.gz",
                    "relationship-runtime",
                ),
                (RICH_LOCATOR_PATH, "relationship-route-locator"),
                (
                    "large/data/relationship-runtime/route-locator/bucket-*.json.gz",
                    "relationship-route-locator",
                ),
                (
                    "schemas/relationship-runtime-row.schema.json",
                    "relationship-runtime-schema",
                ),
            }.issubset(rich_outputs)
        )
        self.assertEqual(
            [],
            reconcile.contract_errors(
                reconcile.contract_for("okf-uk-living", preset)
            ),
        )

    def test_uk_living_rich_runtime_passes_the_bounded_deep_audit(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            repo = Path(directory) / "okf-uk-living"
            _write_rich_runtime_fixture(repo)

            result = reconcile.audit_repo(repo, strict=True)

            self.assertEqual("conformant", result["status"], result)
            self.assertEqual([], result["errors"])
            self.assertEqual([], result["warnings"])

    def test_uk_living_runtime_schemas_are_executable_contracts(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            repo = Path(directory) / "okf-uk-living"
            _write_rich_runtime_fixture(repo)
            schema_path = repo / "schemas/relationship-runtime-row.schema.json"
            schema = json.loads(schema_path.read_text(encoding="utf-8"))
            schema["required"].remove("predicate_iri")
            _fixture_write_json(schema_path, schema)

            result = reconcile.audit_repo(repo, strict=True)

            self.assertTrue(
                any(
                    "omits required Reader fields" in error
                    for error in result["errors"]
                ),
                result["errors"],
            )

    def test_uk_living_cannot_self_downgrade_the_reviewed_runtime(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            repo = Path(directory) / "okf-uk-living"
            _write_rich_runtime_fixture(repo)
            contract_path = repo / "okf.semantic.json"
            contract = json.loads(contract_path.read_text(encoding="utf-8"))
            contract["semantic_layer"]["outputs"] = [
                declaration
                for declaration in contract["semantic_layer"]["outputs"]
                if declaration["role"]
                not in {
                    "relationship-runtime-manifest",
                    "relationship-runtime",
                    "relationship-route-locator",
                    "relationship-runtime-schema",
                }
            ]
            _fixture_write_json(contract_path, contract)
            descriptor_path = repo / "okf-explorer.json"
            descriptor = json.loads(descriptor_path.read_text(encoding="utf-8"))
            descriptor["entrypoints"].pop("relationship_runtime")
            descriptor["entrypoint_integrity"].pop("relationship_runtime")
            _fixture_write_json(descriptor_path, descriptor)

            result = reconcile.audit_repo(repo, strict=True)

            self.assertEqual("non-conformant", result["status"])
            self.assertTrue(
                any(
                    "reviewed preset requires rich relationship runtime output"
                    in error
                    for error in result["errors"]
                ),
                result["errors"],
            )

            contract_path = repo / "okf.semantic.json"
            contract = json.loads(contract_path.read_text(encoding="utf-8"))
            contract["repository"]["name"] = "self-downgraded-producer"
            _fixture_write_json(contract_path, contract)
            renamed = reconcile.audit_repo(
                repo,
                strict=True,
                reviewed_preset="okf-uk-living",
            )
            self.assertTrue(
                any(
                    "contradicts the explicit reviewed preset" in error
                    for error in renamed["errors"]
                ),
                renamed["errors"],
            )
            self.assertTrue(
                any(
                    "entrypoints.relationship_runtime" in error
                    for error in renamed["errors"]
                ),
                renamed["errors"],
            )
            self.assertTrue(
                any(
                    "entrypoints.relationship_runtime" in error
                    for error in result["errors"]
                ),
                result["errors"],
            )

    def test_uk_living_rejects_control_plane_and_digest_mutations(self) -> None:
        mutations = (
            (
                "empty defaults",
                lambda runtime: runtime.update({"default_planes": []}),
                "default_planes must be a non-empty array",
            ),
            (
                "lifecycle contradiction",
                lambda runtime: runtime["planes"][0].update(
                    {"lifecycle": "historical"}
                ),
                "lifecycle conflicts with its active flag",
            ),
            (
                "chunk compression declaration",
                lambda runtime: runtime["planes"][0]["chunks"][0].update(
                    {"content_encoding": "identity"}
                ),
                "must advertise gzip-compressed JSON",
            ),
            (
                "locator digest",
                lambda runtime: runtime["route_locator"].update(
                    {"sha256": "0" * 64}
                ),
                "route-locator bytes differ from the runtime SHA-256",
            ),
        )
        for label, mutate, expected in mutations:
            with self.subTest(label=label), tempfile.TemporaryDirectory() as directory:
                repo = Path(directory) / "okf-uk-living"
                _write_rich_runtime_fixture(repo)
                runtime = json.loads(
                    (repo / RICH_RUNTIME_PATH).read_text(encoding="utf-8")
                )
                mutate(runtime)
                _bind_runtime(repo, runtime)

                result = reconcile.audit_repo(repo, strict=True)

                self.assertEqual("non-conformant", result["status"])
                self.assertTrue(
                    any(expected in error for error in result["errors"]),
                    result["errors"],
                )

        with tempfile.TemporaryDirectory() as directory:
            repo = Path(directory) / "okf-uk-living"
            _write_rich_runtime_fixture(repo)
            runtime = json.loads(
                (repo / RICH_RUNTIME_PATH).read_text(encoding="utf-8")
            )
            locator = json.loads(
                (repo / RICH_LOCATOR_PATH).read_text(encoding="utf-8")
            )
            bucket_path = repo / locator["buckets"][0]["path"]
            bucket = json.loads(gzip.decompress(bucket_path.read_bytes()))
            bucket["routes"][0]["planes"][0]["assertion_ids_sha256"] = "0" * 64
            bucket_data = _fixture_write_gzip_json(bucket_path, bucket)
            locator["buckets"][0].update(
                {"bytes": len(bucket_data), "sha256": _fixture_digest(bucket_data)}
            )
            _bind_locator(repo, locator, runtime)

            result = reconcile.audit_repo(repo, strict=True)

            self.assertEqual("non-conformant", result["status"])
            self.assertTrue(
                any(
                    "count or assertion-ID digest does not reconcile" in error
                    for error in result["errors"]
                ),
                result["errors"],
            )

    def test_uk_living_rich_rows_match_the_reader_contract(self) -> None:
        mutations = (
            (
                "schema discriminator",
                lambda row: row.update({"schema": "legacy-row.v1"}),
                "fails its declared runtime schema at schema",
            ),
            (
                "strict route",
                lambda row: row.update({"source": "Dataset/work-one"}),
                "must be a safe local runtime route",
            ),
            (
                "predicate alias",
                lambda row: row.update(
                    {"predicate_iri": "https://example.test/vocabulary/other"}
                ),
                "predicate aliases differ",
            ),
            (
                "direction",
                lambda row: row.update({"direction": "undirected"}),
                "direction or plane binding differs",
            ),
            (
                "status",
                lambda row: row.update({"assertion_status": "normalised"}),
                "assertion status is outside the governed contract",
            ),
            (
                "scope",
                lambda row: row.update({"assertion_scope": "metadata"}),
                "assertion scope is outside the governed contract",
            ),
            (
                "authority label",
                lambda row: row["authority"].update({"label": ""}),
                "authority label must be a non-empty string",
            ),
            (
                "evidence ceiling",
                lambda row: row.update({"evidence": row["evidence"] * 17}),
                "16-item evidence ceiling",
            ),
            (
                "rights URL",
                lambda row: row["rights"].update({"source": "file:///rights"}),
                "rights source must be a canonical credential-free HTTP(S) URL",
            ),
            (
                "Reader hostname grammar",
                lambda row: row["rights"].update(
                    {"source": "https://bad_host.example/rights"}
                ),
                "rights source must be a canonical credential-free HTTP(S) URL",
            ),
            (
                "Reader port grammar",
                lambda row: row["rights"].update(
                    {"source": "https://example.test:00080/rights"}
                ),
                "rights source must be a canonical credential-free HTTP(S) URL",
            ),
            (
                "inference requirements",
                lambda row: row.update({"assertion_status": "inferred"}),
                "inference rule must be a non-empty string",
            ),
        )
        for label, mutate, expected in mutations:
            with self.subTest(label=label), tempfile.TemporaryDirectory() as directory:
                repo = Path(directory) / "okf-uk-living"
                _write_rich_runtime_fixture(repo)
                runtime = json.loads(
                    (repo / RICH_RUNTIME_PATH).read_text(encoding="utf-8")
                )
                _rewrite_fixture_chunk(repo, runtime, mutate)

                result = reconcile.audit_repo(repo, strict=True)

                self.assertEqual("non-conformant", result["status"])
                self.assertTrue(
                    any(expected in error for error in result["errors"]),
                    result["errors"],
                )

    def test_uk_living_rejects_duplicate_chunk_ids_and_row_text_overflow(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            repo = Path(directory) / "okf-uk-living"
            _write_rich_runtime_fixture(repo)
            runtime = json.loads(
                (repo / RICH_RUNTIME_PATH).read_text(encoding="utf-8")
            )
            duplicate = copy.deepcopy(runtime["planes"][0]["chunks"][0])
            duplicate_path = (
                "large/data/relationship-runtime/planes/core/relationships-001.json.gz"
            )
            duplicate["path"] = duplicate_path
            (repo / duplicate_path).write_bytes((repo / RICH_CHUNK_PATH).read_bytes())
            runtime["planes"][0]["chunks"].append(duplicate)
            _bind_runtime(repo, runtime)

            result = reconcile.audit_repo(repo, strict=True)

            self.assertTrue(
                any("chunks have duplicate identities" in error for error in result["errors"]),
                result["errors"],
            )

        with tempfile.TemporaryDirectory() as directory:
            repo = Path(directory) / "okf-uk-living"
            _write_rich_runtime_fixture(repo)
            runtime = json.loads(
                (repo / RICH_RUNTIME_PATH).read_text(encoding="utf-8")
            )
            _rewrite_fixture_chunk(
                repo,
                runtime,
                lambda row: row.update({"label": "x" * 128}),
            )

            with patch.object(reconcile, "MAX_RICH_RUNTIME_ROW_TEXT_UNITS", 64):
                result = reconcile.audit_repo(repo, strict=True)

            self.assertTrue(
                any("retained-text ceiling" in error for error in result["errors"]),
                result["errors"],
            )

    def test_rich_runtime_numbers_fail_closed_on_unbounded_json_integers(self) -> None:
        huge = 10**10_000

        with self.assertRaisesRegex(
            reconcile.ArtifactReadError,
            "must be a finite number from 0 to 1",
        ):
            reconcile._rich_runtime_unit_number(huge, "fixture confidence")
        with self.assertRaisesRegex(
            reconcile.ArtifactReadError,
            "must be a finite number",
        ):
            reconcile._rich_runtime_finite_number(huge, "fixture strength")

    def test_rich_runtime_whole_plane_hydration_is_bounded(self) -> None:
        planes = ["official"]
        chunks = {"official": ["one", "two"]}
        rows = {"one": 1, "two": 1}

        with self.assertRaisesRegex(
            reconcile.ArtifactReadError,
            "whole-plane hydration.*compressed limit",
        ):
            reconcile._validate_rich_runtime_whole_hydration(
                planes,
                chunks,
                rows,
                {"one": 40 * 1024 * 1024, "two": 40 * 1024 * 1024},
                {"one": 1, "two": 1},
            )
        with self.assertRaisesRegex(
            reconcile.ArtifactReadError,
            "whole-plane hydration.*retained-text limit",
        ):
            reconcile._validate_rich_runtime_whole_hydration(
                planes,
                chunks,
                rows,
                {"one": 1, "two": 1},
                {"one": 20 * 1024 * 1024, "two": 20 * 1024 * 1024},
            )

    def test_rich_runtime_json_rejects_browser_invalid_numbers(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "numbers.json"
            for payload in (
                b'{"strength":NaN}',
                b'{"strength":' + b"9" * 10_000 + b"}",
            ):
                with self.subTest(prefix=payload[:24]):
                    path.write_bytes(payload)
                    with self.assertRaisesRegex(
                        reconcile.ArtifactReadError,
                        "invalid fixture numbers",
                    ):
                        reconcile._rich_runtime_json(path, "fixture numbers")

    def test_rich_runtime_gzip_decode_is_bounded_after_commitment_checks(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "bomb.json.gz"
            data = gzip.compress(json.dumps({"pad": "x" * 4096}).encode(), mtime=0)
            path.write_bytes(data)

            with self.assertRaisesRegex(
                reconcile.ArtifactReadError,
                "decoded document exceeds the 64-byte audit limit",
            ):
                reconcile._rich_runtime_json(
                    path,
                    "fixture gzip",
                    expected_bytes=len(data),
                    expected_hash=_fixture_digest(data),
                    decoded_limit=64,
                )

            path.write_bytes(b"not gzip")
            with self.assertRaisesRegex(
                reconcile.ArtifactReadError,
                "compressed bytes differ from its commitment",
            ):
                reconcile._rich_runtime_json(
                    path,
                    "fixture gzip",
                    expected_bytes=8,
                    expected_hash="0" * 64,
                    decoded_limit=64,
                )

    def test_uk_living_entrypoint_integrity_bytes_must_agree(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            repo = Path(directory) / "okf-uk-living"
            _write_rich_runtime_fixture(repo)
            descriptor_path = repo / "okf-explorer.json"
            descriptor = json.loads(descriptor_path.read_text(encoding="utf-8"))
            descriptor["entrypoints"]["relationship_runtime"]["bytes"] += 1
            _fixture_write_json(descriptor_path, descriptor)

            result = reconcile.audit_repo(repo, strict=True)

            self.assertTrue(
                any(
                    "entrypoint and integrity byte counts differ" in error
                    for error in result["errors"]
                ),
                result["errors"],
            )

    def test_contract_identity_gates_renamed_worktrees_and_rejects_conflicts(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            repo = Path(directory) / "renamed-worktree"
            _write_rich_runtime_fixture(
                repo,
                contract_repository_name="okf-uk-living",
            )
            descriptor_path = repo / "okf-explorer.json"
            descriptor = json.loads(descriptor_path.read_text(encoding="utf-8"))
            descriptor["entrypoints"].pop("relationship_runtime")
            descriptor["entrypoint_integrity"].pop("relationship_runtime")
            _fixture_write_json(descriptor_path, descriptor)

            unbound = reconcile.audit_repo(repo, strict=True)

            self.assertTrue(
                any(
                    "rerun with --preset okf-uk-living" in error
                    for error in unbound["errors"]
                ),
                unbound["errors"],
            )

            result = reconcile.audit_repo(
                repo,
                strict=True,
                reviewed_preset="okf-uk-living",
            )

            self.assertTrue(
                any(
                    "entrypoints.relationship_runtime" in error
                    for error in result["errors"]
                ),
                result["errors"],
            )

        with tempfile.TemporaryDirectory() as directory:
            repo = Path(directory) / "okf-uk-living"
            _write_rich_runtime_fixture(repo)
            contract_path = repo / "okf.semantic.json"
            contract = json.loads(contract_path.read_text(encoding="utf-8"))
            contract["repository"]["name"] = "okf-testing"
            _fixture_write_json(contract_path, contract)

            result = reconcile.audit_repo(repo, strict=True)

            self.assertTrue(
                any(
                    "contradicts the reviewed repository directory identity" in error
                    for error in result["errors"]
                ),
                result["errors"],
            )

    def test_compressed_json_ld_is_a_supported_semantic_output(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "assertions-0.jsonld.gz"
            with gzip.open(path, "wt", encoding="utf-8") as handle:
                json.dump({"@context": {}, "@graph": []}, handle)

            self.assertEqual("", reconcile.validate_semantic_document(path))

    def test_artifact_reader_enforces_on_disk_and_decoded_byte_limits(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "assertions-0.jsonld.gz"
            with gzip.open(path, "wb") as handle:
                handle.write(json.dumps({"@context": {}, "@graph": [], "pad": "x" * 256}).encode())

            with patch.object(
                reconcile,
                "MAX_AUDIT_FILE_BYTES",
                path.stat().st_size - 1,
            ):
                self.assertIn("audit limit", reconcile.validate_semantic_document(path))

            with (
                patch.object(reconcile, "MAX_AUDIT_FILE_BYTES", 1024),
                patch.object(reconcile, "MAX_AUDIT_DECODED_BYTES", 64),
            ):
                self.assertIn(
                    "decoded document exceeds",
                    reconcile.validate_semantic_document(path),
                )

    def test_malformed_or_unreadable_json_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            repo = Path(directory) / "fixture"
            repo.mkdir()
            (repo / "index.md").write_text(
                '---\nokf_version: "0.2"\n---\n\n# Fixture\n',
                encoding="utf-8",
            )
            contract = reconcile.contract_for(
                "okf-testing",
                reconcile.PRESETS["okf-testing"],
            )
            contract["repository"]["name"] = repo.name
            contract["repository"]["root_index"] = "index.md"
            contract["semantic_layer"]["authoritative_inputs"] = ["index.md"]
            contract["semantic_layer"]["outputs"] = [
                {
                    "path": "runtime.json",
                    "role": "relationship-runtime",
                    "generated": True,
                },
                {
                    "path": "semantic.jsonld",
                    "role": "semantic-json-ld",
                    "generated": True,
                },
            ]
            (repo / "okf.semantic.json").write_text(
                json.dumps(contract),
                encoding="utf-8",
            )
            (repo / "runtime.json").write_text("{broken", encoding="utf-8")
            (repo / "semantic.jsonld").write_text(
                '{"@context": {}, "@graph": []}\n',
                encoding="utf-8",
            )

            result = reconcile.audit_repo(repo)

            self.assertEqual("non-conformant", result["status"])
            self.assertTrue(
                any("invalid relationship runtime" in error for error in result["errors"]),
                result["errors"],
            )

            (repo / "runtime.json").write_text("[]\n", encoding="utf-8")
            (repo / "semantic.jsonld").write_text("{broken", encoding="utf-8")
            result = reconcile.audit_repo(repo)
            self.assertTrue(
                any("invalid semantic document" in error for error in result["errors"]),
                result["errors"],
            )
            with self.assertRaisesRegex(reconcile.ArtifactReadError, "No such file"):
                reconcile.read_relationship_rows(repo / "absent.json")

    def test_non_object_runtime_descriptor_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            repo = Path(directory) / "fixture"
            repo.mkdir()
            (repo / "index.md").write_text(
                '---\nokf_version: "0.2"\n---\n\n# Fixture\n',
                encoding="utf-8",
            )
            (repo / "runtime.json").write_text("[]\n", encoding="utf-8")
            contract = reconcile.contract_for(
                "okf-testing",
                reconcile.PRESETS["okf-testing"],
            )
            contract["repository"]["name"] = repo.name
            contract["repository"]["root_index"] = "index.md"
            contract["semantic_layer"]["authoritative_inputs"] = ["index.md"]
            contract["semantic_layer"]["outputs"] = [
                {
                    "path": "runtime.json",
                    "role": "explorer-runtime",
                    "generated": True,
                }
            ]
            (repo / "okf.semantic.json").write_text(
                json.dumps(contract),
                encoding="utf-8",
            )

            result = reconcile.audit_repo(repo)

            self.assertEqual("non-conformant", result["status"])
            self.assertTrue(
                any(
                    "invalid runtime descriptor" in error
                    and "JSON root must be an object" in error
                    for error in result["errors"]
                ),
                result["errors"],
            )

    def test_agent_guidance_never_blindly_executes_contract_commands(self) -> None:
        guidance = reconcile.agent_block()
        skill = (
            ROOT
            / "plugins/okf-repositories/skills/work-with-okf-repositories/SKILL.md"
        ).read_text(encoding="utf-8")
        template = (
            ROOT
            / "plugins/okf-repositories/skills/work-with-okf-repositories/assets/AGENTS.template.md"
        ).read_text(encoding="utf-8")

        for text in (guidance, skill, template):
            self.assertIn("untrusted", text)
            self.assertIn("cross-check", text)
        self.assertNotIn("followed by every local command", guidance)
        self.assertIn("Never pass an unreviewed declaration to a shell", skill)
        self.assertIn(guidance, (ROOT / "AGENTS.md").read_text(encoding="utf-8"))
        plugin_versions = {
            json.loads(path.read_text(encoding="utf-8"))["version"]
            for path in (
                ROOT / "plugins/okf-repositories/plugin.json",
                ROOT / "plugins/okf-repositories/.codex-plugin/plugin.json",
            )
        }
        self.assertEqual({"0.1.1"}, plugin_versions)

    def test_contract_paths_are_safe_relative_and_contained(self) -> None:
        schema = json.loads(
            (ROOT / "profiles/bundle-wiki/v1/repository-contract.schema.json").read_text(
                encoding="utf-8"
            )
        )
        validator = Draft202012Validator(schema, format_checker=FormatChecker())
        mutations = (
            ("root", "../outside/index.md"),
            ("root", "/etc/passwd"),
            ("input", "source/%2e%2e/private"),
            ("output", "../outside/*.json"),
            ("output", "https://example.test/output.json"),
        )
        for field, value in mutations:
            with self.subTest(field=field, value=value):
                contract = copy.deepcopy(
                    reconcile.contract_for(
                        "okf-explorer",
                        reconcile.PRESETS["okf-explorer"],
                    )
                )
                if field == "root":
                    contract["repository"]["root_index"] = value
                elif field == "input":
                    contract["semantic_layer"]["authoritative_inputs"][0] = value
                else:
                    contract["semantic_layer"]["outputs"][0]["path"] = value
                self.assertTrue(reconcile.contract_errors(contract))
                self.assertTrue(list(validator.iter_errors(contract)))

        with tempfile.TemporaryDirectory() as directory:
            parent = Path(directory)
            repo = parent / "repo"
            outside = parent / "outside"
            repo.mkdir()
            outside.mkdir()
            (outside / "artifact.json").write_text("{}\n", encoding="utf-8")
            (repo / "linked").symlink_to(outside, target_is_directory=True)
            with self.assertRaisesRegex(ValueError, "escapes its root"):
                reconcile.matching_paths(repo, "linked/*.json")

            (repo / "index.md").write_text(
                '---\nokf_version: "0.2"\n---\n\n# Fixture\n',
                encoding="utf-8",
            )
            (repo / "runtime.json").write_text("[]\n", encoding="utf-8")
            contract = reconcile.contract_for(
                "okf-testing",
                reconcile.PRESETS["okf-testing"],
            )
            contract["repository"]["name"] = repo.name
            contract["repository"]["root_index"] = "index.md"
            contract["semantic_layer"]["authoritative_inputs"] = ["linked/"]
            contract["semantic_layer"]["outputs"] = [
                {
                    "path": "runtime.json",
                    "role": "relationship-runtime",
                    "generated": True,
                }
            ]
            (repo / "okf.semantic.json").write_text(
                json.dumps(contract),
                encoding="utf-8",
            )
            result = reconcile.audit_repo(repo)
            self.assertTrue(
                any(
                    "invalid declared authoritative input path" in error
                    and "escapes its root" in error
                    for error in result["errors"]
                ),
                result["errors"],
            )

    def test_contract_glob_expansion_has_a_match_ceiling(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            repo = Path(directory)
            for index in range(3):
                (repo / f"artifact-{index}.json").write_text("{}\n", encoding="utf-8")

            with patch.object(reconcile, "MAX_AUDIT_GLOB_MATCHES", 2):
                with self.assertRaisesRegex(ValueError, "2-match audit limit"):
                    reconcile.matching_paths(repo, "*.json")

    def test_shared_semantic_assertion_gate_rejects_legacy_camel_case(self) -> None:
        legacy = {
            "@id": "https://example.test/assertion/one",
            "@type": ["rdf:Statement", "okf:RelationshipAssertion"],
            "source": "https://example.test/source/one",
            "predicate": "https://example.test/predicate/related",
            "target": "https://example.test/target/one",
            "label": "related to",
            "inverseLabel": "related from",
            "assertionStatus": "source_native",
            "assertionScope": "snapshot-bounded-public-metadata",
            "authority": "official",
            "derivation": "https://example.test/process/one",
            "observedAt": "2026-08-09T00:00:00Z",
            "evidence": ["https://example.test/evidence/one"],
            "rights": "https://example.test/licence",
        }

        errors = reconcile.semantic_assertion_errors(legacy, "fixture")

        self.assertTrue(any("lacks shared semantic fields" in error for error in errors))

    def test_shared_semantic_assertion_gate_validates_optional_evidence_iris(self) -> None:
        assertion = {
            "@id": "urn:okf:assertion:one",
            "@type": ["rdf:Statement", "okf:RelationshipAssertion"],
            "source": "https://example.test/source/one",
            "predicate": "https://example.test/predicate/related",
            "target": "https://example.test/target/one",
            "kind": "related to",
            "label": "related to",
            "inverse_label": "related from",
            "assertion_status": "normalized",
            "assertion_scope": "real-world",
            "authority": {
                "class": "derived",
                "label": "Normalized source metadata",
                "source": "https://example.test/source/",
            },
            "derivation": "urn:okf:rule:projection",
            "observed_at": "2026-08-09T00:00:00Z",
            "evidence": [{
                "@id": "urn:okf:evidence:one",
                "type": "source-record",
                "url": "https://example.test/source/one",
                "source_field": "title",
                "source_value_sha256": "a" * 64,
                "retrieved_at": "2026-08-09T00:00:00Z",
                "normalization": "repository-authored governed relationship",
            }],
            "rights": {
                "source": "https://example.test/licence",
                "assertion": "Example source terms apply.",
            },
        }

        errors = reconcile.semantic_assertion_errors(assertion, "fixture")

        self.assertTrue(any("normalization is not an absolute semantic IRI" in error for error in errors))

    def test_shared_semantic_assertion_iri_whitespace_matches_reader_rule(self) -> None:
        schema = json.loads(
            (ROOT / "profiles/bundle-wiki/v1/semantic-assertion.schema.json").read_text(
                encoding="utf-8"
            )
        )
        validator = Draft202012Validator(schema, format_checker=FormatChecker())
        assertion = {
            "@id": "urn:okf:assertion:one",
            "@type": ["rdf:Statement", "okf:RelationshipAssertion"],
            "source": "https://example.test/source/one",
            "predicate": "https://example.test/predicate/related",
            "target": "https://example.test/target/one",
            "kind": "related-to",
            "label": "related to",
            "inverse_label": "related from",
            "assertion_status": "normalized",
            "assertion_scope": "real-world",
            "authority": {
                "class": "derived",
                "label": "Normalized source metadata",
                "source": "https://example.test/source/",
            },
            "derivation": "urn:okf:rule:projection",
            "observed_at": "2026-08-09T00:00:00Z",
            "evidence": [{
                "@id": "urn:okf:evidence:one",
                "type": "source-record",
                "url": "https://example.test/source/one",
                "source_field": "title",
                "source_value_sha256": "a" * 64,
                "retrieved_at": "2026-08-09T00:00:00Z",
            }],
            "rights": {
                "source": "https://example.test/licence",
                "assertion": "Example source terms apply.",
            },
        }
        self.assertEqual([], reconcile.semantic_assertion_errors(assertion, "fixture"))
        self.assertEqual([], list(validator.iter_errors(assertion)))

        for value in ("urn:bad value", "urn:bad\tvalue", "urn:bad\nvalue"):
            with self.subTest(value=value):
                malformed = copy.deepcopy(assertion)
                malformed["source"] = value
                self.assertTrue(
                    any(
                        "source is not an absolute semantic IRI" in error
                        for error in reconcile.semantic_assertion_errors(
                            malformed,
                            "fixture",
                        )
                    )
                )
                self.assertTrue(list(validator.iter_errors(malformed)))

    def test_shared_semantic_assertion_gate_rejects_raw_query_and_credentials(self) -> None:
        self.assertEqual(
            "",
            reconcile.safe_http_url(
                'https://catalogue.data.gov.uk/api/3/action/package_search?q=rows:100 "api"'
            ),
        )
        self.assertEqual("", reconcile.safe_http_url("https://user:secret@example.test/source"))
        self.assertEqual("", reconcile.safe_http_url("https:///missing-host"))
        self.assertEqual("", reconcile.safe_http_url("https://?q=missing-host"))
        self.assertEqual("", reconcile.safe_http_url("https://example.test:0/source"))
        self.assertEqual("", reconcile.safe_http_url("https://example.test:65536/source"))
        self.assertEqual(
            "https://example.test:65535/source",
            reconcile.safe_http_url("https://example.test:65535/source"),
        )
        self.assertEqual(
            "https://catalogue.data.gov.uk/api/3/action/package_search?q=rows%3A100%20%22api%22",
            reconcile.safe_http_url(
                "https://catalogue.data.gov.uk/api/3/action/package_search?q=rows%3A100%20%22api%22"
            ),
        )

    def test_large_graph_contract_roles_are_governed(self) -> None:
        contract = reconcile.contract_for(
            "okf-uk-government-apis",
            reconcile.PRESETS["okf-uk-government-apis"],
        )
        outputs = contract["semantic_layer"]["outputs"]
        outputs.extend(
            [
                {"path": "data/semantic/manifest.json", "role": "semantic-manifest", "generated": True},
                {"path": "data/semantic/*.jsonld.gz", "role": "semantic-json-ld-shards", "generated": True},
                {"path": "context.jsonld", "role": "semantic-context", "generated": True},
                {"path": "assertion.schema.json", "role": "relationship-schema", "generated": True},
            ]
        )

        self.assertEqual([], reconcile.contract_errors(contract))
        outputs[-1]["role"] = "invented-output-role"
        self.assertTrue(
            any(
                error.endswith("role is not governed: invented-output-role")
                for error in reconcile.contract_errors(contract)
            )
        )

        contract = reconcile.contract_for(
            "okf-uk-government-apis",
            reconcile.PRESETS["okf-uk-government-apis"],
        )
        contract["semantic_layer"]["state"] = "invented-state"
        contract["relationship_contract"]["authoring"] = "invented-authoring"
        contract["relationship_contract"]["direct_triple_policy"] = "invented-policy"
        contract["reader"]["delivery"] = "invented-delivery"
        errors = reconcile.contract_errors(contract)
        self.assertTrue(any("semantic_layer.state is not governed" in error for error in errors))
        self.assertTrue(any("relationship_contract.authoring is not governed" in error for error in errors))
        self.assertTrue(any("direct_triple_policy is not governed" in error for error in errors))
        self.assertTrue(any("reader.delivery is not governed" in error for error in errors))

    def test_every_reviewed_repository_has_a_valid_contract_preset(self) -> None:
        self.assertEqual(
            {
                "okf-LandRegistry",
                "okf-ai-infrastructure",
                "okf-els-api",
                "okf-explorer",
                "okf-govuk-content",
                "okf-ons",
                "okf-planning",
                "okf-testing",
                "okf-uk-government-apis",
                "okf-uk-legislation",
                "okf-uk-living",
            },
            set(reconcile.PRESETS),
        )
        schema = json.loads(
            (ROOT / "profiles/bundle-wiki/v1/repository-contract.schema.json").read_text(
                encoding="utf-8"
            )
        )
        validator = Draft202012Validator(schema, format_checker=FormatChecker())
        for name, preset in reconcile.PRESETS.items():
            contract = reconcile.contract_for(name, preset)
            self.assertEqual([], reconcile.contract_errors(contract), name)
            for source in reconcile.PROFILE_SOURCE_INPUTS:
                self.assertIn(
                    source,
                    contract["semantic_layer"]["authoritative_inputs"],
                    name,
                )
            self.assertEqual(
                [],
                [error.message for error in validator.iter_errors(contract)],
                name,
            )

    def test_public_draft_migration_presets_match_reviewed_repositories(self) -> None:
        expected = {
            "okf-els-api": {
                "repository": {
                    "name": "okf-els-api",
                    "role": "governed-producer",
                    "root_index": "bundle/index.md",
                },
                "state": "descriptor-yaml-ld",
                "inputs": [
                    "source/",
                    "scripts/build_bundle.py",
                    "scripts/okf_v02.py",
                    *reconcile.PROFILE_SOURCE_INPUTS,
                ],
                "outputs": [
                    reconcile.output("bundle/okf-bundle.yamlld", "semantic-yaml-ld", True),
                    reconcile.output("bundle/okf-bundle.jsonld", "semantic-json-ld", True),
                    reconcile.output("bundle/context/okf-els-api.jsonld", "semantic-context", True),
                    reconcile.output("bundle/okf-explorer.json", "explorer-runtime", True),
                    reconcile.output("bundle/data/manifest.json", "relationship-runtime-manifest", True),
                    reconcile.output("bundle/data/relationships-0.json", "relationship-runtime", True),
                    reconcile.output("bundle/data/standards/term-validation.json", "semantic-validation", True),
                ],
                "build": ["python3 scripts/build_bundle.py"],
                "check": [
                    "python3 scripts/build_bundle.py --check",
                    "python3 scripts/check_okf.py",
                    "python3 -m unittest discover -s tests -v",
                ],
            },
            "okf-planning": {
                "repository": {
                    "name": "okf-planning",
                    "role": "large-corpus-producer",
                    "root_index": "bundle/index.md",
                },
                "state": "descriptor-yaml-ld",
                "inputs": [
                    "source/dataset.json",
                    "source/organisation.json",
                    "src/okf_planning/build.py",
                    "src/okf_planning/model.py",
                    "src/okf_planning/sources.py",
                    "scripts/build_bundle.py",
                    *reconcile.PROFILE_SOURCE_INPUTS,
                ],
                "outputs": [
                    reconcile.output("bundle/okf-bundle.yamlld", "semantic-yaml-ld", True),
                    reconcile.output("bundle/okf-bundle.jsonld", "semantic-json-ld", True),
                    reconcile.output("bundle/context/okf-planning.jsonld", "semantic-context", True),
                    reconcile.output("bundle/okf-explorer.json", "explorer-runtime", True),
                    reconcile.output("bundle/data/manifest.json", "relationship-runtime-manifest", True),
                    reconcile.output("bundle/data/relationships-*.json", "relationship-runtime", True),
                    reconcile.output("bundle/data/standards/evaluation.json", "semantic-validation", True),
                ],
                "setup": ["python -m pip install -e \".[test]\""],
                "build": ["python3 scripts/build_bundle.py"],
                "check": [
                    "python3 scripts/check_okf.py",
                    "pytest",
                    "git diff --exit-code",
                ],
            },
        }

        for name, values in expected.items():
            with self.subTest(repository=name):
                contract = reconcile.contract_for(name, reconcile.PRESETS[name])
                self.assertEqual(values["repository"], contract["repository"])
                self.assertEqual(values["state"], contract["semantic_layer"]["state"])
                self.assertEqual(
                    values["inputs"],
                    contract["semantic_layer"]["authoritative_inputs"],
                )
                self.assertEqual(
                    values["outputs"], contract["semantic_layer"]["outputs"]
                )
                self.assertEqual(
                    "runtime-assertion-migration",
                    contract["relationship_contract"]["authoring"],
                )
                self.assertEqual(
                    "migration-pending",
                    contract["relationship_contract"]["direct_triple_policy"],
                )
                self.assertEqual(
                    "json-large-corpus-chunks", contract["reader"]["delivery"]
                )
                self.assertEqual(values.get("setup"), contract["tooling"].get("setup"))
                self.assertEqual(values["build"], contract["tooling"]["build"])
                self.assertEqual(values["check"], contract["tooling"]["check"])

    def test_portable_contract_gate_rejects_schema_invalid_shapes(self) -> None:
        contract = reconcile.contract_for(
            "okf-explorer", reconcile.PRESETS["okf-explorer"]
        )
        contract["repository"]["name"] = ""
        contract["repository"]["role"] = "invented-role"
        contract["okf_core"]["status"] = "done"
        contract["okf_core"]["specification"] = "https://"
        contract["semantic_layer"]["profile"] = "relative/profile"
        contract["semantic_layer"]["outputs"][0]["path"] = ""
        contract["semantic_layer"]["outputs"][0]["generated"] = "yes"
        contract["relationship_contract"]["schema"] = "relative/schema"
        contract["reader"]["consumer"] = "relative/reader"
        contract["unexpected"] = True

        errors = reconcile.contract_errors(contract)

        for fragment in (
            "contract has unsupported property",
            "repository.name",
            "repository.role",
            "okf_core.status",
            "okf_core.specification",
            "semantic_layer.profile",
            "outputs[0].path",
            "outputs[0].generated",
            "relationship_contract.schema",
            "reader.consumer",
        ):
            self.assertTrue(any(fragment in error for error in errors), fragment)

    def test_audit_malformed_contract_sections_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            repo = Path(directory) / "fixture"
            repo.mkdir()
            malformed = reconcile.contract_for(
                "okf-testing", reconcile.PRESETS["okf-testing"]
            )
            malformed["repository"] = []
            malformed["semantic_layer"] = []
            malformed["relationship_contract"] = []
            (repo / "okf.semantic.json").write_text(
                json.dumps(malformed), encoding="utf-8"
            )

            result = reconcile.audit_repo(repo)

            self.assertEqual("non-conformant", result["status"])
            for section in (
                "repository must be an object",
                "semantic_layer must be an object",
                "relationship_contract must be an object",
            ):
                self.assertIn(section, result["errors"])

    def test_testing_contract_declares_the_executable_fixture_corpus(self) -> None:
        contract = reconcile.contract_for(
            "okf-testing", reconcile.PRESETS["okf-testing"]
        )

        self.assertEqual("fixtures", contract["reader"]["delivery"])
        self.assertEqual(
            "legacy-sparse-okf-0.2-is-reader-compatibility-only",
            contract["relationship_contract"]["compatibility_policy"],
        )
        self.assertEqual(
            ["source", "target", "source_iri", "target_iri"],
            contract["relationship_contract"]["runtime_projection_endpoints"],
        )
        outputs = {
            item["path"]: item for item in contract["semantic_layer"]["outputs"]
        }
        self.assertFalse(outputs["fixtures/semantic-directed-example.yamlld"]["generated"])
        self.assertFalse(outputs["fixtures/runtime-directed-example.json"]["generated"])
        self.assertFalse(outputs["schemas/semantic-assertion.schema.json"]["generated"])
        self.assertFalse(outputs["fixtures/expectations.json"]["generated"])
        self.assertTrue(outputs["reports/fixture-validation.json"]["generated"])

    def test_reference_vendor_lock_binds_all_sixteen_profile_files(self) -> None:
        reference = reconcile._reference_profile()
        files = reference.files
        lock_bytes = reference.lock_bytes

        self.assertEqual(16, len(files))
        self.assertEqual(16, len(reference.contents))
        self.assertEqual(
            sorted(item.path for item in files),
            [item.path for item in files],
        )
        self.assertEqual(
            reconcile.PROFILE_VENDOR_LOCK_SHA256,
            reconcile.sha256_bytes(lock_bytes),
        )
        lock = json.loads(lock_bytes)
        self.assertEqual(16, lock["file_count"])
        self.assertEqual("v0.6.0", lock["release"]["tag"])
        self.assertEqual(
            "d256a74419c2593c2bf2f3f5749c606fad5daf9d",
            lock["release"]["tag_object"],
        )
        self.assertEqual(
            "854d1853b71ec8bda3424924f0f0985fe24aa7bca4c180d15f359fe259ef4c7e",
            reconcile.profile_identity_sha256(files),
        )
        self.assertEqual([], reconcile.profile_mirror_errors(ROOT))
        audit = reconcile.audit_repo(ROOT)
        self.assertFalse(
            any(
                "neither the exact canonical profile mirror" in error
                for error in audit["errors"]
            ),
            audit["errors"],
        )

    def test_profile_sync_repairs_missing_and_requires_replace_for_drift_or_extra(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            repo = Path(directory) / "producer"
            repo.mkdir()

            reconcile.sync_profile(repo)
            self.assertEqual([], reconcile.profile_mirror_errors(repo))

            missing = repo / reconcile.PROFILE_MIRROR / "concept.schema.json"
            missing.unlink()
            self.assertTrue(
                any("missing a file" in error for error in reconcile.profile_mirror_errors(repo))
            )
            reconcile.sync_profile(repo)
            self.assertEqual([], reconcile.profile_mirror_errors(repo))

            drifted = repo / reconcile.PROFILE_MIRROR / "semantic-assertion.schema.json"
            drifted.write_bytes(drifted.read_bytes() + b" ")
            with self.assertRaisesRegex(ValueError, "--replace-profile"):
                reconcile.sync_profile(repo)
            reconcile.sync_profile(repo, replace=True)
            self.assertEqual([], reconcile.profile_mirror_errors(repo))

            extra = repo / reconcile.PROFILE_MIRROR / "local-extension.schema.json"
            extra.write_text('{}\n', encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "extra profiles/bundle-wiki/v1"):
                reconcile.sync_profile(repo)
            reconcile.sync_profile(repo, replace=True)
            self.assertFalse(extra.exists())
            self.assertEqual([], reconcile.profile_mirror_errors(repo))

            lock_path = repo / reconcile.PROFILE_VENDOR_LOCK
            lock_path.write_bytes(lock_path.read_bytes() + b" ")
            self.assertTrue(
                any("vendor lock differs" in error for error in reconcile.profile_mirror_errors(repo))
            )
            with self.assertRaisesRegex(ValueError, "divergent profiles/bundle-wiki/v1.vendor-lock.json"):
                reconcile.sync_profile(repo)
            reconcile.sync_profile(repo, replace=True)
            self.assertEqual([], reconcile.profile_mirror_errors(repo))

    def test_profile_sync_never_follows_an_outward_symlink(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            parent = Path(directory)
            repo = parent / "producer"
            outside = parent / "outside"
            (repo / "profiles" / "bundle-wiki").mkdir(parents=True)
            outside.mkdir()
            (repo / reconcile.PROFILE_MIRROR).symlink_to(
                outside, target_is_directory=True
            )

            with self.assertRaisesRegex(ValueError, "destination symlink"):
                reconcile.sync_profile(repo, replace=True)

            self.assertEqual([], list(outside.iterdir()))

    def test_dirty_reference_profile_causes_zero_target_changes(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            parent = Path(directory)
            reference = parent / "reference"
            target = parent / "target"
            (reference / reconcile.PROFILE_MIRROR.parent).mkdir(parents=True)
            shutil.copytree(
                ROOT / reconcile.PROFILE_MIRROR,
                reference / reconcile.PROFILE_MIRROR,
            )
            shutil.copy2(
                ROOT / reconcile.PROFILE_VENDOR_LOCK,
                reference / reconcile.PROFILE_VENDOR_LOCK,
            )
            target.mkdir()
            source_file = reference / reconcile.PROFILE_MIRROR / "index.md"
            source_file.write_bytes(source_file.read_bytes() + b"\n")

            with patch.object(reconcile, "ROOT", reference):
                with self.assertRaisesRegex(ValueError, "reference file drifted"):
                    reconcile.sync_profile(target, replace=True)

            self.assertEqual([], list(target.rglob("*")))

            source_file.write_bytes(
                (ROOT / reconcile.PROFILE_MIRROR / "index.md").read_bytes()
            )
            second_target = parent / "second-target"
            second_target.mkdir()
            original_loader = reconcile._reference_profile
            snapshots: list[reconcile.ProfileReference] = []

            def load_then_mutate() -> reconcile.ProfileReference:
                snapshot = original_loader()
                snapshots.append(snapshot)
                source_file.write_bytes(source_file.read_bytes() + b"\n")
                return snapshot

            with (
                patch.object(reconcile, "ROOT", reference),
                patch.object(
                    reconcile,
                    "_reference_profile",
                    side_effect=load_then_mutate,
                ),
            ):
                reconcile.sync_profile(second_target)

            self.assertEqual(1, len(snapshots))
            self.assertEqual(
                snapshots[0].content_by_path()["index.md"],
                (second_target / reconcile.PROFILE_MIRROR / "index.md").read_bytes(),
            )
            self.assertEqual(
                [],
                reconcile.profile_mirror_errors(
                    second_target,
                    reference=snapshots[0],
                ),
            )

    def test_custom_schema_id_is_exempt_but_cannot_satisfy_canonical_contract(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            repo = Path(directory) / "fixture"
            repo.mkdir()
            (repo / "index.md").write_text(
                '---\nokf_version: "0.2"\n---\n\n# Fixture\n',
                encoding="utf-8",
            )
            schema_path = repo / "custom.schema.json"
            schema_path.write_text(
                json.dumps(
                    {
                        "$schema": "https://json-schema.org/draft/2020-12/schema",
                        "$id": "https://example.test/profile/custom/assertion.schema.json",
                        "type": "object",
                    },
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )
            self.assertEqual([], reconcile.relationship_schema_errors(schema_path))

            contract = reconcile.contract_for(
                "okf-testing", reconcile.PRESETS["okf-testing"]
            )
            contract["repository"]["name"] = repo.name
            contract["repository"]["root_index"] = "index.md"
            contract["semantic_layer"]["profile"] = (
                "https://example.test/profile/custom/"
            )
            contract["semantic_layer"]["authoritative_inputs"] = ["index.md"]
            contract["semantic_layer"]["outputs"] = [
                {
                    "path": schema_path.name,
                    "role": "relationship-schema",
                    "generated": False,
                    "required": True,
                }
            ]
            (repo / "okf.semantic.json").write_text(
                json.dumps(contract), encoding="utf-8"
            )

            contract["relationship_contract"]["schema"] = (
                "https://example.test/profile/custom/assertion.schema.json"
            )
            contract["semantic_layer"]["profile"] = reconcile.PROFILE_URL
            (repo / "okf.semantic.json").write_text(
                json.dumps(contract), encoding="utf-8"
            )
            missing_mirror = reconcile.audit_repo(repo)
            self.assertTrue(
                any(
                    "missing canonical profile mirror directory" in error
                    for error in missing_mirror["errors"]
                ),
                missing_mirror["errors"],
            )

            contract["semantic_layer"]["profile"] = (
                "https://example.test/profile/custom/"
            )
            contract["relationship_contract"]["schema"] = reconcile.ASSERTION_SCHEMA_URL
            (repo / "okf.semantic.json").write_text(
                json.dumps(contract), encoding="utf-8"
            )

            canonical_claim = reconcile.audit_repo(repo)
            self.assertEqual("non-conformant", canonical_claim["status"])
            self.assertTrue(
                any(
                    "no exact declared relationship-schema output" in error
                    for error in canonical_claim["errors"]
                ),
                canonical_claim["errors"],
            )

            contract["relationship_contract"]["schema"] = (
                "https://example.test/profile/custom/other.schema.json"
            )
            (repo / "okf.semantic.json").write_text(
                json.dumps(contract), encoding="utf-8"
            )
            mismatched_claim = reconcile.audit_repo(repo)
            self.assertEqual("non-conformant", mismatched_claim["status"])
            self.assertTrue(
                any(
                    "no exact declared relationship-schema output" in error
                    for error in mismatched_claim["errors"]
                ),
                mismatched_claim["errors"],
            )

            contract["relationship_contract"]["schema"] = (
                "https://example.test/profile/custom/assertion.schema.json"
            )
            (repo / "okf.semantic.json").write_text(
                json.dumps(contract), encoding="utf-8"
            )
            custom_claim = reconcile.audit_repo(repo)
            self.assertEqual("conformant", custom_claim["status"], custom_claim)

    def test_every_relationship_schema_output_is_checked_after_the_third(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            repo = Path(directory) / "fixture"
            repo.mkdir()
            (repo / "index.md").write_text(
                '---\nokf_version: "0.2"\n---\n\n# Fixture\n',
                encoding="utf-8",
            )
            canonical = (
                ROOT
                / reconcile.PROFILE_MIRROR
                / "semantic-assertion.schema.json"
            ).read_bytes()
            outputs = []
            for index in range(4):
                path = repo / f"assertion-{index}.schema.json"
                path.write_bytes(canonical + (b" " if index == 3 else b""))
                outputs.append(
                    {
                        "path": path.name,
                        "role": "relationship-schema",
                        "generated": True,
                        "required": True,
                    }
                )
            contract = reconcile.contract_for(
                "okf-testing", reconcile.PRESETS["okf-testing"]
            )
            contract["repository"]["name"] = repo.name
            contract["repository"]["root_index"] = "index.md"
            contract["semantic_layer"]["profile"] = (
                "https://example.test/profile/custom/"
            )
            contract["semantic_layer"]["authoritative_inputs"] = ["index.md"]
            contract["semantic_layer"]["outputs"] = outputs
            (repo / "okf.semantic.json").write_text(
                json.dumps(contract), encoding="utf-8"
            )

            result = reconcile.audit_repo(repo)

            self.assertEqual(4, result["relationship_schemas_checked"])
            self.assertTrue(
                any(
                    "assertion-3.schema.json claims canonical $id" in error
                    for error in result["errors"]
                ),
                result["errors"],
            )

    def test_duplicate_custom_schema_id_requires_identical_bytes(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            repo = Path(directory) / "fixture"
            repo.mkdir()
            (repo / "index.md").write_text(
                '---\nokf_version: "0.2"\n---\n\n# Fixture\n',
                encoding="utf-8",
            )
            schema_id = "https://example.test/profile/assertion.schema.json"
            first = repo / "first.schema.json"
            second = repo / "second.schema.json"
            first_schema = {
                "$schema": "https://json-schema.org/draft/2020-12/schema",
                "$id": schema_id,
                "type": "object",
            }
            second_schema = {**first_schema, "required": ["@id"]}
            first.write_text(json.dumps(first_schema), encoding="utf-8")
            second.write_text(json.dumps(second_schema), encoding="utf-8")

            contract = reconcile.contract_for(
                "okf-testing", reconcile.PRESETS["okf-testing"]
            )
            contract["repository"]["name"] = repo.name
            contract["repository"]["root_index"] = "index.md"
            contract["semantic_layer"]["profile"] = (
                "https://example.test/profile/"
            )
            contract["semantic_layer"]["authoritative_inputs"] = ["index.md"]
            contract["semantic_layer"]["outputs"] = [
                {
                    "path": path.name,
                    "role": "relationship-schema",
                    "generated": False,
                    "required": True,
                }
                for path in (first, second)
            ]
            contract["relationship_contract"]["schema"] = schema_id
            (repo / "okf.semantic.json").write_text(
                json.dumps(contract), encoding="utf-8"
            )

            ambiguous = reconcile.audit_repo(repo, strict=True)
            self.assertEqual("non-conformant", ambiguous["status"])
            self.assertTrue(
                any("one ambiguous $id" in error for error in ambiguous["errors"]),
                ambiguous["errors"],
            )

            second.write_bytes(first.read_bytes())
            identical = reconcile.audit_repo(repo, strict=True)
            self.assertEqual("conformant", identical["status"], identical)

    def test_install_refuses_to_invent_a_missing_repository(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            repo = Path(directory) / "okf-testing"
            with self.assertRaisesRegex(ValueError, "repository does not exist"):
                reconcile.install(repo)

            first = Path(directory) / "okf-explorer"
            unknown = Path(directory) / "unknown"
            first.mkdir()
            unknown.mkdir()
            stderr = io.StringIO()
            with (
                patch.object(
                    reconcile,
                    "selected_repositories",
                    return_value=iter((first, unknown)),
                ),
                redirect_stderr(stderr),
            ):
                self.assertEqual(2, reconcile.main(["--install"]))
            self.assertIn("reconciliation failed:", stderr.getvalue())
            self.assertNotIn("Traceback", stderr.getvalue())
            self.assertFalse((first / reconcile.CONTRACT_NAME).exists())
            self.assertFalse((first / "AGENTS.md").exists())

            reference = Path(directory) / "reference"
            (reference / reconcile.PROFILE_MIRROR.parent).mkdir(parents=True)
            shutil.copytree(
                ROOT / reconcile.PROFILE_MIRROR,
                reference / reconcile.PROFILE_MIRROR,
            )
            shutil.copy2(
                ROOT / reconcile.PROFILE_VENDOR_LOCK,
                reference / reconcile.PROFILE_VENDOR_LOCK,
            )
            source_file = reference / reconcile.PROFILE_MIRROR / "index.md"
            source_file.write_bytes(source_file.read_bytes() + b"\n")
            target = Path(directory) / "okf-ai-infrastructure"
            target.mkdir()
            stderr = io.StringIO()
            with patch.object(reconcile, "ROOT", reference), redirect_stderr(stderr):
                self.assertEqual(
                    2,
                    reconcile.main(
                        [
                            "--repo",
                            str(target),
                            "--install",
                            "--sync-profile",
                        ]
                    ),
                )
            self.assertIn("reconciliation failed:", stderr.getvalue())
            self.assertNotIn("Traceback", stderr.getvalue())
            self.assertFalse((target / reconcile.CONTRACT_NAME).exists())
            self.assertFalse((target / "AGENTS.md").exists())
            self.assertFalse((target / reconcile.PROFILE_MIRROR).exists())

    def test_install_preflights_non_regular_destinations_across_repositories(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            first = Path(directory) / "okf-explorer"
            second = Path(directory) / "okf-ai-infrastructure"
            first.mkdir()
            second.mkdir()
            (second / "AGENTS.md").mkdir()
            stderr = io.StringIO()

            with (
                patch.object(
                    reconcile,
                    "selected_repositories",
                    return_value=iter((first, second)),
                ),
                redirect_stderr(stderr),
            ):
                self.assertEqual(2, reconcile.main(["--install"]))

            self.assertIn("install destination is not a regular file", stderr.getvalue())
            self.assertNotIn("Traceback", stderr.getvalue())
            self.assertFalse((first / reconcile.CONTRACT_NAME).exists())
            self.assertFalse((first / "AGENTS.md").exists())

    def test_report_destination_is_preflighted_before_repository_mutation(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            repo = Path(directory) / "okf-explorer"
            repo.mkdir()
            stderr = io.StringIO()

            with redirect_stderr(stderr):
                self.assertEqual(
                    2,
                    reconcile.main(
                        [
                            "--repo",
                            str(repo),
                            "--install",
                            "--report",
                            str(repo / reconcile.CONTRACT_NAME),
                        ]
                    ),
                )

            self.assertIn(
                "report destination must be outside every audited repository",
                stderr.getvalue(),
            )
            self.assertNotIn("Traceback", stderr.getvalue())
            self.assertFalse((repo / reconcile.CONTRACT_NAME).exists())
            self.assertFalse((repo / "AGENTS.md").exists())

            report = Path(directory) / "reconciliation.json"
            with redirect_stdout(io.StringIO()):
                self.assertEqual(
                    1,
                    reconcile.main(
                        ["--repo", str(repo), "--report", str(report)]
                    ),
                )
            self.assertEqual(
                "okf-repository-reconciliation-report.v1",
                json.loads(report.read_text(encoding="utf-8"))["schema"],
            )

    def test_strict_mode_promotes_relationship_migration_gaps(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            repo = Path(directory) / "okf-LandRegistry"
            (repo / "bundle" / "data" / "explorer").mkdir(parents=True)
            (repo / "bundle" / "index.md").write_text(
                '---\nokf_version: "0.2"\n---\n\n# Fixture\n', encoding="utf-8"
            )
            (repo / "source").mkdir()
            (repo / "profiles").mkdir()
            (repo / "schemas").mkdir()
            (repo / "scripts").mkdir()
            (repo / "bundle" / "data" / "semantic").mkdir()
            schema_bytes = (
                ROOT
                / "profiles"
                / "bundle-wiki"
                / "v1"
                / "semantic-assertion.schema.json"
            ).read_bytes()
            (repo / "schemas" / "semantic-assertion.schema.json").write_bytes(
                schema_bytes
            )
            (
                repo
                / "bundle"
                / "data"
                / "semantic"
                / "semantic-assertion.schema.json"
            ).write_bytes(schema_bytes)
            (repo / "bundle" / "data" / "semantic" / "validation.json").write_text(
                '{"result":"fixture"}\n', encoding="utf-8"
            )
            (repo / "bundle" / "okf-bundle.jsonld").write_text(
                '{"@context": {}, "@graph": []}\n', encoding="utf-8"
            )
            (repo / "bundle" / "okf-bundle.yamlld").write_text(
                "'@context': {}\n'@graph': []\n", encoding="utf-8"
            )
            (repo / "bundle" / "okf-explorer.json").write_text(
                '{"okf_version": "0.2"}\n', encoding="utf-8"
            )
            (repo / "bundle" / "data" / "explorer" / "relationships-000.json").write_text(
                '[{"source":"https://example.test/a","target":"b","predicate":"related_to"}]\n', encoding="utf-8"
            )
            contract = reconcile.contract_for(repo.name, reconcile.PRESETS[repo.name])
            contract["semantic_layer"]["profile"] = (
                "https://example.test/profile/bundle-wiki/v1/"
            )
            (repo / "okf.semantic.json").write_text(
                json.dumps(contract),
                encoding="utf-8",
            )

            relaxed = reconcile.audit_repo(repo)
            strict = reconcile.audit_repo(repo, strict=True)
            self.assertEqual("migration", relaxed["status"])
            self.assertTrue(any("not an absolute IRI" in warning for warning in relaxed["warnings"]))
            self.assertTrue(
                any("not a safe local runtime identity" in warning for warning in relaxed["warnings"])
            )
            self.assertEqual("non-conformant", strict["status"])


if __name__ == "__main__":
    unittest.main()
