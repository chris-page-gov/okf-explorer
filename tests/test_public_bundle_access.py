from __future__ import annotations

import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import build_public_bundle_access as access
import check_public_bundle_access as checker


class PublicBundleAccessTests(unittest.TestCase):
    def mutate(self, change):
        document = copy.deepcopy(access.load())
        change(document["bundles"][0])
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / access.SOURCE).parent.mkdir(parents=True)
            (root / access.SOURCE).write_text(json.dumps(document))
            return access.load(root)

    def mutate_living(self, change):
        document = copy.deepcopy(access.load())
        row = next(b for b in document["bundles"] if b["repository"].endswith("/okf-uk-living"))
        change(row)
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / access.SOURCE).parent.mkdir(parents=True)
            (root / access.SOURCE).write_text(json.dumps(document))
            catalogue_path = root / document["owner_catalogue"]["path"]
            catalogue_path.parent.mkdir(parents=True)
            original_catalogue = ROOT / document["owner_catalogue"]["path"]
            catalogue_path.write_bytes(original_catalogue.read_bytes())
            return access.load(root)

    def test_pinned_graph_links_require_matching_owner_commit_and_path(self):
        graph = next(row["agent_graph"] for row in access.load()["bundles"] if "agent_graph" in row)
        for override in ({"url": graph["url"]}, {"commit": "main"}, {"bytes": 0}, {"sha256": "invalid"}):
            with self.subTest(override=override), self.assertRaisesRegex(ValueError, "invalid pinned graph"):
                self.mutate(lambda b: b.update(agent_graph={**graph, **override}))
        outputs = access.render(access.load())
        self.assertIn(graph["url"], outputs[Path("llms.txt")])

    def test_private_entry_is_rejected_before_publication(self):
        with self.assertRaisesRegex(ValueError, "only explicitly public"):
            self.mutate(lambda b: b.update(visibility="private"))

    def test_non_okf_repository_needs_an_explicit_publisher_allowlist_entry(self):
        with self.assertRaisesRegex(ValueError, "unique owned OKF repositories"):
            self.mutate(lambda b: b.update(repository="https://github.com/chris-page-gov/not-an-okf-publisher"))

    def test_authenticated_inventory_cannot_be_published_as_a_public_catalogue(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = access.load()
            (root / access.SOURCE).parent.mkdir(parents=True)
            (root / access.SOURCE).write_text(json.dumps(source))
            candidate_path = root / source["owner_catalogue"]["path"]
            candidate_path.parent.mkdir(parents=True)
            candidate_path.write_text(json.dumps({
                "schema": "okf-public-owner-candidates.v1", "owner": "chris-page-gov",
                "visibility": "accessible", "repositories": []
            }))
            with self.assertRaisesRegex(ValueError, "unreviewed visibility"):
                access.load(root)

    def test_unpinned_or_different_raw_candidate_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "pin an owned commit"):
            self.mutate(lambda b: b.update(equivalent_raw_descriptor=b["equivalent_raw_descriptor"].replace("/" + b["equivalent_raw_descriptor"].split("/")[5] + "/", "/main/")))
        with self.assertRaisesRegex(ValueError, "bytes do not match"):
            self.mutate(lambda b: b.update(raw_descriptor_sha256="0" * 64))

    def test_credential_url_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "unsafe descriptor"):
            self.mutate(lambda b: b.update(descriptor="https://secret@chris-page-gov.github.io/okf-example/okf-explorer.json"))

    def test_walkthrough_and_release_links_keep_public_url_boundaries(self):
        for key in ("walkthrough", "release"):
            for url in ("http://chris-page-gov.github.io/example/",
                        "https://secret@github.com/chris-page-gov/example",
                        "https://unrelated.example.test/walkthrough.html"):
                with self.subTest(key=key, url=url), self.assertRaisesRegex(ValueError, "unsafe " + key):
                    self.mutate(lambda b: b.update({key: url}))

    def test_directory_preserves_known_access_boundaries(self):
        rows = {b["repository"].rsplit("/", 1)[-1]: b for b in access.load()["bundles"]}
        self.assertEqual(len(rows), 14)
        self.assertNotIn("equivalent_raw_descriptor", rows["okf-ons"])
        self.assertNotIn("equivalent_raw_descriptor", rows["okf-uk-living"])
        self.assertIn("/combined/okf-explorer.json", rows["okf-dwp"]["descriptor"])
        self.assertIn("generated/semantic/", rows["okf-uk-living"]["semantic_descriptor"])
        hansard = rows["okf-hansard"]
        self.assertEqual(hansard["declared_okf_version"], "0.3")
        self.assertEqual(hansard["raw_descriptor_sha256"], hansard["descriptor_sha256"])
        self.assertTrue(hansard["producer_directory"].endswith("/okf-hansard/okf-public-access.json"))

    def test_gis_core03_entry_is_pinned_and_walkthrough_bounds_are_visible(self):
        rows = {b["repository"].rsplit("/", 1)[-1]: b for b in access.load()["bundles"]}
        gis = rows["gis-ai-go"]
        self.assertEqual("0.3", gis["declared_okf_version"])
        self.assertEqual("https://chris-page-gov.github.io/gis-ai-go/gis/explorer/okf-explorer.json", gis["descriptor"])
        self.assertEqual("cf4922eed417b7c890d5cc667283d6b98b8a8cf79c627da7afed6fe4315068ae", gis["descriptor_sha256"])
        self.assertIn("authored OKF+ source declares Core 0.2", gis["access_note"])
        self.assertIn("not-human-reviewed", gis["access_note"])
        self.assertIn("no retrieval or join", gis["verification"])
        receipt = json.loads((ROOT / "docs/evidence/gis-lids-core03-live-readback-2026-11-28.json").read_text())
        self.assertEqual(gis["descriptor_sha256"], receipt["descriptor"]["sha256"])
        self.assertEqual("0.2", receipt["deployment"]["authored_source_core_version"])
        self.assertEqual("7651f22ac11238b425c273e33b1cb45514486c8a479f3b801f4dd186185640ca", receipt["source_record"]["sha256"])
        outputs = access.render(access.load())
        self.assertIn(gis["walkthrough"], outputs[Path("docs/public-bundle-access.md")])
        self.assertIn(gis["walkthrough"], outputs[Path("llms.txt")])
        self.assertIn("| Walkthrough |", outputs[Path("docs/public-bundle-access.md")])
        guide = (ROOT / "docs/walkthroughs/gis-lids-identifier-links.html").read_text()
        self.assertIn(gis["descriptor"], guide)
        self.assertIn(receipt["source_record"]["url"], guide)

    def test_uk_living_preview_is_separate_and_keeps_the_core_02_baseline(self):
        rows = {b["repository"].rsplit("/", 1)[-1]: b for b in access.load()["bundles"]}
        living = rows["okf-uk-living"]
        preview = living["preview"]
        self.assertEqual("0.2", living["declared_okf_version"])
        self.assertEqual("https://chris-page-gov.github.io/okf-uk-living/okf-explorer.json", living["descriptor"])
        self.assertEqual("0.3", preview["declared_okf_version"])
        self.assertEqual("https://chris-page-gov.github.io/okf-uk-living/core-0.3-preview/", preview["landing_page"])
        self.assertEqual("migration", preview["core_status"])
        self.assertEqual("experimental", preview["profile_status"])
        self.assertFalse(preview["profile_conformance_claim"])
        self.assertFalse(preview["release_grade"])
        self.assertNotIn("equivalent_raw_descriptor", living)
        evidence = json.loads((ROOT / "docs/evidence/uk-living-core03-live-readback-2026-11-28.json").read_text())
        self.assertEqual("passed", evidence["producer"]["deployment_status"])
        self.assertEqual(preview["descriptor_sha256"], evidence["preview"]["descriptor_sha256"])
        self.assertEqual(preview["profile_uri"], evidence["preview"]["profile"])
        self.assertEqual("migration", evidence["preview"]["core_status"])
        self.assertEqual("Public OKF UK Living Pages routes and responsive Chrome journeys only. This receipt does not cover a native AI app, specialist acceptance, profile conformance or release-grade status.", evidence["scope"])
        outputs = access.render(access.load())
        self.assertIn(preview["descriptor"], outputs[Path("okf-public-access.json")])
        self.assertIn(preview["descriptor"], outputs[Path("docs/public-bundle-access.md")])
        self.assertIn(preview["landing_page"], outputs[Path("docs/public-bundle-access.md")])
        self.assertIn(preview["evidence"], outputs[Path("llms.txt")])
        self.assertIn(living["walkthrough"], outputs[Path("docs/public-bundle-access.md")])

    def test_uk_living_preview_rejects_unsafe_or_overstated_identity(self):
        with self.assertRaisesRegex(ValueError, "unsafe preview descriptor"):
            self.mutate_living(lambda row: row["preview"].update(
                descriptor="http://chris-page-gov.github.io/okf-uk-living/preview.json"
            ))
        with self.assertRaisesRegex(ValueError, "preview status or version boundary is unsafe"):
            self.mutate_living(lambda row: row["preview"].update(
                profile_conformance_claim=True
            ))

    def test_served_discovery_has_the_same_directory(self):
        outputs = access.render(access.load())
        self.assertEqual(outputs[Path("okf-public-access.json")], outputs[Path(".well-known/okf.json")])
        self.assertIn("[Central public walkthrough register](walkthrough-register.md)", outputs[Path("docs/public-bundle-access.md")])
        for b in access.load()["bundles"]:
            self.assertIn(b["descriptor"], outputs[Path("llms.txt")])

    def test_insecure_redirect_is_rejected_before_reading(self):
        response = mock.MagicMock()
        response.url = "http://chris-page-gov.github.io/okf-example/okf-explorer.json"
        with mock.patch.object(checker, "urlopen") as opened:
            opened.return_value.__enter__.return_value = response
            with self.assertRaisesRegex(ValueError, "public HTTPS"):
                checker.fetch("https://chris-page-gov.github.io/okf-example/okf-explorer.json")
        response.read.assert_not_called()


if __name__ == "__main__":
    unittest.main()
