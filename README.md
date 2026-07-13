# okf-explorer

Static explorer and bundle tooling for Open Knowledge Format (OKF) wikis.

## Open The Hosted Explorer

The Svelte OKF Explorer can load OKF bundles from this repository or from any
other public HTTPS URL. These hosted examples open without installation:

| Example | What it demonstrates | Open |
|---|---|---|
| UK Legislation OKF | Complete legislation.gov.uk work catalogue with ELI/Schema.org normalization and live CLML provision discovery | [Open Explorer][legislation-example] · [Documentation spine][legislation-docs] |
| UK Government APIs OKF | Multi-source API/data catalogue with standards and provenance metadata | [Open Explorer][uk-government-apis-example] |
| GOV.UK CKAN | Large external CKAN corpus loaded by the same hosted Explorer | [Open Explorer][ckan-example] |

- [Start with the OKF Explorer documentation guide][docs-index]
- [Read the illustrated OKF Explorer persona manual][persona-manual]
- [Use the static search and filtering manual][search-filtering-manual]
- [Use the illustrated UK Legislation persona manual][legislation-manual]
- [Use an AI with an OKF pack][ai-okf-usage]
- [Create an OKF bundle that uses the Explorer well][bundle-authoring]

The CKAN example demonstrates the main no-install workflow: the Explorer is
hosted by this repository, while the bundle descriptor and generated data live
in the separate
[`ai-engineering-lab-hackathon-london-2026`](https://github.com/chris-page-gov/ai-engineering-lab-hackathon-london-2026)
repository.

The UK Government APIs exemplar is published as a large-corpus OKF descriptor:

```text
https://chris-page-gov.github.io/okf-uk-government-apis/okf-explorer.json
```

The UK Legislation pack publishes the complete legislation.gov.uk work catalogue and resolves every official CLML subdivision only when selected:

```text
https://chris-page-gov.github.io/okf-uk-legislation/okf-explorer.json
```

To open your own public bundle, use this URL pattern:

```text
https://chris-page-gov.github.io/okf-explorer/?bundle=ENCODED_BUNDLE_OR_DESCRIPTOR_URL
```

For example, a small bundle published at
`https://example.github.io/my-okf/okf-bundle.json` opens as:

```text
https://chris-page-gov.github.io/okf-explorer/?bundle=https%3A%2F%2Fexample.github.io%2Fmy-okf%2Fokf-bundle.json
```

This repository now plays two roles:

- `apps/okf-explorer/` is the canonical SvelteKit OKF Explorer source.
- `explorer/` is the dependency-free static OKF Explorer PWA and compatibility
  surface, published explicitly under `legacy/`.
- The existing AI infrastructure Markdown corpus is the bundled sample/default
  OKF dataset used to exercise the explorer.

The repository contains:

- `explorer/` - source for the hosted legacy compatibility Explorer app.
- `apps/okf-explorer/` - Svelte 5 / SvelteKit 2 / Vite 8 source for the
  definitive OKF Explorer implementation.
- `okf.config.json` - local corpus configuration.
- `okf-bundle.json` - generated bundle consumed by the explorer.
- `okf-registry.json` - starter registry for discoverable bundles and Bundle
  URL suggestions.
- `uk-government-apis/` - generated large-corpus OKF exemplar sourced from the
  GOV.UK API Catalogue, data.gov.uk, Ordnance Survey and ONS public API
  metadata.
- `legislation/` - generated complete work-level catalogue for legislation.gov.uk, normalized with ELI, Schema.org Legislation and CLML and equipped with live provision-level progressive discovery.
- `evaluation/legislation/` - 100-question legal-answer suite, 100-point rubric and provenance-complete answer contract.
- `docs/uk-legislation/` - maintained UK Legislation documentation spine with getting-started guidance, personas, user journeys, an illustrated manual, agent research rules, evaluation and refresh instructions.
- `docs/explorer-overview-context.md` - design specification for generated
  overview contexts, facet analysis, hierarchy support, and Explorer analysis
  extensions.
- `docs/index.md` - documentation landing page for browsing, AI usage,
  authoring, evaluation and review records.
- `docs/okf-explorer-persona-manual.md` - screenshot-led UI manual using
  personas and user stories.
- `docs/ai-okf-usage.md` - prompts and pack access rules for using an AI to
  answer questions from OKF bundles.
- `docs/okf-bundle-authoring.md` - bundle-authoring guide for Explorer-ready
  facets, search, graph, timeline, resources and provenance.
- `docs/demo-script-2026-07-09.md` - 20 minute demonstration script.
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

Run `python3 scripts/build_site.py`, serve `_site/` as the local web root, and
open `http://127.0.0.1:8002/next/` to review the canonical Svelte Explorer.
The root Pages URL redirects to `next/`, while the dependency-free
compatibility Explorer remains available at `legacy/`. The legacy single-file
viewer remains available at `viewer.html`.

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
it to `_site/next/`. The root `index.html` redirects to `next/` and preserves
query-string and hash routes, so published root links use the canonical Svelte
Explorer. The old dependency-free Explorer is copied to `_site/legacy/`.

## Validate And Build

```sh
python3 scripts/build_uk_government_api_okf.py --check
python3 scripts/check_legislation_okf.py
python3 scripts/build_legislation_evaluation.py
python3 scripts/check_documentation_lockstep.py
python3 scripts/build_okf_bundle.py --check
python3 scripts/update_viewer.py --check
python3 scripts/check_okf.py
python3 scripts/build_site.py
node scripts/evaluate_okf_explorer.mjs --base-url http://127.0.0.1:8002/next/ --bundle /uk-government-apis/okf-explorer.json --limit 100
node scripts/evaluate_okf_explorer.mjs --base-url http://127.0.0.1:8002/next/ --suite evaluation/gov-ckan/questions.json --limit 100
```

The build writes a GitHub Pages-ready static site to `_site/`. The site uses a
root redirect into the Svelte Explorer, publishes the Svelte Explorer under
`next/`, publishes the compatibility Explorer under `legacy/`, preserves
`viewer.html` and `view.html`, publishes the UK Government APIs large-corpus
descriptor, and copies the public OKF Markdown corpus beside it.
The legislation work catalogue, ontology documentation and legal-answer evaluation suite are also published.

To regenerate the explorer bundle after Markdown changes:

```sh
python3 scripts/build_okf_bundle.py
```

To regenerate the UK Government APIs exemplar from the official catalogue CSV:

```sh
python3 scripts/build_uk_government_api_okf.py
```

To refresh the complete legislation work catalogue from the official Atom API:

```sh
python3 scripts/build_legislation_okf.py --refresh
python3 scripts/check_legislation_okf.py
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

[ckan-example]: https://chris-page-gov.github.io/okf-explorer/?bundle=https%3A%2F%2Fchris-page-gov.github.io%2Fai-engineering-lab-hackathon-london-2026%2Fgov-ckan%2Fokf-explorer.json&view=reader#overview
[uk-government-apis-example]: https://chris-page-gov.github.io/okf-explorer/?bundle=https%3A%2F%2Fchris-page-gov.github.io%2Fai-infrastructure-wiki%2Fuk-government-apis%2Fokf-explorer.json&view=reader#overview
[legislation-example]: https://chris-page-gov.github.io/okf-explorer/?bundle=https%3A%2F%2Fchris-page-gov.github.io%2Fai-infrastructure-wiki%2Flegislation%2Fokf-explorer.json&view=reader#overview
[legislation-docs]: docs/uk-legislation/index.md
[legislation-manual]: docs/uk-legislation/illustrated-manual.md
[docs-index]: docs/index.md
[persona-manual]: docs/okf-explorer-persona-manual.md
[search-filtering-manual]: docs/static-search-filtering-manual.md
[ai-okf-usage]: docs/ai-okf-usage.md
[bundle-authoring]: docs/okf-bundle-authoring.md
