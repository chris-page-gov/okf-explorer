"""Regression controls for receipt-backed prose, without network or service calls."""
from copy import deepcopy
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import check_remote_release_docs as release


class RemoteReleaseDocumentationTests(unittest.TestCase):
    def setUp(self):
        self.binding, self.deployment, self.observation = release.load()

    def test_real_retained_observation_and_three_guides_match(self):
        expected = release.render(self.binding, self.deployment, self.observation)
        self.assertIn('11 evidence cases and 121 requests', expected)
        self.assertIn(release.CURRENT, expected)
        for path in release.DOCS:
            release.check_document((release.ROOT / path).read_text(), expected)
        for path in release.GUIDES:
            release.check_wording((release.ROOT / path).read_text())

    def test_reversed_markers_cannot_be_rewritten(self):
        expected = release.render(self.binding, self.deployment, self.observation)
        with self.assertRaisesRegex(ValueError, 'reversed'):
            release.refreshed(release.END + 'Keep this text' + release.START, expected)

    def test_oversized_and_linked_metadata_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            original = root / 'source.json'; original.write_bytes(b'{}')
            link = root / 'linked.json'; link.symlink_to(original)
            with self.assertRaisesRegex(ValueError, 'symlink'):
                release.bounded_file(link, 16384)
            folder = root / 'linked-parent'; folder.symlink_to(root, target_is_directory=True)
            with self.assertRaisesRegex(ValueError, 'symlink'):
                release.bounded_file(folder / 'source.json', 16384)
            original.write_bytes(b'x' * 16385)
            with self.assertRaisesRegex(ValueError, 'bounded regular'):
                release.bounded_file(original, 16384)

    def test_reintroduced_undeployed_claim_is_rejected(self):
        expected = release.render(self.binding, self.deployment, self.observation)
        for stale in ('This is not deployed.', 'an **undeployed candidate**',
                      'Public acceptance remains 0.5.0.', 'still-live 0.5.0'):
            with self.subTest(stale=stale), self.assertRaisesRegex(ValueError, 'Unscoped deployment'):
                release.check_document(expected + '\n' + stale, expected)

    def test_edited_counts_and_missing_markers_are_rejected(self):
        expected = release.render(self.binding, self.deployment, self.observation)
        for altered in (expected.replace('121 requests', '120 requests'),
                        expected.replace(release.START, ''), expected + release.END):
            with self.assertRaises(ValueError):
                release.check_document(altered, expected)

    def test_failed_or_different_deployment_cannot_be_described_as_verified(self):
        for field, value in [('service_version', '0.7.0'), ('source_commit', 'a' * 40),
                             ('runtime_worker_sha256', 'a' * 64)]:
            d = deepcopy(self.deployment); d[field] = value
            with self.subTest(field=field), self.assertRaises(ValueError):
                release.validate(d, self.observation)
        d = deepcopy(self.deployment); d['deployment']['status'] = 'failed'
        with self.assertRaises(ValueError):
            release.validate(d, self.observation)

    def test_missing_case_success_and_failed_sdk_are_rejected(self):
        for field, value in [('passed', False), ('classification', 'local-only'), ('model_calls', 1)]:
            o = deepcopy(self.observation); o[field] = value
            with self.subTest(field=field), self.assertRaises(ValueError):
                release.validate(self.deployment, o)
        o = deepcopy(self.observation); o['cases'][0]['complete_package_matches_local_reference'] = False
        with self.assertRaises(ValueError):
            release.validate(self.deployment, o)

    def test_census_cannot_omit_an_http_event(self):
        o = deepcopy(self.observation); o['transport']['events'].pop()
        with self.assertRaisesRegex(ValueError, 'Request census'):
            release.validate(self.deployment, o)

    def test_deployment_after_observation_requires_new_evidence(self):
        d = deepcopy(self.deployment); d['deployment']['updated_at'] = '2026-09-22T00:00:00Z'
        with self.assertRaisesRegex(ValueError, 'chronology'):
            release.validate(d, self.observation)

    def test_runtime_and_verifier_are_distinct(self):
        self.assertNotEqual(self.deployment['runtime_commit'], self.observation['comparison_commit'])
        release.validate(self.deployment, self.observation)


if __name__ == '__main__':
    unittest.main()
