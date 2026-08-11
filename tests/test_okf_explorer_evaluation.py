from __future__ import annotations

import copy
import gzip
import hashlib
import json
from datetime import datetime
from pathlib import Path
import subprocess
import tempfile
import unittest
from urllib.parse import parse_qs, urljoin, urlparse


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
    @staticmethod
    def _producer_materials() -> dict[str, object]:
        paths = (
            "requirements-okf.txt",
            "scripts/build_heritage_evaluation.py",
            "scripts/build_uk_government_api_okf.py",
            "scripts/heritage_build_io.py",
            "scripts/okf_semantic.py",
        )
        materials = []
        for relative in paths:
            raw = (ROOT / relative).read_bytes()
            materials.append(
                {
                    "path": relative,
                    "bytes": len(raw),
                    "sha256": hashlib.sha256(raw).hexdigest(),
                }
            )
        canonical = (
            json.dumps(materials, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
            + "\n"
        ).encode("utf-8")
        return {
            "schema": "okf-heritage-producer-materials.v1",
            "algorithm": "sha256-over-canonical-json-path-bytes-digest-list-v1",
            "file_count": len(materials),
            "bytes": sum(material["bytes"] for material in materials),
            "root_sha256": hashlib.sha256(canonical).hexdigest(),
            "materials": materials,
        }

    def _write_validation_journey(
        self,
        temporary: Path,
        action: dict,
        receipt: dict | None = None,
    ) -> Path:
        journeys = json.loads(
            (LEGISLATION_EVALUATION / "journeys.json").read_text(encoding="utf-8")
        )
        questions = json.loads(
            (LEGISLATION_EVALUATION / "questions.json").read_text(encoding="utf-8")
        )
        journeys["question_suite"] = "questions.json"
        journeys["journeys"][0]["actions"].append(action)
        journey_path = temporary / "journeys.json"
        journey_path.write_text(json.dumps(journeys), encoding="utf-8")
        (temporary / "questions.json").write_text(
            json.dumps(questions), encoding="utf-8"
        )
        if receipt is not None:
            receipt_path = temporary / action["receipt"]
            receipt_path.parent.mkdir(parents=True, exist_ok=True)
            receipt_path.write_text(json.dumps(receipt), encoding="utf-8")
        return journey_path

    @staticmethod
    def _genuine_browser_receipt(
        *,
        requested_url: str = "https://source.example.test/item?id=42",
        final_url: str = "https://source.example.test/item?id=42",
        expected_text: str = "Example identity",
    ) -> dict:
        return {
            "schema": "okf-genuine-browser-link-receipt.v1",
            "observed_at": "2026-08-03T12:00:00Z",
            "browser": {
                "channel": "interactive-chrome",
                "user_agent": "Example Chrome/150",
                "webdriver": False,
            },
            "records": [
                {
                    "observed_at": "2026-08-03T12:00:00Z",
                    "requested_url": requested_url,
                    "final_url": final_url,
                    "expected_text": expected_text,
                    "title": "Example identity page",
                    "response_status": 200,
                    "identity_matched": True,
                    "identity_source": "document.body.innerText",
                    "identity_excerpt": f"Verified page text: {expected_text.lower()}",
                }
            ],
        }

    def test_heritage_local_candidate_receipt_binds_its_executed_results(self):
        receipt = json.loads(HERITAGE_LOCAL_RECEIPT.read_text(encoding="utf-8"))
        self.assertEqual(
            {
                "schema",
                "observed_at",
                "scope",
                "producer_materials",
                "candidate",
                "publication_shell_rebind",
                "determinism",
                "question_suite",
                "local_journeys",
                "terminal_publication_gate",
            },
            set(receipt),
        )
        self.assertEqual("okf-heritage-local-candidate-receipt.v1", receipt["schema"])
        producer_materials = receipt["producer_materials"]
        self.assertEqual(
            self._producer_materials(),
            producer_materials,
        )
        self.assertEqual(
            {
                "snapshot",
                "generated_at",
                "heritage_descriptor_sha256",
                "heritage_release_root_sha256",
                "tiny_release_root_sha256",
                "synthetic_release_root_sha256",
                "explorer_tree_sha256",
                "explorer_manifest_sha256",
                "site_reading_pages",
                "site_internal_references",
                "site_file_count",
                "site_tree_algorithm",
                "site_tree_sha256",
                "site_size_gate",
            },
            set(receipt["candidate"]),
        )
        self.assertEqual(
            {
                "status",
                "change_class",
                "reused_unchanged_roots",
                "rerun_gates",
                "reused_gates",
                "rationale",
            },
            set(receipt["publication_shell_rebind"]),
        )
        self.assertEqual("passed", receipt["publication_shell_rebind"]["status"])
        self.assertEqual(
            "full-candidate-rebuild",
            receipt["publication_shell_rebind"]["change_class"],
        )
        self.assertEqual(
            [], receipt["publication_shell_rebind"]["reused_unchanged_roots"]
        )
        self.assertEqual([], receipt["publication_shell_rebind"]["reused_gates"])
        for root_name in receipt["publication_shell_rebind"][
            "reused_unchanged_roots"
        ]:
            self.assertRegex(receipt["candidate"][root_name], r"^[0-9a-f]{64}$")
        self.assertEqual(
            {
                "status",
                "builds",
                "files_per_build",
                "differences",
                "comparison_tree_algorithm",
                "comparison_tree_sha256",
                "corpora",
            },
            set(receipt["determinism"]),
        )
        self.assertEqual(
            {
                "status",
                "suite",
                "suite_sha256",
                "base_url",
                "bundle",
                "result",
                "result_gzip_sha256",
                "result_json_sha256",
                "questions_run",
                "questions_scored",
                "average_total",
                "average_retrieval",
                "average_display",
                "average_accessibility",
                "average_plain_language_and_government_style",
                "scores_at_least_80",
                "scores_below_60",
            },
            set(receipt["question_suite"]),
        )
        self.assertEqual(
            {
                "status",
                "manifest",
                "manifest_sha256",
                "base_url",
                "start_bundles",
                "result",
                "result_gzip_sha256",
                "result_json_sha256",
                "journeys_run",
                "passed",
                "failed",
                "errors",
                "validation_only",
                "journey_ids",
            },
            set(receipt["local_journeys"]),
        )
        self.assertEqual("passed", receipt["determinism"]["status"])
        self.assertEqual(1, receipt["determinism"]["builds"])
        self.assertEqual(0, receipt["determinism"]["differences"])
        self.assertEqual(
            "sha256-over-canonical-json-path-bytes-digest-list-v1",
            receipt["determinism"]["comparison_tree_algorithm"],
        )

        corpus_specs = {
            "faithful": (Path("evaluation/heritage"), "heritage_release_root_sha256"),
            "tiny": (Path("evaluation/heritage/tiny"), "tiny_release_root_sha256"),
            "synthetic": (
                Path("evaluation/heritage/synthetic"),
                "synthetic_release_root_sha256",
            ),
        }
        descriptors = {}
        for name, (corpus_path, candidate_root_key) in corpus_specs.items():
            corpus_root = ROOT / corpus_path
            plane_roots = json.loads(
                (corpus_root / "assurance" / "plane-roots.json").read_text(
                    encoding="utf-8"
                )
            )
            self.assertEqual(
                plane_roots["release_root_sha256"],
                receipt["candidate"][candidate_root_key],
            )
            generated_paths = [
                Path(entry["path"])
                for plane in plane_roots["planes"].values()
                for entry in plane["entries"]
            ]
            generated_paths.append(Path("assurance/plane-roots.json"))
            tree_entries = []
            for relative in sorted(generated_paths, key=lambda path: path.as_posix()):
                raw = (corpus_root / relative).read_bytes()
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
            observed_tree = hashlib.sha256(canonical_tree).hexdigest()
            determinism = receipt["determinism"]["corpora"][name]
            self.assertEqual(1, determinism["builds"])
            self.assertEqual(0, determinism["differences"])
            self.assertEqual(len(tree_entries), determinism["files_per_build"])
            self.assertEqual(observed_tree, determinism["comparison_tree_sha256"])
            if name == "faithful":
                self.assertEqual(len(tree_entries), receipt["determinism"]["files_per_build"])
                self.assertEqual(observed_tree, receipt["determinism"]["comparison_tree_sha256"])
            descriptor_bytes = (corpus_root / "okf-explorer.json").read_bytes()
            descriptors[name] = (json.loads(descriptor_bytes), descriptor_bytes)

        faithful_descriptor, faithful_bytes = descriptors["faithful"]
        self.assertEqual(faithful_descriptor["snapshot"], receipt["candidate"]["snapshot"])
        self.assertEqual(
            faithful_descriptor["generated_at"], receipt["candidate"]["generated_at"]
        )
        self.assertEqual(
            hashlib.sha256(faithful_bytes).hexdigest(),
            receipt["candidate"]["heritage_descriptor_sha256"],
        )

        candidate_time = datetime.fromisoformat(
            receipt["candidate"]["generated_at"].replace("Z", "+00:00")
        )
        receipt_time = datetime.fromisoformat(
            receipt["observed_at"].replace("Z", "+00:00")
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
            self.assertEqual("okf-explorer-evaluation-results.v1", result["schema"])
            self.assertEqual(section["base_url"], result["base_url"])
            expected_candidate_bundle_url = urljoin(
                section["base_url"], "publication/okf-explorer.json"
            )
            self.assertEqual(
                expected_candidate_bundle_url,
                result["metadata"]["candidate_bundle_url"],
            )
            self.assertEqual(
                {
                    "bundle_url": expected_candidate_bundle_url,
                    "descriptor_sha256": receipt["candidate"]["heritage_descriptor_sha256"],
                    "schema": faithful_descriptor["schema"],
                    "snapshot": receipt["candidate"]["snapshot"],
                    "generated_at": receipt["candidate"]["generated_at"],
                },
                result["candidate"],
            )
            evidence_time = datetime.fromisoformat(
                result["generated_at"].replace("Z", "+00:00")
            )
            self.assertLessEqual(candidate_time, evidence_time)
            self.assertLessEqual(evidence_time, receipt_time)
            if key == "question_suite":
                self.assertEqual(section["bundle"], result["bundle"])
                summary = result["summary"]
                for receipt_key, result_key in (
                    ("questions_run", "questions_run"),
                    ("questions_scored", "questions_scored"),
                    ("average_total", "average_total"),
                    ("average_retrieval", "average_retrieval"),
                    ("average_display", "average_display"),
                    ("average_accessibility", "average_accessibility"),
                    ("average_plain_language_and_government_style", "average_govuk"),
                    ("scores_at_least_80", "pass_count_80"),
                    ("scores_below_60", "fail_count_below_60"),
                ):
                    self.assertEqual(section[receipt_key], summary[result_key])
                self.assertEqual(100, section["scores_at_least_80"])
                self.assertEqual(0, section["scores_below_60"])
            else:
                summary = result["interaction_journeys"]["summary"]
                self.assertEqual(section["manifest"], result["interaction_journeys"]["manifest"])
                journey_manifest = json.loads(source.read_text(encoding="utf-8"))
                self.assertEqual(
                    "https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/okf-explorer.json",
                    journey_manifest["target_bundle"],
                )
                self.assertEqual("/okf-explorer.json", result["bundle"])
                self.assertEqual(result["bundle"], result["interaction_journeys"]["target_bundle"])
                records_by_id = {
                    record["id"]: record
                    for record in result["interaction_journeys"]["records"]
                }
                for journey_id, expected_bundle in zip(
                    section["journey_ids"], section["start_bundles"], strict=True
                ):
                    start_url = records_by_id[journey_id]["start_url"]
                    actual_bundle = parse_qs(urlparse(start_url).query)["bundle"][0]
                    self.assertEqual(expected_bundle, urlparse(actual_bundle).path)
                self.assertEqual(section["journeys_run"], summary["journeys_run"])
                self.assertEqual(section["passed"], summary["passed"])
                self.assertEqual(section["failed"], summary["failed"])
                self.assertEqual(section["errors"], summary["errors"])
                self.assertEqual(section["validation_only"], summary["validation_only"])
                self.assertEqual(0, section["failed"])
                self.assertEqual(0, section["errors"])
                self.assertEqual(0, section["validation_only"])
                self.assertEqual(
                    section["journey_ids"],
                    [record["id"] for record in result["interaction_journeys"]["records"]],
                )
                self.assertTrue(
                    all(
                        record["status"] == "passed"
                        for record in result["interaction_journeys"]["records"]
                    )
                )
                self.assertEqual(
                    section["start_bundles"],
                    [
                        urlparse(
                            parse_qs(urlparse(record["start_url"]).query)["bundle"][0]
                        ).path
                        for record in result["interaction_journeys"]["records"]
                    ],
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

    def test_browser_engine_selection_is_parsed_used_and_recorded(self):
        module_url = (ROOT / "scripts" / "evaluate_okf_explorer.mjs").as_uri()
        program = f"""
            import {{ parseArgs, selectPlaywrightBrowser }} from {json.dumps(module_url)};
            const calls = [];
            const playwright = Object.fromEntries(
              ['chromium', 'firefox', 'webkit'].map((name) => [
                name,
                {{ launch: () => calls.push(name) }}
              ])
            );
            const selected = {{}};
            for (const engine of ['chromium', 'firefox', 'webkit']) {{
              const options = parseArgs(['--no-browser', '--browser-engine', engine]);
              selected[engine] = options.browserEngine;
              selectPlaywrightBrowser(playwright, options.browserEngine).launch();
            }}
            console.log(JSON.stringify({{
              defaultEngine: parseArgs(['--no-browser']).browserEngine,
              selected,
              calls
            }}));
        """
        helper = subprocess.run(
            ["node", "--input-type=module", "--eval", program],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
        )
        parsed = json.loads(helper.stdout)
        self.assertEqual("chromium", parsed["defaultEngine"])
        self.assertEqual(
            {
                "chromium": "chromium",
                "firefox": "firefox",
                "webkit": "webkit",
            },
            parsed["selected"],
        )
        self.assertEqual(["chromium", "firefox", "webkit"], parsed["calls"])

    def test_evaluation_receipt_timestamp_matches_python_microsecond_rendering(self):
        module_url = (ROOT / "scripts" / "evaluate_okf_explorer.mjs").as_uri()
        program = f"""
            import {{ resultTimestamp }} from {json.dumps(module_url)};
            console.log(resultTimestamp(new Date('2026-08-04T12:02:13.149Z')));
        """
        helper = subprocess.run(
            ["node", "--input-type=module", "--eval", program],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
        )
        self.assertEqual("2026-08-04T12:02:13.149000Z", helper.stdout.strip())

        with tempfile.TemporaryDirectory() as temporary_directory:
            output = Path(temporary_directory) / "results"
            subprocess.run(
                [
                    "node",
                    str(ROOT / "scripts" / "evaluate_okf_explorer.mjs"),
                    "--no-browser",
                    "--browser-engine",
                    "firefox",
                    "--limit",
                    "1",
                    "--out",
                    str(output),
                ],
                cwd=ROOT,
                check=True,
                capture_output=True,
                text=True,
            )
            receipt = json.loads(
                (output / "results.json").read_text(encoding="utf-8")
            )
        self.assertEqual("firefox", receipt["metadata"]["browser_engine"])
        self.assertEqual("not-run", receipt["metadata"]["browser"])

        invalid = subprocess.run(
            [
                "node",
                str(ROOT / "scripts" / "evaluate_okf_explorer.mjs"),
                "--no-browser",
                "--browser-engine",
                "safari",
            ],
            cwd=ROOT,
            capture_output=True,
            text=True,
        )
        self.assertNotEqual(0, invalid.returncode)
        self.assertIn("chromium, firefox or webkit", invalid.stderr)

        script = (ROOT / "scripts" / "evaluate_okf_explorer.mjs").read_text(
            encoding="utf-8"
        )
        self.assertEqual(
            2,
            script.count("const browser = await launchSelectedBrowser(options);"),
        )

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
        self.assertEqual(results["metadata"]["candidate_bundle_url"], candidate)
        start_url = results["interaction_journeys"]["records"][0]["start_url"]
        self.assertEqual(parse_qs(urlparse(start_url).query)["bundle"], [candidate])

    def test_bundle_root_preserves_per_journey_bundle_below_a_pages_project_path(self):
        canonical_root = "https://pages.example.test/okf-explorer/"
        for bundle_root in (canonical_root, canonical_root.rstrip("/")):
            with self.subTest(bundle_root=bundle_root):
                with tempfile.TemporaryDirectory() as temporary_directory:
                    output = Path(temporary_directory)
                    subprocess.run(
                        [
                            "node",
                            str(ROOT / "scripts" / "evaluate_okf_explorer.mjs"),
                            "--no-browser",
                            "--journeys-only",
                            "--journeys",
                            str(HERITAGE_EVALUATION / "journeys.json"),
                            "--bundle-root",
                            bundle_root,
                            "--journey-limit",
                            "1",
                            "--out",
                            str(output),
                        ],
                        cwd=ROOT,
                        check=True,
                        capture_output=True,
                        text=True,
                    )
                    results = json.loads(
                        (output / "results.json").read_text(encoding="utf-8")
                    )

                start_url = results["interaction_journeys"]["records"][0][
                    "start_url"
                ]
                self.assertEqual(
                    parse_qs(urlparse(start_url).query)["bundle"],
                    [f"{canonical_root}tiny/okf-explorer.json"],
                )

    def test_candidate_bundle_binds_receipt_without_overriding_per_journey_starts(self):
        candidate = "/okf-explorer.json"
        with tempfile.TemporaryDirectory() as temporary_directory:
            output = Path(temporary_directory)
            subprocess.run(
                [
                    "node",
                    str(ROOT / "scripts" / "evaluate_okf_explorer.mjs"),
                    "--no-browser",
                    "--journeys-only",
                    "--journeys",
                    str(HERITAGE_EVALUATION / "journeys.json"),
                    "--candidate-bundle",
                    candidate,
                    "--bundle-root",
                    "http://127.0.0.1:8002/evaluation/heritage/",
                    "--journey-limit",
                    "3",
                    "--out",
                    str(output),
                ],
                cwd=ROOT,
                check=True,
                capture_output=True,
                text=True,
            )
            results = json.loads((output / "results.json").read_text(encoding="utf-8"))

        self.assertEqual(candidate, results["bundle"])
        self.assertEqual(candidate, results["interaction_journeys"]["target_bundle"])
        self.assertEqual(
            "http://127.0.0.1:8002/evaluation/heritage/okf-explorer.json",
            results["metadata"]["candidate_bundle_url"],
        )
        self.assertEqual(
            [
                "http://127.0.0.1:8002/evaluation/heritage/tiny/okf-explorer.json",
                "http://127.0.0.1:8002/evaluation/heritage/okf-explorer.json",
                "http://127.0.0.1:8002/evaluation/heritage/synthetic/okf-explorer.json",
            ],
            [
                parse_qs(urlparse(record["start_url"]).query)["bundle"][0]
                for record in results["interaction_journeys"]["records"]
            ],
        )

    def test_absolute_candidate_bundle_remains_exact_with_a_bundle_root(self):
        candidate = "https://assets.example.test/releases/heritage/okf-explorer.json"
        with tempfile.TemporaryDirectory() as temporary_directory:
            output = Path(temporary_directory) / "results"
            subprocess.run(
                [
                    "node",
                    str(ROOT / "scripts" / "evaluate_okf_explorer.mjs"),
                    "--no-browser",
                    "--journeys-only",
                    "--journeys",
                    str(HERITAGE_EVALUATION / "journeys.json"),
                    "--candidate-bundle",
                    candidate,
                    "--bundle-root",
                    "https://pages.example.test/okf-explorer",
                    "--journey-limit",
                    "1",
                    "--out",
                    str(output),
                ],
                cwd=ROOT,
                check=True,
                capture_output=True,
                text=True,
            )
            results = json.loads((output / "results.json").read_text(encoding="utf-8"))

        self.assertEqual(candidate, results["metadata"]["candidate_bundle_url"])

    def test_root_relative_explicit_bundle_uses_the_normalized_bundle_root(self):
        candidate = "/evaluation/heritage/okf-explorer.json"
        with tempfile.TemporaryDirectory() as temporary_directory:
            output = Path(temporary_directory) / "results"
            subprocess.run(
                [
                    "node",
                    str(ROOT / "scripts" / "evaluate_okf_explorer.mjs"),
                    "--no-browser",
                    "--journeys-only",
                    "--journeys",
                    str(HERITAGE_EVALUATION / "journeys.json"),
                    "--bundle",
                    candidate,
                    "--bundle-root",
                    "https://pages.example.test/okf-explorer",
                    "--journey-limit",
                    "1",
                    "--out",
                    str(output),
                ],
                cwd=ROOT,
                check=True,
                capture_output=True,
                text=True,
            )
            results = json.loads((output / "results.json").read_text(encoding="utf-8"))

        self.assertEqual(
            "https://pages.example.test/okf-explorer/evaluation/heritage/okf-explorer.json",
            results["metadata"]["candidate_bundle_url"],
        )

    def test_journey_id_runs_only_the_requested_terminal_gate(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            output = Path(temporary_directory)
            subprocess.run(
                [
                    "node",
                    str(ROOT / "scripts" / "evaluate_okf_explorer.mjs"),
                    "--no-browser",
                    "--journeys-only",
                    "--journeys",
                    str(HERITAGE_EVALUATION / "journeys.json"),
                    "--journey-id",
                    "journey-publication",
                    "--out",
                    str(output),
                ],
                cwd=ROOT,
                check=True,
                capture_output=True,
                text=True,
            )
            results = json.loads((output / "results.json").read_text(encoding="utf-8"))

        records = results["interaction_journeys"]["records"]
        self.assertEqual([record["id"] for record in records], ["journey-publication"])

    def test_generated_heritage_journey_copy_is_self_contained(self):
        generated = ROOT / "evaluation" / "heritage"
        with tempfile.TemporaryDirectory() as temporary_directory:
            output = Path(temporary_directory)
            subprocess.run(
                [
                    "node",
                    str(ROOT / "scripts" / "evaluate_okf_explorer.mjs"),
                    "--no-browser",
                    "--defer-browser-receipts",
                    "--journeys-only",
                    "--journeys",
                    str(generated / "journeys.json"),
                    "--journey-id",
                    "journey-publication",
                    "--out",
                    str(output),
                ],
                cwd=ROOT,
                check=True,
                capture_output=True,
                text=True,
            )
            results = json.loads((output / "results.json").read_text(encoding="utf-8"))

        self.assertEqual(
            ["journey-publication"],
            [record["id"] for record in results["interaction_journeys"]["records"]],
        )

    def test_journey_specific_options_require_a_journey_manifest(self):
        for option, value in (
            ("--journey-id", "journey-publication"),
            ("--bundle-root", "https://pages.example.test/okf-explorer/"),
            ("--candidate-bundle", "/evaluation/heritage/okf-explorer.json"),
            ("--candidate-receipt", "evidence/local-candidate-receipt.json"),
            ("--verification-delay-ms", "1000"),
        ):
            with self.subTest(option=option):
                result = subprocess.run(
                    [
                        "node",
                        str(ROOT / "scripts" / "evaluate_okf_explorer.mjs"),
                        "--no-browser",
                        option,
                        value,
                    ],
                    cwd=ROOT,
                    capture_output=True,
                    text=True,
                )
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(f"{option} requires --journeys", result.stderr)

    def test_verification_delay_is_bounded_and_integral(self):
        for value in ("-1", "10001", "1.5", "not-a-number"):
            with self.subTest(value=value):
                result = subprocess.run(
                    [
                        "node",
                        str(ROOT / "scripts" / "evaluate_okf_explorer.mjs"),
                        "--no-browser",
                        "--journeys-only",
                        "--journeys",
                        str(HERITAGE_EVALUATION / "journeys.json"),
                        "--verification-delay-ms",
                        value,
                    ],
                    cwd=ROOT,
                    capture_output=True,
                    text=True,
                )
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("integer from 0 to 10000", result.stderr)

    def test_candidate_fetch_has_an_abort_timeout_and_clear_timeout_failure(self):
        module_url = (ROOT / "scripts" / "evaluate_okf_explorer.mjs").as_uri()
        program = f"""
            import {{ inspectCandidate }} from {json.dumps(module_url)};
            let signalProvided = false;
            globalThis.fetch = async (_url, options) => {{
              signalProvided = Boolean(options?.signal);
              const error = new Error('simulated timeout');
              error.name = 'TimeoutError';
              throw error;
            }};
            let message = '';
            try {{
              await inspectCandidate({{
                bundle: '/evaluation/heritage/okf-explorer.json',
                bundleRoot: 'https://pages.example.test/okf-explorer/',
                baseUrl: 'https://pages.example.test/okf-explorer/'
              }});
            }} catch (error) {{
              message = error.message;
            }}
            if (!signalProvided || !message) throw new Error('timeout contract was not exercised');
            globalThis.fetch = async () => ({{
              ok: true,
              arrayBuffer: async () => {{
                const error = new Error('simulated body timeout');
                error.name = 'AbortError';
                throw error;
              }}
            }});
            let bodyMessage = '';
            try {{
              await inspectCandidate({{
                bundle: '/evaluation/heritage/okf-explorer.json',
                bundleRoot: 'https://pages.example.test/okf-explorer/',
                baseUrl: 'https://pages.example.test/okf-explorer/'
              }});
            }} catch (error) {{
              bodyMessage = error.message;
            }}
            if (!bodyMessage) throw new Error('body timeout contract was not exercised');
            console.log(message);
            console.log(bodyMessage);
        """
        result = subprocess.run(
            ["node", "--input-type=module", "--eval", program],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
        )

        self.assertEqual(2, result.stdout.count("timed out after 30000 ms"))
        self.assertIn(
            "https://pages.example.test/okf-explorer/evaluation/heritage/okf-explorer.json",
            result.stdout,
        )

    def test_candidate_fetch_rejects_redirects_without_following_them(self):
        module_url = (ROOT / "scripts" / "evaluate_okf_explorer.mjs").as_uri()
        program = f"""
            import {{ inspectCandidate }} from {json.dumps(module_url)};
            let redirectMode = '';
            globalThis.fetch = async (url, options) => {{
              redirectMode = options?.redirect || '';
              return {{
                ok: false,
                status: 302,
                url: url.toString(),
                arrayBuffer: async () => new ArrayBuffer(0)
              }};
            }};
            let message = '';
            try {{
              await inspectCandidate({{
                bundle: '/evaluation/heritage/okf-explorer.json',
                bundleRoot: 'https://pages.example.test/okf-explorer/',
                baseUrl: 'https://pages.example.test/okf-explorer/'
              }});
            }} catch (error) {{
              message = error.message;
            }}
            if (redirectMode !== 'manual') throw new Error('candidate redirects were not disabled');
            if (!message) throw new Error('candidate redirect was accepted');
            console.log(message);
        """
        result = subprocess.run(
            ["node", "--input-type=module", "--eval", program],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
        )

        self.assertIn("redirected with HTTP 302", result.stdout)
        self.assertIn("exact deployed URL", result.stdout)

    def test_candidate_receipt_accepts_exact_descriptor_and_rejects_stale_bytes(self):
        descriptor = {
            "schema": "heritage-evaluation-large-corpus.v1",
            "snapshot": "snapshot-exact",
            "generated_at": "2026-08-03T12:00:00Z",
            "entrypoints": {"plane_roots": "assurance/plane-roots.json"},
        }
        descriptor_bytes = (json.dumps(descriptor, separators=(",", ":")) + "\n").encode()
        descriptor_sha256 = hashlib.sha256(descriptor_bytes).hexdigest()
        release_root_sha256 = "b" * 64
        plane_roots = {"release_root_sha256": release_root_sha256}
        plane_roots_bytes = (
            json.dumps(plane_roots, separators=(",", ":")) + "\n"
        ).encode()
        receipt = {
            "schema": "okf-heritage-local-candidate-receipt.v1",
            "observed_at": "2026-08-03T12:01:00Z",
            "producer_materials": self._producer_materials(),
            "candidate": {
                "heritage_descriptor_sha256": descriptor_sha256,
                "heritage_release_root_sha256": release_root_sha256,
            },
        }
        module_url = (ROOT / "scripts" / "evaluate_okf_explorer.mjs").as_uri()

        with tempfile.TemporaryDirectory() as temporary_directory:
            receipt_path = Path(temporary_directory) / "candidate-receipt.json"
            receipt_path.write_text(json.dumps(receipt), encoding="utf-8")
            program = f"""
                import {{ inspectCandidate, loadCandidateReceipt }} from {json.dumps(module_url)};
                const descriptor = Buffer.from({json.dumps(descriptor_bytes.decode())}, 'utf8');
                const planeRoots = Buffer.from({json.dumps(plane_roots_bytes.decode())}, 'utf8');
                const candidateUrl = 'https://pages.example.test/okf-explorer/evaluation/heritage/okf-explorer.json';
                const planeRootsUrl = 'https://pages.example.test/okf-explorer/evaluation/heritage/assurance/plane-roots.json';
                globalThis.fetch = async (url, options) => ({{
                  ok: true,
                  status: 200,
                  url: url.toString(),
                  arrayBuffer: async () => url.toString() === planeRootsUrl ? planeRoots : descriptor
                }});
                const options = {{
                  bundle: '/evaluation/heritage/okf-explorer.json',
                  bundleRoot: 'https://pages.example.test/okf-explorer/',
                  baseUrl: 'https://pages.example.test/okf-explorer/'
                }};
                const receipt = loadCandidateReceipt({json.dumps(str(receipt_path))});
                const exact = await inspectCandidate(options, receipt);
                let staleMessage = '';
                try {{
                  await inspectCandidate(options, {{
                    ...receipt,
                    expected_descriptor_sha256: '0'.repeat(64)
                  }});
                }} catch (error) {{
                  staleMessage = error.message;
                }}
                if (!staleMessage) throw new Error('stale descriptor bytes were accepted');
                let staleReleaseMessage = '';
                try {{
                  await inspectCandidate(options, {{
                    ...receipt,
                    expected_release_root_sha256: '0'.repeat(64)
                  }});
                }} catch (error) {{
                  staleReleaseMessage = error.message;
                }}
                if (!staleReleaseMessage) throw new Error('stale release root was accepted');
                console.log(JSON.stringify({{ exact, staleMessage, staleReleaseMessage }}));
            """
            result = subprocess.run(
                ["node", "--input-type=module", "--eval", program],
                cwd=ROOT,
                check=True,
                capture_output=True,
                text=True,
            )
        payload = json.loads(result.stdout)

        self.assertEqual(descriptor_sha256, payload["exact"]["descriptor_sha256"])
        self.assertEqual(
            descriptor_sha256,
            payload["exact"]["candidate_receipt"]["expected_descriptor_sha256"],
        )
        self.assertRegex(
            payload["exact"]["candidate_receipt"]["raw_sha256"],
            r"^[0-9a-f]{64}$",
        )
        self.assertEqual(
            release_root_sha256,
            payload["exact"]["release_root"]["release_root_sha256"],
        )
        self.assertRegex(
            payload["exact"]["release_root"]["plane_roots_sha256"],
            r"^[0-9a-f]{64}$",
        )
        self.assertIn("differs from the local candidate receipt", payload["staleMessage"])
        self.assertIn(
            "release root differs from the local candidate receipt",
            payload["staleReleaseMessage"],
        )

    def test_publication_candidate_binds_exact_site_manifest_tree_and_materials(self):
        descriptor = {
            "schema": "heritage-evaluation-large-corpus.v1",
            "snapshot": "snapshot-publication",
            "generated_at": "2026-08-04T09:00:00Z",
            "entrypoints": {"plane_roots": "assurance/plane-roots.json"},
        }
        descriptor_bytes = (
            json.dumps(descriptor, separators=(",", ":")) + "\n"
        ).encode()
        descriptor_sha256 = hashlib.sha256(descriptor_bytes).hexdigest()
        release_root_sha256 = "b" * 64
        plane_roots = {"release_root_sha256": release_root_sha256}
        plane_roots_bytes = (
            json.dumps(plane_roots, separators=(",", ":")) + "\n"
        ).encode()
        plane_roots_sha256 = hashlib.sha256(plane_roots_bytes).hexdigest()

        def canonical_json(value: object) -> bytes:
            return (
                json.dumps(
                    value,
                    ensure_ascii=False,
                    separators=(",", ":"),
                    sort_keys=True,
                )
                + "\n"
            ).encode()

        def publication_manifest(materials: list[dict]) -> tuple[dict, bytes]:
            manifest = {
                "schema": "okf-publication-unit-manifest.v1",
                "algorithm": "sha256-canonical-json-materials-v1",
                "file_count": len(materials),
                "tree_sha256": hashlib.sha256(canonical_json(materials)).hexdigest(),
                "materials": materials,
            }
            raw = (
                json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True)
                + "\n"
            ).encode()
            return manifest, raw

        materials = [
            {
                "path": "assurance/plane-roots.json",
                "bytes": len(plane_roots_bytes),
                "sha256": plane_roots_sha256,
            },
            {
                "path": "okf-explorer.json",
                "bytes": len(descriptor_bytes),
                "sha256": descriptor_sha256,
            },
        ]
        manifest, manifest_bytes = publication_manifest(materials)
        manifest_sha256 = hashlib.sha256(manifest_bytes).hexdigest()

        def material_tamper(path: str, field: str, value: object) -> tuple[dict, bytes]:
            changed = json.loads(json.dumps(materials))
            next(item for item in changed if item["path"] == path)[field] = value
            return publication_manifest(changed)

        descriptor_sha_manifest, descriptor_sha_bytes = material_tamper(
            "okf-explorer.json", "sha256", "0" * 64
        )
        descriptor_size_manifest, descriptor_size_bytes = material_tamper(
            "okf-explorer.json", "bytes", len(descriptor_bytes) + 1
        )
        roots_sha_manifest, roots_sha_bytes = material_tamper(
            "assurance/plane-roots.json", "sha256", "0" * 64
        )
        roots_size_manifest, roots_size_bytes = material_tamper(
            "assurance/plane-roots.json", "bytes", len(plane_roots_bytes) + 1
        )
        corrupt_tree = json.loads(json.dumps(manifest))
        corrupt_tree["tree_sha256"] = "0" * 64
        corrupt_tree_bytes = (
            json.dumps(corrupt_tree, ensure_ascii=False, indent=2, sort_keys=True)
            + "\n"
        ).encode()

        def case(
            raw: bytes,
            declared_manifest: dict,
            *,
            overrides: dict | None = None,
            mode: str = "normal",
        ) -> dict:
            return {
                "manifest": raw.decode(),
                "mode": mode,
                "overrides": {
                    "expected_publication_manifest_sha256": hashlib.sha256(
                        raw
                    ).hexdigest(),
                    "expected_site_tree_sha256": declared_manifest["tree_sha256"],
                    "expected_site_file_count": declared_manifest["file_count"],
                    **(overrides or {}),
                },
            }

        cases = {
            "raw_receipt": case(
                manifest_bytes,
                manifest,
                overrides={"expected_publication_manifest_sha256": "0" * 64},
            ),
            "tree_receipt": case(
                manifest_bytes,
                manifest,
                overrides={"expected_site_tree_sha256": "0" * 64},
            ),
            "count_receipt": case(
                manifest_bytes,
                manifest,
                overrides={"expected_site_file_count": len(materials) + 1},
            ),
            "tree_recomputed": case(corrupt_tree_bytes, corrupt_tree),
            "descriptor_sha": case(descriptor_sha_bytes, descriptor_sha_manifest),
            "descriptor_bytes": case(descriptor_size_bytes, descriptor_size_manifest),
            "plane_sha": case(roots_sha_bytes, roots_sha_manifest),
            "plane_bytes": case(roots_size_bytes, roots_size_manifest),
            "redirect": case(manifest_bytes, manifest, mode="redirect"),
            "origin": case(manifest_bytes, manifest, mode="origin"),
            "credentials": case(manifest_bytes, manifest, mode="credentials"),
            "fragment": case(manifest_bytes, manifest, mode="fragment"),
        }
        receipt = {
            "schema": "okf-publication-validation-receipt.v1",
            "status": "passed",
            "observed_at": "2026-08-04T09:01:00Z",
            "subject": {
                "publication_manifest_sha256": manifest_sha256,
                "site_tree_sha256": manifest["tree_sha256"],
                "site_file_count": manifest["file_count"],
            },
            "candidate": {
                "heritage_descriptor_sha256": descriptor_sha256,
                "heritage_release_root_sha256": release_root_sha256,
            },
        }
        module_url = (ROOT / "scripts" / "evaluate_okf_explorer.mjs").as_uri()
        with tempfile.TemporaryDirectory() as temporary_directory:
            receipt_path = Path(temporary_directory) / "publication-receipt.json"
            receipt_path.write_text(json.dumps(receipt), encoding="utf-8")
            program = f"""
                import {{ inspectCandidate, loadCandidateReceipt }} from {json.dumps(module_url)};
                const descriptor = Buffer.from({json.dumps(descriptor_bytes.decode())}, 'utf8');
                const planeRoots = Buffer.from({json.dumps(plane_roots_bytes.decode())}, 'utf8');
                const manifest = Buffer.from({json.dumps(manifest_bytes.decode())}, 'utf8');
                const cases = {json.dumps(cases)};
                const candidateUrl = 'https://pages.example.test/publication/okf-explorer.json';
                const planeRootsUrl = 'https://pages.example.test/publication/assurance/plane-roots.json';
                const manifestUrl = 'https://pages.example.test/publication/publication-unit-manifest.json';
                let active = {{ manifest: manifest.toString('utf8'), mode: 'normal', overrides: {{}} }};
                const redirectModes = [];
                globalThis.fetch = async (url, options) => {{
                  const requested = url.toString();
                  if (requested === candidateUrl) {{
                    return {{ ok: true, status: 200, url: requested, arrayBuffer: async () => descriptor }};
                  }}
                  if (requested === planeRootsUrl) {{
                    return {{ ok: true, status: 200, url: requested, arrayBuffer: async () => planeRoots }};
                  }}
                  if (requested !== manifestUrl) throw new Error(`unexpected URL ${{requested}}`);
                  redirectModes.push(options?.redirect || '');
                  if (active.mode === 'redirect') {{
                    return {{ ok: false, status: 302, url: requested, arrayBuffer: async () => Buffer.alloc(0) }};
                  }}
                  const finalUrl = active.mode === 'origin'
                    ? 'https://other.example.test/publication/publication-unit-manifest.json'
                    : active.mode === 'credentials'
                      ? 'https://user:secret@pages.example.test/publication/publication-unit-manifest.json'
                      : active.mode === 'fragment'
                        ? `${{requested}}#not-exact`
                      : requested;
                  return {{
                    ok: true,
                    status: 200,
                    url: finalUrl,
                    arrayBuffer: async () => Buffer.from(active.manifest, 'utf8')
                  }};
                }};
                const options = {{
                  bundle: candidateUrl,
                  bundleRoot: 'https://pages.example.test/publication/',
                  baseUrl: 'https://pages.example.test/explorer/'
                }};
                const receipt = loadCandidateReceipt({json.dumps(str(receipt_path))});
                const exact = await inspectCandidate(options, receipt);
                const messages = {{}};
                for (const [name, definition] of Object.entries(cases)) {{
                  active = definition;
                  try {{
                    await inspectCandidate(options, {{ ...receipt, ...definition.overrides }});
                  }} catch (error) {{
                    messages[name] = error.message;
                  }}
                  if (!messages[name]) throw new Error(`tampering case was accepted: ${{name}}`);
                }}
                if (redirectModes.some((mode) => mode !== 'manual')) {{
                  throw new Error('publication manifest redirects were not disabled');
                }}
                console.log(JSON.stringify({{ exact, messages }}));
            """
            result = subprocess.run(
                ["node", "--input-type=module", "--eval", program],
                cwd=ROOT,
                check=True,
                capture_output=True,
                text=True,
            )
        payload = json.loads(result.stdout)
        site = payload["exact"]["site_artifact"]

        self.assertEqual(manifest_sha256, site["publication_manifest_sha256"])
        self.assertEqual(manifest["tree_sha256"], site["tree_sha256"])
        self.assertEqual(len(materials), site["file_count"])
        self.assertEqual("okf-explorer.json", site["materials"]["descriptor"]["path"])
        self.assertEqual(
            "assurance/plane-roots.json",
            site["materials"]["plane_roots"]["path"],
        )
        self.assertEqual(
            manifest_sha256,
            payload["exact"]["candidate_receipt"][
                "expected_publication_manifest_sha256"
            ],
        )
        messages = payload["messages"]
        self.assertIn("manifest SHA-256 differs", messages["raw_receipt"])
        self.assertIn("Site tree differs", messages["tree_receipt"])
        self.assertIn("Site file count differs", messages["count_receipt"])
        self.assertIn("tree digest differs", messages["tree_recomputed"])
        self.assertIn("descriptor material SHA-256 differs", messages["descriptor_sha"])
        self.assertIn("descriptor material byte count differs", messages["descriptor_bytes"])
        self.assertIn("plane-roots material SHA-256 differs", messages["plane_sha"])
        self.assertIn("plane-roots material byte count differs", messages["plane_bytes"])
        self.assertIn("redirected with HTTP 302", messages["redirect"])
        self.assertIn("unexpected origin", messages["origin"])
        self.assertIn("must not contain credentials", messages["credentials"])
        self.assertIn("must not contain a fragment", messages["fragment"])

    def test_publication_candidate_cannot_decouple_from_start_or_public_url(self):
        journeys = json.loads(
            (HERITAGE_EVALUATION / "journeys.json").read_text(encoding="utf-8")
        )
        module_url = (ROOT / "scripts" / "evaluate_okf_explorer.mjs").as_uri()
        candidate_receipt = {
            "expected_descriptor_sha256": "a" * 64,
        }
        options = {
            "bundle": journeys["target_bundle"],
            "bundleRoot": "https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/",
            "baseUrl": "https://chris-page-gov.github.io/okf-explorer/",
            "bundleExplicit": False,
            "journeyIds": ["journey-publication"],
            "journeyLimit": 100,
        }
        program = f"""
            import {{ assertPublicationCandidateBinding }} from {json.dumps(module_url)};
            const journeys = {json.dumps(journeys)};
            const exact = {json.dumps(options)};
            const receipt = {json.dumps(candidate_receipt)};
            let missingReceiptMessage = '';
            try {{
              assertPublicationCandidateBinding(exact, journeys, null);
            }} catch (error) {{
              missingReceiptMessage = error.message;
            }}
            if (!missingReceiptMessage) throw new Error('publication accepted no candidate receipt');
            assertPublicationCandidateBinding(exact, journeys, receipt);
            const rogueAuxiliary = structuredClone(journeys);
            rogueAuxiliary.journeys
              .find((journey) => journey.id === 'journey-publication')
              .actions.find((action) => action.sequence === 29).value =
                'https://chris-page-gov.github.io/okf-explorer/?bundle=https%3A%2F%2Fassets.example.test%2Fundocumented.json';
            let rogueAuxiliaryMessage = '';
            try {{
              assertPublicationCandidateBinding(exact, rogueAuxiliary, receipt);
            }} catch (error) {{
              rogueAuxiliaryMessage = error.message;
            }}
            if (!rogueAuxiliaryMessage) throw new Error('publication accepted an undeclared auxiliary bundle');
            const failures = [];
            for (const changed of [
              {{
                ...exact,
                bundle: '/okf-explorer.json',
                bundleRoot: 'https://pages.example.test/other-project/'
              }},
              {{
                ...exact,
                bundle: 'https://assets.example.test/releases/other.json'
              }},
              {{
                ...exact,
                bundle: 'https://assets.example.test/releases/other.json',
                bundleExplicit: true
              }},
              {{ ...exact, baseUrl: 'https://pages.example.test/okf-explorer/' }}
            ]) {{
              try {{
                assertPublicationCandidateBinding(changed, journeys, receipt);
              }} catch (error) {{
                failures.push(error.message);
              }}
            }}
            if (failures.length !== 4) throw new Error('publication binding accepted decoupled inputs');
            console.log(JSON.stringify({{ missingReceiptMessage, rogueAuxiliaryMessage, failures }}));
        """
        result = subprocess.run(
            ["node", "--input-type=module", "--eval", program],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
        )
        payload = json.loads(result.stdout)
        failures = payload["failures"]

        self.assertIn("requires --candidate-receipt", payload["missingReceiptMessage"])
        self.assertIn("undeclared auxiliary bundle", payload["rogueAuxiliaryMessage"])
        self.assertTrue(
            any("candidate/public URL binding" in message for message in failures)
        )
        self.assertTrue(
            any("candidate/start binding" in message for message in failures)
        )
        self.assertTrue(any("base URL" in message for message in failures))

    def test_candidate_receipt_rejects_wrong_schema_and_digest_shape(self):
        module_url = (ROOT / "scripts" / "evaluate_okf_explorer.mjs").as_uri()
        invalid_receipts = (
            (
                {
                    "schema": "self-attested-candidate.v1",
                    "observed_at": "2026-08-03T12:00:00Z",
                    "candidate": {
                        "heritage_descriptor_sha256": "a" * 64,
                        "heritage_release_root_sha256": "b" * 64,
                    },
                },
                "schema must be okf-heritage-local-candidate-receipt.v1",
            ),
            (
                {
                    "schema": "okf-heritage-local-candidate-receipt.v1",
                    "observed_at": "2026-08-03T12:00:00Z",
                    "candidate": {
                        "heritage_descriptor_sha256": "not-a-digest",
                        "heritage_release_root_sha256": "b" * 64,
                    },
                },
                "candidate.heritage_descriptor_sha256",
            ),
            (
                {
                    "schema": "okf-heritage-local-candidate-receipt.v1",
                    "observed_at": "2026-08-03T12:00:00Z",
                    "candidate": {
                        "heritage_descriptor_sha256": "a" * 64,
                        "heritage_release_root_sha256": "not-a-digest",
                    },
                },
                "candidate.heritage_release_root_sha256",
            ),
            (
                {
                    "schema": "okf-publication-validation-receipt.v1",
                    "status": "passed",
                    "observed_at": "2026-08-03T12:00:00Z",
                    "candidate": {
                        "heritage_descriptor_sha256": "a" * 64,
                        "heritage_release_root_sha256": "b" * 64,
                    },
                    "subject": {
                        "site_tree_sha256": "c" * 64,
                        "site_file_count": 2,
                    },
                },
                "subject.publication_manifest_sha256",
            ),
            (
                {
                    "schema": "okf-publication-validation-receipt.v1",
                    "status": "passed",
                    "observed_at": "2026-08-03T12:00:00Z",
                    "candidate": {
                        "heritage_descriptor_sha256": "a" * 64,
                        "heritage_release_root_sha256": "b" * 64,
                    },
                    "subject": {
                        "publication_manifest_sha256": "c" * 64,
                        "site_tree_sha256": "not-a-digest",
                        "site_file_count": 2,
                    },
                },
                "subject.site_tree_sha256",
            ),
            (
                {
                    "schema": "okf-publication-validation-receipt.v1",
                    "status": "passed",
                    "observed_at": "2026-08-03T12:00:00Z",
                    "candidate": {
                        "heritage_descriptor_sha256": "a" * 64,
                        "heritage_release_root_sha256": "b" * 64,
                    },
                    "subject": {
                        "publication_manifest_sha256": "c" * 64,
                        "site_tree_sha256": "d" * 64,
                        "site_file_count": 0,
                    },
                },
                "positive integer subject.site_file_count",
            ),
        )
        for receipt, expected_error in invalid_receipts:
            with self.subTest(expected_error=expected_error):
                with tempfile.TemporaryDirectory() as temporary_directory:
                    receipt_path = Path(temporary_directory) / "candidate.json"
                    receipt_path.write_text(json.dumps(receipt), encoding="utf-8")
                    program = f"""
                        import {{ loadCandidateReceipt }} from {json.dumps(module_url)};
                        let message = '';
                        try {{
                          loadCandidateReceipt({json.dumps(str(receipt_path))});
                        }} catch (error) {{
                          message = error.message;
                        }}
                        if (!message) throw new Error('invalid candidate receipt was accepted');
                        console.log(message);
                    """
                    result = subprocess.run(
                        ["node", "--input-type=module", "--eval", program],
                        cwd=ROOT,
                        check=True,
                        capture_output=True,
                        text=True,
                    )
                self.assertIn(expected_error, result.stdout)

    def test_candidate_receipt_rejects_bounded_producer_material_failures(self):
        producer_materials = self._producer_materials()
        receipt = {
            "schema": "okf-heritage-local-candidate-receipt.v1",
            "observed_at": "2026-08-03T12:00:00Z",
            "candidate": {
                "heritage_descriptor_sha256": "a" * 64,
                "heritage_release_root_sha256": "b" * 64,
            },
            "producer_materials": producer_materials,
        }
        cases = {}

        too_many = copy.deepcopy(receipt)
        too_many["producer_materials"]["materials"] = [
            {
                "path": f"scripts/material-{index:03d}.py",
                "bytes": 1,
                "sha256": "c" * 64,
            }
            for index in range(65)
        ]
        cases["max"] = too_many

        missing = copy.deepcopy(receipt)
        missing["producer_materials"]["materials"] = missing[
            "producer_materials"
        ]["materials"][1:]
        cases["missing"] = missing

        extra = copy.deepcopy(receipt)
        extra["producer_materials"]["materials"].append(
            {"path": "scripts/unexpected.py", "bytes": 1, "sha256": "d" * 64}
        )
        extra["producer_materials"]["materials"].sort(
            key=lambda material: material["path"]
        )
        cases["extra"] = extra

        drift = copy.deepcopy(receipt)
        drift["producer_materials"]["root_sha256"] = "e" * 64
        cases["drift"] = drift

        current_bytes = copy.deepcopy(receipt)
        current_bytes["producer_materials"]["materials"][0]["sha256"] = "0" * 64
        current_materials = current_bytes["producer_materials"]["materials"]
        current_canonical = (
            json.dumps(
                current_materials,
                ensure_ascii=False,
                separators=(",", ":"),
                sort_keys=True,
            )
            + "\n"
        ).encode("utf-8")
        current_bytes["producer_materials"]["root_sha256"] = hashlib.sha256(
            current_canonical
        ).hexdigest()
        cases["current_bytes"] = current_bytes

        module_url = (ROOT / "scripts" / "evaluate_okf_explorer.mjs").as_uri()
        with tempfile.TemporaryDirectory() as temporary_directory:
            temporary = Path(temporary_directory)
            paths = {}
            for name, value in {"exact": receipt, **cases}.items():
                candidate_path = temporary / f"{name}.json"
                candidate_path.write_text(json.dumps(value), encoding="utf-8")
                paths[name] = str(candidate_path)
            program = f"""
                import {{ loadCandidateReceipt }} from {json.dumps(module_url)};
                const paths = {json.dumps(paths)};
                const exact = loadCandidateReceipt(paths.exact);
                const messages = {{}};
                for (const name of ['max', 'missing', 'extra', 'drift', 'current_bytes']) {{
                  try {{
                    loadCandidateReceipt(paths[name]);
                  }} catch (error) {{
                    messages[name] = error.message;
                  }}
                  if (!messages[name]) throw new Error(`invalid producer materials accepted: ${{name}}`);
                }}
                console.log(JSON.stringify({{ exact, messages }}));
            """
            result = subprocess.run(
                ["node", "--input-type=module", "--eval", program],
                cwd=ROOT,
                check=True,
                capture_output=True,
                text=True,
            )
        payload = json.loads(result.stdout)
        self.assertEqual(
            producer_materials["root_sha256"],
            payload["exact"]["producer_materials_root_sha256"],
        )
        self.assertIn("material-count bound", payload["messages"]["max"])
        self.assertIn("missing required path", payload["messages"]["missing"])
        self.assertIn("unexpected path", payload["messages"]["extra"])
        self.assertIn("does not bind canonical materials", payload["messages"]["drift"])
        self.assertIn(
            "differs from exact current bytes",
            payload["messages"]["current_bytes"],
        )

    def test_final_url_location_assertion_ignores_hash_but_rejects_redirect_drift(self):
        module_url = (ROOT / "scripts" / "evaluate_okf_explorer.mjs").as_uri()
        program = f"""
            import {{ assertFinalLocation }} from {json.dumps(module_url)};
            assertFinalLocation(
              'https://example.test/page?q=one#actual',
              'https://example.test/page?q=one#requested'
            );
            let message = '';
            try {{
              assertFinalLocation(
                'https://other.example.test/page?q=one',
                'https://example.test/page?q=one'
              );
            }} catch (error) {{
              message = error.message;
            }}
            if (!message) throw new Error('redirect drift was accepted');
            console.log(message);
        """
        result = subprocess.run(
            ["node", "--input-type=module", "--eval", program],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
        )

        self.assertIn("unexpected origin, path, or query", result.stdout)

    def test_genuine_browser_receipt_is_validated_and_returned_as_action_evidence(self):
        action = {
            "action": "verify_url",
            "value": "https://source.example.test/legacy?id=42",
            "expected_text": "Example identity",
            "expected_final_url": "https://source.example.test/item?id=42",
            "verification_channel": "genuine-browser-receipt",
            "receipt": "evidence/genuine-browser.json",
        }
        receipt = self._genuine_browser_receipt(
            requested_url=action["value"],
            final_url=action["expected_final_url"],
            expected_text=action["expected_text"],
        )
        with tempfile.TemporaryDirectory() as temporary_directory:
            temporary = Path(temporary_directory)
            journey_path = self._write_validation_journey(
                temporary, action, receipt
            )
            output = temporary / "results"
            subprocess.run(
                [
                    "node",
                    str(ROOT / "scripts" / "evaluate_okf_explorer.mjs"),
                    "--no-browser",
                    "--journeys-only",
                    "--journeys",
                    str(journey_path),
                    "--out",
                    str(output),
                ],
                cwd=ROOT,
                check=True,
                capture_output=True,
                text=True,
            )
            module_url = (ROOT / "scripts" / "evaluate_okf_explorer.mjs").as_uri()
            program = f"""
                import {{ genuineBrowserReceiptEvidence }} from {json.dumps(module_url)};
                const evidence = genuineBrowserReceiptEvidence(
                  {json.dumps(action)},
                  {json.dumps(str(journey_path))}
                );
                console.log(JSON.stringify(evidence));
            """
            helper = subprocess.run(
                ["node", "--input-type=module", "--eval", program],
                cwd=ROOT,
                check=True,
                capture_output=True,
                text=True,
            )
            evidence = json.loads(helper.stdout)

        self.assertEqual("genuine-browser-receipt", evidence["verificationChannel"])
        self.assertEqual(action["receipt"], evidence["receipt"])
        self.assertEqual(action["expected_final_url"], evidence["finalUrl"])
        self.assertEqual(200, evidence["status"])
        self.assertTrue(evidence["identityMatched"])
        self.assertTrue(evidence["finalLocationMatched"])
        self.assertFalse(evidence["browser"]["webdriver"])
        self.assertRegex(evidence["receiptSha256"], r"^[0-9a-f]{64}$")
        self.assertEqual(
            receipt["records"][0]["observed_at"], evidence["recordObservedAt"]
        )
        self.assertEqual("document.body.innerText", evidence["identitySource"])
        self.assertIn(
            action["expected_text"].lower(), evidence["identityExcerpt"].lower()
        )

    def test_genuine_browser_receipt_rejects_unsafe_missing_and_unbound_evidence(self):
        base_action = {
            "action": "verify_url",
            "value": "https://source.example.test/item?id=42",
            "expected_text": "Example identity",
            "verification_channel": "genuine-browser-receipt",
            "receipt": "evidence/genuine-browser.json",
        }
        valid_receipt = self._genuine_browser_receipt()
        cases = []

        unsupported = dict(base_action, verification_channel="session-screenshot")
        cases.append(("unsupported channel", unsupported, None, "unsupported verification_channel"))

        unsafe = dict(base_action, receipt="../outside.json")
        cases.append(("unsafe path", unsafe, None, "safe and fixture-relative"))

        missing = dict(base_action, receipt="evidence/missing.json")
        cases.append(("missing file", missing, None, "file is missing"))

        mismatched = self._genuine_browser_receipt(expected_text="Different identity")
        cases.append(("unbound identity", base_action, mismatched, "exact requested_url/expected_text match"))

        duplicate = self._genuine_browser_receipt()
        duplicate["records"].append(dict(duplicate["records"][0]))
        cases.append(("duplicate binding", base_action, duplicate, "duplicates requested_url and expected_text"))

        automated = self._genuine_browser_receipt()
        automated["browser"]["webdriver"] = True
        cases.append(("webdriver browser", base_action, automated, "browser.webdriver as false"))

        blocked = self._genuine_browser_receipt()
        blocked["records"][0]["response_status"] = 403
        cases.append(("blocked response", base_action, blocked, "integer from 200 to 399"))

        false_identity = self._genuine_browser_receipt()
        false_identity["records"][0]["identity_matched"] = False
        cases.append(("false identity", base_action, false_identity, "identity_matched must be true"))

        missing_record_time = self._genuine_browser_receipt()
        del missing_record_time["records"][0]["observed_at"]
        cases.append(
            (
                "missing record observation time",
                base_action,
                missing_record_time,
                "record 1 observed_at must be a timezone-qualified timestamp",
            )
        )

        wrong_identity_source = self._genuine_browser_receipt()
        wrong_identity_source["records"][0]["identity_source"] = "document.title"
        cases.append(
            (
                "wrong identity source",
                base_action,
                wrong_identity_source,
                "identity_source must be document.body.innerText",
            )
        )

        unbound_excerpt = self._genuine_browser_receipt()
        unbound_excerpt["records"][0]["identity_excerpt"] = "Unrelated page text"
        cases.append(
            (
                "unbound identity excerpt",
                base_action,
                unbound_excerpt,
                "identity_excerpt must contain expected_text",
            )
        )

        unordered = self._genuine_browser_receipt()
        later = dict(unordered["records"][0])
        later.update(
            {
                "observed_at": "2026-08-03T12:01:00Z",
                "requested_url": "https://source.example.test/other",
                "expected_text": "Other identity",
                "identity_excerpt": "Verified page text: Other identity",
            }
        )
        unordered["records"].insert(0, later)
        cases.append(
            (
                "unordered observations",
                base_action,
                unordered,
                "records must be ordered by observed_at",
            )
        )

        redirected = self._genuine_browser_receipt(
            final_url="https://other.example.test/item?id=42"
        )
        cases.append(("redirect drift", base_action, redirected, "unexpected origin, path, or query"))

        for name, action, receipt, expected_error in cases:
            with self.subTest(name=name):
                with tempfile.TemporaryDirectory() as temporary_directory:
                    temporary = Path(temporary_directory)
                    journey_path = self._write_validation_journey(
                        temporary, action, receipt
                    )
                    result = subprocess.run(
                        [
                            "node",
                            str(ROOT / "scripts" / "evaluate_okf_explorer.mjs"),
                            "--no-browser",
                            "--journeys-only",
                            "--journeys",
                            str(journey_path),
                            "--out",
                            str(temporary / "results"),
                        ],
                        cwd=ROOT,
                        capture_output=True,
                        text=True,
                    )
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(expected_error, result.stderr)

    def test_expected_final_url_is_credential_free_and_uses_separate_hash(self):
        for value, expected_error in (
            ("https://user:secret@example.test/item", "must not contain credentials"),
            ("https://example.test/item?access_token=secret", "must not contain credentials"),
            ("https://example.test/item#section", "use expected_final_hash instead"),
            ("file:///tmp/item", "only supports HTTP(S)"),
        ):
            with self.subTest(value=value):
                action = {
                    "action": "verify_url",
                    "value": "https://example.test/item",
                    "expected_text": "Example identity",
                    "expected_final_url": value,
                }
                with tempfile.TemporaryDirectory() as temporary_directory:
                    temporary = Path(temporary_directory)
                    journey_path = self._write_validation_journey(temporary, action)
                    result = subprocess.run(
                        [
                            "node",
                            str(ROOT / "scripts" / "evaluate_okf_explorer.mjs"),
                            "--no-browser",
                            "--journeys-only",
                            "--journeys",
                            str(journey_path),
                            "--out",
                            str(temporary / "results"),
                        ],
                        cwd=ROOT,
                        capture_output=True,
                        text=True,
                    )
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(expected_error, result.stderr)

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

    def test_journey_validation_rejects_malformed_expected_final_hash(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            temporary = Path(temporary_directory)
            journey_path = self._write_validation_journey(
                temporary,
                {
                    "action": "verify_url",
                    "value": "https://example.test/item",
                    "expected_text": "Example identity",
                    "expected_final_hash": "risk/with whitespace",
                },
            )

            result = subprocess.run(
                [
                    "node",
                    str(ROOT / "scripts" / "evaluate_okf_explorer.mjs"),
                    "--no-browser",
                    "--journeys-only",
                    "--journeys",
                    str(journey_path),
                    "--out",
                    str(temporary / "results"),
                ],
                cwd=ROOT,
                capture_output=True,
                text=True,
            )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("expected_final_hash must be", result.stderr)

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
