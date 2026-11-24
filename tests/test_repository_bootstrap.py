from __future__ import annotations

import subprocess
import json
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "okf_repository_bootstrap.py"
sys.path.insert(0, str(ROOT / "scripts"))

import okf_publication  # noqa: E402
import okf_repository_bootstrap  # noqa: E402


def run(*arguments: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(SCRIPT), *arguments],
        check=False,
        capture_output=True,
        text=True,
    )


class RepositoryBootstrapTests(unittest.TestCase):
    def custom_producer(self, target: Path) -> None:
        for name in okf_repository_bootstrap.FILES:
            if "/" not in name:
                (target / name).write_text(f"# Owned {name}\n", encoding="utf-8")
        (target / "okf.semantic.json").write_text(json.dumps({
            "schema": "example-domain-semantic.v1",
            "okf_core": {"version": "0.3"},
            "authoritative_inputs": ["bundle/"],
        }), encoding="utf-8")
        (target / "okf.publication.json").write_text(json.dumps({
            "schema": "example-domain-publication.v1",
            "repository": "example-domain",
            "commands": ["touch SHOULD-NOT-BE-EXECUTED"],
        }), encoding="utf-8")
        (target / "bundle").mkdir()
        (target / "bundle/record.md").write_text("Authored domain evidence.\n", encoding="utf-8")
        (target / ".github/workflows").mkdir(parents=True)
        (target / ".github/workflows/domain.yml").write_text("name: Existing checks\non: workflow_dispatch\n", encoding="utf-8")

    def test_default_is_a_non_mutating_dry_run(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "new-repository"
            result = run(str(target))
            self.assertEqual(0, result.returncode, result.stderr)
            self.assertIn('"classification": "empty-new"', result.stdout)
            self.assertIn('"push": false', result.stdout)
            self.assertFalse(target.exists())

    def test_general_kind_creates_only_stack_neutral_foundations(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "Planning Research"
            applied = run(str(target), "--kind", "general", "--apply")
            self.assertEqual(0, applied.returncode, applied.stderr)
            self.assertEqual(
                {
                    ".gitignore",
                    "AGENTS.md",
                    "README.md",
                    "CHANGELOG.md",
                    "SECURITY.md",
                    "LICENSE_DECISIONS.md",
                },
                {path.relative_to(target).as_posix() for path in target.rglob("*") if path.is_file()},
            )
            readme = (target / "README.md").read_text(encoding="utf-8")
            self.assertIn("# Planning Research", readme)
            ignore = (target / ".gitignore").read_text(encoding="utf-8")
            self.assertIn(".env.*", ignore)
            self.assertIn("!.env.example", ignore)
            self.assertNotIn(".venv", ignore)
            self.assertFalse((target / "okf.semantic.json").exists())
            self.assertFalse((target / "source").exists())
            self.assertFalse((target / "generated").exists())
            self.assertFalse((target / ".github").exists())
            checked = run(str(target), "--kind", "general", "--check", "--adopt-existing")
            self.assertEqual(0, checked.returncode, checked.stderr)

    def test_apply_and_check_create_only_disabled_foundations(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "new-repository"
            applied = run(str(target), "--apply")
            self.assertEqual(0, applied.returncode, applied.stderr)
            self.assertTrue((target / "AGENTS.md").is_file())
            self.assertTrue((target / "CHANGELOG.md").is_file())
            self.assertTrue((target / "okf.semantic.json").is_file())
            self.assertTrue((target / "okf.publication.json").is_file())
            self.assertTrue(
                (target / ".github/workflows/okf-ci.yml.disabled").is_file()
            )
            self.assertFalse((target / ".git").exists())
            contract = okf_publication.load_publication_contract(target)
            self.assertEqual("bootstrap", contract["repository"]["lifecycle"])
            self.assertEqual("none", contract["publication"]["mode"])
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

    def test_scaffold_uses_british_locale_and_initialisation_spelling(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "new-repository"
            applied = run(str(target), "--apply")
            self.assertEqual(0, applied.returncode, applied.stderr)
            instructions = (target / "AGENTS.md").read_text(encoding="utf-8")
            readme = (target / "README.md").read_text(encoding="utf-8")
            self.assertIn("British English", instructions)
            self.assertIn("`en-GB`", instructions)
            self.assertIn("`Europe/London`", instructions)
            self.assertIn("initialisation commit", readme)
            self.assertNotIn("initialization commit", readme)

    def test_apply_refuses_symlink_destinations_and_parents(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "repository"
            target.mkdir()
            outside = Path(directory) / "outside"
            outside.mkdir()
            (target / "generated").symlink_to(outside, target_is_directory=True)
            result = run(str(target), "--apply", "--adopt-existing")
            self.assertEqual(2, result.returncode)
            self.assertIn("scaffold symlink", result.stderr)
            self.assertFalse((outside / "README.md").exists())

    def test_apply_refuses_broken_destination_symlink(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "repository"
            target.mkdir()
            (target / "README.md").symlink_to(Path(directory) / "missing")
            result = run(str(target), "--apply", "--adopt-existing")
            self.assertEqual(2, result.returncode)
            self.assertIn("scaffold symlink", result.stderr)

    def test_apply_refuses_symlink_ancestor_in_cli_and_direct_call(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            parent = Path(directory)
            real = parent / "real"
            real.mkdir()
            alias = parent / "alias"
            alias.symlink_to(real, target_is_directory=True)
            target = alias / "new-repository"
            result = run(str(target), "--apply")
            self.assertEqual(2, result.returncode)
            self.assertIn("target symlink", result.stderr)
            with self.assertRaisesRegex(ValueError, "target symlink"):
                okf_repository_bootstrap.apply_scaffold(
                    target,
                    list(okf_repository_bootstrap.FILES),
                )
            self.assertFalse((real / "new-repository").exists())

    def test_check_refuses_non_regular_destination(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "repository"
            self.assertEqual(0, run(str(target), "--apply").returncode)
            readme = target / "README.md"
            readme.unlink()
            readme.mkdir()
            checked = run(str(target), "--check", "--adopt-existing")
            self.assertEqual(1, checked.returncode)
            self.assertIn("not a regular file", checked.stderr)

    def test_existing_contracts_preserve_layout_and_active_ci(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory)
            self.custom_producer(target)
            before = {p.relative_to(target).as_posix(): p.read_bytes()
                      for p in target.rglob("*") if p.is_file()}
            plan = run(str(target), "--adopt-existing")
            self.assertEqual(0, plan.returncode, plan.stderr)
            self.assertEqual([], json.loads(plan.stdout)["create"])
            applied = run(str(target), "--apply", "--adopt-existing")
            self.assertEqual(0, applied.returncode, applied.stderr)
            checked = run(str(target), "--check-adoption", "--adopt-existing")
            self.assertEqual(0, checked.returncode, checked.stdout)
            report = json.loads(checked.stdout)
            self.assertEqual("repository-foundations-only", report["scope"])
            self.assertEqual("not-run", report["semantic_validation"])
            self.assertEqual("custom-schema-not-validated", report["publication_contract_validation"])
            self.assertEqual([".github/workflows/domain.yml"], report["existing_workflows"])
            after = {p.relative_to(target).as_posix(): p.read_bytes()
                     for p in target.rglob("*") if p.is_file()}
            self.assertEqual(before, after)
            self.assertFalse((target / "SHOULD-NOT-BE-EXECUTED").exists())
            self.assertFalse((target / "source").exists())
            self.assertFalse((target / "generated").exists())

    def test_adoption_does_not_disable_strict_scaffold_checks(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory)
            self.custom_producer(target)
            result = run(str(target), "--check", "--adopt-existing")
            self.assertEqual(1, result.returncode)
            self.assertIn("differs from the reviewed scaffold", result.stderr)
            self.assertIn("CI is enabled before validation", result.stderr)

    def test_adoption_rejects_bootstrap_contract_with_enabled_ci(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "new"
            self.assertEqual(0, run(str(target), "--apply").returncode)
            (target / ".github/workflows/early.yml").write_text("name: Too early\n", encoding="utf-8")
            result = run(str(target), "--check-adoption", "--adopt-existing")
            self.assertEqual(1, result.returncode)
            self.assertIn("unreviewed bootstrap", result.stdout)

    def test_adoption_rejects_duplicate_contract_keys(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory)
            self.custom_producer(target)
            (target / "okf.semantic.json").write_text('{"schema":"a","schema":"b"}', encoding="utf-8")
            result = run(str(target), "--check-adoption", "--adopt-existing")
            self.assertEqual(1, result.returncode)
            self.assertIn("duplicate JSON key", result.stdout)

    def test_adoption_refuses_symlinked_workflow_controls(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "repository"
            target.mkdir()
            self.custom_producer(target)
            outside = Path(directory) / "outside.yml"
            outside.write_text("secret outside material", encoding="utf-8")
            workflow = target / ".github/workflows/domain.yml"
            workflow.unlink()
            workflow.symlink_to(outside)
            result = run(str(target), "--check-adoption", "--adopt-existing")
            self.assertEqual(1, result.returncode)
            self.assertIn("workflow is not a regular file", result.stdout)
            self.assertNotIn("secret outside material", result.stdout)

    def test_adoption_rejects_missing_or_empty_foundations(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory)
            self.custom_producer(target)
            (target / "SECURITY.md").write_text("\n", encoding="utf-8")
            (target / "LICENSE_DECISIONS.md").unlink()
            result = run(str(target), "--check-adoption", "--adopt-existing")
            self.assertEqual(1, result.returncode)
            self.assertIn("empty adoption foundation: SECURITY.md", result.stdout)
            self.assertIn("missing adoption foundation: LICENSE_DECISIONS.md", result.stdout)

    def test_adoption_refuses_unreadable_text_and_non_finite_json(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory)
            self.custom_producer(target)
            (target / "README.md").write_bytes(b"\xff")
            result = run(str(target), "--check-adoption", "--adopt-existing")
            self.assertEqual(1, result.returncode)
            self.assertIn("not readable UTF-8: README.md", result.stdout)
            (target / "README.md").write_text("# Domain\n", encoding="utf-8")
            (target / "okf.semantic.json").write_text('{"schema":"custom","extra":NaN}', encoding="utf-8")
            result = run(str(target), "--check-adoption", "--adopt-existing")
            self.assertEqual(1, result.returncode)
            self.assertIn("non-finite JSON value", result.stdout)


if __name__ == "__main__":
    unittest.main()
