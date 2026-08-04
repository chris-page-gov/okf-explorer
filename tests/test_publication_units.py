from __future__ import annotations

import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_site  # noqa: E402
import check_publication_unit_manifest  # noqa: E402
import export_publication_unit  # noqa: E402
import plane_root_validation  # noqa: E402
import site_component_cache  # noqa: E402


def rooted_json(value: object) -> bytes:
    return (
        json.dumps(
            value,
            ensure_ascii=False,
            indent=2,
            sort_keys=True,
            separators=(",", ": "),
        )
        + "\n"
    ).encode("utf-8")


def digest(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


class PublicationUnitTests(unittest.TestCase):
    def test_promotion_envelope_refresh_does_not_change_site_component_input(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory(prefix="okf-envelope-loop-") as directory:
            root = Path(directory)
            envelope = root / build_site.PROMOTION_ENVELOPE
            stable = root / "release-assurance/stable.json"
            envelope.parent.mkdir(parents=True)
            envelope.write_text('{"observed_at":"one"}', encoding="utf-8")
            stable.write_text('{"candidate":"same"}', encoding="utf-8")
            first, first_materials = site_component_cache.source_fingerprint(
                root,
                [root],
                include=build_site.is_component_source_allowed,
            )
            envelope.write_text(
                '{"observed_at":"two","signature":"refreshed"}',
                encoding="utf-8",
            )
            second, second_materials = site_component_cache.source_fingerprint(
                root,
                [root],
                include=build_site.is_component_source_allowed,
            )
            self.assertEqual(first, second)
            self.assertEqual(first_materials, second_materials)
            self.assertEqual(
                ["release-assurance/stable.json"],
                [item["path"] for item in first_materials],
            )

            evidence = (
                root
                / "evaluation-foundry/fixtures/example/evidence/browser-receipt.json"
            )
            evidence.parent.mkdir(parents=True)
            evidence.write_text('{"observed_at":"one"}', encoding="utf-8")
            with_evidence, with_evidence_materials = (
                site_component_cache.source_fingerprint(
                    root,
                    [root],
                    include=build_site.is_component_source_allowed,
                )
            )
            evidence.write_text('{"observed_at":"two"}', encoding="utf-8")
            refreshed, refreshed_materials = site_component_cache.source_fingerprint(
                root,
                [root],
                include=build_site.is_component_source_allowed,
            )
            self.assertEqual(with_evidence, refreshed)
            self.assertEqual(with_evidence_materials, refreshed_materials)
            self.assertNotIn(
                "evaluation-foundry/fixtures/example/evidence/browser-receipt.json",
                [item["path"] for item in refreshed_materials],
            )

            site = root / "site"
            copied = site / build_site.PROMOTION_ENVELOPE
            copied.parent.mkdir(parents=True)
            copied.write_text("observation", encoding="utf-8")
            with mock.patch.object(build_site, "OUT", site):
                with self.assertRaisesRegex(RuntimeError, "outside Site bytes"):
                    build_site.assert_no_forbidden_files()

    def test_heritage_corpus_moves_to_external_project_root(self) -> None:
        self.assertEqual(
            "https://chris-page-gov.github.io/"
            "okf-heritage-coventry-warwickshire/okf-explorer.json",
            build_site.externalized_publication_target(
                Path("evaluation/heritage/okf-explorer.json")
            ),
        )
        self.assertEqual(
            "https://chris-page-gov.github.io/"
            "okf-heritage-coventry-warwickshire/tiny/index.md",
            build_site.externalized_publication_target(
                Path("evaluation/heritage/tiny/index.md")
            ),
        )
        self.assertIsNone(
            build_site.externalized_publication_target(
                Path("docs/heritage-evaluation-report.md")
            )
        )

    def test_main_site_uses_small_external_compatibility_page(self) -> None:
        source = ROOT / "evaluation" / "heritage" / "index.md"
        page, markdown = build_site.render_external_publication_compatibility(
            source,
            Path("evaluation/heritage/index.html"),
        )
        external = (
            "https://chris-page-gov.github.io/"
            "okf-heritage-coventry-warwickshire/index.html"
        )
        self.assertIn(f'rel="canonical" href="{external}"', page)
        self.assertIn(f'http-equiv="refresh" content="0; url={external}"', page)
        self.assertIn(external, markdown)
        self.assertNotIn("data/records", page)

    def test_site_candidate_receipt_must_remain_outside_site(self) -> None:
        with self.assertRaisesRegex(RuntimeError, "outside Site bytes"):
            build_site.require_receipt_outside_site(
                build_site.OUT / "site-candidate-receipt.json"
            )

    def test_export_preserves_every_rooted_candidate_byte_and_root(self) -> None:
        with tempfile.TemporaryDirectory(prefix="okf-publication-") as directory:
            root = Path(directory)
            schema_path = root / "publication-units/publication-unit.v1.schema.json"
            schema_path.parent.mkdir(parents=True)
            schema_path.write_bytes(
                (ROOT / "publication-units/publication-unit.v1.schema.json").read_bytes()
            )
            corpus = root / "candidate"
            corpus.mkdir()
            descriptor_bytes = b'{"base":"https://example.test/external/"}\n'
            (corpus / "okf-explorer.json").write_bytes(descriptor_bytes)
            entries = [
                {
                    "path": "okf-explorer.json",
                    "bytes": len(descriptor_bytes),
                    "sha256": digest(descriptor_bytes),
                }
            ]
            plane_root = digest(rooted_json(entries))
            release_basis = [{"plane": "control", "root_sha256": plane_root}]
            plane_roots = {
                "schema": "okf-evaluation-plane-roots.v2",
                "algorithm": "sha256-over-canonical-ordered-entry-manifests",
                "planes": {
                    "control": {
                        "files": 1,
                        "bytes": len(descriptor_bytes),
                        "root_sha256": plane_root,
                        "artifact_root_sha256": plane_root,
                        "entries": entries,
                    }
                },
                "release_root_sha256": digest(rooted_json(release_basis)),
            }
            assurance = corpus / "assurance"
            assurance.mkdir()
            plane_bytes = rooted_json(plane_roots)
            (assurance / "plane-roots.json").write_bytes(plane_bytes)
            build_entries = [
                {**entries[0], "plane": "control"},
                {
                    "path": "assurance/plane-roots.json",
                    "plane": "control",
                    "bytes": len(plane_bytes),
                    "sha256": digest(plane_bytes),
                },
            ]
            (assurance / "build-manifest.json").write_bytes(
                rooted_json(
                    {
                        "schema": "okf-evaluation-build-manifest.v2",
                        "entries": build_entries,
                    }
                )
            )
            descriptor = {
                "$schema": "../publication-unit.v1.schema.json",
                "schema": "okf-publication-unit.v1",
                "id": "test-unit",
                "title": "Test unit",
                "owner_repository": "example/test-unit",
                "publication": {
                    "repository_url": "https://github.com/example/test-unit",
                    "pages_base_url": "https://example.test/external/",
                    "release_asset_prefix": "test-unit",
                },
                "runtime_dependency": {
                    "repository": "example/runtime",
                    "contract": "test.v1",
                    "public_url": "https://example.test/runtime/",
                },
                "retarget": {
                    "from_base_url": "https://example.test/old/",
                    "to_base_url": "https://example.test/external/",
                },
                "activation": {
                    "requires_remote_identity_journey": True,
                    "redirects_after_activation": True,
                },
                "materials": [
                    {"source": "candidate", "target": ".", "role": "corpus"}
                ],
            }
            descriptor_path = root / "publication-units/test/publication-unit.json"
            descriptor_path.parent.mkdir(parents=True)
            descriptor_path.write_text(json.dumps(descriptor), encoding="utf-8")

            with (
                mock.patch.object(export_publication_unit, "ROOT", root),
                mock.patch.object(export_publication_unit, "SCHEMA_PATH", schema_path),
            ):
                loaded = export_publication_unit.load_descriptor(descriptor_path, root)
                files, _roles = export_publication_unit.expected_files(
                    descriptor_path,
                    loaded,
                    root=root,
                )

            self.assertEqual(descriptor_bytes, files["okf-explorer.json"])
            export_publication_unit.validate_rooted_corpus_receipts(files)

    def test_v2_semantic_root_uses_identity_and_separate_artifact_root(self) -> None:
        files = {
            "okf-bundle.jsonld": b'{"@graph":[]}\n',
            "okf-bundle.yamlld": b"'@graph': []\n",
        }
        entries = []
        for path, raw in sorted(files.items()):
            entries.append(
                {
                    "path": path,
                    "bytes": len(raw),
                    "sha256": digest(raw),
                    "semantic_algorithm": "URDNA2015",
                    "semantic_media_type": "application/n-quads",
                    "semantic_sha256": "a" * 64,
                    "semantic_statements": 0,
                    "semantic_source_data_model_sha256": "b" * 64,
                }
            )
        identity_entries = [
            plane_root_validation.identity_entry(entry) for entry in entries
        ]
        semantic_root = digest(rooted_json(identity_entries))
        artifact_root = digest(rooted_json(entries))
        roots = {
            "schema": "okf-evaluation-plane-roots.v2",
            "planes": {
                "semantic": {
                    "files": 2,
                    "bytes": sum(len(raw) for raw in files.values()),
                    "root_sha256": semantic_root,
                    "artifact_root_sha256": artifact_root,
                    "entries": entries,
                }
            },
            "release_root_sha256": digest(
                rooted_json(
                    [{"plane": "semantic", "root_sha256": semantic_root}]
                )
            ),
        }

        plane_root_validation.validate_plane_roots(
            roots,
            read_bytes=files.__getitem__,
            owned_paths=set(files),
        )
        stale = json.loads(json.dumps(roots))
        stale["planes"]["semantic"]["artifact_root_sha256"] = "0" * 64
        with self.assertRaisesRegex(RuntimeError, "artifact root differs"):
            plane_root_validation.validate_plane_roots(
                stale,
                read_bytes=files.__getitem__,
                owned_paths=set(files),
            )
            manifest = export_publication_unit.export_manifest(
                loaded,
                files,
                _roles,
            )
            output = root / "export"
            export_publication_unit.write_export(output, files, manifest)
            checked = check_publication_unit_manifest.validate_publication_tree(output)
            self.assertEqual(manifest["tree_sha256"], checked["tree_sha256"])
            envelope = output / check_publication_unit_manifest.PROMOTION_ENVELOPE
            envelope.parent.mkdir(parents=True, exist_ok=True)
            envelope.write_text("{}\n", encoding="utf-8")
            with self.assertRaisesRegex(RuntimeError, "closure differs"):
                check_publication_unit_manifest.validate_publication_tree(output)
            corrupted = dict(files)
            corrupted["okf-explorer.json"] = b"changed"
            with self.assertRaisesRegex(RuntimeError, "entry differs"):
                export_publication_unit.validate_rooted_corpus_receipts(corrupted)

    def test_export_rejects_post_generation_base_rewriting(self) -> None:
        raw = b'{"id":"https://example.test/old/candidate/record"}\n'
        replacements = [
            (
                b"https://example.test/old/candidate",
                b"https://example.test/external",
            )
        ]
        self.assertNotEqual(
            raw,
            export_publication_unit.retarget_bytes(
                Path("okf-explorer.json"),
                raw,
                replacements,
            ),
        )
        # expected_files applies no such rewrite to the corpus role; the
        # synthetic end-to-end test above proves its exact descriptor bytes.

    def test_external_fixture_paths_follow_the_relocated_root_corpus(self) -> None:
        descriptor_path = (
            ROOT
            / "publication-units"
            / "heritage-coventry-warwickshire"
            / "publication-unit.json"
        )
        descriptor = export_publication_unit.load_descriptor(descriptor_path)
        files, _roles = export_publication_unit.expected_files(
            descriptor_path,
            descriptor,
        )
        self.assertFalse(
            any(
                "/evidence/" in f"/{path}/" or path.startswith("evidence/")
                for path in files
            )
        )
        profile = files[
            "evaluation-foundry/fixtures/heritage-warwickshire/"
            "evaluation-profile.yaml"
        ]
        self.assertNotIn(b"../../../evaluation/heritage/", profile)
        self.assertNotIn(b"../../../scripts/", profile)
        self.assertIn(b"faithful: ../../../okf-explorer.json", profile)
        self.assertIn(
            b"tiny: ../../../tiny/okf-explorer.json",
            profile,
        )
        self.assertIn(
            b"https://github.com/chris-page-gov/okf-explorer/blob/main/"
            b"scripts/build_heritage_evaluation.py",
            profile,
        )


if __name__ == "__main__":
    unittest.main()
