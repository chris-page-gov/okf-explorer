"""Keep the teaching package portable and the editorial catalogue separate from admission."""
from __future__ import annotations

import copy
import hashlib
import io
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))

import build_learning_example as starter
import build_okf_registry
import learning_catalogue


class LearningCatalogueTest(unittest.TestCase):
    def setUp(self):
        self.bundles = json.loads((ROOT / 'okf-registry.json').read_text())['bundles']
        self.entries = json.loads(learning_catalogue.SOURCE.read_text())

    def test_every_admitted_bundle_has_one_exercise_and_applications_are_separate(self):
        entries = learning_catalogue.resolve_catalogue(self.entries, self.bundles)
        bundle_ids = {bundle['id'].rsplit('/', 1)[-1] for bundle in self.bundles}
        self.assertEqual(bundle_ids, {entry['bundle_id'] for entry in entries if entry['kind'] == 'bundle'})
        government = next(entry for entry in entries if entry['id'] == 'government-evidence')
        self.assertEqual('application', government['kind'])
        self.assertNotIn('bundle_id', government)

    def test_rejects_missing_duplicate_unknown_and_misclassified_entries(self):
        invalid = []
        invalid.append([entry for entry in self.entries if entry['id'] != 'ons'])
        invalid.append(self.entries + [copy.deepcopy(self.entries[0])])
        unknown = copy.deepcopy(self.entries)
        unknown[1]['bundle_id'] = 'not-admitted'
        invalid.append(unknown)
        misclassified = copy.deepcopy(self.entries)
        misclassified[0]['bundle_id'] = 'ai-infrastructure'
        invalid.append(misclassified)
        duplicate = copy.deepcopy(self.entries)
        duplicate[-1] = {**duplicate[1], 'id': 'another-heritage'}
        invalid.append(duplicate)
        for entries in invalid:
            with self.subTest(entries=entries[-1]['id']):
                with self.assertRaises(ValueError):
                    learning_catalogue.resolve_catalogue(entries, self.bundles)

    def test_rejects_identifier_suffix_collision(self):
        other = {**self.bundles[0], 'id': 'https://other.example/' + self.bundles[0]['id'].rsplit('/', 1)[-1]}
        with self.assertRaisesRegex(ValueError, 'suffixes'):
            learning_catalogue.resolve_catalogue(self.entries, self.bundles + [other])

    def test_launch_links_use_admitted_identity_and_explicit_reviewed_variant(self):
        entries = learning_catalogue.resolve_catalogue(self.entries, self.bundles)
        self.assertEqual(6, sum('explorer_url' in entry for entry in entries))
        heritage = next(entry for entry in entries if entry['id'] == 'heritage')
        self.assertIn('tiny%2Fokf-explorer.json', heritage['explorer_url'])
        self.assertTrue(heritage['explorer_url'].endswith('#asset/1342941'))
        self.assertNotIn('explorer_url', next(entry for entry in entries if entry['id'] == 'ckan'))
        invalid = copy.deepcopy(self.entries)
        invalid[0]['explorer'] = {'route': 'overview'}
        with self.assertRaises(ValueError):
            learning_catalogue.resolve_catalogue(invalid, self.bundles)

    def test_all_committed_registry_projections_are_current(self):
        outputs = build_okf_registry.build()
        for path, key in build_okf_registry.OUTPUTS.items():
            with self.subTest(path=path):
                self.assertEqual(outputs[key], path.read_text())


class LearningStarterTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.source = Path(self.temp.name) / 'study-club'
        shutil.copytree(starter.DEFAULT_SOURCE, self.source)

    def test_outputs_are_deterministic_and_committed_package_matches(self):
        outputs = starter.build(self.source)
        self.assertEqual(outputs, starter.build(self.source))
        for name, data in outputs.items():
            self.assertEqual(data, (starter.DEFAULT_SOURCE / name).read_bytes(), name)
        with zipfile.ZipFile(io.BytesIO(outputs['first-bundle.zip'])) as package:
            checksums = json.loads(package.read('checksums.json'))['files']
            self.assertEqual(set(checksums) | {'checksums.json'}, set(package.namelist()))
            for name, digest in checksums.items():
                self.assertEqual(digest, hashlib.sha256(package.read(name)).hexdigest(), name)
            extracted = Path(self.temp.name) / 'extracted'
            package.extractall(extracted)
            self.assertEqual(outputs, starter.build(extracted))
        self.assertNotIn('](LICENSE-CODE.md)', (self.source / 'LICENSE.md').read_text())
        self.assertNotIn('../../', (self.source / 'index.md').read_text())

    def test_authored_edits_reach_explorer_context_and_checksums(self):
        original = starter.build(self.source)
        record = self.source / 'records/data-drop-in.md'
        record.write_text(record.read_text().replace('12:00', '12:30').replace('description:', 'description: Revised note.'))
        changed = starter.build(self.source)
        bundle = json.loads(changed['okf-bundle.json'])
        node = bundle['corpora']['study-club']['nodes']['records/data-drop-in.md']
        self.assertIn('12:30', node['body'])
        self.assertIn('12:30', changed['ai-context.md'].decode())
        self.assertIn(node['description'], changed['ai-context.md'].decode())
        self.assertNotEqual(original['checksums.json'], changed['checksums.json'])
        self.assertNotEqual(original['first-bundle.zip'], changed['first-bundle.zip'])

    def test_corrupted_copy_fails_without_repairing_or_overwriting_outputs(self):
        record = self.source / 'records/data-drop-in.md'
        record.write_text(record.read_text().replace('library-room.md', 'missing-room.md'))
        before = {name: (self.source / name).read_bytes() for name in starter.build(starter.DEFAULT_SOURCE)}
        result = subprocess.run([sys.executable, str(ROOT / 'scripts/build_learning_example.py'), '--source', str(self.source)], capture_output=True, text=True)
        self.assertNotEqual(0, result.returncode)
        self.assertIn('reference does not name a local record', result.stderr)
        for name, data in before.items():
            self.assertEqual(data, (self.source / name).read_bytes())

    def test_root_marker_and_index_membership_are_required(self):
        index = self.source / 'index.md'
        original = index.read_text()
        for invalid in [original.replace('okf_version: "0.2"', 'okf_version: "0.1"'), original.replace('records/booking.md', 'records/missing.md')]:
            index.write_text(invalid)
            with self.assertRaises(ValueError):
                starter.build(self.source)

    def test_missing_question_evidence_and_false_review_status_are_rejected(self):
        questions = self.source / 'questions.json'
        original = questions.read_text()
        data = json.loads(original)
        data[0]['record_ids'] = ['records/missing.md']
        questions.write_text(json.dumps(data))
        with self.assertRaisesRegex(ValueError, 'unknown record'):
            starter.build(self.source)
        questions.write_text(original)
        record = self.source / 'records/data-drop-in.md'
        record.write_text(record.read_text().replace('status: draft', 'status: human-reviewed'))
        with self.assertRaisesRegex(ValueError, 'status: draft'):
            starter.build(self.source)

    def test_reference_edges_retain_source_hash_and_synthetic_authority(self):
        bundle = json.loads(starter.build(self.source)['okf-bundle.json'])
        corpus = bundle['corpora']['study-club']
        self.assertEqual(6, len(corpus['nodes']))
        self.assertEqual({
            ('records/data-drop-in.md', 'records/library-room.md'),
            ('records/reading-circle.md', 'records/library-room.md'),
            ('records/repair-demonstration.md', 'records/workshop-room.md'),
            ('records/repair-demonstration.md', 'records/booking.md'),
            ('records/booking.md', 'records/repair-demonstration.md'),
        }, {(edge['source'], edge['target']) for edge in corpus['relationships']})
        for edge in corpus['relationships']:
            self.assertEqual('http://purl.org/dc/terms/references', edge['predicate'])
            self.assertEqual('synthetic-fixture', edge['assertion_scope'])
            self.assertEqual('synthetic', edge['authority']['class'])
            evidence = edge['evidence'][0]
            self.assertEqual(evidence['source_sha256'], hashlib.sha256((self.source / edge['source']).read_bytes()).hexdigest())


if __name__ == '__main__':
    unittest.main()
