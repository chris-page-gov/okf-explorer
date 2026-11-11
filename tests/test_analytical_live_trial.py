"""Regression checks for live-source scope, paging, clocks and spatial claims."""

import copy
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_analytical_live_trial as trial


class AnalyticalLiveTrialTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.outputs = trial.build()

    def test_real_fixture_receipt_preserves_scope_and_candidate_gap(self):
        receipt = json.loads(self.outputs["defra/receipt.json"])
        result = json.loads(self.outputs["defra/results.json"])
        self.assertEqual(receipt["status"], "passed")
        self.assertEqual([table["rows"] for table in receipt["tables"]], [5, 96])
        self.assertEqual(result["paging"]["stations"]["pageSizes"], [2, 2, 1, 0])
        self.assertEqual(result["paging"]["readings"]["pageSizes"], [37, 37, 22, 0])
        self.assertEqual(result["timestamps"]["sinceNoonUtcItems"], 47)
        self.assertEqual(result["dateOnlyTypeProbe"]["status"], "rejected-as-expected")
        self.assertFalse(result["spatial"]["explicitCrsIdentifierInPayload"])

    def test_paging_rejects_repetition_and_missing_terminal_witness(self):
        reference = {"items": [{"@id": "a"}, {"@id": "b"}]}
        pages = [
            {"meta": {"offset": 0, "limit": 1}, "items": [{"@id": "a"}]},
            {"meta": {"offset": 1, "limit": 1}, "items": [{"@id": "b"}]},
            {"meta": {"offset": 2, "limit": 1}, "items": []},
        ]
        self.assertTrue(trial.check_paging(reference, pages, 1)["referenceSetMatches"])
        with self.assertRaisesRegex(ValueError, "terminal"):
            trial.check_paging(reference, pages[:-1], 1)
        duplicate = copy.deepcopy(pages)
        duplicate[1]["items"][0]["@id"] = "a"
        with self.assertRaisesRegex(ValueError, "repeats"):
            trial.check_paging(reference, duplicate, 1)

    def test_paging_checks_the_actual_offset_and_full_control_set(self):
        reference = {"items": [{"@id": "a"}, {"@id": "b"}]}
        pages = [
            {"meta": {"offset": 0, "limit": 2}, "items": [{"@id": "a"}]},
            {"meta": {"offset": 1, "limit": 2}, "items": []},
        ]
        with self.assertRaisesRegex(ValueError, "identity set"):
            trial.check_paging(reference, pages, 2)
        pages[1]["meta"]["offset"] = 0
        with self.assertRaisesRegex(ValueError, "offset"):
            trial.check_paging(reference, pages, 2)

    def test_equivalent_timezone_lexemes_cannot_duplicate_an_instant(self):
        rows = [
            {"measure": "m", "dateTime": "2026-11-10T12:00:00Z"},
            {"measure": "m", "dateTime": "2026-11-10T13:00:00+01:00"},
        ]
        with self.assertRaisesRegex(ValueError, "Duplicate observation instant"):
            trial.check_times(rows, "2026-11-10")
        with self.assertRaisesRegex(ValueError, "timezone"):
            trial.instant("2026-11-10T12:00:00")
        with self.assertRaisesRegex(ValueError, "UTC day"):
            trial.check_times(
                [{"measure": "m", "dateTime": "2026-11-11T00:00:00Z"}], "2026-11-10"
            )

    def test_geographic_axis_swaps_and_projected_values_fail(self):
        row = {"lat": 52.284932, "long": -1.562658}
        self.assertEqual(
            trial.check_spatial([row], 52.284932, -1.562658, 5)["maximumDistanceKm"], 0
        )
        with self.assertRaisesRegex(ValueError, "trial circle"):
            trial.check_spatial(
                [{"lat": row["long"], "long": row["lat"]}], row["lat"], row["long"], 5
            )
        with self.assertRaisesRegex(ValueError, "degree bounds"):
            trial.check_spatial(
                [{"lat": 429930, "long": 265290}], row["lat"], row["long"], 5
            )

    def test_host_scope_keeps_empty_and_malformed_entries_separate(self):
        rows = [
            {
                "id": "a",
                "publisher": "publisher",
                "sourcePageSha256": "page",
                "resources": [
                    ["r1", trial.LEGACY_HOST, "http", "web-url"],
                    ["r2", "webarchive.nationalarchives.gov.uk", "https", "web-url"],
                ],
            },
            {
                "id": "b",
                "publisher": "publisher",
                "sourcePageSha256": "page",
                "resources": [],
            },
            {
                "id": "c",
                "publisher": None,
                "sourcePageSha256": "page",
                "resources": [["r3", None, None, "malformed-url"]],
            },
        ]
        ledger = {"reportedCount": 3, "pages": [{"responseSha256": "page", "rows": 3}]}
        summary, pairs = trial.summarise_hosts(rows, ledger)
        self.assertEqual(summary["resourceOccurrences"], 3)
        self.assertEqual(summary["recordsWithoutResourceEntries"], 1)
        self.assertEqual(summary["malformedUrlParserObservations"], 1)
        self.assertEqual(pairs, {("a", "r1")})
        with self.assertRaisesRegex(ValueError, "Repeated dataset"):
            trial.summarise_hosts([*rows, rows[0]], ledger)

    def test_real_national_scope_is_a_host_census_with_open_health_scope(self):
        national = json.loads(self.outputs["ndl-national-host-scope.json"])
        wcc = json.loads(self.outputs["wcc-link-scope.json"])
        self.assertEqual(national["datasetRecords"], 60155)
        self.assertEqual(national["resourceOccurrences"], 221687)
        self.assertEqual(
            national["exactHostPublishers"], {"warwickshire-county-council": 40}
        )
        self.assertEqual(national["indexedHostQueryPositiveControl"], "failed")
        self.assertEqual(national["otherHostLinkHealth"], "unassessed")
        self.assertEqual(wcc["storedResourceStatusOccurrences"]["403"], 66)
        self.assertEqual(wcc["recordsWithoutResourceEntries"], 18)
        self.assertEqual(len(wcc["candidatePathsAbsentFromPublisherTree"]), 4)
        self.assertEqual(wcc["historicalS3ByteEquivalence"], "unverified")

    def test_every_generated_live_trial_byte_reproduces(self):
        for name, body in self.outputs.items():
            with self.subTest(output=name):
                self.assertEqual((trial.OUTPUT / name).read_bytes(), body)


if __name__ == "__main__":
    unittest.main()
