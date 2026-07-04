# okf-explorer

Static explorer and bundle tooling for Open Knowledge Format (OKF) wikis.

This repository now plays two roles:

- `apps/okf-explorer/` is the canonical SvelteKit OKF Explorer source.
- `explorer/` is the current dependency-free static OKF Explorer PWA and
  compatibility surface.
- The existing AI infrastructure Markdown corpus is the bundled sample/default
  OKF dataset used to exercise the explorer.

The repository contains:

- `explorer/` - the hosted static explorer app.
- `apps/okf-explorer/` - Svelte 5 / SvelteKit 2 / Vite 8 source for the next
  OKF Explorer implementation.
- `okf.config.json` - local corpus configuration.
- `okf-bundle.json` - generated bundle consumed by the explorer.
- `okf-registry.json` - starter registry for discoverable bundles and Bundle
  URL suggestions.
- `viewer.html` - legacy self-contained interactive graph and reader.
- `view.html` - compatibility alias for the legacy viewer.
- `index.md`, `document/`, `stack/`, `standards/`, `federated/`, `frameworks/`,
  `research/`, `uk-government/`, `organisations/`, and `glossary/` - the OKF
  Markdown corpus.
- `sources-index.md` and `log.md` - source and provenance indexes.

## Read Locally

Open `explorer/index.html` in a browser to use the OKF Explorer against the
generated local bundle. The legacy single-file viewer remains available at
`viewer.html`.

The Explorer reads `okf-registry.json` for example bundle destinations and keeps
recently loaded Bundle URLs in browser local storage, then offers matching
suggestions while typing in the Bundle URL field.

## Svelte Explorer

The Svelte implementation is built as a static app and is intended to become
the definitive OKF Explorer once parity is complete. It supports the existing
monolithic `okf-bundle.json` reader and the new large-corpus
`okf-explorer.json` descriptor path with worker-backed static search.

```sh
cd apps/okf-explorer
pnpm install
pnpm check
pnpm build
```

When `apps/okf-explorer/build/` exists, `python3 scripts/build_site.py` copies
it to `_site/next/` so it can be tested without replacing the current root
Explorer.

## Validate And Build

```sh
python3 scripts/build_okf_bundle.py --check
python3 scripts/update_viewer.py --check
python3 scripts/check_okf.py
python3 scripts/build_site.py
```

The build writes a GitHub Pages-ready static site to `_site/`. The site uses
the OKF Explorer as `index.html`, publishes `okf-bundle.json`, preserves
`viewer.html` and `view.html` for compatibility, optionally publishes the
Svelte preview under `next/`, and copies the public OKF Markdown corpus beside
it.

To regenerate the explorer bundle after Markdown changes:

```sh
python3 scripts/build_okf_bundle.py
```

## License

The OKF corpus and documentation are licensed under
[CC BY-NC 4.0](LICENSE.md): free non-commercial reuse with attribution.

The viewer and build/validation scripts are licensed under the
[MIT License](LICENSE-CODE.md).

## GitHub Pages

The included workflow publishes the static site from `_site/` when pushed to
`main`, after validation passes. In the GitHub repository settings, configure
Pages to use **GitHub Actions** as the source.
