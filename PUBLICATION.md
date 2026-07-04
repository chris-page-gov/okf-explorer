# Publication Plan

Status: ready for GitHub remote, GitHub Pages, and first public explorer
release.

## Public Surfaces

- Repository: canonical OKF Explorer source, sample OKF Markdown corpus,
  provenance, issues, pull requests, and review history.
- GitHub Pages: public compatibility OKF Explorer served from `explorer/`,
  reading `okf-bundle.json` by default.
- Svelte Explorer: when `apps/okf-explorer/build/` exists, the Pages build also
  publishes the canonical Vite 8 / SvelteKit implementation under `next/`.
  Root cutover is a deliberate publication step, not an accidental build
  side-effect.
- GitHub Releases: versioned snapshots of the explorer, OKF bundle, legacy
  viewer, and sample corpus.
- Optional DOI: connect the public repository to Zenodo after the first release
  if a persistent scholarly citation is required.

## Remaining Release Steps

- Push to a GitHub remote.
- Enable Pages with **GitHub Actions** as the source.
- Create a `v1.0.0` GitHub release after the first successful Pages deployment.

## Publication Checks

Run these before publishing or cutting a release:

```sh
cd apps/okf-explorer && pnpm install && pnpm check && pnpm build && cd ../..
python3 scripts/build_okf_bundle.py --check
python3 scripts/update_viewer.py --check
python3 scripts/check_okf.py
python3 scripts/build_site.py
```

The Pages build includes the explorer app, generated OKF bundle, public OKF
Markdown corpus, and legacy viewer, and excludes Word lock files, `.DS_Store`,
Git internals, temporary files, and generated caches.

## Current Svelte Coverage

The Svelte Explorer covers monolithic OKF bundles and large-corpus descriptors.
Large-corpus startup remains overview-only; static search stays worker-backed;
full dataset/resource/publisher chunks hydrate only for detail/filter/timeline/
type/resource views; relationship chunks hydrate only for graph/link views.
