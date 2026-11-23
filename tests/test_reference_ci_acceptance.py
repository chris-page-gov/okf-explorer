"""Exercise the protected gate against missing or incomplete reference evidence."""

import json
import os
from pathlib import Path
import shlex
import subprocess
import sys
import unittest

from ruamel.yaml import YAML

ROOT = Path(__file__).resolve().parents[1]


class ReferenceAcceptanceGateTests(unittest.TestCase):
    def test_required_reference_evidence_cannot_be_skipped_or_absent(self):
        workflow = YAML(typ="safe").load((ROOT / ".github/workflows/okf-explorer-ci.yml").read_text())
        job = workflow["jobs"]["okf-explorer-ci"]
        self.assertIn("reference-bundle-access", job["needs"])
        command = shlex.split(job["steps"][-1]["run"])
        self.assertEqual(["uv", "run", "--locked", "python", "-c"], command[:5])
        self.assertEqual(6, len(command))
        for state, expected in [("success", 0), ("skipped", 1), ("cancelled", 1), (None, 1)]:
            results = {"impact-plan": {"result": "success", "outputs": {"app": "true"}},
                       "app": {"result": "success"}, "skill-enforcement": {"result": "success"}}
            if state is not None:
                results["reference-bundle-access"] = {"result": state}
            with self.subTest(reference_result=state):
                result = subprocess.run([sys.executable, "-c", command[5]],
                    env={**os.environ, "RESULTS": json.dumps(results)}, capture_output=True, text=True)
                self.assertEqual(expected, result.returncode, result.stdout + result.stderr)
