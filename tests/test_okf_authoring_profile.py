from __future__ import annotations

import json
import hashlib
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

    def candidate_digest(self, candidate_ids: list[str]) -> str:
        payload = (
            json.dumps(
                sorted(candidate_ids),
                ensure_ascii=False,
                separators=(",", ":"),
            )
            + "\n"
        ).encode("utf-8")
        return hashlib.sha256(payload).hexdigest()

    def coverage_result_digest(self, result: dict[str, object]) -> str:
        payload = (
            json.dumps(
                result,
                ensure_ascii=False,
                sort_keys=True,
                separators=(",", ":"),
            )
            + "\n"
        ).encode("utf-8")
        return hashlib.sha256(payload).hexdigest()

    def sync_coverage_result_digest(self, value: dict[str, object]) -> str:
        linking = value["semantic_linking"]
        assert isinstance(linking, dict)
        link_set = linking["link_sets"][0]
        result = link_set["coverage_result"]
        digest = self.coverage_result_digest(result)
        link_set["coverage_result_sha256"] = digest
        evidence = value["evidence"]
        coverage_evidence = next(
            item for item in evidence if item["id"] == "EV-LINK-COVERAGE-001"
        )
        coverage_evidence["sha256"] = digest
        return digest

    def set_linked_outcome(
        self,
        result: dict[str, object],
        *,
        assertions: int = 1,
    ) -> None:
        result["linked_count"] = 1
        result["linked_candidate_ids"] = ["record-001"]
        result["linked_assertion_count"] = assertions
        result["link_assertions"] = [
            {
                "id": f"ASSERTION-{index + 1:03d}",
                "candidate_id": "record-001",
                "target_iri": f"https://example.org/source/{index + 1}",
                "evidence_refs": ["EV-001"],
            }
            for index in range(assertions)
        ]
        result["unresolved_count"] = 0
        result["unresolved_candidate_ids"] = []
        result["achieved_coverage_percent"] = 100
        dereference = result["dereference"]
        assert isinstance(dereference, dict)
        dereference.update(
            {
                "attempted_count": assertions,
                "succeeded_count": assertions,
                "failed_count": 0,
                "results": [
                    {
                        "assertion_ref": f"ASSERTION-{index + 1:03d}",
                        "outcome": "succeeded",
                        "terminal_kind": "http-status",
                        "http_status": 200,
                        "observed_status": "HTTP 200",
                        "evidence_refs": ["EV-001"],
                    }
                    for index in range(assertions)
                ],
            }
        )

    def approve_semantic_profile(self, value: dict[str, object]) -> None:
        value["status"] = "approved"
        input_snapshot = value["input_snapshot"]
        assert isinstance(input_snapshot, dict)
        input_snapshot["inventory_sha256"] = "1" * 64
        consumer_contract = value["consumer_contract"]
        assert isinstance(consumer_contract, dict)
        lock = consumer_contract["lock"]
        assert isinstance(lock, dict)
        lock["sha256"] = "2" * 64
        evidence = value["evidence"]
        assert isinstance(evidence, list)
        evidence[0]["sha256"] = "3" * 64
        evidence[0]["verification"] = "support-checked"
        linking = value["semantic_linking"]
        assert isinstance(linking, dict)
        denominator = linking["eligible_entity_denominators"][0]
        denominator["minimum_coverage_percent"] = 0
        self.sync_coverage_result_digest(value)
        coverage_evidence = next(
            item for item in evidence if item["id"] == "EV-LINK-COVERAGE-001"
        )
        coverage_evidence["verification"] = "support-checked"

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
        self.assertEqual(
            "debug-only",
            self.template["presentation_contract"]["identifier_fallback"],
        )
        self.assertEqual(
            "okf-explorer-endpoint-label-index.v1",
            self.template["presentation_contract"]["compact_label_index"][
                "schema"
            ],
        )
        self.assertEqual(
            "endpoint_labels",
            self.template["presentation_contract"]["compact_label_index"][
                "descriptor_entrypoint"
            ],
        )
        self.assertEqual(
            "exploratory",
            self.template["exploratory_publication"]["publication_state"],
        )
        self.assertEqual(
            "okf-exploratory-publication.v1",
            self.template["exploratory_publication"]["descriptor_schema"],
        )
        self.assertEqual(
            "independent-research",
            self.template["exploratory_publication"]["publisher"][
                "authority_status"
            ],
        )
        self.assertTrue(
            self.template["exploratory_publication"]["banner"][
                "preserve_route"
            ]
        )
        self.assertTrue(
            self.template["semantic_linking"]["eligible_entity_denominators"]
        )
        link_set = self.template["semantic_linking"]["link_sets"][0]
        self.assertEqual("DENOM-001", link_set["denominator_ref"])
        self.assertEqual(
            0,
            link_set["coverage_result"]["achieved_coverage_percent"],
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

    def test_explore_controls_are_required_for_v1_conformance(self) -> None:
        for field in (
            "semantic_linking",
            "presentation_contract",
            "exploratory_publication",
        ):
            with self.subTest(field=field):
                invalid = json.loads(json.dumps(self.template))
                del invalid[field]
                self.assertTrue(
                    any(
                        f"'{field}' is a required property" in message
                        for message in self.errors(invalid)
                    )
                )

    def test_explore_contract_urls_use_the_browser_safe_shape(self) -> None:
        for value in (
            "https://example.org:99999/evidence",
            "https://example.org:0/evidence",
            "https://example.org/bare%value",
            "https://example.org/<unsafe>",
            "https://user:secret@example.org/evidence",
        ):
            with self.subTest(value=value):
                invalid = json.loads(json.dumps(self.template))
                invalid["exploratory_publication"]["banner"][
                    "feedback_url"
                ] = value
                invalid["exploratory_publication"]["publisher"]["url"] = value
                self.assertTrue(self.errors(invalid))

    def test_link_coverage_percentage_is_bounded(self) -> None:
        invalid = json.loads(json.dumps(self.template))
        invalid["semantic_linking"]["eligible_entity_denominators"][0][
            "minimum_coverage_percent"
        ] = 101
        self.assertTrue(
            any(
                "greater than the maximum" in message
                for message in self.errors(invalid)
            )
        )

    def test_each_semantic_link_set_requires_a_complete_coverage_result(
        self,
    ) -> None:
        for field in (
            "denominator_ref",
            "coverage_result_sha256",
            "coverage_result",
        ):
            with self.subTest(link_set_field=field):
                invalid = json.loads(json.dumps(self.template))
                del invalid["semantic_linking"]["link_sets"][0][field]
                self.assertTrue(
                    any(
                        f"'{field}' is a required property" in message
                        for message in self.errors(invalid)
                    )
                )

        required = (
            "eligible_count",
            "linked_count",
            "linked_candidate_ids",
            "linked_assertion_count",
            "link_assertions",
            "unresolved_count",
            "unresolved_candidate_ids",
            "excluded_count",
            "exclusion_results",
            "conflicting_count",
            "conflicting_candidate_ids",
            "achieved_coverage_percent",
            "dereference",
            "observed_at",
            "freshness_policy",
            "freshness_status",
            "evidence_refs",
        )
        for field in required:
            with self.subTest(field=field):
                invalid = json.loads(json.dumps(self.template))
                del invalid["semantic_linking"]["link_sets"][0][
                    "coverage_result"
                ][field]
                self.assertTrue(
                    any(
                        f"'{field}' is a required property" in message
                        for message in self.errors(invalid)
                    )
                )

    def test_semantic_link_coverage_categories_must_reconcile_exactly(
        self,
    ) -> None:
        invalid = json.loads(json.dumps(self.template))
        result = invalid["semantic_linking"]["link_sets"][0][
            "coverage_result"
        ]
        result["linked_count"] = 1
        result["linked_candidate_ids"] = ["record-001"]
        result["linked_assertion_count"] = 1
        result["dereference"]["attempted_count"] = 1
        result["dereference"]["succeeded_count"] = 1
        result["achieved_coverage_percent"] = 100
        errors = check_domain_profile.reference_errors(invalid)
        self.assertTrue(
            any("coverage counts must reconcile exactly" in item for item in errors)
        )

    def test_semantic_link_coverage_percentage_uses_the_effective_denominator(
        self,
    ) -> None:
        invalid = json.loads(json.dumps(self.template))
        result = invalid["semantic_linking"]["link_sets"][0][
            "coverage_result"
        ]
        self.set_linked_outcome(result)
        result["achieved_coverage_percent"] = 99
        errors = check_domain_profile.reference_errors(invalid)
        self.assertTrue(
            any(
                "achieved_coverage_percent must equal 100.00" in item
                for item in errors
            )
        )

        rounded = json.loads(json.dumps(self.template))
        denominator = rounded["semantic_linking"][
            "eligible_entity_denominators"
        ][0]
        result = rounded["semantic_linking"]["link_sets"][0][
            "coverage_result"
        ]
        denominator["eligible_count"] = 3
        denominator["candidate_ids"] = ["record-001", "record-002", "record-003"]
        denominator["candidate_list_sha256"] = self.candidate_digest(
            denominator["candidate_ids"]
        )
        result.update(
            {
                "eligible_count": 3,
                "linked_count": 1,
                "linked_candidate_ids": ["record-001"],
                "linked_assertion_count": 1,
                "unresolved_count": 2,
                "unresolved_candidate_ids": ["record-002", "record-003"],
                "achieved_coverage_percent": 33.33,
                "link_assertions": [
                    {
                        "id": "ASSERTION-001",
                        "candidate_id": "record-001",
                        "target_iri": "https://example.org/source/1",
                        "evidence_refs": ["EV-001"],
                    }
                ],
            }
        )
        result["dereference"].update(
            {
                "attempted_count": 1,
                "succeeded_count": 1,
                "results": [
                    {
                        "assertion_ref": "ASSERTION-001",
                        "outcome": "succeeded",
                        "terminal_kind": "http-status",
                        "http_status": 200,
                        "observed_status": "HTTP 200",
                        "evidence_refs": ["EV-001"],
                    }
                ],
            }
        )
        self.sync_coverage_result_digest(rounded)
        self.assertEqual([], self.errors(rounded))
        self.assertEqual([], check_domain_profile.reference_errors(rounded))

    def test_every_linked_assertion_requires_a_reconciled_dereference_result(
        self,
    ) -> None:
        invalid = json.loads(json.dumps(self.template))
        result = invalid["semantic_linking"]["link_sets"][0][
            "coverage_result"
        ]
        self.set_linked_outcome(result)
        result["dereference"]["attempted_count"] = 0
        result["dereference"]["succeeded_count"] = 0
        result["dereference"]["results"] = []
        errors = check_domain_profile.reference_errors(invalid)
        self.assertTrue(
            any(
                "dereference every linked assertion exactly once" in item
                for item in errors
            )
        )

    def test_link_assertions_are_counted_separately_from_linked_candidates(
        self,
    ) -> None:
        valid = json.loads(json.dumps(self.template))
        result = valid["semantic_linking"]["link_sets"][0]["coverage_result"]
        self.set_linked_outcome(result, assertions=2)
        self.sync_coverage_result_digest(valid)
        self.assertEqual([], self.errors(valid))
        self.assertEqual([], check_domain_profile.reference_errors(valid))

    def test_excluded_candidates_require_named_reconciled_evidence(self) -> None:
        invalid = json.loads(json.dumps(self.template))
        denominator = invalid["semantic_linking"][
            "eligible_entity_denominators"
        ][0]
        result = invalid["semantic_linking"]["link_sets"][0][
            "coverage_result"
        ]
        result.update(
            {
                "unresolved_count": 0,
                "unresolved_candidate_ids": [],
                "excluded_count": 1,
                "achieved_coverage_percent": 100,
            }
        )
        errors = check_domain_profile.reference_errors(invalid)
        self.assertTrue(
            any("evidence-bearing exclusion_results" in item for item in errors)
        )

        denominator["exclusions"] = [
            {
                "id": "EXCLUSION-001",
                "rule": "Exclude a withdrawn record only when the official source marks it withdrawn.",
                "evidence_refs": ["EV-001"],
            }
        ]
        result["exclusion_results"] = [
            {
                "exclusion_ref": "EXCLUSION-001",
                "count": 1,
                "candidate_ids": ["record-001"],
                "evidence_refs": ["EV-001"],
            }
        ]
        self.sync_coverage_result_digest(invalid)
        self.assertEqual([], self.errors(invalid))
        self.assertEqual([], check_domain_profile.reference_errors(invalid))

    def test_unknown_and_duplicate_exclusion_results_fail_closed(self) -> None:
        invalid = json.loads(json.dumps(self.template))
        result = invalid["semantic_linking"]["link_sets"][0][
            "coverage_result"
        ]
        result["exclusion_results"] = [
            {
                "exclusion_ref": "EXCLUSION-MISSING",
                "count": 1,
                "candidate_ids": ["record-withdrawn-001"],
                "evidence_refs": ["EV-001"],
            },
            {
                "exclusion_ref": "EXCLUSION-MISSING",
                "count": 1,
                "candidate_ids": ["record-withdrawn-002"],
                "evidence_refs": ["EV-001"],
            },
        ]
        errors = check_domain_profile.reference_errors(invalid)
        self.assertTrue(any("unknown exclusion_ref" in item for item in errors))
        self.assertTrue(any("repeats exclusion_ref" in item for item in errors))

    def test_exclusion_results_identify_exact_disjoint_candidates(self) -> None:
        invalid = json.loads(json.dumps(self.template))
        denominator = invalid["semantic_linking"][
            "eligible_entity_denominators"
        ][0]
        denominator.update(
            {
                "eligible_count": 2,
                "candidate_ids": ["record-001", "record-002"],
                "candidate_list_sha256": self.candidate_digest(
                    ["record-001", "record-002"]
                ),
                "exclusions": [
                    {
                        "id": "EXCLUSION-001",
                        "rule": "Officially withdrawn records only.",
                        "evidence_refs": ["EV-001"],
                    },
                    {
                        "id": "EXCLUSION-002",
                        "rule": "Officially replaced records only.",
                        "evidence_refs": ["EV-001"],
                    },
                ],
            }
        )
        result = invalid["semantic_linking"]["link_sets"][0]["coverage_result"]
        result.update(
            {
                "eligible_count": 2,
                "unresolved_count": 0,
                "unresolved_candidate_ids": [],
                "excluded_count": 2,
                "exclusion_results": [
                    {
                        "exclusion_ref": "EXCLUSION-001",
                        "count": 2,
                        "candidate_ids": ["record-001"],
                        "evidence_refs": ["EV-001"],
                    },
                    {
                        "exclusion_ref": "EXCLUSION-002",
                        "count": 1,
                        "candidate_ids": ["record-001"],
                        "evidence_refs": ["EV-001"],
                    },
                ],
            }
        )
        errors = check_domain_profile.reference_errors(invalid)
        self.assertTrue(
            any("count must equal the number of candidate_ids" in item for item in errors)
        )
        self.assertTrue(
            any("occurs in more than one exclusion result" in item for item in errors)
        )

        unknown = json.loads(json.dumps(invalid))
        unknown_result = unknown["semantic_linking"]["link_sets"][0][
            "coverage_result"
        ]
        unknown_result["exclusion_results"][0].update(
            {"count": 1, "candidate_ids": ["record-not-eligible"]}
        )
        unknown_result["excluded_count"] = 2
        unknown_errors = check_domain_profile.reference_errors(unknown)
        self.assertTrue(any("is not in denominator" in item for item in unknown_errors))

    def test_outcome_ids_form_an_exact_disjoint_partition(self) -> None:
        invalid = json.loads(json.dumps(self.template))
        denominator = invalid["semantic_linking"][
            "eligible_entity_denominators"
        ][0]
        denominator["eligible_count"] = 2
        denominator["candidate_ids"] = ["record-001", "record-002"]
        denominator["candidate_list_sha256"] = self.candidate_digest(
            denominator["candidate_ids"]
        )
        result = invalid["semantic_linking"]["link_sets"][0]["coverage_result"]
        self.set_linked_outcome(result)
        result["eligible_count"] = 2
        result["excluded_count"] = 1
        result["exclusion_results"] = [
            {
                "exclusion_ref": "EXCLUSION-001",
                "count": 1,
                "candidate_ids": ["record-001"],
                "evidence_refs": ["EV-001"],
            }
        ]
        denominator["exclusions"] = [
            {
                "id": "EXCLUSION-001",
                "rule": "Officially withdrawn records only.",
                "evidence_refs": ["EV-001"],
            }
        ]
        errors = check_domain_profile.reference_errors(invalid)
        self.assertTrue(any("more than one coverage outcome" in item for item in errors))
        self.assertTrue(any("does not classify denominator candidates" in item for item in errors))

    def test_assertion_and_dereference_ledgers_reconcile_by_identity(self) -> None:
        invalid = json.loads(json.dumps(self.template))
        result = invalid["semantic_linking"]["link_sets"][0]["coverage_result"]
        self.set_linked_outcome(result, assertions=2)
        result["link_assertions"][1]["id"] = "ASSERTION-001"
        result["dereference"]["results"][1]["assertion_ref"] = "ASSERTION-001"
        errors = check_domain_profile.reference_errors(invalid)
        self.assertTrue(any("repeats link assertion ID" in item for item in errors))
        self.assertTrue(any("repeats dereference result" in item for item in errors))

    def test_zero_linked_candidates_cannot_have_assertions(self) -> None:
        invalid = json.loads(json.dumps(self.template))
        result = invalid["semantic_linking"]["link_sets"][0]["coverage_result"]
        result["linked_assertion_count"] = 1
        result["link_assertions"] = [
            {
                "id": "ASSERTION-001",
                "candidate_id": "record-001",
                "target_iri": "https://example.org/source/1",
                "evidence_refs": ["EV-001"],
            }
        ]
        result["dereference"].update(
            {
                "attempted_count": 1,
                "succeeded_count": 1,
                "results": [
                    {
                        "assertion_ref": "ASSERTION-001",
                        "outcome": "succeeded",
                        "terminal_kind": "http-status",
                        "http_status": 200,
                        "observed_status": "HTTP 200",
                        "evidence_refs": ["EV-001"],
                    }
                ],
            }
        )
        errors = check_domain_profile.reference_errors(invalid)
        self.assertTrue(any("must either both be zero" in item for item in errors))

    def test_candidate_ids_are_canonical_and_digest_bound(self) -> None:
        invalid = json.loads(json.dumps(self.template))
        denominator = invalid["semantic_linking"][
            "eligible_entity_denominators"
        ][0]
        denominator["eligible_count"] = 2
        denominator["candidate_ids"] = ["record-001", " record-001"]
        denominator["candidate_list_sha256"] = self.candidate_digest(
            denominator["candidate_ids"]
        )
        result = invalid["semantic_linking"]["link_sets"][0]["coverage_result"]
        result["eligible_count"] = 2
        result["unresolved_count"] = 2
        result["unresolved_candidate_ids"] = denominator["candidate_ids"]
        errors = check_domain_profile.reference_errors(invalid)
        self.assertTrue(any("trimmed, control-free" in item for item in errors))

        drifted = json.loads(json.dumps(self.template))
        drifted["semantic_linking"]["eligible_entity_denominators"][0][
            "candidate_list_sha256"
        ] = "0" * 64
        self.assertTrue(
            any(
                "candidate_list_sha256 must equal" in item
                for item in check_domain_profile.reference_errors(drifted)
            )
        )

    def test_approved_semantic_ledgers_require_approval_grade_evidence(self) -> None:
        invalid = json.loads(json.dumps(self.template))
        self.approve_semantic_profile(invalid)
        result = invalid["semantic_linking"]["link_sets"][0]["coverage_result"]
        self.set_linked_outcome(result)
        invalid["evidence"].append(
            {
                "id": "EV-UNKNOWN",
                "title": "Unverified semantic observation",
                "authority": "Unknown",
                "location": "./unverified.json",
                "retrieved_at": "2026-07-27T00:00:00Z",
                "observed_at": "2026-07-27T00:00:00Z",
                "verification": "unverified",
                "sha256": "unknown",
                "supports": ["Unverified semantic result"],
            }
        )
        result["evidence_refs"] = ["EV-UNKNOWN"]
        result["link_assertions"][0]["evidence_refs"] = ["EV-UNKNOWN"]
        result["dereference"]["results"][0]["evidence_refs"] = ["EV-UNKNOWN"]
        errors = check_domain_profile.semantic_linking_errors(invalid)
        self.assertTrue(
            any("semantic linking requires support-checked" in item for item in errors)
        )

    def test_approved_coverage_time_is_bound_to_observation_evidence(self) -> None:
        invalid = json.loads(json.dumps(self.template))
        self.approve_semantic_profile(invalid)
        coverage_evidence = next(
            item
            for item in invalid["evidence"]
            if item["id"] == "EV-LINK-COVERAGE-001"
        )
        coverage_evidence["observed_at"] = "2020-01-01T00:00:00Z"
        errors = check_domain_profile.semantic_linking_errors(invalid)
        self.assertTrue(
            any("canonical coverage result digest and observed_at" in item for item in errors)
        )

    def test_coverage_result_is_canonically_digest_bound(self) -> None:
        for replacement in (None, "unknown"):
            with self.subTest(replacement=replacement):
                invalid = json.loads(json.dumps(self.template))
                link_set = invalid["semantic_linking"]["link_sets"][0]
                if replacement is None:
                    del link_set["coverage_result_sha256"]
                else:
                    link_set["coverage_result_sha256"] = replacement
                self.assertTrue(self.errors(invalid))

        drifted = json.loads(json.dumps(self.template))
        drifted_result = drifted["semantic_linking"]["link_sets"][0][
            "coverage_result"
        ]
        drifted_result["dereference"]["method"] += " Mutated after approval."
        errors = check_domain_profile.semantic_linking_errors(drifted)
        self.assertTrue(
            any("coverage_result_sha256 must equal canonical" in item for item in errors)
        )

    def test_approved_coverage_requires_one_digest_and_time_witness(self) -> None:
        approved = json.loads(json.dumps(self.template))
        self.approve_semantic_profile(approved)
        self.assertEqual([], check_domain_profile.semantic_linking_errors(approved))

        arbitrary = json.loads(json.dumps(approved))
        coverage_evidence = next(
            item
            for item in arbitrary["evidence"]
            if item["id"] == "EV-LINK-COVERAGE-001"
        )
        coverage_evidence["sha256"] = "4" * 64
        errors = check_domain_profile.semantic_linking_errors(arbitrary)
        self.assertTrue(
            any("canonical coverage result digest and observed_at" in item for item in errors)
        )

    def test_mapping_relation_and_predicate_must_be_compatible(self) -> None:
        mutations = (
            ("identity", "http://purl.org/dc/terms/source", "identity mapping"),
            ("exact-match", "http://purl.org/dc/terms/source", "requires predicate_iri"),
            (
                "domain-relationship",
                "http://www.w3.org/2002/07/owl#sameAs",
                "domain-relationship cannot use",
            ),
        )
        for relation, predicate, expected in mutations:
            with self.subTest(relation=relation, predicate=predicate):
                invalid = json.loads(json.dumps(self.template))
                link_set = invalid["semantic_linking"]["link_sets"][0]
                link_set["mapping_relation"] = relation
                link_set["predicate_iri"] = predicate
                errors = check_domain_profile.semantic_linking_errors(invalid)
                self.assertTrue(any(expected in item for item in errors))

    def test_link_assertion_target_must_belong_to_governed_namespace(self) -> None:
        invalid = json.loads(json.dumps(self.template))
        result = invalid["semantic_linking"]["link_sets"][0]["coverage_result"]
        self.set_linked_outcome(result)
        result["link_assertions"][0]["target_iri"] = (
            "https://attacker.example/not-official"
        )
        errors = check_domain_profile.semantic_linking_errors(invalid)
        self.assertTrue(any("outside its governed target_namespace" in item for item in errors))

    def test_encoded_path_delimiters_cannot_cross_a_governed_namespace(self) -> None:
        invalid = json.loads(json.dumps(self.template))
        result = invalid["semantic_linking"]["link_sets"][0]["coverage_result"]
        self.set_linked_outcome(result)
        result["link_assertions"][0]["target_iri"] = (
            "https://example.org/source%2Fevil"
        )
        self.sync_coverage_result_digest(invalid)
        errors = check_domain_profile.semantic_linking_errors(invalid)
        self.assertTrue(any("outside its governed target_namespace" in item for item in errors))

        unsafe_namespace = json.loads(json.dumps(self.template))
        unsafe_namespace["semantic_linking"]["link_sets"][0][
            "target_namespace"
        ] = "https://example.org/source%2F"
        errors = check_domain_profile.semantic_linking_errors(unsafe_namespace)
        self.assertTrue(any("target_namespace must be a safe HTTP" in item for item in errors))

    def test_dereference_outcome_is_derived_from_terminal_result(self) -> None:
        invalid = json.loads(json.dumps(self.template))
        result = invalid["semantic_linking"]["link_sets"][0]["coverage_result"]
        self.set_linked_outcome(result)
        row = result["dereference"]["results"][0]
        row["terminal_kind"] = "timeout"
        row["http_status"] = None
        row["observed_status"] = "Timed out"
        errors = check_domain_profile.semantic_linking_errors(invalid)
        self.assertTrue(any("outcome contradicts" in item for item in errors))

    def test_duplicate_candidate_target_assertions_are_rejected(self) -> None:
        invalid = json.loads(json.dumps(self.template))
        result = invalid["semantic_linking"]["link_sets"][0]["coverage_result"]
        self.set_linked_outcome(result, assertions=2)
        result["link_assertions"][1]["target_iri"] = result["link_assertions"][0][
            "target_iri"
        ]
        errors = check_domain_profile.semantic_linking_errors(invalid)
        self.assertTrue(any("repeats the semantic assertion" in item for item in errors))

    def test_identity_assertions_require_independently_verified_evidence(self) -> None:
        invalid = json.loads(json.dumps(self.template))
        self.approve_semantic_profile(invalid)
        link_set = invalid["semantic_linking"]["link_sets"][0]
        link_set["mapping_relation"] = "identity"
        link_set["predicate_iri"] = "http://www.w3.org/2002/07/owl#sameAs"
        result = link_set["coverage_result"]
        self.set_linked_outcome(result)
        errors = check_domain_profile.semantic_linking_errors(invalid)
        self.assertTrue(any("requires independently verified" in item for item in errors))

    def test_denominator_identifies_every_eligible_candidate_exactly(self) -> None:
        invalid = json.loads(json.dumps(self.template))
        denominator = invalid["semantic_linking"][
            "eligible_entity_denominators"
        ][0]
        denominator["eligible_count"] = 2
        errors = check_domain_profile.reference_errors(invalid)
        self.assertTrue(
            any(
                "eligible_count must equal the number of candidate_ids" in item
                for item in errors
            )
        )

    def test_stale_coverage_policy_is_fail_closed_in_v1(self) -> None:
        invalid = json.loads(json.dumps(self.template))
        invalid["semantic_linking"]["link_sets"][0]["coverage_result"][
            "freshness_policy"
        ]["stale_result_action"] = "retain-with-warning"
        self.assertTrue(
            any("'fail-closed' was expected" in message for message in self.errors(invalid))
        )

    def test_link_coverage_freshness_status_must_match_its_policy(self) -> None:
        invalid = json.loads(json.dumps(self.template))
        invalid["semantic_linking"]["link_sets"][0]["coverage_result"][
            "observed_at"
        ] = "2025-01-01T00:00:00Z"
        errors = check_domain_profile.reference_errors(invalid)
        self.assertTrue(
            any("freshness_status must be 'stale'" in item for item in errors)
        )

    def test_approved_profile_rejects_stale_fail_closed_link_coverage(self) -> None:
        invalid = json.loads(json.dumps(self.template))
        invalid["status"] = "approved"
        invalid["consumer_contract"]["lock"]["sha256"] = "0" * 64
        result = invalid["semantic_linking"]["link_sets"][0][
            "coverage_result"
        ]
        result["observed_at"] = "2025-01-01T00:00:00Z"
        result["freshness_status"] = "stale"
        errors = check_domain_profile.reference_errors(invalid)
        self.assertTrue(
            any("stale coverage result" in item for item in errors)
        )

    def test_link_set_coverage_must_bind_to_a_declared_denominator(self) -> None:
        invalid = json.loads(json.dumps(self.template))
        invalid["semantic_linking"]["link_sets"][0][
            "denominator_ref"
        ] = "DENOM-MISSING"
        errors = check_domain_profile.reference_errors(invalid)
        self.assertTrue(
            any("unknown denominator_ref 'DENOM-MISSING'" in item for item in errors)
        )

    def test_exploratory_banner_must_preserve_the_review_route(self) -> None:
        invalid = json.loads(json.dumps(self.template))
        invalid["exploratory_publication"]["banner"]["preserve_route"] = False
        self.assertTrue(
            any("True was expected" in message for message in self.errors(invalid))
        )

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

    def test_shared_guide_governs_selective_cpsv_ap_adoption(self) -> None:
        guide = (DOCS / "okf-0.2-yaml-ld-semantic-authoring.md").read_text()
        for required in (
            "## Selective CPSV-AP 3.2.0 adoption",
            "https://semiceu.github.io/CPSV-AP/releases/3.2.0/",
            "https://www.w3.org/TR/vocab-dcat-3/",
            "https://semiceu.github.io/DCAT-AP/",
            "https://op.europa.eu/en/web/eu-vocabularies/model/-/resource/dataset/eli",
            "https://sdmx.org/standards-2/",
            "subset validation, not full CPSV-AP conformance",
            "does not imply endorsement",
            "version lock",
        ):
            with self.subTest(required=required):
                self.assertIn(required, guide)

        for repository in (
            "okf-LandRegistry",
            "okf-govuk-content",
            "okf-ons",
            "okf-uk-government-apis",
            "okf-uk-legislation",
            "okf-uk-living",
            "okf-ai-infrastructure",
            "okf-testing",
        ):
            with self.subTest(repository=repository):
                self.assertIn(f"`{repository}`", guide)


if __name__ == "__main__":
    unittest.main()
