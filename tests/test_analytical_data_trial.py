"""Verify the retained real-data trial and its explicit catalogue boundary."""

import csv
import io
import json
import re
import shutil
import sys
import tempfile
import unittest
from decimal import Decimal
from pathlib import Path
from unittest.mock import patch
from urllib.parse import urljoin

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_analytical_data_trial as trial


class AnalyticalDataTrialTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.outputs = trial.build()

    def test_every_observation_retains_source_codes_text_and_numeric_values(self):
        original = list(
            csv.reader(
                io.StringIO((trial.SOURCE / "warwickshire-original.csv").read_text())
            )
        )[1:]
        converted = list(
            csv.reader(
                io.StringIO(self.outputs["warwickshire/observations.csv"].decode())
            )
        )[1:]
        self.assertEqual(len(converted), 333)
        for source, row in zip(original, converted, strict=True):
            self.assertEqual(source[:5], row[:5])
            self.assertEqual(int(source[5].replace(",", "")), int(row[5]))
            self.assertEqual(Decimal(source[6].removesuffix("%")), Decimal(row[6]))
            self.assertEqual(row[7], "2008")

    def test_catalogue_denial_never_substitutes_a_successful_distribution(self):
        link = json.loads(self.outputs["ndl-catalogue-link.json"])
        self.assertEqual(
            link["distribution"]["analyticalValidation"], "unassessed-download-denied"
        )
        self.assertEqual(
            link["distribution"]["byteEquivalenceWithWarwickshireSnapshot"],
            "not-established",
        )
        self.assertEqual(
            [r["status"] for r in link["distribution"]["downloadResults"]], [403, 403]
        )
        self.assertFalse(link["localProposal"]["sourceSubstitution"])
        receipt = json.loads(self.outputs["warwickshire/receipt.json"])
        self.assertEqual(receipt["rightsStatus"], "unverified")
        self.assertEqual(receipt["tables"][0]["rows"], 333)

    def test_all_seven_incompatibility_probes_reject(self):
        result = json.loads(self.outputs["results.json"])
        self.assertEqual(len(result["compatibilityProbes"]), 7)
        self.assertTrue(
            all(
                p["status"] == "rejected-as-expected"
                for p in result["compatibilityProbes"]
            )
        )

    def test_modified_source_snapshot_fails_before_conversion(self):
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / "source"
            shutil.copytree(trial.SOURCE, source)
            (source / "warwickshire-original.csv").write_bytes(b"changed source")
            with (
                patch.object(trial, "SOURCE", source),
                self.assertRaisesRegex(ValueError, "Source snapshot changed"),
            ):
                trial.build()

    def test_checked_in_outputs_reproduce_exactly(self):
        for name, body in self.outputs.items():
            with self.subTest(output=name):
                self.assertEqual((trial.OUTPUT / name).read_bytes(), body)

    def test_reader_links_resolve_from_the_bundle_distribution(self):
        bundle = json.loads(self.outputs["reader-bundle.json"])
        base = "https://example.org/trial/reader-bundle.json"
        for node in bundle["corpora"]["analytical-trial"]["nodes"].values():
            for link in re.findall(r"\]\(([^)]+)\)", node["body"]):
                if link.startswith("https://"):
                    continue
                resolved = urljoin(base, link)
                self.assertTrue(resolved.startswith("https://example.org/trial/"))
                self.assertIn(
                    resolved.removeprefix("https://example.org/trial/"), self.outputs
                )


if __name__ == "__main__":
    unittest.main()
