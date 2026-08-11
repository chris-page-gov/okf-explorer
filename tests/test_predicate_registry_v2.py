from __future__ import annotations

import copy
import hashlib
import json
import sys
import unittest
from pathlib import Path
from typing import Any, Callable
from unittest.mock import patch

from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import okf_semantic  # noqa: E402


PREDICATE_A = "https://example.test/vocabulary/relationships#a"
PREDICATE_B = "https://example.test/vocabulary/relationships#b"
PREDICATE_C = "https://example.test/vocabulary/relationships#c"
V1_PROFILE_IDENTITY = (
    "854d1853b71ec8bda3424924f0f0985fe24aa7bca4c180d15f359fe259ef4c7e"
)
V1_VENDOR_LOCK_SHA256 = (
    "979af714974abb093ac9d4b1b7e289597c61d33c24bb6959d9914c2f74dc6a09"
)


def capability(iri: str, *, status: str = "active") -> dict[str, object]:
    item: dict[str, object] = {
        "iri": iri,
        "preferred_label": f"relates by {iri.rsplit('#', 1)[-1]}",
        "inverse_label": f"is related by {iri.rsplit('#', 1)[-1]}",
        "description": "A governed predicate-capability fixture.",
        "domain": ["https://example.test/vocabulary/relationships#Thing"],
        "range": ["https://example.test/vocabulary/relationships#Thing"],
        "super_properties": [],
        "characteristics": [],
        "assertion_statuses": ["normalized"],
        "evidence_policy": {
            "minimum_fields": ["source_field", "source_value_sha256"]
        },
        "source_vocabulary": {
            "iri": "https://example.test/vocabulary/relationships",
            "version": "1",
        },
        "status": status,
    }
    if status == "deprecated":
        item["replaced_by"] = PREDICATE_C
    return item


def relationships(*predicates: str) -> list[dict[str, str]]:
    return [{"predicate": predicate} for predicate in predicates]


def reroot(registry: dict[str, object]) -> None:
    material = {
        key: value for key, value in registry.items() if key != "root_sha256"
    }
    registry["root_sha256"] = okf_semantic.sha256_hex(
        okf_semantic.canonical_json_bytes(material)
    )


class PredicateRegistryV2Test(unittest.TestCase):
    def setUp(self) -> None:
        self.registry = okf_semantic.build_predicate_registry_v2(
            [capability(PREDICATE_B), capability(PREDICATE_A)],
            relationships(PREDICATE_A, PREDICATE_A),
            snapshot="snapshot-2026-08-11",
            generated_at_value="2026-08-11T12:00:00Z",
        )

    def test_schema_is_valid_draft_2020_12_and_builder_derives_all_states(self) -> None:
        schema = okf_semantic.load_schema(
            okf_semantic.PREDICATE_REGISTRY_V2_SCHEMA
        )
        Draft202012Validator.check_schema(schema)

        self.assertEqual("okf-predicate-registry.v2", self.registry["schema"])
        self.assertEqual(
            okf_semantic.PREDICATE_REGISTRY_V2_PROFILE_URL,
            self.registry["profile"],
        )
        self.assertEqual(
            [PREDICATE_A, PREDICATE_B],
            [item["iri"] for item in self.registry["predicates"]],
        )
        self.assertEqual(
            {
                "state": "active-emitted",
                "assertions_emitted": 2,
            },
            self.registry["predicates"][0]["implementation"],
        )
        self.assertEqual(
            {
                "state": "authorised-zero-evidence",
                "assertions_emitted": 0,
            },
            self.registry["predicates"][1]["implementation"],
        )
        self.assertEqual(
            {
                "predicates": 2,
                "active_emitted": 1,
                "authorised_zero_evidence": 1,
                "assertions_emitted": 2,
            },
            self.registry["counts"],
        )
        self.assertEqual(
            [],
            okf_semantic.validate_predicate_registry_v2(
                self.registry,
                relationships=relationships(PREDICATE_A, PREDICATE_A),
            ),
        )
        self.assertEqual(
            [],
            okf_semantic.validate_predicate_registry(
                self.registry,
                relationships=relationships(PREDICATE_A, PREDICATE_A),
            ),
        )

    def test_root_binds_every_count_state_and_generation_field(self) -> None:
        mutations = {
            "snapshot": lambda value: value.__setitem__(
                "snapshot", "snapshot-2026-08-12"
            ),
            "generated_at": lambda value: value.__setitem__(
                "generated_at", "2026-08-12T12:00:00Z"
            ),
            "counts.predicates": lambda value: value["counts"].__setitem__(
                "predicates", 3
            ),
            "counts.active_emitted": lambda value: value["counts"].__setitem__(
                "active_emitted", 2
            ),
            "counts.authorised_zero_evidence": lambda value: value[
                "counts"
            ].__setitem__("authorised_zero_evidence", 2),
            "counts.assertions_emitted": lambda value: value[
                "counts"
            ].__setitem__("assertions_emitted", 3),
            "active state": lambda value: value["predicates"][0][
                "implementation"
            ].__setitem__("state", "authorised-zero-evidence"),
            "zero-evidence state": lambda value: value["predicates"][1][
                "implementation"
            ].__setitem__("state", "active-emitted"),
        }
        for label, mutate in mutations.items():
            with self.subTest(label=label):
                changed = copy.deepcopy(self.registry)
                mutate(changed)
                self.assertTrue(
                    any(
                        "root_sha256 does not bind" in error
                        for error in okf_semantic.validate_predicate_registry_v2(
                            changed
                        )
                    )
                )

        predicates_only = copy.deepcopy(self.registry)
        predicates_only["root_sha256"] = okf_semantic.sha256_hex(
            okf_semantic.canonical_json_bytes(predicates_only["predicates"])
        )
        self.assertTrue(
            any(
                "root_sha256 does not bind" in error
                for error in okf_semantic.validate_predicate_registry_v2(
                    predicates_only
                )
            )
        )

    def test_schema_and_loader_reject_every_structural_limit_at_max_plus_one(
        self,
    ) -> None:
        schema = okf_semantic.load_schema(
            okf_semantic.PREDICATE_REGISTRY_V2_SCHEMA
        )
        definitions = schema["$defs"]
        predicate_schema = definitions["predicate"]
        self.assertEqual(
            okf_semantic.PREDICATE_REGISTRY_V2_MAX_PREDICATES,
            schema["properties"]["predicates"]["maxItems"],
        )
        self.assertEqual(
            okf_semantic.PREDICATE_REGISTRY_V2_MAX_IRI_ARRAY_ITEMS,
            definitions["iriArray"]["maxItems"],
        )
        self.assertEqual(
            okf_semantic.PREDICATE_REGISTRY_V2_MAX_EVIDENCE_FIELDS,
            predicate_schema["properties"]["evidence_policy"]["properties"]
            ["minimum_fields"]["maxItems"],
        )
        self.assertEqual(
            okf_semantic.PREDICATE_REGISTRY_V2_MAX_STRING_LENGTH,
            definitions["nonEmptyString"]["maxLength"],
        )
        self.assertEqual(
            okf_semantic.PREDICATE_REGISTRY_V2_MAX_IRI_LENGTH,
            definitions["iri"]["maxLength"],
        )
        self.assertEqual(
            okf_semantic.PREDICATE_REGISTRY_V2_MAX_ASSERTIONS,
            definitions["implementation"]["properties"]["assertions_emitted"]
            ["maximum"],
        )
        self.assertEqual(
            4,
            predicate_schema["properties"]["assertion_statuses"]["maxItems"],
        )

        too_many_predicates = copy.deepcopy(self.registry)
        too_many_predicates["predicates"] = [
            copy.deepcopy(self.registry["predicates"][0])
            for _ in range(okf_semantic.PREDICATE_REGISTRY_V2_MAX_PREDICATES + 1)
        ]
        self.assertTrue(
            okf_semantic.schema_errors(
                too_many_predicates,
                okf_semantic.PREDICATE_REGISTRY_V2_SCHEMA,
            )
        )

        too_many_iris = copy.deepcopy(self.registry)
        too_many_iris["predicates"][0]["domain"] = [
            f"https://example.test/classes/{index}"
            for index in range(
                okf_semantic.PREDICATE_REGISTRY_V2_MAX_IRI_ARRAY_ITEMS + 1
            )
        ]
        self.assertTrue(
            okf_semantic.schema_errors(
                too_many_iris,
                okf_semantic.PREDICATE_REGISTRY_V2_SCHEMA,
            )
        )

        too_many_evidence_fields = copy.deepcopy(self.registry)
        too_many_evidence_fields["predicates"][0]["evidence_policy"][
            "minimum_fields"
        ] = [
            f"field_{index}"
            for index in range(
                okf_semantic.PREDICATE_REGISTRY_V2_MAX_EVIDENCE_FIELDS + 1
            )
        ]
        self.assertTrue(
            okf_semantic.schema_errors(
                too_many_evidence_fields,
                okf_semantic.PREDICATE_REGISTRY_V2_SCHEMA,
            )
        )

        string_too_long = copy.deepcopy(self.registry)
        string_too_long["predicates"][0]["description"] = "x" * (
            okf_semantic.PREDICATE_REGISTRY_V2_MAX_STRING_LENGTH + 1
        )
        iri_prefix = "https://example.test/"
        iri_too_long = copy.deepcopy(self.registry)
        iri_too_long["predicates"][0]["iri"] = iri_prefix + "x" * (
            okf_semantic.PREDICATE_REGISTRY_V2_MAX_IRI_LENGTH
            + 1
            - len(iri_prefix)
        )
        snapshot_too_long = copy.deepcopy(self.registry)
        snapshot_too_long["snapshot"] = "s" * 257
        generated_at_too_long = copy.deepcopy(self.registry)
        generated_at_too_long["generated_at"] = "2" * 65
        evidence_field_too_long = copy.deepcopy(self.registry)
        evidence_field_too_long["predicates"][0]["evidence_policy"][
            "minimum_fields"
        ][0] = "f" * 257
        assertions_too_large = copy.deepcopy(self.registry)
        assertions_too_large["predicates"][0]["implementation"][
            "assertions_emitted"
        ] = okf_semantic.PREDICATE_REGISTRY_V2_MAX_ASSERTIONS + 1
        assertions_too_large["counts"][
            "assertions_emitted"
        ] = okf_semantic.PREDICATE_REGISTRY_V2_MAX_ASSERTIONS + 1
        too_many_assertion_statuses = copy.deepcopy(self.registry)
        too_many_assertion_statuses["predicates"][0]["assertion_statuses"] = [
            "official",
            "normalized",
            "inferred",
            "model-derived",
            "unsupported-fifth-state",
        ]
        predicate_count_too_large = copy.deepcopy(self.registry)
        predicate_count_too_large["counts"][
            "predicates"
        ] = okf_semantic.PREDICATE_REGISTRY_V2_MAX_PREDICATES + 1
        active_count_too_large = copy.deepcopy(self.registry)
        active_count_too_large["counts"][
            "active_emitted"
        ] = okf_semantic.PREDICATE_REGISTRY_V2_MAX_PREDICATES + 1
        zero_count_too_large = copy.deepcopy(self.registry)
        zero_count_too_large["counts"][
            "authorised_zero_evidence"
        ] = okf_semantic.PREDICATE_REGISTRY_V2_MAX_PREDICATES + 1
        for label, changed in {
            "general string": string_too_long,
            "IRI": iri_too_long,
            "snapshot": snapshot_too_long,
            "generated_at": generated_at_too_long,
            "evidence field": evidence_field_too_long,
            "assertion count": assertions_too_large,
            "assertion statuses": too_many_assertion_statuses,
            "predicate aggregate": predicate_count_too_large,
            "active aggregate": active_count_too_large,
            "zero-evidence aggregate": zero_count_too_large,
        }.items():
            with self.subTest(label=label):
                self.assertTrue(
                    okf_semantic.schema_errors(
                        changed,
                        okf_semantic.PREDICATE_REGISTRY_V2_SCHEMA,
                    )
                )

        registry_bytes = okf_semantic.canonical_json_bytes(self.registry)
        with patch.object(
            okf_semantic,
            "PREDICATE_REGISTRY_V2_MAX_BYTES",
            len(registry_bytes) - 1,
        ):
            with self.assertRaisesRegex(
                okf_semantic.SemanticError,
                "byte safety ceiling",
            ):
                okf_semantic.load_predicate_registry_v2_bytes(registry_bytes)
            self.assertTrue(
                any(
                    "byte safety ceiling" in error
                    for error in okf_semantic.validate_predicate_registry_v2(
                        self.registry
                    )
                )
            )

    def test_bounded_loader_rejects_duplicate_keys_and_accepts_exact_registry(
        self,
    ) -> None:
        registry_bytes = okf_semantic.canonical_json_bytes(self.registry)
        self.assertEqual(
            self.registry,
            okf_semantic.load_predicate_registry_v2_bytes(
                registry_bytes,
                source="fixture-registry.json",
                relationships=relationships(PREDICATE_A, PREDICATE_A),
            ),
        )
        with self.assertRaisesRegex(
            okf_semantic.SemanticError,
            "duplicate key 'schema'",
        ):
            okf_semantic.load_predicate_registry_v2_bytes(
                b'{"schema":"first","schema":"second"}'
            )
        with self.assertRaisesRegex(
            okf_semantic.SemanticError,
            "must be UTF-8",
        ):
            okf_semantic.load_predicate_registry_v2_bytes(b"\xff")

    def test_validator_rejects_rehashed_count_tampering(self) -> None:
        for field in (
            "predicates",
            "active_emitted",
            "authorised_zero_evidence",
            "assertions_emitted",
        ):
            with self.subTest(field=field):
                changed = copy.deepcopy(self.registry)
                changed["counts"][field] += 1
                reroot(changed)
                self.assertTrue(
                    any(
                        f"counts.{field} differs" in error
                        for error in okf_semantic.validate_predicate_registry_v2(
                            changed
                        )
                    )
                )

    def test_schema_rejects_missing_or_inconsistent_implementation_state(self) -> None:
        cases: dict[str, Callable[[dict[str, Any]], object]] = {
            "missing implementation": lambda value: value["predicates"][0].pop(
                "implementation"
            ),
            "unknown state": lambda value: value["predicates"][0][
                "implementation"
            ].__setitem__("state", "planned"),
            "active with zero assertions": lambda value: value["predicates"][0][
                "implementation"
            ].__setitem__("assertions_emitted", 0),
            "zero-evidence with assertions": lambda value: value["predicates"][1][
                "implementation"
            ].__setitem__("assertions_emitted", 1),
        }
        for label, mutate in cases.items():
            with self.subTest(label=label):
                changed = copy.deepcopy(self.registry)
                mutate(changed)
                reroot(changed)
                self.assertTrue(
                    okf_semantic.schema_errors(
                        changed,
                        okf_semantic.PREDICATE_REGISTRY_V2_SCHEMA,
                    )
                )

        deprecated = copy.deepcopy(self.registry)
        deprecated["predicates"][0]["status"] = "deprecated"
        deprecated["predicates"][0]["replaced_by"] = PREDICATE_C
        reroot(deprecated)
        self.assertTrue(
            okf_semantic.schema_errors(
                deprecated,
                okf_semantic.PREDICATE_REGISTRY_V2_SCHEMA,
            )
        )

    def test_validator_rejects_duplicates_order_and_relationship_mismatches(self) -> None:
        duplicated = copy.deepcopy(self.registry)
        duplicated["predicates"].append(copy.deepcopy(duplicated["predicates"][0]))
        duplicated["counts"]["predicates"] += 1
        duplicated["counts"]["active_emitted"] += 1
        duplicated["counts"]["assertions_emitted"] += 2
        reroot(duplicated)
        self.assertTrue(
            any(
                "iri is duplicated" in error
                for error in okf_semantic.validate_predicate_registry_v2(
                    duplicated
                )
            )
        )

        out_of_order = copy.deepcopy(self.registry)
        out_of_order["predicates"].reverse()
        reroot(out_of_order)
        self.assertIn(
            "predicates must be sorted by canonical IRI",
            okf_semantic.validate_predicate_registry_v2(out_of_order),
        )

        missing_emission = okf_semantic.validate_predicate_registry_v2(
            self.registry,
            relationships=relationships(PREDICATE_A),
        )
        self.assertTrue(any("declares 2" in error for error in missing_emission))

        undeclared_emission = okf_semantic.validate_predicate_registry_v2(
            self.registry,
            relationships=relationships(PREDICATE_A, PREDICATE_A, PREDICATE_C),
        )
        self.assertTrue(
            any("not a declared capability" in error for error in undeclared_emission)
        )

        malformed_emission = okf_semantic.validate_predicate_registry_v2(
            self.registry,
            relationships=[{"predicate": PREDICATE_A}, {}],
        )
        self.assertIn(
            "relationships[1].predicate is required",
            malformed_emission,
        )

    def test_builder_rejects_incomplete_capability_or_emission_inputs(self) -> None:
        with self.assertRaisesRegex(
            okf_semantic.SemanticError,
            "absent from the authorised capability set",
        ):
            okf_semantic.build_predicate_registry_v2(
                [capability(PREDICATE_A)],
                relationships(PREDICATE_C),
                snapshot="snapshot",
                generated_at_value="2026-08-11T12:00:00Z",
            )

        with self.assertRaisesRegex(
            okf_semantic.SemanticError,
            r"relationships\[0\]\.predicate is required",
        ):
            okf_semantic.build_predicate_registry_v2(
                [capability(PREDICATE_A)],
                [{}],
                snapshot="snapshot",
                generated_at_value="2026-08-11T12:00:00Z",
            )

        with self.assertRaisesRegex(okf_semantic.SemanticError, "duplicated"):
            okf_semantic.build_predicate_registry_v2(
                [capability(PREDICATE_A), capability(PREDICATE_A)],
                [],
                snapshot="snapshot",
                generated_at_value="2026-08-11T12:00:00Z",
            )

        with self.assertRaisesRegex(okf_semantic.SemanticError, "deprecated"):
            okf_semantic.build_predicate_registry_v2(
                [capability(PREDICATE_A, status="deprecated")],
                relationships(PREDICATE_A),
                snapshot="snapshot",
                generated_at_value="2026-08-11T12:00:00Z",
            )

    def test_v1_build_and_validation_remain_unchanged(self) -> None:
        registry = okf_semantic.build_predicate_registry(
            [capability(PREDICATE_A)],
            snapshot="v1-snapshot",
            generated_at_value="2026-08-11T12:00:00Z",
        )
        self.assertEqual("okf-predicate-registry.v1", registry["schema"])
        self.assertNotIn("profile", registry)
        self.assertNotIn("implementation", registry["predicates"][0])
        self.assertEqual([], okf_semantic.validate_predicate_registry(registry))

        derived = okf_semantic.predicate_registry_from_relationships(
            [
                {
                    "predicate": PREDICATE_A,
                    "kind": "relates by a",
                    "inverse_label": "is related by a",
                    "assertion_status": "normalized",
                }
            ],
            snapshot="v1-snapshot",
            generated_at_value="2026-08-11T12:00:00Z",
        )
        self.assertEqual("okf-predicate-registry.v1", derived["schema"])
        self.assertEqual([], okf_semantic.validate_predicate_registry(derived))

    def test_v2_compiles_with_exact_emissions_and_uses_v1_external_reference(self) -> None:
        page = okf_semantic.parse_markdown(
            ROOT / "tests" / "fixtures" / "yaml_ld" / "semantic_concept.md"
        )
        registry = okf_semantic.build_iri_route_registry(
            {"semantic/example": page.metadata},
            snapshot="semantic-fixture-v2",
        )
        predicate_iri = (
            "https://example.test/vocabulary/heritage#hasDesignation"
        )
        predicate_registry = okf_semantic.build_predicate_registry_v2(
            [capability(predicate_iri)],
            relationships(predicate_iri),
            snapshot="semantic-fixture-v2",
            generated_at_value="2026-08-11T12:00:00Z",
        )

        compiled, errors = okf_semantic.compile_semantic_relationships(
            page.metadata,
            registry,
            predicate_registry=predicate_registry,
        )
        self.assertEqual([], errors)
        self.assertEqual(1, len(compiled))

        inconsistent_registry = okf_semantic.build_predicate_registry_v2(
            [capability(predicate_iri)],
            relationships(predicate_iri, predicate_iri),
            snapshot="semantic-fixture-v2",
            generated_at_value="2026-08-11T12:00:00Z",
        )
        _compiled, mismatch_errors = okf_semantic.compile_semantic_relationships(
            page.metadata,
            registry,
            predicate_registry=inconsistent_registry,
        )
        self.assertTrue(any("declares 2" in error for error in mismatch_errors))

        registry_bytes = okf_semantic.canonical_json_bytes(predicate_registry)
        extension = okf_semantic.semantic_model_extension(
            registry,
            {
                "path": "generated/predicate-registry.v2.json",
                "sha256": okf_semantic.sha256_hex(registry_bytes),
                "media_type": "application/json",
            },
        )
        self.assertEqual(
            [],
            okf_semantic.schema_errors(extension, "semantic-model.schema.json"),
        )

    def test_v2_profile_lock_is_complete_sorted_and_digest_bound(self) -> None:
        lock_path = ROOT / "profiles" / "predicate-registry" / "v2.lock.json"
        lock = json.loads(lock_path.read_text(encoding="utf-8"))
        self.assertEqual("okf-profile-extension-lock.v1", lock["schema"])
        self.assertEqual(
            okf_semantic.PREDICATE_REGISTRY_V2_PROFILE_URL,
            lock["profile"],
        )
        self.assertEqual(lock["file_count"], len(lock["files"]))
        self.assertEqual(
            ["index.md", "predicate-registry.schema.json"],
            [item["path"] for item in lock["files"]],
        )
        self.assertEqual("sha256", lock["identity"]["algorithm"])
        self.assertEqual(
            "profile-extension-lock-lines-v1: UTF-8 lines in lexical path "
            "order: <path> TAB <bytes> TAB <sha256> LF",
            lock["identity"]["canonicalisation"],
        )

        lines: list[str] = []
        profile_root = ROOT / "profiles" / "predicate-registry" / "v2"
        for item in lock["files"]:
            data = (profile_root / item["path"]).read_bytes()
            digest = hashlib.sha256(data).hexdigest()
            self.assertEqual(len(data), item["bytes"])
            self.assertEqual(digest, item["sha256"])
            lines.append(f"{item['path']}\t{len(data)}\t{digest}\n")
        self.assertEqual(
            hashlib.sha256("".join(lines).encode("utf-8")).hexdigest(),
            lock["identity"]["sha256"],
        )

        index_path = profile_root / "index.md"
        index = index_path.read_text(encoding="utf-8")
        self.assertIn("../../bundle-wiki/v1/index.md", index)
        self.assertIn("../v2.lock.json", index)
        self.assertIn(
            "https://chris-page-gov.github.io/okf-explorer/profile/"
            "predicate-registry/v2/predicate-registry.schema.json",
            index,
        )
        schema_path = profile_root / "predicate-registry.schema.json"
        schema = json.loads(schema_path.read_text(encoding="utf-8"))
        self.assertEqual(
            "https://chris-page-gov.github.io/okf-explorer/profile/"
            "predicate-registry/v2/predicate-registry.schema.json",
            schema["$id"],
        )
        self.assertTrue(
            (profile_root / "../../bundle-wiki/v1/index.md").resolve().is_file()
        )
        self.assertTrue((profile_root / "../v2.lock.json").resolve().is_file())
        self.assertTrue(schema_path.is_file())

    def test_frozen_bundle_wiki_v1_profile_identity_is_unchanged(self) -> None:
        lock_path = ROOT / "profiles" / "bundle-wiki" / "v1.vendor-lock.json"
        lock_bytes = lock_path.read_bytes()
        self.assertEqual(
            V1_VENDOR_LOCK_SHA256,
            hashlib.sha256(lock_bytes).hexdigest(),
        )
        lock = json.loads(lock_bytes)
        self.assertEqual(16, lock["file_count"])
        lines: list[str] = []
        profile_root = ROOT / "profiles" / "bundle-wiki" / "v1"
        for item in lock["files"]:
            data = (profile_root / item["path"]).read_bytes()
            digest = hashlib.sha256(data).hexdigest()
            self.assertEqual(len(data), item["bytes"])
            self.assertEqual(digest, item["sha256"])
            lines.append(f"{item['path']}\t{len(data)}\t{digest}\n")
        identity = hashlib.sha256("".join(lines).encode("utf-8")).hexdigest()
        self.assertEqual(V1_PROFILE_IDENTITY, identity)
        self.assertEqual(V1_PROFILE_IDENTITY, lock["identity"]["sha256"])


if __name__ == "__main__":
    unittest.main()
