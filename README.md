# okf-explorer

Static explorer and bundle tooling for Open Knowledge Format (OKF) wikis.

## Open The Hosted Explorer

The Svelte OKF Explorer can load OKF bundles from this repository or from any
other public HTTPS URL.

- [Open the GOV.UK CKAN large-corpus example in the Svelte Explorer][ckan-example]
- [Open the UK Government APIs OKF exemplar in the Svelte Explorer][uk-government-apis-example]
- [Read the illustrated "make and publish your own OKF bundle" manual][manual]

The CKAN example demonstrates the main no-install workflow: the Explorer is
hosted by this repository, while the bundle descriptor and generated data live
in the separate
[`ai-engineering-lab-hackathon-london-2026`](https://github.com/chris-page-gov/ai-engineering-lab-hackathon-london-2026)
repository.

The UK Government APIs exemplar is published as a large-corpus OKF descriptor:

```text
https://chris-page-gov.github.io/ai-infrastructure-wiki/uk-government-apis/okf-explorer.json
```

To open your own public bundle, use this URL pattern:

```text
https://chris-page-gov.github.io/ai-infrastructure-wiki/next/?bundle=ENCODED_BUNDLE_OR_DESCRIPTOR_URL
```

For example, a small bundle published at
`https://example.github.io/my-okf/okf-bundle.json` opens as:

```text
https://chris-page-gov.github.io/ai-infrastructure-wiki/next/?bundle=https%3A%2F%2Fexample.github.io%2Fmy-okf%2Fokf-bundle.json
```

This repository now plays two roles:

- `apps/okf-explorer/` is the canonical SvelteKit OKF Explorer source.
- `explorer/` is the dependency-free static OKF Explorer PWA and compatibility
  surface while the Svelte app is rolled out.
- The existing AI infrastructure Markdown corpus is the bundled sample/default
  OKF dataset used to exercise the explorer.

The repository contains:

- `explorer/` - the hosted compatibility explorer app.
- `apps/okf-explorer/` - Svelte 5 / SvelteKit 2 / Vite 8 source for the
  definitive OKF Explorer implementation.
- `okf.config.json` - local corpus configuration.
- `okf-bundle.json` - generated bundle consumed by the explorer.
- `okf-registry.json` - starter registry for discoverable bundles and Bundle
  URL suggestions.
- `uk-government-apis/` - generated large-corpus OKF exemplar sourced from the
  GOV.UK API Catalogue.
- `docs/explorer-overview-context.md` - design specification for generated
  overview contexts, facet analysis, hierarchy support, and Explorer analysis
  extensions.
- `docs/use-okf-explorer.md` - novice-friendly manual for generating,
  publishing, and browsing OKF bundles with the hosted Svelte Explorer.
- `docs/okf-explorer-evaluation.md` - 100-question browser evaluation harness
  and additive rubric for retrieval, display clarity, accessibility, GOV.UK
  publication quality, and visual-regression evidence.
- `docs/okf-pack-parity.md` - parity contract for evaluating the UK Government
  APIs and GOV.UK CKAN OKF packs with the same Explorer behaviours and rubric.
- `docs/okf-conformance.md` - OKF v0.1 conformance scope and intentional
  deviations.
- `docs/code-review-2026-07-07.md` - Fable 5 code review: findings, fixes,
  and completion plan.
- `CHANGELOG.md` - publication-quality change history with validation notes.
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

The Explorer product/data-contract direction is documented in
[docs/explorer-overview-context.md](docs/explorer-overview-context.md). It
defines the generated overview context expected by Reader, Graph, Links,
Timeline, Type, Resources, and Narrative views, including how small bundles can
embed analysis inline while large bundles reference chunked analysis artifacts.

## Relationship To The CKAN Fixture

This repository is the generic OKF Explorer product repo: it owns the Svelte
Explorer, bundle conventions, reusable viewer behaviour, registry examples, and
the AI infrastructure sample bundle. The GOV.UK CKAN large-corpus fixture lives
in
[`ai-engineering-lab-hackathon-london-2026`](https://github.com/chris-page-gov/ai-engineering-lab-hackathon-london-2026)
because that repository preserves the historical path from the original dark
data challenge to the generalized OKF large-corpus builder. The CKAN descriptor
is listed in `okf-registry.json` so this Explorer can load and validate that
external bundle without copying its generated corpus here.

Direct CKAN example:
[GOV.UK CKAN in the hosted Svelte Explorer][ckan-example]

Pack parity expectations are documented in
[docs/okf-pack-parity.md](docs/okf-pack-parity.md). The shared browser harness
now carries a separate 100-question CKAN suite so changes to the Explorer can be
scored against both the multi-source UK Government APIs exemplar and the broad
CKAN data-catalogue exemplar.

## Svelte Explorer

The Svelte implementation is built as a static app and is the canonical OKF
Explorer product source. It supports the existing monolithic `okf-bundle.json`
reader and the large-corpus `okf-explorer.json` descriptor path with
worker-backed static search, lazy full-record hydration, relationship graph
loading, scoped timeline/link/type/resource views, resource stacks, persistent
bundle URL history, and route-addressable detail panels.

```sh
cd apps/okf-explorer
pnpm install
pnpm check
pnpm build
```

When `apps/okf-explorer/build/` exists, `python3 scripts/build_site.py` copies
it to `_site/next/`. The root `index.html` remains the compatibility Explorer
until the public cutover is made deliberately.

## Validate And Build

```sh
python3 scripts/build_uk_government_api_okf.py --check
python3 scripts/check_documentation_lockstep.py
python3 scripts/build_okf_bundle.py --check
python3 scripts/update_viewer.py --check
python3 scripts/check_okf.py
python3 scripts/build_site.py
node scripts/evaluate_okf_explorer.mjs --base-url http://127.0.0.1:8002/_site/next/ --bundle ../uk-government-apis/okf-explorer.json --limit 100
node scripts/evaluate_okf_explorer.mjs --base-url http://127.0.0.1:8002/_site/next/ --suite evaluation/gov-ckan/questions.json --limit 100
```

The build writes a GitHub Pages-ready static site to `_site/`. The site uses
the compatibility OKF Explorer as `index.html`, publishes `okf-bundle.json`,
preserves `viewer.html` and `view.html`, publishes the Svelte Explorer under
`next/` when built, publishes the UK Government APIs large-corpus descriptor,
and copies the public OKF Markdown corpus beside it.

To regenerate the explorer bundle after Markdown changes:

```sh
python3 scripts/build_okf_bundle.py
```

To regenerate the UK Government APIs exemplar from the official catalogue CSV:

```sh
python3 scripts/build_uk_government_api_okf.py
```

Publication-affecting changes to `scripts/`, `sources/`, `uk-government-apis/`,
Explorer source, tests, or workflows must keep documentation and
`CHANGELOG.md` in lockstep. CI enforces this for human pull requests with
`scripts/check_documentation_lockstep.py`.

## License

The OKF corpus and documentation are licensed under
[CC BY-NC 4.0](LICENSE.md): free non-commercial reuse with attribution.

The viewer and build/validation scripts are licensed under the
[MIT License](LICENSE-CODE.md).

## GitHub Pages

The included workflow publishes the static site from `_site/` when pushed to
`main`, after validation passes. In the GitHub repository settings, configure
Pages to use **GitHub Actions** as the source.

[ckan-example]: https://chris-page-gov.github.io/ai-infrastructure-wiki/next/?bundle=https%3A%2F%2Fchris-page-gov.github.io%2Fai-engineering-lab-hackathon-london-2026%2Fgov-ckan%2Fokf-explorer.json&view=reader#overview
[uk-government-apis-example]: https://chris-page-gov.github.io/ai-infrastructure-wiki/next/?bundle=https%3A%2F%2Fchris-page-gov.github.io%2Fai-infrastructure-wiki%2Fuk-government-apis%2Fokf-explorer.json&view=reader#overview
[manual]: docs/use-okf-explorer.md
