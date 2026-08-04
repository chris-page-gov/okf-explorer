from __future__ import annotations

import copy
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_okf_bundle  # noqa: E402
import build_okf_registry  # noqa: E402
import okf_semantic  # noqa: E402
import update_viewer  # noqa: E402


class OkfSemanticTest(unittest.TestCase):
    fixture_root = ROOT / "tests" / "fixtures" / "yaml_ld"

    def test_yaml_ld_frontmatter_parses_and_expands_with_pinned_context(self) -> None:
        page = okf_semantic.parse_markdown(self.fixture_root / "concept.md")
        self.assertEqual("https://example.gov.uk/okf/concepts/example", page.metadata["@id"])
        self.assertEqual(["example", "government"], page.metadata["tags"])
        self.assertIn("Human-readable Markdown", page.body)
        self.assertEqual([], okf_semantic.validate_v02_concept(page.metadata, page.body))
        self.assertEqual("human-reviewed", okf_semantic.trust_tier(page.metadata))
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

    def test_yaml_ld_materialization_and_graph_identity_ignore_formatting(self) -> None:
        compact_source = f'''\
'@context': {okf_semantic.CONTEXT_URL}
'@id': https://example.test/heritage/coventry-cathedral
'@type': https://schema.org/LandmarksOrHistoricalBuildings
title: Coventry Cathedral
description: A semantic identity fixture.
'''
        reformatted_source = f'''\
# Mapping order, indentation and scalar quoting are presentation only.
description: "A semantic identity fixture."
title: 'Coventry Cathedral'
'@type': "https://schema.org/LandmarksOrHistoricalBuildings"
'@id': https://example.test/heritage/coventry-cathedral
'@context':
  {okf_semantic.CONTEXT_URL}
'''

        compact = okf_semantic.materialize_yaml_ld(
            compact_source, source="compact.yamlld"
        )
        reformatted = okf_semantic.materialize_yaml_ld(
            reformatted_source, source="reformatted.yamlld"
        )

        self.assertEqual(compact.document, reformatted.document)
        self.assertEqual(
            compact.normalized_graph_sha256,
            reformatted.normalized_graph_sha256,
        )
        self.assertEqual(compact.normalized_statements, reformatted.normalized_statements)
        json_ld = json.loads(compact.json_ld)
        self.assertEqual(compact.document, json_ld)
        self.assertEqual(
            compact.normalized_graph_sha256,
            okf_semantic.semantic_graph_identity(json_ld)["sha256"],
        )

    def test_deterministic_yaml_ld_renderer_round_trips_json_data_model(self) -> None:
        document = okf_semantic.load_yaml_ld(self.fixture_root / "bundle.yamlld")
        assert isinstance(document, dict)

        rendered = okf_semantic.render_yaml_ld(document)

        self.assertFalse(rendered.lstrip().startswith("{"))
        self.assertIn("'@context':", rendered)
        self.assertEqual(
            document,
            okf_semantic.load_yaml_ld_text(rendered, source="generated.yamlld"),
        )
        self.assertEqual(rendered, okf_semantic.render_yaml_ld(document))

    def test_semantic_assertion_reconciles_direct_triple_and_compiles_routes(self) -> None:
        page = okf_semantic.parse_markdown(
            self.fixture_root / "semantic_concept.md"
        )
        self.assertEqual([], okf_semantic.validate_semantic_assertions(page.metadata))

        registry = okf_semantic.build_iri_route_registry(
            {"semantic/example": page.metadata},
            snapshot="semantic-fixture-1",
        )
        self.assertEqual([], okf_semantic.validate_iri_route_registry(registry))
        self.assertEqual(2, registry["counts"]["entries"])

        predicate_registry = okf_semantic.build_predicate_registry(
            [
                {
                    "iri": "https://example.test/vocabulary/heritage#hasDesignation",
                    "preferred_label": "has designation",
                    "inverse_label": "designation of",
                    "description": "Links an asset to its designation record.",
                    "domain": ["https://example.test/vocabulary/heritage#HeritageAsset"],
                    "range": ["https://example.test/vocabulary/heritage#Designation"],
                    "super_properties": [],
                    "characteristics": [],
                    "assertion_statuses": ["normalized"],
                    "evidence_policy": {
                        "minimum_fields": ["source_field", "source_value_sha256"]
                    },
                    "source_vocabulary": {
                        "iri": "https://example.test/vocabulary/heritage",
                        "version": "1",
                    },
                    "status": "active",
                }
            ],
            snapshot="semantic-fixture-1",
            generated_at_value="2026-08-01T12:00:00Z",
        )
        relationships, errors = okf_semantic.compile_semantic_relationships(
            page.metadata,
            registry,
            predicate_registry=predicate_registry,
        )
        self.assertEqual([], errors)
        self.assertEqual(1, len(relationships))
        relationship = relationships[0]
        self.assertEqual("heritage/asset/example", relationship["source"])
        self.assertEqual("heritage/designation/example", relationship["target"])
        self.assertEqual("normalized", relationship["assertion_status"])
        self.assertEqual("real-world", relationship["assertion_scope"])
        self.assertEqual("derived", relationship["authority"]["class"])
        self.assertEqual(
            "https://example.test/vocabulary/heritage#hasDesignation",
            relationship["predicate"],
        )
        self.assertEqual(
            [],
            okf_semantic.schema_errors(
                okf_semantic.semantic_model_extension(
                    registry,
                    predicate_registry,
                ),
                "semantic-model.schema.json",
            ),
        )

        object_form = copy.deepcopy(page.metadata)
        assertion = object_form["assertions"][0]
        assertion["derivation"] = {"@id": assertion["derivation"]}
        assertion["derivation_activity"] = {
            "@id": assertion["derivation_activity"]
        }
        assertion["rule"] = {"@id": "https://example.test/rules/normalization-v1"}
        assertion["supporting_assertions"] = [
            {"@id": "https://example.test/assertions/source-1"}
        ]
        object_relationships, object_errors = okf_semantic.compile_semantic_relationships(
            object_form,
            registry,
            predicate_registry=predicate_registry,
        )
        self.assertEqual([], object_errors)
        self.assertEqual(
            "https://example.test/rules/normalization-v1",
            object_relationships[0]["rule"],
        )
        self.assertEqual(
            ["https://example.test/assertions/source-1"],
            object_relationships[0]["supporting_assertions"],
        )

    def test_explorer_graph_projects_semantic_routes_and_runtime_assertions(self) -> None:
        fixture = self.fixture_root / "semantic_concept.md"
        reference = self.fixture_root / "semantic_reference.md"
        with patch.object(
            update_viewer,
            "iter_okf_markdown",
            return_value=[fixture, reference],
        ):
            graph, errors = update_viewer.build_graph()

        self.assertEqual([], errors)
        self.assertEqual(
            {
                "heritage/asset/example",
                "heritage/designation/example",
                "heritage/method/example",
            },
            set(graph["nodes"]),
        )
        self.assertEqual(
            [
                ["heritage/asset/example", "heritage/designation/example"],
                ["heritage/asset/example", "heritage/method/example"],
            ],
            graph["edges"],
        )
        self.assertEqual("real-world", graph["assertion_scope"])
        self.assertEqual(2, len(graph["relationships"]))
        relationship = next(
            row
            for row in graph["relationships"]
            if row["predicate"]
            == "https://example.test/vocabulary/heritage#hasDesignation"
        )
        self.assertEqual("okf-relationship-assertion.v2", relationship["schema"])
        self.assertEqual("normalized", relationship["assertion_status"])
        self.assertEqual(
            [],
            okf_semantic.schema_errors(
                relationship,
                "federation/v1/relationship-assertion.schema.json",
            ),
        )
        self.assertEqual(
            "okf-semantic-model.v1",
            graph["semantic_model"]["schema"],
        )
        reference_relationship = next(
            row
            for row in graph["relationships"]
            if row["predicate"] == okf_semantic.DCTERMS_REFERENCES
        )
        self.assertEqual("normalized", reference_relationship["assertion_status"])
        self.assertEqual("derived", reference_relationship["authority"]["class"])
        self.assertEqual(
            "https://example.test/heritage/references/method.html",
            reference_relationship["target_iri"],
        )
        self.assertEqual(
            "tests/fixtures/yaml_ld/semantic_concept.md",
            reference_relationship["evidence"][0]["source_artifact"],
        )
        self.assertEqual(
            "tests/fixtures/yaml_ld/semantic_reference.md",
            reference_relationship["evidence"][0]["source_value"],
        )
        self.assertRegex(
            reference_relationship["evidence"][0]["source_sha256"],
            r"^[0-9a-f]{64}$",
        )

    def test_semantic_model_accepts_integrity_bound_external_registries(self) -> None:
        reference = {
            "path": "data/semantic/registry.json",
            "sha256": "a" * 64,
            "media_type": "application/json",
        }
        extension = okf_semantic.semantic_model_extension(
            reference,
            {
                **reference,
                "path": "data/semantic/predicates.json",
                "sha256": "b" * 64,
            },
        )
        self.assertEqual([], okf_semantic.schema_errors(extension, "semantic-model.schema.json"))

    def test_normalized_bundle_keeps_semantics_and_markdown_source_paths(self) -> None:
        fixtures = [
            self.fixture_root / "semantic_concept.md",
            self.fixture_root / "semantic_reference.md",
        ]
        with patch.object(update_viewer, "iter_okf_markdown", return_value=fixtures):
            bundle, errors = build_okf_bundle.build_bundle()

        self.assertEqual([], errors)
        corpus = next(iter(bundle["corpora"].values()))
        self.assertEqual("real-world", corpus["assertion_scope"])
        self.assertEqual(2, len(corpus["relationships"]))
        self.assertEqual(
            "tests/fixtures/yaml_ld/semantic_concept.md",
            corpus["nodes"]["heritage/asset/example"]["source"],
        )
        self.assertEqual(
            "okf-semantic-model.v1",
            bundle["extensions"]["okf-semantic-model.v1"]["schema"],
        )

    def test_semantic_assertions_fail_closed_on_projection_or_integrity_drift(self) -> None:
        page = okf_semantic.parse_markdown(
            self.fixture_root / "semantic_concept.md"
        )
        without_direct_triple = copy.deepcopy(page.metadata)
        without_direct_triple.pop("has_designation")
        errors = okf_semantic.validate_semantic_assertions(without_direct_triple)
        self.assertTrue(
            any("no matching direct triple" in error for error in errors),
            errors,
        )

        registry = okf_semantic.build_iri_route_registry(
            {"semantic/example": page.metadata},
            snapshot="semantic-fixture-1",
        )
        registry["entries"][0]["route"] = "heritage/asset/tampered"
        errors = okf_semantic.validate_iri_route_registry(registry)
        self.assertIn(
            "root_sha256 does not bind the canonical registry material",
            errors,
        )

        invalid_runtime = {
            "schema": "okf-relationship-assertion.v2",
            "source": "heritage/asset/example",
            "target": "heritage/designation/example",
            "predicate": "https://example.test/vocabulary/hasDesignation",
            "assertion_status": "official",
            "assertion_scope": "real-world",
            "authority": {"class": "derived"},
            "derivation": "source field",
        }
        self.assertTrue(
            okf_semantic.schema_errors(
                invalid_runtime,
                "federation/v1/relationship-assertion.schema.json",
            )
        )

        mixed_scope = copy.deepcopy(page.metadata)
        synthetic_assertion = copy.deepcopy(mixed_scope["assertions"][0])
        synthetic_assertion["@id"] = "https://example.test/assertions/synthetic-copy"
        synthetic_assertion["assertion_scope"] = "synthetic-fixture"
        synthetic_assertion["authority"] = {
            "class": "synthetic",
            "label": "Synthetic copy",
            "source": "https://example.test/source/example",
        }
        mixed_scope["assertions"].append(synthetic_assertion)
        self.assertIn(
            "real-world and synthetic-fixture assertions must be published as separate semantic documents",
            okf_semantic.validate_semantic_assertions(mixed_scope),
        )

    def test_semantic_context_loader_rejects_unreviewed_remote_context(self) -> None:
        with self.assertRaisesRegex(
            okf_semantic.SemanticError,
            "not allowlisted",
        ):
            okf_semantic.expand(
                {
                    "@context": "https://example.test/unreviewed-context.jsonld",
                    "@id": "https://example.test/id",
                }
            )

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

    def test_governed_term_profiles_validate_meaning_provenance_and_checks(self) -> None:
        registry = {
            "schema": "okf-explorer-governed-terms.v1",
            "title": "Governed metadata terms",
            "description": "Terms used by a bounded metadata projection.",
            "snapshot": "snapshot-1",
            "generated_at": "2026-07-26T12:00:00Z",
            "review": {
                "applicationStatus": "validated-for-bounded-use",
                "checkedAt": "2026-07-26T12:00:00Z",
                "checkedBy": "process:standards-review",
                "liveLookupPerformed": False,
                "method": "curated-static-specification-review",
                "scope": "Emitted semantic metadata.",
            },
            "vocabularies": [
                {
                    "id": "dcat-3",
                    "namespace": "http://www.w3.org/ns/dcat#",
                    "prefix": "dcat",
                    "source": "https://www.w3.org/TR/vocab-dcat-3/",
                    "title": "Data Catalog Vocabulary (DCAT) Version 3",
                    "version": "W3C Recommendation",
                }
            ],
            "terms": [
                {
                    "application": "Used only for the service-level record.",
                    "definition": "A collection of operations that provides access to data.",
                    "id": "dcat:DataService",
                    "iri": "http://www.w3.org/ns/dcat#DataService",
                    "kind": "class",
                    "label": "Data service",
                    "provenance": {
                        "resource": "https://www.w3.org/TR/vocab-dcat-3/",
                        "version": "W3C Recommendation",
                        "vocabulary": "dcat-3",
                    },
                    "validation": {
                        "recognition": "validated",
                        "meaning": "validated",
                        "application": "validated",
                        "method": "curated-static-specification-review",
                        "checkedBy": "process:standards-review",
                        "checkedAt": "2026-07-26T12:00:00Z",
                    },
                    "status": "validated",
                    "usage": [
                        {
                            "artifact": "okf-bundle.jsonld",
                            "occurrences": 1,
                            "samplePaths": ["$.service.@type"],
                        }
                    ],
                    "vocabulary": "dcat-3",
                }
            ],
            "counts": {
                "standardsTerms": 1,
                "uiTerms": 0,
            },
        }
        validation = {
            "schema": "okf-explorer-governed-term-validation.v1",
            "snapshot": "snapshot-1",
            "generated_at": "2026-07-26T12:00:00Z",
            "status": "conformant",
            "checkedAt": "2026-07-26T12:00:00Z",
            "checkedBy": "process:standards-review",
            "method": "curated-static-specification-review",
            "scope": "Emitted semantic metadata.",
            "liveLookupPerformed": False,
            "checks": {
                "authoritativeProvenance": "passed",
                "boundedApplicationReviewed": "passed",
                "generatedTermCoverage": "passed",
                "meaningReviewed": "passed",
                "namespaceExpansion": "passed",
                "termRecognition": "passed",
                "termKindDeclared": "passed",
                "uniqueIdentifiers": "passed",
            },
            "counts": {
                "registeredTerms": 1,
                "unregisteredTerms": 0,
            },
            "limitations": ["Closed-world validation against a curated register."],
            "unregisteredTerms": [],
            "unusedStandardsTerms": [],
            "pendingApplicationReviews": [],
        }
        self.assertEqual(
            [],
            okf_semantic.schema_errors(registry, "governed-terms.schema.json"),
        )
        self.assertEqual(
            [],
            okf_semantic.schema_errors(
                validation, "governed-term-validation.schema.json"
            ),
        )

        invalid_registry = json.loads(json.dumps(registry))
        invalid_registry["terms"][0]["id"] = "dcat:Imagined Class"
        self.assertTrue(
            okf_semantic.schema_errors(
                invalid_registry, "governed-terms.schema.json"
            )
        )

        contradictory_validation = json.loads(json.dumps(validation))
        contradictory_validation["unregisteredTerms"] = ["dcat:ImaginedClass"]
        self.assertTrue(
            okf_semantic.schema_errors(
                contradictory_validation,
                "governed-term-validation.schema.json",
            )
        )

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
        self.assertEqual(
            len(semantic["@graph"][0]["bundles"]),
            len(legacy["bundles"]),
        )
        self.assertIn(
            "https://chris-page-gov.github.io/okf-ons/okf-explorer.json",
            {bundle["url"] for bundle in legacy["bundles"]},
        )
        retired_heritage_url = (
            "https://chris-page-gov.github.io/okf-explorer/"
            "evaluation/heritage/okf-explorer.json"
        )
        external_heritage_url = (
            "https://chris-page-gov.github.io/"
            "okf-heritage-coventry-warwickshire/okf-explorer.json"
        )
        registered_urls = {bundle["url"] for bundle in legacy["bundles"]}
        self.assertIn(external_heritage_url, registered_urls)
        self.assertNotIn(retired_heritage_url, registered_urls)
        self.assertEqual("registry/okf-registry.yamlld", legacy["semantic_source"])
        whole_law = next(
            bundle
            for bundle in legacy["bundles"]
            if bundle["url"].endswith("/whole-law/okf-explorer.json")
        )
        self.assertEqual("bundle/whole-law", whole_law["raw_subpath"])
        self.assertEqual("descriptor", whole_law["routes"][0]["purpose"])
        self.assertIn("@context", semantic)


if __name__ == "__main__":
    unittest.main()
