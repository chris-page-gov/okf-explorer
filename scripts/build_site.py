#!/usr/bin/env python3
"""Build the GitHub Pages static site into _site/."""

from __future__ import annotations

import html
import posixpath
import re
import shutil
import subprocess
from pathlib import Path
from urllib.parse import unquote, urlsplit, urlunsplit

import build_okf_bundle
from markdown_it import MarkdownIt

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "_site"
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
    "explorer",
    "docs",
    "profiles",
    "registry",
    "constraints",
]
FORBIDDEN_NAMES = {".DS_Store"}
FORBIDDEN_SUFFIXES = {".pyc"}


def beginner_sources() -> list[Path]:
    chapters = sorted(
        path
        for path in BEGINNER_DOCS.glob("*.md")
        if re.match(r"^\d{2}-", path.name)
    )
    index = BEGINNER_DOCS / "index.md"
    return ([index] if index.exists() else []) + chapters


def markdown_title(source: Path) -> str:
    match = re.search(
        r"^#\s+(.+?)\s*$",
        source.read_text(encoding="utf-8"),
        flags=re.MULTILINE,
    )
    return match.group(1) if match else source.stem.replace("-", " ").title()


def published_source_routes() -> dict[Path, Path]:
    routes = {
        source.resolve(): target
        for source, target, _label in FOUNDRY_PAGES
    }
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
    return routes


def relative_site_href(source_route: Path, target_route: Path) -> str:
    return posixpath.relpath(
        target_route.as_posix(),
        start=source_route.parent.as_posix(),
    )


def rewrite_published_href(
    href: str,
    source: Path,
    output_route: Path,
) -> str:
    parts = urlsplit(href)
    if parts.scheme or parts.netloc or not parts.path or parts.path.startswith("/"):
        return href
    candidate = (source.parent / unquote(parts.path)).resolve()
    target_route = published_source_routes().get(candidate)
    if target_route is None:
        return href
    return urlunsplit(
        (
            "",
            "",
            relative_site_href(output_route, target_route),
            parts.query,
            parts.fragment,
        )
    )


def rewrite_beginner_href(href: str, source: Path) -> str:
    output_route = (
        Path("docs")
        / "beginners"
        / source.with_suffix(".html").name
    )
    return rewrite_published_href(href, source, output_route)


def beginner_markdown_renderer() -> MarkdownIt:
    renderer = MarkdownIt(
        "commonmark",
        {"html": False, "breaks": False, "typographer": False},
    ).enable(["table", "strikethrough"])

    def render_link_open(tokens, index, options, env):
        source = env.get("source")
        href = tokens[index].attrGet("href")
        if source and href:
            tokens[index].attrSet(
                "href",
                rewrite_beginner_href(href, Path(source)),
            )
        return renderer.renderer.renderToken(tokens, index, options, env)

    def render_table_open(_tokens, _index, _options, _env):
        return '<div class="table-scroll"><table>\n'

    def render_table_close(_tokens, _index, _options, _env):
        return "</table></div>\n"

    renderer.renderer.rules["link_open"] = render_link_open
    renderer.renderer.rules["table_open"] = render_table_open
    renderer.renderer.rules["table_close"] = render_table_close
    return renderer


def render_beginner_page(
    source: Path,
    sources: list[Path],
    titles: dict[Path, str],
) -> str:
    markdown = source.read_text(encoding="utf-8")
    body = beginner_markdown_renderer().render(markdown, {"source": str(source)})
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
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>{html.escape(title)} · OKF Explorer</title>
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
      <p>Read the <a href="{html.escape(source.name, quote=True)}">source Markdown</a>
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
        target.write_text(
            render_beginner_page(source, sources, titles),
            encoding="utf-8",
        )
    copy_file(BEGINNER_GUIDE_CSS, target_dir / "guide.css")


def foundry_markdown_renderer() -> MarkdownIt:
    renderer = MarkdownIt(
        "commonmark",
        {"html": False, "breaks": False, "typographer": False},
    ).enable(["table", "strikethrough"])

    def render_link_open(tokens, index, options, env):
        source = env.get("source")
        output_route = env.get("output_route")
        href = tokens[index].attrGet("href")
        if source and output_route and href:
            tokens[index].attrSet(
                "href",
                rewrite_published_href(
                    href,
                    Path(source),
                    Path(output_route),
                ),
            )
        return renderer.renderer.renderToken(tokens, index, options, env)

    def render_table_open(_tokens, _index, _options, _env):
        return '<div class="table-scroll"><table>\n'

    def render_table_close(_tokens, _index, _options, _env):
        return "</table></div>\n"

    renderer.renderer.rules["link_open"] = render_link_open
    renderer.renderer.rules["table_open"] = render_table_open
    renderer.renderer.rules["table_close"] = render_table_close
    return renderer


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


def canonical_foundry_url(target: Path) -> str:
    base = "https://chris-page-gov.github.io/okf-explorer/"
    if target == Path("profile/authoring/v1/index.html"):
        return f"{base}profile/authoring/v1/"
    return f"{base}{target.as_posix()}"


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
    <button type="button" class="copy-prompt" data-copy-target="copy-ready-prompt"
      aria-describedby="copy-prompt-help">Copy full prompt</button>
    <a class="secondary-action" href="{plain_text_href}" download>Download plain text</a>
  </div>
  <p id="copy-prompt-help" class="prompt-help">
    Copies the exact prompt, including its placeholders, without this page's controls.
  </p>
  <p id="copy-prompt-status" class="copy-status" role="status" aria-live="polite"></p>
  <textarea id="copy-ready-prompt" class="copy-source" hidden
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
    explorer_href = html.escape(
        relative_site_href(target, Path("index.html")),
        quote=True,
    )
    source_markdown_href = html.escape(
        relative_site_href(
            target,
            source.relative_to(ROOT),
        ),
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
    <p>Read the <a href="{source_markdown_href}">source Markdown</a>
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
    copy_file(canonical_profile, compatibility_profile)


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


def copy_public_tree(source_dir: Path, target_dir: Path) -> None:
    for source in source_dir.rglob("*"):
        if source.is_dir():
            continue
        if source.name in FORBIDDEN_NAMES or source.name.startswith("~$"):
            continue
        if source.suffix.lower() in FORBIDDEN_SUFFIXES:
            continue
        copy_file(source, target_dir / source.relative_to(source_dir))


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
    if errors:
        joined = "\n".join(f"- {error}" for error in errors)
        raise RuntimeError(f"forbidden files in site build:\n{joined}")


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


def main() -> int:
    if OUT.exists():
        for _attempt in range(3):
            shutil.rmtree(OUT, ignore_errors=True)
            if not OUT.exists():
                break
        if OUT.exists():
            raise RuntimeError(f"could not clear {OUT}; close Finder windows using the generated site and retry")
    OUT.mkdir(parents=True)

    bundle, bundle_errors = build_okf_bundle.build_bundle()
    if bundle_errors:
        joined = "\n".join(f"- {error}" for error in bundle_errors)
        raise RuntimeError(f"OKF bundle build failed:\n{joined}")
    (OUT / "okf-bundle.json").write_text(build_okf_bundle.render_bundle(bundle), encoding="utf-8")

    for name in PUBLIC_ROOT_FILES:
        source = ROOT / name
        if source.exists():
            copy_file(source, OUT / name)

    (OUT / "service-worker.js").write_text(render_retiring_service_worker(), encoding="utf-8")

    copy_file(ROOT / "viewer.html", OUT / "view.html")

    for dirname in PUBLIC_DIRS:
        copy_public_tree(ROOT / dirname, OUT / dirname)

    write_beginner_guide()

    # Schema $id values use the stable singular profile URI; keep the browsable
    # plural source tree as well as this publication alias.
    copy_public_tree(ROOT / "profiles", OUT / "profile")
    write_foundry_pages()

    copy_public_tree(ROOT / "explorer", OUT / "legacy")

    if SVELTE_EXPLORER_BUILD.exists():
        copy_public_tree(SVELTE_EXPLORER_BUILD, OUT)

    (OUT / "next").mkdir(parents=True, exist_ok=True)
    (OUT / "next" / "index.html").write_text(render_next_redirect(), encoding="utf-8")

    (OUT / ".nojekyll").write_text("", encoding="utf-8")
    write_legacy_404_if_absent()

    remove_platform_metadata()
    assert_no_forbidden_files()
    verify_assembled_app_build()
    file_count = sum(1 for path in OUT.rglob("*") if path.is_file())
    print(f"built {OUT.relative_to(ROOT)} with {file_count} files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
