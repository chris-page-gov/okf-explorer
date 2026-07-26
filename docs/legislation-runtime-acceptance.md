# UK Legislation runtime acceptance

The release gate uses the production Explorer build and the generated local
`okf-uk-legislation/bundle/` publication. It does not substitute a small test
fixture for the corpus.

Run from `apps/okf-explorer/`:

```sh
pnpm acceptance:legislation
```

The runner starts a temporary same-origin server, serves the production build
and the read-only legislation publication with real gzip transfer, and supports
the byte ranges used by release datapacks. It executes the same journey in
Chrome, Firefox and WebKit:

1. load the Whole-Law federation and confirm its 36 source classes;
2. open the declared UK Legislation child and wait for static search to finish
   initialising;
3. reload the legislation descriptor in a fresh context and measure compressed
   startup transfer;
4. measure a first cold search and a second warm search;
5. inspect the real facet inventory, coloured distributions and workspace
   geometry;
6. verify that the official-effects reconciliation panel exposes agreement,
   live-addition, superseded and inaccessible states, including explicit zero
   counts;
7. open the Consumer Credit Act graph, verify official and derived relationship
   line styles, and activate an edge with the keyboard;
8. search for The Air Navigation (Amendment) Order 2026, hydrate its aligned
   governed v3 accepted model-enrichment shard, verify distinct official,
   derived and model-assisted relationship lines plus ordered evidence
   provenance, then hide and restore only the model-assisted class through the
   URL-backed authority filter;
9. run WCAG 2.2 axe checks and capture the Chrome renderer JavaScript heap.

The limits are 1 MiB compressed startup transfer, 3 seconds for cold search,
1 second for warm search, and 256 MiB for the nominated Chrome CDP JavaScript
heap measure. Firefox and WebKit do not expose that Chromium-only memory
metric; the receipt records those measurements as unavailable rather than
passing them.

The canonical receipt is
[`release-assurance/explorer-runtime-acceptance.json`](../release-assurance/explorer-runtime-acceptance.json).
It binds the Explorer build, both legislation descriptors, every browser
version, exact measurements, gate decisions and limitations. Live official
full-text search is replaced with an empty deterministic Atom response so
source availability cannot change the static local-search measurement.
The receipt also binds Chrome screenshots of the relationship graph and the
compact facet/search layout under `output/playwright/`.

The detailed `gates` and `browsers` evidence remains authoritative. Stable
release-facing projections additionally expose overall runtime counts plus
`cross_engine`, `accessibility`, `performance` and `integrity` statuses. These
paths are the contract consumed by the UK Legislation clean-room reproduction
gate. The integrity projection fails closed unless both descriptors, the
production build and the two current Chrome screenshots have valid SHA-256
evidence.

The projection contract can be tested without building the application or
running the real corpus:

```sh
pnpm test:acceptance-contract
```
