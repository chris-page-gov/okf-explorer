from __future__ import annotations

import json
import sys

import yaml
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import check_documentation_lockstep as lockstep  # noqa: E402


CONTRACT = {
    "lockstep": {
        "controlled_paths": ["scripts/**", "requirements.lock"],
        "documentation_paths": ["docs/**", "README.md"],
        "changelog_path": "CHANGELOG.md",
    }
}


class DocumentationLockstepTests(unittest.TestCase):
    def test_uncontrolled_change_does_not_require_documentation(self) -> None:
        errors, controlled, documentation = lockstep.lockstep_errors(
            CONTRACT, {"notes/private.txt"}
        )
        self.assertEqual(([], [], []), (errors, controlled, documentation))

    def test_controlled_change_requires_documentation_and_changelog(self) -> None:
        errors, controlled, documentation = lockstep.lockstep_errors(
            CONTRACT, {"scripts/build.py"}
        )
        self.assertEqual(["scripts/build.py"], controlled)
        self.assertEqual([], documentation)
        self.assertEqual(2, len(errors))

    def test_documentation_without_changelog_still_fails(self) -> None:
        errors, _, documentation = lockstep.lockstep_errors(
            CONTRACT, {"scripts/build.py", "docs/build.md"}
        )
        self.assertEqual(["docs/build.md"], documentation)
        self.assertEqual(
            ["controlled publication files changed without CHANGELOG.md"], errors
        )

    def test_documentation_and_changelog_pass(self) -> None:
        errors, _, documentation = lockstep.lockstep_errors(
            CONTRACT, {"scripts/build.py", "README.md", "CHANGELOG.md"}
        )
        self.assertEqual([], errors)
        self.assertEqual(["README.md"], documentation)

    def test_service_only_change_requires_top_level_lockstep(self) -> None:
        contract = json.loads((ROOT / "okf.publication.json").read_text())
        changed = {
            "services/ask-okf-mcp/src/registry.ts",
            "services/ask-okf-mcp/README.md",
            "services/ask-okf-mcp/CHANGELOG.md",
        }
        errors, _, _ = lockstep.lockstep_errors(contract, changed)
        self.assertEqual(2, len(errors))
        errors, _, _ = lockstep.lockstep_errors(
            contract, changed | {"docs/remote-mcp.md", "CHANGELOG.md"}
        )
        self.assertEqual([], errors)

    def test_pull_request_lockstep_cannot_be_skipped_by_impact_plan(self) -> None:
        workflow = yaml.safe_load(
            (ROOT / ".github/workflows/okf-explorer-ci.yml").read_text()
        )
        job = workflow["jobs"]["impact-plan"]
        self.assertNotIn("if", job)
        checks = [step for step in job["steps"]
                  if "check_documentation_lockstep.py" in step.get("run", "")]
        self.assertEqual(1, len(checks))
        self.assertNotIn("if", checks[0])
        self.assertIn("...HEAD", checks[0]["run"])

    def test_dependency_updates_have_no_actor_exemption(self) -> None:
        errors, controlled, _ = lockstep.lockstep_errors(CONTRACT, {"requirements.lock"})
        self.assertEqual(["requirements.lock"], controlled)
        self.assertEqual(2, len(errors))


if __name__ == "__main__":
    unittest.main()
