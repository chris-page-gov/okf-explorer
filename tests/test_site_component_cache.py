from __future__ import annotations

import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

import sys

sys.path.insert(0, str(ROOT / "scripts"))

import site_component_cache  # noqa: E402


class SiteComponentCacheTests(unittest.TestCase):
    def test_platform_metadata_does_not_enter_component_identity(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / "nested").mkdir()
            (root / "nested" / "document.txt").write_text(
                "stable\n", encoding="utf-8"
            )
            before = site_component_cache.tree_materials(root)
            (root / ".DS_Store").write_bytes(b"root metadata")
            (root / "nested" / ".DS_Store").write_bytes(b"nested metadata")

            self.assertEqual(before, site_component_cache.tree_materials(root))

    def component(
        self,
        cache: Path,
        name: str,
        fingerprint: str,
        files: dict[str, bytes],
    ) -> site_component_cache.ComponentArtifact:
        def build(target: Path) -> None:
            for relative, raw in files.items():
                path = target / relative
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(raw)

        artifact, _reused = site_component_cache.materialize_component(
            cache,
            name,
            fingerprint,
            [],
            build,
        )
        return artifact

    def test_component_is_content_verified_and_reused(self) -> None:
        with tempfile.TemporaryDirectory(prefix="okf-component-") as directory:
            cache = Path(directory)
            calls = 0

            def build(target: Path) -> None:
                nonlocal calls
                calls += 1
                (target / "index.html").write_text("exact", encoding="utf-8")

            first, first_reused = site_component_cache.materialize_component(
                cache,
                "app",
                "a" * 64,
                [],
                build,
            )
            second, second_reused = site_component_cache.materialize_component(
                cache,
                "app",
                "a" * 64,
                [],
                build,
            )

            self.assertFalse(first_reused)
            self.assertTrue(second_reused)
            self.assertEqual(1, calls)
            self.assertEqual(first.manifest, second.manifest)

            (first.files / "index.html").write_text("changed", encoding="utf-8")
            with self.assertRaisesRegex(RuntimeError, "differ.*manifest"):
                site_component_cache.verify_component(first.root)

    def test_assembly_only_rewrites_changes_and_removes_owned_stale_files(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory(prefix="okf-assembly-") as directory:
            root = Path(directory)
            cache = root / "cache"
            output = root / "site"
            state = cache / "assembly.json"
            first = self.component(
                cache,
                "docs",
                "b" * 64,
                {"docs/index.html": b"one", "docs/stale.html": b"stale"},
            )
            initial = site_component_cache.assemble_components(
                [first],
                output,
                state,
            )
            self.assertEqual(2, initial["changed_files"])

            second = self.component(
                cache,
                "docs",
                "c" * 64,
                {"docs/index.html": b"two"},
            )
            updated = site_component_cache.assemble_components(
                [second],
                output,
                state,
            )
            self.assertEqual(1, updated["changed_files"])
            self.assertEqual(1, updated["removed_files"])
            self.assertEqual(b"two", (output / "docs/index.html").read_bytes())
            self.assertFalse((output / "docs/stale.html").exists())

            unchanged = site_component_cache.assemble_components(
                [second],
                output,
                state,
            )
            self.assertEqual(0, unchanged["changed_files"])
            self.assertEqual(1, unchanged["reused_files"])

    def test_modified_stale_material_is_not_deleted(self) -> None:
        with tempfile.TemporaryDirectory(prefix="okf-assembly-") as directory:
            root = Path(directory)
            cache = root / "cache"
            output = root / "site"
            state = cache / "assembly.json"
            first = self.component(cache, "data", "d" * 64, {"old.json": b"old"})
            site_component_cache.assemble_components([first], output, state)
            (output / "old.json").write_bytes(b"local edit")
            empty = self.component(cache, "data", "e" * 64, {})

            with self.assertRaisesRegex(RuntimeError, "locally modified stale"):
                site_component_cache.assemble_components([empty], output, state)
            self.assertEqual(b"local edit", (output / "old.json").read_bytes())

    def test_collision_requires_explicit_final_owner(self) -> None:
        with tempfile.TemporaryDirectory(prefix="okf-assembly-") as directory:
            root = Path(directory)
            cache = root / "cache"
            first = self.component(cache, "data", "f" * 64, {"same": b"first"})
            second = self.component(cache, "app", "0" * 64, {"same": b"second"})

            with self.assertRaisesRegex(RuntimeError, "collision"):
                site_component_cache.assemble_components(
                    [first, second],
                    root / "site",
                    root / "state.json",
                )
            result = site_component_cache.assemble_components(
                [first, second],
                root / "site",
                root / "state.json",
                allowed_overrides={"same": "app"},
            )
            self.assertEqual(1, result["changed_files"])
            self.assertEqual(b"second", (root / "site/same").read_bytes())

    def test_source_fingerprint_ignores_unselected_materials(self) -> None:
        with tempfile.TemporaryDirectory(prefix="okf-fingerprint-") as directory:
            root = Path(directory)
            (root / "included.md").write_text("included", encoding="utf-8")
            (root / "ignored.json").write_text("one", encoding="utf-8")
            first, materials = site_component_cache.source_fingerprint(
                root,
                [root],
                include=lambda path: path.suffix == ".md",
            )
            (root / "ignored.json").write_text("two", encoding="utf-8")
            second, _ = site_component_cache.source_fingerprint(
                root,
                [root],
                include=lambda path: path.suffix == ".md",
            )
            self.assertEqual(first, second)
            self.assertEqual(["included.md"], [item["path"] for item in materials])


if __name__ == "__main__":
    unittest.main()
