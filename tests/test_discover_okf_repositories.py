"""Offline tests for GitHub discovery, coverage and public/private boundaries."""
import base64
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from discover_okf_repositories import candidate_snapshot, catalogue, inspect_repo, public_snapshot, walk_tree


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

    def test_truncated_tree_is_recovered_without_losing_nested_members(self):
        responses = {
            "repos/owner/repo/git/trees/root?recursive=1": {"sha": "root", "truncated": True, "tree": []},
            "repos/owner/repo/git/trees/root": {"sha": "root", "truncated": False, "tree": [
                {"path": "nested", "type": "tree", "sha": "child"},
                {"path": "index.md", "type": "blob", "sha": "a"}]},
            "repos/owner/repo/git/trees/child?recursive=1": {"sha": "child", "truncated": False, "tree": [
                {"path": "concept.md", "type": "blob", "sha": "b"}]},
        }
        recovered = []
        rows = list(walk_tree("repos/owner/repo", "root", responses.__getitem__, recovered))
        self.assertEqual([r["path"] for r in rows], ["index.md", "nested/concept.md"])
        self.assertEqual(recovered, [{"path": ".", "tree": "root"}])

    def test_missing_default_branch_is_empty_only_when_no_branches_exist(self):
        repo = {"full_name": "Owner/empty", "private": True, "archived": False, "fork": False}
        row = inspect_repo(repo, True, lambda endpoint: [])
        self.assertEqual(row["status"], "empty")
        self.assertEqual(row["visibility"], "private")
        broken = inspect_repo(repo, True, lambda endpoint: [{"name": "work"}])
        self.assertEqual(broken["status"], "error")
        self.assertIn("populated repository has no default branch", broken["errors"])

    def test_authenticated_scan_preserves_restricted_scope_and_empty_disposition(self):
        calls = []
        def api(endpoint):
            calls.append(endpoint)
            if endpoint == "user":
                return {"login": "Owner"}
            if endpoint.startswith("user/repos?"):
                return [{"full_name": "Owner/empty", "private": True, "visibility": "private",
                         "owner": {"login": "Owner"}, "archived": False, "fork": False}]
            return []
        result = candidate_snapshot(catalogue("Owner", api=api, visibility="accessible"))
        self.assertEqual(result["repositories_seen"], 1)
        self.assertEqual(result["public_repositories"], 0)
        self.assertEqual(result["repository_states"], {"empty": 1})
        self.assertEqual(result["repositories"][0]["status"], "empty")
        self.assertEqual(result["visibility"], "accessible")
        published = candidate_snapshot(public_snapshot(result))
        self.assertNotIn("Owner/empty", str(published))
        self.assertEqual(published["repositories_seen"], 0)
        self.assertEqual(published["repository_states"], {})
        with self.assertRaisesRegex(ValueError, "authenticated repository owner"):
            catalogue("SomeoneElse", api=api, visibility="accessible")

    def test_uninspected_indexes_make_discovery_incomplete(self):
        result = self.scan()
        self.assertEqual(result["tree_coverage"], "complete")
        self.assertEqual(result["discovery_coverage"], "partial")
        self.assertEqual(self.scan(inspect=True)["discovery_coverage"], "complete")
