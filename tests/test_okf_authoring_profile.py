from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker
from ruamel.yaml import YAML


ROOT = Path(__file__).resolve().parents[1]
PROFILE = ROOT / "profiles" / "authoring" / "v1"
DOCS = ROOT / "docs"
sys.path.insert(0, str(ROOT / "scripts"))

import check_domain_profile  # noqa: E402


class OkfAuthoringProfileTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.schema = json.loads((PROFILE / "domain-profile.schema.json").read_text())
        cls.validator = Draft202012Validator(
            cls.schema,
            format_checker=FormatChecker(),
        )
        cls.template = YAML(typ="safe").load(
            (PROFILE / "domain-profile.template.yaml").read_text()
        )

    def errors(self, value: object) -> list[str]:
        return [
            error.message
            for error in sorted(
                self.validator.iter_errors(value),
                key=lambda item: list(item.absolute_path),
            )
        ]

    def test_schema_and_template_identify_the_versioned_public_contract(self) -> None:
        self.assertEqual("okf-domain-profile.v1", self.template["schema"])
        self.assertEqual(
            "https://chris-page-gov.github.io/okf-explorer/profile/authoring/v1/domain-profile.schema.json",
            self.schema["$id"],
        )
        self.assertEqual(self.schema["$id"], self.template["$schema"])
        self.assertEqual([], self.errors(self.template))
        self.assertEqual([], check_domain_profile.reference_errors(self.template))
        self.assertTrue(self.template["collection_profile"]["document_families"])
        self.assertEqual("hypothesis", self.template["claims"][0]["claim_status"])
        self.assertIn("identifier_model", self.template["sources"][0])
        self.assertIn("semantic_conflicts", self.template["standards"][0])

    def test_profile_rejects_an_unreviewed_applicability_vocabulary(self) -> None:
        invalid = json.loads(json.dumps(self.template))
        invalid["standards"][0]["applicability"] = "nice-to-have"
        self.assertTrue(
            any("not one of" in message for message in self.errors(invalid))
        )

    def test_profile_requires_separate_evidence_for_sources_and_standards(self) -> None:
        invalid = json.loads(json.dumps(self.template))
        del invalid["sources"][0]["evidence_refs"]
        del invalid["standards"][0]["evidence_refs"]
        errors = self.errors(invalid)
        self.assertEqual(2, sum("'evidence_refs' is a required property" in item for item in errors))

    def test_semantic_validation_rejects_broken_cross_references(self) -> None:
        invalid = json.loads(json.dumps(self.template))
        invalid["sources"][0]["rights_ref"] = "RIGHT-MISSING"
        invalid["tasks"][0]["user_ids"] = ["USER-MISSING"]
        errors = check_domain_profile.reference_errors(invalid)
        self.assertIn("user_ids references unknown id 'USER-MISSING'", errors)
        self.assertTrue(any("unknown rights_ref" in item for item in errors))

    def test_prompts_keep_research_and_build_as_separate_hash_bound_stages(self) -> None:
        warmup = (DOCS / "prompts" / "okf-domain-warm-up.md").read_text()
        build = (DOCS / "prompts" / "okf-bundle-build.md").read_text()
        self.assertIn("Do not implement the bundle", warmup)
        self.assertIn("CHECKSUMS.sha256", warmup)
        self.assertIn("{{DOMAIN_PROFILE_ROOT_SHA256}}", build)
        self.assertIn("Tiny canonical fixture", build)
        self.assertIn("substantive security analysis once", build)
        self.assertIn("Promote the exact RC artefacts", build)

    def test_examples_exercise_three_materially_different_domains(self) -> None:
        examples = (DOCS / "prompts" / "domain-profile-examples.md").read_text()
        for required in (
            "## UK Legislation Assertions",
            "## ONS Assertions",
            "## GOV.UK Content Assertions",
            "ELI",
            "SDMX",
            "GOV.UK content models",
        ):
            self.assertIn(required, examples)


if __name__ == "__main__":
    unittest.main()
