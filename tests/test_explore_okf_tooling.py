from __future__ import annotations

import copy
import sys
import unittest
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import okf_explore  # noqa: E402


SNAPSHOT = "coventry-moving-home-2026-08-12-01"
GENERATED_AT = "2026-08-12T12:00:00Z"
PLANE_ROOT = "a" * 64


class ExploreOkfToolingTests(unittest.TestCase):
    def test_route_encoding_matches_the_explorer_contract(self) -> None:
        vectors = {
            "ArcGIS REST": "ArcGIS%20REST",
            "Business & economy": "Business%20%26%20economy",
            "100%": "100%25",
            "Caf\u00e9": "Caf%C3%A9",
            "parent/child": "parent%2Fchild",
        }
        for raw, encoded in vectors.items():
            with self.subTest(raw=raw):
                self.assertEqual(
                    encoded,
                    okf_explore.encode_endpoint_route_segment(raw),
                )
        self.assertEqual(
            "topic/Business%20%26%20economy",
            okf_explore.metadata_endpoint_route("topic", "Business & economy"),
        )
        with self.assertRaisesRegex(okf_explore.SemanticError, "kind is malformed"):
            okf_explore.metadata_endpoint_route("Topic Name", "value")

    def label_entries(self) -> list[dict[str, object]]:
        return [
            {
                "route": "organisation/coventry-city-council",
                "iri": "https://example.org/organisations/coventry-city-council",
                "label": "Coventry City Council",
                "language": "en-GB",
                "type": "Public organisation",
                "label_authority": {
                    "class": "source-native",
                    "source": "https://www.coventry.gov.uk/",
                },
            },
            {
                "route": "service/household-waste-collection",
                "iri": "https://example.org/services/household-waste-collection",
                "label": "Household waste collection",
                "language": "en-GB",
                "type": "Public service",
                "label_authority": {
                    "class": "domain-profile",
                    "source": "https://example.org/profiles/coventry/v1/",
                },
            },
        ]

    def relationships(self) -> list[dict[str, str]]:
        return [
            {
                "source": "service/household-waste-collection",
                "target": "organisation/coventry-city-council",
                "predicate": "https://semiceu.github.io/CPSV-AP/releases/3.2.0/#hasCompetentAuthority",
            }
        ]

    def graph_routes(self) -> set[str]:
        return {
            "organisation/coventry-city-council",
            "service/household-waste-collection",
        }

    def test_builder_creates_a_deterministic_complete_endpoint_index(self) -> None:
        first = okf_explore.build_endpoint_label_index(
            list(reversed(self.label_entries())),
            self.relationships(),
            graph_reachable_routes=self.graph_routes(),
            snapshot=SNAPSHOT,
            generated_at_value=GENERATED_AT,
        )
        second = okf_explore.build_endpoint_label_index(
            self.label_entries(),
            self.relationships(),
            graph_reachable_routes=self.graph_routes(),
            snapshot=SNAPSHOT,
            generated_at_value=GENERATED_AT,
        )
        self.assertEqual(first, second)
        self.assertEqual(
            [
                "organisation/coventry-city-council",
                "service/household-waste-collection",
            ],
            [entry["route"] for entry in first["entries"]],
        )
        self.assertEqual(
            [],
            okf_explore.validate_endpoint_label_index(
                first,
                expected_snapshot=SNAPSHOT,
                graph_reachable_routes={
                    "organisation/coventry-city-council",
                    "service/household-waste-collection",
                },
            ),
        )

    def test_endpoint_builder_rejects_missing_and_opaque_labels(self) -> None:
        with self.assertRaisesRegex(
            okf_explore.SemanticError,
            "graph-reachable route has no endpoint label",
        ):
            okf_explore.build_endpoint_label_index(
                self.label_entries()[:1],
                self.relationships(),
                graph_reachable_routes=self.graph_routes(),
                snapshot=SNAPSHOT,
                generated_at_value=GENERATED_AT,
            )

        for field, value in (
            ("label", "Missing label"),
            ("type", "Missing label"),
            ("type", "publisher-0123456789abcdef"),
        ):
            with self.subTest(field=field, value=value):
                unreadable = self.label_entries()
                unreadable[0][field] = value
                with self.assertRaisesRegex(
                    okf_explore.SemanticError,
                    "reserved missing-label|opaque identifier",
                ):
                    okf_explore.build_endpoint_label_index(
                        unreadable,
                        self.relationships(),
                        graph_reachable_routes=self.graph_routes(),
                        snapshot=SNAPSHOT,
                        generated_at_value=GENERATED_AT,
                    )

        missing_iri = self.label_entries()
        del missing_iri[0]["iri"]
        with self.assertRaisesRegex(okf_explore.SemanticError, "invalid endpoint label index"):
            okf_explore.build_endpoint_label_index(
                missing_iri,
                self.relationships(),
                graph_reachable_routes=self.graph_routes(),
                snapshot=SNAPSHOT,
                generated_at_value=GENERATED_AT,
            )

        opaque = self.label_entries()
        opaque[0]["label"] = "publisher-0123456789abcdef"
        with self.assertRaisesRegex(
            okf_explore.SemanticError,
            "opaque identifier pattern",
        ):
            okf_explore.build_endpoint_label_index(
                opaque,
                self.relationships(),
                graph_reachable_routes=self.graph_routes(),
                snapshot=SNAPSHOT,
                generated_at_value=GENERATED_AT,
            )

    def test_endpoint_builder_requires_the_complete_explicit_graph_denominator(self) -> None:
        with self.assertRaisesRegex(
            okf_explore.SemanticError,
            "absent from graph_reachable_routes",
        ):
            okf_explore.build_endpoint_label_index(
                self.label_entries(),
                self.relationships(),
                graph_reachable_routes={"service/household-waste-collection"},
                snapshot=SNAPSHOT,
                generated_at_value=GENERATED_AT,
            )

    def test_intrinsic_hash_identifier_is_rejected_with_custom_patterns(self) -> None:
        opaque = self.label_entries()
        opaque[0]["label"] = "publisher-0123456789abcdef"
        with self.assertRaisesRegex(
            okf_explore.SemanticError,
            "opaque identifier pattern",
        ):
            okf_explore.build_endpoint_label_index(
                opaque,
                self.relationships(),
                graph_reachable_routes=self.graph_routes(),
                snapshot=SNAPSHOT,
                generated_at_value=GENERATED_AT,
                opaque_identifier_patterns=["internal-*"],
            )

    def exploratory_publication(self) -> dict[str, object]:
        return okf_explore.build_exploratory_publication(
            snapshot=SNAPSHOT,
            generated_at_value=GENERATED_AT,
            applicable_plane_roots={"data_plane_manifest": PLANE_ROOT},
            publisher_name="Independent OKF research",
            publisher_url="https://github.com/chris-page-gov/okf-uk-living",
            publisher_authority_status="independent-research",
            feedback_url="https://github.com/chris-page-gov/okf-uk-living/issues/new",
            limitations=["Source coverage remains subject to review."],
            permitted_claims=["The snapshot is available for research."],
            prohibited_claims=["Do not claim release approval."],
            promotion_rule="Owner review creates a fresh candidate.",
        )

    def test_builder_creates_a_descriptor_bound_exploratory_contract(self) -> None:
        publication = self.exploratory_publication()
        self.assertEqual(
            [],
            okf_explore.validate_exploratory_publication(
                publication,
                descriptor_snapshot=SNAPSHOT,
                descriptor_generated_at=GENERATED_AT,
                data_plane_manifest_root_sha256=PLANE_ROOT,
            ),
        )
        self.assertEqual("noindex", publication["indexing_policy"])
        self.assertEqual(
            okf_explore.EXPLORATORY_BANNER_MESSAGE,
            publication["banner"]["message"],
        )

    def test_exploratory_validation_rejects_snapshot_root_and_message_drift(self) -> None:
        publication = copy.deepcopy(self.exploratory_publication())
        publication["snapshot_id"] = "different"
        publication["applicable_plane_roots"]["data_plane_manifest"] = "b" * 64
        publication["banner"]["message"] = "Research preview"
        messages = okf_explore.validate_exploratory_publication(
            publication,
            descriptor_snapshot=SNAPSHOT,
            descriptor_generated_at=GENERATED_AT,
            data_plane_manifest_root_sha256=PLANE_ROOT,
        )
        self.assertTrue(any("snapshot_id differs" in message for message in messages))
        self.assertTrue(any("plane root differs" in message for message in messages))
        self.assertTrue(any("banner.message differs" in message for message in messages))

    def test_validation_rejects_credential_bearing_contract_urls(self) -> None:
        entries = self.label_entries()
        entries[0]["label_authority"]["source"] = "https://user:secret@example.org/review"
        index = {
            "schema": okf_explore.ENDPOINT_LABEL_INDEX_SCHEMA,
            "snapshot": SNAPSHOT,
            "generated_at": GENERATED_AT,
            "default_language": "en-GB",
            "opaque_identifier_patterns": [],
            "entries": entries,
            "counts": {"entries": len(entries)},
        }
        self.assertTrue(
            any(
                "credential-free" in message
                for message in okf_explore.validate_endpoint_label_index(index)
            )
        )

        publication = self.exploratory_publication()
        publication["publisher"]["url"] = "https://user:secret@example.org/research"
        publication["banner"]["feedback_url"] = "https://user:secret@example.org/issues"
        messages = okf_explore.validate_exploratory_publication(
            publication,
            descriptor_snapshot=SNAPSHOT,
            descriptor_generated_at=GENERATED_AT,
            data_plane_manifest_root_sha256=PLANE_ROOT,
        )
        self.assertEqual(2, sum("credential-free" in message for message in messages))

    def test_validation_rejects_urls_the_browser_cannot_parse_safely(self) -> None:
        unsafe_urls = (
            "https://example.org:99999/evidence",
            "https://example.org:0/evidence",
            "https://example.org/bare%value",
            "https://example.org/<unsafe>",
            "https://user:secret@example.org/evidence",
        )
        for unsafe_url in unsafe_urls:
            with self.subTest(url=unsafe_url):
                entries = self.label_entries()
                entries[0]["label_authority"]["source"] = unsafe_url
                index = {
                    "schema": okf_explore.ENDPOINT_LABEL_INDEX_SCHEMA,
                    "snapshot": SNAPSHOT,
                    "generated_at": GENERATED_AT,
                    "default_language": "en-GB",
                    "opaque_identifier_patterns": [],
                    "entries": entries,
                    "counts": {"entries": len(entries)},
                }
                self.assertTrue(
                    any(
                        "credential-free" in message
                        for message in okf_explore.validate_endpoint_label_index(index)
                    )
                )

    def test_validation_enforces_consumer_text_and_json_byte_ceilings(self) -> None:
        entries = self.label_entries()
        index = {
            "schema": okf_explore.ENDPOINT_LABEL_INDEX_SCHEMA,
            "snapshot": SNAPSHOT,
            "generated_at": GENERATED_AT,
            "default_language": "en-GB",
            "opaque_identifier_patterns": [],
            "entries": entries,
            "counts": {"entries": len(entries)},
        }
        retained_units = okf_explore._endpoint_label_retained_text_units(index)
        json_bytes = okf_explore.endpoint_label_index_json_bytes(index)
        with mock.patch.object(
            okf_explore, "MAX_ENDPOINT_LABEL_TEXT_UNITS", retained_units
        ), mock.patch.object(
            okf_explore, "MAX_ENDPOINT_LABEL_JSON_BYTES", json_bytes
        ):
            self.assertEqual([], okf_explore.validate_endpoint_label_index(index))
        with mock.patch.object(
            okf_explore, "MAX_ENDPOINT_LABEL_TEXT_UNITS", retained_units - 1
        ):
            self.assertTrue(
                any(
                    "retained-text ceiling" in message
                    for message in okf_explore.validate_endpoint_label_index(index)
                )
            )
        with mock.patch.object(
            okf_explore, "MAX_ENDPOINT_LABEL_JSON_BYTES", json_bytes - 1
        ):
            self.assertTrue(
                any(
                    "JSON byte ceiling" in message
                    for message in okf_explore.validate_endpoint_label_index(index)
                )
            )

    def test_semantic_validators_report_malformed_nested_values_without_crashing(self) -> None:
        index = {
            "schema": okf_explore.ENDPOINT_LABEL_INDEX_SCHEMA,
            "snapshot": SNAPSHOT,
            "default_language": "en-GB",
            "opaque_identifier_patterns": [],
            "entries": [],
            "counts": [],
        }
        messages = okf_explore.validate_endpoint_label_index(index)
        self.assertTrue(any("counts.entries" in message for message in messages))

        publication = self.exploratory_publication()
        publication["banner"] = []
        messages = okf_explore.validate_exploratory_publication(
            publication,
            descriptor_snapshot=SNAPSHOT,
            descriptor_generated_at=GENERATED_AT,
            data_plane_manifest_root_sha256=PLANE_ROOT,
        )
        self.assertTrue(any("banner.message" in message for message in messages))


if __name__ == "__main__":
    unittest.main()
