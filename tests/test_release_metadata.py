from __future__ import annotations

import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "apps" / "okf-explorer" / "package.json"
CITATION = ROOT / "CITATION.cff"
CHANGELOG = ROOT / "CHANGELOG.md"
PACKAGE_BUILD_PROOF = (
    ROOT
    / "apps"
    / "okf-explorer"
    / "scripts"
    / "check_deterministic_build.mjs"
)
SVELTE_CONFIG = ROOT / "apps" / "okf-explorer" / "svelte.config.js"
CI_WORKFLOW = ROOT / ".github" / "workflows" / "okf-explorer-ci.yml"
PAGES_WORKFLOW = ROOT / ".github" / "workflows" / "pages.yml"
SEMANTIC_CONTRACT = ROOT / "okf.semantic.json"


class ReleaseMetadataTest(unittest.TestCase):
    def test_explore_okf_authoring_inputs_have_deduplicated_governance(self) -> None:
        contract = json.loads(SEMANTIC_CONTRACT.read_text(encoding="utf-8"))
        semantic_layer = contract["semantic_layer"]
        authoritative_inputs = semantic_layer["authoritative_inputs"]
        limitations = semantic_layer["limitations"]

        self.assertEqual(len(authoritative_inputs), len(set(authoritative_inputs)))
        self.assertEqual(len(limitations), len(set(limitations)))
        self.assertTrue(
            {
                "profiles/authoring/v1/",
                "profiles/explore-okf/v1/",
                "docs/okf-authoring-methodology-review-2026-08-12.md",
            }.issubset(authoritative_inputs)
        )
        checks = "\n".join(contract["tooling"]["check"])
        for suite in (
            "tests.test_okf_authoring_profile",
            "tests.test_explore_okf_profile",
            "tests.test_explore_okf_tooling",
        ):
            self.assertIn(suite, checks)

    def test_v070_release_metadata_is_synchronised(self) -> None:
        package_version = json.loads(PACKAGE.read_text(encoding="utf-8"))["version"]
        citation = CITATION.read_text(encoding="utf-8")
        changelog = CHANGELOG.read_text(encoding="utf-8")

        self.assertEqual("0.7.0", package_version)
        self.assertEqual(
            [package_version, package_version],
            re.findall(r"^\s*version:\s*\"([^\"]+)\"\s*$", citation, re.MULTILINE),
        )
        self.assertEqual(
            ["2026-08-12", "2026-08-12"],
            re.findall(
                r"^\s*date-released:\s*\"([^\"]+)\"\s*$",
                citation,
                re.MULTILINE,
            ),
        )
        self.assertRegex(
            changelog,
            r"(?m)^## v0\.5\.5 - 2026-07-29 - \S",
        )
        self.assertRegex(
            changelog,
            r"(?m)^## v0\.5\.7 - 2026-07-29 - \S",
        )
        self.assertRegex(
            changelog,
            r"(?m)^## v0\.6\.0 - 2026-08-10 - \S",
        )
        self.assertRegex(
            changelog,
            r"(?m)^## v0\.7\.0 - 2026-08-12 - \S",
        )
        self.assertRegex(
            changelog,
            r"(?m)^## v0\.6\.3 - 2026-08-12 - \S",
        )
        self.assertRegex(
            changelog,
            r"(?m)^## v0\.6\.2 - 2026-08-11 - \S",
        )
        self.assertRegex(
            changelog,
            r"(?m)^## v0\.6\.1 - 2026-08-11 - \S",
        )
        self.assertNotIn("## v0.7.0 - Unreleased", changelog)
        self.assertRegex(
            changelog,
            r"(?m)^## v0\.5\.4 - 2026-07-27 - \S",
        )
        self.assertRegex(
            changelog,
            r"(?m)^## v0\.5\.3 - 2026-07-27 - \S",
        )
        self.assertRegex(
            changelog,
            r"(?m)^## v0\.5\.2 - 2026-07-26 - \S",
        )
        self.assertRegex(
            changelog,
            r"(?m)^## v0\.5\.1 - 2026-07-26 - \S",
        )
        self.assertRegex(
            changelog,
            r"(?m)^## v0\.5\.0 - 2026-07-26 - \S",
        )

    def test_production_build_version_and_ci_are_deterministic(self) -> None:
        package = json.loads(PACKAGE.read_text(encoding="utf-8"))
        config = SVELTE_CONFIG.read_text(encoding="utf-8")
        proof = PACKAGE_BUILD_PROOF.read_text(encoding="utf-8")

        self.assertEqual(
            "node scripts/check_deterministic_build.mjs",
            package["scripts"]["build:determinism"],
        )
        self.assertIn("name: packageVersion", config)
        self.assertIn("readFileSync(new URL('./package.json'", config)
        self.assertNotRegex(config, r"\b(?:Date\.now|Math\.random)\b")
        self.assertIn("const first = await buildCleanSnapshot();", proof)
        self.assertIn("const second = await buildCleanSnapshot();", proof)
        self.assertIn("tree_sha256", proof)
        self.assertIn("index_sha256", proof)
        for workflow_path in (CI_WORKFLOW, PAGES_WORKFLOW):
            workflow = workflow_path.read_text(encoding="utf-8")
            self.assertIn("run: pnpm build:determinism", workflow)


if __name__ == "__main__":
    unittest.main()
