from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import okf_publication  # noqa: E402


def valid_contract() -> dict[str, object]:
    return {
        "schema": "okf-repository-publication-contract.v1",
        "modified": "2026-08-18",
        "locale": "en-GB",
        "time_zone": "Europe/London",
        "repository": {
            "name": "okf-fixture",
            "url": "https://example.org/okf-fixture",
            "role": "small-bundle",
            "root_index": "README.md",
            "lifecycle": "active",
        },
        "semantic_contract": {
            "path": "okf.semantic.json",
            "profile": "https://example.org/profile",
        },
        "source_families": [
            {
                "id": "markdown",
                "label": "Markdown source",
                "kind": "markdown-tree",
                "paths": ["content/**"],
                "formats": ["text/markdown"],
                "origin": "authored",
                "authority": "editorial",
                "snapshot_policy": "pinned-revision",
                "inventory": {
                    "method": "deterministic-file-inventory",
                    "manifest_path": "source-inventory.json",
                    "identity": ["relative-path", "sha256"],
                },
                "rights": {"status": "approved", "evidence": []},
                "sensitivity": {
                    "status": "public-no-personal-data",
                    "assessment": "The fixture contains public documentation only.",
                },
                "extraction": {
                    "mode": "deterministic-local",
                    "network_access": "prohibited",
                    "command_ids": ["build-source"],
                },
                "invalidates": ["source"],
            }
        ],
        "boundaries": {
            "authored": [
                {
                    "path": "content/**",
                    "role": "content",
                    "source_family_id": "markdown",
                },
                {"path": "scripts/**", "role": "generator"},
                {"path": "docs/**", "role": "documentation"},
                {"path": "CHANGELOG.md", "role": "changelog"},
            ],
            "generated": [],
        },
        "planes": [
            {
                "id": "source",
                "depends_on": [],
                "paths": ["content/**", "scripts/**", "source-inventory.json"],
                "command_ids": ["build-source"],
            },
            {
                "id": "documentation",
                "depends_on": ["source"],
                "paths": ["docs/**", "README.md", "CHANGELOG.md"],
                "command_ids": ["check-docs"],
            },
            {
                "id": "release",
                "depends_on": ["documentation"],
                "paths": ["release/**"],
                "command_ids": ["check-release"],
            },
        ],
        "tooling": {
            "commands": [
                {
                    "id": "build-source",
                    "kind": "build",
                    "planes": ["source"],
                    "command": "touch must-not-exist",
                    "source": "AGENTS.md",
                    "review_status": "unreviewed",
                    "network": "none",
                    "mutates": "generated-only",
                },
                {
                    "id": "check-docs",
                    "kind": "check",
                    "planes": ["documentation"],
                    "command": "python scripts/check_documentation_lockstep.py",
                    "source": "AGENTS.md",
                    "review_status": "reviewed-local-guidance",
                    "network": "none",
                    "mutates": "none",
                },
                {
                    "id": "check-release",
                    "kind": "check",
                    "planes": ["release"],
                    "command": "python scripts/check_release.py",
                    "source": "AGENTS.md",
                    "review_status": "unreviewed",
                    "network": "none",
                    "mutates": "none",
                },
            ]
        },
        "lockstep": {
            "controlled_paths": ["content/**", "scripts/**", "requirements.lock"],
            "documentation_paths": ["docs/**", "README.md"],
            "changelog_path": "CHANGELOG.md",
            "check_command_id": "check-docs",
            "dependency_update_policy": "assess-release-bound-bytes-no-blanket-exemption",
            "unknown_path_policy": "fail-closed",
        },
        "ci": {
            "provider": "none",
            "workflow_paths": [],
            "impact_routing": "dependency-graph",
            "parallelism": "independent-planes",
            "unknown_path_policy": "fail-closed",
            "browser": {
                "ordinary": {
                    "policy": "not-applicable",
                    "engines": [],
                    "command_ids": [],
                },
                "cross_engine": {
                    "policy": "not-applicable",
                    "engines": [],
                    "command_ids": [],
                    "installation": {"policy": "none", "command_ids": []},
                },
            },
        },
        "publication": {
            "mode": "none",
            "scope": "unpublished",
            "authority": {
                "decision": "No publication from this fixture.",
                "evidence_paths": [],
            },
            "candidate_policy": "promote-exact-assured-bytes-without-rebuild",
            "targets": [],
        },
        "verification": {
            "required": False,
            "browser": "not-applicable",
            "exact_commit_required": False,
            "identity_checks": [],
            "journeys": [],
            "console_policy": "not-applicable",
            "command_ids": [],
        },
        "limitations": [],
    }


def write_repository(root: Path, contract: dict[str, object]) -> None:
    for relative, content in {
        "README.md": "# Fixture\n",
        "AGENTS.md": "# Guidance\n",
        "CHANGELOG.md": "# Changelog\n",
        "okf.semantic.json": "{}\n",
        "source-inventory.json": "{}\n",
        "content/record.md": "# Record\n",
    }.items():
        target = root / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
    (root / okf_publication.CONTRACT_NAME).write_text(
        json.dumps(contract), encoding="utf-8"
    )


class OkfPublicationTests(unittest.TestCase):
    def load_fixture(
        self, contract: dict[str, object] | None = None
    ) -> tuple[tempfile.TemporaryDirectory[str], Path, dict[str, object]]:
        directory = tempfile.TemporaryDirectory()
        root = Path(directory.name)
        value = contract or valid_contract()
        write_repository(root, value)
        return directory, root, value

    def test_valid_contract_loads_without_executing_command_declarations(self) -> None:
        directory, root, contract = self.load_fixture()
        self.addCleanup(directory.cleanup)
        loaded = okf_publication.load_publication_contract(root)
        self.assertEqual(contract, loaded)
        self.assertFalse((root / "must-not-exist").exists())

    def test_generated_inventory_may_be_absent_before_its_build(self) -> None:
        directory, root, contract = self.load_fixture()
        self.addCleanup(directory.cleanup)
        (root / "source-inventory.json").unlink()
        loaded = okf_publication.load_publication_contract(root)
        self.assertEqual(contract, loaded)

    def test_schema_error_is_reported_with_json_path(self) -> None:
        contract = valid_contract()
        contract["locale"] = "en-US"
        directory, root, _ = self.load_fixture(contract)
        self.addCleanup(directory.cleanup)
        with self.assertRaisesRegex(
            okf_publication.PublicationContractError, r"\$\.locale"
        ):
            okf_publication.load_publication_contract(root)

    def test_unknown_command_reference_and_missing_path_fail_integrity(self) -> None:
        contract = valid_contract()
        contract["planes"][0]["command_ids"] = ["missing-command"]
        contract["semantic_contract"]["path"] = "missing.json"
        directory, root, _ = self.load_fixture(contract)
        self.addCleanup(directory.cleanup)
        with self.assertRaises(okf_publication.PublicationContractError) as caught:
            okf_publication.load_publication_contract(root)
        self.assertIn("unknown ID: missing-command", str(caught.exception))
        self.assertIn("semantic_contract.path", str(caught.exception))

    def test_plane_dependency_cycle_fails_integrity(self) -> None:
        contract = valid_contract()
        contract["planes"][0]["depends_on"] = ["release"]
        directory, root, _ = self.load_fixture(contract)
        self.addCleanup(directory.cleanup)
        with self.assertRaisesRegex(
            okf_publication.PublicationContractError, "plane dependency cycle"
        ):
            okf_publication.load_publication_contract(root)

    def test_path_matching_keeps_single_star_within_a_segment(self) -> None:
        self.assertTrue(okf_publication.path_matches("docs/a.md", "docs/*.md"))
        self.assertFalse(okf_publication.path_matches("docs/x/a.md", "docs/*.md"))
        self.assertTrue(okf_publication.path_matches("docs/x/a.md", "docs/**"))
        self.assertTrue(okf_publication.path_matches("docs/x/a.md", "docs/"))

    def test_impact_plan_follows_downstream_dependency_closure(self) -> None:
        plan = okf_publication.build_impact_plan(
            valid_contract(), ["content/record.md"]
        )
        self.assertFalse(plan["fail_closed"])
        self.assertEqual(["source"], plan["direct_plane_ids"])
        self.assertEqual(
            ["source", "documentation", "release"], plan["affected_plane_ids"]
        )
        self.assertEqual(
            ["build-source", "check-docs", "check-release"], plan["command_ids"]
        )
        self.assertEqual(["markdown"], plan["matched_source_family_ids"])

    def test_unknown_path_fails_closed_to_every_plane_and_command(self) -> None:
        plan = okf_publication.build_impact_plan(valid_contract(), ["new/input.bin"])
        self.assertTrue(plan["fail_closed"])
        self.assertEqual(["new/input.bin"], plan["unknown_paths"])
        self.assertEqual(
            ["source", "documentation", "release"], plan["affected_plane_ids"]
        )
        self.assertEqual(
            ["build-source", "check-docs", "check-release"], plan["command_ids"]
        )


if __name__ == "__main__":
    unittest.main()
