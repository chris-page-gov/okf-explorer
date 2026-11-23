"""Core/version dispatch must not rewrite or weaken the frozen v1 contract."""

import copy
import json
from pathlib import Path
import sys
import unittest

from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import reconcile_okf_repositories as reconcile


class Core03ContractTests(unittest.TestCase):
    def test_report_uses_actual_profile_and_does_not_mislabel_mixed_estate(self):
        v2 = {"profile": reconcile.PROFILE_V2_URL}
        self.assertEqual(reconcile.common_report_value([v2], "profile"), reconcile.PROFILE_V2_URL)
        self.assertIsNone(reconcile.common_report_value([v2, {"profile": reconcile.PROFILE_URL}], "profile"))
        self.assertIsNone(reconcile.common_report_value([v2, {}], "profile"))
        self.assertIsNone(reconcile.common_report_value([], "profile"))

    def test_v2_contracts_keep_structural_checks_and_require_core_03(self):
        schema = json.loads((ROOT / "profiles/bundle-wiki/v2/repository-contract.schema.json").read_text())
        validator = Draft202012Validator(schema)
        for name, preset in reconcile.PRESETS.items():
            contract = reconcile.contract_for(name, preset)
            contract["schema"] = "okf-repository-semantic-contract.v2"
            contract["okf_core"]["version"] = "0.3"
            contract["okf_core"]["specification"] = reconcile.specification_for("0.3")
            contract["semantic_layer"]["profile"] = reconcile.PROFILE_V2_URL
            with self.subTest(name=name):
                self.assertEqual(reconcile.contract_errors(contract), [])
                self.assertEqual(list(validator.iter_errors(contract)), [])
                invalid = copy.deepcopy(contract)
                invalid["okf_core"]["version"] = "0.2"
                self.assertTrue(reconcile.contract_errors(invalid))
                self.assertTrue(list(validator.iter_errors(invalid)))
                invalid = copy.deepcopy(contract)
                invalid["relationship_contract"]["required_fields"].remove("evidence")
                self.assertTrue(reconcile.contract_errors(invalid))

    def test_v1_does_not_gain_permission_to_relabel_core_03(self):
        contract = reconcile.contract_for("okf-ons", reconcile.PRESETS["okf-ons"])
        contract["okf_core"]["version"] = "0.3"
        self.assertTrue(reconcile.contract_errors(contract))
        contract["schema"] = "okf-repository-semantic-contract.v2"
        self.assertTrue(any("frozen Bundle Wiki v1" in e for e in reconcile.contract_errors(contract)))
        schema = json.loads((ROOT / "profiles/bundle-wiki/v2/repository-contract.schema.json").read_text())
        self.assertTrue(list(Draft202012Validator(schema).iter_errors(contract)))


if __name__ == "__main__":
    unittest.main()
