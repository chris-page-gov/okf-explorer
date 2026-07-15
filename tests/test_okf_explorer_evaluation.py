from __future__ import annotations

import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
EVALUATION_ROOT = ROOT / "evaluation"
EVALUATION = EVALUATION_ROOT / "okf-explorer"
CKAN_EVALUATION = EVALUATION_ROOT / "gov-ckan"
LEGISLATION_EVALUATION = EVALUATION_ROOT / "legislation"
SEARCH_FILTERING_MANUAL = ROOT / "docs" / "static-search-filtering-manual.md"
SEARCH_FILTERING_ASSETS = ROOT / "docs" / "assets" / "okf-search-filtering-manual"


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
        self.assertIn("PLAYWRIGHT_EXECUTABLE_PATH", script)
        self.assertIn("results.json", script)
        self.assertIn("results.md", script)
        self.assertIn("visual_regressions", script)
        self.assertIn("okf-explorer-interaction-suite.v1", script)
        self.assertIn("--journeys-only", script)
        self.assertIn("runInteractionJourneys", script)
        self.assertIn("interaction_journeys", script)

    def test_every_readme_example_has_persona_story_question_traceability(self):
        evaluations = [EVALUATION, CKAN_EVALUATION, LEGISLATION_EVALUATION]
        for evaluation_dir in evaluations:
            with self.subTest(example=evaluation_dir.name):
                manifest = json.loads((evaluation_dir / "journeys.json").read_text(encoding="utf-8"))
                questions = json.loads((evaluation_dir / manifest["question_suite"]).read_text(encoding="utf-8"))

                self.assertEqual(manifest["schema"], "okf-explorer-interaction-suite.v1")
                self.assertTrue(manifest["target_bundle"].startswith("https://"))
                self.assertTrue(manifest["personas"])
                self.assertTrue(manifest["stories"])
                self.assertTrue(manifest["journeys"])

                question_ids = {question["id"] for question in questions["questions"]}
                persona_ids = {persona["id"] for persona in manifest["personas"]}
                story_ids = {story["id"] for story in manifest["stories"]}
                covered_questions: set[str] = set()
                covered_personas: set[str] = set()

                self.assertEqual(len(persona_ids), len(manifest["personas"]))
                self.assertEqual(len(story_ids), len(manifest["stories"]))
                for story in manifest["stories"]:
                    self.assertTrue(story["user_story"])
                    self.assertTrue(story["persona_ids"])
                    self.assertLessEqual(set(story["persona_ids"]), persona_ids)
                    covered_personas.update(story["persona_ids"])
                    self.assertLessEqual(set(story["question_ids"]), question_ids)
                    self.assertTrue(story["question_ids"] or story.get("coverage_gap"))
                    covered_questions.update(story["question_ids"])

                self.assertEqual(covered_personas, persona_ids)
                self.assertEqual(covered_questions, question_ids)

                for journey in manifest["journeys"]:
                    self.assertTrue(journey["actions"])
                    self.assertTrue(journey["assertions"])
                    self.assertLessEqual(set(journey["persona_ids"]), persona_ids)
                    self.assertLessEqual(set(journey["story_ids"]), story_ids)

    def test_interaction_journeys_cover_regression_prone_controls(self):
        manifests = [
            json.loads((evaluation_dir / "journeys.json").read_text(encoding="utf-8"))
            for evaluation_dir in [EVALUATION, CKAN_EVALUATION, LEGISLATION_EVALUATION]
        ]
        actions = {
            action["action"]
            for manifest in manifests
            for journey in manifest["journeys"]
            for action in journey["actions"]
        }
        assertions = {
            assertion["assertion"]
            for manifest in manifests
            for journey in manifest["journeys"]
            for assertion in journey["assertions"]
        }

        self.assertGreaterEqual(
            actions,
            {
                "open_facet",
                "select_facet_value",
                "set_sort",
                "history_round_trip",
                "select_graph_edge",
                "resize_relationship_drawer",
                "load_full_record",
                "toggle_disclosure",
                "open_source_inspector",
                "open_raw_source_new_tab",
            },
        )
        self.assertGreaterEqual(
            assertions,
            {
                "url_param_includes",
                "history_round_trip_restored",
                "graph_edge_selected",
                "relationship_drawer_resized",
                "disclosure_defaults_observed",
                "disclosure_toggle_observed",
                "source_inspector_visible",
                "external_link_opened_in_new_tab",
            },
        )

    def test_journeys_only_uses_the_manifest_question_suite_and_reports_unscored_results(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            output = Path(temporary_directory)
            subprocess.run(
                [
                    "node",
                    str(ROOT / "scripts" / "evaluate_okf_explorer.mjs"),
                    "--no-browser",
                    "--journeys-only",
                    "--journeys",
                    str(LEGISLATION_EVALUATION / "journeys.json"),
                    "--out",
                    str(output),
                ],
                cwd=ROOT,
                check=True,
                capture_output=True,
                text=True,
            )
            results = json.loads((output / "results.json").read_text(encoding="utf-8"))

        self.assertEqual(results["suite"], "evaluation/legislation/questions.json")
        self.assertEqual(results["bundle"], "https://chris-page-gov.github.io/okf-uk-legislation/okf-explorer.json")
        self.assertEqual(results["summary"]["questions_run"], 0)
        self.assertIsNone(results["summary"]["average_total"])
        self.assertEqual(results["interaction_journeys"]["summary"]["validation_only"], 2)

    def test_static_search_manual_has_verified_ckan_screenshots(self):
        manual = SEARCH_FILTERING_MANUAL.read_text(encoding="utf-8")
        manifest = json.loads((SEARCH_FILTERING_ASSETS / "manifest.json").read_text(encoding="utf-8"))

        self.assertEqual(manifest["schema"], "okf-search-filtering-manual-captures.v1")
        self.assertIn("gov-ckan/okf-explorer.json", manifest["bundle"])
        self.assertEqual(len(manifest["screenshots"]), 3)
        for capture in manifest["screenshots"]:
            with self.subTest(file=capture["file"]):
                image = SEARCH_FILTERING_ASSETS / capture["file"]
                self.assertTrue(image.is_file())
                self.assertEqual(hashlib.sha256(image.read_bytes()).hexdigest(), capture["sha256"])
                self.assertIn(f"assets/okf-search-filtering-manual/{capture['file']}", manual)

    def test_svelte_graph_supports_record_type_grouping_and_metadata_reduction(self):
        source = (ROOT / "apps" / "okf-explorer" / "src" / "routes" / "+page.svelte").read_text(encoding="utf-8")

        self.assertIn("record-type-stack", source)
        self.assertIn("facet-stack", source)
        self.assertIn("Grouped by record type", source)
        self.assertIn("bestStackSubgroups", source)
        self.assertIn("largeExpandedGraphGroup", source)
        self.assertIn("largeGraphCenterRoute", source)
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
        self.assertIn("normaliseFacetSearchText", source)
        self.assertIn("activeFacetKey === key", source)
        self.assertIn("event?.ctrlKey || event?.metaKey || event?.shiftKey", source)

    def test_svelte_graph_has_distinct_node_icon_vocabulary(self):
        source = (ROOT / "apps" / "okf-explorer" / "src" / "routes" / "+page.svelte").read_text(encoding="utf-8")

        self.assertIn("node.type === 'publisher'", source)
        self.assertIn("node.type === 'format'", source)
        self.assertIn("node.type === 'topic'", source)
        self.assertIn("node.type === 'license'", source)
        self.assertIn("node.type === 'tag'", source)
        self.assertIn("node.type === 'host' || node.type === 'resource_type'", source)

    def test_svelte_timeline_and_relationship_drawer_are_interactive(self):
        source = (ROOT / "apps" / "okf-explorer" / "src" / "routes" / "+page.svelte").read_text(encoding="utf-8")
        styles = (ROOT / "apps" / "okf-explorer" / "src" / "routes" / "styles.css").read_text(encoding="utf-8")

        self.assertIn("TimelineResolution", source)
        self.assertIn("update_quarter", source)
        self.assertIn("currentTimelineBuckets", source)
        self.assertIn("Latest dated records first", source)
        self.assertIn("beginEdgePanelResize", source)
        self.assertIn("disabled={source?.kind === 'large' && !largeForwardRoute}", source)
        self.assertIn("--edge-panel-height", styles)
        self.assertIn(".edge-panel {\n  position: relative;\n  z-index: 3;", styles)
        self.assertIn("legend-shape", styles)


if __name__ == "__main__":
    unittest.main()
