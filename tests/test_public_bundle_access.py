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

    def test_directory_preserves_known_access_boundaries(self):
        rows = {b["repository"].rsplit("/", 1)[-1]: b for b in access.load()["bundles"]}
        self.assertEqual(len(rows), 13)
        self.assertNotIn("equivalent_raw_descriptor", rows["okf-ons"])
        self.assertNotIn("equivalent_raw_descriptor", rows["okf-uk-living"])
        self.assertIn("/combined/okf-explorer.json", rows["okf-dwp"]["descriptor"])
        self.assertIn("generated/semantic/", rows["okf-uk-living"]["semantic_descriptor"])
        hansard = rows["okf-hansard"]
        self.assertEqual(hansard["declared_okf_version"], "0.3")
        self.assertEqual(hansard["raw_descriptor_sha256"], hansard["descriptor_sha256"])
        self.assertTrue(hansard["producer_directory"].endswith("/okf-hansard/okf-public-access.json"))

    def test_served_discovery_has_the_same_directory(self):
        outputs = access.render(access.load())
        self.assertEqual(outputs[Path("okf-public-access.json")], outputs[Path(".well-known/okf.json")])
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
