from __future__ import annotations

import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_okf_estate_registry as estate  # noqa: E402


class OkfEstateRegistryTests(unittest.TestCase):
    def test_canonical_registry_covers_every_reviewed_estate_role(self) -> None:
        registry = estate.build()
        names = {entry["name"] for entry in registry["repositories"]}
        self.assertTrue(
            {
                "okf-explorer",
                "okf-ai-infrastructure",
                "okf-LandRegistry",
                "okf-govuk-content",
                "okf-ons",
                "okf-uk-government-apis",
                "okf-uk-legislation",
                "okf-uk-living",
                "okf-els-api",
                "okf-planning",
                "okf-heritage-coventry-warwickshire",
                "wcc-domesday-map-warwickshire-public",
                "okf-testing",
            }.issubset(names)
        )
        roles = {entry["role"] for entry in registry["repositories"]}
        self.assertEqual(
            {
                "managed-producer-profile",
                "embedded-producer-consumer",
                "immutable-derived-publication-unit",
                "fixture-demonstrator-host",
                "compatibility-redirect",
                "upstream-specification-reference",
            },
            roles,
        )

    def test_local_fixture_is_explicit_and_never_given_a_fake_remote(self) -> None:
        registry = estate.build()
        fixture = next(
            entry for entry in registry["repositories"] if entry["name"] == "okf-testing"
        )
        self.assertIsNone(fixture["repository_url"])
        self.assertEqual("not-applicable", fixture["contract_state"])
        self.assertEqual("non-applicable", fixture["adoption"]["state"])

    def test_every_public_bundle_identifier_resolves_in_semantic_registry(self) -> None:
        registry = estate.build()
        recorded = {
            identifier
            for entry in registry["repositories"]
            for identifier in entry["public_bundle_ids"]
        }
        self.assertTrue(recorded)
        self.assertTrue(recorded.issubset(estate.semantic_bundle_ids()))

    def test_unknown_semantic_bundle_fails_integrity(self) -> None:
        registry = copy.deepcopy(estate.build())
        registry["repositories"][0]["public_bundle_ids"] = [
            "https://example.invalid/bundles/not-registered"
        ]
        errors = estate.integrity_errors(registry)
        self.assertTrue(any("unknown semantic bundle" in error for error in errors))

    def test_human_projection_has_stable_anchors_and_machine_link(self) -> None:
        registry = estate.build()
        rendered = estate.render_html(registry)
        self.assertIn('lang="en-GB"', rendered)
        self.assertIn('id="repository-okf-explorer"', rendered)
        self.assertIn('href="../../okf-estate-registry.json"', rendered)
        self.assertIn(
            '<link rel="icon" type="image/svg+xml" href="../../favicon.svg">',
            rendered,
        )
        self.assertIn("Command strings in repository contracts are untrusted", rendered)
        self.assertIn('id="optimisation-backlog"', rendered)

    def test_committed_projection_is_exact(self) -> None:
        expected = estate.render_json(estate.build())
        self.assertEqual(expected, estate.OUTPUT.read_text(encoding="utf-8"))

    def test_schema_rejects_local_null_url_for_a_managed_producer(self) -> None:
        registry = copy.deepcopy(estate.build())
        registry["repositories"][0]["repository_url"] = None
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "registry.yaml"
            # JSON is a valid YAML subset and avoids altering the canonical source.
            path.write_text(json.dumps(registry), encoding="utf-8")
            with self.assertRaisesRegex(
                estate.EstateRegistryError,
                "fixture-demonstrator-host",
            ):
                estate.build(path)


if __name__ == "__main__":
    unittest.main()
