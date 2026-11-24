from __future__ import annotations

import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import okf_skill as guard  # noqa: E402
import install_okf_skills as installation  # noqa: E402


class SkillEnforcementTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="okf-guard-test-")
        self.addCleanup(self.temporary.cleanup)
        self.work = Path(self.temporary.name).resolve()
        self.bundle = self.work / "source"
        self.bundle.mkdir()
        (self.bundle / "index.md").write_text('---\nokf_version: "0.3"\n---\n# Example\n')
        (self.bundle / "concept.md").write_text('---\ntype: Reference\ntitle: Example\n---\nEvidence.\n')

    def snapshot(self):
        target = self.work / "snapshot"
        target.mkdir()
        return target, guard.make_snapshot(self.bundle, target)

    def test_reviewed_package_and_runtime(self):
        guard.verify_runtime()
        self.assertEqual("1.0.0", guard.verify_package()["version"])

    def test_a_different_python_environment_is_rejected(self):
        with mock.patch.object(guard.sys, "prefix", "/unreviewed/environment"):
            with self.assertRaisesRegex(guard.GuardError, "governed CPython"):
                guard.verify_runtime()

    def test_vulnerable_uv_is_rejected_before_lock_check(self):
        result = subprocess.CompletedProcess([], 0, "uv 0.12.2\n", "")
        with mock.patch.object(guard.subprocess, "run", return_value=result) as run:
            with self.assertRaisesRegex(guard.GuardError, "uv version"):
                guard.verify_runtime()
        self.assertEqual(1, run.call_count)

    def test_stale_lock_is_rejected(self):
        def run(args, **kwargs):
            if args[1:] == ["--version"]:
                return subprocess.CompletedProcess(args, 0, "uv 0.13.4\n", "")
            return subprocess.CompletedProcess(args, 1, "", "lock is stale")
        with mock.patch.object(guard.subprocess, "run", side_effect=run):
            with self.assertRaisesRegex(guard.GuardError, "locked environment is stale"):
                guard.verify_runtime()

    def test_tampered_helper_or_unlisted_file_is_rejected(self):
        package = self.work / "package"
        shutil.copytree(guard.PACKAGE, package)
        helper = package / guard.HELPERS["scan"]
        original = helper.read_bytes()
        helper.write_bytes(original + b'\nprint("changed")\n')
        with self.assertRaisesRegex(guard.GuardError, "digest mismatch"):
            guard.verify_package(package)
        helper.write_bytes(original)
        (package / "unreviewed.py").write_text('raise RuntimeError("unreviewed")')
        with self.assertRaisesRegex(guard.GuardError, "inventory differs"):
            guard.verify_package(package)

    def test_unlisted_unguarded_entrypoint_is_rejected(self):
        package = self.work / "package"
        shutil.copytree(guard.PACKAGE, package)
        (package / "skills/okf-plus-consume/upstream/SKILL.md").write_text("unguarded")
        with self.assertRaises(guard.GuardError):
            guard.verify_package(package)

    def test_symlinked_input_is_rejected_before_reading(self):
        secret = self.work / "secret.md"
        secret.write_text("private host content")
        (self.bundle / "escape.md").symlink_to(secret)
        with self.assertRaisesRegex(guard.GuardError, "symlink"):
            self.snapshot()

    def test_symlinked_root_index_is_rejected(self):
        (self.bundle / "index.md").unlink()
        (self.bundle / "index.md").symlink_to(ROOT / "index.md")
        with self.assertRaisesRegex(guard.GuardError, "symlink"):
            self.snapshot()

    def test_special_input_is_rejected_without_blocking(self):
        os.mkfifo(self.bundle / "blocked.md")
        with self.assertRaisesRegex(guard.GuardError, "special input"):
            self.snapshot()

    def test_unreadable_directory_is_not_silently_omitted(self):
        directory = self.bundle / "unreadable"
        directory.mkdir()
        (directory / "hidden-by-permissions.md").write_text("uninspected")
        directory.chmod(0)
        try:
            with self.assertRaisesRegex(guard.GuardError, "cannot inspect bundle"):
                self.snapshot()
        finally:
            directory.chmod(0o700)

    def test_byte_and_entry_limits_fail_closed(self):
        with mock.patch.object(guard, "MAX_DOCUMENT_BYTES", 4):
            with self.assertRaisesRegex(guard.GuardError, "byte limit"):
                self.snapshot()
        (self.work / "snapshot").rmdir()
        with mock.patch.object(guard, "MAX_FILES", 1):
            with self.assertRaisesRegex(guard.GuardError, "entry budget"):
                self.snapshot()

    def test_nested_bundle_and_hidden_paths_are_separate(self):
        nested = self.bundle / "nested"
        nested.mkdir()
        (nested / "index.md").write_text('---\nokf_version: "0.2"\n---\n')
        (nested / "foreign.md").write_text('---\ntype: Other\n---\n')
        hidden = self.bundle / ".private"
        hidden.mkdir()
        (hidden / "private.md").write_text("private")
        target, report = self.snapshot()
        self.assertEqual(["nested"], report["excluded_nested_roots"])
        self.assertFalse((target / "nested").exists())
        self.assertFalse((target / ".private").exists())
        self.assertEqual({"index.md", "concept.md"}, set(report["markdown_sha256"]))

    def test_executor_assets_are_never_copied_as_executable_content(self):
        (self.bundle / "executor.py").write_text('raise RuntimeError("must not execute")')
        target, report = self.snapshot()
        self.assertEqual(b"", (target / "executor.py").read_bytes())
        self.assertEqual("not-read", report["asset_contents"])

    def test_cli_has_no_executor_or_arbitrary_command_option(self):
        for arguments in (("execute",), ("scan", "--executor", "/bin/sh")):
            result = subprocess.run([sys.executable, "-I", str(ROOT / "scripts/okf_skill.py"),
                                     *arguments], capture_output=True, text=True)
            self.assertEqual(2, result.returncode)

    def test_unavailable_sandbox_is_not_bypassed(self):
        target, _ = self.snapshot()
        with mock.patch.object(guard.sys, "platform", "unsupported"):
            with self.assertRaisesRegex(guard.GuardError, "no supported"):
                guard.run_isolated([sys.executable, "-c", "print(1)"], target, self.work)

    @unittest.skipUnless(os.environ.get("OKF_SKILL_SANDBOX_ACCEPTANCE") == "1",
                         "live sandbox checks run in the required skill-enforcement job")
    def test_sandbox_denies_host_read_bundle_write_network_and_shell(self):
        target, _ = self.snapshot()
        secret = self.work / "outside-secret"
        secret.write_text("private")
        listener = socket.socket()
        self.addCleanup(listener.close)
        listener.bind(("127.0.0.1", 0))
        listener.listen(1)
        code = '''import json,pathlib,socket,subprocess,sys
checks={}
for name,action in (
 ("host_read",lambda:pathlib.Path(sys.argv[1]).read_text()),
 ("bundle_write",lambda:pathlib.Path(sys.argv[2]).write_text("changed")),
 ("network",lambda:socket.create_connection(("127.0.0.1",int(sys.argv[3])),timeout=1)),
 ("shell",lambda:subprocess.run(["/bin/sh","-c","exit 0"],check=True))):
 try: action();checks[name]="allowed"
 except (OSError,subprocess.SubprocessError): checks[name]="denied"
print(json.dumps(checks))
'''
        _, result = guard.run_isolated([sys.executable, "-I", "-B", "-c", code,
            str(secret), str(target / "concept.md"), str(listener.getsockname()[1])], target, self.work)
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertEqual(dict.fromkeys(("host_read", "bundle_write", "network", "shell"),
                                       "denied"), json.loads(result.stdout))

    @unittest.skipUnless(os.environ.get("OKF_SKILL_SANDBOX_ACCEPTANCE") == "1",
                         "live sandbox checks run in the required skill-enforcement job")
    def test_end_to_end_helpers_keep_sources_unchanged(self):
        before = {p.name: p.read_bytes() for p in self.bundle.iterdir()}
        for operation in ("scan", "validate"):
            result = subprocess.run([sys.executable, "-I", str(ROOT / "scripts/okf_skill.py"),
                operation, "--bundle", str(self.bundle), "--now", "2026-11-23T00:00:00Z"],
                capture_output=True, text=True, timeout=40)
            self.assertEqual(0, result.returncode, result.stderr)
            report = json.loads(result.stdout)
            self.assertIn(report["sandbox"], ("macos-sandbox-exec", "linux-bubblewrap"))
            if operation == "scan":
                self.assertEqual(1, report["report"]["summary"]["concepts"])
            else:
                self.assertEqual(0, report["report"]["errors"])
        self.assertEqual(before, {p.name: p.read_bytes() for p in self.bundle.iterdir()})

    def test_installation_detects_drift_and_preserves_replaced_skills(self):
        destination = self.work / "skills"
        manifest = guard.verify_package()
        installation.install(destination, manifest)
        installation.check_installed(destination, manifest)
        entry = destination / "okf-plus-consume/SKILL.md"
        entry.write_text(entry.read_text() + "\nLocal change.\n")
        with self.assertRaisesRegex(guard.GuardError, "digest mismatch"):
            installation.check_installed(destination, manifest)
        with self.assertRaisesRegex(guard.GuardError, "explicit --replace"):
            installation.install(destination, manifest)
        result = installation.install(destination, manifest, replace=True)
        installation.check_installed(destination, manifest)
        self.assertIn("Local change.", (Path(result["backup"]) / "okf-plus-consume/SKILL.md").read_text())

    def test_staging_failure_does_not_change_existing_installation(self):
        destination = self.work / "skills"
        manifest = guard.verify_package()
        installation.install(destination, manifest)
        before = (destination / "okf-plus-consume/SKILL.md").read_bytes()
        with mock.patch.object(installation.shutil, "copytree", side_effect=OSError("disk full")):
            with self.assertRaisesRegex(OSError, "disk full"):
                installation.install(destination, manifest, replace=True)
        self.assertEqual(before, (destination / "okf-plus-consume/SKILL.md").read_bytes())

    def test_required_ci_job_cannot_be_skipped_or_report_failure(self):
        import shlex
        from ruamel.yaml import YAML
        workflow = YAML(typ="safe").load((ROOT / ".github/workflows/okf-explorer-ci.yml").read_text())
        job = workflow["jobs"]["skill-enforcement"]
        self.assertNotIn("if", job)
        self.assertEqual("1", str(job["env"]["OKF_SKILL_SANDBOX_ACCEPTANCE"]))
        self.assertIn("skill-enforcement", workflow["jobs"]["okf-explorer-ci"]["needs"])
        command = workflow["jobs"]["okf-explorer-ci"]["steps"][-1]["run"]
        code = shlex.split(command)[-1]
        for status in ("success", "skipped", "failure", "cancelled", None):
            results = {} if status is None else {"skill-enforcement": {"result": status}}
            result = subprocess.run([sys.executable, "-I", "-c", code],
                env={**os.environ, "RESULTS": json.dumps(results)}, capture_output=True)
            self.assertEqual(0 if status == "success" else 1, result.returncode, result.stderr)


if __name__ == "__main__":
    unittest.main()
