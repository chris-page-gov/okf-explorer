from __future__ import annotations

import copy
import gzip
import importlib.util
import json
import sys
import tempfile
import unittest
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


class ReconcileOkfRepositoriesTests(unittest.TestCase):
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
                "okf-explorer",
                "okf-govuk-content",
                "okf-ons",
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
            self.assertEqual(
                [],
                [error.message for error in validator.iter_errors(contract)],
                name,
            )

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

    def test_install_refuses_to_invent_a_missing_repository(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            repo = Path(directory) / "okf-testing"
            with self.assertRaisesRegex(ValueError, "repository does not exist"):
                reconcile.install(repo)

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
            (repo / "okf.semantic.json").write_text(
                json.dumps(reconcile.contract_for(repo.name, reconcile.PRESETS[repo.name])),
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
