#!/usr/bin/env python3
"""Build the GitHub Pages static site into _site/."""

from __future__ import annotations

import html
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


def rewrite_beginner_href(href: str, source: Path) -> str:
    parts = urlsplit(href)
    if parts.scheme or parts.netloc or not parts.path or parts.path.startswith("/"):
        return href
    candidate = (source.parent / unquote(parts.path)).resolve()
    guide_root = BEGINNER_DOCS.resolve()
    if (
        candidate.suffix.lower() == ".md"
        and candidate.is_relative_to(guide_root)
        and candidate.is_file()
    ):
        return urlunsplit(
            (
                "",
                "",
                candidate.with_suffix(".html").name,
                parts.query,
                parts.fragment,
            )
        )
    return href


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
