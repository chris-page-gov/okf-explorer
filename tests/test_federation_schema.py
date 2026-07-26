from __future__ import annotations

import json
import unittest
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource

ROOT = Path(__file__).resolve().parents[1]
PROFILE = ROOT / "profiles" / "federation" / "v1"


def fixture() -> dict:
    discovery = {
        "repository": "https://github.com/example/whole-law",
        "documentation": "https://example.test/whole-law/docs/",
        "raw_subpath": "bundle/whole-law",
        "release_archive": "https://github.com/example/whole-law/releases",
        "routes": [
            {
                "kind": "published",
                "purpose": "descriptor",
                "priority": 10,
                "url": "https://example.test/whole-law/okf-explorer.json",
            }
        ],
    }
    return {
        "schema": "okf-explorer-federation.v1",
        "kind": "okf-federation",
        "okf_version": "0.2",
        "title": "Whole-Law",
        "version": "0.3.0",
        "status": "candidate",
        "generated_at": "2026-07-25T12:00:00Z",
        "snapshot": "whole-law-2026-07-25",
        "profile": "https://example.test/profile/federation/v1/",
        "publisher": "https://example.test/publisher",
        "license": "https://example.test/licence",
        "discovery": discovery,
        "counts": {"children": 1, "available": 1},
        "children": [
            {
                "id": "legislation",
                "title": "Legislation",
                "role": "legislation",
                "status": "available",
                "descriptor": "https://example.test/legislation/okf-explorer.json",
                "authority": {
                    "class": "official",
                    "source": "https://www.legislation.gov.uk/",
                },
                "coverage": {
                    "status": "available",
                    "applicable": 1,
                    "represented": 1,
                    "percent": 100,
                },
                "freshness": {
                    "state": "current",
                    "observed_at": "2026-07-25T11:00:00Z",
                },
                "discovery": discovery,
            }
        ],
        "relationships": [
            {
                "schema": "okf-relationship-assertion.v2",
                "source": "legislation",
                "target": "legislation",
                "predicate": "derivedFrom",
                "authority": {
                    "class": "official",
                    "source": "https://www.legislation.gov.uk/",
                },
                "derivation": "source-native",
                "freshness": "current",
                "evidence": ["https://www.legislation.gov.uk/"],
            }
        ],
        "relationship_summary": {
            "scope": "federated-data-plane",
            "total": 1,
            "by_predicate": {"derivedFrom": 1},
            "by_authority": {
                "official": 1,
                "derived": 0,
                "model-assisted": 0,
            },
            "by_freshness": {"current": 1, "stale": 0, "unknown": 0},
        },
    }


class FederationSchemaTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.schema = json.loads((PROFILE / "descriptor.schema.json").read_text())
        relationship_schema = json.loads(
            (PROFILE / "relationship-assertion.schema.json").read_text()
        )
        registry = Registry().with_resource(
            relationship_schema["$id"], Resource.from_contents(relationship_schema)
        )
        cls.validator = Draft202012Validator(
            cls.schema,
            registry=registry,
            format_checker=FormatChecker(),
        )

    def test_schema_is_valid_and_accepts_the_versioned_contract(self) -> None:
        Draft202012Validator.check_schema(self.schema)
        self.assertEqual([], list(self.validator.iter_errors(fixture())))

    def test_schema_rejects_implicit_child_loading_and_unclassified_model_output(self) -> None:
        document = fixture()
        document["children"][0].pop("descriptor")
        document["children"][0]["discovery"]["routes"] = [
            {
                "kind": "documentation",
                "purpose": "documentation",
                "url": "https://example.test/docs/",
            }
        ]
        errors = list(self.validator.iter_errors(document))
        self.assertTrue(errors)

        document = fixture()
        document["relationships"][0]["authority"]["class"] = "AI"
        errors = list(self.validator.iter_errors(document))
        self.assertTrue(errors)


if __name__ == "__main__":
    unittest.main()
