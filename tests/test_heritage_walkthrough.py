"""Bind each Heritage question to its own frozen records and assertions."""

import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import build_heritage_evaluation as heritage
import build_heritage_walkthrough as walkthrough
import heritage_build_io


class HeritageWalkthroughTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.bundles = {}
        for name, path in [('faithful', heritage.DEFAULT_SNAPSHOT), ('tiny', heritage.TINY_SNAPSHOT), ('synthetic', heritage.SYNTHETIC_SNAPSHOT)]:
            snapshot = heritage.read_snapshot(path)
            corpus = heritage.build_normalized_core(snapshot, snapshot['observed_at'], planes={'presentation'})
            cls.bundles[name] = (snapshot, corpus)

    def render(self, name, corpus=None):
        snapshot, original = self.bundles[name]
        return walkthrough.render_walkthrough(corpus or original, snapshot, heritage.publication_config(snapshot))

    def test_every_actual_bundle_has_a_distinct_question_and_complete_selected_evidence(self):
        questions = set()
        for name, (snapshot, corpus) in self.bundles.items():
            with self.subTest(bundle=name):
                outputs = self.render(name)
                evidence = json.loads(outputs['walkthrough-data.json'])
                questions.add(evidence['question'])
                self.assertEqual(snapshot['snapshot_id'], evidence['snapshot'])
                self.assertEqual('0.3', evidence['core_version'])
                self.assertEqual(corpus['descriptor']['counts'], evidence['counts'])
                for record in evidence['records']:
                    self.assertEqual(next(row for row in corpus['records'] if row['route'] == record['route']), record)
                for assertion in evidence['assertions']:
                    self.assertIn(assertion, corpus['relationships'])
                manifest = json.loads(outputs['walkthrough.explorer-journeys.json'])
                self.assertEqual(len(evidence['records']), len(manifest['journeys']))
                self.assertEqual(corpus['descriptor']['@id'], manifest['expected_identity']['id'])
                for record, journey in zip(evidence['records'], manifest['journeys']):
                    self.assertEqual('wait_for', journey['actions'][-1]['type'])
                    self.assertIn(str(record['native_id']), journey['actions'][-1]['selector'])
                legacy = json.loads(outputs['walkthrough.explorer-057-journeys.json'])
                self.assertEqual(manifest, json.loads(json.dumps(legacy).replace('aside.right-panel', 'aside[aria-label=\\"Record details\\"]')))
                self.assertIn('complete structured record/graph coverage is a separate', evidence['coverage'].lower())
        self.assertEqual(3, len(questions))

    def test_changed_source_grade_stops_the_worked_answer(self):
        corpus = copy.deepcopy(self.bundles['tiny'][1])
        next(row for row in corpus['records'] if row['route'] == 'asset/1184627')['grade'] = 'I'
        with self.assertRaisesRegex(ValueError, 'source fields changed'):
            self.render('tiny', corpus)

    def test_changed_synthetic_confidence_stops_the_worked_answer(self):
        corpus = copy.deepcopy(self.bundles['synthetic'][1])
        corpus['relationships'][0]['confidence'] = 0.99
        with self.assertRaisesRegex(ValueError, 'assertion'):
            self.render('synthetic', corpus)

    def test_invented_cross_record_assessment_breaks_the_negative_control(self):
        corpus = copy.deepcopy(self.bundles['tiny'][1])
        corpus['relationships'].append({'source': 'risk/2025/entry/036682fa45484e9f8975', 'target': 'asset/1342941', 'kind': 'assesses'})
        with self.assertRaisesRegex(ValueError, 'negative relationship'):
            self.render('tiny', corpus)

    def test_source_text_is_escaped_and_cannot_become_page_code(self):
        corpus = copy.deepcopy(self.bundles['tiny'][1])
        corpus['records'][0]['title'] = '<script>alert(1)</script>'
        html = self.render('tiny', corpus)['walkthrough.html']
        self.assertNotIn('<script>', html)
        self.assertIn('&lt;script&gt;', html)

    def test_all_walkthrough_assets_belong_to_the_presentation_plane(self):
        for name in self.render('tiny'):
            self.assertEqual('presentation', heritage_build_io.classify_output_plane(Path(name)), name)

    def test_selective_presentation_matches_full_build_without_search_or_semantic_rebuild(self):
        for name, (snapshot, corpus) in self.bundles.items():
            with self.subTest(bundle=name), tempfile.TemporaryDirectory() as directory:
                output = Path(directory)
                (output / 'okf-explorer.json').write_text(json.dumps(corpus['descriptor']))
                with patch.object(heritage.large_corpus, 'build_search', side_effect=AssertionError('search rebuilt')), patch.object(heritage, 'semantic_artifacts', side_effect=AssertionError('semantics rebuilt')):
                    selective, count = heritage.existing_presentation_core(output, snapshot=snapshot)
                    self.assertEqual(len(corpus['records']), count)
                    self.assertEqual(heritage.emit_presentation_plane(corpus, snapshot), heritage.emit_presentation_plane(selective, snapshot))

    def test_selective_presentation_rejects_a_different_source_population(self):
        snapshot, corpus = self.bundles['tiny']
        descriptor = copy.deepcopy(corpus['descriptor'])
        descriptor['counts']['records'] += 1
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            (output / 'okf-explorer.json').write_text(json.dumps(descriptor))
            with self.assertRaisesRegex(ValueError, 'record count does not match'):
                heritage.existing_presentation_core(output, snapshot=snapshot)

    def test_normalisation_does_not_mutate_nested_frozen_source_fields(self):
        snapshot = heritage.read_snapshot(heritage.SYNTHETIC_SNAPSHOT)
        original = copy.deepcopy(snapshot)
        records = heritage.source_records(snapshot)
        records[0]['resource_ids'].append('test/extra-resource')
        self.assertEqual(original, snapshot)


if __name__ == '__main__':
    unittest.main()
