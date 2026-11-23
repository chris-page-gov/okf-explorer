from pathlib import Path
import copy
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import check_domain_profile
import okf_repository_bootstrap
import okf_semantic
import update_viewer


class VersionedProducerContractsTests(unittest.TestCase):
    def test_v03_root_metadata_and_unknown_extensions_are_preserved(self):
        metadata = {"okf_version": "0.3", "title": "Example scope", "license": "CC-BY-4.0",
                    "x-owner": {"reviewed": False}}
        self.assertEqual([], update_viewer.validate_core("index.md", metadata, "# Example", version="0.3"))
        self.assertFalse(metadata["x-owner"]["reviewed"])
        self.assertTrue(update_viewer.validate_core("nested/index.md", metadata, "# Index", version="0.3"))
    def test_current_handoff_accepts_03_and_rejects_02_without_changing_v1(self):
        current = check_domain_profile.load_document(ROOT / "profiles/authoring/v2/domain-profile.template.yaml")
        self.assertEqual([], check_domain_profile.schema_errors(current))
        mismatched = copy.deepcopy(current)
        mismatched["intent"]["target_okf_version"] = "0.2"
        self.assertTrue(check_domain_profile.schema_errors(mismatched))
        historical = check_domain_profile.load_document(ROOT / "profiles/authoring/v1/domain-profile.template.yaml")
        self.assertEqual([], check_domain_profile.schema_errors(historical))
        self.assertEqual("0.2", historical["intent"]["target_okf_version"])
        self.assertEqual("0.3", okf_repository_bootstrap.SEMANTIC_CONTRACT["okf_core"]["version"])

    def test_old_review_is_history_after_a_new_generation_and_current_machine_check_wins(self):
        metadata = {"generated": {"by": "process:rewrite", "at": "2026-11-23T10:00:00Z"},
                    "verified": [{"by": "human:reviewer", "at": "2026-11-23T09:00:00Z"},
                                 {"by": "team:checks", "at": "2026-11-23T10:00:00Z"}]}
        self.assertEqual("machine-confirmed", okf_semantic.trust_tier(metadata, core_version="0.3"))
        self.assertEqual("human-reviewed", okf_semantic.trust_tier(metadata, core_version="0.2"))
        self.assertEqual(2, len(metadata["verified"]))

    def test_malformed_generation_cannot_reuse_a_human_review(self):
        metadata = {"generated": {"at": "unknown"},
                    "verified": {"by": "human:reviewer", "at": "2026-11-23T09:00:00Z"}}
        self.assertEqual("unverified", okf_semantic.trust_tier(metadata, core_version="0.3"))

    def test_verification_currency_retains_offsets_and_nanosecond_order(self):
        metadata = {"generated": {"at": "2026-11-23T10:00:00.000000002Z"},
                    "verified": {"by": "human:reviewer", "at": "2026-11-23T11:00:00.000000001+01:00"}}
        self.assertEqual("unverified", okf_semantic.trust_tier(metadata, core_version="0.3"))
        metadata["verified"]["at"] = "2026-11-23T11:00:00.000000002+01:00"
        self.assertEqual("human-reviewed", okf_semantic.trust_tier(metadata, core_version="0.3"))
