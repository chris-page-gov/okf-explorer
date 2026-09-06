# Develop, build and publish Explorer

For contributors maintaining this repository. For a personal learning collection,
use [the separate teaching builder](onboarding/first-bundle.md).
Read [repository roles](repository-guide.md) and the semantic/publication contracts
before changing generated material.

## Python Toolchain

Install exactly `uv` 0.12.2 with Astral's
[official version-specific installer](https://docs.astral.sh/uv/getting-started/installation/#standalone-installer),
then create the exact project environment from the committed lock. On macOS
or Linux:

```sh
curl -LsSf https://astral.sh/uv/0.12.2/install.sh | sh
uv --version
uv sync --locked
uv run --locked python -c 'import sys; print(sys.version)'
```

The installation guide gives the equivalent version-specific PowerShell
command for Windows. `uv --version` must report `uv 0.12.2`; the project
refuses a different version rather than silently changing its lock semantics.

The repository pins CPython 3.12.11 in `.python-version`, direct dependencies
in `pyproject.toml`, exact transitive artefacts in `uv.lock`, and the required
`uv` version in `[tool.uv]`. Use `uv run --locked python …` for every governed
Python command; do not rely on whichever `python3` happens to be first on the
host `PATH`.

`requirements-okf.txt` remains temporarily as a byte-preserved legacy
compatibility requirements manifest because the current digest-bound Heritage
publication unit exports those bytes. Root development and CI do not install
from it. A regression test keeps its six legacy constraints aligned with the
corresponding project dependencies; retiring it requires a separately reviewed
publication-unit contract change. The separately versioned external workflow
still installs those ranges with host Python and does not lock their transitive
resolution; it is an explicit compatibility boundary, not part of the governed
Explorer environment.
For the same reason, the two released Heritage evaluation profiles retain the
historical `python3` fixture declarations bound into their candidate evidence;
current root workflows do not execute those strings, and their exact bytes are
regression locked until that publication unit is versioned independently.

## Read Locally

Run `uv run --locked python scripts/build_site.py`, serve `_site/` as the local
web root, and open `http://127.0.0.1:8002/explore/` to review the canonical Svelte
Explorer.
The root Pages URL opens the learning hub. Bundle-bearing root URLs preserve their query and record when redirecting to `explore/`. The dependency-free
compatibility Explorer remains available at `legacy/`. The legacy single-file
viewer remains available at `viewer.html`.

The Explorer reads `okf-registry.json` for example bundle destinations and keeps
recently loaded Bundle URLs in browser local storage, then offers matching
suggestions while typing in the Bundle URL field.

The Explorer product/data-contract direction is documented in
[docs/explorer-overview-context.md](../docs/explorer-overview-context.md). It
defines the generated overview context expected by Reader, Graph, Links,
Timeline, Type, Resources, Map, and Narrative views, including how small
bundles can embed analysis inline while large bundles reference chunked
analysis artefacts. [Geospatial Map exploration](../docs/geospatial-map-exploration.md)
defines the Map evidence levels and progressive recovery model.

## Relationship To The CKAN Fixture

This repository is the generic OKF Explorer product repo: it owns the Svelte
Explorer, bundle conventions, reusable viewer behaviour, registry examples, and
the AI infrastructure sample bundle. The GOV.UK CKAN large-corpus fixture lives
in
[`ai-engineering-lab-hackathon-london-2026`](https://github.com/chris-page-gov/ai-engineering-lab-hackathon-london-2026)
because that repository preserves the historical path from the original dark
data challenge to the generalised OKF large-corpus builder. The CKAN descriptor
is listed in `okf-registry.json` so this Explorer can load and validate that
external bundle without copying its generated corpus here.

Use the [CKAN catalogue entry](onboarding/examples.md#govuk-ckan) for its
current verification limit and producer route.

Pack parity expectations are documented in
[docs/okf-pack-parity.md](../docs/okf-pack-parity.md). The shared browser harness
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
pnpm install --frozen-lockfile
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

When `apps/okf-explorer/build/` exists,
`uv run --locked python scripts/build_site.py` copies it to `_site/explore/`. The
root `index.html` is the learning hub; bundle-bearing root URLs redirect to `explore/` and preserve query-string and hash
routes, so published root links use the canonical Svelte Explorer. The old
dependency-free Explorer is copied to `_site/legacy/`.

## Validate And Build

```sh
uv run --locked python scripts/build_uk_government_api_okf.py --check
uv run --locked python scripts/check_legislation_okf.py
uv run --locked python scripts/build_legislation_evaluation.py
uv run --locked python scripts/check_evaluation_foundry.py
uv run --locked python scripts/check_heritage_adversarial.py
uv run --locked python scripts/retarget_heritage_source_snapshots.py --check
uv run --locked python scripts/build_heritage_evaluation.py --fixture all --check
uv run --locked python scripts/export_publication_unit.py \
  --descriptor publication-units/heritage-coventry-warwickshire/publication-unit.json \
  --check
uv run --locked python scripts/build_okf_registry.py --check
uv run --locked python scripts/check_documentation_lockstep.py
uv run --locked python scripts/build_okf_bundle.py --check
uv run --locked python scripts/update_viewer.py --check
uv run --locked python scripts/check_okf.py
uv run --locked python scripts/build_site.py
node scripts/evaluate_okf_explorer.mjs --base-url http://127.0.0.1:8002/explore/ --bundle /uk-government-apis/okf-explorer.json --limit 100
node scripts/evaluate_okf_explorer.mjs --base-url http://127.0.0.1:8002/explore/ --suite evaluation/gov-ckan/questions.json --limit 100
```

The build writes a GitHub Pages-ready static site to `_site/`. The site uses a
learning hub and preserved bundle-bearing root redirects, publishes the Svelte Explorer under
`explore/`, publishes the compatibility Explorer under `legacy/`, preserves
`viewer.html` and `view.html`, publishes the UK Government APIs large-corpus
descriptor, and copies the public OKF Markdown corpus beside it. The legislation
work catalogue, ontology documentation and legal-answer evaluation suite are
also published. The large heritage corpus is excluded: the main Site emits only
small compatibility pages that point to its independently rooted publication.

To regenerate the heritage evaluation from its frozen, network-independent
source snapshots, run
`uv run --locked python scripts/build_heritage_evaluation.py --fixture all`.
Plane and path selectors permit bounded rebuilds; unchanged files are not
rewritten. Live source acquisition and scheduled link observation are
separate, reviewable steps, so CI never refreshes mutable upstream data inside
candidate bytes.

To regenerate the explorer bundle after Markdown changes:

```sh
uv run --locked python scripts/build_okf_bundle.py
```

To regenerate the UK Government APIs exemplar from the official catalogue CSV:

```sh
uv run --locked python scripts/build_uk_government_api_okf.py
```

To refresh the complete legislation work catalogue from the official Atom API:

```sh
uv run --locked python scripts/build_legislation_okf.py --refresh
uv run --locked python scripts/check_legislation_okf.py
```

Publication-affecting changes to `scripts/`, `sources/`, `uk-government-apis/`,
Explorer source, tests, or workflows must keep documentation and
`CHANGELOG.md` in lockstep. CI enforces this for human pull requests with
`scripts/check_documentation_lockstep.py`.

## License

The OKF corpus and documentation are licensed under
[CC BY-NC 4.0](../LICENSE.md): free non-commercial reuse with attribution.

The viewer and build/validation scripts are licensed under the
[MIT License](../LICENSE-CODE.md).

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
[sharepoint-copilot-trial]: https://chris-page-gov.github.io/okf-explorer/docs/sharepoint-m365-copilot-trial.html
[bundle-authoring]: https://chris-page-gov.github.io/okf-explorer/docs/okf-bundle-authoring.html
[large-record-contract]: ../docs/large-record-narrative-source-contract.md
[authoring-prompt-kit]: https://chris-page-gov.github.io/okf-explorer/docs/okf-authoring-prompt-kit.html
[authoring-method-review]: ../docs/okf-authoring-methodology-review-2026-08-12.md
[explore-okf-profile]: ../profiles/explore-okf/v1/index.md
[evaluation-foundry-guide]: https://chris-page-gov.github.io/okf-explorer/docs/beginners/22-evaluation-foundry-and-yaml-ld.html
[heritage-postmortem]: https://chris-page-gov.github.io/okf-explorer/docs/postmortems/heritage-foundry-2026/
