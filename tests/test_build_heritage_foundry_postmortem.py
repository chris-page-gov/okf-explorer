from __future__ import annotations

import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_heritage_foundry_postmortem as postmortem  # noqa: E402


class HeritageFoundryPostmortemTests(unittest.TestCase):
    def pending_publication_evidence_input(self) -> dict:
        value = copy.deepcopy(
            json.loads(
                postmortem.CURRENT_PUBLICATION_EVIDENCE_PATH.read_text(
                    encoding="utf-8"
                )
            )
        )
        required_fixed = {"repository", "number"}
        for record in value["records"]:
            record["status"] = "pending"
            record["observed_at"] = None
            record["evidence_urls"] = []
            record["claims"] = []
            for key in record["identities"]:
                if key not in required_fixed:
                    record["identities"][key] = None
            if record["id"] in {"PUBEV-004", "PUBEV-005", "PUBEV-006"}:
                record["subject_url"] = None
        return value

    def verified_publication_evidence_input(self) -> dict:
        value = copy.deepcopy(
            json.loads(
                postmortem.CURRENT_PUBLICATION_EVIDENCE_PATH.read_text(
                    encoding="utf-8"
                )
            )
        )
        spec_by_id = {
            spec["id"]: spec
            for spec in postmortem.CURRENT_PUBLICATION_EVIDENCE_SPECS
        }
        integer_keys = {
            "number",
            "ci_run_id",
            "pages_run_id",
            "release_id",
            "workflow_run_id",
        }
        commit_keys = {
            "head_commit",
            "merge_commit",
            "source_commit",
            "assurance_source_commit",
        }
        for record in value["records"]:
            spec = spec_by_id[record["id"]]
            record["status"] = "verified"
            record["subject_url"] = record["subject_url"] or (
                f"https://github.com/chris-page-gov/"
                f"okf-heritage-coventry-warwickshire/actions/runs/{record['id'][-1]}"
            )
            record["observed_at"] = "2026-08-04T12:00:00Z"
            record["evidence_urls"] = [record["subject_url"]]
            record["claims"] = list(reversed(spec["required_claims"]))
            for key, identity in record["identities"].items():
                if identity is not None:
                    continue
                if key in integer_keys:
                    record["identities"][key] = 70 if key == "number" else 1
                elif key in commit_keys:
                    record["identities"][key] = "a" * 40
                elif key.endswith("_sha256") or key in {
                    "attestation_digest",
                    "artifact_digest",
                }:
                    record["identities"][key] = "b" * 64
                elif key in {"tag", "candidate_tag"}:
                    record["identities"][key] = (
                        "heritage-coventry-warwickshire-20260804"
                    )
                elif key == "promotion_tag":
                    record["identities"][key] = (
                        "heritage-coventry-warwickshire-20260804-promotion.1"
                    )
                else:
                    self.fail(f"unhandled publication evidence identity: {key}")
        by_id = {record["id"]: record for record in value["records"]}
        by_id["PUBEV-004"]["subject_url"] = (
            "https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/"
            "releases/tag/heritage-coventry-warwickshire-20260804"
        )
        by_id["PUBEV-005"]["subject_url"] = (
            "https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/"
            f"actions/runs/{by_id['PUBEV-005']['identities']['workflow_run_id']}"
        )
        by_id["PUBEV-006"]["subject_url"] = (
            "https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/"
            "releases/tag/heritage-coventry-warwickshire-20260804-promotion.1"
        )
        for record in value["records"]:
            record["evidence_urls"] = [record["subject_url"]]
        return value

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
        self.assertIn("completed the public promotion", codex)

    def test_implementation_and_decision_registers_keep_terminal_state_explicit(
        self,
    ) -> None:
        pending = postmortem.normalize_current_publication_evidence(
            self.pending_publication_evidence_input()
        )
        implementations = postmortem.implementation_acceptance_register(pending)
        self.assertEqual(
            {f"IMP-{number:03d}" for number in range(1, 11)},
            {item["id"] for item in implementations},
        )
        self.assertTrue(
            all(item["artifacts"] and item["acceptance_tests"] for item in implementations)
        )
        publication = next(item for item in implementations if item["id"] == "IMP-009")
        self.assertIn("promotion-pending", publication["status"])

        decisions = postmortem.architecture_decisions(pending)
        self.assertEqual(
            {f"ADR-{number:03d}" for number in range(1, 7)},
            {item["id"] for item in decisions},
        )
        self.assertIn("YAML-LD", next(item for item in decisions if item["id"] == "ADR-003")["decision"])
        self.assertIn(
            "terminal external release pending",
            next(item for item in decisions if item["id"] == "ADR-006")["status"],
        )

    def test_current_publication_evidence_is_verified_from_exact_public_facts(
        self,
    ) -> None:
        evidence = postmortem.load_current_publication_evidence()
        self.assertEqual("verified", evidence["status"])
        self.assertEqual(
            postmortem.sha256_file(postmortem.CURRENT_PUBLICATION_EVIDENCE_PATH),
            evidence["source_sha256"],
        )
        self.assertEqual(
            [f"PUBEV-{number:03d}" for number in range(1, 7)],
            [record["id"] for record in evidence["records"]],
        )
        pr = postmortem.current_evidence_record(evidence, "PUBEV-001")
        self.assertEqual(70, pr["identities"]["number"])
        self.assertEqual(
            "https://github.com/chris-page-gov/okf-explorer/pull/70",
            pr["subject_url"],
        )
        self.assertTrue(all(record["status"] == "verified" for record in evidence["records"]))
        public_records = postmortem.public_current_evidence_records(evidence, 33)
        self.assertTrue(
            all(
                record["normalized_input_sha256"] == evidence["source_sha256"]
                for record in public_records
            )
        )

        invented = self.pending_publication_evidence_input()
        invented["records"][0]["status"] = "verified"
        with self.assertRaisesRegex(ValueError, "cannot be verified"):
            postmortem.normalize_current_publication_evidence(invented)

    def test_release_attempt_register_is_exact_and_candidate_neutral(self) -> None:
        register = postmortem.load_release_attempt_register()
        self.assertEqual(
            "okf-heritage-foundry-release-attempt-register.v1",
            register["schema"],
        )
        self.assertEqual(9, len(register["attempts"]))
        self.assertEqual(
            ["success", "failure", "failure", "success", "failure", "success", "failure", "success", "success"],
            [item["conclusion"] for item in register["attempts"]],
        )
        self.assertTrue(
            all(
                item["candidate_bytes_changed"] is False
                and item["site_bytes_changed"] is False
                for item in register["attempts"]
            )
        )
        self.assertEqual(
            postmortem.sha256_file(postmortem.RELEASE_ATTEMPTS_PATH),
            register["source_sha256"],
        )

    def test_verified_publication_evidence_drives_terminal_register_states(self) -> None:
        evidence_input = self.verified_publication_evidence_input()
        shuffled = copy.deepcopy(evidence_input)
        shuffled["records"].reverse()
        normalized = postmortem.normalize_current_publication_evidence(evidence_input)
        self.assertEqual(
            normalized,
            postmortem.normalize_current_publication_evidence(shuffled),
        )
        self.assertEqual("verified", normalized["status"])
        implementations = {
            item["id"]: item
            for item in postmortem.implementation_acceptance_register(normalized)
        }
        self.assertEqual(
            "implemented-and-external-promotion-verified",
            implementations["IMP-009"]["status"],
        )
        self.assertEqual(
            "implemented-and-terminal-release-verified",
            implementations["IMP-010"]["status"],
        )
        self.assertEqual(
            "implemented-and-terminal-publication-verified",
            implementations["IMP-001"]["status"],
        )
        self.assertEqual(
            "implemented-and-pr-70-verified",
            implementations["IMP-002"]["status"],
        )
        decisions = {
            item["id"]: item
            for item in postmortem.architecture_decisions(normalized)
        }
        self.assertEqual(
            "policy implemented; terminal releases verified",
            decisions["ADR-006"]["status"],
        )
        inconsistent = self.verified_publication_evidence_input()
        inconsistent["records"][2]["identities"]["source_commit"] = "c" * 40
        with self.assertRaisesRegex(ValueError, "inconsistent source commits"):
            postmortem.normalize_current_publication_evidence(inconsistent)

    def test_publication_evidence_cannot_change_the_deterministic_conversation_trace(
        self,
    ) -> None:
        exchange = postmortem.Exchange(
            sequence=1,
            title="Trace fixture",
            slug="trace-fixture",
            user=postmortem.Message(
                role="user",
                timestamp="2026-08-04T00:00:00Z",
                text="A visible prompt",
            ),
            responses=[
                postmortem.Message(
                    role="assistant",
                    timestamp="2026-08-04T00:00:01Z",
                    text="A visible response",
                    phase="final_answer",
                )
            ],
        )
        before = postmortem.render_reader([exchange])[1]
        postmortem.normalize_current_publication_evidence(
            self.verified_publication_evidence_input()
        )
        after = postmortem.render_reader([exchange])[1]
        self.assertEqual(before, after)

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
