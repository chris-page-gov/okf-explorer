"""Keep profile questions bound to their own graph and negative controls."""
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import build_profile_walkthroughs as builder


class ProfileWalkthroughTests(unittest.TestCase):
    def test_four_distinct_questions_cover_the_complete_retained_graphs(self):
        questions = set()
        for path in sorted(builder.CASES.glob('*.md')):
            root, files = builder.render(path)
            evidence = json.loads(files['walkthrough-evidence.json'])
            questions.add(evidence['question'])
            descriptor = json.loads((root / 'okf-explorer.json').read_bytes())
            self.assertEqual(descriptor['counts']['records'], len(evidence['records']))
            self.assertEqual(descriptor['counts']['relationships'], len(evidence['assertions']))
            self.assertIn('Markdown-core conformance is not asserted', evidence['scope'])
            journeys = json.loads(files['walkthrough.explorer-journeys.json'])
            self.assertEqual(len(evidence['records']), len(journeys['journeys']))
        self.assertEqual(4, len(questions))

    def changed_fixture(self, name, relative, change, message):
        case = builder.CASES / (name + '.md')
        root, _ = builder.render(case)
        with tempfile.TemporaryDirectory() as directory:
            temporary = Path(directory)
            target = temporary / root.relative_to(ROOT)
            shutil.copytree(root, target)
            path = target / relative
            data = json.loads(path.read_bytes())
            change(data)
            path.write_text(json.dumps(data))
            with patch.object(builder, 'ROOT', temporary):
                with self.assertRaisesRegex(ValueError, message):
                    builder.render(case)

    def test_changed_hierarchy_predicate_cannot_retain_the_worked_answer(self):
        self.changed_fixture('prov-hierarchy', 'data/relationships.json', lambda rows: rows[0].update(predicate='urn:changed'), 'source edge')

    def test_negative_fixture_must_keep_its_non_conforming_disposition(self):
        self.changed_fixture('missing-csv-label', 'data/shacl.json', lambda report: report.update(conforms=True), 'disposition changed')

    def test_changed_boundary_vintage_invalidates_the_answer(self):
        self.changed_fixture('uk-country-boundaries', 'manifest.json', lambda manifest: manifest.update(vintage='2026-12'), 'qualification changed')


if __name__ == '__main__':
    unittest.main()
