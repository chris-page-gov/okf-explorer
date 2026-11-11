"""Execute browser archive setup against disposable mirror lists."""
import shlex
import subprocess
import tempfile
import unittest
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]


class BrowserArchiveTests(unittest.TestCase):
    def test_browser_workflows_preserve_hosts_and_upgrade_both_lists(self):
        for name in ['okf-explorer-ci.yml', 'foundry-full-shadow.yml']:
            with self.subTest(workflow=name), tempfile.TemporaryDirectory() as directory:
                workflow = yaml.safe_load((ROOT / '.github/workflows' / name).read_text())
                jobs = [job for job in workflow['jobs'].values() if any(step.get('name') == 'Select Ubuntu HTTPS archives for browser packages' for step in job.get('steps', []))]
                self.assertEqual(len(jobs), 1)
                self.assertEqual(jobs[0]['runs-on'], 'ubuntu-24.04')
                steps = jobs[0]['steps']
                step = next(step for step in steps if step.get('name') == 'Select Ubuntu HTTPS archives for browser packages')
                root = Path(directory)
                initial = {
                    'apt-mirrors.txt': 'http://regional.example/ubuntu/\nhttps://fallback.example/ubuntu/\n',
                    'apt-mirrors-security.txt': 'http://regional-security.example/ubuntu/\n',
                }
                for filename, text in initial.items():
                    (root / filename).write_text(text)
                command = step['run'].replace('/etc/apt/', shlex.quote(directory) + '/')
                subprocess.run(['bash', '-e', '-c', 'sudo() { "$@"; }\n' + command], check=True)
                for filename, text in initial.items():
                    self.assertEqual((root / filename).read_text(), text.replace('http://', 'https://'))
                self.assertEqual(step['timeout-minutes'], 1)
