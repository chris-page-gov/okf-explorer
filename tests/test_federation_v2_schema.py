from __future__ import annotations

import copy
import hashlib
import importlib.util
import json
import unittest
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource

ROOT = Path(__file__).resolve().parents[1]
V1 = ROOT / "profiles" / "federation" / "v1"
V2 = ROOT / "profiles" / "federation" / "v2"
V1_DESCRIPTOR_SHA256 = "03edb4d2e0e1ad9252866bfadbcf00f2999b78abb44d1d52b9b33b18c6f1f3e0"
V1_RELATIONSHIP_SHA256 = "9fe3ff35034b28d9bf3291fc47c74fa4552a142941107d4c62d5da1b4cacabbe"


def legacy_fixture() -> dict:
    spec = importlib.util.spec_from_file_location(
        "federation_v1_test_fixture", ROOT / "tests" / "test_federation_schema.py"
    )
    if spec is None or spec.loader is None:
        raise RuntimeError("Could not load the frozen v1 contract fixture")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.fixture()


def validator(descriptor_path: Path, relationship_path: Path) -> Draft202012Validator:
    descriptor = json.loads(descriptor_path.read_text())
    relationship = json.loads(relationship_path.read_text())
    registry = Registry().with_resource(
        relationship["$id"], Resource.from_contents(relationship)
    )
    return Draft202012Validator(
        descriptor, registry=registry, format_checker=FormatChecker()
    )


class FederationV2SchemaTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.v1 = validator(
            V1 / "descriptor.schema.json", V1 / "relationship-assertion.schema.json"
        )
        cls.v2 = validator(
            V2 / "descriptor.schema.json", V2 / "relationship-assertion.schema.json"
        )

    def test_frozen_v1_schema_bytes_and_relationship_structure_are_preserved(self) -> None:
        descriptor_bytes = (V1 / "descriptor.schema.json").read_bytes()
        relationship_bytes = (V1 / "relationship-assertion.schema.json").read_bytes()
        self.assertEqual(V1_DESCRIPTOR_SHA256, hashlib.sha256(descriptor_bytes).hexdigest())
        self.assertEqual(V1_RELATIONSHIP_SHA256, hashlib.sha256(relationship_bytes).hexdigest())

        old = json.loads(relationship_bytes)
        new = json.loads((V2 / "relationship-assertion.schema.json").read_text())
        self.assertEqual(
            "https://chris-page-gov.github.io/okf-explorer/profile/federation/v2/relationship-assertion.schema.json",
            new.pop("$id"),
        )
        old.pop("$id")
        self.assertEqual(old, new)

        old_descriptor = json.loads(descriptor_bytes)
        new_descriptor = json.loads((V2 / "descriptor.schema.json").read_text())
        new_descriptor["$id"] = old_descriptor["$id"]
        new_descriptor["title"] = old_descriptor["title"]
        new_descriptor["properties"]["schema"] = old_descriptor["properties"]["schema"]
        new_descriptor["properties"]["okf_version"] = old_descriptor["properties"]["okf_version"]
        self.assertEqual(old_descriptor, new_descriptor)

    def test_v1_and_v2_descriptors_validate_only_against_their_own_version(self) -> None:
        Draft202012Validator.check_schema(self.v1.schema)
        Draft202012Validator.check_schema(self.v2.schema)
        document_v1 = legacy_fixture()
        self.assertEqual([], list(self.v1.iter_errors(document_v1)))
        self.assertTrue(list(self.v2.iter_errors(document_v1)))

        document_v2 = copy.deepcopy(document_v1)
        document_v2["schema"] = "okf-explorer-federation.v2"
        document_v2["okf_version"] = "0.3"
        document_v2["profile"] = "https://example.test/profile/federation/v2/"
        self.assertEqual([], list(self.v2.iter_errors(document_v2)))
        self.assertTrue(list(self.v1.iter_errors(document_v2)))

    def test_v2_rejects_core_version_and_malformed_relationship_authority(self) -> None:
        document = legacy_fixture()
        document.update(
            schema="okf-explorer-federation.v2",
            okf_version="0.3",
            profile="https://example.test/profile/federation/v2/",
        )
        wrong_core = copy.deepcopy(document)
        wrong_core["okf_version"] = "0.2"
        self.assertTrue(list(self.v2.iter_errors(wrong_core)))

        malformed_relationship = copy.deepcopy(document)
        malformed_relationship["relationships"][0]["authority"]["class"] = "AI"
        self.assertTrue(list(self.v2.iter_errors(malformed_relationship)))

    def test_v2_still_requires_explicit_child_loading_routes(self) -> None:
        document = legacy_fixture()
        document.update(
            schema="okf-explorer-federation.v2",
            okf_version="0.3",
            profile="https://example.test/profile/federation/v2/",
        )
        document["children"][0].pop("descriptor")
        document["children"][0]["discovery"]["routes"] = [
            {
                "kind": "documentation",
                "purpose": "documentation",
                "url": "https://example.test/docs/",
            }
        ]
        self.assertTrue(list(self.v2.iter_errors(document)))


if __name__ == "__main__":
    unittest.main()
