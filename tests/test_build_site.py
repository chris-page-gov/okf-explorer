from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_site  # noqa: E402


class BuildSiteTests(unittest.TestCase):
    def test_platform_metadata_is_removed_from_generated_site(self) -> None:
        with tempfile.TemporaryDirectory(
            prefix="okf-build-site-metadata-"
        ) as temporary:
            output = Path(temporary)
            nested = output / "docs" / ".DS_Store"
            nested.parent.mkdir(parents=True)
            nested.write_bytes(b"finder metadata")

            with mock.patch.object(build_site, "OUT", output):
                build_site.remove_platform_metadata()
                build_site.assert_no_forbidden_files()

            self.assertFalse(nested.exists())

    def test_legacy_404_is_only_written_when_absent(self) -> None:
        with tempfile.TemporaryDirectory(
            prefix="okf-build-site-"
        ) as temporary:
            output = Path(temporary)
            target = output / "404.html"
            canonical = b"canonical Svelte 404\n"
            target.write_bytes(canonical)

            with mock.patch.object(build_site, "OUT", output):
                build_site.write_legacy_404_if_absent()
                self.assertEqual(canonical, target.read_bytes())

                target.unlink()
                build_site.write_legacy_404_if_absent()

            self.assertIn(
                'http-equiv="refresh"',
                target.read_text(encoding="utf-8"),
            )

    def test_beginner_guide_is_rendered_as_navigable_html(self) -> None:
        with tempfile.TemporaryDirectory(
            prefix="okf-build-site-beginners-"
        ) as temporary:
            output = Path(temporary)
            with mock.patch.object(build_site, "OUT", output):
                build_site.write_beginner_guide()

            target = output / "docs" / "beginners"
            sources = build_site.beginner_sources()
            rendered = sorted(target.glob("*.html"))
            self.assertEqual(len(sources), len(rendered))
            self.assertTrue((target / "guide.css").is_file())

            index = (target / "index.html").read_text(encoding="utf-8")
            self.assertIn(
                "<h1>OKF Explorer From The Beginning</h1>",
                index,
            )
            self.assertIn(
                'href="01-product-in-plain-language.html"',
                index,
            )
            self.assertIn('aria-current="page"', index)
            self.assertIn('aria-label="Beginner guide chapters"', index)

            first = (
                target / "01-product-in-plain-language.html"
            ).read_text(encoding="utf-8")
            self.assertIn('<div class="table-scroll"><table>', first)
            self.assertIn('href="02-web-and-browser-foundations.html"', first)
            self.assertIn('href="index.html"', first)

    def test_beginner_renderer_escapes_raw_html_and_unsafe_links(self) -> None:
        renderer = build_site.beginner_markdown_renderer()
        rendered = renderer.render(
            "# Safe\n\n<script>alert('no')</script>\n\n"
            "[unsafe](javascript:alert('no'))\n",
            {"source": str(build_site.BEGINNER_DOCS / "index.md")},
        )
        self.assertIn("&lt;script&gt;", rendered)
        self.assertNotIn("<script>", rendered)
        self.assertNotIn('href="javascript:', rendered)

    def test_beginner_links_rewrite_only_rendered_guide_markdown(self) -> None:
        source = build_site.BEGINNER_DOCS / "index.md"
        self.assertEqual(
            "01-product-in-plain-language.html#the-problem",
            build_site.rewrite_beginner_href(
                "01-product-in-plain-language.md#the-problem",
                source,
            ),
        )
        self.assertEqual(
            "../repository-guide.md",
            build_site.rewrite_beginner_href(
                "../repository-guide.md",
                source,
            ),
        )


if __name__ == "__main__":
    unittest.main()
