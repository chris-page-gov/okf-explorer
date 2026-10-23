"""Regression gates for task-based facets in newly authored Foundry bundles."""
from copy import deepcopy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import check_domain_profile
import check_foundry_facets

PROFILE = ROOT / 'profiles/authoring/v1/domain-profile.template.yaml'
BUNDLE = ROOT / 'tests/fixtures/foundry-facets/bundle.json'


class FoundryFacetTests(unittest.TestCase):
    def setUp(self):
        self.profile = check_domain_profile.load_document(PROFILE)
        self.bundle = json.loads(BUNDLE.read_text())
        self.contract = self.profile['presentation_contract']['domain_facets']
        self.nodes = self.bundle['corpora']['example']['nodes']

    def errors(self, **kwargs):
        return check_foundry_facets.check(self.profile, self.bundle, **kwargs)[0]

    def test_complete_projection_passes_and_counts_every_record(self):
        errors, counts = check_foundry_facets.check(self.profile, self.bundle)
        self.assertEqual([], errors)
        self.assertEqual({'Access': 1, 'Provenance': 1}, counts['topic'])

    def test_profile_requires_facet_contract(self):
        del self.profile['presentation_contract']['domain_facets']
        self.assertTrue(check_domain_profile.validate(self.profile))

    def test_generic_fallback_facets_do_not_satisfy_gate(self):
        self.contract['definitions'][0]['key'] = 'type'
        self.assertIn('generic fallback', '\n'.join(self.errors()))

    def test_missing_classification_is_rejected(self):
        del self.nodes['records/access.md']['learning_facets']['topic']
        self.assertIn('missing facet topic', '\n'.join(self.errors()))

    def test_unknown_and_empty_labels_are_rejected(self):
        for value in (['Made up'], [], [''], [' Access '], [None]):
            with self.subTest(value=value):
                self.nodes['records/access.md']['learning_facets']['topic'] = value
                self.assertTrue(self.errors())

    def test_constant_and_identical_multivalue_facets_are_rejected(self):
        for values in (['Access'], ['Access', 'Provenance']):
            for node in self.nodes.values():
                node['learning_facets']['topic'] = values
            self.assertIn('domain facet is constant', '\n'.join(self.errors()))

    def test_duplicate_labels_and_single_cardinality_are_rejected(self):
        self.nodes['records/access.md']['learning_facets']['topic'] = ['Access', 'Access']
        self.assertIn('duplicate topic', '\n'.join(self.errors()))
        self.contract['definitions'][0]['cardinality'] = 'single'
        self.nodes['records/access.md']['learning_facets']['topic'] = ['Access', 'Provenance']
        self.assertIn('single-valued', '\n'.join(self.errors()))

    def test_reader_opt_in_is_required_not_just_record_fields(self):
        presentation = self.bundle['meta']['learning_presentation']
        for field in ('schema', 'groups', 'start_route', 'facets'):
            with self.subTest(field=field):
                removed = presentation.pop(field)
                self.assertTrue(self.errors())
                presentation[field] = removed

    def test_consumer_labels_and_routes_are_checked(self):
        self.bundle['meta']['learning_presentation']['facets'][0]['label'] = 'Wrong label'
        self.assertIn('authored label', '\n'.join(self.errors()))
        self.bundle['meta']['learning_presentation']['groups'][0]['routes'] = ['missing.md']
        self.assertIn('dangling routes', '\n'.join(self.errors()))

    def test_all_four_membership_cases_are_required(self):
        self.contract['acceptance_cases'].pop()
        self.assertIn('single-value, OR, AND and no-match', '\n'.join(self.errors()))

    def test_expected_membership_is_checked_against_actual_records(self):
        self.contract['acceptance_cases'][0]['expected_record_ids'] = ['records/provenance.md']
        self.assertIn('membership differs', '\n'.join(self.errors()))

    def test_task_and_consumer_and_blocking_gate_must_exist(self):
        for field, value, message in (
            ('consumer_ref', 'missing', 'declared consumer'),
            ('validation_refs', ['missing'], 'build/release gate'),
        ):
            with self.subTest(field=field):
                original = self.contract[field]
                self.contract[field] = value
                self.assertIn(message, '\n'.join(self.errors()))
                self.contract[field] = original
        self.contract['definitions'][0]['task_refs'] = ['missing']
        self.assertIn('declared user task', '\n'.join(self.errors()))

    def test_build_cannot_use_legacy_profile_without_consumer_contract(self):
        del self.profile['consumer_contract']
        self.assertIn('declared consumer contract', '\n'.join(self.errors()))

    def test_separate_record_and_declaration_planes(self):
        records = {'all': deepcopy(self.nodes)}
        presentation = deepcopy(self.bundle)
        self.contract['record_path'] = ['all']
        self.assertEqual([], self.errors(records=records, presentation=presentation))

    def test_missing_record_plane_cannot_pass(self):
        self.contract['record_path'] = ['missing']
        self.assertIn('missing declared path', '\n'.join(self.errors()))

    def test_reader_truncation_cannot_silently_drop_values(self):
        self.nodes['records/access.md']['learning_facets']['topic'] = ['x' * 161]
        self.assertIn('value limits', '\n'.join(self.errors()))
        self.bundle['meta']['learning_presentation']['facets'][0]['label'] = 'x' * 81
        self.assertIn('80 characters', '\n'.join(self.errors()))

    def test_no_match_uses_populated_values_not_an_invented_label(self):
        self.contract['definitions'][0]['vocabulary'] = 'source-declared'
        self.contract['acceptance_cases'][-1]['selection']['topic'] = ['Never occurs']
        self.assertIn('select populated values', '\n'.join(self.errors()))

    def test_present_counts_cannot_be_ignored_by_disabling_requirement(self):
        self.bundle['facets'] = {}
        self.assertTrue(self.errors())

    def test_emitted_count_drift_and_duplicate_count_rows_fail(self):
        self.contract['emitted_counts_required'] = True
        self.bundle['facets'] = {
            'topic': [{'value': 'Access', 'count': 1}, {'value': 'Provenance', 'count': 1}],
            'audience': [{'value': 'Reader', 'count': 1}, {'value': 'Steward', 'count': 1}],
        }
        self.assertEqual([], self.errors())
        self.bundle['facets']['topic'][0]['count'] = 2
        self.assertIn('emitted counts differ', '\n'.join(self.errors()))
        self.bundle['facets']['topic'].append({'value': 'Access', 'count': 1})
        self.assertIn('duplicate or invalid', '\n'.join(self.errors()))

    def test_failed_cli_writes_digest_bound_failure_receipt_and_exits_nonzero(self):
        with tempfile.TemporaryDirectory() as directory:
            bundle = Path(directory) / 'bundle.json'
            receipt = Path(directory) / 'receipt.json'
            del self.nodes['records/access.md']['learning_facets']
            bundle.write_text(json.dumps(self.bundle))
            result = subprocess.run(
                [sys.executable, str(ROOT / 'scripts/check_foundry_facets.py'), str(PROFILE),
                 '--bundle', str(bundle), '--output', str(receipt)],
                capture_output=True, text=True,
            )
            self.assertEqual(1, result.returncode, result.stderr)
            evidence = json.loads(receipt.read_text())
            self.assertEqual('failed', evidence['status'])
            self.assertEqual(64, len(evidence['inputs']['bundle']['sha256']))
            self.assertTrue(evidence['errors'])


if __name__ == '__main__':
    unittest.main()
