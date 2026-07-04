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
    "uk-government",
    "explorer",
]
FORBIDDEN_NAMES = {".DS_Store"}
FORBIDDEN_SUFFIXES = {".pyc"}


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
        shutil.rmtree(OUT)
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

    copy_file(ROOT / "explorer" / "index.html", OUT / "index.html")
    for name in ["app.js", "styles.css", "manifest.webmanifest", "service-worker.js"]:
        copy_file(ROOT / "explorer" / name, OUT / name)

    copy_file(ROOT / "viewer.html", OUT / "view.html")

    for dirname in PUBLIC_DIRS:
        copy_public_tree(ROOT / dirname, OUT / dirname)

    if SVELTE_EXPLORER_BUILD.exists():
        copy_public_tree(SVELTE_EXPLORER_BUILD, OUT / "next")

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
