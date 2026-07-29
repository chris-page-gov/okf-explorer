from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "okf_repository_bootstrap.py"


def run(*arguments: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(SCRIPT), *arguments],
        check=False,
        capture_output=True,
        text=True,
    )


class RepositoryBootstrapTests(unittest.TestCase):
    def test_default_is_a_non_mutating_dry_run(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "new-repository"
            result = run(str(target))
            self.assertEqual(0, result.returncode, result.stderr)
            self.assertIn('"classification": "empty-new"', result.stdout)
            self.assertIn('"push": false', result.stdout)
            self.assertFalse(target.exists())

    def test_apply_and_check_create_only_disabled_foundations(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "new-repository"
            applied = run(str(target), "--apply")
            self.assertEqual(0, applied.returncode, applied.stderr)
            self.assertTrue((target / "AGENTS.md").is_file())
            self.assertTrue(
                (target / ".github/workflows/okf-ci.yml.disabled").is_file()
            )
            self.assertFalse((target / ".git").exists())
            checked = run(str(target), "--check", "--adopt-existing")
            self.assertEqual(0, checked.returncode, checked.stderr)

    def test_non_empty_and_dirty_targets_require_explicit_adoption(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory)
            (target / "owned.txt").write_text("preserve me", encoding="utf-8")
            refused = run(str(target), "--apply")
            self.assertEqual(2, refused.returncode)
            self.assertIn("--adopt-existing", refused.stderr)
            adopted = run(str(target), "--apply", "--adopt-existing")
            self.assertEqual(0, adopted.returncode, adopted.stderr)
            self.assertEqual(
                "preserve me", (target / "owned.txt").read_text(encoding="utf-8")
            )

    def test_adoption_never_overwrites_an_existing_file(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory)
            readme = target / "README.md"
            readme.write_text("user content\n", encoding="utf-8")
            result = run(str(target), "--apply", "--adopt-existing")
            self.assertEqual(0, result.returncode, result.stderr)
            self.assertEqual("user content\n", readme.read_text(encoding="utf-8"))

    def test_check_rejects_enabled_ci(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "new-repository"
            self.assertEqual(0, run(str(target), "--apply").returncode)
            (target / ".github/workflows/early.yml").write_text(
                "name: too early\n", encoding="utf-8"
            )
            checked = run(str(target), "--check", "--adopt-existing")
            self.assertEqual(1, checked.returncode)
            self.assertIn("CI is enabled before validation", checked.stderr)


if __name__ == "__main__":
    unittest.main()
