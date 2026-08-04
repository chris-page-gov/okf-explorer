from __future__ import annotations

import json
import math
import unittest
from pathlib import Path

from ruamel.yaml import YAML


ROOT = Path(__file__).resolve().parents[1]


class CiPublicationTopologyTests(unittest.TestCase):
    def text(self, path: str) -> str:
        return (ROOT / path).read_text(encoding="utf-8")

    def workflow_jobs(self, path: str) -> dict[str, dict]:
        workflow = YAML(typ="safe").load(self.text(path))
        return workflow["jobs"]

    def job_needs(self, job: dict) -> set[str]:
        needs = job.get("needs", [])
        return {needs} if isinstance(needs, str) else set(needs)

    def test_ci_is_impact_planned_parallel_and_fail_closed(self) -> None:
        workflow = self.text(".github/workflows/okf-explorer-ci.yml")
        jobs = self.workflow_jobs(".github/workflows/okf-explorer-ci.yml")
        self.assertIn("impact-plan:", workflow)
        self.assertIn("adversarial-gate:", workflow)
        self.assertIn("--github-output", workflow)
        for job in (
            "python-contracts:",
            "browser-targeted:",
            "browser-full:",
            "foundry:",
            "documentation:",
            "site:",
            "okf-explorer-ci:",
        ):
            self.assertIn(job, workflow)
        self.assertIn("needs.impact-plan.outputs.browser_full", workflow)
        self.assertIn("needs.impact-plan.outputs.browser_targeted == 'true'", workflow)
        self.assertIn("builder_fixtures:", workflow)
        self.assertIn("builder_planes:", workflow)
        self.assertIn("test_tags:", workflow)
        self.assertIn("journey_groups:", workflow)
        self.assertIn("result not in", workflow.replace("v[\"result\"] not in", "result not in"))
        self.assertEqual(1, workflow.count("check_heritage_adversarial.py"))
        self.assertIn("--output", workflow)
        self.assertIn("adversarial-gate-results", workflow)
        for job_name in (
            "python-contracts",
            "app",
            "browser-targeted",
            "browser-full",
            "foundry",
            "documentation",
            "site",
            "release-policy",
            "okf-explorer-ci",
        ):
            with self.subTest(job=job_name):
                self.assertIn("adversarial-gate", self.job_needs(jobs[job_name]))
        for job_name in (
            "python-contracts",
            "app",
            "browser-targeted",
            "browser-full",
            "foundry",
            "documentation",
            "site",
            "release-policy",
        ):
            with self.subTest(job=job_name):
                self.assertIn("impact-plan", self.job_needs(jobs[job_name]))
        self.assertNotIn("needs", jobs["impact-plan"])
        self.assertNotIn("needs", jobs["adversarial-gate"])
        python_job = workflow[
            workflow.index("  python-contracts:") : workflow.index("\n  app:")
        ]
        self.assertEqual(
            {"impact-plan", "adversarial-gate", "app"},
            self.job_needs(jobs["python-contracts"]),
        )
        self.assertIn(
            "Download exact app build for identity-bound Python contracts", python_job
        )
        self.assertIn("name: okf-explorer-app-build", python_job)
        self.assertIn("path: apps/okf-explorer/build", python_job)
        self.assertLess(
            python_job.index(
                "Download exact app build for identity-bound Python contracts"
            ),
            python_job.index("python3 -m unittest discover -s tests"),
        )
        self.assertIn("check_impacted_heritage_evaluation.py", python_job)
        self.assertIn("needs.impact-plan.outputs.builder_fixtures", python_job)
        self.assertIn("needs.impact-plan.outputs.builder_planes", python_job)

        app_job = workflow[
            workflow.index("  app:") : workflow.index("\n  browser-targeted:")
        ]
        self.assertIn("needs.impact-plan.outputs.python == 'true'", app_job)

        targeted = workflow[
            workflow.index("  browser-targeted:") : workflow.index("\n  browser-full:")
        ]
        self.assertIn("run_impacted_browser_tests.mjs", targeted)
        self.assertIn("IMPACT_TEST_TAGS", targeted)
        self.assertIn("IMPACT_JOURNEY_GROUPS", targeted)
        self.assertIn("steps.browser-plan.outputs.requires_site", targeted)
        self.assertIn("pnpm test:e2e:impacted", targeted)
        self.assertLess(
            targeted.index("pnpm install --frozen-lockfile"),
            targeted.index("pnpm exec svelte-kit sync"),
        )
        self.assertLess(
            targeted.index("pnpm exec svelte-kit sync"),
            targeted.index("pnpm test:e2e:impacted"),
        )

        full = workflow[
            workflow.index("  browser-full:") : workflow.index("\n  foundry:")
        ]
        self.assertIn("python3 scripts/build_site.py", full)
        self.assertIn("pnpm test:e2e:terminal", full)
        self.assertLess(
            full.index("pnpm install --frozen-lockfile"),
            full.index("pnpm exec svelte-kit sync"),
        )
        self.assertLess(
            full.index("pnpm exec svelte-kit sync"),
            full.index("pnpm test:e2e:terminal"),
        )

    def test_pages_uses_push_impact_and_external_pack_does_not_key_main_cache(
        self,
    ) -> None:
        workflow = self.text(".github/workflows/pages.yml")
        jobs = self.workflow_jobs(".github/workflows/pages.yml")
        self.assertIn("--changed-from HEAD^", workflow)
        self.assertIn("needs.impact.outputs.foundry", workflow)
        self.assertNotIn("'evaluation/**'", workflow)
        self.assertIn(".site-components", workflow)
        self.assertIn("site-components-v3-${{ runner.os }}-${{ github.sha }}", workflow)
        self.assertNotIn("hashFiles('evaluation/heritage", workflow)
        self.assertIn("site-candidate-receipt.json", workflow)
        self.assertIn("check_impacted_heritage_evaluation.py", workflow)
        self.assertLess(
            workflow.index("retarget_heritage_source_snapshots.py --check"),
            workflow.index("check_impacted_heritage_evaluation.py"),
        )
        self.assertEqual(1, workflow.count("check_heritage_adversarial.py"))
        self.assertEqual(
            {"impact", "adversarial-gate"}, self.job_needs(jobs["app"])
        )
        self.assertEqual(
            {"impact", "adversarial-gate", "app"},
            self.job_needs(jobs["build"]),
        )

    def test_nightly_shadow_and_observers_are_separate(self) -> None:
        shadow = self.text(".github/workflows/foundry-full-shadow.yml")
        shadow_jobs = self.workflow_jobs(".github/workflows/foundry-full-shadow.yml")
        links = self.text(".github/workflows/link-observation.yml")
        self.assertIn("schedule:", shadow)
        self.assertIn("workflow_dispatch:", shadow)
        self.assertIn("python3 scripts/build_site.py", shadow)
        self.assertIn("pnpm test:e2e:terminal", shadow)
        self.assertIn("--check --fixture all", shadow)
        self.assertLess(
            shadow.index("retarget_heritage_source_snapshots.py --check"),
            shadow.index("build_heritage_evaluation.py --check --fixture all"),
        )
        self.assertEqual(1, shadow.count("check_heritage_adversarial.py"))
        self.assertEqual(
            {"adversarial-gate"},
            self.job_needs(shadow_jobs["browser-three-engine"]),
        )
        self.assertEqual(
            {"adversarial-gate"},
            self.job_needs(shadow_jobs["foundry-full-family"]),
        )
        shadow_browser = shadow[
            shadow.index("  browser-three-engine:") : shadow.index(
                "\n  foundry-full-family:"
            )
        ]
        self.assertLess(
            shadow_browser.index("pnpm install --frozen-lockfile"),
            shadow_browser.index("pnpm exec svelte-kit sync"),
        )
        self.assertLess(
            shadow_browser.index("pnpm exec svelte-kit sync"),
            shadow_browser.index("pnpm test:e2e:terminal"),
        )
        self.assertIn("schedule:", links)
        self.assertIn("observe_link_intents.py", links)
        self.assertIn("observe_protected_links.mjs", links)
        self.assertIn("xvfb-run", links)
        self.assertIn("--chrome google-chrome", links)
        self.assertNotIn("playwright install", links)
        self.assertIn("$RUNNER_TEMP", links)
        self.assertNotIn("scripts/build_site.py", links)

        observer = self.text(
            "apps/okf-explorer/scripts/observe_protected_links.mjs"
        )
        self.assertIn("okf-genuine-browser-link-receipt.v1", observer)
        self.assertIn("navigator.webdriver", observer)
        self.assertIn("navigator.languages", observer)
        self.assertIn("google-chrome-cdp", observer)
        self.assertIn("Network.responseReceived", observer)
        for automation_flag in (
            "--enable-automation",
            "--headless",
            "--remote-debugging-port=0",
            "AutomationControlled",
        ):
            self.assertNotIn(automation_flag, observer)

    def test_browser_package_exposes_terminal_three_engine_assurance(self) -> None:
        package = self.text("apps/okf-explorer/package.json")
        runner = self.text(
            "apps/okf-explorer/scripts/run_impacted_browser_tests.mjs"
        )
        self.assertIn('"test:e2e:impacted"', package)
        self.assertIn('"test:e2e:terminal"', package)
        for engine in ("chrome", "firefox", "webkit"):
            self.assertIn(engine, package)
        self.assertIn("TEST_TAG_SUITES", runner)
        self.assertIn("JOURNEY_GROUP_SUITES", runner)
        self.assertIn("fail-closed-full", runner)

    def test_external_repository_templates_enforce_pages_and_release_provenance(
        self,
    ) -> None:
        candidate = self.text(
            "publication-units/heritage-coventry-warwickshire/"
            "repository-template/candidate-release.yml"
        )
        terminal = self.text(
            "publication-units/heritage-coventry-warwickshire/"
            "repository-template/terminal-assurance.yml"
        )
        promotion = self.text(
            "publication-units/heritage-coventry-warwickshire/"
            "repository-template/promotion-release.yml"
        )
        pages = self.text(
            "publication-units/heritage-coventry-warwickshire/"
            "repository-template/pages.yml"
        )
        policy = self.text("release-assurance/release-policy.json")
        link_policy = json.loads(
            self.text("release-assurance/link-observation-policy.json")
        )
        publication = self.text("PUBLICATION.md")
        self.assertIn(
            'tags: ["heritage-coventry-warwickshire-*"]', candidate
        )
        self.assertNotIn("????????", candidate)
        self.assertIn("immutable-releases", candidate)
        self.assertIn("--phase candidate", candidate)
        self.assertIn("actions/attest@", candidate)
        self.assertIn("check_publication_unit_manifest.py site", candidate)
        self.assertIn("heritage-coventry-warwickshire.tar.gz", candidate)
        self.assertIn("cd \"$RUNNER_TEMP\"", candidate)
        self.assertIn("--draft", candidate)
        self.assertIn("--draft=false", candidate)
        self.assertIn('test "$GITHUB_REF" = "refs/tags/$TAG"', candidate)
        self.assertIn('test "$action_url" = "$expected_release_url"', candidate)
        self.assertIn('gh release verify "$TAG"', candidate)
        self.assertIn("--release-attestation-json", candidate)
        for asset in (
            "heritage-coventry-warwickshire.tar.gz",
            "SHA256SUMS",
            "publication-unit-manifest.json",
            "publication-validation-receipt.json",
            "candidate-release-receipt.json",
        ):
            self.assertIn(f'--release-asset "{asset}=', candidate)
        self.assertIn("--all-shards", terminal)
        self.assertIn("--fail-on-error", terminal)
        self.assertIn("--browser-engine \"$engine\"", terminal)
        self.assertIn("version: 10", terminal)
        self.assertIn(
            "package_json_file: assurance/apps/okf-explorer/package.json", terminal
        )
        self.assertIn(
            "cache-dependency-path: assurance/apps/okf-explorer/pnpm-lock.yaml",
            terminal,
        )
        self.assertIn("working-directory: assurance/apps/okf-explorer", terminal)
        self.assertIn("PLAYWRIGHT_PACKAGE:", terminal)
        self.assertIn("node_modules/@playwright/test", terminal)
        self.assertIn(
            '--publication-root "$GITHUB_WORKSPACE/publication/site"',
            terminal,
        )
        self.assertIn("timeout --signal=TERM 75m", terminal)
        bounds = link_policy["terminal_bounds"]
        worst_case_seconds = (
            math.ceil(
                bounds["maximum_canonical_urls"]
                / link_policy["concurrent_requests"]
            )
            * link_policy["request_timeout_seconds"]
            * bounds["maximum_attempts_per_url"]
        )
        self.assertLess(
            worst_case_seconds,
            bounds["bulk_step_timeout_minutes"] * 60,
        )
        self.assertLessEqual(
            bounds["bulk_step_timeout_minutes"]
            + bounds["reserved_non_bulk_minutes"],
            bounds["job_timeout_minutes"],
        )
        self.assertIn(
            f"timeout-minutes: {bounds['job_timeout_minutes']}", terminal
        )
        self.assertIn("ASSURANCE_COMMIT", terminal)
        self.assertIn("^[0-9a-f]{40}$", terminal)
        self.assertIn(
            "Run 21 live and 11 receipt-backed actions in all three engines",
            terminal,
        )
        self.assertIn(
            'test "$GITHUB_REF" = "refs/tags/$CANDIDATE_TAG"', terminal
        )
        self.assertIn('test "$action_url" = "$expected_release_url"', terminal)
        for engine in ("chromium", "firefox", "webkit"):
            self.assertIn(engine, terminal)
        self.assertIn("--phase promotion", promotion)
        self.assertIn("--require-promoted", promotion)
        self.assertIn("materialize_promotion_envelope.py", promotion)
        self.assertIn("actions/attest@", promotion)
        self.assertIn("promotion-container-observation.json", promotion)
        self.assertIn("--draft", promotion)
        self.assertIn("--draft=false", promotion)
        self.assertIn(
            'test "$GITHUB_REF" = "refs/tags/$PROMOTION_TAG"', promotion
        )
        self.assertIn("terminal-run.json", promotion)
        self.assertIn("terminal-assurance.yml", promotion)
        self.assertIn("assurance_ref:", promotion)
        self.assertIn('test "$assurance_commit" = "$ASSURANCE_REF"', promotion)
        self.assertIn('.conclusion == "success"', promotion)
        self.assertIn(".head_sha == $head_sha", promotion)
        self.assertIn(".run_started_at", promotion)
        self.assertIn("terminal-artifacts.json", promotion)
        self.assertIn('gh release verify "$PROMOTION_TAG"', promotion)
        self.assertIn("--release-attestation-json", promotion)
        for engine in ("chromium", "firefox", "webkit"):
            self.assertIn(f"journey-{engine}-results.json", promotion)
        for asset in (
            "heritage-publication-envelope.json",
            "heritage-publication-envelope.attestation.json",
            "candidate-release-receipt.json",
            "publication-validation-receipt.json",
            "publication-journey-receipt.json",
            "link-observation-receipt.json",
            "protected-link-browser-receipt.json",
            "journey-chromium-results.json",
            "journey-firefox-results.json",
            "journey-webkit-results.json",
        ):
            self.assertIn(f'--release-asset "{asset}=', promotion)
        self.assertIn("path: site", pages)
        self.assertIn("check_publication_unit_manifest.py site", pages)
        self.assertIn("PYTHONDONTWRITEBYTECODE", pages)
        self.assertNotIn("check_promotion_envelope.py", pages)
        self.assertIn('"live_browser_actions": 21', policy)
        self.assertIn('"receipt_backed_actions": 11', policy)
        self.assertIn(
            '"template_path": "release-assurance/promotion-envelope.template.json"',
            policy,
        )
        self.assertIn("install the five workflows", publication)
        self.assertIn("Dispatch `promotion-release.yml` at the R2 tag", publication)
        self.assertIn("verified release attestation", publication)


if __name__ == "__main__":
    unittest.main()
