from __future__ import annotations

import argparse
import hashlib
import io
import json
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_publication_assurance_receipt as assurance  # noqa: E402
import materialize_promotion_envelope as materialize  # noqa: E402


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


class PublicationAssuranceReceiptTests(unittest.TestCase):
    def test_candidate_subject_binds_publication_manifest_bytes(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "assurance").mkdir()
            (root / "data/link-validation").mkdir(parents=True)
            (root / "okf-explorer.json").write_text("{}\n", encoding="utf-8")
            (root / "assurance/plane-roots.json").write_text(
                json.dumps({"release_root_sha256": "c" * 64}), encoding="utf-8"
            )
            (root / "data/link-validation/manifest.json").write_text(
                "{}\n", encoding="utf-8"
            )
            manifest_path = root / "publication-unit-manifest.json"
            manifest_path.write_text('{"candidate":"exact"}\n', encoding="utf-8")
            with mock.patch.object(
                assurance,
                "validate_publication_tree",
                return_value={"tree_sha256": "d" * 64, "file_count": 4},
            ):
                subject = assurance.candidate_subject(
                    root,
                    repository="owner/repository",
                    source_commit="a" * 40,
                    candidate_tag="candidate",
                )
            self.assertEqual(
                sha256(manifest_path), subject["publication_manifest_sha256"]
            )

    def test_journey_builder_retains_standardized_raw_engine_results(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            validation = root / "validation.json"
            subject = {"candidate": "fixture"}
            validation.write_text(
                json.dumps(
                    {
                        "schema": "okf-publication-validation-receipt.v1",
                        "status": "passed",
                        "subject": subject,
                    }
                ),
                encoding="utf-8",
            )
            result_paths = {}
            for engine in ("chromium", "firefox", "webkit"):
                path = root / f"source-{engine}.json"
                path.write_text(
                    json.dumps(
                        {
                            "generated_at": "2026-08-04T11:00:00Z",
                            "metadata": {"browser_engine": engine},
                            "interaction_journeys": {
                                "records": [
                                    {
                                        "id": "journey-publication",
                                        "status": "passed",
                                        "actions": [
                                            {"passed": True}, {"passed": True}
                                        ],
                                        "assertions": [{"passed": True}],
                                    }
                                ]
                            },
                        }
                    ),
                    encoding="utf-8",
                )
                result_paths[engine] = path
            output = root / "evidence/publication-journey-receipt.json"
            args = argparse.Namespace(
                validation_receipt=validation,
                result=[f"{engine}={path}" for engine, path in result_paths.items()],
                expected_actions=2,
                assurance_source_commit="f" * 40,
                output=output,
            )
            receipt = assurance.build_journeys(args)
            for row in receipt["engines"]:
                engine = row["engine"]
                retained = output.parent / f"journey-{engine}-results.json"
                self.assertEqual(result_paths[engine].read_bytes(), retained.read_bytes())
                self.assertEqual(
                    f"evidence/journey-{engine}-results.json", row["result_ref"]
                )
                self.assertEqual(sha256(retained), row["result_sha256"])

    def test_materializer_binds_manifest_and_resolves_every_raw_result(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            repository = Path(directory)
            publication = repository / "site"
            evidence = repository / "evidence"
            (publication / "assurance").mkdir(parents=True)
            (publication / "data/link-validation").mkdir(parents=True)
            evidence.mkdir()
            for relative, raw in (
                ("okf-explorer.json", b"descriptor\n"),
                ("okf-bundle.jsonld", b"jsonld\n"),
                ("okf-bundle.yamlld", b"yamlld\n"),
                ("assurance/build-manifest.json", b"build\n"),
            ):
                (publication / relative).write_bytes(raw)
            roots_path = publication / "assurance/plane-roots.json"
            roots_path.write_text(
                json.dumps({"release_root_sha256": "c" * 64}), encoding="utf-8"
            )
            link_manifest = publication / "data/link-validation/manifest.json"
            link_manifest.write_text("{}\n", encoding="utf-8")
            publication_manifest = publication / "publication-unit-manifest.json"
            publication_manifest.write_text('{"exact":"site"}\n', encoding="utf-8")
            subject = {
                "repository": "owner/repository",
                "source_commit": "a" * 40,
                "candidate_tag": "candidate-tag",
                "descriptor_sha256": sha256(publication / "okf-explorer.json"),
                "release_root_sha256": "c" * 64,
                "publication_manifest_sha256": sha256(publication_manifest),
                "site_tree_sha256": "d" * 64,
                "site_file_count": 5,
                "link_manifest_sha256": sha256(link_manifest),
            }
            validation = evidence / "publication-validation-receipt.json"
            validation.write_text(
                json.dumps(
                    {
                        "schema": "okf-publication-validation-receipt.v1",
                        "status": "passed",
                        "observed_at": "2026-08-04T10:00:00Z",
                        "subject": subject,
                    }
                ),
                encoding="utf-8",
            )
            candidate_release = evidence / "candidate-release-receipt.json"
            candidate_release.write_text(
                json.dumps(
                    {
                        "schema": "okf-candidate-release-receipt.v1",
                        "status": "passed",
                        "observed_at": "2026-08-04T10:01:00Z",
                        "subject": subject,
                        "release_url": (
                            "https://github.com/owner/repository/releases/tag/"
                            "candidate-tag"
                        ),
                        "archive": {
                            "asset": "candidate.tar.gz",
                            "sha256": "9" * 64,
                            "attestation_url": "https://example.test/attestation",
                            "attestation_issuer": "https://example.test/issuer",
                        },
                    }
                ),
                encoding="utf-8",
            )
            engine_rows = []
            for engine in ("chromium", "firefox", "webkit"):
                result = evidence / f"journey-{engine}-results.json"
                result.write_text(json.dumps({"engine": engine}), encoding="utf-8")
                engine_rows.append(
                    {
                        "engine": engine,
                        "result_ref": f"evidence/journey-{engine}-results.json",
                        "result_sha256": sha256(result),
                    }
                )
            journey = evidence / "publication-journey-receipt.json"
            journey.write_text(
                json.dumps(
                    {
                        "schema": "okf-publication-journey-receipt.v1",
                        "status": "passed",
                        "observed_at": "2026-08-04T10:02:00Z",
                        "subject": subject,
                        "engines": engine_rows,
                    }
                ),
                encoding="utf-8",
            )
            link = evidence / "link.json"
            link.write_text(
                json.dumps({"observed_at": "2026-08-04T10:03:00Z"}),
                encoding="utf-8",
            )
            template = repository / "template.json"
            template.write_text(
                json.dumps(
                    {
                        "schema": "okf-evaluation-promotion-envelope.v1",
                        "envelope_id": "fixture",
                        "state": "draft-local",
                        "subject": {
                            "publication_unit": "fixture",
                            "repository": "owner/repository",
                            "source_commit": "pending",
                            "tag": "candidate-tag",
                            "release_url": "pending",
                            "descriptor": {"path": "okf-explorer.json", "sha256": "pending"},
                            "bundles": [
                                {"path": "okf-bundle.jsonld", "sha256": "pending"},
                                {"path": "okf-bundle.yamlld", "sha256": "pending"},
                            ],
                            "plane_roots": {
                                "path": "assurance/plane-roots.json",
                                "sha256": "pending",
                                "release_root_sha256": "pending",
                            },
                            "build_manifest": {
                                "path": "assurance/build-manifest.json",
                                "sha256": "pending",
                            },
                            "site_artifact": {
                                "manifest_path": "publication-unit-manifest.json",
                                "manifest_sha256": "pending",
                                "tree_sha256": "pending",
                                "file_count": "pending",
                            },
                        },
                        "promotion_container": {},
                        "receipts": {},
                        "attestations": [],
                        "signature": {},
                    }
                ),
                encoding="utf-8",
            )
            output = repository / "promotion-envelope.json"
            argv = [
                "--template",
                str(template),
                "--publication-root",
                str(publication),
                "--repository-root",
                str(repository),
                "--candidate-release-receipt",
                str(candidate_release),
                "--validation-receipt",
                str(validation),
                "--journey-receipt",
                str(journey),
                "--link-receipt",
                str(link),
                "--promotion-tag",
                "promotion-tag",
                "--promoted-at",
                "2026-08-04T11:00:00Z",
                "--output",
                str(output),
            ]
            with mock.patch.object(
                materialize,
                "validate_publication_tree",
                return_value={"tree_sha256": "d" * 64, "file_count": 5},
            ):
                with redirect_stdout(io.StringIO()):
                    self.assertEqual(0, materialize.main(argv))
            envelope = json.loads(output.read_text(encoding="utf-8"))
            self.assertEqual(
                sha256(publication_manifest),
                envelope["subject"]["site_artifact"]["manifest_sha256"],
            )

            (evidence / "journey-webkit-results.json").unlink()
            with (
                mock.patch.object(
                    materialize,
                    "validate_publication_tree",
                    return_value={"tree_sha256": "d" * 64, "file_count": 5},
                ),
                self.assertRaisesRegex(RuntimeError, "raw result is absent"),
            ):
                materialize.main(argv)


if __name__ == "__main__":
    unittest.main()
