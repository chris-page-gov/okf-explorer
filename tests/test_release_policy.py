from __future__ import annotations

import hashlib
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import check_release_policy  # noqa: E402


class ReleasePolicyTests(unittest.TestCase):
    def result(self, stdout: str = "", stderr: str = "", code: int = 0):
        return subprocess.CompletedProcess([], code, stdout, stderr)

    def test_annotated_tag_accepts_a_verified_signature(self) -> None:
        responses = iter(
            [
                self.result("tag\n"),
                self.result(stderr="good signature"),
                self.result("a" * 40 + "\n"),
            ]
        )
        with mock.patch.object(
            check_release_policy,
            "run_git",
            side_effect=lambda *_args: next(responses),
        ):
            identity = check_release_policy.validate_annotated_tag(
                "v1.0.0",
                attested_envelope=False,
            )
        self.assertEqual("verified", identity["signature"])

        with mock.patch.object(
            check_release_policy,
            "run_git",
            return_value=self.result("commit\n"),
        ):
            with self.assertRaisesRegex(RuntimeError, "annotated"):
                check_release_policy.validate_annotated_tag(
                    "v1.0.0",
                    attested_envelope=False,
                )

    def test_unverified_signature_fails_closed(self) -> None:
        responses = iter([self.result("tag\n"), self.result(stderr="bad", code=1)])
        with mock.patch.object(
            check_release_policy,
            "run_git",
            side_effect=lambda *_args: next(responses),
        ):
            with self.assertRaisesRegex(RuntimeError, "not verified"):
                check_release_policy.validate_annotated_tag(
                    "v1.0.0",
                    attested_envelope=False,
                )

        responses = iter(
            [
                self.result("tag\n"),
                self.result(stderr="unsigned", code=1),
                self.result("a" * 40 + "\n"),
            ]
        )
        with mock.patch.object(
            check_release_policy,
            "run_git",
            side_effect=lambda *_args: next(responses),
        ):
            identity = check_release_policy.validate_annotated_tag(
                "v1.0.0",
                attested_envelope=True,
            )
        self.assertEqual("attested-promotion-envelope", identity["signature"])

    def test_exact_envelope_requires_cryptographic_github_attestation(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            envelope = Path(directory) / "envelope.json"
            envelope.write_text('{"schema":"fixture"}\n', encoding="utf-8")
            with (
                mock.patch.object(
                    check_release_policy,
                    "load_document",
                    return_value={
                        "subject": {
                            "repository": "owner/repository",
                            "source_commit": "a" * 40,
                            "tag": "v1.0.0",
                        },
                        "promotion_container": {"tag": "v1.0.0-promotion.1"},
                    },
                ),
                mock.patch.object(check_release_policy, "validate_envelope", return_value=[]),
                mock.patch.object(
                    check_release_policy,
                    "run_gh",
                    return_value=self.result("verified\n"),
                ) as verify,
            ):
                receipt = check_release_policy.verify_attested_envelope(
                    envelope,
                    "owner/repository",
                    signer_workflow=(
                        "github.com/owner/repository/.github/workflows/"
                        "promotion-release.yml"
                    ),
                    source_ref="refs/tags/v1.0.0-promotion.1",
                    source_digest="a" * 40,
                )
            verify.assert_called_once_with(
                "attestation",
                "verify",
                str(envelope.resolve()),
                "--repo",
                "owner/repository",
                "--signer-workflow",
                "github.com/owner/repository/.github/workflows/promotion-release.yml",
                "--source-ref",
                "refs/tags/v1.0.0-promotion.1",
                "--source-digest",
                "a" * 40,
            )
            self.assertEqual(64, len(receipt["envelope_sha256"]))

            with (
                mock.patch.object(
                    check_release_policy,
                    "load_document",
                    return_value={
                        "subject": {
                            "repository": "owner/repository",
                            "source_commit": "a" * 40,
                            "tag": "v1.0.0",
                        },
                        "promotion_container": {"tag": "v1.0.0-promotion.1"},
                    },
                ),
                mock.patch.object(check_release_policy, "validate_envelope", return_value=[]),
                mock.patch.object(
                    check_release_policy,
                    "run_gh",
                    return_value=self.result(stderr="no attestation", code=1),
                ),
            ):
                with self.assertRaisesRegex(RuntimeError, "cryptographically verify"):
                    check_release_policy.verify_attested_envelope(
                        envelope,
                        "owner/repository",
                        signer_workflow=(
                            "github.com/owner/repository/.github/workflows/"
                            "promotion-release.yml"
                        ),
                        source_ref="refs/tags/v1.0.0-promotion.1",
                        source_digest="a" * 40,
                    )

    def test_attested_asset_constrains_workflow_ref_and_source_digest(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            asset = Path(directory) / "candidate.tar.gz"
            asset.write_bytes(b"candidate")
            with mock.patch.object(
                check_release_policy,
                "run_gh",
                return_value=self.result("verified\n"),
            ) as verify:
                digest = check_release_policy.verify_attested_asset(
                    asset,
                    "owner/repository",
                    signer_workflow=(
                        "github.com/owner/repository/.github/workflows/"
                        "candidate-release.yml"
                    ),
                    source_ref="refs/tags/candidate-1",
                    source_digest="b" * 40,
                )
            self.assertEqual(hashlib.sha256(b"candidate").hexdigest(), digest)
            verify.assert_called_once_with(
                "attestation",
                "verify",
                str(asset.resolve()),
                "--repo",
                "owner/repository",
                "--signer-workflow",
                "github.com/owner/repository/.github/workflows/candidate-release.yml",
                "--source-ref",
                "refs/tags/candidate-1",
                "--source-digest",
                "b" * 40,
            )

    def test_immutable_release_capability_is_required(self) -> None:
        check_release_policy.validate_immutable_settings(
            {"enabled": True, "enforced_by_owner": False}
        )
        with self.assertRaisesRegex(RuntimeError, "not enabled"):
            check_release_policy.validate_immutable_settings(
                {"enabled": False, "enforced_by_owner": False}
            )
        with self.assertRaisesRegex(RuntimeError, "response is invalid"):
            check_release_policy.validate_immutable_settings({"enabled": True})

    def test_cycle_free_tag_patterns_and_published_immutability(self) -> None:
        policy = __import__("json").loads(
            (ROOT / "release-assurance/release-policy.json").read_text(
                encoding="utf-8"
            )
        )
        check_release_policy.validate_policy_shape(policy)
        check_release_policy.validate_tag_pattern(
            policy, "candidate", "heritage-coventry-warwickshire-20260804"
        )
        check_release_policy.validate_tag_pattern(
            policy,
            "promotion",
            "heritage-coventry-warwickshire-20260804-promotion.1",
        )
        with self.assertRaisesRegex(RuntimeError, "does not match"):
            check_release_policy.validate_tag_pattern(policy, "candidate", "v1")
        check_release_policy.validate_release_json(
            {
                "tag_name": "heritage-coventry-warwickshire-20260804",
                "draft": False,
                "immutable": True,
            },
            "heritage-coventry-warwickshire-20260804",
        )
        with self.assertRaisesRegex(RuntimeError, "not platform immutable"):
            check_release_policy.validate_release_json(
                {"tag_name": "tag", "draft": False, "immutable": False}, "tag"
            )

    def test_release_and_release_attestation_bind_complete_exact_assets(self) -> None:
        digest_a = "a" * 64
        digest_b = "b" * 64
        expected = {
            "one.json": {"sha256": digest_a, "size": 17},
            "two.tar.gz": {"sha256": digest_b, "size": 23},
        }
        release = {
            "tag_name": "release-1",
            "draft": False,
            "immutable": True,
            "assets": [
                {"name": "one.json", "digest": f"sha256:{digest_a}", "size": 17},
                {"name": "two.tar.gz", "digest": f"sha256:{digest_b}", "size": 23},
            ],
        }
        check_release_policy.validate_release_json(release, "release-1", expected)
        attestation = {
            "verificationResult": {
                "statement": {
                    "subject": [
                        {"name": "release-ref", "digest": {"sha1": "c" * 40}},
                        {"name": "one.json", "digest": {"sha256": digest_a}},
                        {"name": "assets/two.tar.gz", "digest": {"sha256": digest_b}},
                    ]
                }
            }
        }
        check_release_policy.validate_release_attestation_json(attestation, expected)

        missing = dict(release)
        missing["assets"] = release["assets"][:1]
        with self.assertRaisesRegex(RuntimeError, "asset closure differs"):
            check_release_policy.validate_release_json(missing, "release-1", expected)

        tampered = {
            "verificationResult": {
                "statement": {
                    "subject": [
                        {"name": "one.json", "digest": {"sha256": digest_a}},
                        {"name": "two.tar.gz", "digest": {"sha256": "d" * 64}},
                    ]
                }
            }
        }
        with self.assertRaisesRegex(RuntimeError, "does not bind exact asset"):
            check_release_policy.validate_release_attestation_json(tampered, expected)

    def test_parse_release_assets_rejects_duplicates_and_hashes_exact_bytes(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "asset.json"
            path.write_bytes(b"{}\n")
            observed = check_release_policy.parse_release_assets(
                [f"asset.json={path}"]
            )
            self.assertEqual(
                hashlib.sha256(b"{}\n").hexdigest(),
                observed["asset.json"]["sha256"],
            )
            self.assertEqual(3, observed["asset.json"]["size"])
            with self.assertRaisesRegex(RuntimeError, "duplicate"):
                check_release_policy.parse_release_assets(
                    [f"asset.json={path}", f"asset.json={path}"]
                )


if __name__ == "__main__":
    unittest.main()
