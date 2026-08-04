from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_heritage_foundry_postmortem as postmortem  # noqa: E402


class HeritageFoundryPostmortemTests(unittest.TestCase):
    def test_injected_runtime_context_is_not_a_visible_prompt(self) -> None:
        self.assertTrue(
            postmortem.is_injected_context(
                "<environment_context>private runtime</environment_context>"
            )
        )
        self.assertTrue(
            postmortem.is_injected_context(
                "<recommended_plugins>private runtime</recommended_plugins>"
            )
        )
        self.assertTrue(
            postmortem.is_injected_context(
                "# AGENTS.md instructions for /local/repository\nprivate rules"
            )
        )
        self.assertFalse(
            postmortem.is_injected_context("Explain with a separate tiny assurance fixture")
        )
        self.assertEqual(
            "## My request for Codex:\nImplement all the recommendations",
            postmortem.strip_injected_context_blocks(
                '<in-app-browser-context source="ambient-ui-state">\n'
                "ambient state\n"
                "</in-app-browser-context>\n\n"
                "## My request for Codex:\nImplement all the recommendations"
            ),
        )

    def test_public_sanitizer_removes_local_paths_and_token_shapes(self) -> None:
        value = postmortem.sanitize_public_text(
            f"repo={postmortem.ROOT} user=/Users/example/private "
            "token=github_pat_abcdefghijklmnopqrstuvwxyz123456"
        )
        self.assertNotIn("/Users/", value)
        self.assertNotIn("github_pat_", value)
        self.assertIn("[LOCAL_REPO]", value)
        self.assertIn("[REDACTED_SECRET]", value)

    def test_command_classifier_can_assign_multiple_relevant_categories(self) -> None:
        command = (
            "python3 scripts/build_heritage_evaluation.py && "
            "python3 scripts/build_site.py && pnpm exec playwright test"
        )
        self.assertEqual(
            ["heritage-build", "site-build", "playwright"],
            postmortem.command_categories(command),
        )

    def test_newest_prompts_have_stable_exchange_titles_and_contributions(self) -> None:
        further = "Discuss the **Further questions**"
        implementation = "Implement all the '**Recommended next steps**'"
        self.assertEqual(
            "Resolve the postmortem architecture questions",
            postmortem.title_for_prompt(further),
        )
        self.assertEqual(
            "Implement every recommended refactoring and publication control",
            postmortem.title_for_prompt(implementation),
        )
        exchange = postmortem.Exchange(
            sequence=8,
            title=postmortem.title_for_prompt(implementation),
            slug="implementation",
            user=postmortem.Message(
                role="user",
                timestamp="2026-08-04T00:00:00Z",
                text=implementation,
            ),
        )
        user, codex = postmortem.contribution_summary(exchange)
        self.assertIn("every postmortem recommendation", user)
        self.assertIn("public promotion kept pending", codex)

    def test_implementation_and_decision_registers_keep_terminal_state_explicit(
        self,
    ) -> None:
        implementations = postmortem.implementation_acceptance_register()
        self.assertEqual(
            {f"IMP-{number:03d}" for number in range(1, 11)},
            {item["id"] for item in implementations},
        )
        self.assertTrue(
            all(item["artifacts"] and item["acceptance_tests"] for item in implementations)
        )
        publication = next(item for item in implementations if item["id"] == "IMP-009")
        self.assertIn("promotion-pending", publication["status"])

        decisions = postmortem.architecture_decisions()
        self.assertEqual(
            {f"ADR-{number:03d}" for number in range(1, 7)},
            {item["id"] for item in decisions},
        )
        self.assertIn("YAML-LD", next(item for item in decisions if item["id"] == "ADR-003")["decision"])
        self.assertIn(
            "terminal external release pending",
            next(item for item in decisions if item["id"] == "ADR-006")["status"],
        )

    def test_markdown_template_dedent_preserves_interpolated_table(self) -> None:
        rendered = postmortem.dedent_markdown(
            "        # Heading\n\n"
            "        Prose.\n\n"
            "| Column |\n"
            "|---|\n"
            "| Value |\n"
        )
        self.assertTrue(rendered.startswith("# Heading\n\nProse.\n\n| Column |"))

    def test_content_addressed_writer_does_not_replace_unchanged_file(self) -> None:
        with tempfile.TemporaryDirectory(prefix="heritage-postmortem-test-") as temporary:
            path = Path(temporary) / "page.md"
            self.assertTrue(postmortem.write_if_changed(path, "# Page\n"))
            inode = path.stat().st_ino
            modified = path.stat().st_mtime_ns
            self.assertFalse(postmortem.write_if_changed(path, "# Page\n"))
            self.assertEqual(inode, path.stat().st_ino)
            self.assertEqual(modified, path.stat().st_mtime_ns)

    def test_public_package_passes_its_stored_lint(self) -> None:
        validation = postmortem.validate_public_package()
        self.assertEqual([], validation["broken_internal_links"])
        self.assertEqual([], validation["forbidden_publication_hits"])
        self.assertEqual([], validation["json_errors"])
        self.assertEqual([], validation["unexpected_generated_files"])
        self.assertEqual(
            validation,
            postmortem.load_json(
                postmortem.DATA_ROOT / "publication-lint-report.json"
            ),
        )


if __name__ == "__main__":
    unittest.main()
