#!/usr/bin/env python3
"""Build the GitHub Pages static site into _site/."""

from __future__ import annotations

import shutil
from pathlib import Path

import build_okf_bundle

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "_site"
SVELTE_EXPLORER_BUILD = ROOT / "apps" / "okf-explorer" / "build"
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

    # Schema $id values use the stable singular profile URI; keep the browsable
    # plural source tree as well as this publication alias.
    copy_public_tree(ROOT / "profiles", OUT / "profile")

    copy_public_tree(ROOT / "explorer", OUT / "legacy")

    if SVELTE_EXPLORER_BUILD.exists():
        copy_public_tree(SVELTE_EXPLORER_BUILD, OUT)

    (OUT / "next").mkdir(parents=True, exist_ok=True)
    (OUT / "next" / "index.html").write_text(render_next_redirect(), encoding="utf-8")

    (OUT / ".nojekyll").write_text("", encoding="utf-8")
    (OUT / "404.html").write_text(
        "<!doctype html><meta charset=\"utf-8\"><title>OKF Explorer</title>"
        "<meta http-equiv=\"refresh\" content=\"0; url=./\">"
        "<p>Return to <a href=\"./\">OKF Explorer</a>.</p>\n",
        encoding="utf-8",
    )

    assert_no_forbidden_files()
    file_count = sum(1 for path in OUT.rglob("*") if path.is_file())
    print(f"built {OUT.relative_to(ROOT)} with {file_count} files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
