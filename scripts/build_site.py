#!/usr/bin/env python3
"""Build the GitHub Pages static site into _site/."""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import posixpath
import re
import shutil
import subprocess
from contextlib import contextmanager
from functools import lru_cache
from html.parser import HTMLParser
from pathlib import Path
from typing import Callable, Iterator
from urllib.parse import quote, unquote, urlsplit, urlunsplit

import build_okf_bundle
import site_component_cache
from markdown_it import MarkdownIt

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "_site"
GITHUB_PAGES_SITE_LIMIT_BYTES = 1_000_000_000
BEGINNER_DOCS = ROOT / "docs" / "beginners"
BEGINNER_GUIDE_CSS = BEGINNER_DOCS / "guide.css"
FOUNDRY_CSS = ROOT / "docs" / "foundry.css"
FOUNDRY_JS = ROOT / "docs" / "foundry.js"
FOUNDRY_PAGES = (
    (
        ROOT / "docs" / "okf-authoring-prompt-kit.md",
        Path("docs/okf-authoring-prompt-kit.html"),
        "Prompt kit",
    ),
    (
        ROOT / "docs" / "prompts" / "okf-domain-warm-up.md",
        Path("docs/prompts/okf-domain-warm-up.html"),
        "1. Domain warm-up",
    ),
    (
        ROOT / "docs" / "prompts" / "okf-bundle-build.md",
        Path("docs/prompts/okf-bundle-build.html"),
        "2. Build and publish",
    ),
    (
        ROOT / "docs" / "prompts" / "domain-profile-examples.md",
        Path("docs/prompts/domain-profile-examples.html"),
        "Worked examples",
    ),
    (
        ROOT / "profiles" / "authoring" / "v1" / "index.md",
        Path("profile/authoring/v1/index.html"),
        "Authoring profile",
    ),
)
FOUNDRY_PROMPT_SOURCES = {
    (ROOT / "docs" / "prompts" / "okf-domain-warm-up.md").resolve(),
    (ROOT / "docs" / "prompts" / "okf-bundle-build.md").resolve(),
}
COPY_READY_PROMPT = re.compile(
    r"^```text[ \t]*\n(?P<prompt>.*?)^```[ \t]*$",
    flags=re.MULTILINE | re.DOTALL,
)
SVELTE_EXPLORER_BUILD = ROOT / "apps" / "okf-explorer" / "build"
EXPLORER_BUILD_MANIFEST = "okf-explorer-build-manifest.json"
SITE_TREE_ALGORITHM = (
    "sha256-over-canonical-json-path-bytes-digest-list-"
    "excluding-receipt-v1"
)
HERITAGE_LOCAL_CANDIDATE_RECEIPT = Path(
    "evaluation-foundry",
    "fixtures",
    "heritage-warwickshire",
    "evidence",
    "local-candidate-receipt.json",
)
PROMOTION_ENVELOPE = Path(
    "release-assurance",
    "heritage-publication-envelope.json",
)
ASSEMBLED_SITE_VERIFIER = (
    ROOT
    / "apps"
    / "okf-explorer"
    / "scripts"
    / "verify_assembled_site.mjs"
)
PUBLIC_ROOT_FILES = [
    "viewer.html",
    "view.html",
    "index.md",
    "sources-index.md",
    "log.md",
    "okf.config.json",
    "okf-bundle.yamlld",
    "okf-bundle.jsonld",
    "okf-registry.json",
    "okf-registry.jsonld",
    "README.md",
    "PUBLICATION.md",
    "LICENSE.md",
    "LICENSE-CODE.md",
    "CITATION.cff",
]
PUBLIC_DIRS = [
    "document",
    "federated",
    "frameworks",
    "glossary",
    "organisations",
    "research",
    "stack",
    "standards",
    "sources",
    "uk-government",
    "uk-government-apis",
    "legislation",
    "evaluation",
    "evaluation-foundry",
    "release-assurance",
    "explorer",
    "docs",
    "profiles",
    "registry",
    "constraints",
    "publication-units",
]
MARKDOWN_DISCOVERY_ROOTS = ("docs", "profiles", "evaluation-foundry", "evaluation")
MARKDOWN_DISCOVERY_EXCLUDED_DIRS = {"uk-government-apis"}
GITHUB_REPOSITORY = "https://github.com/chris-page-gov/okf-explorer"
FORBIDDEN_NAMES = {".DS_Store"}
FORBIDDEN_SUFFIXES = {".pyc"}
SITE_COMPONENTS = ("data", "shell", "docs", "app")
DEFAULT_SITE_COMPONENT_CACHE = ROOT / ".site-components"
SITE_COMPONENT_OVERRIDE_OWNERS = {
    "404.html": "app",
    "okf-registry.json": "app",
}
PUBLICATION_UNIT_DESCRIPTOR = (
    ROOT
    / "publication-units"
    / "heritage-coventry-warwickshire"
    / "publication-unit.json"
)


@lru_cache(maxsize=1)
def externalized_publication_mappings() -> tuple[dict[str, str], ...]:
    """Return immutable source-to-public mappings for external data units."""

    descriptor = json.loads(PUBLICATION_UNIT_DESCRIPTOR.read_text(encoding="utf-8"))
    base_url = descriptor["publication"]["pages_base_url"]
    mappings = []
    for material in descriptor["materials"]:
        if material["role"] not in {"corpus", "fixture"}:
            continue
        mappings.append(
            {
                "source": material["source"].rstrip("/"),
                "target": material["target"].rstrip("/"),
                "base_url": base_url,
            }
        )
    return tuple(mappings)


def externalized_publication_target(relative: Path) -> str | None:
    value = relative.as_posix()
    for mapping in externalized_publication_mappings():
        source = mapping["source"]
        if value != source and not value.startswith(f"{source}/"):
            continue
        suffix = value.removeprefix(source).lstrip("/")
        target = mapping["target"]
        path = posixpath.join(target, suffix) if target not in {"", "."} else suffix
        return f"{mapping['base_url']}{path}"
    return None


def beginner_sources() -> list[Path]:
    chapters = sorted(
        path
        for path in BEGINNER_DOCS.glob("*.md")
        if re.match(r"^\d{2}-", path.name)
    )
    index = BEGINNER_DOCS / "index.md"
    return ([index] if index.exists() else []) + chapters


def markdown_link_hrefs(source: Path) -> list[str]:
    renderer = MarkdownIt(
        "commonmark",
        {"html": False, "breaks": False, "typographer": False},
    ).enable(["table", "strikethrough"])
    hrefs: list[str] = []

    def collect(tokens) -> None:
        for token in tokens:
            if token.type == "link_open":
                href = token.attrGet("href")
                if href:
                    hrefs.append(href)
            if token.children:
                collect(token.children)

    collect(renderer.parse(source.read_text(encoding="utf-8")))
    return hrefs


def is_excluded_markdown_dependency(source: Path) -> bool:
    try:
        relative = source.resolve().relative_to(ROOT.resolve())
    except ValueError:
        return True
    return bool(
        (
            relative.parts
            and relative.parts[0] in MARKDOWN_DISCOVERY_EXCLUDED_DIRS
        )
        or is_ephemeral_evaluation_result(relative)
    )


def is_ephemeral_evaluation_result(relative: Path) -> bool:
    """Return true for ignored evaluator output in corpus or Foundry results."""

    return (
        (
            len(relative.parts) >= 3
            and relative.parts[0] == "evaluation"
            and relative.parts[2] == "results"
        )
        or (
            len(relative.parts) >= 4
            and relative.parts[:2] == ("evaluation-foundry", "fixtures")
            and relative.parts[3] == "results"
        )
    )


@lru_cache(maxsize=1)
def readable_markdown_sources() -> tuple[Path, ...]:
    """Return the bounded Markdown dependency closure for public reading pages."""

    pending = sorted(
        {
            source.resolve()
            for dirname in MARKDOWN_DISCOVERY_ROOTS
            for source in (ROOT / dirname).rglob("*.md")
        }
    )
    discovered: set[Path] = set()
    while pending:
        source = pending.pop()
        if source in discovered:
            continue
        if not source.is_file() or is_excluded_markdown_dependency(source):
            continue
        discovered.add(source)
        for href in markdown_link_hrefs(source):
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
            try:
                dependency.relative_to(ROOT.resolve())
            except ValueError:
                continue
            if (
                dependency.is_file()
                and dependency not in discovered
                and not is_excluded_markdown_dependency(dependency)
            ):
                pending.append(dependency)
    return tuple(sorted(discovered))


def default_readable_route(source: Path) -> Path:
    relative = source.resolve().relative_to(ROOT.resolve())
    if relative == Path("index.md"):
        return Path("catalogue/index.html")
    if relative.parts and relative.parts[0] == "profiles":
        relative = Path("profile", *relative.parts[1:])
    return relative.with_suffix(".html")


def markdown_title(source: Path) -> str:
    markdown = source.read_text(encoding="utf-8")
    frontmatter, body = split_frontmatter(markdown)
    if frontmatter:
        title_match = re.search(
            r'^title:\s*["\']?(.*?)["\']?\s*$',
            frontmatter,
            flags=re.MULTILINE,
        )
        if title_match:
            return title_match.group(1)
    match = re.search(
        r"^#\s+(.+?)\s*$",
        body,
        flags=re.MULTILINE,
    )
    if match:
        return match.group(1)
    return source.stem.replace("-", " ").title()


@lru_cache(maxsize=1)
def published_source_routes() -> dict[Path, Path]:
    routes = {
        source: default_readable_route(source)
        for source in readable_markdown_sources()
    }
    routes.update(
        {
            source.resolve(): target
            for source, target, _label in FOUNDRY_PAGES
        }
    )
    routes.update(
        {
            source.resolve(): (
                Path("docs")
                / "beginners"
                / source.with_suffix(".html").name
            )
            for source in beginner_sources()
        }
    )
    sources_by_route: dict[Path, Path] = {}
    collisions: list[tuple[Path, Path, Path]] = []
    for source, route in routes.items():
        previous = sources_by_route.setdefault(route, source)
        if previous != source:
            collisions.append((route, previous, source))
    if collisions:
        details = "\n".join(
            f"- {route}: {first.relative_to(ROOT)} and {second.relative_to(ROOT)}"
            for route, first, second in collisions
        )
        raise RuntimeError(f"published documentation route collision:\n{details}")
    return routes


def published_reading_routes() -> set[Path]:
    routes = set(published_source_routes().values())
    routes.update(
        source.relative_to(ROOT).with_suffix(".html")
        for source in readable_markdown_sources()
        if source.relative_to(ROOT).parts[0] == "profiles"
    )
    return routes


def relative_site_href(source_route: Path, target_route: Path) -> str:
    return posixpath.relpath(
        target_route.as_posix(),
        start=source_route.parent.as_posix(),
    )


def relative_site_directory_href(
    source_route: Path,
    target_directory: Path,
) -> str:
    """Return a relative directory URL with browser-significant trailing slash."""
    href = relative_site_href(source_route, target_directory)
    return f"{href.rstrip('/')}/"


def rewrite_published_href(
    href: str,
    source: Path,
    output_route: Path,
    *,
    repository_asset: bool = False,
) -> str:
    parts = urlsplit(href)
    if parts.scheme or parts.netloc or not parts.path or parts.path.startswith("/"):
        return href
    candidate = (source.parent / unquote(parts.path)).resolve()
    target_route = published_source_routes().get(candidate)
    if target_route is not None:
        return urlunsplit(
            (
                "",
                "",
                relative_site_href(output_route, target_route),
                parts.query,
                parts.fragment,
            )
        )
    try:
        relative = candidate.relative_to(ROOT.resolve())
    except ValueError:
        return href
    external = externalized_publication_target(relative)
    if external is not None:
        external_parts = urlsplit(external)
        external_path = external_parts.path
        if candidate.suffix.lower() == ".md":
            external_path = str(Path(external_path).with_suffix(".html"))
        return urlunsplit(
            (
                external_parts.scheme,
                external_parts.netloc,
                external_path,
                parts.query,
                parts.fragment,
            )
        )
    if candidate.is_file() and not repository_source_is_copied_to_site(relative):
        repository_url = (
            github_raw_url(candidate)
            if repository_asset
            else github_source_url(candidate)
        )
        return urlunsplit(
            (*urlsplit(repository_url)[:3], parts.query, parts.fragment)
        )
    return href


def repository_source_is_copied_to_site(relative: Path) -> bool:
    """Return whether a repository path is materialized at its Site path."""

    if not is_component_source_allowed(relative):
        return False
    if externalized_publication_target(relative) is not None:
        return False
    if len(relative.parts) == 1:
        return relative.as_posix() in PUBLIC_ROOT_FILES
    return relative.parts[0] in PUBLIC_DIRS


def rewrite_beginner_href(href: str, source: Path) -> str:
    output_route = (
        Path("docs")
        / "beginners"
        / source.with_suffix(".html").name
    )
    return rewrite_published_href(href, source, output_route)


def heading_slug(label: str) -> str:
    normalized = "".join(
        character
        for character in html.unescape(label).casefold()
        if character.isalnum() or character in {" ", "-", "_"}
    )
    slug = re.sub(r"-+", "-", re.sub(r"\s+", "-", normalized)).strip("-")
    return slug or "section"


def published_markdown_renderer() -> MarkdownIt:
    renderer = MarkdownIt(
        "commonmark",
        {"html": False, "breaks": False, "typographer": False},
    ).enable(["table", "strikethrough"])

    def rewrite_attribute(
        tokens,
        index,
        env,
        attribute,
        *,
        repository_asset=False,
    ):
        source = env.get("source")
        output_route = env.get("output_route")
        href = tokens[index].attrGet(attribute)
        if source and output_route and href:
            tokens[index].attrSet(
                attribute,
                rewrite_published_href(
                    href,
                    Path(source),
                    Path(output_route),
                    repository_asset=repository_asset,
                ),
            )

    def render_link_open(tokens, index, options, env):
        rewrite_attribute(tokens, index, env, "href")
        return renderer.renderer.renderToken(tokens, index, options, env)

    default_image_renderer = renderer.renderer.rules["image"]

    def render_image(tokens, index, options, env):
        rewrite_attribute(
            tokens,
            index,
            env,
            "src",
            repository_asset=True,
        )
        return default_image_renderer(tokens, index, options, env)

    def render_heading_open(tokens, index, options, env):
        inline = tokens[index + 1] if index + 1 < len(tokens) else None
        label = inline.content if inline and inline.type == "inline" else "section"
        base = heading_slug(label)
        counts = env.setdefault("_heading_slug_counts", {})
        occurrence = counts.get(base, 0)
        counts[base] = occurrence + 1
        identifier = base if occurrence == 0 else f"{base}-{occurrence}"
        tokens[index].attrSet("id", identifier)
        return renderer.renderer.renderToken(tokens, index, options, env)

    def render_table_open(_tokens, _index, _options, _env):
        return '<div class="table-scroll"><table>\n'

    def render_table_close(_tokens, _index, _options, _env):
        return "</table></div>\n"

    renderer.renderer.rules["link_open"] = render_link_open
    renderer.renderer.rules["image"] = render_image
    renderer.renderer.rules["heading_open"] = render_heading_open
    renderer.renderer.rules["table_open"] = render_table_open
    renderer.renderer.rules["table_close"] = render_table_close
    return renderer


def beginner_markdown_renderer() -> MarkdownIt:
    return published_markdown_renderer()


def render_beginner_page(
    source: Path,
    sources: list[Path],
    titles: dict[Path, str],
) -> str:
    markdown = source.read_text(encoding="utf-8")
    output_route = (
        Path("docs")
        / "beginners"
        / source.with_suffix(".html").name
    )
    body = beginner_markdown_renderer().render(
        markdown,
        {"source": str(source), "output_route": str(output_route)},
    )
    current_index = sources.index(source)

    sidebar_items = []
    for item in sources:
        current = ' aria-current="page"' if item == source else ""
        label = "Guide overview" if item.name == "index.md" else titles[item]
        sidebar_items.append(
            f'<li><a href="{html.escape(item.with_suffix(".html").name, quote=True)}"'
            f'{current}>{html.escape(label)}</a></li>'
        )

    previous = sources[current_index - 1] if current_index > 0 else None
    following = (
        sources[current_index + 1]
        if current_index + 1 < len(sources)
        else None
    )
    chapter_links = []
    if previous:
        previous_href = html.escape(
            previous.with_suffix(".html").name,
            quote=True,
        )
        chapter_links.append(
            f'<a rel="prev" href="{previous_href}">'
            f'<span>Previous</span><strong>{html.escape(titles[previous])}</strong></a>'
        )
    if following:
        following_href = html.escape(
            following.with_suffix(".html").name,
            quote=True,
        )
        chapter_links.append(
            f'<a rel="next" href="{following_href}">'
            f'<span>Next</span><strong>{html.escape(titles[following])}</strong></a>'
        )

    title = titles[source]
    source_href = html.escape(github_source_url(source), quote=True)
    markdown_alternate_href = html.escape(
        relative_site_href(output_route, source.relative_to(ROOT)),
        quote=True,
    )
    favicon_href = html.escape(
        relative_site_href(output_route, Path("favicon.svg")),
        quote=True,
    )
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>{html.escape(title)} · OKF Explorer</title>
<link rel="canonical" href="{html.escape(canonical_page_url(output_route), quote=True)}">
<link rel="alternate" type="text/markdown" href="{markdown_alternate_href}"
  title="Markdown source">
<link rel="icon" type="image/svg+xml" href="{favicon_href}">
<link rel="stylesheet" href="guide.css">
</head>
<body>
<a class="skip-link" href="#main-content">Skip to the guide</a>
<header class="site-header">
  <div class="site-header__inner">
    <a class="site-header__title" href="../../">OKF Explorer</a>
    <span class="site-header__meta">Beginner learning path</span>
  </div>
</header>
<div class="guide-layout">
  <aside class="guide-sidebar">
    <nav aria-label="Beginner guide chapters">
      <h2>Learning path</h2>
      <ol>{"".join(sidebar_items)}</ol>
    </nav>
  </aside>
  <main class="guide-main" id="main-content" tabindex="-1">
    <article class="guide-content">
{body}
    </article>
    <nav class="chapter-nav" aria-label="Previous and next chapters">
      {"".join(chapter_links)}
    </nav>
    <footer class="guide-footer">
      <p><a href="{source_href}">View source on GitHub</a>
      or return to the <a href="../../">OKF Explorer</a>.</p>
    </footer>
  </main>
</div>
</body>
</html>
"""


def write_beginner_guide() -> None:
    sources = beginner_sources()
    if not sources:
        return
    target_dir = OUT / "docs" / "beginners"
    target_dir.mkdir(parents=True, exist_ok=True)
    titles = {source: markdown_title(source) for source in sources}
    for source in sources:
        target = target_dir / source.with_suffix(".html").name
        if target.exists():
            raise RuntimeError(
                "rendered documentation would overwrite "
                f"{target.relative_to(OUT)}"
            )
        target.write_text(
            render_beginner_page(source, sources, titles),
            encoding="utf-8",
        )
    copy_file(BEGINNER_GUIDE_CSS, target_dir / "guide.css")


def foundry_markdown_renderer() -> MarkdownIt:
    return published_markdown_renderer()


def extract_copy_ready_prompt(
    markdown: str,
) -> tuple[str, str, str] | None:
    match = COPY_READY_PROMPT.search(markdown)
    if match is None:
        return None
    return (
        markdown[: match.start()],
        match.group("prompt"),
        markdown[match.end() :],
    )


def demote_prompt_headings(markdown: str) -> str:
    return re.sub(
        r"^(#{1,5})([ \t]+)",
        lambda match: f"#{match.group(1)}{match.group(2)}",
        markdown,
        flags=re.MULTILINE,
    )


def canonical_page_url(target: Path) -> str:
    base = "https://chris-page-gov.github.io/okf-explorer/"
    if target.name == "index.html":
        parent = target.parent.as_posix()
        return f"{base}{parent}/" if parent != "." else base
    return f"{base}{target.as_posix()}"


def canonical_foundry_url(target: Path) -> str:
    return canonical_page_url(target)


def github_source_url(source: Path) -> str:
    relative = source.resolve().relative_to(ROOT.resolve()).as_posix()
    return f"{GITHUB_REPOSITORY}/blob/main/{quote(relative, safe='/')}"


def github_raw_url(source: Path) -> str:
    relative = source.resolve().relative_to(ROOT.resolve()).as_posix()
    return (
        "https://raw.githubusercontent.com/chris-page-gov/okf-explorer/"
        f"main/{quote(relative, safe='/')}"
    )


def split_frontmatter(markdown: str) -> tuple[str | None, str]:
    if not markdown.startswith("---\n"):
        return None, markdown
    end = markdown.find("\n---\n", 4)
    if end == -1:
        return None, markdown
    return markdown[4:end], markdown[end + 5 :]


def documentation_navigation(target: Path) -> str:
    routes = published_source_routes()
    items = (
        ("Documentation", routes[(ROOT / "docs" / "index.md").resolve()]),
        (
            "Beginner guide",
            routes[(ROOT / "docs" / "beginners" / "index.md").resolve()],
        ),
        (
            "Foundry prompt kit",
            routes[(ROOT / "docs" / "okf-authoring-prompt-kit.md").resolve()],
        ),
        (
            "Bundle authoring",
            routes[(ROOT / "docs" / "okf-bundle-authoring.md").resolve()],
        ),
    )
    links = []
    for label, route in items:
        current = ' aria-current="page"' if route == target else ""
        href = html.escape(relative_site_href(target, route), quote=True)
        links.append(
            f'<li><a href="{href}"{current}>{html.escape(label)}</a></li>'
        )
    return "".join(links)


def render_generic_page(source: Path, target: Path) -> str:
    markdown = source.read_text(encoding="utf-8")
    frontmatter, body_markdown = split_frontmatter(markdown)
    title = markdown_title(source)
    if not re.search(r"^#\s+", body_markdown, flags=re.MULTILINE):
        body_markdown = f"# {title}\n\n{body_markdown.lstrip()}"
    body = published_markdown_renderer().render(
        body_markdown,
        {"source": str(source), "output_route": str(target)},
    )
    metadata = ""
    if frontmatter:
        metadata = (
            '<details class="source-metadata">'
            "<summary>Record metadata</summary>"
            f"<pre><code>{html.escape(frontmatter)}</code></pre>"
            "</details>"
        )

    stylesheet_href = html.escape(
        relative_site_href(target, Path("docs/beginners/guide.css")),
        quote=True,
    )
    navigation_stylesheet_href = html.escape(
        relative_site_href(target, Path("docs/foundry.css")),
        quote=True,
    )
    favicon_href = html.escape(
        relative_site_href(target, Path("favicon.svg")),
        quote=True,
    )
    explorer_href = html.escape(
        relative_site_directory_href(target, Path(".")),
        quote=True,
    )
    source_href = html.escape(github_source_url(source), quote=True)
    markdown_alternate_href = html.escape(
        relative_site_href(target, source.relative_to(ROOT.resolve())),
        quote=True,
    )
    relative = source.resolve().relative_to(ROOT.resolve())
    page_kind = (
        "OKF Explorer documentation"
        if relative.parts and relative.parts[0] == "docs"
        else "OKF knowledge page"
    )
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>{html.escape(title)} · OKF Explorer</title>
<link rel="canonical" href="{html.escape(canonical_page_url(target), quote=True)}">
<link rel="alternate" type="text/markdown" href="{markdown_alternate_href}"
  title="Markdown source">
<link rel="icon" type="image/svg+xml" href="{favicon_href}">
<link rel="stylesheet" href="{stylesheet_href}">
<link rel="stylesheet" href="{navigation_stylesheet_href}">
</head>
<body>
<a class="skip-link" href="#main-content">Skip to the documentation</a>
<header class="site-header">
  <div class="site-header__inner">
    <a class="site-header__title" href="{explorer_href}">OKF Explorer</a>
    <span class="site-header__meta">{html.escape(page_kind)}</span>
  </div>
</header>
<nav class="foundry-nav" aria-label="Documentation">
  <ol>{documentation_navigation(target)}</ol>
</nav>
<main class="guide-main foundry-main" id="main-content" tabindex="-1">
  <article class="guide-content">
{metadata}
{body}
  </article>
  <footer class="guide-footer">
    <p><a href="{source_href}">View source on GitHub</a>
    or return to the <a href="{explorer_href}">OKF Explorer</a>.</p>
  </footer>
</main>
</body>
</html>
"""


def render_foundry_page(
    source: Path,
    target: Path,
    label: str,
) -> tuple[str, str | None]:
    markdown = source.read_text(encoding="utf-8")
    renderer = foundry_markdown_renderer()
    env = {"source": str(source), "output_route": str(target)}
    extracted = (
        extract_copy_ready_prompt(markdown)
        if source.resolve() in FOUNDRY_PROMPT_SOURCES
        else None
    )
    prompt_text: str | None = None
    if extracted is None:
        body = renderer.render(markdown, env)
    else:
        before_prompt, prompt_text, after_prompt = extracted
        body = renderer.render(before_prompt, env)
        prompt_body = renderer.render(
            demote_prompt_headings(prompt_text),
            env,
        )
        plain_text_href = html.escape(
            target.with_suffix(".txt").name,
            quote=True,
        )
        prompt_source = html.escape(prompt_text, quote=False)
        body += f"""
<section class="prompt-publication" aria-labelledby="formatted-prompt-heading">
  <div class="prompt-actions">
    <button type="button" class="copy-prompt" data-copy-target="copy-ready-prompt-source"
      aria-describedby="copy-prompt-help">Copy full prompt</button>
    <a class="secondary-action" href="{plain_text_href}" download>Download plain text</a>
  </div>
  <p id="copy-prompt-help" class="prompt-help">
    Copies the exact prompt, including its placeholders, without this page's controls.
  </p>
  <p id="copy-prompt-status" class="copy-status" role="status" aria-live="polite"></p>
  <textarea id="copy-ready-prompt-source" class="copy-source" hidden
    aria-hidden="true" tabindex="-1">{prompt_source}</textarea>
  <div class="formatted-prompt">
    <h2 id="formatted-prompt-heading">Formatted prompt</h2>
{prompt_body}
  </div>
</section>
"""
        body += renderer.render(after_prompt, env)

    navigation = []
    for nav_source, nav_target, nav_label in FOUNDRY_PAGES:
        current = ' aria-current="page"' if nav_source == source else ""
        href = html.escape(
            relative_site_href(target, nav_target),
            quote=True,
        )
        navigation.append(
            f'<li><a href="{href}"{current}>'
            f"{html.escape(nav_label)}</a></li>"
        )

    stylesheet_href = html.escape(
        relative_site_href(
            target,
            Path("docs/beginners/guide.css"),
        ),
        quote=True,
    )
    foundry_stylesheet_href = html.escape(
        relative_site_href(target, Path("docs/foundry.css")),
        quote=True,
    )
    script_href = html.escape(
        relative_site_href(target, Path("docs/foundry.js")),
        quote=True,
    )
    favicon_href = html.escape(
        relative_site_href(target, Path("favicon.svg")),
        quote=True,
    )
    explorer_href = html.escape(
        relative_site_directory_href(target, Path(".")),
        quote=True,
    )
    source_markdown_href = html.escape(github_source_url(source), quote=True)
    markdown_alternate_href = html.escape(
        relative_site_href(target, source.relative_to(ROOT)),
        quote=True,
    )
    title = markdown_title(source)
    return (
        f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>{html.escape(title)} · OKF Foundry</title>
<link rel="canonical" href="{html.escape(canonical_foundry_url(target), quote=True)}">
<link rel="alternate" type="text/markdown" href="{markdown_alternate_href}"
  title="Markdown source">
<link rel="icon" type="image/svg+xml" href="{favicon_href}">
<link rel="stylesheet" href="{stylesheet_href}">
<link rel="stylesheet" href="{foundry_stylesheet_href}">
<script src="{script_href}" defer></script>
</head>
<body>
<a class="skip-link" href="#main-content">Skip to the documentation</a>
<header class="site-header">
  <div class="site-header__inner">
    <a class="site-header__title" href="{explorer_href}">OKF Explorer</a>
    <span class="site-header__meta">OKF Foundry documentation</span>
  </div>
</header>
<nav class="foundry-nav" aria-label="OKF Foundry documentation">
  <ol>{"".join(navigation)}</ol>
</nav>
<main class="guide-main foundry-main" id="main-content" tabindex="-1">
  <article class="guide-content">
{body}
  </article>
  <footer class="guide-footer">
    <p><a href="{source_markdown_href}">View source on GitHub</a>
    or return to the <a href="{explorer_href}">OKF Explorer</a>.</p>
    <p>Profile status: experimental production profile, 27 July 2026.</p>
  </footer>
</main>
</body>
</html>
""",
        prompt_text,
    )


def write_foundry_pages() -> None:
    for source, target, label in FOUNDRY_PAGES:
        rendered, prompt_text = render_foundry_page(
            source,
            target,
            label,
        )
        output = OUT / target
        output.parent.mkdir(parents=True, exist_ok=True)
        if output.exists():
            raise RuntimeError(
                f"rendered documentation would overwrite {target}"
            )
        output.write_text(rendered, encoding="utf-8")
        if prompt_text is not None:
            output.with_suffix(".txt").write_text(
                prompt_text,
                encoding="utf-8",
            )

    canonical_profile = OUT / "profile" / "authoring" / "v1" / "index.html"
    compatibility_profile = (
        OUT / "profiles" / "authoring" / "v1" / "index.html"
    )
    if compatibility_profile.exists():
        raise RuntimeError(
            "rendered documentation would overwrite "
            "profiles/authoring/v1/index.html"
        )
    copy_file(canonical_profile, compatibility_profile)


def render_external_publication_compatibility(
    source: Path,
    target: Path,
) -> tuple[str, str]:
    relative = source.resolve().relative_to(ROOT.resolve())
    external_source = externalized_publication_target(relative)
    if external_source is None:
        raise ValueError(f"source is not externally published: {relative}")
    # pathlib preserves the https:/ spelling poorly, so only transform the URL path.
    parts = urlsplit(external_source)
    external_html = urlunsplit(
        (
            parts.scheme,
            parts.netloc,
            str(Path(parts.path).with_suffix(".html")),
            parts.query,
            parts.fragment,
        )
    )
    title = markdown_title(source)
    favicon_href = html.escape(
        relative_site_href(target, Path("favicon.svg")),
        quote=True,
    )
    page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)} · external OKF publication</title>
<link rel="canonical" href="{html.escape(external_html, quote=True)}">
<link rel="alternate" type="text/markdown" href="{html.escape(external_source, quote=True)}">
<link rel="icon" type="image/svg+xml" href="{favicon_href}">
<meta http-equiv="refresh" content="0; url={html.escape(external_html, quote=True)}">
</head>
<body>
<main id="main-content">
<h1>{html.escape(title)}</h1>
<p>This large exemplar now has its own publication unit.</p>
<p><a href="{html.escape(external_html, quote=True)}">Open the external reading page</a>.</p>
</main>
</body>
</html>
"""
    markdown = (
        f"# {title}\n\n"
        "This large exemplar now has its own publication unit.\n\n"
        f"[Open the external reading page]({external_html}).\n"
    )
    return page, markdown


def write_generic_reading_pages() -> None:
    specialised = {source.resolve() for source in beginner_sources()}
    specialised.update(
        source.resolve() for source, _target, _label in FOUNDRY_PAGES
    )
    routes = published_source_routes()
    for source in readable_markdown_sources():
        if source in specialised:
            continue
        target = routes[source]
        output = OUT / target
        output.parent.mkdir(parents=True, exist_ok=True)
        if output.exists():
            raise RuntimeError(
                f"rendered documentation would overwrite {target}"
            )
        relative = source.relative_to(ROOT.resolve())
        if externalized_publication_target(relative) is not None:
            rendered, markdown = render_external_publication_compatibility(
                source,
                target,
            )
            output.write_text(rendered, encoding="utf-8")
            raw_output = OUT / relative
            raw_output.parent.mkdir(parents=True, exist_ok=True)
            raw_output.write_text(markdown, encoding="utf-8")
        else:
            output.write_text(
                render_generic_page(source, target),
                encoding="utf-8",
            )
        if relative.parts and relative.parts[0] == "profiles":
            compatibility = OUT / relative.with_suffix(".html")
            if compatibility.exists():
                raise RuntimeError(
                    "rendered documentation would overwrite "
                    f"{compatibility.relative_to(OUT)}"
                )
            copy_file(output, compatibility)


def render_next_redirect() -> str:
    return """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>OKF Explorer</title>
<script>
const target = new URL("../", window.location.href);
target.search = window.location.search;
target.hash = window.location.hash;
window.location.replace(target);
</script>
<meta http-equiv="refresh" content="0; url=../">
</head>
<body>
<p>Opening <a href="../">OKF Explorer</a>.</p>
</body>
</html>
"""


def render_retiring_service_worker() -> str:
    return """self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("okf-explorer-")).map(key => caches.delete(key)));
    await self.registration.unregister();
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  if (event.request.method === "GET") event.respondWith(fetch(event.request));
});
"""


def copy_file(source: Path, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)


def copy_public_tree(
    source_dir: Path,
    target_dir: Path,
    *,
    include: Callable[[Path], bool] | None = None,
) -> None:
    for source in source_dir.rglob("*"):
        if source.is_dir():
            continue
        relative_to_source = source.relative_to(source_dir)
        if include is not None and not include(relative_to_source):
            continue
        try:
            relative_to_root = source.resolve().relative_to(ROOT.resolve())
        except ValueError:
            relative_to_root = Path()
        if is_ephemeral_evaluation_result(relative_to_root):
            continue
        if source.name in FORBIDDEN_NAMES or source.name.startswith("~$"):
            continue
        if source.suffix.lower() in FORBIDDEN_SUFFIXES:
            continue
        copy_file(source, target_dir / relative_to_source)


def assert_no_forbidden_files() -> None:
    errors: list[str] = []
    for path in OUT.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(OUT).as_posix()
        if path.name in FORBIDDEN_NAMES or path.name.startswith("~$"):
            errors.append(rel)
        if path.suffix.lower() in FORBIDDEN_SUFFIXES:
            errors.append(rel)
        if path.relative_to(OUT) == PROMOTION_ENVELOPE:
            errors.append(
                f"{rel} (promotion observations must remain outside Site bytes)"
            )
        if is_mutable_evaluation_evidence(path.relative_to(OUT)):
            errors.append(
                f"{rel} (mutable evaluation evidence must remain outside Site bytes)"
            )
    if errors:
        joined = "\n".join(f"- {error}" for error in errors)
        raise RuntimeError(f"forbidden files in site build:\n{joined}")


def published_site_inventory() -> tuple[int, int]:
    """Return one file-count and byte-size observation of the built Site."""

    files = [
        path
        for path in OUT.rglob("*")
        if path.is_file()
        and path.name not in FORBIDDEN_NAMES
        and not path.name.startswith("~$")
        and path.suffix.lower() not in FORBIDDEN_SUFFIXES
    ]
    return len(files), sum(path.stat().st_size for path in files)


def published_site_tree_receipt() -> dict[str, object]:
    """Root every publishable Site file except this self-binding receipt."""

    entries: list[dict[str, object]] = []
    for path in sorted(
        OUT.rglob("*"),
        key=lambda value: value.relative_to(OUT).as_posix(),
    ):
        if (
            not path.is_file()
            or path.name in FORBIDDEN_NAMES
            or path.name.startswith("~$")
            or path.suffix.lower() in FORBIDDEN_SUFFIXES
        ):
            continue
        relative = path.relative_to(OUT)
        if relative == HERITAGE_LOCAL_CANDIDATE_RECEIPT:
            continue
        raw = path.read_bytes()
        entries.append(
            {
                "path": relative.as_posix(),
                "bytes": len(raw),
                "sha256": sha256_bytes(raw),
            }
        )
    canonical = (
        json.dumps(
            entries,
            ensure_ascii=False,
            separators=(",", ":"),
            sort_keys=True,
        )
        + "\n"
    ).encode("utf-8")
    return {
        "algorithm": SITE_TREE_ALGORITHM,
        "file_count": len(entries),
        "tree_sha256": sha256_bytes(canonical),
    }


def assert_site_size_within_github_pages_limit(
    site_bytes: int | None = None,
) -> tuple[int, int]:
    if site_bytes is None:
        _file_count, site_bytes = published_site_inventory()
    remaining_bytes = GITHUB_PAGES_SITE_LIMIT_BYTES - site_bytes
    if remaining_bytes < 0:
        raise RuntimeError(
            "assembled site exceeds the GitHub Pages 1 GB published-site "
            f"limit: bytes={site_bytes} limit={GITHUB_PAGES_SITE_LIMIT_BYTES}"
        )
    return site_bytes, remaining_bytes


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def assembled_explorer_identity() -> tuple[str, str]:
    """Recompute the app tree and manifest hashes from assembled Site bytes."""

    manifest_path = OUT / EXPLORER_BUILD_MANIFEST
    manifest_bytes = manifest_path.read_bytes()
    manifest = json.loads(manifest_bytes)
    materials = manifest.get("materials")
    if not isinstance(materials, list) or not materials:
        raise RuntimeError("assembled Explorer build manifest has no materials")

    observed: list[dict[str, object]] = []
    for entry in materials:
        if not isinstance(entry, dict) or set(entry) != {
            "path",
            "bytes",
            "sha256",
        }:
            raise RuntimeError(
                "assembled Explorer build manifest has an invalid material"
            )
        relative = entry["path"]
        if not isinstance(relative, str):
            raise RuntimeError(
                "assembled Explorer build manifest material path is invalid"
            )
        target = OUT / relative
        raw = target.read_bytes()
        observed.append(
            {
                "path": relative,
                "bytes": len(raw),
                "sha256": sha256_bytes(raw),
            }
        )

    canonical = (
        json.dumps(
            observed,
            ensure_ascii=False,
            separators=(",", ":"),
        )
        + "\n"
    ).encode("utf-8")
    observed_tree = sha256_bytes(canonical)
    if observed != materials or manifest.get("tree_sha256") != observed_tree:
        raise RuntimeError(
            "assembled Explorer build manifest does not describe its exact "
            "published material bytes"
        )
    return observed_tree, sha256_bytes(manifest_bytes)


def assert_local_candidate_receipt_matches_built_site(
    *,
    reading_pages: int,
    internal_references: int,
    site_bytes: int,
    remaining_bytes: int,
) -> dict[str, object]:
    """Fail if local-candidate publication claims are stale after assembly."""

    published_receipt = OUT / HERITAGE_LOCAL_CANDIDATE_RECEIPT
    receipt = json.loads(published_receipt.read_text(encoding="utf-8"))
    candidate = receipt["candidate"]
    observed_tree, observed_manifest = assembled_explorer_identity()
    site_tree = published_site_tree_receipt()
    size_gate = candidate["site_size_gate"]
    claims = {
        "explorer_tree_sha256": (
            candidate["explorer_tree_sha256"],
            observed_tree,
        ),
        "explorer_manifest_sha256": (
            candidate["explorer_manifest_sha256"],
            observed_manifest,
        ),
        "site_reading_pages": (
            candidate["site_reading_pages"],
            reading_pages,
        ),
        "site_internal_references": (
            candidate["site_internal_references"],
            internal_references,
        ),
        "site_file_count": (
            candidate["site_file_count"],
            site_tree["file_count"],
        ),
        "site_tree_algorithm": (
            candidate["site_tree_algorithm"],
            site_tree["algorithm"],
        ),
        "site_tree_sha256": (
            candidate["site_tree_sha256"],
            site_tree["tree_sha256"],
        ),
        "site_size_gate.limit_bytes": (
            size_gate["limit_bytes"],
            GITHUB_PAGES_SITE_LIMIT_BYTES,
        ),
        "site_size_gate.site_bytes": (
            size_gate["site_bytes"],
            site_bytes,
        ),
        "site_size_gate.headroom_bytes": (
            size_gate["headroom_bytes"],
            remaining_bytes,
        ),
        "site_size_gate.status": (
            size_gate["status"],
            "passed",
        ),
    }
    stale = [
        f"{name}: claimed={claimed!r} observed={observed!r}"
        for name, (claimed, observed) in claims.items()
        if claimed != observed
    ]
    if stale:
        details = "\n".join(f"- {item}" for item in stale)
        raise RuntimeError(
            "local candidate receipt differs from exact built artifacts:\n"
            f"{details}"
        )
    return site_tree


def site_candidate_receipt(
    *,
    reading_pages: int,
    internal_references: int,
    site_bytes: int,
    remaining_bytes: int,
) -> dict[str, object]:
    """Compute pre-deploy identity without placing observations in the Site."""

    explorer_tree, explorer_manifest = assembled_explorer_identity()
    site_tree = published_site_tree_receipt()
    return {
        "schema": "okf-site-candidate-receipt.v1",
        "algorithm": "deterministic-pre-deploy-identity-without-observations-v1",
        "explorer": {
            "tree_sha256": explorer_tree,
            "manifest_sha256": explorer_manifest,
        },
        "site": {
            "reading_pages": reading_pages,
            "internal_references": internal_references,
            "file_count": site_tree["file_count"],
            "tree_algorithm": site_tree["algorithm"],
            "tree_sha256": site_tree["tree_sha256"],
            "size_gate": {
                "status": "passed",
                "limit_bytes": GITHUB_PAGES_SITE_LIMIT_BYTES,
                "site_bytes": site_bytes,
                "headroom_bytes": remaining_bytes,
            },
        },
    }


def write_site_candidate_receipt(path: Path, receipt: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(receipt, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    temporary = path.with_name(f".{path.name}.tmp")
    temporary.write_text(payload, encoding="utf-8")
    temporary.replace(path)


def require_receipt_outside_site(path: Path) -> Path:
    resolved = path.resolve()
    if resolved.is_relative_to(OUT.resolve()):
        raise RuntimeError(
            "the pre-deploy candidate receipt must remain outside Site bytes"
        )
    return resolved


def remove_platform_metadata() -> None:
    for path in OUT.rglob("*"):
        if path.is_file() and path.name in FORBIDDEN_NAMES:
            path.unlink()


def write_legacy_404_if_absent() -> None:
    target = OUT / "404.html"
    if target.exists():
        return
    target.write_text(
        "<!doctype html><meta charset=\"utf-8\"><title>OKF Explorer</title>"
        "<meta http-equiv=\"refresh\" content=\"0; url=./\">"
        "<p>Return to <a href=\"./\">OKF Explorer</a>.</p>\n",
        encoding="utf-8",
    )


def verify_assembled_app_build() -> None:
    if not SVELTE_EXPLORER_BUILD.exists():
        return
    result = subprocess.run(
        [
            "node",
            str(ASSEMBLED_SITE_VERIFIER),
            "--site-root",
            str(OUT),
            "--app-build-root",
            str(SVELTE_EXPLORER_BUILD),
        ],
        cwd=ROOT,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(
            "assembled Explorer app differs from its canonical build manifest"
        )


def assert_app_does_not_replace_reading_pages() -> None:
    if not SVELTE_EXPLORER_BUILD.exists():
        return
    app_routes = {
        source.relative_to(SVELTE_EXPLORER_BUILD)
        for source in SVELTE_EXPLORER_BUILD.rglob("*")
        if source.is_file()
    }
    collisions = sorted(app_routes.intersection(published_reading_routes()))
    if collisions:
        details = "\n".join(f"- {route}" for route in collisions)
        raise RuntimeError(
            "Explorer app build would replace rendered documentation:\n"
            f"{details}"
        )


class ReadingPageLinks(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.hrefs: list[str] = []
        self.references: list[tuple[str, str]] = []
        self.identifiers: set[str] = set()
        self.duplicate_identifiers: set[str] = set()

    def handle_starttag(self, tag: str, attrs) -> None:
        attributes = dict(attrs)
        identifier = attributes.get("id")
        if identifier:
            if identifier in self.identifiers:
                self.duplicate_identifiers.add(identifier)
            self.identifiers.add(identifier)
        href = attributes.get("href")
        if tag == "a" and href:
            self.hrefs.append(href)
            self.references.append(("a[href]", href))
        elif tag == "link" and href:
            self.references.append(("link[href]", href))
        source = attributes.get("src")
        if tag in {"img", "script", "source"} and source:
            self.references.append((f"{tag}[src]", source))
        srcset = attributes.get("srcset")
        if tag in {"img", "source"} and srcset:
            for candidate in srcset.split(","):
                url = candidate.strip().split(maxsplit=1)[0]
                if url:
                    self.references.append((f"{tag}[srcset]", url))


def local_site_path(source_route: Path, href: str) -> tuple[Path, str] | None:
    parts = urlsplit(href)
    path = unquote(parts.path)
    if parts.scheme or parts.netloc:
        if (
            parts.scheme not in {"http", "https"}
            or parts.netloc != "chris-page-gov.github.io"
            or not path.startswith("/okf-explorer/")
        ):
            return None
        path = path.removeprefix("/okf-explorer/")
        target = Path(posixpath.normpath(path))
    elif path.startswith("/"):
        if not path.startswith("/okf-explorer/"):
            return None
        target = Path(
            posixpath.normpath(path.removeprefix("/okf-explorer/"))
        )
    elif path:
        target = Path(
            posixpath.normpath(
                posixpath.join(source_route.parent.as_posix(), path)
            )
        )
    else:
        target = source_route
    if target.as_posix() == ".":
        target = Path("index.html")
    if target.as_posix().startswith("../"):
        raise ValueError("link escapes the published site root")
    return target, unquote(parts.fragment)


def final_link_target(target: Path) -> Path:
    output = OUT / target
    if output.is_dir() or target.as_posix().endswith("/"):
        return target / "index.html"
    return target


def parse_reading_page(route: Path) -> ReadingPageLinks:
    parser = ReadingPageLinks()
    parser.feed((OUT / route).read_text(encoding="utf-8"))
    return parser


def assert_readable_document_links() -> tuple[int, int]:
    routes = published_reading_routes()
    errors: list[str] = []
    parsed_pages: dict[Path, ReadingPageLinks] = {}
    checked_links = 0
    internal_references = 0

    for route in sorted(routes):
        page = OUT / route
        if not page.is_file():
            errors.append(f"{route}: rendered page is missing")
            continue
        parsed = parsed_pages.setdefault(route, parse_reading_page(route))
        for identifier in sorted(parsed.duplicate_identifiers):
            errors.append(f"{route}: duplicate HTML id #{identifier}")
        for reference_kind, href in parsed.references:
            checked_links += 1
            try:
                local = local_site_path(route, href)
            except ValueError as error:
                errors.append(f"{route}: {href}: {error}")
                continue
            if local is None:
                continue
            internal_references += 1
            target, fragment = local
            if reference_kind == "a[href]" and target.suffix.lower() == ".md":
                errors.append(
                    f"{route}: internal Markdown navigation must use HTML: {href}"
                )
                continue
            target = final_link_target(target)
            target_file = OUT / target
            if not target_file.is_file():
                errors.append(f"{route}: missing local target {href} -> {target}")
                continue
            if reference_kind == "a[href]" and fragment and target in routes:
                target_page = parsed_pages.setdefault(
                    target,
                    parse_reading_page(target),
                )
                if fragment not in target_page.identifiers:
                    errors.append(
                        f"{route}: missing fragment #{fragment} in {target}"
                    )

    if errors:
        joined = "\n".join(f"- {error}" for error in errors)
        raise RuntimeError(f"readable documentation link audit failed:\n{joined}")
    print(
        "verified readable documentation links: "
        f"pages={len(routes)} links={checked_links} "
        f"internal_references={internal_references}"
    )
    return len(routes), internal_references


def is_mutable_evaluation_evidence(relative: Path) -> bool:
    parts = relative.parts
    return bool(
        parts
        and parts[0] in {"evaluation", "evaluation-foundry"}
        and "evidence" in parts
    )


def is_component_source_allowed(relative: Path) -> bool:
    return not (
        relative.name in FORBIDDEN_NAMES
        or relative.name.startswith("~$")
        or relative.suffix.lower() in FORBIDDEN_SUFFIXES
        or is_ephemeral_evaluation_result(relative)
        or is_mutable_evaluation_evidence(relative)
        or relative == PROMOTION_ENVELOPE
    )


def component_source_fingerprint(
    component: str,
) -> tuple[str, list[dict[str, object]]]:
    """Return the exact source identity controlling one Site component."""

    common = [
        ROOT / "scripts" / "build_site.py",
        ROOT / "scripts" / "site_component_cache.py",
        PUBLICATION_UNIT_DESCRIPTOR,
    ]
    if component == "app":
        sources = [*common, SVELTE_EXPLORER_BUILD]

        def include(relative: Path) -> bool:
            return is_component_source_allowed(relative)

    elif component == "docs":
        sources = [
            *common,
            ROOT / "scripts" / "build_okf_bundle.py",
            ROOT / "scripts" / "update_viewer.py",
            ROOT / ".python-version",
            ROOT / "pyproject.toml",
            ROOT / "requirements-okf.txt",
            ROOT / "uv.lock",
            ROOT / "okf.config.json",
            *(ROOT / name for name in PUBLIC_ROOT_FILES),
            *(ROOT / name for name in PUBLIC_DIRS),
        ]

        def include(relative: Path) -> bool:
            if not is_component_source_allowed(relative):
                return False
            if relative.parts and relative.parts[0] in {"scripts", "docs"}:
                return True
            return (
                relative.suffix.lower() == ".md"
                or relative.as_posix()
                in {
                    ".python-version",
                    "pyproject.toml",
                    "requirements-okf.txt",
                    "uv.lock",
                    "okf.config.json",
                    PUBLICATION_UNIT_DESCRIPTOR.relative_to(ROOT).as_posix(),
                }
            )

    elif component == "data":
        sources = [
            *common,
            *(ROOT / name for name in PUBLIC_ROOT_FILES),
            *(ROOT / name for name in PUBLIC_DIRS if name not in {"docs", "explorer"}),
        ]

        def include(relative: Path) -> bool:
            return (
                is_component_source_allowed(relative)
                and relative.suffix.lower() != ".md"
                and relative.as_posix() not in {"view.html"}
                and externalized_publication_target(relative) is None
            )

    elif component == "shell":
        sources = [
            *common,
            ROOT / "viewer.html",
            ROOT / "explorer",
        ]

        def include(relative: Path) -> bool:
            return is_component_source_allowed(relative)

    else:
        raise ValueError(f"unknown Site component: {component}")
    return site_component_cache.source_fingerprint(
        ROOT,
        sources,
        include=include,
    )


@contextmanager
def component_output(target: Path) -> Iterator[None]:
    """Temporarily direct the existing deterministic renderers to a component."""

    global OUT
    previous = OUT
    OUT = target
    try:
        yield
    finally:
        OUT = previous


def build_site_component(component: str, target: Path) -> None:
    """Build one non-overlapping Site plane into a fresh component directory."""

    with component_output(target):
        if component == "app":
            if SVELTE_EXPLORER_BUILD.exists():
                assert_app_does_not_replace_reading_pages()
                copy_public_tree(SVELTE_EXPLORER_BUILD, OUT)
            return

        if component == "docs":
            bundle, bundle_errors = build_okf_bundle.build_bundle()
            if bundle_errors:
                joined = "\n".join(f"- {error}" for error in bundle_errors)
                raise RuntimeError(f"OKF bundle build failed:\n{joined}")
            (OUT / "okf-bundle.json").write_text(
                build_okf_bundle.render_bundle(bundle),
                encoding="utf-8",
            )
            for name in PUBLIC_ROOT_FILES:
                source = ROOT / name
                if source.exists() and source.suffix.lower() == ".md":
                    copy_file(source, OUT / name)
            for dirname in PUBLIC_DIRS:
                source_dir = ROOT / dirname
                if dirname == "docs":
                    copy_public_tree(source_dir, OUT / dirname)
                elif dirname != "explorer":
                    copy_public_tree(
                        source_dir,
                        OUT / dirname,
                        include=lambda relative, root=dirname: (
                            is_component_source_allowed(Path(root) / relative)
                            and
                            relative.suffix.lower() == ".md"
                            and externalized_publication_target(
                                Path(root) / relative
                            )
                            is None
                        ),
                    )
            copy_public_tree(
                ROOT / "profiles",
                OUT / "profile",
                include=lambda relative: relative.suffix.lower() == ".md",
            )
            write_generic_reading_pages()
            write_beginner_guide()
            write_foundry_pages()
            return

        if component == "data":
            for name in PUBLIC_ROOT_FILES:
                source = ROOT / name
                if (
                    source.exists()
                    and source.suffix.lower() != ".md"
                    and name != "view.html"
                ):
                    copy_file(source, OUT / name)
            for dirname in PUBLIC_DIRS:
                if dirname in {"docs", "explorer"}:
                    continue
                copy_public_tree(
                    ROOT / dirname,
                    OUT / dirname,
                    include=lambda relative, root=dirname: (
                        is_component_source_allowed(Path(root) / relative)
                        and relative.suffix.lower() != ".md"
                        and externalized_publication_target(
                            Path(root) / relative
                        )
                        is None
                    ),
                )
            copy_public_tree(
                ROOT / "profiles",
                OUT / "profile",
                include=lambda relative: relative.suffix.lower() != ".md",
            )
            return

        if component == "shell":
            (OUT / "service-worker.js").write_text(
                render_retiring_service_worker(),
                encoding="utf-8",
            )
            copy_file(ROOT / "viewer.html", OUT / "view.html")
            copy_public_tree(ROOT / "explorer", OUT / "legacy")
            (OUT / "next").mkdir(parents=True, exist_ok=True)
            (OUT / "next" / "index.html").write_text(
                render_next_redirect(),
                encoding="utf-8",
            )
            (OUT / ".nojekyll").write_text("", encoding="utf-8")
            write_legacy_404_if_absent()
            return
    raise ValueError(f"unknown Site component: {component}")


def build_or_load_components(
    cache_root: Path,
    selected: set[str],
) -> list[site_component_cache.ComponentArtifact]:
    artifacts: list[site_component_cache.ComponentArtifact] = []
    for component in SITE_COMPONENTS:
        fingerprint, materials = component_source_fingerprint(component)
        component_root = cache_root / component / fingerprint
        if component in selected:
            artifact, reused = site_component_cache.materialize_component(
                cache_root,
                component,
                fingerprint,
                materials,
                lambda target, name=component: build_site_component(name, target),
            )
            print(
                f"Site component {component}: "
                f"{'reused' if reused else 'built'} {fingerprint}"
            )
        else:
            if not (component_root / "component-manifest.json").is_file():
                raise RuntimeError(
                    f"required Site component {component} is not cached for "
                    f"input {fingerprint}"
                )
            artifact = site_component_cache.verify_component(component_root)
        artifacts.append(artifact)
    return artifacts


def audit_assembled_site(
    assembly: dict[str, object],
    *,
    candidate_receipt_path: Path,
) -> None:
    bundle, bundle_errors = build_okf_bundle.build_bundle()
    if bundle_errors:
        joined = "\n".join(f"- {error}" for error in bundle_errors)
        raise RuntimeError(f"OKF bundle build failed:\n{joined}")
    expected_bundle = build_okf_bundle.render_bundle(bundle)
    if (OUT / "okf-bundle.json").read_text(encoding="utf-8") != expected_bundle:
        raise RuntimeError("assembled documentation component has a stale OKF bundle")
    semantic, semantic_errors = build_okf_bundle.build_semantic_document(bundle)
    if semantic_errors:
        joined = "\n".join(f"- {error}" for error in semantic_errors)
        raise RuntimeError(f"OKF semantic build failed:\n{joined}")
    expected_yaml_ld, expected_json_ld = build_okf_bundle.render_semantic_outputs(
        semantic
    )
    if (OUT / "okf-bundle.yamlld").read_text(encoding="utf-8") != expected_yaml_ld:
        raise RuntimeError("assembled data component has stale OKF YAML-LD")
    if (OUT / "okf-bundle.jsonld").read_text(encoding="utf-8") != expected_json_ld:
        raise RuntimeError("assembled data component has stale OKF JSON-LD")

    remove_platform_metadata()
    assert_no_forbidden_files()
    verify_assembled_app_build()
    reading_pages, internal_references = assert_readable_document_links()
    # Finder can recreate metadata while the longer link and app audits run.
    # Remove and assert once more immediately before recording publication
    # inventory so a local GUI cannot change the deterministic evidence.
    remove_platform_metadata()
    assert_no_forbidden_files()
    file_count, site_bytes = published_site_inventory()
    site_bytes, remaining_bytes = assert_site_size_within_github_pages_limit(
        site_bytes
    )
    receipt = site_candidate_receipt(
        reading_pages=reading_pages,
        internal_references=internal_references,
        site_bytes=site_bytes,
        remaining_bytes=remaining_bytes,
    )
    write_site_candidate_receipt(candidate_receipt_path, receipt)
    site_tree = receipt["site"]
    assert isinstance(site_tree, dict)
    print(
        f"built {OUT.relative_to(ROOT)} with {file_count} files; "
        f"bytes={site_bytes} pages_limit_remaining={remaining_bytes}; "
        f"changed={assembly['changed_files']} reused={assembly['reused_files']} "
        f"removed={assembly['removed_files']}; "
        f"candidate_receipt={candidate_receipt_path} "
        f"receipt_tree_files={site_tree['file_count']} "
        f"receipt_tree_sha256={site_tree['tree_sha256']}"
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--component",
        action="append",
        choices=SITE_COMPONENTS,
        help="build only this component (repeatable; defaults to all)",
    )
    parser.add_argument(
        "--components-only",
        action="store_true",
        help="materialize selected components without assembling the Site",
    )
    parser.add_argument(
        "--component-cache",
        type=Path,
        default=DEFAULT_SITE_COMPONENT_CACHE,
    )
    parser.add_argument(
        "--candidate-receipt",
        type=Path,
        help="write deterministic pre-deploy identity outside the Site",
    )
    args = parser.parse_args(argv)
    cache_root = args.component_cache
    if not cache_root.is_absolute():
        cache_root = ROOT / cache_root
    selected = set(args.component or SITE_COMPONENTS)
    artifacts = build_or_load_components(cache_root, selected)
    if args.components_only:
        return 0
    assembly = site_component_cache.assemble_components(
        artifacts,
        OUT,
        cache_root / "assembly" / "site-assembly-manifest.json",
        allowed_overrides=SITE_COMPONENT_OVERRIDE_OWNERS,
    )
    candidate_receipt = args.candidate_receipt
    if candidate_receipt is None:
        candidate_receipt = (
            cache_root / "assembly" / "site-candidate-receipt.json"
        )
    elif not candidate_receipt.is_absolute():
        candidate_receipt = ROOT / candidate_receipt
    candidate_receipt = require_receipt_outside_site(candidate_receipt)
    audit_assembled_site(
        assembly,
        candidate_receipt_path=candidate_receipt,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
