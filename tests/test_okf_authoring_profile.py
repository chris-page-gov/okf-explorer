from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker
from ruamel.yaml import YAML


ROOT = Path(__file__).resolve().parents[1]
PROFILE = ROOT / "profiles" / "authoring" / "v1"
DOCS = ROOT / "docs"
sys.path.insert(0, str(ROOT / "scripts"))

import check_domain_profile  # noqa: E402


class OkfAuthoringProfileTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.schema = json.loads((PROFILE / "domain-profile.schema.json").read_text())
        cls.validator = Draft202012Validator(
            cls.schema,
            format_checker=FormatChecker(),
        )
        cls.template = YAML(typ="safe").load(
            (PROFILE / "domain-profile.template.yaml").read_text()
        )

    def errors(self, value: object) -> list[str]:
        return [
            error.message
            for error in sorted(
                self.validator.iter_errors(value),
                key=lambda item: list(item.absolute_path),
            )
        ]

    def test_schema_and_template_identify_the_versioned_public_contract(self) -> None:
        self.assertEqual("okf-domain-profile.v1", self.template["schema"])
        self.assertEqual(
            "https://chris-page-gov.github.io/okf-explorer/profile/authoring/v1/domain-profile.schema.json",
            self.schema["$id"],
        )
        self.assertEqual(self.schema["$id"], self.template["$schema"])
        self.assertEqual([], self.errors(self.template))
        self.assertEqual([], check_domain_profile.reference_errors(self.template))
        self.assertTrue(self.template["collection_profile"]["document_families"])
        self.assertEqual("hypothesis", self.template["claims"][0]["claim_status"])
        self.assertIn("identifier_model", self.template["sources"][0])
        self.assertIn("semantic_conflicts", self.template["standards"][0])
        lifecycle = self.template["repository_lifecycle"]
        self.assertEqual("empty-new", lifecycle["classification"])
        self.assertEqual("disabled-pending-validation", lifecycle["ci_state"])
        self.assertIn("source/", lifecycle["source_paths"])
        self.assertIn("bundle/", lifecycle["generated_paths"])
        consumer_contract = self.template["consumer_contract"]
        self.assertEqual(
            ["CONSUMER-001"],
            consumer_contract["lock"]["consumer_ids"],
        )
        dependency_graph = consumer_contract["dependency_graph"]
        self.assertTrue(dependency_graph["edges"])
        connected_nodes = {
            edge[key]
            for edge in dependency_graph["edges"]
            for key in ("from_node", "to_node")
        }
        self.assertEqual(
            {node["id"] for node in dependency_graph["nodes"]},
            connected_nodes,
        )
        self.assertTrue(
            consumer_contract["fixture_protocol"]["consumer_stage"][
                "consumer_refs"
            ]
        )
        self.assertEqual(
            "@okf/explorer",
            consumer_contract["inventory"][0]["executable_identity"]["package"],
        )
        self.assertTrue(
            consumer_contract["compatibility"]["window_decision"][
                "supported_producer_contracts"
            ]
        )
        self.assertEqual(
            {
                "backward-new-producer-old-consumer",
                "forward-old-producer-new-consumer",
            },
            {
                case["direction"]
                for case in consumer_contract["compatibility"]["cases"]
            },
        )
        self.assertTrue(consumer_contract["post_deploy_deep_links"])
        deep_link = consumer_contract["post_deploy_deep_links"][0]
        self.assertEqual(60, deep_link["tool_first_budget_seconds"])
        self.assertEqual(
            "withhold-until-exact-url-browser-verified",
            deep_link["share_policy"],
        )

    def test_validator_dependency_nodes_require_concrete_repository_paths(self) -> None:
        invalid = json.loads(json.dumps(self.template))
        invalid["consumer_contract"]["dependency_graph"]["nodes"].append(
            {
                "id": "NODE-VALIDATOR",
                "kind": "validator",
                "label": "Repository tests",
                "location": "tests",
            }
        )
        invalid["consumer_contract"]["dependency_graph"]["edges"].append(
            {
                "id": "EDGE-VALIDATOR-CONSUMER",
                "from_node": "NODE-VALIDATOR",
                "to_node": "NODE-CONSUMER",
                "contract": "Concrete tests verify the consumer contract.",
                "change_impacts": ["Consumer changes rerun these tests."],
                "affected_plane_refs": ["PLANE-CONTROL"],
                "validation_refs": ["VAL-CONSUMER-001"],
            }
        )
        self.assertTrue(
            any("repository_paths" in message for message in self.errors(invalid))
        )
        invalid["consumer_contract"]["dependency_graph"]["nodes"][-1][
            "repository_paths"
        ] = ["tests/test_explorer_contract.py"]
        self.assertEqual([], self.errors(invalid))

    def test_semantic_validation_fails_for_an_absent_validator_path(self) -> None:
        value = json.loads(json.dumps(self.template))
        value["consumer_contract"]["dependency_graph"]["nodes"].append(
            {
                "id": "NODE-VALIDATOR",
                "kind": "validator",
                "label": "Explorer contract tests",
                "location": "tests/test_explorer_contract.py",
                "repository_paths": ["tests/test_explorer_contract.py"],
            }
        )
        value["consumer_contract"]["dependency_graph"]["edges"].append(
            {
                "id": "EDGE-VALIDATOR-CONSUMER",
                "from_node": "NODE-VALIDATOR",
                "to_node": "NODE-CONSUMER",
                "contract": "The named repository test validates the consumer.",
                "change_impacts": ["Consumer changes rerun the named test."],
                "affected_plane_refs": ["PLANE-CONTROL"],
                "validation_refs": ["VAL-CONSUMER-001"],
            }
        )
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.assertTrue(
                any(
                    "absent repository path" in error
                    for error in check_domain_profile.repository_path_errors(
                        value, root
                    )
                )
            )
            path = root / "tests" / "test_explorer_contract.py"
            path.parent.mkdir()
            path.write_text("# concrete test\n", encoding="utf-8")
            self.assertEqual(
                [],
                check_domain_profile.repository_path_errors(value, root),
            )

    def test_consumer_contract_is_additive_for_existing_v1_profiles(self) -> None:
        legacy = json.loads(json.dumps(self.template))
        del legacy["consumer_contract"]
        self.assertEqual([], self.errors(legacy))
        self.assertEqual([], check_domain_profile.reference_errors(legacy))

    def test_profile_rejects_an_unreviewed_applicability_vocabulary(self) -> None:
        invalid = json.loads(json.dumps(self.template))
        invalid["standards"][0]["applicability"] = "nice-to-have"
        self.assertTrue(
            any("not one of" in message for message in self.errors(invalid))
        )

    def test_profile_requires_separate_evidence_for_sources_and_standards(self) -> None:
        invalid = json.loads(json.dumps(self.template))
        del invalid["sources"][0]["evidence_refs"]
        del invalid["standards"][0]["evidence_refs"]
        errors = self.errors(invalid)
        self.assertEqual(2, sum("'evidence_refs' is a required property" in item for item in errors))

    def test_semantic_validation_rejects_broken_cross_references(self) -> None:
        invalid = json.loads(json.dumps(self.template))
        invalid["sources"][0]["rights_ref"] = "RIGHT-MISSING"
        invalid["tasks"][0]["user_ids"] = ["USER-MISSING"]
        errors = check_domain_profile.reference_errors(invalid)
        self.assertIn("user_ids references unknown id 'USER-MISSING'", errors)
        self.assertTrue(any("unknown rights_ref" in item for item in errors))

    def test_semantic_validation_rejects_unpinned_consumer_contracts(self) -> None:
        invalid = json.loads(json.dumps(self.template))
        invalid["consumer_contract"]["lock"]["consumer_ids"] = [
            "CONSUMER-MISSING"
        ]
        invalid["consumer_contract"]["inventory"][0][
            "version_or_digest"
        ] = "latest"
        errors = check_domain_profile.reference_errors(invalid)
        self.assertIn(
            "consumer_contract.lock.consumer_ids must exactly match the "
            "consumer inventory",
            errors,
        )
        self.assertTrue(
            any("unpinned version_or_digest" in item for item in errors)
        )

        approved = json.loads(json.dumps(self.template))
        approved["status"] = "approved"
        approved_errors = check_domain_profile.reference_errors(approved)
        self.assertIn(
            "an approved domain profile must pin the consumer lock SHA-256",
            approved_errors,
        )

    def test_semantic_validation_rejects_broken_consumer_graph_references(
        self,
    ) -> None:
        invalid = json.loads(json.dumps(self.template))
        invalid["consumer_contract"]["dependency_graph"]["edges"][0][
            "to_node"
        ] = "NODE-MISSING"
        invalid["consumer_contract"]["dependency_graph"]["nodes"][1][
            "plane_ref"
        ] = "PLANE-MISSING"
        invalid["consumer_contract"]["compatibility"]["cases"][0][
            "consumer_ref"
        ] = "CONSUMER-MISSING"
        errors = check_domain_profile.reference_errors(invalid)
        self.assertTrue(
            any("unknown to_node 'NODE-MISSING'" in item for item in errors)
        )
        self.assertIn(
            "plane reference points to unknown plane 'PLANE-MISSING'",
            errors,
        )
        self.assertIn(
            "consumer reference points to unknown consumer 'CONSUMER-MISSING'",
            errors,
        )

    def test_semantic_validation_requires_consumer_execution_compatibility_and_links(
        self,
    ) -> None:
        invalid_fixture = json.loads(json.dumps(self.template))
        invalid_fixture["consumer_contract"]["fixture_protocol"][
            "consumer_stage"
        ]["consumer_refs"] = []
        fixture_errors = check_domain_profile.reference_errors(invalid_fixture)
        self.assertTrue(
            any(
                "does not execute every required consumer" in item
                for item in fixture_errors
            )
        )

        invalid_compatibility = json.loads(json.dumps(self.template))
        invalid_compatibility["consumer_contract"]["compatibility"]["cases"] = (
            invalid_compatibility["consumer_contract"]["compatibility"][
                "cases"
            ][:1]
        )
        compatibility_errors = check_domain_profile.reference_errors(
            invalid_compatibility
        )
        self.assertIn(
            "consumer compatibility cases must cover both producer/consumer "
            "directions",
            compatibility_errors,
        )

        invalid_links = json.loads(json.dumps(self.template))
        invalid_links["consumer_contract"]["post_deploy_deep_links"] = []
        link_errors = check_domain_profile.reference_errors(invalid_links)
        self.assertTrue(
            any(
                "do not cover every deep-link consumer" in item
                for item in link_errors
            )
        )

    def test_prompts_keep_research_and_build_as_separate_hash_bound_stages(self) -> None:
        warmup = (DOCS / "prompts" / "okf-domain-warm-up.md").read_text()
        build = (DOCS / "prompts" / "okf-bundle-build.md").read_text()
        self.assertIn("Do not implement the bundle", warmup)
        self.assertIn("CHECKSUMS.sha256", warmup)
        self.assertIn(
            "{{KNOWN_CONSUMERS_AND_COMPATIBILITY_WINDOW}}",
            warmup,
        )
        self.assertIn("consumer-lock.json", warmup)
        self.assertIn("bidirectional compatibility cases", warmup)
        self.assertIn("{{DOMAIN_PROFILE_ROOT_SHA256}}", build)
        self.assertIn("{{CONSUMER_LOCK_SHA256}}", build)
        self.assertIn("Two-stage tiny canonical fixture", build)
        self.assertIn("Execute the actual consumer", build)
        self.assertIn("both compatibility directions", build)
        self.assertIn("selective-rerun decision", build)
        self.assertIn("profile-selected deep link", build)
        self.assertIn("substantive security analysis once", build)
        self.assertIn("Promote the exact RC artefacts", build)
        self.assertIn("Phase 0 — Classify And Bootstrap The Repository", build)
        self.assertIn("60-second, tool-first budget", build)
        self.assertIn("label the URL unverified", build)

    def test_examples_exercise_three_materially_different_domains(self) -> None:
        examples = (DOCS / "prompts" / "domain-profile-examples.md").read_text()
        for required in (
            "## UK Legislation Assertions",
            "## ONS Assertions",
            "## GOV.UK Content Assertions",
            "ELI",
            "SDMX",
            "GOV.UK content models",
        ):
            self.assertIn(required, examples)


if __name__ == "__main__":
    unittest.main()
