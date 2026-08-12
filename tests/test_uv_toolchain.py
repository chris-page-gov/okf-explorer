from __future__ import annotations

import hashlib
import json
import sys
import tomllib
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WORKFLOWS = tuple(sorted((ROOT / ".github" / "workflows").glob("*.yml")))
sys.path.insert(0, str(ROOT / "scripts"))

import reconcile_okf_repositories as reconcile  # noqa: E402
from ruamel.yaml import YAML  # noqa: E402


class UvToolchainTests(unittest.TestCase):
    def test_governed_versions_and_lock_are_exact(self) -> None:
        project = tomllib.loads((ROOT / "pyproject.toml").read_text(encoding="utf-8"))
        self.assertEqual("3.12.11", (ROOT / ".python-version").read_text().strip())
        self.assertEqual(">=3.12.11,<3.13", project["project"]["requires-python"])
        self.assertEqual("==0.12.2", project["tool"]["uv"]["required-version"])
        self.assertFalse(project["tool"]["uv"]["package"])

        lock = (ROOT / "uv.lock").read_text(encoding="utf-8")
        self.assertIn('requires-python = ">=3.12.11, <3.13"', lock)
        self.assertIn('name = "okf-explorer-tooling"', lock)

    def test_legacy_receipt_manifest_mirrors_project_dependencies(self) -> None:
        project = tomllib.loads((ROOT / "pyproject.toml").read_text(encoding="utf-8"))
        legacy = [
            line.strip()
            for line in (ROOT / "requirements-okf.txt").read_text().splitlines()
            if line.strip() and not line.lstrip().startswith("#")
        ]
        project_dependencies = project["project"]["dependencies"]
        self.assertEqual(
            legacy,
            [
                requirement
                for requirement in project_dependencies
                if not requirement.startswith("referencing")
            ],
        )
        self.assertIn("referencing>=0.37,<0.38", project_dependencies)

    def test_ci_uses_only_the_locked_uv_entrypoint(self) -> None:
        yaml = YAML(typ="safe")
        for path in WORKFLOWS:
            text = path.read_text(encoding="utf-8")
            document = yaml.load(text)
            with self.subTest(path=path.name):
                self.assertIsInstance(document, dict)
                self.assertNotIn("python3", text)
                self.assertNotIn(".venv/bin/python", text)
                self.assertNotIn("pip install", text)
                if "uv run --locked python" in text:
                    self.assertIn("uses: ./.github/actions/setup-locked-python", text)
            for job_name, job in document["jobs"].items():
                steps = job.get("steps", [])
                setup_indexes = [
                    index
                    for index, step in enumerate(steps)
                    if step.get("uses")
                    == "./.github/actions/setup-locked-python"
                ]
                command_indexes = [
                    index
                    for index, step in enumerate(steps)
                    if "uv run --locked python" in str(step.get("run", ""))
                ]
                checkout_indexes = [
                    index
                    for index, step in enumerate(steps)
                    if str(step.get("uses", "")).startswith("actions/checkout@")
                ]
                with self.subTest(path=path.name, job=job_name):
                    if command_indexes:
                        self.assertTrue(setup_indexes)
                        self.assertTrue(checkout_indexes)
                        self.assertLess(min(checkout_indexes), min(setup_indexes))
                        self.assertLess(min(setup_indexes), min(command_indexes))

    def test_composite_action_pins_and_synchronises_the_toolchain(self) -> None:
        action = (
            ROOT / ".github" / "actions" / "setup-locked-python" / "action.yml"
        ).read_text(encoding="utf-8")
        self.assertIsInstance(YAML(typ="safe").load(action), dict)
        self.assertIn("python-version-file: .python-version", action)
        self.assertIn(
            "astral-sh/setup-uv@c771a70e6277c0a99b617c7a806ffedaca235ff9",
            action,
        )
        self.assertIn('version: "0.12.2"', action)
        self.assertIn("run: uv sync --locked", action)

    def test_foundry_browser_server_uses_the_root_locked_project(self) -> None:
        config = (
            ROOT / "apps" / "okf-explorer" / "playwright.foundry.config.ts"
        ).read_text(encoding="utf-8")
        self.assertIn(
            "uv run --project ../.. --locked python -m http.server",
            config,
        )
        self.assertNotIn("'python3", config)

        publication_guidance = (ROOT / "publication-units" / "index.md").read_text(
            encoding="utf-8"
        )
        self.assertIn(
            "uv run --locked python scripts/export_publication_unit.py",
            publication_guidance,
        )
        self.assertNotIn("python3 scripts/export_publication_unit.py", publication_guidance)

    def test_released_heritage_profiles_are_an_explicit_compatibility_boundary(
        self,
    ) -> None:
        expected_sha256 = {
            "evaluation-foundry/fixtures/heritage-warwickshire/evaluation-profile.yaml":
                "0f0ab836716577806a33be99bda320264704899fe8f1f53a87072befe0d74bd2",
            "evaluation/heritage/evaluation-profile.yaml":
                "c7f25579e6a5823ebab24bb8f87ededaf4cc27e1c0f9f54cee2daffbf277aed4",
        }
        for relative, expected in expected_sha256.items():
            with self.subTest(path=relative):
                raw = (ROOT / relative).read_bytes()
                self.assertEqual(expected, hashlib.sha256(raw).hexdigest())

        current_workflows = "\n".join(
            path.read_text(encoding="utf-8") for path in WORKFLOWS
        )
        self.assertNotIn("fixture_protocol.producer_stage.commands", current_workflows)

    def test_semantic_contract_and_agent_block_match_the_reviewed_preset(self) -> None:
        expected_contract = reconcile.contract_for(
            "okf-explorer", reconcile.PRESETS["okf-explorer"]
        )
        actual_contract = json.loads(
            (ROOT / "okf.semantic.json").read_text(encoding="utf-8")
        )
        self.assertEqual(expected_contract, actual_contract)

        guidance = (ROOT / "AGENTS.md").read_text(encoding="utf-8")
        start = guidance.index(reconcile.AGENT_START)
        end = guidance.index(reconcile.AGENT_END, start) + len(reconcile.AGENT_END)
        self.assertEqual(reconcile.agent_block().strip(), guidance[start:end])


if __name__ == "__main__":
    unittest.main()
