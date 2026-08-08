# okf-explorer

Static explorer and bundle tooling for Open Knowledge Format (OKF) wikis.

New to this area? Start with the
[browser-rendered OKF Explorer beginner guide][beginner-guide]. Its
[maintained source on GitHub](https://github.com/chris-page-gov/okf-explorer/blob/main/docs/beginners/index.md)
assumes no background in web
development, search, knowledge graphs, semantic-web standards, data catalogues,
geospatial or legislation data, AI infrastructure or this repository's v0.2,
federation, Foundry and release-assurance model.

## Open The Hosted Explorer

The Svelte OKF Explorer can load OKF bundles from this repository or from any
other public HTTPS URL. These hosted examples open without installation:

| Example | What it demonstrates | Open |
|---|---|---|
| Coventry and Warwickshire heritage | Complete source-backed regional coverage, typo-tolerant search, YAML-LD/JSON-LD graph semantics, tiny assurance and an isolated synthetic supplement | [Open Explorer][heritage-example] · [External publication unit][heritage-pack] |
| UK Whole-Law OKF | Overview-first federation with explicit child authority, coverage, freshness and recovery routes | [Open Explorer][whole-law-example] · [Federation contract][federation-docs] |
| ONS data discovery OKF | Metadata-only ONS discovery across 5,097 records, with compact facets, static search, standards evidence and explicit coverage | [Open Explorer][ons-example] · [Source pack][ons-pack] |
| UK Legislation OKF | Complete legislation.gov.uk work catalogue with ELI/Schema.org normalization and live CLML provision discovery | [Open Explorer][legislation-example] · [Documentation spine][legislation-docs] |
| UK Government APIs OKF | Multi-source API/data catalogue with standards and provenance metadata | [Open Explorer][uk-government-apis-example] |
| GOV.UK CKAN | Large external CKAN corpus loaded by the same hosted Explorer | [Open Explorer][ckan-example] |

Each example now has explicit persona, user-story and question traceability:

| Example | Personas and stories | Evaluation questions |
|---|---|---|
| UK Legislation OKF | [Six legislation personas and critical journeys][legislation-personas] · [`journeys.json`](evaluation/legislation/journeys.json) | [`questions.json`](evaluation/legislation/questions.json), 100 legal-answer questions |
| Coventry and Warwickshire heritage evaluation | [Evaluation profile and executable journeys](evaluation-foundry/fixtures/heritage-warwickshire/README.md) | [`questions.json`](evaluation-foundry/fixtures/heritage-warwickshire/questions.json), 100 source, interface, semantics and publication questions |
| UK Government APIs OKF | [Seven shared Explorer personas and nineteen stories][geospatial-personas] · [`journeys.json`](evaluation/okf-explorer/journeys.json) | [`questions.json`](evaluation/okf-explorer/questions.json), 100 retrieval and inspection questions plus focused Map UI tests |
| GOV.UK CKAN | [Six CKAN-specific personas and user stories][ckan-personas] · [`journeys.json`](evaluation/gov-ckan/journeys.json) | [`questions.json`](evaluation/gov-ckan/questions.json), 100 catalogue questions |

The journey manifests also define opt-in browser interactions for facets,
sorting, URL Back/Forward restoration, graph edges, relationship-drawer
resizing, Map reductions, folded record sections, full-record loading and
source-data/new-tab behaviour. A normal 100-question harness run remains
unchanged. Acceptance fixtures wait for bundle-specific hydrated content rather
than using an application-shell selector as their readiness signal.

The focused geospatial suite runs 18 Playwright scenarios against deterministic
small- and large-bundle fixtures. It covers every Map control and visible
state, including successful GeoJSON/OGC/ArcGIS previews, failure recovery,
keyboard and responsive use, URL history, empty/loading states and display
bounds. Run it with `pnpm test:e2e` from `apps/okf-explorer/`.

- [Start with the OKF Explorer documentation guide][docs-index]
- [Learn the whole system from first principles][beginner-guide]
- [Read the illustrated OKF Explorer persona manual][persona-manual]
- [Explore the geospatial Map personas, stories and illustrated manual][geospatial-personas]
- [Use the static search and filtering manual][search-filtering-manual]
- [Review the facet presentation experiment][facet-presentation-experiment]
- [Review the viewer capability parity and conflict register][viewer-parity]
- [Review the ontology and semantic graph architecture][semantic-graph-architecture]
- [Distinguish governed snapshots from reviewed provider references][provider-datapacks]
- [Publish and consume an overview-first federation][federation-docs]
- [Reproduce the UK Legislation runtime acceptance gate](https://chris-page-gov.github.io/okf-explorer/docs/legislation-runtime-acceptance.html)
- [Use the illustrated UK Legislation persona manual][legislation-manual]
- [Use an AI with an OKF pack][ai-okf-usage]
- [Create an OKF bundle that uses the Explorer well][bundle-authoring]
- [Add per-record narratives and typed source access][large-record-contract]
- [Use the OKF Foundry prompts to research a domain, then build and publish its
  bundle][authoring-prompt-kit]
- [Use the Evaluation Foundry and YAML-LD heritage exemplar][evaluation-foundry-guide]
- [Review the evidence-backed Heritage Foundry engineering postmortem][heritage-postmortem]

The ONS example is the primary no-install demonstration: the Explorer is hosted
by this repository, while the bundle descriptor, search indexes and generated
metadata live in the separate [`okf-ons`][ons-pack] repository.

```text
https://chris-page-gov.github.io/okf-ons/okf-explorer.json
```

The CKAN example uses the same cross-repository workflow with the separate
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

The UK Whole-Law federation is the overview-first entry point for independently
governed legal-source bundles. Child descriptors load only after selection:

```text
https://chris-page-gov.github.io/okf-uk-legislation/whole-law/okf-explorer.json
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
- `registry/okf-registry.yamlld` - canonical semantic source for the curated
  bundle registry; `okf-registry.json`, `okf-registry.jsonld` and the Explorer
  static copy are generated projections.
- `uk-government-apis/` - generated large-corpus OKF exemplar sourced from the
  GOV.UK API Catalogue, data.gov.uk, Ordnance Survey and ONS public API
  metadata.
- `legislation/` - generated complete work-level catalogue for legislation.gov.uk, normalized with ELI, Schema.org Legislation and CLML and equipped with live provision-level progressive discovery.
- `evaluation/legislation/` - 100-question legal-answer suite, 100-point rubric and provenance-complete answer contract.
- `evaluation-foundry/` - schemas, reversible mappings, coverage evidence,
  journeys and question suites for functionality evaluations.
- `evaluation/heritage/` - the canonical source copy of the faithful Coventry
  and Warwickshire heritage evaluation corpus, its tiny assurance fixture and
  its isolated synthetic supplement; its public bytes are owned by the
  independent heritage publication unit rather than the Explorer Site.
- `publication-units/` - independently rooted data-publication descriptors,
  deterministic export rules and reviewed repository workflow templates.
- `docs/heritage-evaluation-report.md` - the beginner-readable exemplar report,
  including the additive YAML-LD design and publication boundary.
- `docs/uk-legislation/` - maintained UK Legislation documentation spine with getting-started guidance, personas, user journeys, an illustrated manual, agent research rules, evaluation and refresh instructions.
- `docs/explorer-overview-context.md` - design specification for generated
  overview contexts, facet analysis, hierarchy support, and Explorer analysis
  extensions.
- `docs/viewer-capability-parity-2026-07-24.md` - complete LLM-Wiki and OKF
  viewer inventory, feature matrix, conflict decisions and regression contract
  for the canonical Svelte implementation.
- `docs/ontology-and-semantic-graph-architecture-2026-07-24.md` - layered
  RDF/RDFS/SKOS/OWL/SHACL/DCAT/PROV architecture, predicate registry proposal,
  semantic graph interaction contract and delivery roadmap.
- `docs/facet-presentation-experiment.md` - experimental provider/user display
  contract for facet ordering, compact distributions, search and panel tabs.
- `docs/provider-datapacks.md` - generic contract and UI rules for governed
  snapshots, bounded reviewed references, known drift and safe provider
  hand-offs.
- `docs/geospatial-map-exploration.md` - prototype contract for deterministic
  spatial discovery, Map reductions and bounded on-demand external previews.
- `docs/geospatial-map-personas-and-user-stories.md` - role-based Map needs,
  risks, acceptance criteria and browser-test traceability.
- `docs/geospatial-map-manual.md` - screenshot-led Map walkthrough from spatial
  evidence and area reduction to previews and recovery.
- `docs/index.md` - documentation landing page for browsing, AI usage,
  authoring, evaluation and review records.
- `docs/okf-explorer-persona-manual.md` - screenshot-led UI manual using
  personas and user stories.
- `docs/ai-okf-usage.md` - prompts and pack access rules for using an AI to
  answer questions from OKF bundles.
- `docs/okf-bundle-authoring.md` - bundle-authoring guide for Explorer-ready
  facets, search, graph, timeline, resources and provenance.
- `docs/okf-authoring-prompt-kit.md` - reusable two-stage warm-up/build
  protocol with the `okf-domain-profile.v1` handoff and assurance gates.
- `scripts/check_domain_profile.py` - schema, cross-reference and JSON/YAML
  equivalence validator for an OKF Foundry domain handoff.
- `docs/demo-script-2026-07-09.md` - 20 minute demonstration script.
- `docs/use-okf-explorer.md` - novice-friendly manual for generating,
  publishing, and browsing OKF bundles with the hosted Svelte Explorer.
- `docs/okf-explorer-evaluation.md` - 100-question browser evaluation harness
  and additive rubric for retrieval, display clarity, accessibility, GOV.UK
  publication quality, and visual-regression evidence.
- `docs/okf-pack-parity.md` - parity contract for evaluating the UK Government
  APIs and GOV.UK CKAN OKF packs with the same Explorer behaviours and rubric.
- `docs/okf-conformance.md` - OKF v0.2 core conformance, v0.1 compatibility
  fallbacks and the additive Explorer profile boundary.
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
Timeline, Type, Resources, Map, and Narrative views, including how small
bundles can embed analysis inline while large bundles reference chunked
analysis artifacts. [Geospatial Map exploration](docs/geospatial-map-exploration.md)
defines the Map evidence levels and progressive recovery model.

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
reader, the overview-first `okf-explorer-federation.v1` control plane and the
large-corpus `okf-explorer.json` descriptor path with
worker-backed static search, lazy full-record hydration, relationship graph
loading, scoped timeline/link/type/resource views, resource stacks, persistent
bundle URL history, and route-addressable detail panels. The maintained viewer
parity contract also covers complete non-overlapping node-and-relationship
graph-label layers, reciprocal directed edges, safe Markdown tables and
Mermaid-lite diagrams, conversation-aware Narrative and Timeline rendering,
folded context rails, and touch-scrollable evidence panels.
Focused Graph actions preserve the previous graph centre separately from the
inspected route so browser Back restores the exact prior context; the chosen
record is recentred and the graph viewport is reset for the new focus.
Dense focus graphs automatically group nodes into ordered relationship regions
and encode line width only from an explicit varying relationship metric. A
single aggregate covering the current result is labelled `All matching …`; if
only a bounded subset is loaded, the label states both loaded and total counts.
Opening a large aggregate always yields semantic subgroups or deterministic
title bands/ranges rather than dozens of individual records. Subgroups remain
openable until a bounded record set is reached, and the URL records each depth
so browser Back closes one level at a time. An open hierarchy strip keeps the
sibling choices for every traversed level together above the canvas, marks the
active choice as `Open below`, and names the level currently drawn in the graph.
Inactive parent-level siblings stay in that strip instead of mixing with the
opened branch's children. The hierarchy uses compact breadcrumb-like rows,
while the node or relationship key and relationship authority share one
scrollable context rail. Left-panel facet cards retain their relative emphasis
but use shorter controls and bounded three-value samples to expose more facets
at once. The node type key reflects only the nodes currently displayed.
Controlled regions keep all node labels visible
inline on the outside of compact lists; one dense relationship family uses
paired left/right columns with two icons per row, while staircases use the
available left/right width. Conflicting edge labels alone continue to cycle.
Icons and labels have separate tight pointer targets, so the empty span between
them cannot select a neighbouring node. Graph controls stay available
while the centre panel scrolls, and wheel zoom requires Ctrl/Command. The
two-line toolbar switches its filtered key between counted node types and
counted relationship types: node chips hide or restore a type, relationship
chips highlight the corresponding sources, targets and directed edges, and
`Labels (a/n)` pauses or resumes the non-overlapping label-set cycle. The
active key uses pressed styling rather than display-like on/off wording. The
relationship data card explains
the selected source, predicate and target on separate tabs.

```sh
cd apps/okf-explorer
pnpm install
pnpm audit --audit-level=moderate
pnpm sbom:check
pnpm check
pnpm test
pnpm test:e2e
pnpm build
```

`pnpm sbom:check` verifies that the committed CycloneDX inventory still
matches the exact lockfile dependency versions and integrity hashes. It is an
inventory and reproducibility check, not a vulnerability scan; use
`pnpm audit --audit-level=moderate` and review GitHub Dependabot alerts before
accepting dependency updates. For Playwright updates, run the affected Chrome
journeys locally; the terminal-equivalent CI assurance then repeats the
browser contract across Chrome, Firefox and WebKit.

When `apps/okf-explorer/build/` exists, `python3 scripts/build_site.py` copies
it to `_site/next/`. The root `index.html` redirects to `next/` and preserves
query-string and hash routes, so published root links use the canonical Svelte
Explorer. The old dependency-free Explorer is copied to `_site/legacy/`.

## Validate And Build

```sh
python3 scripts/build_uk_government_api_okf.py --check
python3 scripts/check_legislation_okf.py
python3 scripts/build_legislation_evaluation.py
python3 scripts/check_evaluation_foundry.py
python3 scripts/check_heritage_adversarial.py
python3 scripts/retarget_heritage_source_snapshots.py --check
python3 scripts/build_heritage_evaluation.py --fixture all --check
python3 scripts/export_publication_unit.py \
  --descriptor publication-units/heritage-coventry-warwickshire/publication-unit.json \
  --check
python3 scripts/build_okf_registry.py --check
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
descriptor, and copies the public OKF Markdown corpus beside it. The legislation
work catalogue, ontology documentation and legal-answer evaluation suite are
also published. The large heritage corpus is excluded: the main Site emits only
small compatibility pages that point to its independently rooted publication.

To regenerate the heritage evaluation from its frozen, network-independent
source snapshots, run `python3 scripts/build_heritage_evaluation.py --fixture
all`. Plane and path selectors permit bounded rebuilds; unchanged files are not
rewritten. Live source acquisition and scheduled link observation are separate,
reviewable steps, so CI never refreshes mutable upstream data inside candidate
bytes.

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
[heritage-example]: https://chris-page-gov.github.io/okf-explorer/?bundle=https%3A%2F%2Fchris-page-gov.github.io%2Fokf-heritage-coventry-warwickshire%2Fokf-explorer.json&view=reader#overview
[heritage-pack]: https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire
[ons-example]: https://chris-page-gov.github.io/okf-explorer/?bundle=https%3A%2F%2Fchris-page-gov.github.io%2Fokf-ons%2Fokf-explorer.json&view=reader#overview
[ons-pack]: https://github.com/chris-page-gov/okf-ons
[uk-government-apis-example]: https://chris-page-gov.github.io/okf-explorer/?bundle=https%3A%2F%2Fchris-page-gov.github.io%2Fokf-uk-government-apis%2Fokf-explorer.json&view=reader#overview
[legislation-example]: https://chris-page-gov.github.io/okf-explorer/?bundle=https%3A%2F%2Fchris-page-gov.github.io%2Fokf-uk-legislation%2Fokf-explorer.json&view=reader#overview
[legislation-docs]: https://chris-page-gov.github.io/okf-explorer/docs/uk-legislation/
[legislation-manual]: https://chris-page-gov.github.io/okf-explorer/docs/uk-legislation/illustrated-manual.html
[legislation-personas]: https://chris-page-gov.github.io/okf-explorer/docs/uk-legislation/personas-and-user-journeys.html
[ckan-personas]: https://chris-page-gov.github.io/okf-explorer/docs/gov-ckan-personas-and-user-journeys.html
[docs-index]: https://chris-page-gov.github.io/okf-explorer/docs/
[beginner-guide]: https://chris-page-gov.github.io/okf-explorer/docs/beginners/
[persona-manual]: https://chris-page-gov.github.io/okf-explorer/docs/okf-explorer-persona-manual.html
[geospatial-personas]: https://chris-page-gov.github.io/okf-explorer/docs/geospatial-map-personas-and-user-stories.html
[search-filtering-manual]: https://chris-page-gov.github.io/okf-explorer/docs/static-search-filtering-manual.html
[facet-presentation-experiment]: https://chris-page-gov.github.io/okf-explorer/docs/facet-presentation-experiment.html
[viewer-parity]: https://chris-page-gov.github.io/okf-explorer/docs/viewer-capability-parity-2026-07-24.html
[semantic-graph-architecture]: https://chris-page-gov.github.io/okf-explorer/docs/ontology-and-semantic-graph-architecture-2026-07-24.html
[provider-datapacks]: https://chris-page-gov.github.io/okf-explorer/docs/provider-datapacks.html
[federation-docs]: https://chris-page-gov.github.io/okf-explorer/docs/federated-bundles.html
[whole-law-example]: https://chris-page-gov.github.io/okf-explorer/?bundle=https%3A%2F%2Fchris-page-gov.github.io%2Fokf-uk-legislation%2Fwhole-law%2Fokf-explorer.json&view=reader
[ai-okf-usage]: https://chris-page-gov.github.io/okf-explorer/docs/ai-okf-usage.html
[bundle-authoring]: https://chris-page-gov.github.io/okf-explorer/docs/okf-bundle-authoring.html
[large-record-contract]: docs/large-record-narrative-source-contract.md
[authoring-prompt-kit]: https://chris-page-gov.github.io/okf-explorer/docs/okf-authoring-prompt-kit.html
[evaluation-foundry-guide]: https://chris-page-gov.github.io/okf-explorer/docs/beginners/22-evaluation-foundry-and-yaml-ld.html
[heritage-postmortem]: https://chris-page-gov.github.io/okf-explorer/docs/postmortems/heritage-foundry-2026/
