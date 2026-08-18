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
            python_job.index("uv run --locked python -m unittest discover -s tests"),
        )
        self.assertIn("check_impacted_heritage_evaluation.py", python_job)
        self.assertIn("needs.impact-plan.outputs.builder_fixtures", python_job)
        self.assertIn("needs.impact-plan.outputs.builder_planes", python_job)

        app_job = workflow[
            workflow.index("  app:") : workflow.index("\n  browser-targeted:")
        ]
        self.assertIn("needs.impact-plan.outputs.python == 'true'", app_job)
        app_steps = jobs["app"]["steps"]
        chromium_install_steps = [
            step
            for step in app_steps
            if step.get("run")
            == "pnpm exec playwright install --with-deps chromium"
        ]
        app_test_steps = [
            step for step in app_steps if step.get("run") == "pnpm test"
        ]
        self.assertEqual([], chromium_install_steps)
        self.assertEqual(1, len(app_test_steps))
        self.assertEqual(
            "apps/okf-explorer", app_test_steps[0].get("working-directory")
        )
        self.assertEqual(
            "chrome",
            app_test_steps[0].get("env", {}).get("PLAYWRIGHT_CHROMIUM_CHANNEL"),
        )

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
        self.assertIn("uv run --locked python scripts/build_site.py", full)
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
        document = YAML(typ="safe").load(workflow)
        jobs = self.workflow_jobs(".github/workflows/pages.yml")
        self.assertNotIn("permissions", document)
        for job_name in ("impact", "adversarial-gate", "app"):
            with self.subTest(job=job_name):
                self.assertEqual({"contents": "read"}, jobs[job_name]["permissions"])
        self.assertEqual(
            {"contents": "read", "pages": "read"},
            jobs["build"]["permissions"],
        )
        self.assertEqual(
            {"pages": "write", "id-token": "write"},
            jobs["deploy"]["permissions"],
        )
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
        pages_upload = next(
            step
            for step in jobs["build"]["steps"]
            if str(step.get("uses", "")).startswith(
                "actions/upload-pages-artifact@"
            )
        )
        self.assertIs(
            True,
            pages_upload["with"]["include-hidden-files"],
            "the candidate receipt includes .nojekyll, so the Pages archive must too",
        )

    def test_nightly_shadow_and_observers_are_separate(self) -> None:
        shadow = self.text(".github/workflows/foundry-full-shadow.yml")
        shadow_jobs = self.workflow_jobs(".github/workflows/foundry-full-shadow.yml")
        links = self.text(".github/workflows/link-observation.yml")
        self.assertIn("schedule:", shadow)
        self.assertIn("workflow_dispatch:", shadow)
        self.assertIn("uv run --locked python scripts/build_site.py", shadow)
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
        shadow_foundry_steps = shadow_jobs["foundry-full-family"]["steps"]
        shadow_foundry_build_index = next(
            index
            for index, step in enumerate(shadow_foundry_steps)
            if step.get("run") == "pnpm build:determinism"
        )
        shadow_foundry_checks_index = next(
            index
            for index, step in enumerate(shadow_foundry_steps)
            if step.get("name") == "Run full Foundry and candidate checks"
        )
        self.assertEqual(
            "apps/okf-explorer",
            shadow_foundry_steps[shadow_foundry_build_index].get(
                "working-directory"
            ),
        )
        self.assertLess(
            shadow_foundry_build_index,
            shadow_foundry_checks_index,
            "candidate checks require the exact Explorer build manifest",
        )
        shadow_browser = shadow[
            shadow.index("  browser-three-engine:") : shadow.index(
                "\n  foundry-full-family:"
            )
        ]
        shadow_steps = shadow_jobs["browser-three-engine"]["steps"]
        shadow_chromium_steps = [
            (index, step)
            for index, step in enumerate(shadow_steps)
            if step.get("run")
            == "pnpm exec playwright install --with-deps chromium"
        ]
        shadow_validation_steps = [
            index
            for index, step in enumerate(shadow_steps)
            if step.get("name") == "Validate and deterministically build Explorer"
            and "pnpm test" in step.get("run", "")
        ]
        self.assertEqual(1, len(shadow_chromium_steps))
        self.assertEqual(1, len(shadow_validation_steps))
        shadow_chromium_index, shadow_chromium_step = shadow_chromium_steps[0]
        self.assertEqual(
            "apps/okf-explorer", shadow_chromium_step.get("working-directory")
        )
        self.assertLess(
            shadow_chromium_index,
            shadow_validation_steps[0],
        )
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
        link_policy = json.loads(
            self.text("release-assurance/link-observation-policy.json")
        )
        self.assertIn("okf-genuine-browser-link-receipt.v1", observer)
        self.assertIn("navigator.webdriver", observer)
        self.assertIn("navigator.languages", observer)
        self.assertIn(link_policy["protected_browser_channel"], observer)
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
        candidate_document = YAML(typ="safe").load(candidate)
        promotion_document = YAML(typ="safe").load(promotion)
        pages_document = YAML(typ="safe").load(pages)
        policy = self.text("release-assurance/release-policy.json")
        link_policy = json.loads(
            self.text("release-assurance/link-observation-policy.json")
        )
        publication = self.text("PUBLICATION.md")
        self.assertIn("workflow_dispatch:", candidate)
        self.assertEqual({"workflow_dispatch"}, set(candidate_document["on"]))
        self.assertNotIn("  push:", candidate)
        self.assertNotIn("immutable-releases", candidate)
        self.assertNotIn("--immutable-settings", candidate)
        self.assertNotIn("secrets.", candidate)
        self.assertIn("GH_TOKEN: ${{ github.token }}", candidate)
        self.assertIn("--phase candidate", candidate)
        self.assertIn("actions/attest@", candidate)
        self.assertIn(
            "check_publication_unit_manifest.py publication/site", candidate
        )
        self.assertIn("repository: chris-page-gov/okf-explorer", candidate)
        self.assertIn("ref: ${{ inputs.assurance_ref }}", candidate)
        self.assertIn("pip install -r assurance/requirements-okf.txt", candidate)
        self.assertNotIn("publication/site/requirements-okf.txt", candidate)
        self.assertNotIn("python3 publication/site/", candidate)
        self.assertIn("ATTESTATION_WORKFLOW_REF: ${{ github.workflow_ref }}", candidate)
        self.assertIn("ATTESTATION_WORKFLOW_COMMIT: ${{ github.workflow_sha }}", candidate)
        self.assertIn("ATTESTATION_SOURCE_COMMIT: ${{ github.sha }}", candidate)
        self.assertIn("--source-repository-root publication", candidate)
        self.assertIn("--attestation-workflow-ref", candidate)
        self.assertIn("--attestation-workflow-commit", candidate)
        self.assertIn("--attestation-source-ref", candidate)
        self.assertIn("--attestation-source-commit", candidate)
        self.assertIn("heritage-coventry-warwickshire.tar.gz", candidate)
        self.assertIn("cd \"$RUNNER_TEMP\"", candidate)
        self.assertIn("--draft", candidate)
        self.assertIn("--draft=false", candidate)
        self.assertIn('test "$GITHUB_REF" = refs/heads/main', candidate)
        self.assertIn('test "$action_url" = "$expected_release_url"', candidate)
        self.assertIn('gh release verify "$TAG"', candidate)
        self.assertIn("--release-attestation-json", candidate)
        promotion_post_publish = promotion[
            promotion.index(
                "- name: Verify R2 platform immutability without feeding back"
            ):
        ]
        for asset in (
            "heritage-coventry-warwickshire.tar.gz",
            "SHA256SUMS",
            "publication-unit-manifest.json",
            "publication-validation-receipt.json",
            "candidate-release-receipt.json",
        ):
            self.assertIn(f'--release-asset "{asset}=', candidate)
            self.assertEqual(
                1,
                candidate.count(f'--release-asset "{asset}='),
                f"candidate release asset must occur exactly once: {asset}",
            )
        self.assertIn("--all-shards", terminal)
        self.assertIn("--fail-on-error", terminal)
        self.assertIn("if: ${{ always() }}", terminal)
        self.assertIn("if-no-files-found: warn", terminal)
        self.assertIn(
            "Upload the timestamped closure or failure diagnostics", terminal
        )
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
        self.assertIn('test "$GITHUB_REF" = refs/heads/main', promotion)
        self.assertEqual({"workflow_dispatch"}, set(promotion_document["on"]))
        self.assertNotIn("immutable-releases", promotion)
        self.assertNotIn("--immutable-settings", promotion)
        self.assertNotIn("secrets.", promotion)
        self.assertIn("GH_TOKEN: ${{ github.token }}", promotion)
        self.assertIn("repository: chris-page-gov/okf-explorer", promotion)
        self.assertIn("pip install -r assurance/requirements-okf.txt", promotion)
        self.assertNotIn("publication/site/requirements-okf.txt", promotion)
        self.assertNotIn("python3 publication/site/", promotion)
        self.assertIn(
            "--template assurance/publication-units/heritage-coventry-warwickshire/"
            "repository-template/promotion-envelope.template.json",
            promotion,
        )
        self.assertIn(
            "python3 assurance/scripts/check_terminal_promotion_envelope.py",
            promotion,
        )
        self.assertEqual(
            2,
            promotion.count(
                "python3 assurance/scripts/check_terminal_release_policy.py"
            ),
        )
        self.assertIn("ATTESTATION_WORKFLOW_REF: ${{ github.workflow_ref }}", promotion)
        self.assertIn("ATTESTATION_WORKFLOW_COMMIT: ${{ github.workflow_sha }}", promotion)
        self.assertIn("ATTESTATION_SOURCE_COMMIT: ${{ github.sha }}", promotion)
        self.assertIn("--source-repository-root publication", promotion)
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
            self.assertEqual(
                1,
                promotion_post_publish.count(f'--release-asset "{asset}='),
                f"promotion release asset must occur exactly once: {asset}",
            )
        self.assertIn("path: site", pages)
        self.assertIn('      - "site/**"', pages)
        self.assertEqual(["site/**"], pages_document["on"]["push"]["paths"])
        self.assertIn("check_publication_unit_manifest.py site", pages)
        self.assertNotIn("pip install", pages)
        self.assertNotIn("requirements-okf.txt", pages)
        self.assertNotIn("permissions", pages_document)
        self.assertEqual(
            {"contents": "read", "pages": "read"},
            pages_document["jobs"]["build"]["permissions"],
        )
        self.assertEqual(
            {"pages": "write", "id-token": "write"},
            pages_document["jobs"]["deploy"]["permissions"],
        )
        self.assertIn("PYTHONDONTWRITEBYTECODE", pages)
        self.assertNotIn("check_promotion_envelope.py", pages)
        self.assertIn('"live_browser_actions": 21', policy)
        self.assertIn('"receipt_backed_actions": 11', policy)
        self.assertIn('"administration_read_required": false', policy)
        self.assertIn(
            '"immutable_release_evidence": "post-publication-release-json-and-gh-release-verify"',
            policy,
        )
        self.assertIn(
            '"template_path": "release-assurance/promotion-envelope.template.json"',
            policy,
        )
        self.assertIn("install the five workflows", publication)
        self.assertIn(
            "Dispatch `promotion-release.yml` from updated `main`", publication
        )
        self.assertIn("verified release attestation", publication)


if __name__ == "__main__":
    unittest.main()
