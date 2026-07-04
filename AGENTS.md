# Codex Instructions

This repository publishes a static OKF Explorer PWA plus an Open Knowledge
Format (OKF) Markdown bundle for the AI infrastructure research material.

## Working Rules

- Treat the Markdown files as the source of truth.
- Keep links browser-compatible Markdown links. Do not introduce Obsidian-only
  wikilinks.
- Do not add Word lock files, `.DS_Store`, `_site/`, or temporary files to Git.
- If OKF Markdown changes, run `python3 scripts/build_okf_bundle.py` so
  `okf-bundle.json` stays synchronized.
- Also run `python3 scripts/update_viewer.py` so the legacy `viewer.html` stays
  synchronized.
- Before committing publication changes, run:

```sh
python3 scripts/build_okf_bundle.py --check
python3 scripts/update_viewer.py --check
python3 scripts/check_okf.py
python3 scripts/build_site.py
```

## Publication Model

- GitHub repository: canonical OKF Explorer source, OKF sample bundle, and
  review history.
- GitHub Pages: static public site built into `_site/`.
- GitHub Releases: frozen snapshots of the explorer, OKF corpus, bundle, and
  legacy viewer.

The public interactive view is the OKF Explorer at `index.html`. `viewer.html`
and `view.html` remain compatibility artifacts for people who expect the older
single-file viewer.
