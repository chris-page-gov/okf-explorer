from __future__ import annotations

import json
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
EVALUATION_ROOT = ROOT / "evaluation"
EVALUATION = EVALUATION_ROOT / "okf-explorer"
CKAN_EVALUATION = EVALUATION_ROOT / "gov-ckan"


class OkfExplorerEvaluationSuiteTest(unittest.TestCase):
    def test_question_suite_has_100_unique_questions_and_100_point_rubric(self):
        for evaluation_dir in [EVALUATION, CKAN_EVALUATION]:
            with self.subTest(suite=evaluation_dir.name):
                suite = json.loads((evaluation_dir / "questions.json").read_text(encoding="utf-8"))

                self.assertEqual(suite["schema"], "okf-explorer-evaluation-suite.v1")
                questions = suite["questions"]
                self.assertEqual(len(questions), 100)
                self.assertEqual(len({question["id"] for question in questions}), 100)
                self.assertEqual(sum(section["points"] for section in suite["rubric"].values()), 100)
                self.assertEqual(set(suite["rubric"]), {"retrieval", "display", "accessibility", "govuk"})

    def test_every_question_is_scored_against_retrieval_and_display_terms(self):
        for evaluation_dir in [EVALUATION, CKAN_EVALUATION]:
            suite = json.loads((evaluation_dir / "questions.json").read_text(encoding="utf-8"))

            for question in suite["questions"]:
                with self.subTest(suite=evaluation_dir.name, question=question["id"]):
                    self.assertTrue(question["query"])
                    self.assertTrue(question["intent"])
                    self.assertTrue(question["expected_terms"])
                    self.assertTrue(question["tags"])

    def test_rugby_question_documents_current_corpus_boundary(self):
        suite = json.loads((EVALUATION / "questions.json").read_text(encoding="utf-8"))
        question = next(question for question in suite["questions"] if question["id"] == "Q071")

        self.assertEqual(question["query"], "Rugby")
        self.assertEqual(question["expected_min_results"], 1)
        self.assertIn("single current API/data record", question["intent"])

    def test_visual_regression_manifest_keeps_graph_overlap_evidence(self):
        visuals = json.loads((EVALUATION / "visual-regressions.json").read_text(encoding="utf-8"))

        self.assertEqual(visuals["schema"], "okf-explorer-visual-regressions.v1")
        self.assertGreaterEqual(len(visuals["items"]), 4)
        by_id = {item["id"]: item for item in visuals["items"]}
        self.assertIn("VR001", by_id)
        self.assertIn("VR002", by_id)
        self.assertIn("VR003", by_id)
        self.assertIn("VR004", by_id)
        self.assertEqual(by_id["VR001"]["view"], "graph")
        self.assertIn("layering and overlapping white boxes", by_id["VR001"]["comment"])
        self.assertIn("arrow location", by_id["VR001"]["comment"])
        self.assertIn("osdatahub.os.uk", by_id["VR002"]["comment"])
        self.assertIn("OS Data Hub", by_id["VR003"]["comment"])
        self.assertIn("false breakdown", by_id["VR004"]["comment"])
        for item in visuals["items"]:
            with self.subTest(item=item["id"]):
                self.assertTrue((EVALUATION / item["image"]).is_file())
                self.assertGreaterEqual(len(item["checks"]), 5)

    def test_ckan_visual_regression_manifest_is_ready_for_pack_specific_evidence(self):
        visuals = json.loads((CKAN_EVALUATION / "visual-regressions.json").read_text(encoding="utf-8"))

        self.assertEqual(visuals["schema"], "okf-explorer-visual-regressions.v1")
        self.assertIsInstance(visuals["items"], list)

    def test_browser_harness_is_additive_and_writes_json_and_markdown_reports(self):
        script = (ROOT / "scripts" / "evaluate_okf_explorer.mjs").read_text(encoding="utf-8")

        self.assertIn("okf-explorer-evaluation-results.v1", script)
        self.assertIn("target_bundle", script)
        self.assertIn("score.retrieval", script)
        self.assertIn("score.display", script)
        self.assertIn("score.accessibility", script)
        self.assertIn("score.govuk", script)
        self.assertIn("questions_scored", script)
        self.assertIn("validation-only", script)
        self.assertIn("buildValidationOnlyRecords", script)
        self.assertIn("results.json", script)
        self.assertIn("results.md", script)
        self.assertIn("visual_regressions", script)

    def test_svelte_graph_supports_record_type_grouping_and_metadata_reduction(self):
        source = (ROOT / "apps" / "okf-explorer" / "src" / "routes" / "+page.svelte").read_text(encoding="utf-8")

        self.assertIn("record-type-stack", source)
        self.assertIn("Grouped by record type", source)
        self.assertIn("largeExpandedGraphGroup", source)
        self.assertIn("metadataFacetForRoute", source)
        self.assertIn("click a stack to expand it", source)
        self.assertIn("GRAPH_EXPANDED_GROUP_LIMIT", source)

    def test_svelte_facets_support_search_paging_and_single_select_default(self):
        source = (ROOT / "apps" / "okf-explorer" / "src" / "routes" / "+page.svelte").read_text(encoding="utf-8")

        self.assertIn("FACET_PAGE_SIZE", source)
        self.assertIn("largeFacetSearch", source)
        self.assertIn("visibleLargeFacetRows", source)
        self.assertIn("Show more", source)
        self.assertIn("canonical_publisher", source)
        self.assertIn("event?.ctrlKey || event?.metaKey || event?.shiftKey", source)

    def test_svelte_graph_has_distinct_node_icon_vocabulary(self):
        source = (ROOT / "apps" / "okf-explorer" / "src" / "routes" / "+page.svelte").read_text(encoding="utf-8")

        self.assertIn("node.type === 'publisher'", source)
        self.assertIn("node.type === 'format'", source)
        self.assertIn("node.type === 'topic'", source)
        self.assertIn("node.type === 'license'", source)
        self.assertIn("node.type === 'tag'", source)
        self.assertIn("node.type === 'host' || node.type === 'resource_type'", source)


if __name__ == "__main__":
    unittest.main()
