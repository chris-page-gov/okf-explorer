"""Directory reader regressions for the two OKF 0.3 breaking changes to links."""
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from import_okf_directory import project
from okf_semantic import SemanticError


class DirectoryReaderTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def put(self, path, text):
        file = self.root / path
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_bytes(text.encode())

    def test_core_edges_and_preservation(self):
        self.put("index.md", "---\r\nokf_version: '0.3'\r\ntitle: Estate\r\ndescription: Estate records\r\nlicense: CC-BY-4.0\r\n---\r\n[Record](a/a.md)")
        self.put("a/log.md", "## 2026-11-23\n- Linked to [B](/b%20file.md)")
        self.put("a/a.md", """---
type: Unregistered
resource: ../b%20file.md
sources: {resource: /b%20file.md}
status: deprecated
superseded_by: /b%20file.md
computation: ../b%20file.md
executor: {resource: ../b%20file.md}
attester: {resource: ../b%20file.md}
tags: "one, two"
'@id': urn:example:a
extension: {nested: on}
---
[Read the evidence][ref]. [External](https://example.org/other.md).

[ref]: ../b%20file.md#section
[Same concept](#section). [Broken](missing.md). [Escape](../../outside.md). [Not a concept](/index.md).
""")
        concept = "---\ntype: Reference\n---\n"
        for path in ["b file.md", "log.md", "a/index.md",
                     ".hidden.md", ".private/hidden.md"]:
            self.put(path, concept)
        self.put("notes.md", "---\nJust a thematic break")
        self.put("a/README.md", "Plain Markdown")
        self.put("data.json", "{}")
        (self.root / "linked.md").symlink_to(self.root / "b file.md")
        result = project(self.root)
        self.assertEqual(result["okf_version"], "0.3")
        self.assertEqual(result["meta"]["title"], "Estate")
        self.assertEqual(result["meta"]["description"], "Estate records")
        self.assertEqual(result["meta"]["license"], "CC-BY-4.0")
        self.assertEqual(
            [(item["path"], item["concepts"]) for item in result["meta"]["navigation"]],
            [("a/log.md", ["b file.md"]), ("index.md", ["a/a.md"])],
        )
        self.assertEqual(set(result["nodes"]), {"a/a.md", "b file.md"})
        self.assertEqual(result["nodes"]["a/a.md"]["frontmatter"]["extension"], {"nested": "on"})
        self.assertEqual(result["nodes"]["a/a.md"]["@id"], "urn:example:a")
        self.assertEqual(result["nodes"]["a/a.md"]["markdown_references"], {"REF": "../b%20file.md#section"})
        self.assertEqual(result["nodes"]["a/a.md"]["markdown_links"], {"../b%20file.md#section": "b file.md"})
        self.assertEqual(result["edges"], [{"source": "a/a.md", "target": "b file.md",
                         "kind": "references", "source_fields": sorted(["markdown", "sources[].resource",
                         "superseded_by", "resource", "computation", "executor.resource", "attester.resource"])}])

    def test_legacy_fallback_is_field_only_and_respects_existing_assets(self):
        self.put("targets/B.md", "---\ntype: Reference\n---\n")
        self.put("records/A.md", "---\ntype: Source\nresource: targets/B.md\n---\n[B](targets/B.md)")
        self.assertEqual(project(self.root)["edges"][0]["source_fields"], ["resource"])
        self.put("records/targets/B.md", "untyped asset")
        self.assertEqual(project(self.root)["edges"], [])
        (self.root / "records/targets/B.md").unlink()
        self.put("index.md", "---\nokf_version: '0.3'\n---\n")
        self.assertEqual(project(self.root)["edges"], [])

    def test_embeds_only_referenced_local_assets_and_licence_on_request(self):
        self.put("index.md", "---\nokf_version: '0.3'\nlicense: /LICENSE.md\n---\n")
        self.put("records/a.md", "---\ntype: A\n---\n![Map](../map.png)")
        self.put("LICENSE.md", "Terms")
        self.put("map.png", "Map")
        self.put("other.txt", "Unreferenced")
        plain = project(self.root)
        self.assertEqual(plain["meta"]["assets"], {})
        self.assertEqual(plain["edges"], [])
        embedded = project(self.root, embed_assets=True)
        self.assertEqual(embedded["meta"]["license_asset"], "LICENSE.md")
        self.assertEqual(embedded["meta"]["assets"], {"LICENSE.md": "VGVybXM=", "map.png": "TWFw"})
        self.assertEqual(embedded["nodes"]["records/a.md"]["asset_links"], {"../map.png": "map.png"})

    def test_duplicate_keys_have_a_file_diagnostic(self):
        self.put("bad.md", "---\ntype: A\ntype: B\n---\n")
        with self.assertRaisesRegex(SemanticError, "bad.md"):
            project(self.root)
