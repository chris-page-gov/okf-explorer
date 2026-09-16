from __future__ import annotations

import copy
import json
from pathlib import Path
import subprocess
import unittest

from scripts.check_context_assembly import validate_documents

ROOT = Path(__file__).resolve().parents[1]


class ContextAssemblyContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        result = subprocess.run(['node', '--input-type=module', '-e',
            "import {contextEvaluationFixture} from './tests/helpers/context_evaluation_fixture.mjs'; console.log(JSON.stringify(contextEvaluationFixture()));"],
            cwd=ROOT, check=True, text=True, capture_output=True)
        cls.documents = json.loads(result.stdout)

    def test_additive_contracts_validate_exact_shapes(self):
        self.assertEqual(validate_documents(self.documents)['status'], 'passed-shape-validation')

    def test_unknown_package_and_nested_record_fields_are_rejected(self):
        for location in ('package', 'record'):
            changed = copy.deepcopy(self.documents)
            target = changed['package'] if location == 'package' else changed['package']['selected'][0]['record']
            target['hidden_expected_answer'] = 'Not a contract field'
            with self.assertRaisesRegex(ValueError, 'Additional properties'):
                validate_documents(changed)

    def test_unknown_provenance_is_representable_but_not_upgraded_by_schema(self):
        changed = copy.deepcopy(self.documents)
        changed['index']['records'][0]['provenance'] = []
        changed['index']['records'][0]['authority']['class'] = ''
        result = validate_documents({'index': changed['index']})
        self.assertIn('Shape only', result['boundary'])

    def test_missing_evaluation_requirements_are_rejected(self):
        changed = copy.deepcopy(self.documents)
        del changed['case']['expected']['paths']
        with self.assertRaisesRegex(ValueError, 'required property'):
            validate_documents(changed)

    def test_exact_identity_evaluator_negative_controls(self):
        result = subprocess.run(['node', '--test', 'tests/context_package_evaluation.test.mjs'],
                                cwd=ROOT, text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_portable_control_archive_integrity(self):
        result = subprocess.run(['node', '--test', 'tests/context_control_archive.test.mjs'],
                                cwd=ROOT, text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == '__main__':
    unittest.main()
