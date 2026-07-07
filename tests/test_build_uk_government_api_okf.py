from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import sys
import unittest


ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "tests" / "fixtures" / "uk_government_api_okf"
SCRIPT = ROOT / "scripts" / "build_uk_government_api_okf.py"


spec = importlib.util.spec_from_file_location("build_uk_government_api_okf", SCRIPT)
assert spec and spec.loader
builder_module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = builder_module
spec.loader.exec_module(builder_module)


class UkGovernmentApiOkfGeneratorTest(unittest.TestCase):
    def build_fixture_corpus(self):
        csv_bytes = (FIXTURES / "api_catalogue.csv").read_bytes()
        source_hash, rows = builder_module.rows_from_csv("file://api_catalogue.csv", csv_bytes)
        ckan = json.loads((FIXTURES / "ckan_package_search.json").read_text(encoding="utf-8"))
        os_documents = json.loads((FIXTURES / "os_api_tree.json").read_text(encoding="utf-8"))
        ons = json.loads((FIXTURES / "ons_payload.json").read_text(encoding="utf-8"))
        return builder_module.build_corpus(
            rows,
            "file://api_catalogue.csv",
            source_hash,
            ckan_packages=ckan["result"]["results"],
            ckan_source_url="file://ckan_package_search.json",
            os_documents=os_documents,
            ons_root=ons["root"],
            ons_datasets=ons["datasets"],
            ons_topics=ons["topics"],
            ons_code_lists=ons["code_lists"],
        )

    def test_canonical_counts_keep_api_products_endpoints_and_data_products_separate(self):
        corpus = self.build_fixture_corpus()
        counts = corpus["descriptor"]["counts"]

        self.assertEqual(counts["declared_api_products"], 1)
        self.assertGreaterEqual(counts["provider_native_api_products"], 2)
        self.assertEqual(counts["data_access_endpoints"], 1)
        self.assertEqual(counts["data_products"], 2)
        self.assertGreaterEqual(counts["operations"], 2)
        self.assertGreaterEqual(counts["schemas"], 2)
        self.assertEqual(counts["api_products"], counts["declared_api_products"] + counts["provider_native_api_products"])

    def test_ckan_api_like_resources_are_endpoint_records_not_api_products(self):
        corpus = self.build_fixture_corpus()
        records = corpus["records"]
        endpoint_records = [record for record in records if record["record_type"] == "Data Access API Endpoint"]

        self.assertEqual(len(endpoint_records), 1)
        self.assertEqual(endpoint_records[0]["source_adapter"], "data_gov_uk_ckan")
        self.assertEqual(endpoint_records[0]["protocol"], ["ArcGIS REST"])
        self.assertNotEqual(endpoint_records[0]["record_type"], "API Product")

    def test_every_record_has_route_provenance_confidence_and_source_adapter(self):
        corpus = self.build_fixture_corpus()

        for record in corpus["records"]:
            self.assertTrue(record["route"].startswith("dataset/"), record["name"])
            self.assertTrue(record["provenance"].get("source_url"), record["name"])
            self.assertIn(record["confidence"], {"observed", "declared", "assured"}, record["name"])
            self.assertTrue(record["source_adapter"], record["name"])

    def test_facets_include_source_record_type_protocol_and_confidence(self):
        corpus = self.build_fixture_corpus()
        facets = corpus["facets"]

        self.assertIn("record_type", facets)
        self.assertIn("source_adapter", facets)
        self.assertIn("protocol", facets)
        self.assertIn("confidence", facets)
        self.assertIn("data_gov_uk_ckan", {row["value"] for row in facets["source_adapter"]})
        self.assertIn("Data Access API Endpoint", {row["value"] for row in facets["record_type"]})


if __name__ == "__main__":
    unittest.main()
