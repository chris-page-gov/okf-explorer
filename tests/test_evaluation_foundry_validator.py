from __future__ import annotations

import copy
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import check_evaluation_foundry  # noqa: E402


def write_document(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    # JSON is also valid YAML 1.2, allowing the tests to exercise the safe YAML
    # loader without introducing a second serializer.
    path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")


class EvaluationFoundryValidatorTests(unittest.TestCase):
    def valid_documents(self) -> dict[str, dict[str, object]]:
        profile = {
            "schema": "okf-evaluation-profile.v1",
            "profile_id": "heritage-test",
            "status": "draft",
            "title": "Heritage test",
            "scope": {
                "record_definition": "One source designation.",
                "included": ["Coventry"],
                "excluded": [],
                "denominators": [
                    {
                        "id": "DEN-1",
                        "definition": "All records in the fixture.",
                        "method": "Count fixture rows.",
                        "status": "complete",
                        "count": 1,
                    }
                ],
            },
            "sources": [
                {
                    "id": "SRC-1",
                    "title": "Source register",
                    "url": "https://example.test/source",
                    "authority": "Example authority",
                    "access": "Fixture snapshot",
                    "rights": "Open test data",
                    "coverage": "One record",
                }
            ],
            "assertion_policy": {
                "statuses": ["official", "normalized"],
                "scopes": ["real-world", "synthetic-fixture"],
                "synthetic_isolation": True,
            },
            "mapping_proposals": ["MAP-1"],
            "capabilities": ["search"],
            "fixtures": {
                "tiny": "tiny/okf-explorer.json",
                "faithful": "faithful/okf-explorer.json",
                "synthetic": "synthetic/okf-explorer.json",
            },
            "consumer_contract": {
                "consumer": "@okf/explorer",
                "journeys": "journeys.json",
                "deterministic_builds": 2,
                "compatibility": ["old manifest", "new manifest"],
            },
            "publication_boundary": "Functionality evaluation only.",
        }
        mappings = {
            "schema": "okf-evaluation-mapping-proposals.v1",
            "profile_id": "heritage-test",
            "proposals": [
                {
                    "id": "MAP-1",
                    "source": "source.title",
                    "target": "okf:title",
                    "evidence": ["evidence.md"],
                    "confidence": 1,
                    "derivation": "Direct copy.",
                    "assertion_status": "official",
                    "assertion_scope": "real-world",
                    "reversible": True,
                    "feature_effects": ["search"],
                }
            ],
        }
        coverage = {
            "schema": "okf-evaluation-feature-coverage.v1",
            "profile_id": "heritage-test",
            "bundle": "faithful/okf-explorer.json",
            "capabilities": [
                {
                    "id": "search",
                    "source_support": "strong",
                    "demonstrated": True,
                    "evidence": ["evidence.md"],
                    "journey": "JOURNEY-1",
                    "limitations": [],
                }
            ],
            "publication_boundary": "Functionality evaluation only.",
        }
        journeys = {
            "schema": "okf-explorer-interaction-suite.v1",
            "profile_id": "heritage-test",
            "title": "Heritage journeys",
            "description": "Real-consumer checks.",
            "target_bundle": "faithful/okf-explorer.json",
            "question_suite": "questions.json",
            "personas": [
                {
                    "id": "PERSONA-1",
                    "name": "Researcher",
                    "need": "Find an asset and inspect its evidence.",
                }
            ],
            "stories": [
                {
                    "id": "STORY-1",
                    "title": "Find an asset",
                    "persona_ids": ["PERSONA-1"],
                    "user_story": "Find an asset and inspect its evidence.",
                    "question_ids": [f"HQ{index:03d}" for index in range(1, 101)],
                }
            ],
            "journeys": [
                {
                    "id": "JOURNEY-1",
                    "title": "Search by name",
                    "persona_ids": ["PERSONA-1"],
                    "story_ids": ["STORY-1"],
                    "start": {"query": "Coventry"},
                    "actions": [
                        {
                            "action": "search",
                            "value": "Coventry",
                            "capability_refs": ["search"],
                            "mapping_refs": ["MAP-1"],
                        }
                    ],
                    "assertions": [
                        {"assertion": "result_count_min", "value": 1}
                    ],
                }
            ],
        }
        return {
            "profile": profile,
            "mappings": mappings,
            "coverage": coverage,
            "journeys": journeys,
        }

    def write_family(
        self,
        repository_root: Path,
        documents: dict[str, dict[str, object]] | None = None,
    ) -> Path:
        values = documents or self.valid_documents()
        family = repository_root / "evaluation-foundry" / "fixtures" / "example"
        for key, filename in check_evaluation_foundry.REQUIRED_ARTIFACTS.items():
            write_document(family / filename, values[key])
        descriptors = {
            "tiny": {
                "@id": "https://example.test/heritage/tiny/",
                "base_namespace": "https://example.test/heritage/tiny/concepts/",
                "assertion_scope": "synthetic-fixture",
            },
            "faithful": {
                "@id": "https://example.test/heritage/faithful/",
                "base_namespace": "https://example.test/heritage/faithful/concepts/",
                "assertion_scope": "real-world",
            },
            "synthetic": {
                "@id": "https://example.test/heritage/synthetic/",
                "base_namespace": "https://example.test/heritage/synthetic/concepts/",
                "assertion_scope": "synthetic-fixture",
                "default_loaded": False,
                "include_in_counts": False,
                "include_in_search": False,
            },
        }
        for kind, descriptor in descriptors.items():
            write_document(family / kind / "okf-explorer.json", descriptor)
        write_document(
            family / "questions.json",
            {
                "schema": "okf-explorer-evaluation-suite.v1",
                "title": "Question fixture",
                "rubric": {
                    "retrieval": {"points": 35},
                    "display": {"points": 25},
                    "accessibility": {"points": 20},
                    "govuk": {"points": 20},
                },
                "questions": [
                    {
                        "id": f"HQ{index:03d}",
                        "query": f"heritage question {index}",
                        "intent": "Exercise the assurance fixture.",
                        "expected_terms": ["heritage"],
                    }
                    for index in range(1, 101)
                ],
            },
        )
        (family / "evidence.md").write_text("# Evidence\n", encoding="utf-8")
        return family

    def test_valid_family_passes_schema_reference_isolation_and_file_checks(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            repository_root = Path(directory)
            family = self.write_family(repository_root)

            self.assertEqual(
                [],
                check_evaluation_foundry.validate_fixture_family(
                    family,
                    repository_root,
                ),
            )
            families, errors = check_evaluation_foundry.validate_all(
                family.parent,
                repository_root,
            )
            self.assertEqual([family], families)
            self.assertEqual([], errors)

    def test_href_match_expression_is_not_treated_as_a_local_file(self) -> None:
        documents = self.valid_documents()
        journeys = documents["journeys"]["journeys"]
        assert isinstance(journeys, list)
        actions = journeys[0]["actions"]
        assert isinstance(actions, list)
        actions.append(
            {
                "action": "open_external_link_new_tab",
                "href_includes": "historicengland.org.uk/listing/the-list/list-entry/",
                "capability_refs": ["search"],
                "mapping_refs": ["MAP-1"],
            }
        )

        with tempfile.TemporaryDirectory() as directory:
            repository_root = Path(directory)
            family = self.write_family(repository_root, documents)
            self.assertEqual(
                [],
                check_evaluation_foundry.validate_fixture_family(
                    family,
                    repository_root,
                ),
            )

    def test_safe_loaders_accept_finite_numbers_and_reject_unsafe_values(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            finite_yaml = root / "finite.yaml"
            finite_yaml.write_text(
                "confidence: 0.98\nwhole_number: 1\n",
                encoding="utf-8",
            )
            self.assertEqual(
                {"confidence": 0.98, "whole_number": 1},
                check_evaluation_foundry.load_document(finite_yaml),
            )

            finite_json = root / "finite.json"
            finite_json.write_text('{"confidence":0.98}\n', encoding="utf-8")
            self.assertEqual(
                {"confidence": 0.98},
                check_evaluation_foundry.load_document(finite_json),
            )

            duplicate_yaml = root / "duplicate.yaml"
            duplicate_yaml.write_text("schema: one\nschema: two\n", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "duplicate|invalid"):
                check_evaluation_foundry.load_document(duplicate_yaml)

            alias_yaml = root / "alias.yaml"
            alias_yaml.write_text("value: &shared one\ncopy: *shared\n", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "anchors, aliases"):
                check_evaluation_foundry.load_document(alias_yaml)

            duplicate_json = root / "duplicate.json"
            duplicate_json.write_text('{"id":"one","id":"two"}', encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "duplicate mapping key"):
                check_evaluation_foundry.load_document(duplicate_json)

            nonfinite_json = root / "nonfinite.json"
            nonfinite_json.write_text('{"value":NaN}', encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "non-finite"):
                check_evaluation_foundry.load_document(nonfinite_json)

            nonfinite_yaml = root / "nonfinite.yaml"
            nonfinite_yaml.write_text("value: .inf\n", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "non-finite"):
                check_evaluation_foundry.load_document(nonfinite_yaml)

    def test_duplicate_and_unresolved_ids_are_reported(self) -> None:
        documents = self.valid_documents()
        profile = documents["profile"]
        assert isinstance(profile["capabilities"], list)
        profile["capabilities"].extend(["search", "map"])
        assert isinstance(profile["mapping_proposals"], list)
        profile["mapping_proposals"].append("MAP-MISSING")
        coverage = documents["coverage"]
        assert isinstance(coverage["capabilities"], list)
        coverage["capabilities"][0]["journey"] = "JOURNEY-MISSING"
        journeys = documents["journeys"]
        assert isinstance(journeys["journeys"], list)
        journeys["journeys"].append(copy.deepcopy(journeys["journeys"][0]))

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            family = self.write_family(root, documents)
            errors = check_evaluation_foundry.validate_fixture_family(family, root)

        self.assertTrue(any("duplicate reference 'search'" in error for error in errors))
        self.assertTrue(any("unknown mapping 'MAP-MISSING'" in error for error in errors))
        self.assertTrue(any("unknown capability 'map'" in error for error in errors))
        self.assertTrue(any("unknown journey 'JOURNEY-MISSING'" in error for error in errors))
        self.assertTrue(any("id 'JOURNEY-1' is not unique" in error for error in errors))

    def test_synthetic_identity_scope_flags_and_publication_boundary_are_enforced(self) -> None:
        documents = self.valid_documents()
        documents["profile"]["publication_boundary"] = "   "
        documents["coverage"]["publication_boundary"] = ""
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            family = self.write_family(root, documents)
            faithful_path = family / "faithful" / "okf-explorer.json"
            faithful = json.loads(faithful_path.read_text(encoding="utf-8"))
            faithful["assertion_scope"] = "synthetic-fixture"
            write_document(faithful_path, faithful)
            synthetic_path = family / "synthetic" / "okf-explorer.json"
            synthetic = json.loads(synthetic_path.read_text(encoding="utf-8"))
            synthetic["@id"] = faithful["@id"]
            synthetic["base_namespace"] = faithful["base_namespace"]
            synthetic["assertion_scope"] = "real-world"
            synthetic["default_loaded"] = True
            synthetic["include_in_counts"] = True
            del synthetic["include_in_search"]
            write_document(synthetic_path, synthetic)
            errors = check_evaluation_foundry.validate_fixture_family(family, root)

        expected = (
            "synthetic corpus identity",
            "synthetic base namespace",
            "faithful descriptor assertion_scope",
            "synthetic descriptor assertion_scope",
            "default_loaded must be false",
            "include_in_counts must be false",
            "include_in_search must be false",
            "publication_boundary must be nonempty",
        )
        for fragment in expected:
            self.assertTrue(any(fragment in error for error in errors), fragment)

    def test_missing_local_references_and_incomplete_families_fail(self) -> None:
        documents = self.valid_documents()
        mappings = documents["mappings"]
        assert isinstance(mappings["proposals"], list)
        mappings["proposals"][0]["evidence"] = ["absent-evidence.md"]
        profile = documents["profile"]
        assert isinstance(profile["sources"], list)
        profile["sources"][0]["snapshot"] = {
            "path": "absent-snapshot.json.gz",
            "sha256": "0" * 64,
            "observed_at": "2026-08-02T00:00:00Z",
        }
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            family = self.write_family(root, documents)
            synthetic_path = family / "synthetic" / "okf-explorer.json"
            synthetic = json.loads(synthetic_path.read_text(encoding="utf-8"))
            synthetic["entrypoints"] = {"notes": "absent-notes.md"}
            write_document(synthetic_path, synthetic)
            errors = check_evaluation_foundry.validate_fixture_family(family, root)
            self.assertTrue(any("absent-evidence.md" in error for error in errors))
            self.assertTrue(
                any("absent-snapshot.json.gz" in error for error in errors)
            )
            self.assertTrue(any("absent-notes.md" in error for error in errors))

            incomplete = family.parent / "incomplete"
            incomplete.mkdir()
            (incomplete / "README.md").write_text("fixture\n", encoding="utf-8")
            _families, all_errors = check_evaluation_foundry.validate_all(
                family.parent,
                root,
            )
            self.assertTrue(
                any(
                    "missing required profile artifact" in error
                    for error in all_errors
                )
            )

    def test_question_suite_must_be_local_evaluator_compatible_and_traced(self) -> None:
        documents = self.valid_documents()
        documents["journeys"]["question_suite"] = "A prose question is not a path."
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            family = self.write_family(root, documents)
            errors = check_evaluation_foundry.validate_fixture_family(family, root)
            self.assertTrue(
                any(
                    "question_suite must reference a local JSON file" in error
                    for error in errors
                )
            )

            documents["journeys"]["question_suite"] = "questions.json"
            family = self.write_family(root, documents)
            suite_path = family / "questions.json"
            suite = json.loads(suite_path.read_text(encoding="utf-8"))
            suite["questions"].pop()
            suite["rubric"]["retrieval"]["points"] = 34
            suite["questions"][0]["id"] = "HQ002"
            write_document(suite_path, suite)
            errors = check_evaluation_foundry.validate_fixture_family(family, root)

        expected = (
            "expected 100 questions, found 99",
            "duplicate question id 'HQ002'",
            "rubric points must total 100",
            "references unknown question 'HQ001'",
        )
        for fragment in expected:
            self.assertTrue(any(fragment in error for error in errors), fragment)

    def test_ci_and_pages_workflows_run_the_validator(self) -> None:
        for workflow in (
            ROOT / ".github" / "workflows" / "okf-explorer-ci.yml",
            ROOT / ".github" / "workflows" / "pages.yml",
        ):
            self.assertIn(
                "python3 scripts/check_evaluation_foundry.py",
                workflow.read_text(encoding="utf-8"),
            )

    def test_heritage_suite_and_journeys_match_the_real_evaluator(self) -> None:
        family = (
            ROOT
            / "evaluation-foundry"
            / "fixtures"
            / "heritage-warwickshire"
        )
        suite = json.loads((family / "questions.json").read_text(encoding="utf-8"))
        self.assertEqual("okf-explorer-evaluation-suite.v1", suite["schema"])
        self.assertEqual(100, len(suite["questions"]))
        self.assertEqual(100, len({question["id"] for question in suite["questions"]}))
        self.assertEqual(
            100,
            sum(part["points"] for part in suite["rubric"].values()),
        )
        tags = {tag for question in suite["questions"] for tag in question["tags"]}
        self.assertGreaterEqual(
            tags,
            {
                "place",
                "grade",
                "risk",
                "period",
                "person",
                "association",
                "misspelling",
                "provenance",
                "yaml-ld",
                "synthetic",
                "publication",
            },
        )

        with tempfile.TemporaryDirectory() as directory:
            result = subprocess.run(
                [
                    "node",
                    str(ROOT / "scripts" / "evaluate_okf_explorer.mjs"),
                    "--no-browser",
                    "--journeys-only",
                    "--journeys",
                    str(family / "journeys.json"),
                    "--out",
                    directory,
                ],
                cwd=ROOT,
                check=False,
                capture_output=True,
                text=True,
            )
            self.assertEqual(0, result.returncode, result.stderr)
            payload = json.loads(
                (Path(directory) / "results.json").read_text(encoding="utf-8")
            )
        self.assertEqual(
            "evaluation-foundry/fixtures/heritage-warwickshire/questions.json",
            payload["suite"],
        )
        self.assertEqual(
            4,
            payload["interaction_journeys"]["summary"]["validation_only"],
        )


if __name__ == "__main__":
    unittest.main()
