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

    def test_optional_unit_shape_is_closed_and_evidence_only(self):
        changed = copy.deepcopy(self.documents['index'])
        record = next(row for row in changed['records'] if row['kind'] == 'evidence')
        digest = 'a' * 64
        record['evidence_unit'] = {
            'schema': 'okf-evidence-unit.v1', 'kind': 'paragraph',
            'boundary_status': 'machine-detected', 'completeness': 'unresolved',
            'offset_unit': 'utf-8-bytes', 'joiner': '', 'spans': [{
                'source_url': 'https://example.test/source.pdf', 'source_sha256': digest,
                'extraction_url': 'https://example.test/source.json', 'extraction_sha256': digest,
                'locator': 'Synthetic page', 'source_text_sha256': digest,
                'source_text_bytes': 10, 'source_start': 0, 'source_end': 10,
                'unit_start': 0, 'unit_end': 10, 'literal_sha256': digest
            }]
        }
        # Shape only: TypeScript separately checks actual text and provenance.
        self.assertEqual(validate_documents({'index': changed})['status'], 'passed-shape-validation')
        for mutation in ('field', 'span-cap', 'fallback', 'concept'):
            broken = copy.deepcopy(changed)
            row = next(row for row in broken['records'] if row['id'] == record['id'])
            if mutation == 'field':
                row['evidence_unit']['spans'][0]['unbound_interpretation'] = 'hidden'
            elif mutation == 'span-cap':
                row['evidence_unit']['spans'] *= 33
            elif mutation == 'fallback':
                row['evidence_unit']['kind'] = 'page-fallback'
            else:
                row['kind'] = 'concept'
            with self.assertRaises(ValueError):
                validate_documents({'index': broken})

    def test_v2_manifest_shape_keeps_unit_and_page_counts_separate(self):
        ref = lambda path: {'path': path, 'bytes': 10, 'sha256': 'a' * 64}
        manifest = {
            'schema': 'okf-context-corpus.v2', 'bundle': self.documents['index']['bundle'],
            'scope': 'Synthetic shape control', 'limitations': [], 'semantic_source_snapshot': 'test',
            'base_index': ref('base.json'),
            'counts': {'documents': 1, 'pages': 2, 'nonempty_pages': 2, 'empty_pages': 0, 'tokenless_pages': 0},
            'records': {'count': 1, 'shards': [{**ref('records.json'), 'first_ordinal': 0,
                'count': 1, 'first_id': 'urn:unit:one', 'last_id': 'urn:unit:one'}]},
            'search': {'tokenisation': 'nfkd-lowercase-ascii-alphanumeric-min2-v1',
                'bucket_algorithm': 'fnv1a32-high-byte-hex-v1',
                'shards': {f'{n:02x}': ref(f'search/{n:02x}.json') for n in range(256)}}
        }
        self.assertEqual(validate_documents({'corpus': manifest})['status'], 'passed-shape-validation')
        for mutation in ('range', 'bucket', 'unknown', 'oversized'):
            broken = copy.deepcopy(manifest)
            if mutation == 'range':
                del broken['records']['shards'][0]['first_id']
            elif mutation == 'bucket':
                del broken['search']['shards']['ff']
            elif mutation == 'unknown':
                broken['hidden_answer'] = 'not permitted'
            else:
                broken['base_index']['bytes'] = 8388609
            with self.assertRaises(ValueError):
                validate_documents({'corpus': broken})

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
