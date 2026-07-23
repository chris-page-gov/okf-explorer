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

    def test_provider_datapack_profiles_validate_the_bounded_snapshot_contract(self) -> None:
        snapshot = "monday-2026-07-17-r2"
        manifest = {
            "schema": "okf-explorer-provider-datapack-manifest.v1",
            "snapshot": snapshot,
            "packCount": 1,
            "packs": [
                {
                    "id": "ons-explore-local-statistics",
                    "selector": {
                        "field": "source_surface",
                        "operator": "equals",
                        "value": "ons-explore-local-statistics",
                    },
                    "path": "data/providers/ons-explore-local-statistics.json",
                    "sha256": "b" * 64,
                    "status": "known-drift",
                    "lastChecked": "2026-07-23",
                }
            ],
        }
        pack = {
            "schema": "okf-explorer-provider-datapack.v1",
            "snapshot": snapshot,
            "id": "ons-explore-local-statistics",
            "provider": {
                "id": "ons-explore-local-statistics",
                "title": "ONS Explore Local Statistics",
                "liveServiceUrl": "https://www.ons.gov.uk/explore-local-statistics/",
                "repositoryUrl": "https://github.com/ONSdigital/explore-local-statistics-app",
            },
            "selector": manifest["packs"][0]["selector"],
            "governedSnapshot": {
                "status": "governed-pinned-snapshot",
                "label": "Governed snapshot",
                "snapshotId": snapshot,
                "recordCount": 108,
                "sourceCommit": "795eaf204f47986f6be248a63f857a42afe4fdf2",
                "sourceCommitShort": "795eaf2",
                "sourceAsOf": "2026-07-17T08:35:03Z",
                "sourceAsOfBasis": "provenance.source_commit_as_of",
                "metadataOnly": True,
                "observationsIncluded": False,
                "records": [
                    {
                        "recordId": "ons-explore-local-statistics:indicator:average-house-price",
                        "title": "Average house price",
                        "timeCoverageEnd": "2026-04-01/P1M",
                    }
                ],
            },
            "reviewedLiveReference": {
                "status": "reviewed-reference-not-live-validated",
                "label": "Reviewed upstream state on 23 July 2026",
                "lastChecked": "2026-07-23",
                "network": "external",
                "liveServiceUrl": "https://www.ons.gov.uk/explore-local-statistics/",
                "repositoryUrl": "https://github.com/ONSdigital/explore-local-statistics-app",
                "sourceCommit": "d5f0ac948f8f2f5da2dacd0011ef4e4778918b01",
                "sourceCommitShort": "d5f0ac9",
                "sourceCommitAsOf": "2026-07-22T13:44:20Z",
                "metadataInputSha256": "a" * 64,
                "records": [
                    {
                        "recordId": "ons-explore-local-statistics:indicator:average-house-price",
                        "title": "Average house price",
                        "timeCoverageEnd": "2026-05-01/P1M",
                    }
                ],
            },
            "comparison": {
                "status": "known-drift",
                "comparisonAsOf": "2026-07-23",
                "summary": "The bounded reviewed reference contains a known record difference.",
                "evidenceScope": "reviewed-record-examples",
                "exhaustive": False,
                "executionRequiresLiveValidation": True,
                "differences": [
                    {
                        "recordId": "ons-explore-local-statistics:indicator:average-house-price",
                        "title": "Average house price",
                        "fields": [
                            {
                                "field": "timeCoverage.end",
                                "snapshot": "2026-04-01/P1M",
                                "reviewedLiveReference": "2026-05-01/P1M",
                            }
                        ],
                    }
                ],
            },
            "presentation": {
                "snapshotLabel": "Governed snapshot",
                "liveLabel": "Reviewed live reference",
                "lastCheckedWording": "Last checked 23 July 2026; not live-validated here.",
                "notice": "The external service may have changed since review.",
                "actions": [
                    {
                        "id": "open-live-indicator",
                        "label": "Open live indicator",
                        "kind": "external-link",
                        "urlTemplate": "https://www.ons.gov.uk/explore-local-statistics/indicators/{native_id}",
                        "network": "external",
                    },
                    {
                        "id": "open-live-service",
                        "label": "Open live service",
                        "kind": "external-link",
                        "urlTemplate": "https://www.ons.gov.uk/explore-local-statistics/",
                        "network": "external",
                    },
                ],
            },
        }

        self.assertEqual(
            [],
            okf_semantic.schema_errors(manifest, "provider-datapack-manifest.schema.json"),
        )
        self.assertEqual([], okf_semantic.schema_errors(pack, "provider-datapack.schema.json"))

        unsafe_manifest = json.loads(json.dumps(manifest))
        unsafe_manifest["packs"][0]["path"] = "%2e%2e/provider.json"
        self.assertTrue(
            okf_semantic.schema_errors(
                unsafe_manifest, "provider-datapack-manifest.schema.json"
            )
        )

        exhaustive_pack = json.loads(json.dumps(pack))
        exhaustive_pack["comparison"]["exhaustive"] = True
        self.assertTrue(
            okf_semantic.schema_errors(exhaustive_pack, "provider-datapack.schema.json")
        )

        aligned_with_differences = json.loads(json.dumps(pack))
        aligned_with_differences["comparison"]["status"] = "aligned"
        self.assertTrue(
            okf_semantic.schema_errors(
                aligned_with_differences, "provider-datapack.schema.json"
            )
        )

        unsafe_action_pack = json.loads(json.dumps(pack))
        unsafe_action_pack["presentation"]["actions"][0]["urlTemplate"] = (
            "https://example.test/{record_id}"
        )
        self.assertTrue(
            okf_semantic.schema_errors(unsafe_action_pack, "provider-datapack.schema.json")
        )

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
