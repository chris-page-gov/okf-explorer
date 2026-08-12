from __future__ import annotations

import json
import unittest
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker


ROOT = Path(__file__).resolve().parents[1]
PROFILE = ROOT / "profiles" / "explore-okf" / "v1"


class ExploreOkfProfileTests(unittest.TestCase):
    def load_json(self, path: Path) -> object:
        return json.loads(path.read_text(encoding="utf-8"))

    def validator(self, name: str) -> Draft202012Validator:
        schema = self.load_json(PROFILE / name)
        Draft202012Validator.check_schema(schema)
        return Draft202012Validator(schema, format_checker=FormatChecker())

    def errors(self, schema_name: str, value: object) -> list[str]:
        return [
            error.message
            for error in self.validator(schema_name).iter_errors(value)
        ]

    def test_endpoint_label_example_matches_the_published_schema(self) -> None:
        value = self.load_json(PROFILE / "examples" / "endpoint-label-index.json")
        self.assertEqual([], self.errors("endpoint-label-index.schema.json", value))
        self.assertEqual(value["counts"]["entries"], len(value["entries"]))

    def test_endpoint_labels_reject_unbounded_patterns_and_missing_authority(self) -> None:
        value = self.load_json(PROFILE / "examples" / "endpoint-label-index.json")
        value["opaque_identifier_patterns"] = ["publisher-*unsafe"]
        del value["entries"][0]["label_authority"]["source"]
        messages = self.errors("endpoint-label-index.schema.json", value)
        self.assertTrue(any("does not match" in message for message in messages))
        self.assertTrue(any("source" in message for message in messages))

    def test_endpoint_labels_require_iris_and_canonical_route_escapes(self) -> None:
        value = self.load_json(PROFILE / "examples" / "endpoint-label-index.json")
        del value["entries"][0]["iri"]
        self.assertTrue(
            any(
                "iri" in message
                for message in self.errors("endpoint-label-index.schema.json", value)
            )
        )

        for malformed in (
            "topic/bare%",
            "topic/lower%2fslash",
            "topic/not%ZZhex",
            "topic/raw space",
            "topic/%41",
            "topic/%7E",
        ):
            with self.subTest(route=malformed):
                candidate = self.load_json(
                    PROFILE / "examples" / "endpoint-label-index.json"
                )
                candidate["entries"][0]["route"] = malformed
                self.assertTrue(
                    self.errors("endpoint-label-index.schema.json", candidate)
                )

        for field in ("label", "type"):
            with self.subTest(field=field):
                candidate = self.load_json(
                    PROFILE / "examples" / "endpoint-label-index.json"
                )
                candidate["entries"][0][field] = "Missing label"
                self.assertTrue(
                    self.errors("endpoint-label-index.schema.json", candidate)
                )

    def test_exploratory_example_matches_the_published_schema(self) -> None:
        value = self.load_json(
            PROFILE / "examples" / "exploratory-publication.json"
        )
        self.assertEqual(
            [], self.errors("exploratory-publication.schema.json", value)
        )

    def test_exploratory_contract_rejects_release_claims_and_unsafe_feedback(self) -> None:
        value = self.load_json(
            PROFILE / "examples" / "exploratory-publication.json"
        )
        value["publication_state"] = "released"
        value["banner"]["feedback_url"] = "javascript:alert(1)"
        messages = self.errors("exploratory-publication.schema.json", value)
        self.assertTrue(any("exploratory" in message for message in messages))
        self.assertTrue(any("does not match" in message for message in messages))

    def test_exploratory_contract_requires_publisher_authority_status(self) -> None:
        value = self.load_json(
            PROFILE / "examples" / "exploratory-publication.json"
        )
        del value["publisher"]["authority_status"]
        self.assertTrue(
            any(
                "authority_status" in message
                for message in self.errors(
                    "exploratory-publication.schema.json", value
                )
            )
        )


if __name__ == "__main__":
    unittest.main()
