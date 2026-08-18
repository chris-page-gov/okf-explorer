from __future__ import annotations

import sys
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

    def test_dependency_updates_have_no_actor_exemption(self) -> None:
        errors, controlled, _ = lockstep.lockstep_errors(CONTRACT, {"requirements.lock"})
        self.assertEqual(["requirements.lock"], controlled)
        self.assertEqual(2, len(errors))


if __name__ == "__main__":
    unittest.main()
