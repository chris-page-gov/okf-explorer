from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
EVALUATION = ROOT / "evaluation" / "legislation"


class LegislationEvaluationTest(unittest.TestCase):
    def test_suite_has_100_questions_and_100_point_rubric(self):
        suite = json.loads((EVALUATION / "questions.json").read_text(encoding="utf-8"))
        self.assertEqual(suite["schema"], "okf-legislation-answer-evaluation.v1")
        self.assertEqual(len(suite["questions"]), 100)
        self.assertEqual(len({row["id"] for row in suite["questions"]}), 100)
        self.assertEqual(sum(row["points"] for row in suite["rubric"].values()), 100)
        self.assertTrue(any("secondary" in row["category"] for row in suite["questions"]))
        for row in suite["questions"]:
            self.assertTrue(row["expected_sources"])
            self.assertTrue(all(url.startswith("https://www.legislation.gov.uk/") for url in row["expected_sources"]))
            self.assertIn("proposition-to-citation provenance ledger", row["answer_requirements"])

    def test_missing_official_provenance_caps_score(self):
        spec = importlib.util.spec_from_file_location("evaluator", ROOT / "scripts" / "evaluate_legislation_answers.py")
        module = importlib.util.module_from_spec(spec)
        assert spec.loader
        spec.loader.exec_module(module)
        question = json.loads((EVALUATION / "questions.json").read_text(encoding="utf-8"))["questions"][0]
        answer = {
            "answer": "unlawful public authority Convention right",
            "propositions": [{"claim": "claim", "citations": [{"source_title": "blog", "url": "https://example.com/x", "passage": "text", "retrieved_at": "2026-07-10"}]}],
            "temporal_context": {"version": "latest", "commencement": "checked", "extent": "checked", "amendments": "checked"},
            "manual_scores": {"substantive_correctness": 15, "temporal_and_jurisdictional_context": 5, "completeness_and_uncertainty": 10, "clarity_and_utility": 5},
        }
        result = module.score_answer(question, answer)
        self.assertLessEqual(result["total"], 49)
        self.assertIn("no official legislation.gov.uk citation", result["hard_failures"])


if __name__ == "__main__":
    unittest.main()
