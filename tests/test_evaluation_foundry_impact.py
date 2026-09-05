from __future__ import annotations

import copy
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import check_evaluation_foundry  # noqa: E402
import check_promotion_envelope  # noqa: E402
import plan_evaluation_foundry_impact as impact  # noqa: E402


PROFILE_PATH = (
    ROOT
    / "evaluation-foundry"
    / "fixtures"
    / "heritage-warwickshire"
    / "evaluation-profile.yaml"
)
PUBLISHED_PROFILE_PATH = ROOT / "evaluation" / "heritage" / "evaluation-profile.yaml"
PLAN_SCHEMA_PATH = (
    ROOT
    / "evaluation-foundry"
    / "schemas"
    / "okf-evaluation-impact-plan.v1.schema.json"
)
ENVELOPE_PATH = ROOT / "release-assurance" / "heritage-publication-envelope.json"
SHADOW_CASES_PATH = (
    ROOT
    / "evaluation-foundry"
    / "fixtures"
    / "heritage-warwickshire"
    / "history"
    / "impact-shadow-cases.json"
)


class EvaluationFoundryImpactTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.profile = check_evaluation_foundry.load_document(PROFILE_PATH)
        cls.plan_schema = json.loads(PLAN_SCHEMA_PATH.read_text(encoding="utf-8"))
        cls.plan_validator = Draft202012Validator(
            cls.plan_schema,
            format_checker=FormatChecker(),
        )

    def assert_valid_plan(self, plan: dict[str, object]) -> None:
        errors = list(self.plan_validator.iter_errors(plan))
        self.assertEqual([], errors, [error.message for error in errors])

    def test_producer_impact_rule_covers_exact_local_producer_materials_in_both_profiles(
        self,
    ) -> None:
        expected = {
            "requirements-okf.txt",
            "scripts/build_heritage_evaluation.py",
            "scripts/build_uk_government_api_okf.py",
            "scripts/heritage_build_io.py",
            "scripts/okf_semantic.py",
        }
        for profile_path in (PROFILE_PATH, PUBLISHED_PROFILE_PATH):
            with self.subTest(profile=str(profile_path)):
                profile = check_evaluation_foundry.load_document(profile_path)
                producer = next(
                    rule
                    for rule in profile["impact_policy"]["path_rules"]
                    if rule["id"] == "IMPACT-PRODUCER"
                )
                self.assertTrue(expected.issubset(producer["patterns"]))
                for changed_path in sorted(expected):
                    plan = impact.build_impact_plan(profile, [changed_path])
                    self.assertFalse(plan["fail_closed"])
                    self.assertIn("IMPACT-PRODUCER", plan["matched_rule_ids"])

    def test_current_journeys_use_existing_control_rule_without_mutating_profile(self) -> None:
        original = copy.deepcopy(self.profile)
        for path in sorted(impact.REPOSITORY_JOURNEYS):
            plan = impact.build_impact_plan(self.profile, [path])
            self.assertFalse(plan["fail_closed"])
            self.assertIn("IMPACT-FOUNDRY-JOURNEYS", plan["matched_rule_ids"])
            self.assertTrue(plan["selectors"]["jobs"]["foundry"])
        self.assertEqual(original, self.profile)
        unknown = impact.build_impact_plan(self.profile, ["evaluation/other/journeys.json"])
        self.assertTrue(unknown["fail_closed"])

    def test_v2_semantic_roots_preserve_graph_identity_and_validate_artifacts(self) -> None:
        receipt = json.loads((ROOT / "evaluation/heritage/tiny/assurance/plane-roots.json").read_text())
        original = impact._validated_plane_root_digests(receipt)
        plane = receipt["planes"]["semantic"]
        entry = next(row for row in plane["entries"] if "semantic_sha256" in row)
        entry["sha256"] = "a" * 64
        plane["artifact_root_sha256"] = impact._rooted_json_sha256(plane["entries"])
        self.assertEqual(original, impact._validated_plane_root_digests(receipt))
        # A changed graph must affect the semantic role even if serialisation is unchanged.
        entry["semantic_sha256"] = "b" * 64
        plane["artifact_root_sha256"] = impact._rooted_json_sha256(plane["entries"])
        plane["root_sha256"] = impact._rooted_json_sha256([impact.identity_entry(row) for row in plane["entries"]])
        receipt["release_root_sha256"] = impact._rooted_json_sha256([
            {"plane": role, "root_sha256": value["root_sha256"]}
            for role, value in sorted(receipt["planes"].items())
        ])
        changed = impact._validated_plane_root_digests(receipt)
        self.assertEqual(["semantic"], [role for role in original if original[role] != changed[role]])
        for corruption in ("missing_artifact", "stale_artifact", "incomplete_identity"):
            bad = copy.deepcopy(receipt)
            plane = bad["planes"]["semantic"]
            if corruption == "missing_artifact":
                del plane["artifact_root_sha256"]
            elif corruption == "stale_artifact":
                plane["artifact_root_sha256"] = "0" * 64
            else:
                entry = next(row for row in plane["entries"] if "semantic_sha256" in row)
                del entry["semantic_algorithm"]
                plane["artifact_root_sha256"] = impact._rooted_json_sha256(plane["entries"])
            with self.subTest(corruption=corruption), self.assertRaises(impact.ImpactPlanError):
                impact._validated_plane_root_digests(bad)

    def test_v2_schema_reuses_foundry_contract_definitions(self) -> None:
        schema = json.loads(
            (
                ROOT
                / "evaluation-foundry"
                / "schemas"
                / "okf-evaluation-profile.v2.schema.json"
            ).read_text(encoding="utf-8")
        )
        consumer_ref = schema["properties"]["consumer_contract"]["$ref"]
        validation_ref = schema["properties"]["validation"]["items"]["$ref"]
        self.assertEqual(
            "../../profiles/authoring/v1/domain-profile.schema.json#/$defs/consumerContract",
            consumer_ref,
        )
        self.assertEqual(
            "../../profiles/authoring/v1/domain-profile.schema.json#/$defs/validationCheck",
            validation_ref,
        )
        self.assertNotIn("consumerContract", schema["$defs"])
        self.assertNotIn("validationCheck", schema["$defs"])

        validators = check_evaluation_foundry.schema_validators()
        self.assertEqual(
            [],
            check_evaluation_foundry.rendered_schema_errors(
                "profile",
                self.profile,
                validators["profile_v2"],
            ),
        )

    def test_unknown_path_and_missing_root_evidence_fail_closed(self) -> None:
        unknown = impact.build_impact_plan(
            self.profile,
            ["unclassified/new-system.xyz"],
        )
        self.assertTrue(unknown["fail_closed"])
        self.assertTrue(all(unknown["selectors"]["jobs"].values()))
        self.assertEqual(
            {"PLANE-CONTROL", "PLANE-DATA", "PLANE-SEARCH", "PLANE-SEMANTIC", "PLANE-PRESENTATION", "PLANE-RELEASE"},
            set(unknown["selectors"]["planes"]),
        )
        self.assert_valid_plan(unknown)

        producer_without_receipts = impact.build_impact_plan(
            self.profile,
            ["scripts/build_heritage_evaluation.py"],
        )
        self.assertFalse(producer_without_receipts["fail_closed"])
        self.assertEqual(
            {
                "PLANE-CONTROL",
                "PLANE-DATA",
                "PLANE-SEARCH",
                "PLANE-SEMANTIC",
                "PLANE-PRESENTATION",
                "PLANE-RELEASE",
            },
            set(producer_without_receipts["selectors"]["planes"]),
        )
        self.assertTrue(producer_without_receipts["selectors"]["jobs"]["app"])
        self.assertTrue(
            producer_without_receipts["selectors"]["jobs"]["browser_targeted"]
        )

    def test_pr68_shadow_selects_every_plane_and_browser_engine(self) -> None:
        paths = impact.git_changed_paths(ROOT, "65e22ac6", "c8e8fac3")
        roots = impact.compare_plane_root_receipts(
            self.profile,
            ROOT,
            "65e22ac6",
            "c8e8fac3",
        )
        plan = impact.build_impact_plan(
            self.profile,
            paths,
            changed_from="65e22ac6",
            changed_to="c8e8fac3",
            root_delta=roots,
        )
        self.assertFalse(plan["fail_closed"])
        self.assertTrue(roots["trusted"])
        self.assertEqual(
            {"control", "data", "presentation", "search", "semantic"},
            set(roots["changed_roles"]),
        )
        self.assertEqual(
            {"PLANE-CONTROL", "PLANE-DATA", "PLANE-SEARCH", "PLANE-SEMANTIC", "PLANE-PRESENTATION", "PLANE-RELEASE"},
            set(plan["selectors"]["planes"]),
        )
        self.assertTrue(plan["selectors"]["jobs"]["browser_full"])
        self.assertTrue(plan["full_shadow"]["enabled"])
        self.assert_valid_plan(plan)

    def test_pr69_shadow_keeps_producer_closure_despite_unchanged_roots(self) -> None:
        paths = impact.git_changed_paths(ROOT, "c8e8fac3", "0b5d748d")
        roots = impact.compare_plane_root_receipts(
            self.profile,
            ROOT,
            "c8e8fac3",
            "0b5d748d",
        )
        first = impact.build_impact_plan(
            self.profile,
            paths,
            changed_from="c8e8fac3",
            changed_to="0b5d748d",
            root_delta=roots,
        )
        second = impact.build_impact_plan(
            self.profile,
            reversed(paths),
            changed_from="c8e8fac3",
            changed_to="0b5d748d",
            root_delta=roots,
        )
        self.assertEqual(first, second)
        self.assertFalse(first["fail_closed"])
        self.assertEqual(["presentation"], roots["changed_roles"])
        self.assertGreaterEqual(
            set(roots["unchanged_roles"]),
            {"control", "data", "search", "semantic"},
        )
        self.assertEqual(
            {
                "PLANE-CONTROL",
                "PLANE-DATA",
                "PLANE-SEARCH",
                "PLANE-SEMANTIC",
                "PLANE-PRESENTATION",
                "PLANE-RELEASE",
            },
            set(first["selectors"]["planes"]),
        )
        self.assertFalse(first["selectors"]["jobs"]["browser_full"])
        self.assertTrue(first["selectors"]["jobs"]["app"])
        self.assertIn("data", first["selectors"]["builder_planes"])
        self.assertIn("search", first["selectors"]["builder_planes"])
        self.assertIn("semantic", first["selectors"]["builder_planes"])
        self.assert_valid_plan(first)

    def test_recorded_shadow_cases_are_executable_acceptance_evidence(self) -> None:
        cases = json.loads(SHADOW_CASES_PATH.read_text(encoding="utf-8"))["cases"]
        self.assertGreaterEqual(len(cases), 2)
        for case in cases:
            with self.subTest(case=case["id"]):
                roots = impact.compare_plane_root_receipts(
                    self.profile,
                    ROOT,
                    case["base_commit"],
                    case["head_commit"],
                )
                plan = impact.build_impact_plan(
                    self.profile,
                    impact.git_changed_paths(
                        ROOT,
                        case["base_commit"],
                        case["head_commit"],
                    ),
                    changed_from=case["base_commit"],
                    changed_to=case["head_commit"],
                    root_delta=roots,
                )
                expected = case["expected"]
                if "planes" in expected:
                    self.assertEqual(
                        set(expected["planes"]), set(plan["selectors"]["planes"])
                    )
                for key in ("app", "browser_full", "site", "release"):
                    if key in expected:
                        self.assertEqual(
                            expected[key],
                            plan["selectors"]["jobs"][key],
                            key,
                        )
                if "full_shadow_enabled" in expected:
                    self.assertEqual(
                        expected["full_shadow_enabled"],
                        plan["full_shadow"]["enabled"],
                    )
                self.assert_valid_plan(plan)

    def test_root_comparison_normalizes_v1_to_v2_receipts(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            repository = Path(directory)
            subprocess.run(["git", "init", "-q"], cwd=repository, check=True)
            subprocess.run(
                ["git", "config", "user.email", "impact@example.test"],
                cwd=repository,
                check=True,
            )
            subprocess.run(
                ["git", "config", "user.name", "Impact test"],
                cwd=repository,
                check=True,
            )
            for relative in self.profile["impact_policy"]["root_receipts"]:
                target = repository / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                planes = {}
                for index, role in enumerate(
                    ("control", "data", "search", "semantic", "presentation"),
                    start=1,
                ):
                    entries = [
                        {
                            "path": f"{role}.fixture",
                            "bytes": index,
                            "sha256": str(index) * 64,
                        }
                    ]
                    planes[role] = {
                        "entries": entries,
                        "files": 1,
                        "bytes": index,
                        "root_sha256": impact._receipt_root_sha256(
                            "okf-evaluation-plane-roots.v1", entries
                        ),
                    }
                release_basis = [
                    {
                        "plane": role,
                        "root_sha256": value["root_sha256"],
                    }
                    for role, value in sorted(planes.items())
                ]
                target.write_text(
                    json.dumps(
                        {
                            "schema": "okf-evaluation-plane-roots.v1",
                            "planes": planes,
                            "release_root_sha256": impact._receipt_root_sha256(
                                "okf-evaluation-plane-roots.v1", release_basis
                            ),
                        }
                    ),
                    encoding="utf-8",
                )
            subprocess.run(["git", "add", "."], cwd=repository, check=True)
            subprocess.run(["git", "commit", "-qm", "v1 roots"], cwd=repository, check=True)
            old = subprocess.run(
                ["git", "rev-parse", "HEAD"],
                cwd=repository,
                check=True,
                capture_output=True,
                text=True,
            ).stdout.strip()
            for relative in self.profile["impact_policy"]["root_receipts"]:
                target = repository / relative
                payload = json.loads(target.read_text(encoding="utf-8"))
                payload["schema"] = "okf-evaluation-plane-roots.v2"
                presentation = payload["planes"]["presentation"]
                presentation["entries"][0]["sha256"] = "b" * 64
                for value in payload["planes"].values():
                    value["root_sha256"] = impact._receipt_root_sha256(
                        "okf-evaluation-plane-roots.v2", value["entries"]
                    )
                    value["artifact_root_sha256"] = value["root_sha256"]
                payload["release_root_sha256"] = impact._receipt_root_sha256(
                    "okf-evaluation-plane-roots.v2",
                    [
                        {
                            "plane": role,
                            "root_sha256": value["root_sha256"],
                        }
                        for role, value in sorted(payload["planes"].items())
                    ]
                )
                target.write_text(json.dumps(payload), encoding="utf-8")
            subprocess.run(["git", "add", "."], cwd=repository, check=True)
            subprocess.run(["git", "commit", "-qm", "v2 roots"], cwd=repository, check=True)
            new = subprocess.run(
                ["git", "rev-parse", "HEAD"],
                cwd=repository,
                check=True,
                capture_output=True,
                text=True,
            ).stdout.strip()
            delta = impact.compare_plane_root_receipts(
                self.profile,
                repository,
                old,
                new,
            )
        self.assertTrue(delta["trusted"])
        self.assertEqual(["presentation"], delta["changed_roles"])
        self.assertTrue(delta["release_root_changed"])
        self.assertEqual(
            {("okf-evaluation-plane-roots.v1", "okf-evaluation-plane-roots.v2")},
            {(row["old_schema"], row["new_schema"]) for row in delta["receipts"]},
        )

    def test_explicit_selectors_are_validated_and_deterministic(self) -> None:
        plan = impact.build_impact_plan(
            self.profile,
            ["docs/heritage-evaluation-report.md"],
            planes=["presentation"],
            fixtures=["tiny"],
            test_tags=["markdown"],
            journey_groups=["reader"],
        )
        self.assertEqual(["PLANE-PRESENTATION"], plan["selectors"]["planes"])
        self.assertEqual(["presentation"], plan["selectors"]["builder_planes"])
        self.assertEqual(["tiny"], plan["selectors"]["builder_fixtures"])
        self.assertEqual(["markdown"], plan["selectors"]["test_tags"])
        self.assertEqual(["reader"], plan["selectors"]["journey_groups"])
        self.assert_valid_plan(plan)
        with self.assertRaises(impact.ImpactPlanError):
            impact.build_impact_plan(
                self.profile,
                ["docs/index.md"],
                planes=["not-a-plane"],
            )

    def test_mutated_contract_references_and_promotion_observations_fail(self) -> None:
        mutated = copy.deepcopy(self.profile)
        mutated["consumer_contract"]["dependency_graph"]["edges"][0]["to_node"] = "NODE-MISSING"
        mutated["impact_policy"]["path_rules"][0]["node_refs"] = ["NODE-MISSING"]
        errors = check_evaluation_foundry.evaluation_v2_contract_errors(
            mutated,
            PROFILE_PATH,
            PROFILE_PATH.parent,
            ROOT,
        )
        self.assertTrue(any("unknown to_node" in error for error in errors))
        self.assertTrue(any("unknown node 'NODE-MISSING'" in error for error in errors))

        mutation = copy.deepcopy(self.profile)
        mutation["consumer_contract"]["lock"]["sha256"] = "0" * 64
        errors = check_evaluation_foundry.evaluation_v2_contract_errors(
            mutation,
            PROFILE_PATH,
            PROFILE_PATH.parent,
            ROOT,
        )
        self.assertTrue(any("does not match" in error for error in errors))

        mutation = copy.deepcopy(self.profile)
        mutation["consumer_contract"]["compatibility"]["window_decision"][
            "supported_producer_contracts"
        ] = ["okf-explorer-large-corpus.v1"]
        errors = check_evaluation_foundry.evaluation_v2_contract_errors(
            mutation,
            PROFILE_PATH,
            PROFILE_PATH.parent,
            ROOT,
        )
        self.assertTrue(any("okf-evaluation-plane-roots.v2" in error for error in errors))

        mutation = copy.deepcopy(self.profile)
        mutation["consumer_contract"]["post_deploy_deep_links"][0][
            "url_template"
        ] = (
            "https://chris-page-gov.github.io/okf-explorer/"
            "?bundle=/evaluation/heritage/okf-explorer.json&view=graph"
        )
        errors = check_evaluation_foundry.evaluation_v2_contract_errors(
            mutation,
            PROFILE_PATH,
            PROFILE_PATH.parent,
            ROOT,
        )
        self.assertTrue(any("exact external candidate descriptor" in error for error in errors))

        mutation = copy.deepcopy(self.profile)
        mutation["promotion"]["observed_at"] = "2026-08-04T00:00:00Z"
        validator = check_evaluation_foundry.schema_validators()["profile_v2"]
        rendered = check_evaluation_foundry.rendered_schema_errors(
            "profile", mutation, validator
        )
        self.assertTrue(any("observed_at" in error for error in rendered))
        mutation = copy.deepcopy(self.profile)
        mutation["publication_assurance"] = {"status": "passed"}
        rendered = check_evaluation_foundry.rendered_schema_errors(
            "profile", mutation, validator
        )
        self.assertTrue(rendered)
        for forbidden, value in (
            ("status", "evaluated"),
            ("prepared_at", "2026-08-04T00:00:00Z"),
            ("observed_at", "2026-08-04T00:00:00Z"),
            ("deployment_status", "published"),
        ):
            with self.subTest(forbidden=forbidden):
                mutation = copy.deepcopy(self.profile)
                mutation[forbidden] = value
                rendered = check_evaluation_foundry.rendered_schema_errors(
                    "profile", mutation, validator
                )
                self.assertTrue(rendered)

    def test_cli_writes_schema_valid_plan_and_github_outputs(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "impact-plan.json"
            github_output = Path(directory) / "github-output.txt"
            result = subprocess.run(
                [
                    sys.executable,
                    str(ROOT / "scripts" / "plan_evaluation_foundry_impact.py"),
                    "--changed-path",
                    "docs/index.md",
                    "--output",
                    str(output),
                    "--github-output",
                    str(github_output),
                    "--explain",
                ],
                cwd=ROOT,
                check=False,
                capture_output=True,
                text=True,
            )
            self.assertEqual(0, result.returncode, result.stderr)
            plan = json.loads(output.read_text(encoding="utf-8"))
            self.assert_valid_plan(plan)
            values = github_output.read_text(encoding="utf-8")
            for key in (
                "impact_plan=",
                "planes=",
                "builder_planes=",
                "fixtures=",
                "builder_fixtures=",
                "python=",
                "browser_full=",
            ):
                self.assertIn(key, values)
            self.assertIn("IMPACT-PRESENTATION", result.stderr)

    def test_external_promotion_envelope_is_valid_but_not_terminal(self) -> None:
        envelope = check_evaluation_foundry.load_document(ENVELOPE_PATH)
        self.assertEqual(
            [],
            check_promotion_envelope.validate_envelope(
                envelope,
                envelope_path=ENVELOPE_PATH,
                repository_root=ROOT,
            ),
        )
        errors = check_promotion_envelope.validate_envelope(
            envelope,
            envelope_path=ENVELOPE_PATH,
            repository_root=ROOT,
            require_promoted=True,
        )
        self.assertTrue(any("state='promoted'" in error for error in errors))
        self.assertTrue(any("pending value" in error for error in errors))

        with tempfile.TemporaryDirectory() as directory:
            candidate = Path(directory)
            inside = candidate / "promotion-envelope.json"
            inside.write_text(json.dumps(envelope), encoding="utf-8")
            errors = check_promotion_envelope.validate_envelope(
                envelope,
                envelope_path=inside,
                repository_root=ROOT,
                publication_root=candidate,
            )
        self.assertTrue(any("outside" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
