from __future__ import annotations

import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "check_release_evidence_compatibility.py"
sys.path.insert(0, str(ROOT / "scripts"))

import check_release_evidence_compatibility as compatibility  # noqa: E402


class ReleaseEvidenceCompatibilityTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.schemas = self.root / "schemas"
        self.schemas.mkdir()
        self.schema_path = self.schemas / "scan-manifest.schema.json"
        self.write_schema({
            "properties": {"scan": {"properties": {"target": {"required": ["kind", "remote"]}}}}
        })
        self.profile_path = self.root / "profile.json"
        self.profile = {
            "schema": compatibility.PROFILE_SCHEMA,
            "producer": {"name": "fixture", "version": "1"},
            "schemas": [{
                "filename": self.schema_path.name,
                "sha256": hashlib.sha256(self.schema_path.read_bytes()).hexdigest(),
                "required_schema_values": [{
                    "pointer": "/properties/scan/properties/target/required",
                    "contains": ["remote"],
                }],
            }],
            "manifest_expectations": {
                "required_paths": ["/scan/id", "/scan/status", "/scan/sealedAt", "/scan/target/remote"],
                "equals": {"/scan/status": "completed"},
                "required_non_empty": ["/scan/sealedAt"],
                "artifacts_pointer": "/scan/artifacts",
                "required_artifact_paths": ["findings.json"],
            },
        }
        self.write_profile()

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def write_schema(self, value: dict) -> None:
        self.schema_path.write_text(json.dumps(value), encoding="utf-8")

    def write_profile(self) -> None:
        self.profile_path.write_text(json.dumps(self.profile), encoding="utf-8")

    def run_check(self, *args: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(SCRIPT), "--profile", str(self.profile_path),
             "--schema-dir", str(self.schemas), *args],
            capture_output=True, text=True, check=False,
        )

    def test_completed_status_without_seal_or_bound_target_is_rejected(self) -> None:
        manifest = self.root / "partial.json"
        manifest.write_text(json.dumps({"scan": {"id": "scan-1", "status": "completed"}}), encoding="utf-8")
        result = compatibility.check_manifest(self.profile, manifest, None)
        self.assertTrue(any("sealedAt" in error for error in result))
        self.assertTrue(any("target/remote" in error for error in result))

    def test_changed_pinned_schema_is_rejected(self) -> None:
        self.write_schema({"type": "object"})
        errors = compatibility.check_schemas(self.profile, self.schemas)
        self.assertTrue(any("SHA-256 differs" in error for error in errors))

    def test_optional_producer_field_does_not_satisfy_consumer_requirement(self) -> None:
        self.write_schema({
            "properties": {"scan": {"properties": {"target": {
                "properties": {"remote": {"type": "string"}},
                "required": ["kind"],
            }}}}
        })
        self.profile["schemas"][0]["sha256"] = hashlib.sha256(self.schema_path.read_bytes()).hexdigest()
        errors = compatibility.check_schemas(self.profile, self.schemas)
        self.assertTrue(any("does not guarantee" in error for error in errors))

    def test_unknown_expectation_key_is_rejected(self) -> None:
        self.profile["manifest_expectations"]["completed_status"] = "completed"
        self.write_profile()
        with self.assertRaisesRegex(compatibility.CompatibilityError, "unknown manifest expectation"):
            compatibility.load_profile(self.profile_path)

    def test_synthetic_fixture_can_only_pass_format_compatibility(self) -> None:
        manifest = self.root / "synthetic.json"
        findings = self.root / "findings.json"
        findings.write_text('{"findings":[]}', encoding="utf-8")
        manifest.write_text(json.dumps({
            "scan": {
                "id": "synthetic-test-scan",
                "producer": {"name": "fixture", "version": "1"},
                "status": "completed",
                "sealedAt": "2026-11-27T12:00:00Z",
                "target": {"remote": "https://example.invalid/repo"},
                "artifacts": [{
                    "path": "findings.json",
                    "sha256": hashlib.sha256(findings.read_bytes()).hexdigest(),
                }],
            }
        }), encoding="utf-8")
        completed = self.run_check("--manifest", str(manifest))
        result = json.loads(completed.stdout)
        self.assertEqual(0, completed.returncode)
        self.assertEqual("compatible", result["compatibility"])
        self.assertEqual("not-assessed", result["release_readiness"])

    def test_changed_sealed_artifact_is_rejected(self) -> None:
        scan_dir = self.root / "scan"
        scan_dir.mkdir()
        artifact = scan_dir / "findings.json"
        artifact.write_text('{"findings":[]}', encoding="utf-8")
        manifest = scan_dir / "scan-manifest.json"
        manifest.write_text(json.dumps({"scan": {
            "id": "scan-1",
            "producer": {"name": "fixture", "version": "1"},
            "status": "completed",
            "sealedAt": "2026-11-27T12:00:00Z",
            "target": {"remote": "https://example.invalid/repo"},
            "artifacts": [{"path": "findings.json", "sha256": hashlib.sha256(artifact.read_bytes()).hexdigest()}],
        }}), encoding="utf-8")
        artifact.write_text('{"findings":["changed"]}', encoding="utf-8")
        errors = compatibility.check_manifest(self.profile, manifest, None)
        self.assertIn("producer artifact changed after sealing: findings.json", errors)

    def test_null_artifact_inventory_is_rejected(self) -> None:
        manifest = self.root / "null-inventory.json"
        manifest.write_text(json.dumps({"scan": {"artifacts": None}}), encoding="utf-8")
        errors = compatibility.check_manifest(self.profile, manifest, None)
        self.assertIn("producer artifact inventory must be a non-null array", errors)


if __name__ == "__main__":
    unittest.main()
