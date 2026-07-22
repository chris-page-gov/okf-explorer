from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_legislation_okf as legislation  # noqa: E402


class LegislationOkfTests(unittest.TestCase):
    fixture = ROOT / "tests" / "fixtures" / "legislation_okf" / "sample.feed.xml"

    def test_fixture_maps_to_eli_and_schema_org(self) -> None:
        rows, _ = legislation.load_fixture(self.fixture)
        self.assertEqual(2, len(rows))
        act = rows[0]
        self.assertEqual("eli:LegalResource", act["eli_class"])
        self.assertEqual("schema:Legislation", act["schema_org_type"])
        self.assertEqual("ukpga", act["type_code"])
        self.assertEqual("primary", act["category"])
        self.assertEqual("https://www.legislation.gov.uk/ukpga/2025/18/data.xml", act["structure_url"])
        self.assertIn("Communications, data and technology", act["topics"])

    def test_fixture_build_has_progressive_discovery_contract(self) -> None:
        rows, meta = legislation.load_fixture(self.fixture)
        corpus = legislation.build_corpus(rows, meta, "2026-07-10T00:00:00Z")
        extension = corpus["descriptor"]["extensions"]["okf-legislation-corpus.v1"]
        self.assertEqual("complete-work-index-live-subdivision-resolver", extension["mode"])
        self.assertEqual(2, corpus["manifest"]["counts"]["works"])
        self.assertIn("document_type", corpus["facets"])
        self.assertIn("topic", corpus["facets"])
        self.assertTrue(all(0 <= facet["expected_reduction"] <= 1 for facet in corpus["analysis"]["facet_analysis"]))
        self.assertTrue(any(facet["entropy"] > 0 for facet in corpus["analysis"]["facet_analysis"]))
        self.assertGreater(corpus["manifest"]["counts"]["relationships"], 0)
        self.assertEqual("fnv1a32-prefix-2", corpus["relationship_adjacency"]["algorithm"])
        self.assertIn("relationship_adjacency", corpus["descriptor"]["entrypoints"])

    def test_fixture_generator_output_is_self_consistent(self) -> None:
        rows, meta = legislation.load_fixture(self.fixture)
        corpus = legislation.build_corpus(rows, meta, "2026-07-10T00:00:00Z")
        files = legislation.output_files(corpus, meta)
        self.assertIn(Path("okf-explorer.json"), files)
        self.assertIn(Path("okf-bundle.yamlld"), files)
        self.assertIn(Path("okf-bundle.jsonld"), files)
        self.assertIn(Path("data/adjacency/manifest.json"), files)
        self.assertIn(Path("enrichment/model-assisted-v1.json"), files)
        self.assertIn(Path("ontology/normalized-vocabulary.md"), files)
        self.assertIn(Path("access/search-lists-feeds.md"), files)
        descriptor = json.loads(files[Path("okf-explorer.json")])
        self.assertEqual("okf-large-corpus", descriptor["kind"])
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp)
            legislation.large_corpus.write_files(output, files)
            self.assertEqual([], legislation.large_corpus.check_files(output, files))


if __name__ == "__main__":
    unittest.main()
