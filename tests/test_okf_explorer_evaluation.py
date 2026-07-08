from __future__ import annotations

import json
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
EVALUATION = ROOT / "evaluation" / "okf-explorer"


class OkfExplorerEvaluationSuiteTest(unittest.TestCase):
    def test_question_suite_has_100_unique_questions_and_100_point_rubric(self):
        suite = json.loads((EVALUATION / "questions.json").read_text(encoding="utf-8"))

        self.assertEqual(suite["schema"], "okf-explorer-evaluation-suite.v1")
        questions = suite["questions"]
        self.assertEqual(len(questions), 100)
        self.assertEqual(len({question["id"] for question in questions}), 100)
        self.assertEqual(sum(section["points"] for section in suite["rubric"].values()), 100)
        self.assertEqual(set(suite["rubric"]), {"retrieval", "display", "accessibility", "govuk"})

    def test_every_question_is_scored_against_retrieval_and_display_terms(self):
        suite = json.loads((EVALUATION / "questions.json").read_text(encoding="utf-8"))

        for question in suite["questions"]:
            with self.subTest(question=question["id"]):
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
        self.assertEqual(len(visuals["items"]), 1)
        item = visuals["items"][0]
        self.assertEqual(item["id"], "VR001")
        self.assertEqual(item["view"], "graph")
        self.assertIn("layering and overlapping white boxes", item["comment"])
        self.assertIn("arrow location", item["comment"])
        self.assertTrue((EVALUATION / item["image"]).is_file())
        self.assertGreaterEqual(len(item["checks"]), 5)

    def test_browser_harness_is_additive_and_writes_json_and_markdown_reports(self):
        script = (ROOT / "scripts" / "evaluate_okf_explorer.mjs").read_text(encoding="utf-8")

        self.assertIn("okf-explorer-evaluation-results.v1", script)
        self.assertIn("score.retrieval", script)
        self.assertIn("score.display", script)
        self.assertIn("score.accessibility", script)
        self.assertIn("score.govuk", script)
        self.assertIn("results.json", script)
        self.assertIn("results.md", script)
        self.assertIn("visual_regressions", script)


if __name__ == "__main__":
    unittest.main()
