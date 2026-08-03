from __future__ import annotations

import copy
import hashlib
import html
import json
import re
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_site  # noqa: E402


class BuildSiteTests(unittest.TestCase):
    def test_project_root_href_is_directory_canonical(self) -> None:
        self.assertEqual(
            "../",
            build_site.relative_site_directory_href(
                Path("docs/page.html"),
                Path("."),
            ),
        )
        self.assertEqual(
            "../../",
            build_site.relative_site_directory_href(
                Path("docs/beginners/page.html"),
                Path("."),
            ),
        )

    def test_local_candidate_receipt_fails_closed_on_stale_site_claims(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory(
            prefix="okf-build-site-receipt-"
        ) as temporary:
            output = Path(temporary)
            app_bytes = b"<!doctype html><title>Exact app</title>\n"
            (output / "index.html").write_bytes(app_bytes)
            materials = [
                {
                    "path": "index.html",
                    "bytes": len(app_bytes),
                    "sha256": hashlib.sha256(app_bytes).hexdigest(),
                }
            ]
            tree_bytes = (
                json.dumps(
                    materials,
                    ensure_ascii=False,
                    separators=(",", ":"),
                )
                + "\n"
            ).encode("utf-8")
            tree_sha256 = hashlib.sha256(tree_bytes).hexdigest()
            manifest = {
                "schema": "okf-explorer-app-build-manifest.v1",
                "algorithm": "sha256-canonical-json-materials-v1",
                "file_count": 1,
                "tree_sha256": tree_sha256,
                "materials": materials,
            }
            manifest_bytes = (
                json.dumps(manifest, indent=2) + "\n"
            ).encode("utf-8")
            (output / build_site.EXPLORER_BUILD_MANIFEST).write_bytes(
                manifest_bytes
            )
            site_asset = output / "docs" / "page.html"
            site_asset.parent.mkdir()
            site_asset.write_bytes(b"site")
            receipt_path = (
                output / build_site.HERITAGE_LOCAL_CANDIDATE_RECEIPT
            )
            receipt_path.parent.mkdir(parents=True)
            receipt = {
                "candidate": {
                    "explorer_tree_sha256": tree_sha256,
                    "explorer_manifest_sha256": hashlib.sha256(
                        manifest_bytes
                    ).hexdigest(),
                    "site_reading_pages": 7,
                    "site_internal_references": 11,
                    "site_size_gate": {
                        "status": "passed",
                        "limit_bytes": 1_000,
                        "site_bytes": 400,
                        "headroom_bytes": 600,
                    },
                }
            }

            def write_receipt(value: dict) -> None:
                receipt_path.write_text(
                    json.dumps(value),
                    encoding="utf-8",
                )

            with (
                mock.patch.object(build_site, "OUT", output),
                mock.patch.object(
                    build_site,
                    "GITHUB_PAGES_SITE_LIMIT_BYTES",
                    1_000,
                ),
            ):
                site_tree = build_site.published_site_tree_receipt()
                receipt["candidate"].update(
                    site_file_count=site_tree["file_count"],
                    site_tree_algorithm=site_tree["algorithm"],
                    site_tree_sha256=site_tree["tree_sha256"],
                )
                write_receipt(receipt)
                build_site.assert_local_candidate_receipt_matches_built_site(
                    reading_pages=7,
                    internal_references=11,
                    site_bytes=400,
                    remaining_bytes=600,
                )

                mutations = {
                    "explorer_tree_sha256": lambda value: value["candidate"].update(
                        explorer_tree_sha256="0" * 64
                    ),
                    "explorer_manifest_sha256": lambda value: value[
                        "candidate"
                    ].update(explorer_manifest_sha256="0" * 64),
                    "site_reading_pages": lambda value: value["candidate"].update(
                        site_reading_pages=8
                    ),
                    "site_internal_references": lambda value: value[
                        "candidate"
                    ].update(site_internal_references=12),
                    "site_file_count": lambda value: value["candidate"].update(
                        site_file_count=4
                    ),
                    "site_tree_algorithm": lambda value: value[
                        "candidate"
                    ].update(site_tree_algorithm="different-v1"),
                    "site_tree_sha256": lambda value: value["candidate"].update(
                        site_tree_sha256="0" * 64
                    ),
                    "site_size_gate.limit_bytes": lambda value: value[
                        "candidate"
                    ]["site_size_gate"].update(limit_bytes=999),
                    "site_size_gate.site_bytes": lambda value: value[
                        "candidate"
                    ]["site_size_gate"].update(site_bytes=401),
                    "site_size_gate.headroom_bytes": lambda value: value[
                        "candidate"
                    ]["site_size_gate"].update(headroom_bytes=599),
                    "site_size_gate.status": lambda value: value[
                        "candidate"
                    ]["site_size_gate"].update(status="pending"),
                }
                for claim, mutate in mutations.items():
                    with self.subTest(claim=claim):
                        stale = copy.deepcopy(receipt)
                        mutate(stale)
                        write_receipt(stale)
                        with self.assertRaisesRegex(RuntimeError, claim):
                            build_site.assert_local_candidate_receipt_matches_built_site(
                                reading_pages=7,
                                internal_references=11,
                                site_bytes=400,
                                remaining_bytes=600,
                            )

                write_receipt(receipt)
                (output / "index.html").write_bytes(app_bytes + b"tamper")
                with self.assertRaisesRegex(
                    RuntimeError,
                    "does not describe its exact published material bytes",
                ):
                    build_site.assert_local_candidate_receipt_matches_built_site(
                        reading_pages=7,
                        internal_references=11,
                        site_bytes=400,
                        remaining_bytes=600,
                    )

                (output / "index.html").write_bytes(app_bytes)
                site_asset.write_bytes(b"same")
                with self.assertRaisesRegex(RuntimeError, "site_tree_sha256"):
                    build_site.assert_local_candidate_receipt_matches_built_site(
                        reading_pages=7,
                        internal_references=11,
                        site_bytes=400,
                        remaining_bytes=600,
                    )

                site_asset.write_bytes(b"site")
                added = output / "added.txt"
                added.write_bytes(b"added")
                with self.assertRaisesRegex(RuntimeError, "site_file_count"):
                    build_site.assert_local_candidate_receipt_matches_built_site(
                        reading_pages=7,
                        internal_references=11,
                        site_bytes=400,
                        remaining_bytes=600,
                    )

                added.unlink()
                site_asset.unlink()
                with self.assertRaisesRegex(RuntimeError, "site_file_count"):
                    build_site.assert_local_candidate_receipt_matches_built_site(
                        reading_pages=7,
                        internal_references=11,
                        site_bytes=400,
                        remaining_bytes=600,
                    )

    def test_ephemeral_evaluator_results_are_not_public_site_inputs(self) -> None:
        self.assertTrue(
            build_site.is_ephemeral_evaluation_result(
                Path("evaluation/gov-ckan/results/latest/results.md")
            )
        )
        self.assertFalse(
            build_site.is_ephemeral_evaluation_result(
                Path("evaluation/heritage/methodology.md")
            )
        )

        with tempfile.TemporaryDirectory(
            prefix="okf-build-site-results-"
        ) as temporary:
            root = Path(temporary)
            source = root / "evaluation"
            ordinary = source / "heritage" / "methodology.md"
            ignored = source / "heritage" / "results" / "latest" / "results.md"
            ordinary.parent.mkdir(parents=True)
            ignored.parent.mkdir(parents=True)
            ordinary.write_text("# Methodology\n", encoding="utf-8")
            ignored.write_text("# Ephemeral result\n", encoding="utf-8")
            target = root / "site" / "evaluation"

            with mock.patch.object(build_site, "ROOT", root):
                build_site.copy_public_tree(source, target)

            self.assertTrue((target / "heritage" / "methodology.md").is_file())
            self.assertFalse(
                (target / "heritage" / "results" / "latest" / "results.md").exists()
            )

    def test_site_size_gate_uses_the_published_pages_limit(self) -> None:
        with tempfile.TemporaryDirectory(
            prefix="okf-build-site-size-"
        ) as temporary:
            output = Path(temporary)
            (output / "index.html").write_bytes(b"12345")
            (output / ".DS_Store").write_bytes(b"local Finder metadata")

            with (
                mock.patch.object(build_site, "OUT", output),
                mock.patch.object(
                    build_site,
                    "GITHUB_PAGES_SITE_LIMIT_BYTES",
                    5,
                ),
            ):
                self.assertEqual(
                    (5, 0),
                    build_site.assert_site_size_within_github_pages_limit(),
                )

            with (
                mock.patch.object(build_site, "OUT", output),
                mock.patch.object(
                    build_site,
                    "GITHUB_PAGES_SITE_LIMIT_BYTES",
                    4,
                ),
            ):
                with self.assertRaisesRegex(
                    RuntimeError,
                    "exceeds the GitHub Pages 1 GB published-site limit",
                ):
                    build_site.assert_site_size_within_github_pages_limit()

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
                '<h1 id="okf-explorer-from-the-beginning">'
                "OKF Explorer From The Beginning</h1>",
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

    def test_beginner_sidebar_scrolls_independently_on_desktop(self) -> None:
        stylesheet = build_site.BEGINNER_GUIDE_CSS.read_text(
            encoding="utf-8"
        )
        self.assertIn("position: sticky;", stylesheet)
        self.assertIn("height: 100dvh;", stylesheet)
        self.assertIn("overflow-y: auto;", stylesheet)
        self.assertIn("overscroll-behavior-y: contain;", stylesheet)
        self.assertIn("scrollbar-gutter: stable;", stylesheet)
        self.assertIn(
            ".guide-sidebar nav { position: static; }",
            stylesheet,
        )
        self.assertIn("overscroll-behavior-y: auto;", stylesheet)

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

    def test_beginner_links_rewrite_every_published_markdown_target(self) -> None:
        source = build_site.BEGINNER_DOCS / "index.md"
        self.assertEqual(
            "01-product-in-plain-language.html#the-problem",
            build_site.rewrite_beginner_href(
                "01-product-in-plain-language.md#the-problem",
                source,
            ),
        )
        self.assertEqual(
            "../repository-guide.html",
            build_site.rewrite_beginner_href(
                "../repository-guide.md",
                source,
            ),
        )

    def test_foundry_pages_are_rendered_with_exact_copyable_prompts(self) -> None:
        with tempfile.TemporaryDirectory(
            prefix="okf-build-site-foundry-"
        ) as temporary:
            output = Path(temporary)
            with mock.patch.object(build_site, "OUT", output):
                build_site.write_foundry_pages()

            expected_routes = [
                output / target
                for _source, target, _label in build_site.FOUNDRY_PAGES
            ]
            for route in expected_routes:
                self.assertTrue(route.is_file(), route)
                page = route.read_text(encoding="utf-8")
                self.assertIn("<!doctype html>", page)
                self.assertIn('aria-label="OKF Foundry documentation"', page)
                self.assertIn('rel="canonical"', page)

            compatibility_profile = (
                output
                / "profiles"
                / "authoring"
                / "v1"
                / "index.html"
            )
            self.assertTrue(compatibility_profile.is_file())
            self.assertIn(
                'href="https://chris-page-gov.github.io/okf-explorer/'
                'profile/authoring/v1/"',
                compatibility_profile.read_text(encoding="utf-8"),
            )

            for source in build_site.FOUNDRY_PROMPT_SOURCES:
                target = build_site.published_source_routes()[source]
                page = (output / target).read_text(encoding="utf-8")
                extracted = build_site.extract_copy_ready_prompt(
                    source.read_text(encoding="utf-8")
                )
                self.assertIsNotNone(extracted)
                assert extracted is not None
                _before, prompt, _after = extracted
                text_target = (output / target).with_suffix(".txt")
                self.assertEqual(prompt, text_target.read_text(encoding="utf-8"))
                textarea = re.search(
                    r'<textarea id="copy-ready-prompt-source".*?>(.*?)</textarea>',
                    page,
                    flags=re.DOTALL,
                )
                self.assertIsNotNone(textarea)
                assert textarea is not None
                self.assertEqual(prompt, html.unescape(textarea.group(1)))
                self.assertIn(
                    '<button type="button" class="copy-prompt"',
                    page,
                )
                self.assertIn("Copy full prompt", page)
                self.assertIn('role="status" aria-live="polite"', page)
                self.assertIn('<h2 id="okf-foundry', page)
                self.assertNotIn("<h1>OKF Foundry", page)
                if source.name == "okf-domain-warm-up.md":
                    self.assertLess(
                        page.index("Copy full prompt"),
                        page.index("Owner Inputs Worth Supplying"),
                    )

    def test_foundry_and_beginner_links_target_rendered_html(self) -> None:
        with tempfile.TemporaryDirectory(
            prefix="okf-build-site-foundry-links-"
        ) as temporary:
            output = Path(temporary)
            with mock.patch.object(build_site, "OUT", output):
                build_site.write_beginner_guide()
                build_site.write_foundry_pages()

            chapter = (
                output
                / "docs"
                / "beginners"
                / "19-foundry-authoring-and-domain-profiles.html"
            ).read_text(encoding="utf-8")
            self.assertIn(
                'href="../okf-authoring-prompt-kit.html"',
                chapter,
            )
            self.assertIn(
                'href="../../profile/authoring/v1/index.html"',
                chapter,
            )
            self.assertIn(
                'href="../prompts/okf-domain-warm-up.html"',
                chapter,
            )
            self.assertNotIn(
                'href="../okf-authoring-prompt-kit.md"',
                chapter,
            )

            kit = (
                output / "docs" / "okf-authoring-prompt-kit.html"
            ).read_text(encoding="utf-8")
            self.assertIn(
                'href="prompts/okf-domain-warm-up.html"',
                kit,
            )
            self.assertIn(
                'href="prompts/okf-bundle-build.html"',
                kit,
            )
            self.assertIn(
                'href="../profile/authoring/v1/index.html"',
                kit,
            )

            warm_up = (
                output / "docs" / "prompts" / "okf-domain-warm-up.html"
            ).read_text(encoding="utf-8")
            self.assertIn('href="okf-bundle-build.html"', warm_up)

            profile = (
                output / "profile" / "authoring" / "v1" / "index.html"
            ).read_text(encoding="utf-8")
            self.assertIn(
                'href="../../../docs/okf-authoring-prompt-kit.html"',
                profile,
            )

    def test_readable_dependency_closure_has_total_html_routes(self) -> None:
        routes = build_site.published_source_routes()
        self.assertGreaterEqual(len(routes), 200)
        self.assertEqual(len(routes), len(set(routes.values())))
        self.assertEqual(
            Path("catalogue/index.html"),
            routes[(build_site.ROOT / "index.md").resolve()],
        )
        expected = {
            "docs/repository-guide.md": "docs/repository-guide.html",
            "docs/uk-legislation/index.md": "docs/uk-legislation/index.html",
            "glossary/provenance.md": "glossary/provenance.html",
            "profiles/federation/v1/index.md": (
                "profile/federation/v1/index.html"
            ),
            "standards/dcat.md": "standards/dcat.html",
        }
        for source, route in expected.items():
            self.assertEqual(
                Path(route),
                routes[(build_site.ROOT / source).resolve()],
            )

        for source in build_site.readable_markdown_sources():
            for href in build_site.markdown_link_hrefs(source):
                parts = urlsplit(href)
                if (
                    parts.scheme
                    or parts.netloc
                    or not parts.path
                    or parts.path.startswith("/")
                    or not parts.path.lower().endswith(".md")
                ):
                    continue
                dependency = (source.parent / unquote(parts.path)).resolve()
                if dependency.is_file() and not (
                    build_site.is_excluded_markdown_dependency(dependency)
                ):
                    self.assertIn(
                        dependency,
                        routes,
                        f"{source.relative_to(build_site.ROOT)} -> {href}",
                    )

    def test_every_generated_reading_page_uses_html_navigation(self) -> None:
        with tempfile.TemporaryDirectory(
            prefix="okf-build-site-all-docs-"
        ) as temporary:
            output = Path(temporary)
            with mock.patch.object(build_site, "OUT", output):
                build_site.write_generic_reading_pages()
                build_site.write_beginner_guide()
                build_site.write_foundry_pages()

            for route in build_site.published_source_routes().values():
                page = output / route
                self.assertTrue(page.is_file(), route)
                parser = build_site.ReadingPageLinks()
                parser.feed(page.read_text(encoding="utf-8"))
                self.assertTrue(
                    any(
                        kind == "link[href]" and href.endswith(".md")
                        for kind, href in parser.references
                    ),
                    f"{route}: missing exact-build Markdown alternate",
                )
                for href in parser.hrefs:
                    parts = urlsplit(href)
                    if parts.scheme or parts.netloc:
                        continue
                    self.assertNotEqual(
                        ".md",
                        Path(unquote(parts.path)).suffix.lower(),
                        f"{route}: {href}",
                    )

            guide = (
                output / "docs" / "beginners" / "index.html"
            ).read_text(encoding="utf-8")
            self.assertIn('href="../repository-guide.html"', guide)
            self.assertIn('href="../okf-standards-crosswalk.html"', guide)
            self.assertIn('href="../../catalogue/index.html"', guide)

            chapter = (
                output
                / "docs"
                / "beginners"
                / "19-foundry-authoring-and-domain-profiles.html"
            ).read_text(encoding="utf-8")
            self.assertIn(
                'class="site-header__title" href="../../">OKF Explorer</a>',
                chapter,
            )
            self.assertIn(
                'href="../okf-authoring-prompt-kit.html#success-checklist"',
                chapter,
            )
            kit = (
                output / "docs" / "okf-authoring-prompt-kit.html"
            ).read_text(encoding="utf-8")
            self.assertIn(
                'class="site-header__title" href="../">OKF Explorer</a>',
                kit,
            )
            self.assertNotIn('href="../index.html"', kit)
            self.assertIn('id="success-checklist"', kit)

            generic = (
                output / "docs" / "heritage-evaluation-report.html"
            ).read_text(encoding="utf-8")
            self.assertIn(
                'class="site-header__title" href="../">OKF Explorer</a>',
                generic,
            )
            self.assertNotIn('href="../index.html"', generic)

    def test_readable_link_audit_rejects_local_markdown_navigation(self) -> None:
        with tempfile.TemporaryDirectory(
            prefix="okf-build-site-link-audit-"
        ) as temporary:
            output = Path(temporary)
            route = Path("docs/index.html")
            target = output / route
            target.parent.mkdir(parents=True)
            target.write_text(
                '<!doctype html><a href="repository-guide.md">Broken</a>',
                encoding="utf-8",
            )
            source = (build_site.ROOT / "docs" / "index.md").resolve()
            with (
                mock.patch.object(build_site, "OUT", output),
                mock.patch.object(
                    build_site,
                    "published_source_routes",
                    return_value={source: route},
                ),
                mock.patch.object(
                    build_site,
                    "readable_markdown_sources",
                    return_value=(source,),
                ),
            ):
                with self.assertRaisesRegex(
                    RuntimeError,
                    "internal Markdown navigation must use HTML",
                ):
                    build_site.assert_readable_document_links()

    def test_readable_link_audit_rejects_missing_script_resource(self) -> None:
        with tempfile.TemporaryDirectory(
            prefix="okf-build-site-resource-audit-"
        ) as temporary:
            output = Path(temporary)
            route = Path("docs/index.html")
            target = output / route
            target.parent.mkdir(parents=True)
            target.write_text(
                '<!doctype html><script src="missing.js"></script>',
                encoding="utf-8",
            )
            source = (build_site.ROOT / "docs" / "index.md").resolve()
            with (
                mock.patch.object(build_site, "OUT", output),
                mock.patch.object(
                    build_site,
                    "published_source_routes",
                    return_value={source: route},
                ),
                mock.patch.object(
                    build_site,
                    "readable_markdown_sources",
                    return_value=(source,),
                ),
            ):
                with self.assertRaisesRegex(
                    RuntimeError,
                    "missing local target missing.js",
                ):
                    build_site.assert_readable_document_links()

    def test_readable_link_audit_rejects_duplicate_html_ids(self) -> None:
        with tempfile.TemporaryDirectory(
            prefix="okf-build-site-id-audit-"
        ) as temporary:
            output = Path(temporary)
            route = Path("docs/index.html")
            target = output / route
            target.parent.mkdir(parents=True)
            target.write_text(
                '<!doctype html><h1 id="repeated">One</h1>'
                '<p id="repeated">Two</p>',
                encoding="utf-8",
            )
            source = (build_site.ROOT / "docs" / "index.md").resolve()
            with (
                mock.patch.object(build_site, "OUT", output),
                mock.patch.object(
                    build_site,
                    "published_source_routes",
                    return_value={source: route},
                ),
                mock.patch.object(
                    build_site,
                    "readable_markdown_sources",
                    return_value=(source,),
                ),
            ):
                with self.assertRaisesRegex(
                    RuntimeError,
                    "duplicate HTML id #repeated",
                ):
                    build_site.assert_readable_document_links()

    def test_heading_ids_are_stable_and_disambiguated(self) -> None:
        renderer = build_site.published_markdown_renderer()
        source = build_site.ROOT / "docs" / "index.md"
        rendered = renderer.render(
            "# Same Heading\n\n## Same Heading\n\n"
            "## Symbols, RDF & YAML-LD!\n",
            {
                "source": str(source),
                "output_route": "docs/index.html",
            },
        )
        self.assertIn('id="same-heading"', rendered)
        self.assertIn('id="same-heading-1"', rendered)
        self.assertIn('id="symbols-rdf-yaml-ld"', rendered)

    def test_foundry_rewriter_covers_docs_and_preserves_fragments(self) -> None:
        source = (
            build_site.ROOT
            / "docs"
            / "beginners"
            / "19-foundry-authoring-and-domain-profiles.md"
        )
        output = Path(
            "docs/beginners/"
            "19-foundry-authoring-and-domain-profiles.html"
        )
        self.assertEqual(
            "../okf-authoring-prompt-kit.html?mode=read#success-checklist",
            build_site.rewrite_published_href(
                "../okf-authoring-prompt-kit.md"
                "?mode=read#success-checklist",
                source,
                output,
            ),
        )
        self.assertEqual(
            "../repository-guide.html",
            build_site.rewrite_published_href(
                "../repository-guide.md",
                source,
                output,
            ),
        )
        self.assertEqual(
            "https://example.gov/guide.md",
            build_site.rewrite_published_href(
                "https://example.gov/guide.md",
                source,
                output,
            ),
        )
        self.assertEqual(
            "#local-section",
            build_site.rewrite_published_href(
                "#local-section",
                source,
                output,
            ),
        )

    def test_foundry_renderer_escapes_html_and_rejects_unsafe_links(self) -> None:
        renderer = build_site.foundry_markdown_renderer()
        rendered = renderer.render(
            "# Safe\n\n<script>alert('no')</script>\n\n"
            "[unsafe](javascript:alert('no'))\n",
            {
                "source": str(
                    build_site.ROOT
                    / "docs"
                    / "okf-authoring-prompt-kit.md"
                ),
                "output_route": "docs/okf-authoring-prompt-kit.html",
            },
        )
        self.assertIn("&lt;script&gt;", rendered)
        self.assertNotIn("<script>", rendered)
        self.assertNotIn('href="javascript:', rendered)

    def test_foundry_kit_contains_ai_neutral_success_procedure(self) -> None:
        source = (
            build_site.ROOT / "docs" / "okf-authoring-prompt-kit.md"
        ).read_text(encoding="utf-8")
        required_phrases = [
            "Use This With Any Capable AI",
            "Never put secrets in a prompt",
            "blocking_for_build: true",
            "positive/negative fixture",
            "`consumer-lock.json`",
            "dependency/impact graph",
            "actual locked consumers",
            "selective reruns",
            "compatibility passes in both directions",
            "deployed consumer deep links",
            "Success Checklist",
            "byte-identical",
        ]
        for phrase in required_phrases:
            self.assertIn(phrase, source)

        script = build_site.FOUNDRY_JS.read_text(encoding="utf-8")
        self.assertIn("navigator.clipboard.writeText(source.value)", script)
        self.assertIn('document.execCommand("copy")', script)
        self.assertNotIn("innerHTML", script)


if __name__ == "__main__":
    unittest.main()
