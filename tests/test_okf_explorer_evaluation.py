from __future__ import annotations

import gzip
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
HERITAGE_EVALUATION = ROOT / "evaluation-foundry" / "fixtures" / "heritage-warwickshire"
SEARCH_FILTERING_MANUAL = ROOT / "docs" / "static-search-filtering-manual.md"
SEARCH_FILTERING_ASSETS = ROOT / "docs" / "assets" / "okf-search-filtering-manual"
HERITAGE_LOCAL_RECEIPT = HERITAGE_EVALUATION / "evidence" / "local-candidate-receipt.json"


class OkfExplorerEvaluationSuiteTest(unittest.TestCase):
    def test_heritage_local_candidate_receipt_binds_its_executed_results(self):
        receipt = json.loads(HERITAGE_LOCAL_RECEIPT.read_text(encoding="utf-8"))
        plane_roots = json.loads(
            (ROOT / "evaluation" / "heritage" / "assurance" / "plane-roots.json").read_text(
                encoding="utf-8"
            )
        )
        self.assertEqual(
            receipt["candidate"]["heritage_release_root_sha256"],
            plane_roots["release_root_sha256"],
        )
        generated_paths = [
            Path(entry["path"])
            for plane in plane_roots["planes"].values()
            for entry in plane["entries"]
        ]
        generated_paths.append(Path("assurance/plane-roots.json"))
        tree_entries = []
        for relative in sorted(generated_paths, key=lambda path: path.as_posix()):
            raw = (ROOT / "evaluation" / "heritage" / relative).read_bytes()
            tree_entries.append(
                {
                    "path": relative.as_posix(),
                    "bytes": len(raw),
                    "sha256": hashlib.sha256(raw).hexdigest(),
                }
            )
        canonical_tree = (
            json.dumps(
                tree_entries,
                ensure_ascii=False,
                separators=(",", ":"),
                sort_keys=True,
            )
            + "\n"
        ).encode("utf-8")
        self.assertEqual(receipt["determinism"]["files_per_build"], len(tree_entries))
        self.assertEqual(
            "sha256-over-canonical-json-path-bytes-digest-list-v1",
            receipt["determinism"]["comparison_tree_algorithm"],
        )
        self.assertEqual(
            receipt["determinism"]["comparison_tree_sha256"],
            hashlib.sha256(canonical_tree).hexdigest(),
        )

        for key, expected_status in (("question_suite", "passed"), ("local_journeys", "passed")):
            section = receipt[key]
            self.assertEqual(expected_status, section["status"])
            source = ROOT / section["suite" if key == "question_suite" else "manifest"]
            self.assertEqual(
                section["suite_sha256" if key == "question_suite" else "manifest_sha256"],
                hashlib.sha256(source.read_bytes()).hexdigest(),
            )
            compressed = HERITAGE_EVALUATION / section["result"]
            self.assertEqual(section["result_gzip_sha256"], hashlib.sha256(compressed.read_bytes()).hexdigest())
            raw = gzip.decompress(compressed.read_bytes())
            self.assertEqual(section["result_json_sha256"], hashlib.sha256(raw).hexdigest())
            result = json.loads(raw)
            if key == "question_suite":
                self.assertEqual(section["questions_run"], result["summary"]["questions_run"])
                self.assertEqual(section["average_total"], result["summary"]["average_total"])
                self.assertEqual(section["scores_at_least_80"], result["summary"]["pass_count_80"])
            else:
                summary = result["interaction_journeys"]["summary"]
                self.assertEqual(section["journeys_run"], summary["journeys_run"])
                self.assertEqual(section["passed"], summary["passed"])
                self.assertEqual(
                    section["journey_ids"],
                    [record["id"] for record in result["interaction_journeys"]["records"]],
                )

    def test_heritage_receipt_binds_exact_explorer_build_identity(self):
        receipt = json.loads(HERITAGE_LOCAL_RECEIPT.read_text(encoding="utf-8"))
        app_root = ROOT / "apps" / "okf-explorer" / "build"
        app_manifest_path = app_root / "okf-explorer-build-manifest.json"
        app_manifest_bytes = app_manifest_path.read_bytes()
        app_manifest = json.loads(app_manifest_bytes)
        app_materials = []
        for declared in app_manifest["materials"]:
            raw = (app_root / declared["path"]).read_bytes()
            app_materials.append(
                {
                    "path": declared["path"],
                    "bytes": len(raw),
                    "sha256": hashlib.sha256(raw).hexdigest(),
                }
            )
        app_tree_bytes = (
            json.dumps(
                app_materials,
                ensure_ascii=False,
                separators=(",", ":"),
            )
            + "\n"
        ).encode("utf-8")
        app_tree_sha256 = hashlib.sha256(app_tree_bytes).hexdigest()
        self.assertEqual(app_manifest["materials"], app_materials)
        self.assertEqual(app_manifest["tree_sha256"], app_tree_sha256)
        self.assertEqual(
            receipt["candidate"]["explorer_tree_sha256"],
            app_tree_sha256,
        )
        self.assertEqual(
            receipt["candidate"]["explorer_manifest_sha256"],
            hashlib.sha256(app_manifest_bytes).hexdigest(),
        )

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
        self.assertIn("function receiptUrl(value)", script)
        self.assertIn("receiptUrl(popup.url())", script)

    def test_heritage_suite_uses_exact_zero_bounds_and_source_grounded_positive_minimums(self):
        suite = json.loads((HERITAGE_EVALUATION / "questions.json").read_text(encoding="utf-8"))
        by_id = {question["id"]: question for question in suite["questions"]}

        exact_zero_ids = {"HQ031", "HQ032", "HQ033", "HQ080", "HQ099"}
        for question_id in exact_zero_ids:
            with self.subTest(question=question_id):
                self.assertEqual(by_id[question_id]["expected_min_results"], 0)
                self.assertEqual(by_id[question_id]["expected_max_results"], 0)

        positive_ids = {
            "HQ034", "HQ036", "HQ037", "HQ038", "HQ039", "HQ040", "HQ041", "HQ042",
            "HQ043", "HQ044", "HQ045", "HQ046", "HQ047", "HQ048", "HQ049", "HQ050",
            "HQ051", "HQ052", "HQ053", "HQ054", "HQ055", "HQ056", "HQ063", "HQ064",
            "HQ071", "HQ073", "HQ074", "HQ075", "HQ076", "HQ077", "HQ078", "HQ079",
            "HQ085", "HQ088", "HQ094", "HQ096", "HQ097", "HQ098",
        }
        for question_id in positive_ids:
            with self.subTest(question=question_id):
                self.assertEqual(by_id[question_id]["expected_min_results"], 1)
                self.assertNotIn("expected_max_results", by_id[question_id])

    def test_question_result_bounds_are_validated_and_reported(self):
        base_suite = json.loads((EVALUATION / "questions.json").read_text(encoding="utf-8"))
        with tempfile.TemporaryDirectory() as temporary_directory:
            temporary = Path(temporary_directory)
            invalid_suite = json.loads(json.dumps(base_suite))
            invalid_suite["questions"][0]["expected_min_results"] = 2
            invalid_suite["questions"][0]["expected_max_results"] = 1
            invalid_path = temporary / "invalid-questions.json"
            invalid_path.write_text(json.dumps(invalid_suite), encoding="utf-8")
            invalid_result = subprocess.run(
                [
                    "node",
                    str(ROOT / "scripts" / "evaluate_okf_explorer.mjs"),
                    "--no-browser",
                    "--suite",
                    str(invalid_path),
                    "--visual",
                    str(EVALUATION / "visual-regressions.json"),
                    "--out",
                    str(temporary / "invalid-results"),
                ],
                cwd=ROOT,
                check=False,
                capture_output=True,
                text=True,
            )
            self.assertNotEqual(invalid_result.returncode, 0)
            self.assertIn(
                "expected_max_results must be greater than or equal to expected_min_results",
                invalid_result.stderr,
            )

            output = temporary / "heritage-results"
            subprocess.run(
                [
                    "node",
                    str(ROOT / "scripts" / "evaluate_okf_explorer.mjs"),
                    "--no-browser",
                    "--suite",
                    str(HERITAGE_EVALUATION / "questions.json"),
                    "--visual",
                    str(EVALUATION / "visual-regressions.json"),
                    "--limit",
                    "31",
                    "--out",
                    str(output),
                ],
                cwd=ROOT,
                check=True,
                capture_output=True,
                text=True,
            )
            results = json.loads((output / "results.json").read_text(encoding="utf-8"))
            exact_zero = next(record for record in results["records"] if record["id"] == "HQ031")
            markdown = (output / "results.md").read_text(encoding="utf-8")

        self.assertEqual(exact_zero["score"]["checks"]["expected_min_results"], 0)
        self.assertEqual(exact_zero["score"]["checks"]["expected_max_results"], 0)
        self.assertIn("expected results: exactly 0", markdown)

    def test_heritage_suite_has_its_default_visual_contract(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            result = subprocess.run(
                [
                    "node",
                    str(ROOT / "scripts" / "evaluate_okf_explorer.mjs"),
                    "--no-browser",
                    "--suite",
                    str(HERITAGE_EVALUATION / "questions.json"),
                    "--limit",
                    "1",
                    "--out",
                    str(Path(temporary_directory) / "results"),
                ],
                cwd=ROOT,
                check=False,
                capture_output=True,
                text=True,
            )

        self.assertEqual(result.returncode, 0, result.stderr)

    def test_browser_scoring_requires_both_result_bounds(self):
        script = (ROOT / "scripts" / "evaluate_okf_explorer.mjs").read_text(encoding="utf-8")

        self.assertIn("const meetsExpectedMinimum = observation.resultCount >= expectedMin", script)
        self.assertIn("const meetsExpectedMaximum = expectedMax === null || observation.resultCount <= expectedMax", script)
        self.assertIn("const hasExpectedResults = meetsExpectedMinimum && meetsExpectedMaximum", script)

    def test_expected_empty_scoring_requires_retained_query_explicit_settled_evidence(self):
        script = (ROOT / "scripts" / "evaluate_okf_explorer.mjs").read_text(encoding="utf-8")

        self.assertIn("expectedMin === 0 && observation.resultCount === 0 && meetsExpectedMaximum", script)
        self.assertIn("queryRetained && explicitEmptySummary && explicitEmptyMessage && notLoadingStuck", script)
        self.assertIn("meaningfulBoundedEmpty ? 10 : Math.round(expectedRatio * 10)", script)
        self.assertIn("hasFollowOn || (meaningfulBoundedEmpty && emptyRecovery)", script)
        self.assertNotIn("expectedMin === 0 || observation.resultCount === 0", script)

    def test_live_evaluation_waits_for_cold_search_and_uses_accessible_edge_selection(self):
        script = (ROOT / "scripts" / "evaluate_okf_explorer.mjs").read_text(encoding="utf-8")

        self.assertIn("Preparing static search index", script)
        self.assertIn("Loading the record and resource index", script)
        self.assertIn("url_param_absent", script)
        self.assertIn("actual.some((value) => value.includes(String(assertion.value)))", script)
        self.assertIn("await edge.press('Enter')", script)
        self.assertIn(".edge-panel button.active", script)
        self.assertIn("await summary.press(resizeKey)", script)
        self.assertIn("input: 'keyboard'", script)
        self.assertIn("evidence.mapRecord?.markerCount", script)

    def test_live_journeys_follow_current_compact_facets_and_bounded_record_loading(self):
        script = (ROOT / "scripts" / "evaluate_okf_explorer.mjs").read_text(encoding="utf-8")

        self.assertIn("section.locator('.facet-toggle, summary').first()", script)
        self.assertIn("toggle.getAttribute('aria-expanded')", script)
        self.assertIn("await candidate.press('Enter')", script)
        self.assertIn("/^Load (?:full|selected) record$/", script)
        self.assertIn("if (await button.count())", script)
        self.assertIn(".right-panel .disclosure-section:visible", script)

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

    def test_explicit_bundle_overrides_the_journey_manifest_for_candidate_validation(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            output = Path(temporary_directory)
            candidate = "https://raw.example.test/candidate/bundle/okf-explorer.json"
            subprocess.run(
                [
                    "node",
                    str(ROOT / "scripts" / "evaluate_okf_explorer.mjs"),
                    "--no-browser",
                    "--journeys-only",
                    "--journeys",
                    str(LEGISLATION_EVALUATION / "journeys.json"),
                    "--bundle",
                    candidate,
                    "--out",
                    str(output),
                ],
                cwd=ROOT,
                check=True,
                capture_output=True,
                text=True,
            )
            results = json.loads((output / "results.json").read_text(encoding="utf-8"))

        self.assertEqual(results["bundle"], candidate)
        self.assertEqual(results["interaction_journeys"]["target_bundle"], candidate)

    def test_journey_validation_rejects_question_suites_without_string_ids(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            temporary = Path(temporary_directory)
            journeys = json.loads((LEGISLATION_EVALUATION / "journeys.json").read_text(encoding="utf-8"))
            questions = json.loads((LEGISLATION_EVALUATION / "questions.json").read_text(encoding="utf-8"))
            for question in questions["questions"]:
                question.pop("id", None)
            journeys["question_suite"] = "questions.json"
            (temporary / "journeys.json").write_text(json.dumps(journeys), encoding="utf-8")
            (temporary / "questions.json").write_text(json.dumps(questions), encoding="utf-8")

            result = subprocess.run(
                [
                    "node",
                    str(ROOT / "scripts" / "evaluate_okf_explorer.mjs"),
                    "--no-browser",
                    "--journeys-only",
                    "--journeys",
                    str(temporary / "journeys.json"),
                    "--out",
                    str(temporary / "results"),
                ],
                cwd=ROOT,
                check=False,
                capture_output=True,
                text=True,
            )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Journey question suite has no question ids.", result.stderr)

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
        self.assertIn("quarterForStamp", source)
        self.assertIn("currentTimelineBuckets", source)
        self.assertIn("Newest", source)
        self.assertIn("beginEdgePanelResize", source)
        self.assertIn("disabled={source?.kind === 'large' && !largeForwardRoute}", source)
        self.assertIn("--edge-panel-height", styles)
        self.assertIn(".edge-panel {\n  position: relative;\n  z-index: 3;", styles)
        self.assertIn("legend-shape", styles)


if __name__ == "__main__":
    unittest.main()
