from __future__ import annotations

import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_heritage_evaluation as heritage  # noqa: E402
import okf_semantic  # noqa: E402


GENERATED_AT = "2026-08-02T00:00:00Z"


def tiny_snapshot() -> dict:
    return {
        "schema": "heritage-evaluation-source-snapshot.v1",
        "snapshot_id": "tiny-test-snapshot-v1",
        "observed_at": GENERATED_AT,
        "geometry_delivery": {
            "crs": "EPSG:4326",
            "arcgis_out_sr": "4326",
            "coordinate_order": "longitude-latitude",
            "coordinate_transformation": "none-after-source-delivery",
        },
        "publication": {
            "public_base": "https://chris-page-gov.github.io/okf-explorer/evaluation/heritage/tiny/",
            "role": "tiny",
            "title": "Tiny source-backed heritage assurance fixture",
            "description": "Two records for producer and real-consumer assurance.",
            "status": "assurance-fixture",
        },
        "scope": {
            "assertion_scope": "real-world",
            "vintage": "December 2025 BFC",
            "intersection_method": "Exact source geometry intersection with the pinned boundary.",
            "boundaries": [
                {
                    "code": "E08000026",
                    "name": "Coventry",
                    "aliases": ["City of Coventry"],
                }
            ],
        },
        "nhle": {
            "layers": [
                {
                    "id": 0,
                    "name": "Listed Buildings",
                    "features": [
                        {
                            "attributes": {
                                "OBJECTID": 1,
                                "ListEntry": "1342941",
                                "Name": "CATHEDRAL CHURCH OF ST MICHAEL",
                                "Grade": "I",
                                "ListDate": "1962-02-05",
                                "NGR": "SP3378578997",
                                "hyperlink": "https://historicengland.org.uk/listing/the-list/list-entry/1342941",
                            },
                            "geometry": {"x": -1.506, "y": 52.408},
                            "spatialReference": {"wkid": 4326, "latestWkid": 4326},
                            "scope_geographies": [
                                {
                                    "code": "E08000026",
                                    "name": "Coventry",
                                    "basis": "exact-spatial-intersection",
                                }
                            ],
                        }
                    ],
                }
            ]
        },
        "har": {
            "annual": [
                {
                    "year": 2025,
                    "event_type": "entry",
                    "workbook_format": "xlsx",
                    "source_url": "https://historicengland.org.uk/content/docs/har/har-2025-entries-additions-removals/",
                    "sha256": "a" * 64,
                    "rows": [
                        {
                            "record_id": "tiny-har-1",
                            "source_sheet": "Entries",
                            "source_row": 2,
                            "List Entry": "1342941",
                            "Name": "Cathedral Church of St Michael",
                            "Local Planning Authority": "Coventry",
                            "Assessment Type": "Place of Worship",
                            "Condition": "Poor",
                            "Trend": "Improving",
                            "URL": "https://historicengland.org.uk/listing/heritage-at-risk/search-register/list-entry/1342941",
                            "scope_geographies": [
                                {
                                    "code": "E08000026",
                                    "name": "Coventry",
                                    "basis": "source-local-authority-field",
                                }
                            ],
                            "scope_match_evidence": [
                                {
                                    "field": "Local Planning Authority",
                                    "value": "Coventry",
                                    "matched_code": "E08000026",
                                }
                            ],
                        }
                    ],
                }
            ]
        },
        "sources": [],
        "denominators": [
            {
                "id": "tiny-records",
                "definition": "Declared tiny rows",
                "method": "Static enumeration",
                "status": "complete",
                "count": 2,
            }
        ],
        "requests": [],
        "limitations": [],
        "link_validation": {"live_receipts": []},
    }


class HeritageEvaluationBuilderTest(unittest.TestCase):
    def test_esri_rings_preserve_disjoint_exteriors_and_contained_holes(self) -> None:
        first_exterior = [[0, 0], [0, 4], [4, 4], [4, 0], [0, 0]]
        first_hole = [[1, 1], [3, 1], [3, 3], [1, 3], [1, 1]]
        second_exterior = [[10, 10], [10, 12], [12, 12], [12, 10], [10, 10]]

        geometry = heritage.esri_geometry_to_geojson(
            {"rings": [first_exterior, first_hole, second_exterior]}
        )

        self.assertEqual("MultiPolygon", geometry["type"])
        self.assertEqual([first_exterior, first_hole], geometry["coordinates"][0])
        self.assertEqual([second_exterior], geometry["coordinates"][1])
        self.assertEqual(
            sum(len(ring) for ring in [first_exterior, first_hole, second_exterior]),
            sum(
                len(ring)
                for polygon in geometry["coordinates"]
                for ring in polygon
            ),
        )

    def test_esri_single_exterior_with_hole_remains_a_polygon(self) -> None:
        exterior = [[0, 0], [0, 4], [4, 4], [4, 0], [0, 0]]
        hole = [[1, 1], [3, 1], [3, 3], [1, 3], [1, 1]]

        geometry = heritage.esri_geometry_to_geojson({"rings": [exterior, hole]})

        self.assertEqual({"type": "Polygon", "coordinates": [exterior, hole]}, geometry)

    def test_gzip_json_has_a_runtime_independent_header(self) -> None:
        compressed = heritage.gzip_json({"value": "Coventry"})

        self.assertEqual(
            b"\x1f\x8b\x08\x00\x00\x00\x00\x00\x00\xff",
            compressed[:10],
        )
        self.assertEqual(
            b'{"value":"Coventry"}\n',
            heritage.gzip.decompress(compressed),
        )

    def test_tiny_raw_source_builds_linked_asset_and_annual_observation(self) -> None:
        corpus = heritage.build_corpus(tiny_snapshot(), GENERATED_AT)

        self.assertEqual(2, corpus["descriptor"]["counts"]["records"])
        self.assertEqual(1, corpus["descriptor"]["counts"]["heritage_assets"])
        self.assertEqual(1, corpus["descriptor"]["counts"]["risk_records"])
        self.assertEqual(0, corpus["descriptor"]["counts"]["synthetic_records"])
        self.assertEqual(
            corpus["descriptor"]["snapshot"], corpus["search"]["manifest"]["snapshot"]
        )
        self.assertEqual(
            corpus["descriptor"]["snapshot"], corpus["search"]["shard_metadata"]["snapshot"]
        )
        self.assertTrue(
            all(
                row["snapshot"] == corpus["descriptor"]["snapshot"]
                for rows in corpus["search"]["shard_metadata"]["shards"].values()
                for row in rows
            )
        )
        self.assertFalse(corpus["descriptor"]["default_loaded"])
        self.assertTrue(corpus["descriptor"]["include_in_counts"])
        self.assertEqual(
            {"assesses", "located in"},
            {relationship["kind"] for relationship in corpus["relationships"]},
        )
        risk_location = next(
            relationship
            for relationship in corpus["relationships"]
            if relationship["source"].startswith("risk/")
            and relationship["kind"] == "located in"
        )
        self.assertIn("no spatial intersection claimed", risk_location["derivation"])
        self.assertEqual(
            "Local Planning Authority",
            risk_location["evidence"][0]["source_field"],
        )
        self.assertEqual("Coventry", risk_location["evidence"][0]["source_value"])
        asset = next(record for record in corpus["records"] if record["route"].startswith("asset/"))
        self.assertEqual("EPSG:4326", asset["spatial"]["crs"])
        self.assertEqual("EPSG:4326", asset["spatial"]["source_crs"])
        self.assertIn("not transformed", asset["spatial"]["geometry_derivation"])
        self.assertIn("Coventry Cathedral", asset["search_aliases"])
        self.assertIn("Grade One", asset["search_aliases"])
        self.assertIn("containedInPlace", asset["search_aliases"])
        self.assertIn("source-backed relationship", asset["search_aliases"])
        self.assertIn("Open Government Licence", asset["search_aliases"])
        self.assertIn("YAML-LD @id", asset["search_aliases"])
        self.assertIn("Modern Coventry Cathedral", asset["search_aliases"])
        self.assertIn("Basil Spence Cathedral", asset["search_aliases"])
        risk = next(record for record in corpus["records"] if record["route"].startswith("risk/"))
        self.assertEqual(
            "https://historicengland.org.uk/listing/heritage-at-risk/search-register/results?q=1342941",
            risk["url"],
        )
        self.assertEqual("", risk["timestamp"])
        self.assertEqual("", risk["metadata_created"])
        self.assertEqual("2025", risk["year"])
        self.assertEqual("2025", risk["temporal_coverage"])
        self.assertEqual("year", risk["date_precision"])
        self.assertEqual(
            heritage.explorer_record_iri(
                snapshot_public_base := tiny_snapshot()["publication"]["public_base"],
                risk["route"],
            ),
            risk["@id"],
        )
        self.assertTrue(risk["@id"].startswith(f"{heritage.EXPLORER_BASE}?bundle="))
        self.assertNotIn("/index.html?", risk["@id"])
        self.assertIn("Microsoft Excel Open XML Spreadsheet", risk["formats"])
        self.assertIn("risk register 2025", risk["search_aliases"])
        self.assertIn("risk observation assesses NHLE", risk["search_aliases"])
        self.assertIn("annual register provenance", risk["search_aliases"])
        self.assertEqual(["Coventry", "England"], risk["area_served"])
        resource = next(
            row for row in corpus["resources"] if row["route"].endswith("/spreadsheet")
        )
        self.assertEqual("XLSX", resource["source_format"])
        register_search = next(
            row
            for row in corpus["resources"]
            if row["resource_type"] == "official-register-search"
        )
        self.assertEqual("Official Heritage at Risk register search", register_search["name"])
        self.assertTrue(register_search["route"].endswith("/register-search"))
        self.assertEqual(risk["url"], register_search["url"])
        self.assertNotIn("rich-page", register_search["route"])
        self.assertEqual(
            "https://historicengland.org.uk/listing/the-list/list-entry/1342941",
            asset["url"],
        )
        resource_routes = {row["route"] for row in corpus["resources"]}
        self.assertTrue(
            all(
                route in resource_routes
                for record in corpus["records"]
                for route in record["resource_ids"]
            )
        )

    def test_reviewed_familiar_name_keeps_official_title_and_adds_evidence_resource(self) -> None:
        snapshot = tiny_snapshot()
        feature = snapshot["nhle"]["layers"][0]["features"][0]
        feature["attributes"].update(
            {
                "ListEntry": "1116402",
                "Name": "ST MARY'S HALL",
                "hyperlink": "https://historicengland.org.uk/listing/the-list/list-entry/1116402",
            }
        )
        snapshot["har"]["annual"][0]["rows"][0].update(
            {
                "List Entry": "1116402",
                "URL": "https://historicengland.org.uk/listing/heritage-at-risk/search-register/list-entry/1116402",
            }
        )

        corpus = heritage.build_corpus(snapshot, GENERATED_AT)
        asset = next(record for record in corpus["records"] if record["route"] == "asset/1116402")
        self.assertEqual("ST MARY'S HALL", asset["title"])
        self.assertIn("St Mary's Guildhall", asset["search_aliases"])
        self.assertEqual(
            "familiar-name",
            asset["extras"]["reviewed_search_name_relationship"],
        )
        evidence = next(
            resource
            for resource in corpus["resources"]
            if resource["route"] == "resource/1116402/reviewed-name-evidence"
        )
        self.assertEqual("official-search-name-evidence", evidence["resource_type"])
        self.assertIn(evidence["route"], asset["resource_ids"])

    def test_missing_advertised_resource_fails_closed(self) -> None:
        corpus = heritage.build_corpus(tiny_snapshot(), GENERATED_AT)
        resources = corpus["resources"][:-1]
        with self.assertRaisesRegex(ValueError, "resource referential integrity failed"):
            heritage.validate_resource_references(corpus["records"], resources)

    def test_semantic_layer_reconciles_direct_and_reified_relationships(self) -> None:
        corpus = heritage.build_corpus(tiny_snapshot(), GENERATED_AT)
        semantic = corpus["semantic"]

        self.assertEqual([], okf_semantic.validate_semantic_assertions(semantic["document"]))
        self.assertEqual([], okf_semantic.validate_iri_route_registry(semantic["iri_registry"]))
        self.assertEqual([], okf_semantic.validate_predicate_registry(semantic["predicate_registry"]))
        self.assertEqual(
            [],
            okf_semantic.schema_errors(
                semantic["extension"], "semantic-model.schema.json"
            ),
        )
        self.assertEqual(
            len(corpus["relationships"]),
            semantic["validation_report"]["counts"]["assertions"],
        )

    def test_annual_continuity_never_links_same_year_event_sheets(self) -> None:
        snapshot = tiny_snapshot()
        current = snapshot["har"]["annual"][0]
        prior = copy.deepcopy(current)
        prior["year"] = 2024
        prior["source_url"] = "https://historicengland.org.uk/content/docs/har/har-2024-entries-additions-removals/"
        prior["rows"][0]["record_id"] = "tiny-har-2024-entry"
        addition = copy.deepcopy(current)
        addition["event_type"] = "addition"
        addition["rows"][0]["record_id"] = "tiny-har-2025-addition"
        addition["rows"][0]["event_type"] = "addition"
        snapshot["har"]["annual"] = [prior, current, addition]

        corpus = heritage.build_corpus(snapshot, GENERATED_AT)
        records_by_route = {record["route"]: record for record in corpus["records"]}
        continuity = [
            row
            for row in corpus["relationships"]
            if row["predicate"] == "https://www.w3.org/ns/prov#wasRevisionOf"
        ]

        self.assertEqual(1, len(continuity))
        for row in continuity:
            self.assertGreater(
                records_by_route[row["source"]]["register_year"],
                records_by_route[row["target"]]["register_year"],
            )

    def test_synthetic_fixture_is_separate_default_off_and_excluded(self) -> None:
        snapshot = json.loads(
            (
                ROOT
                / "evaluation-foundry"
                / "fixtures"
                / "heritage-warwickshire"
                / "synthetic"
                / "source-snapshot.json"
            ).read_text(encoding="utf-8")
        )
        corpus = heritage.build_corpus(snapshot, GENERATED_AT)
        descriptor = corpus["descriptor"]

        self.assertEqual("synthetic-fixture", descriptor["assertion_scope"])
        self.assertFalse(descriptor["default_loaded"])
        self.assertFalse(descriptor["include_in_counts"])
        self.assertFalse(descriptor["include_in_search"])
        self.assertEqual(3, descriptor["counts"]["synthetic_records"])
        self.assertTrue(
            all(record["assertion_scope"] == "synthetic-fixture" for record in corpus["records"])
        )
        self.assertTrue(
            all(relationship["authority"]["class"] == "synthetic" for relationship in corpus["relationships"])
        )
        self.assertEqual(
            [{"value": "CC0-1.0", "count": 3}], corpus["facets"]["license"]
        )
        self.assertEqual(0, corpus["graph"]["node_counts"]["risk_record"])
        self.assertEqual(3, corpus["graph"]["node_counts"]["synthetic_record"])
        files = heritage.output_files(corpus, snapshot)
        self.assertNotIn(Path("evaluation-profile.yaml"), files)
        self.assertNotIn(Path("journeys.json"), files)

    def test_faithful_publication_copies_an_executable_journey_closure(self) -> None:
        snapshot = tiny_snapshot()
        snapshot["publication"]["role"] = "faithful"
        files = heritage.output_files(
            heritage.build_corpus(copy.deepcopy(snapshot), GENERATED_AT), snapshot
        )

        for source, target in (
            (heritage.JOURNEYS_PATH, Path("journeys.json")),
            (heritage.QUESTIONS_PATH, Path("questions.json")),
            (
                heritage.PROTECTED_SOURCE_RECEIPT_PATH,
                Path("evidence/protected-source-link-receipt.json"),
            ),
        ):
            with self.subTest(target=target):
                self.assertEqual(source.read_text(encoding="utf-8"), files[target])

        receipt = json.loads(files[Path("evidence/protected-source-link-receipt.json")])
        self.assertEqual("okf-genuine-browser-link-receipt.v1", receipt["schema"])

    def test_fixed_timestamp_build_is_byte_deterministic(self) -> None:
        snapshot = tiny_snapshot()
        first = heritage.output_files(
            heritage.build_corpus(copy.deepcopy(snapshot), GENERATED_AT), snapshot
        )
        second_snapshot = copy.deepcopy(snapshot)
        second = heritage.output_files(
            heritage.build_corpus(second_snapshot, GENERATED_AT), second_snapshot
        )
        self.assertEqual(first, second)
        self.assertIn(Path("assurance/plane-roots.json"), first)
        first_tree = heritage.output_tree_receipt(first)
        second_tree = heritage.output_tree_receipt(second)
        self.assertEqual(first_tree, second_tree)
        self.assertEqual(
            heritage.OUTPUT_TREE_ALGORITHM,
            first_tree["algorithm"],
        )
        self.assertEqual(len(first), first_tree["files"])

        changed = dict(first)
        changed[Path("index.md")] = f"{changed[Path('index.md')]}changed\n"
        self.assertNotEqual(
            first_tree["tree_sha256"],
            heritage.output_tree_receipt(changed)["tree_sha256"],
        )

    def test_generated_markdown_uses_valid_quoted_yaml_ld_keywords(self) -> None:
        snapshot = tiny_snapshot()
        files = heritage.output_files(
            heritage.build_corpus(copy.deepcopy(snapshot), GENERATED_AT), snapshot
        )
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            for relative in (Path("index.md"), Path("methodology.md")):
                target = root / relative
                target.write_text(str(files[relative]), encoding="utf-8")
                parsed = okf_semantic.parse_markdown(target)
                self.assertIn("@context", parsed.metadata)
                self.assertTrue(parsed.metadata["@id"].startswith("https://"))

    def test_nhle_identifier_binding_fails_closed(self) -> None:
        snapshot = tiny_snapshot()
        corpus = heritage.build_corpus(snapshot, GENERATED_AT)
        asset = next(record for record in corpus["records"] if record["route"].startswith("asset/"))
        asset["url"] = "https://historicengland.org.uk/listing/the-list/list-entry/9999999"
        with self.assertRaisesRegex(ValueError, "does not bind its List entry"):
            heritage.link_validation(corpus["records"], corpus["resources"], snapshot)

    def test_har_deprecated_entry_route_normalizes_to_live_register_search(self) -> None:
        deprecated = (
            "https://www.historicengland.org.uk/listing/heritage-at-risk/"
            "search-register/list-entry/1342941/"
        )

        self.assertEqual(
            "https://historicengland.org.uk/listing/heritage-at-risk/search-register/results?q=1342941",
            heritage.har_register_search_url("1342941", deprecated),
        )

    def test_har_register_search_normalization_requires_exact_identifier_binding(self) -> None:
        canonical = (
            "https://historicengland.org.uk/listing/heritage-at-risk/"
            "search-register/results?q=1342941"
        )
        self.assertEqual(canonical, heritage.har_register_search_url("1342941", canonical))
        self.assertTrue(heritage.exact_har_register_search_binding(canonical, "1342941"))

        malformed = [
            canonical.replace("q=1342941", "q=9999999"),
            f"{canonical}&page=1",
            f"{canonical}&q=1342941",
            canonical.replace("results?q=", "result?q="),
            canonical.replace("results?q=1342941", "list-entry/9999999"),
            f"{canonical}#record",
        ]
        for candidate in malformed:
            with self.subTest(candidate=candidate):
                with self.assertRaisesRegex(ValueError, "exact q parameter"):
                    heritage.har_register_search_url("1342941", candidate)
                self.assertFalse(
                    heritage.exact_har_register_search_binding(candidate, "1342941")
                )

    def test_link_validation_rejects_tampered_har_q_bindings(self) -> None:
        snapshot = tiny_snapshot()
        corpus = heritage.build_corpus(snapshot, GENERATED_AT)

        tampered_records = copy.deepcopy(corpus["records"])
        risk = next(
            record for record in tampered_records if record["route"].startswith("risk/")
        )
        risk["url"] = risk["url"].replace("q=1342941", "q=9999999")
        with self.assertRaisesRegex(ValueError, "register search does not bind exact q=1342941"):
            heritage.link_validation(tampered_records, corpus["resources"], snapshot)

        tampered_resources = copy.deepcopy(corpus["resources"])
        search = next(
            resource
            for resource in tampered_resources
            if resource["resource_type"] == "official-register-search"
        )
        search["url"] = f"{search['url']}&page=1"
        with self.assertRaisesRegex(ValueError, "register search does not bind exact q=1342941"):
            heritage.link_validation(corpus["records"], tampered_resources, snapshot)

    def test_url_policy_rejects_credentials_and_non_http_schemes(self) -> None:
        self.assertEqual("", heritage.safe_http_url("javascript:alert(1)"))
        self.assertEqual("", heritage.safe_http_url("https://user:secret@example.test/data"))
        self.assertEqual(
            "https://example.test/data",
            heritage.safe_http_url("https://example.test/data"),
        )

    def test_source_geometry_crs_is_declared_and_must_match_feature_metadata(self) -> None:
        missing = tiny_snapshot()
        missing.pop("geometry_delivery")
        with self.assertRaisesRegex(ValueError, "declare geometry_delivery"):
            heritage.build_corpus(missing, GENERATED_AT)

        mismatched = tiny_snapshot()
        feature = mismatched["nhle"]["layers"][0]["features"][0]
        feature["spatialReference"] = {"wkid": 27700}
        with self.assertRaisesRegex(ValueError, "conflicts with geometry_delivery"):
            heritage.build_corpus(mismatched, GENERATED_AT)

    def test_official_url_policies_reject_lookalike_origins(self) -> None:
        bad_annual = tiny_snapshot()
        bad_annual["har"]["annual"][0]["source_url"] = (
            "https://evil.example/content/docs/har/har-2025-entries-additions-removals/"
        )
        with self.assertRaisesRegex(ValueError, "sanctioned Historic England"):
            heritage.build_corpus(bad_annual, GENERATED_AT)

        bad_search = tiny_snapshot()
        bad_search["har"]["annual"][0]["rows"][0]["URL"] = (
            "https://historicengland.org.uk.evil.example/listing/heritage-at-risk/"
            "search-register/results?q=1342941"
        )
        with self.assertRaisesRegex(ValueError, "not sanctioned Historic England HTTPS"):
            heritage.build_corpus(bad_search, GENERATED_AT)

        credentialed = tiny_snapshot()
        credentialed["har"]["annual"][0]["rows"][0]["URL"] = (
            "https://attacker:secret@historicengland.org.uk/listing/heritage-at-risk/"
            "search-register/results?q=1342941"
        )
        with self.assertRaisesRegex(ValueError, "not sanctioned Historic England HTTPS"):
            heritage.build_corpus(credentialed, GENERATED_AT)

    def test_nhle_rich_page_requires_the_exact_path_without_query_or_fragment(self) -> None:
        invalid_urls = [
            "https://historicengland.org.uk/other/list-entry/1342941",
            "https://historicengland.org.uk/listing/the-list/list-entry/1342941?view=full",
            "https://historicengland.org.uk/listing/the-list/list-entry/1342941#details",
            "https://historicengland.org.uk/listing/the-list/list-entry/1342941/extra",
        ]
        for invalid_url in invalid_urls:
            with self.subTest(url=invalid_url):
                snapshot = tiny_snapshot()
                snapshot["nhle"]["layers"][0]["features"][0]["attributes"][
                    "hyperlink"
                ] = invalid_url
                with self.assertRaisesRegex(ValueError, "identifier-bound Historic England page"):
                    heritage.build_corpus(snapshot, GENERATED_AT)

        canonical = heritage.list_entry_url(
            "1342941",
            "https://www.historicengland.org.uk/listing/the-list/list-entry/1342941",
        )
        self.assertEqual(
            "https://historicengland.org.uk/listing/the-list/list-entry/1342941",
            canonical,
        )

    def test_link_receipt_rechecks_origins_and_relationship_panel_links(self) -> None:
        snapshot = tiny_snapshot()
        corpus = heritage.build_corpus(snapshot, GENERATED_AT)
        receipt = heritage.link_validation(
            corpus["records"], corpus["resources"], snapshot, corpus["relationships"]
        )
        self.assertGreater(receipt["counts"]["relationship_ui_links"], 0)
        self.assertEqual(4, receipt["counts"]["identifier_bound_rich_links"])

        tampered = copy.deepcopy(corpus["resources"])
        official = next(
            row
            for row in tampered
            if row["resource_type"] == "official-register-search"
        )
        official["url"] = (
            "https://evil.example/listing/heritage-at-risk/search-register/"
            "results?q=1342941"
        )
        with self.assertRaisesRegex(ValueError, "origin allowlist"):
            heritage.link_validation(
                corpus["records"], tampered, snapshot, corpus["relationships"]
            )

    def test_source_provenance_labels_and_reconciles_har_prefilter_rows(self) -> None:
        snapshot = tiny_snapshot()
        snapshot["sources"] = [
            {
                "id": "har-test",
                "semantic_sheets": [
                    {"semantic_role": "entries", "scope_rows": 2},
                    {"semantic_role": "additions", "scope_rows": 1},
                ],
            }
        ]
        snapshot["denominators"] = [
            {"id": "har-2025-entries-scope-rows", "count": 1},
            {"id": "har-2025-additions-scope-rows", "count": 1},
        ]

        receipt = heritage.source_provenance(snapshot)

        reconciliation = receipt["scope_reconciliation"]
        self.assertEqual(3, reconciliation["acquisition_prefilter"]["rows"])
        self.assertEqual(2, reconciliation["authoritative_emitted"]["rows"])
        self.assertEqual(
            1,
            reconciliation[
                "excluded_after_authoritative_geography_reconciliation"
            ]["rows"],
        )
        self.assertTrue(
            all(
                sheet["scope_rows_stage"].startswith("acquisition-prefilter")
                for sheet in receipt["sources"][0]["semantic_sheets"]
            )
        )

    def test_family_build_preserves_nested_fixture_outputs(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir)
            nested = output / "tiny" / "keep.json"
            nested.parent.mkdir(parents=True)
            nested.write_text("fixture\n", encoding="utf-8")
            (output / "obsolete.json").write_text("old\n", encoding="utf-8")

            files = {Path("okf-explorer.json"): "faithful\n"}
            heritage.large_corpus.write_files(
                output, files, preserve_prefixes=(Path("tiny"), Path("synthetic"))
            )

            self.assertEqual("fixture\n", nested.read_text(encoding="utf-8"))
            self.assertFalse((output / "obsolete.json").exists())
            self.assertEqual(
                [],
                heritage.large_corpus.check_files(
                    output,
                    files,
                    preserve_prefixes=(Path("tiny"), Path("synthetic")),
                ),
            )


if __name__ == "__main__":
    unittest.main()
