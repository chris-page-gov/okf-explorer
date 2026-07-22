from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_okf_registry  # noqa: E402
import okf_semantic  # noqa: E402


class OkfSemanticTest(unittest.TestCase):
    fixture_root = ROOT / "tests" / "fixtures" / "yaml_ld"

    def test_yaml_ld_frontmatter_parses_and_expands_with_pinned_context(self) -> None:
        page = okf_semantic.parse_markdown(self.fixture_root / "concept.md")
        self.assertEqual("https://example.gov.uk/okf/concepts/example", page.metadata["@id"])
        self.assertEqual(["example", "government"], page.metadata["tags"])
        self.assertIn("Human-readable Markdown", page.body)
        self.assertFalse(okf_semantic.schema_errors(page.metadata, "concept.schema.json"))
        expanded = okf_semantic.expand(page.metadata)
        self.assertEqual("https://example.gov.uk/okf/concepts/example", expanded[0]["@id"])
        self.assertIn("http://purl.org/dc/terms/title", expanded[0])

    def test_bundle_descriptor_matches_profile_schema(self) -> None:
        bundle = okf_semantic.load_yaml_ld(self.fixture_root / "bundle.yamlld")
        self.assertIsInstance(bundle, dict)
        assert isinstance(bundle, dict)
        self.assertEqual([], okf_semantic.schema_errors(bundle, "bundle.schema.json"))
        self.assertTrue(okf_semantic.expand(bundle))

    def test_explorer_presentation_profile_matches_implemented_contract(self) -> None:
        profile = {
            "schema": "okf-explorer-presentation.v1",
            "status": "experimental",
            "defaults": {"facet_mode": "suggested", "search_threshold": 48},
            "facets": [
                {
                    "key": "publisher",
                    "label": "Provider",
                    "default_state": "pinned",
                    "open_control": "search",
                }
            ],
            "panels": {
                "left": {"tabs": ["facets", "browse", "results"], "default_tab": "facets"},
                "right": {"tabs": ["overview", "evidence", "data"], "default_tab": "overview"},
            },
        }
        self.assertEqual([], okf_semantic.schema_errors(profile, "presentation.schema.json"))

        profile["panels"]["right"]["tabs"] = [{"id": "custom", "label": "Custom"}]
        self.assertTrue(okf_semantic.schema_errors(profile, "presentation.schema.json"))

        profile["panels"]["right"] = {"tabs": ["overview", "data"], "default_tab": "evidence"}
        self.assertTrue(okf_semantic.schema_errors(profile, "presentation.schema.json"))

    def test_yaml_12_and_yaml_ld_representation_rules(self) -> None:
        document = okf_semantic.load_yaml_ld_text("yes: no\nwhen: 2026-07-11\n")
        self.assertEqual({"yes": "no", "when": "2026-07-11"}, document)
        with self.assertRaises(okf_semantic.SemanticError):
            okf_semantic.load_yaml_ld_text("value: .inf\n")
        with self.assertRaises(okf_semantic.SemanticError):
            okf_semantic.load_yaml_ld_text("? [not, a, string]\n: invalid\n")

    def test_remote_contexts_are_allowlisted(self) -> None:
        with self.assertRaises(okf_semantic.SemanticError):
            okf_semantic.expand({"@context": "https://untrusted.example/context", "@id": "https://example.test/item"})

    def test_registry_has_one_semantic_source_and_two_deterministic_outputs(self) -> None:
        rendered = build_okf_registry.build()
        legacy = json.loads(rendered["legacy"])
        semantic = json.loads(rendered["semantic"])
        self.assertEqual("okf-explorer-registry.v1", legacy["schema"])
        self.assertEqual(5, len(legacy["bundles"]))
        self.assertIn(
            "https://chris-page-gov.github.io/okf-ons/okf-explorer.json",
            {bundle["url"] for bundle in legacy["bundles"]},
        )
        self.assertEqual("registry/okf-registry.yamlld", legacy["semantic_source"])
        self.assertIn("@context", semantic)


if __name__ == "__main__":
    unittest.main()
