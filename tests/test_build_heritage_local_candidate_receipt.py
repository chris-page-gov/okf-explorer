from __future__ import annotations

import copy
import gzip
import io
import json
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from urllib.parse import urlencode, urljoin


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_heritage_local_candidate_receipt as materializer  # noqa: E402


class HeritageLocalCandidateReceiptTests(unittest.TestCase):
    def fixture_inputs(self, root: Path) -> dict[str, object]:
        descriptor, descriptor_raw = materializer.descriptor_identity()
        descriptor_sha256 = materializer.digest(descriptor_raw)
        questions = json.loads(
            materializer.QUESTION_SUITE_PATH.read_text(encoding="utf-8")
        )
        question_records = [
            {
                "id": question["id"],
                "query": question["query"],
                "intent": question["intent"],
                "tags": question["tags"],
                "attempts": 1,
                "score": {
                    "total": 100,
                    "retrieval": 35,
                    "display": 25,
                    "accessibility": 20,
                    "govuk": 20,
                },
                "evidence": {"result_count": 1},
            }
            for question in questions["questions"]
        ]
        question_candidate_url = urljoin(
            materializer.LOCAL_BASE_URL, materializer.FAITHFUL_BUNDLE
        )
        question_result = {
            "schema": "okf-explorer-evaluation-results.v1",
            "generated_at": "2026-08-04T10:00:00Z",
            "base_url": materializer.LOCAL_BASE_URL,
            "bundle": materializer.FAITHFUL_BUNDLE,
            "suite": materializer.QUESTION_SUITE_REFERENCE,
            "metadata": {
                "browser": "playwright",
                "browser_engine": "chromium",
                "mode": "browser-scored",
                "candidate_bundle_url": question_candidate_url,
            },
            "candidate": materializer.expected_result_candidate(
                descriptor, descriptor_sha256, question_candidate_url
            ),
            "summary": {
                "questions_run": 100,
                "questions_scored": 100,
                "average_total": 100.0,
                "average_retrieval": 35.0,
                "average_display": 25.0,
                "average_accessibility": 20.0,
                "average_govuk": 20.0,
                "pass_count_80": 100,
                "fail_count_below_60": 0,
            },
            "records": question_records,
        }

        journey_manifest = json.loads(
            materializer.JOURNEY_MANIFEST_PATH.read_text(encoding="utf-8")
        )
        manifest_journeys = {
            journey["id"]: journey for journey in journey_manifest["journeys"]
        }
        local_candidate_url = urljoin(
            materializer.LOCAL_BASE_URL, materializer.FAITHFUL_BUNDLE
        )
        start_bundles = (
            urljoin(
                materializer.LOCAL_BASE_URL,
                "/publication/tiny/okf-explorer.json",
            ),
            urljoin(
                materializer.LOCAL_BASE_URL,
                "/publication/okf-explorer.json",
            ),
            urljoin(
                materializer.LOCAL_BASE_URL,
                "/publication/synthetic/okf-explorer.json",
            ),
        )
        journey_records = []
        for journey_id, bundle in zip(
            materializer.LOCAL_JOURNEY_IDS, start_bundles, strict=True
        ):
            manifest_journey = manifest_journeys[journey_id]
            journey_records.append(
                {
                    "id": journey_id,
                    "title": manifest_journey["title"],
                    "persona_ids": manifest_journey["persona_ids"],
                    "story_ids": manifest_journey["story_ids"],
                    "status": "passed",
                    "start_url": (
                        f"{materializer.LOCAL_BASE_URL}?"
                        + urlencode({"bundle": bundle, "q": "Coventry"})
                    ),
                    "actions": [
                        {"action": action["action"], "passed": True}
                        for action in manifest_journey["actions"]
                    ],
                    "assertions": [
                        {
                            "assertion": assertion["assertion"],
                            "passed": True,
                        }
                        for assertion in manifest_journey["assertions"]
                    ],
                }
            )
        journey_result = {
            "schema": "okf-explorer-evaluation-results.v1",
            "generated_at": "2026-08-04T10:01:00Z",
            "base_url": materializer.LOCAL_BASE_URL,
            "bundle": materializer.JOURNEY_FAITHFUL_BUNDLE,
            "suite": materializer.QUESTION_SUITE_REFERENCE,
            "metadata": {
                "browser": "playwright",
                "browser_engine": "chromium",
                "mode": "browser-scored",
                "candidate_bundle_url": local_candidate_url,
            },
            "candidate": materializer.expected_result_candidate(
                descriptor, descriptor_sha256, local_candidate_url
            ),
            "summary": {
                "questions_run": 0,
                "questions_scored": 0,
                "average_total": None,
                "average_retrieval": None,
                "average_display": None,
                "average_accessibility": None,
                "average_govuk": None,
                "pass_count_80": 0,
                "fail_count_below_60": 0,
            },
            "records": [],
            "interaction_journeys": {
                "manifest": materializer.JOURNEY_MANIFEST_REFERENCE,
                "target_bundle": materializer.JOURNEY_FAITHFUL_BUNDLE,
                "summary": {
                    "journeys_run": 3,
                    "passed": 3,
                    "failed": 0,
                    "errors": 0,
                    "validation_only": 0,
                },
                "records": journey_records,
            },
        }
        current_app = materializer.app_identity()
        site_candidate = {
            "schema": "okf-site-candidate-receipt.v1",
            "algorithm": "deterministic-pre-deploy-identity-without-observations-v1",
            "explorer": current_app,
            "site": {
                "reading_pages": 12,
                "internal_references": 34,
                "file_count": 56,
                "tree_algorithm": materializer.SITE_TREE_ALGORITHM,
                "tree_sha256": "d" * 64,
                "size_gate": {
                    "status": "passed",
                    "limit_bytes": 1_000,
                    "site_bytes": 900,
                    "headroom_bytes": 100,
                },
            },
        }
        values = {
            "question": question_result,
            "journey": journey_result,
            "site": site_candidate,
        }
        paths: dict[str, Path] = {}
        for name, value in values.items():
            path = root / f"{name}.json"
            path.write_text(
                json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
                encoding="utf-8",
            )
            paths[name] = path
        return {"values": values, "paths": paths}

    def materialize_fixture(
        self,
        root: Path,
        inputs: dict[str, object],
        *,
        observed_at: str = "2026-08-04T10:02:00Z",
    ) -> tuple[Path, Path]:
        paths = inputs["paths"]
        fixture_root = root / "fixture"
        output = fixture_root / materializer.RECEIPT_RELATIVE
        materializer.materialize(
            question_results=paths["question"],
            journey_results=paths["journey"],
            site_candidate_receipt=paths["site"],
            fixture_root=fixture_root,
            output=output,
            observed_at=observed_at,
        )
        return fixture_root, output

    def rewrite_input(
        self, inputs: dict[str, object], name: str, value: dict[str, object]
    ) -> None:
        path = inputs["paths"][name]
        path.write_text(
            json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )

    def test_materializes_exact_results_and_full_candidate_identities_deterministically(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            inputs = self.fixture_inputs(root)
            fixture_root, output = self.materialize_fixture(root, inputs)
            question_gzip = fixture_root / materializer.QUESTION_RESULT_RELATIVE
            journey_gzip = fixture_root / materializer.JOURNEY_RESULT_RELATIVE
            first = {
                "receipt": output.read_bytes(),
                "question": question_gzip.read_bytes(),
                "journey": journey_gzip.read_bytes(),
            }
            self.materialize_fixture(root, inputs)
            second = {
                "receipt": output.read_bytes(),
                "question": question_gzip.read_bytes(),
                "journey": journey_gzip.read_bytes(),
            }
            receipt = json.loads(first["receipt"])

            self.assertEqual(first, second)
            self.assertEqual(
                inputs["paths"]["question"].read_bytes(),
                gzip.decompress(first["question"]),
            )
            self.assertEqual(
                inputs["paths"]["journey"].read_bytes(),
                gzip.decompress(first["journey"]),
            )
            self.assertEqual(
                "full-candidate-rebuild",
                receipt["publication_shell_rebind"]["change_class"],
            )
            self.assertEqual(
                [],
                receipt["publication_shell_rebind"]["reused_unchanged_roots"],
            )
            self.assertEqual([], receipt["publication_shell_rebind"]["reused_gates"])
            self.assertIn("Full local candidate rebuild", receipt["scope"])
            self.assertEqual(1, receipt["determinism"]["builds"])
            self.assertEqual(100, receipt["question_suite"]["questions_run"])
            self.assertEqual(100, receipt["question_suite"]["scores_at_least_80"])
            self.assertEqual(3, receipt["local_journeys"]["passed"])
            self.assertEqual(
                [
                    "/publication/tiny/okf-explorer.json",
                    "/publication/okf-explorer.json",
                    "/publication/synthetic/okf-explorer.json",
                ],
                receipt["local_journeys"]["start_bundles"],
            )
            for name, candidate_key in (
                ("faithful", "heritage_release_root_sha256"),
                ("tiny", "tiny_release_root_sha256"),
                ("synthetic", "synthetic_release_root_sha256"),
            ):
                identity = materializer.corpus_identity(
                    name, materializer.CORPUS_ROOTS[name]
                )
                self.assertEqual(
                    identity["release_root_sha256"],
                    receipt["candidate"][candidate_key],
                )
                self.assertEqual(
                    identity["comparison_tree_sha256"],
                    receipt["determinism"]["corpora"][name][
                        "comparison_tree_sha256"
                    ],
                )
            self.assertEqual(
                materializer.app_identity()["tree_sha256"],
                receipt["candidate"]["explorer_tree_sha256"],
            )
            self.assertEqual(56, receipt["candidate"]["site_file_count"])
            self.assertEqual("pending", receipt["terminal_publication_gate"]["status"])

    def test_rejects_stale_timestamps_tampered_identity_and_nonpassing_evidence(
        self,
    ) -> None:
        mutations = (
            (
                "question candidate",
                "question",
                lambda value: value["candidate"].update(
                    descriptor_sha256="0" * 64
                ),
                "question-suite result candidate identity differs",
            ),
            (
                "question suite identity",
                "question",
                lambda value: value["records"][0].update(query="changed"),
                "result identity differs from the suite",
            ),
            (
                "question browser attempt",
                "question",
                lambda value: value["records"][0].update(attempts=0),
                "has no browser attempt",
            ),
            (
                "question score",
                "question",
                lambda value: value["records"][0]["score"].update(
                    total=79, retrieval=14
                ),
                "did not pass every question",
            ),
            (
                "journey candidate target",
                "journey",
                lambda value: value.update(bundle="https://example.test/bundle.json"),
                "does not target the local faithful bundle",
            ),
            (
                "journey start bundle",
                "journey",
                lambda value: value["interaction_journeys"]["records"][0].update(
                    start_url=(
                        "http://127.0.0.1:8002/?"
                        "bundle=https%3A%2F%2Fexample.test%2Fevaluation%2F"
                        "heritage%2Ftiny%2Fokf-explorer.json"
                    )
                ),
                "start bundle is not local",
            ),
            (
                "journey manifest identity",
                "journey",
                lambda value: value["interaction_journeys"]["records"][0].update(
                    title="changed"
                ),
                "result identity differs from the manifest",
            ),
            (
                "journey action",
                "journey",
                lambda value: value["interaction_journeys"]["records"][0][
                    "actions"
                ][0].update(passed=False),
                "actions did not all pass",
            ),
            (
                "Site app identity",
                "site",
                lambda value: value["explorer"].update(tree_sha256="0" * 64),
                "differs from the current app build",
            ),
        )
        for label, input_name, mutate, expected in mutations:
            with (
                self.subTest(label=label),
                tempfile.TemporaryDirectory() as temporary_directory,
            ):
                root = Path(temporary_directory)
                inputs = self.fixture_inputs(root)
                changed = copy.deepcopy(inputs["values"][input_name])
                mutate(changed)
                self.rewrite_input(inputs, input_name, changed)
                with self.assertRaisesRegex(RuntimeError, expected):
                    self.materialize_fixture(root, inputs)

        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            inputs = self.fixture_inputs(root)
            with self.assertRaisesRegex(
                RuntimeError, "--observed-at predates the local-journey result"
            ):
                self.materialize_fixture(
                    root,
                    inputs,
                    observed_at="2026-08-04T10:00:30Z",
                )

    def test_cli_writes_only_the_selected_fixture_and_receipt_paths(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            inputs = self.fixture_inputs(root)
            fixture_root = root / "selected-fixture"
            output = root / "receipts" / "candidate.json"
            stdout = io.StringIO()
            with redirect_stdout(stdout):
                status = materializer.main(
                    [
                        "--question-results",
                        str(inputs["paths"]["question"]),
                        "--journey-results",
                        str(inputs["paths"]["journey"]),
                        "--site-candidate-receipt",
                        str(inputs["paths"]["site"]),
                        "--observed-at",
                        "2026-08-04T10:02:00Z",
                        "--fixture-root",
                        str(fixture_root),
                        "--output",
                        str(output),
                    ]
                )

            self.assertEqual(0, status)
            self.assertTrue(output.is_file())
            self.assertTrue(
                (fixture_root / materializer.QUESTION_RESULT_RELATIVE).is_file()
            )
            self.assertTrue(
                (fixture_root / materializer.JOURNEY_RESULT_RELATIVE).is_file()
            )
            self.assertIn("questions=100 journeys=3", stdout.getvalue())


if __name__ == "__main__":
    unittest.main()
