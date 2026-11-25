from __future__ import annotations

import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import build_walkthrough_register as register
import okf_publication


class WalkthroughRegisterTests(unittest.TestCase):
    def fixture(self, change=None, descriptor_change=None):
        source = copy.deepcopy(register.load())
        denominator = json.loads((ROOT / register.DENOMINATOR).read_text())
        if change:
            change(source, denominator)
        temporary = tempfile.TemporaryDirectory()
        root = Path(temporary.name)
        for relative in (register.SOURCE, register.DENOMINATOR, register.ACCESS_DIRECTORY):
            target = root / relative
            target.parent.mkdir(parents=True, exist_ok=True)
        (root / register.SOURCE).write_text(json.dumps(source), encoding="utf-8")
        (root / register.DENOMINATOR).write_text(json.dumps(denominator), encoding="utf-8")
        (root / register.ACCESS_DIRECTORY).write_bytes((ROOT / register.ACCESS_DIRECTORY).read_bytes())
        reader_path = root / "apps/okf-explorer/package.json"
        reader_path.parent.mkdir(parents=True, exist_ok=True)
        reader_path.symlink_to(ROOT / "apps/okf-explorer/package.json")
        evidence_dir = root / "registry/walkthrough-register/evidence/descriptors"
        evidence_dir.mkdir(parents=True, exist_ok=True)
        for original in (ROOT / "registry/walkthrough-register/evidence/descriptors").glob("*.json"):
            (evidence_dir / original.name).symlink_to(original)
        for walk in source.get("review_walkthroughs", []):
            if walk.get("version_evidence_path"):
                original = ROOT / walk["version_evidence_path"]
                target = root / walk["version_evidence_path"]
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(original.read_bytes())
            proof_summary = walk["retained_proof"].get("receipt_summary_path")
            receipt_records = [walk["retained_proof"], *walk.get("historical_proofs", []), *walk.get("supporting_receipts", [])]
            for receipt in receipt_records:
                proof_summary = receipt.get("receipt_summary_path")
                if proof_summary:
                    original = ROOT / proof_summary
                    target = root / proof_summary
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_bytes(original.read_bytes())
            current = walk.get("current_page_observation")
            if current:
                original = ROOT / current["evidence_path"]
                target = root / current["evidence_path"]
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(original.read_bytes())
            original = ROOT / walk["source_evidence_path"]
            target = root / walk["source_evidence_path"]
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(original.read_bytes())
            if walk.get("guide_evidence_path"):
                original = ROOT / walk["guide_evidence_path"]
                target = root / walk["guide_evidence_path"]
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(original.read_bytes())
        for walk in source.get("walkthroughs", []):
            for key in ("data_path", "authored_path", "case_path", "html_path", "diagram_path"):
                original = ROOT / walk[key]
                target = root / walk[key]
                target.parent.mkdir(parents=True, exist_ok=True)
                target.symlink_to(original)
            packet = json.loads((ROOT / walk["data_path"]).read_text(encoding="utf-8"))
            data_root = Path(walk["data_path"]).parent
            for relative in (packet["graph"], packet["descriptor"]):
                target = root / data_root / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                target.symlink_to(ROOT / data_root / relative)
            for citation in packet["source_documents"]:
                target = root / citation["route"]
                target.parent.mkdir(parents=True, exist_ok=True)
                target.symlink_to(ROOT / citation["route"])
        if descriptor_change:
            desc = next(d for d in source["public_bundle_descriptor_observations"] if d["repository"].endswith("/okf-els-api"))
            target = root / desc["descriptor_evidence_path"]
            target.unlink()
            raw = bytearray((ROOT / desc["descriptor_evidence_path"]).read_bytes())
            raw[-1] ^= 1
            target.write_bytes(raw)
        return temporary, root, source

    def test_captured_real_descriptors_preserve_core_and_identity_versions(self):
        source = register.load()
        by_repo = {d["repository"].rsplit("/", 1)[-1].lower(): d for d in source["public_bundle_descriptor_observations"]}
        els = by_repo["okf-els-api"]
        self.assertEqual(els["identity_field"], "@id")
        self.assertTrue(els["descriptor_identity"].endswith("/okf-explorer.json"))
        self.assertEqual(els["okf_version"], "0.2")
        self.assertEqual(by_repo["okf-ai-infrastructure"]["okf_version"], "0.3")
        self.assertNotEqual(source["shared_reader_release"]["version"], "0.3")
        self.assertFalse(source["shared_reader_release"]["is_okf_core_version"])

    def test_denominator_rejects_omission_surplus_and_duplicate_roots(self):
        for mutation in ("omit", "surplus", "duplicate"):
            def change(source, _denominator):
                row = copy.deepcopy(source["roots"][0])
                if mutation == "omit":
                    source["roots"].pop()
                elif mutation == "surplus":
                    row["root_path"] = "unrecorded-root"
                    source["roots"].append(row)
                else:
                    source["roots"].append(row)
            with self.subTest(mutation=mutation):
                temporary, root, _ = self.fixture(change)
                with temporary, self.assertRaisesRegex(ValueError, "public root|duplicate|register roots"):
                    register.load(root)

    def test_forged_or_omitted_current_version_is_rejected(self):
        for field, value in (("okf_version", "0.3"), ("okf_version", None)):
            def change(source, _denominator):
                row = next(d for d in source["public_bundle_descriptor_observations"] if d["repository"].endswith("/okf-els-api"))
                row[field] = value
            temporary, root, _ = self.fixture(change)
            with temporary, self.assertRaisesRegex(ValueError, "captured descriptor fields"):
                register.load(root)

    def test_tampered_capture_and_stale_walkthrough_digest_are_rejected(self):
        temporary, root, _ = self.fixture(descriptor_change=True)
        with temporary, self.assertRaisesRegex(ValueError, "descriptor bytes or digest"):
            register.load(root)
        def change(source, _denominator):
            source["walkthroughs"][0]["html_path_sha256"] = "0" * 64
        temporary, root, _ = self.fixture(change)
        with temporary, self.assertRaisesRegex(ValueError, "walkthrough evidence digest"):
            register.load(root)

    def test_unsafe_paths_urls_and_unknown_alias_targets_are_rejected(self):
        cases = [
            lambda s, d: s["roots"][0].update(root_path="../secret"),
            lambda s, d: s["walkthroughs"][0].update(guide_url="https://example.invalid/guide"),
            lambda s, d: s["roots"][0].update(alias_targets=[{"repository": "other/private", "root_path": "."}]),
        ]
        for change in cases:
            temporary, root, _ = self.fixture(change)
            with temporary, self.assertRaises(ValueError):
                register.load(root)

    def test_alias_and_private_path_mutations_are_rejected(self):
        changes = [
            lambda s, d: s["roots"][next(i for i, r in enumerate(s["roots"]) if r.get("alias_targets"))].pop("alias_targets"),
            lambda s, d: s["scope"].update(basis="capture from /Users/private/inventory.json"),
        ]
        for change in changes:
            temporary, root, _ = self.fixture(change)
            with temporary, self.assertRaises(ValueError):
                register.load(root)

    def test_render_keeps_alias_history_pending_roots_and_source_bound_walkthrough(self):
        source = register.load()
        output = register.render(source)
        md = output[Path("docs/walkthrough-register.md")]
        machine = json.loads(output[Path("registry/walkthrough-register.json")])
        self.assertEqual(len(machine["roots"]), 76)
        self.assertTrue(any(r["root_path"] == "baseline" and any(
            e["value"] == "0.2" for o in r["observations"] for e in o["core_version_evidence"]
        ) for r in machine["roots"]))
        self.assertIn("alias_targets", next(r for r in machine["roots"] if r["root_path"] == "reference-bundle"))
        self.assertIn("pending", md)
        self.assertIn("0.9.2", md)
        self.assertNotIn("/Users/", output[Path("registry/walkthrough-register.json")])
        self.assertNotIn("/Volumes/", output[Path("registry/walkthrough-register.json")])

    def test_register_build_and_check_are_declared_in_publication_contract(self):
        contract = okf_publication.load_publication_contract(ROOT)
        commands = {row["id"]: row for row in contract["tooling"]["commands"]}
        self.assertEqual(commands["build-walkthrough-register"]["command"],
                         "uv run --locked python scripts/build_walkthrough_register.py")
        self.assertEqual(commands["check-walkthrough-register"]["command"],
                         "uv run --locked python scripts/build_walkthrough_register.py --check")

    def test_public_walkthrough_coverage_and_captured_sources_are_exact(self):
        source = register.load()
        self.assertEqual(len(source["review_walkthroughs"]), 26)
        self.assertEqual(source["scope"]["public_walkthrough_count"], 27)
        self.assertEqual(source["scope"]["review_walkthrough_count"], 26)
        self.assertEqual(source["scope"]["reference_walkthrough_count"], 1)
        self.assertEqual(len(source["repository_visibility_observations"]), 24)
        rows = {row["id"]: row for row in source["review_walkthroughs"]}
        self.assertIn("0.2", [row["okf_version"] for row in source["public_bundle_descriptor_observations"]])
        self.assertEqual(rows["hansard-week-core"]["current_page_checked"], True)
        self.assertEqual(rows["hansard-november-core"]["current_page_observation"]["http_status"], 404)
        self.assertEqual(rows["capgov-site-archive"]["okf_core_version"], "0.3")
        self.assertEqual(rows["capgov-site-archive"]["producer_product_version"], "0.1.0")
        self.assertEqual(rows["xgov-core-notifications"]["okf_core_version"], "0.3")
        self.assertEqual(rows["xgov-core-notifications"]["producer_product_version"], "0.6.0")
        self.assertEqual(rows["early-years-control"]["okf_core_version"], "0.2")
        self.assertEqual(rows["early-years-domain"]["okf_core_version"], "0.3")
        self.assertEqual(rows["ons-core-scope-freshness-conformance"]["retained_proof"]["status"], "passed")
        self.assertEqual(rows["ons-core-scope-freshness-conformance"]["retained_proof"]["producer_product_version"], "0.3.1")
        self.assertEqual(rows["ons-core-scope-freshness-conformance"]["historical_proofs"][0]["status"], "failed")
        self.assertEqual(rows["early-years-core"]["retained_proof"]["status"], "passed")
        self.assertEqual(len(rows["early-years-core"]["supporting_receipts"]), 4)
        self.assertIsNone(rows["explorer-profile-prov"]["okf_core_version"])
        self.assertEqual(rows["explorer-profile-prov"]["profile_version"], "v1")
        output = register.render(source)
        machine = json.loads(output[Path("registry/walkthrough-register.json")])
        md = output[Path("docs/walkthrough-register.md")]
        self.assertEqual(len(machine["review_walkthroughs"]), 26)
        for row in rows.values():
            self.assertIn(row["title"], md)
            self.assertIn(row["guide_url"], md)
            self.assertEqual(row["current_page_checked"], row.get("current_page_observation") is not None)

    def test_walkthrough_manifest_omission_surplus_duplicates_and_version_forgery_fail(self):
        mutations = [
            lambda s: s["review_walkthroughs"].pop(),
            lambda s: s["review_walkthroughs"].append(copy.deepcopy(s["review_walkthroughs"][0]) | {"id": "unexpected"}),
            lambda s: s["review_walkthroughs"].append(copy.deepcopy(s["review_walkthroughs"][0])),
            lambda s: next(w for w in s["review_walkthroughs"] if w["id"] == "ai-infrastructure-federated-rag").update(okf_core_version="0.2"),
            lambda s: next(w for w in s["review_walkthroughs"] if w["id"] == "ai-infrastructure-federated-rag").update(okf_core_version=None),
            lambda s: next(w for w in s["review_walkthroughs"] if w["id"] == "ai-infrastructure-federated-rag").update(producer_product_version=None),
            lambda s: next(w for w in s["review_walkthroughs"] if w["id"] == "ai-infrastructure-federated-rag").update(descriptor_identity_field=None),
            lambda s: next(w for w in s["review_walkthroughs"] if w["id"] == "ai-infrastructure-federated-rag").update(descriptor_identity_field="@id"),
            lambda s: next(w for w in s["review_walkthroughs"] if w["id"] == "ai-infrastructure-federated-rag").update(descriptor_identity="https://example.invalid/forged"),
            lambda s: next(w for w in s["review_walkthroughs"] if w["id"] == "hansard-november-full").update(bundle_identity="https://example.invalid/forged"),
            lambda s: next(w for w in s["review_walkthroughs"] if w["id"] == "ai-infrastructure-federated-rag").update(descriptor_url="https://chris-page-gov.github.io/okf-ai-infrastructure/other-bundle.json"),
            lambda s: next(w for w in s["review_walkthroughs"] if w["id"] == "ons-population-by-age")["supplemental_descriptors"][0].update(identity="https://example.invalid/forged"),
            lambda s: next(w for w in s["review_walkthroughs"] if w["id"] == "ai-infrastructure-federated-rag").update(question="A different question."),
            lambda s: next(w for w in s["review_walkthroughs"] if w["id"] == "explorer-profile-prov").update(profile_version="v2"),
            lambda s: next(w for w in s["review_walkthroughs"] if w["id"] == "explorer-profile-prov").update(bundle_identity="https://example.invalid/forged"),
            lambda s: next(w for w in s["review_walkthroughs"] if w["id"] == "hansard-november-core")["current_page_observation"].update(http_status=403),
            lambda s: next(w for w in s["review_walkthroughs"] if w["id"] == "capgov-site-archive").update(descriptor_url="https://chris-page-gov.github.io/okf-ai-capability-governance/bundle/okf-explorer.json"),
        ]
        for mutate in mutations:
            def change(source, _denominator, mutate=mutate): mutate(source)
            temporary, root, _ = self.fixture(change)
            with temporary, self.assertRaises(ValueError):
                register.load(root)

    def test_walkthrough_source_tampering_visibility_and_unsafe_link_fail(self):
        temporary, root, source = self.fixture()
        captured = root / source["review_walkthroughs"][0]["source_evidence_path"]
        captured.write_bytes(captured.read_bytes() + b" ")
        with temporary, self.assertRaisesRegex(ValueError, "captured walkthrough source bytes"):
            register.load(root)
        temporary, root, source = self.fixture()
        walk = next(row for row in source["review_walkthroughs"] if row.get("guide_evidence_path"))
        guide = root / walk["guide_evidence_path"]
        guide.write_bytes(guide.read_bytes() + b" ")
        with temporary, self.assertRaisesRegex(ValueError, "captured walkthrough guide bytes"):
            register.load(root)
        for change in (
            lambda s, d: s["repository_visibility_observations"][0].update(status="private"),
            lambda s, d: s["review_walkthroughs"][0].update(guide_url="https://example.invalid/guide"),
        ):
            temporary, root, _ = self.fixture(change)
            with temporary, self.assertRaises(ValueError):
                register.load(root)

    def test_reference_omission_and_incorrect_total_are_rejected(self):
        for change in (
            lambda s, d: s.update(walkthroughs=[]),
            lambda s, d: s["scope"].update(public_walkthrough_count=26),
        ):
            temporary, root, _ = self.fixture(change)
            with temporary, self.assertRaisesRegex(ValueError, "public walkthrough total"):
                register.load(root)

    def test_reference_publication_links_resolve_to_the_canonical_guide_and_pinned_source(self):
        source = register.load()
        md = register.render(source)[Path("docs/walkthrough-register.md")]
        self.assertIn("[Machine-readable register](../registry/walkthrough-register.json)", md)
        self.assertNotIn("[Question source](../walkthrough.md)", md)
        self.assertNotIn("<details>", md)
        self.assertLess(md.index("## Reviewed public walkthroughs"), md.index("## Current public descriptor observations"))
        for change in (
            lambda s, d: s["walkthroughs"][0].update(guide_url="https://chris-page-gov.github.io/okf-explorer/walkthrough.html"),
            lambda s, d: s["walkthroughs"][0].update(authored_source_url="https://github.com/chris-page-gov/okf-explorer/blob/main/walkthrough.md"),
        ):
            temporary, root, _ = self.fixture(change)
            with temporary, self.assertRaisesRegex(ValueError, "reference"):
                register.load(root)

    def test_retained_receipt_status_date_and_current_http_are_evidence_bound(self):
        mutations = [
            lambda s, d: next(w for w in s["review_walkthroughs"] if w["id"] == "ons-core-scope-freshness-conformance")["retained_proof"].update(status="failed"),
            lambda s, d: next(w for w in s["review_walkthroughs"] if w["id"] == "planning-design-code-policy-discovery")["retained_proof"].update(observed_at="2026-11-25T00:00:00Z"),
            lambda s, d: next(w for w in s["review_walkthroughs"] if w["id"] == "hansard-november-core")["current_page_observation"].update(http_status=200),
            lambda s, d: next(w for w in s["review_walkthroughs"] if w["id"] == "hansard-november-core")["current_page_observation"].update(receipt_sha256="0" * 64),
        ]
        for change in mutations:
            temporary, root, _ = self.fixture(change)
            with temporary, self.assertRaises(ValueError):
                register.load(root)


if __name__ == "__main__":
    unittest.main()
