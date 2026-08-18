from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_site  # noqa: E402
import update_viewer  # noqa: E402


class PublicationMethodSeparationTests(unittest.TestCase):
    def test_lifecycle_profile_is_explicitly_outside_semantic_discovery(self) -> None:
        lifecycle_index = ROOT / "profiles" / "publication-method" / "v1" / "index.md"
        semantic_profile_index = ROOT / "profiles" / "bundle-wiki" / "v1" / "index.md"

        prefixes = update_viewer.semantic_markdown_exclusion_prefixes()
        self.assertIn(("profiles", "publication-method"), prefixes)
        self.assertTrue(
            update_viewer.is_semantic_markdown_excluded(lifecycle_index, prefixes)
        )
        self.assertFalse(
            update_viewer.is_semantic_markdown_excluded(
                semantic_profile_index,
                prefixes,
            )
        )

        # Prove the explicit exclusion still applies if semantic discovery is
        # later expanded to the profiles tree.
        with mock.patch.object(
            update_viewer,
            "OKF_DIRS",
            {*update_viewer.OKF_DIRS, "profiles"},
        ):
            discovered = set(update_viewer.iter_okf_markdown())
        self.assertNotIn(lifecycle_index, discovered)
        self.assertIn(semantic_profile_index, discovered)

    def test_lifecycle_markdown_and_schemas_remain_site_publishable(self) -> None:
        lifecycle_root = ROOT / "profiles" / "publication-method"
        lifecycle_index = (lifecycle_root / "v1" / "index.md").resolve()
        self.assertEqual(
            Path("profile/publication-method/v1/index.html"),
            build_site.published_source_routes()[lifecycle_index],
        )

        with tempfile.TemporaryDirectory(
            prefix="okf-publication-method-site-"
        ) as temporary:
            target = Path(temporary) / "profile" / "publication-method"
            build_site.copy_public_tree(lifecycle_root, target)
            for name in (
                "estate-registry.schema.json",
                "repository-publication.schema.json",
                "source-family.schema.json",
            ):
                self.assertTrue((target / "v1" / name).is_file(), name)


if __name__ == "__main__":
    unittest.main()
