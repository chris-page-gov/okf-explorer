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

        # api_catalogue.csv carries two rows: the original payments API and a
        # second row used to exercise javascript: documentation redaction below.
        self.assertEqual(counts["declared_api_products"], 2)
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

    def test_redact_url_strips_password_param_and_reports_count(self):
        cleaned, dropped = builder_module.redact_url("https://example.gov.uk/api?password=hunter2&format=json")

        self.assertEqual(dropped, 1)
        self.assertNotIn("password=", cleaned)
        self.assertIn("format=json", cleaned)

    def test_redact_url_strips_multiple_credential_params(self):
        cleaned, dropped = builder_module.redact_url("https://example.gov.uk/api?token=abc&login=xyz&password=hunter2")

        self.assertEqual(dropped, 3)
        self.assertEqual(cleaned, "https://example.gov.uk/api")

    def test_redact_url_leaves_url_without_query_unchanged(self):
        url = "https://example.gov.uk/api"
        cleaned, dropped = builder_module.redact_url(url)

        self.assertEqual(dropped, 0)
        self.assertEqual(cleaned, url)

    def test_redact_url_preserves_non_credential_params(self):
        url = "https://example.gov.uk/api?format=json&limit=10"
        cleaned, dropped = builder_module.redact_url(url)

        self.assertEqual(dropped, 0)
        self.assertEqual(cleaned, url)

    def test_safe_url_rejects_javascript_scheme(self):
        self.assertEqual(builder_module.safe_url("javascript:alert(1)"), "")

    def test_safe_url_rejects_non_http_schemes(self):
        self.assertEqual(builder_module.safe_url("ftp://example.gov.uk/file.csv"), "")

    def test_safe_url_accepts_https(self):
        url = "https://example.gov.uk/api"
        self.assertEqual(builder_module.safe_url(url), url)

    def test_safe_url_strips_whitespace(self):
        self.assertEqual(builder_module.safe_url("  https://example.gov.uk/api  "), "https://example.gov.uk/api")

    def test_plain_text_strips_entity_encoded_script_tags(self):
        result = builder_module.plain_text("&lt;script&gt;x&lt;/script&gt;")

        self.assertNotIn("<", result)

    def test_plain_text_removes_literal_backslash_n_sequences(self):
        result = builder_module.plain_text("line one\\nline two\\r\\nline three")

        self.assertNotIn("\\n", result)
        self.assertNotIn("\\r\\n", result)

    def test_plain_text_collapses_whitespace(self):
        result = builder_module.plain_text("too   many\n\nspaces\there")

        self.assertEqual(result, "too many spaces here")

    def test_rows_from_csv_tolerates_ragged_rows_with_extra_cells(self):
        csv_text = (
            "dateAdded,dateUpdated,url,name,description,documentation,license,maintainer,areaServed,startDate,endDate,provider\n"
            "2024-01-01,2024-06-01,https://api.example.gov.uk/ragged,Ragged Row API,desc,doc,lic,maint,UK,2024-01-01,,Ragged Dept,extra-cell-1,extra-cell-2\n"
        )

        source_hash, rows = builder_module.rows_from_csv("file://ragged.csv", csv_text.encode("utf-8"))

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].raw.get("name"), "Ragged Row API")
        self.assertEqual(rows[0].raw.get("provider"), "Ragged Dept")

    def test_harvested_url_redaction_and_safety_warnings_surface_in_overview(self):
        corpus = self.build_fixture_corpus()

        all_urls = []
        for record in corpus["records"]:
            all_urls.append(str(record.get("url", "")))
            all_urls.append(str(record.get("documentation", "")))
        for resource in corpus["resources"]:
            all_urls.append(str(resource.get("url", "")))
        joined = " ".join(all_urls)

        self.assertNotIn("password=", joined)
        self.assertNotIn("login=", joined)
        self.assertNotIn("token=", joined)

        javascript_row_records = [record for record in corpus["records"] if record["name"] == "example-department-example-records-api"]
        self.assertEqual(len(javascript_row_records), 1)
        self.assertEqual(javascript_row_records[0]["documentation"], "")
        self.assertEqual(javascript_row_records[0]["url"], "https://api.example.gov.uk/records")

        warnings = corpus["overview"]["warnings"]
        self.assertEqual(warnings["credential_parameters_redacted"], 3)
        self.assertEqual(warnings["unsafe_urls_dropped"], 1)
        self.assertEqual(warnings["duplicate_slugs_dropped"], 0)
        self.assertEqual(warnings["duplicate_endpoints_skipped"], 1)
        self.assertEqual(corpus["analysis"]["warnings"], warnings)

    def test_every_relationship_edge_carries_provenance(self):
        corpus = self.build_fixture_corpus()

        relationships = corpus["relationships"]
        self.assertTrue(relationships)
        observed = {row["observed_at"] for row in relationships}
        for row in relationships:
            self.assertEqual(row["evidence_type"], "harvested_structure")
            self.assertEqual(row["confidence"], "high")
            self.assertTrue(row["observed_at"])
        self.assertEqual(len(observed), 1)


if __name__ == "__main__":
    unittest.main()
