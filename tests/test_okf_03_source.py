"""Independent source/Reader coverage and malformed-bundle acceptance cases."""

from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from check_okf_03_source import inspect_bundle, split_source


class SourceAcceptanceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def put(self, route, text):
        path = self.root / route
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        return path

    def test_reserved_files_are_navigation_and_all_concept_bytes_are_bound(self):
        self.put("index.md", "---\nokf_version: '0.3'\n---\n# Contents\n")
        self.put("sub/index.md", "# Contents\n")
        self.put("sub/a.md", "---\ntype: Unknown\nx-extra: {on: on}\n---\n[B](../b.md)")
        b = self.put("b.md", "---\ntype: Reference\n---\nEvidence")
        self.put("README.md", "Reading instructions")
        first, graph = inspect_bundle(self.root)
        self.assertTrue(first["core_conformant"])
        self.assertTrue(first["declares_okf_0_3"])
        self.assertEqual(set(graph["nodes"]), {"sub/a.md", "b.md"})
        self.assertEqual(graph["nodes"]["sub/a.md"]["frontmatter"]["x-extra"], {"on": "on"})
        self.assertEqual(first["explorer_import"]["edges"], 1)
        b.write_text("---\ntype: Reference\n---\nChanged evidence", encoding="utf-8")
        second, _ = inspect_bundle(self.root)
        self.assertNotEqual(first["source_inventory_sha256"], second["source_inventory_sha256"])
        self.assertNotEqual(first["explorer_import"]["sha256"], second["explorer_import"]["sha256"])

    def test_nested_declared_bundles_need_their_own_receipt(self):
        self.put("index.md", "---\nokf_version: '0.3'\n---\n")
        self.put("child/index.md", "---\nokf_version: '0.2'\n---\n")
        self.put("child/a.md", "---\ntype: Child\n---\n")
        receipt, graph = inspect_bundle(self.root)
        self.assertTrue(receipt["core_conformant"])
        self.assertEqual(receipt["inspection"]["excluded_nested_roots"], ["child"])
        self.assertEqual(graph["nodes"], {})

    def test_malformed_frontmatter_does_not_disappear_as_untyped_markdown(self):
        for text in ("---\ntype: Reference", "---\n- sequence\n---\n", "---\ntype: A\ntype: B\n---\n"):
            with self.subTest(text=text):
                with self.assertRaises(ValueError):
                    split_source(text)
        self.put("bad.md", "---\ntype: Reference")
        receipt, graph = inspect_bundle(self.root)
        self.assertFalse(receipt["core_conformant"])
        self.assertIsNone(graph)

    def test_reserved_contract_errors_are_not_relabelled_as_adoption(self):
        self.put("index.md", "---\nokf_version: '0.3'\n---\n")
        self.put("sub/index.md", "---\ntype: Reference\n---\n")
        self.put("log.md", "## 2026-02-30\n")
        receipt, graph = inspect_bundle(self.root)
        self.assertFalse(receipt["core_conformant"])
        self.assertEqual({e["rule"] for e in receipt["errors"]}, {"8", "9"})
        self.assertIsNone(graph)

    def test_a_symlink_cannot_turn_incomplete_inspection_into_a_pass(self):
        self.put("index.md", "---\nokf_version: '0.3'\n---\n")
        (self.root / "linked.md").symlink_to(Path(__file__))
        receipt, graph = inspect_bundle(self.root)
        self.assertEqual(receipt["coverage"], "incomplete")
        self.assertFalse(receipt["core_conformant"])
        self.assertIsNone(graph)

    def test_legacy_declaration_is_not_a_0_3_adoption_claim(self):
        self.put("index.md", "---\nokf_version: '0.2'\n---\n")
        self.put("a.md", "---\ntype: Reference\n---\n")
        receipt, _ = inspect_bundle(self.root)
        self.assertTrue(receipt["core_conformant"])
        self.assertFalse(receipt["declares_okf_0_3"])

    def test_cyclic_yaml_cannot_hang_projection_or_become_a_syntax_claim(self):
        self.put("a.md", "---\ntype: Reference\nx-cycle: &cycle [*cycle]\n---\n")
        receipt, graph = inspect_bundle(self.root)
        self.assertTrue(receipt["core_conformant"])
        self.assertEqual(receipt["explorer_import"]["status"], "failed")
        self.assertIsNone(graph)


if __name__ == "__main__":
    unittest.main()
