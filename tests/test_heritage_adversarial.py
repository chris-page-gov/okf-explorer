from __future__ import annotations

import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import check_heritage_adversarial as adversarial  # noqa: E402


class HeritageAdversarialMicrofixturesTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.manifest = adversarial.load_json(adversarial.DEFAULT_MANIFEST)

    def test_manifest_covers_every_reconstructed_late_finding(self) -> None:
        cases = adversarial.validate_manifest(self.manifest)

        self.assertEqual(13, len(cases))
        self.assertEqual(13, len({case["validator"] for case in cases}))
        self.assertTrue(all(case["id"].startswith("LF") for case in cases))
        self.assertTrue(all(case["planes"] for case in cases))
        self.assertTrue(all("microfixture" in case["test_tags"] for case in cases))

    def test_each_microfixture_passes_independently(self) -> None:
        for case in adversarial.validate_manifest(self.manifest):
            with self.subTest(case=case["id"]):
                result = adversarial.run_cases(
                    self.manifest,
                    fixture_ids={case["id"]},
                )
                self.assertEqual(1, result["selected"])
                self.assertEqual(1, result["passed"], result["results"])
                self.assertEqual(0, result["failed"], result["results"])

    def test_test_tag_selector_is_deterministic(self) -> None:
        first = adversarial.run_cases(self.manifest, test_tags={"scope"})
        second = adversarial.run_cases(self.manifest, test_tags={"scope"})

        self.assertEqual(first, second)
        self.assertEqual(["LF07-authority-only-geographic-scope"], [row["id"] for row in first["results"]])

    def test_unknown_fixture_selector_fails_closed(self) -> None:
        with self.assertRaisesRegex(adversarial.MicrofixtureError, "unknown microfixture"):
            adversarial.run_cases(self.manifest, fixture_ids={"LF99-not-real"})

    def test_unknown_validator_fails_closed(self) -> None:
        mutated = copy.deepcopy(self.manifest)
        mutated["cases"][0]["validator"] = "trust_me"

        with self.assertRaisesRegex(adversarial.MicrofixtureError, "unknown validator"):
            adversarial.validate_manifest(mutated)

    def test_timestamp_mutation_does_not_change_candidate_root(self) -> None:
        case = next(
            row
            for row in self.manifest["cases"]
            if row["id"] == "LF11-evidence-outside-candidate"
        )
        first = adversarial.sha256(adversarial.canonical_json(case["input"]["candidate"]))
        mutated = copy.deepcopy(case)
        mutated["input"]["observations"][0]["observed_at"] = "2099-01-01T00:00:00Z"
        second = adversarial.sha256(adversarial.canonical_json(mutated["input"]["candidate"]))

        self.assertEqual(first, second)

    def test_cli_receipt_is_atomic_and_machine_readable(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "result.json"
            status = adversarial.main(
                [
                    "--fixture",
                    "LF07-authority-only-geographic-scope",
                    "--output",
                    str(output),
                ]
            )
            payload = json.loads(output.read_text(encoding="utf-8"))

        self.assertEqual(0, status)
        self.assertEqual("okf-heritage-adversarial-results.v1", payload["schema"])
        self.assertEqual(1, payload["passed"])
        self.assertEqual(0, payload["failed"])


if __name__ == "__main__":
    unittest.main()
