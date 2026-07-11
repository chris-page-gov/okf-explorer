# Publication Plan

Status: public GitHub Pages deployment is active. Release snapshots are cut
from `main` with semantic tags such as `v0.3.0`.

## Public Surfaces

- Repository: canonical OKF Explorer source, sample OKF Markdown corpus,
  provenance, issues, pull requests, and review history.
- GitHub Pages: public root redirects to the canonical Svelte OKF Explorer
  under `next/`, preserving query-string and hash routes.
- Svelte Explorer: when `apps/okf-explorer/build/` exists, the Pages build
  publishes the canonical Vite 8 / SvelteKit implementation under `next/`.
- Legacy Explorer: the dependency-free compatibility Explorer is published
  explicitly under `legacy/`, while `viewer.html` and `view.html` remain the
  single-file legacy viewer surfaces.
- GitHub Releases: versioned snapshots of the explorer, OKF bundle, legacy
  viewer, and sample corpus.
- UK Legislation: the complete static work catalogue is published at
  `legislation/okf-explorer.json`; selected works progressively load their
  authoritative CLML subdivision tree from legislation.gov.uk.
- UK Legislation documentation: the maintained spine is published under
  `docs/uk-legislation/`, with screenshot assets and their refresh manifest
  under `docs/assets/uk-legislation-manual/`.
- Optional DOI: connect the public repository to Zenodo after the first release
  if a persistent scholarly citation is required.

## Release Steps

1. Run the publication checks below.
2. Commit and push the release state to `main`.
3. Create an annotated semantic tag, for example `v0.3.0`.
4. Push the tag.
5. Publish a GitHub Release using the matching changelog section as release
   notes.
6. Verify the Pages workflow and the hosted Explorer URL.

## Publication Checks

Run these before publishing or cutting a release:

```sh
cd apps/okf-explorer && pnpm install && pnpm check && pnpm build && cd ../..
python3 scripts/build_uk_government_api_okf.py --check
python3 scripts/check_legislation_okf.py
python3 scripts/build_legislation_evaluation.py
python3 scripts/build_okf_bundle.py --check
python3 scripts/update_viewer.py --check
python3 scripts/check_okf.py
python3 scripts/build_site.py
```

The Pages build includes the canonical Svelte Explorer, generated OKF bundle,
UK Government APIs and UK Legislation large-corpus exemplars, the legal-answer
evaluation suite, public OKF Markdown corpus, explicit
legacy Explorer route, and legacy viewer, and excludes Word lock files,
`.DS_Store`, Git internals, temporary files, and generated caches.

## Current Svelte Coverage

The Svelte Explorer covers monolithic OKF bundles and large-corpus descriptors.
Large-corpus startup remains overview-only; static search stays worker-backed;
full dataset/resource/publisher chunks hydrate only for detail/filter/timeline/
type/resource views; relationship chunks hydrate only for graph/link views.
