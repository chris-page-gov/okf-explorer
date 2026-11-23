"""Offline tests for GitHub discovery, coverage and public/private boundaries."""
import base64
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from discover_okf_repositories import catalogue


class CatalogueTests(unittest.TestCase):
    def scan(self, *, truncated=False, inspect=False, fail_page=False):
        public = {"full_name": "Owner/research", "private": False, "visibility": "public",
                  "owner": {"login": "Owner"}, "fork": True, "archived": True, "default_branch": "main"}
        hidden = {**public, "full_name": "Owner/restricted", "private": True, "visibility": "private"}

        def api(endpoint):
            if endpoint.startswith("users/"):
                if "page=2" in endpoint:
                    if fail_page:
                        raise ValueError("GitHub HTTP 403")
                    return []
                return [public] + [hidden] * 99
            self.assertNotIn("restricted", endpoint)
            if "/commits/" in endpoint:
                return {"sha": "commit", "commit": {"tree": {"sha": "tree"}}}
            if endpoint.endswith("/git/trees/tree"):
                return {"sha": "tree", "truncated": True, "tree": []}
            if "/git/trees/tree?" in endpoint:
                members = ["README.md", "docs/guide.md", "one/okf-bundle.yamlld", "one/okf-bundle.jsonld",
                           "two/okf.semantic.json", "three/index.md", ".hidden/okf-bundle.json"]
                return {"sha": "tree", "truncated": truncated, "tree": [
                    {"path": p, "type": "blob", "mode": "100644", "sha": str(i)} for i, p in enumerate(members)]}
            self.assertTrue(endpoint.endswith("/git/blobs/5"))
            return {"encoding": "base64", "content": base64.b64encode(b"---\nokf_version: '0.3'\n---\n").decode()}

        return catalogue("Owner", api=api, inspect_indexes=inspect)

    def test_nested_marker_and_declared_index_in_repository_of_any_name(self):
        result = self.scan(inspect=True)
        self.assertEqual(result["public_repositories"], 1)
        self.assertNotIn("restricted", str(result))
        row, = result["repositories"]
        self.assertEqual((row["commit"], row["tree"]), ("commit", "tree"))
        self.assertEqual([r["root"] for r in row["roots"]], ["one", "three", "two"])
        self.assertEqual(row["roots"][1]["evidence"][0]["okf_version"], "0.3")
        self.assertTrue(row["fork"] and row["archived"])

    def test_fast_scan_identifies_uninspected_indexes_and_partial_trees(self):
        result = self.scan(truncated=True)
        row, = result["repositories"]
        self.assertEqual(result["tree_coverage"], "partial")
        self.assertEqual(row["status"], "error")
        self.assertIn("incomplete directory listing", row["errors"])
        row, = self.scan()["repositories"]
        self.assertEqual(row["pending_indexes"], ["three/index.md"])
        self.assertEqual([r["root"] for r in row["roots"]], ["one", "two"])

    def test_error_after_first_page_keeps_only_sanitised_public_rows(self):
        result = self.scan(fail_page=True)
        self.assertEqual(result["tree_coverage"], "partial")
        self.assertEqual(result["enumeration_errors"], ["GitHub HTTP 403"])
        self.assertNotIn("restricted", str(result))
        self.assertEqual(result["candidate_repositories"], 1)
