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
An unbound local run writes the mutable `okf-explorer-runtime-acceptance.v1`
receipt there. A release gate supplies all candidate and Explorer revision
arguments plus an external `--output` path whose basename must be
`explorer-runtime-acceptance.json`; that run emits
`okf-explorer-runtime-acceptance.v2`.

The release-bound runner stages a self-contained evidence tree beside the
receipt:

- its exact runner bytes at
  `apps/okf-explorer/scripts/run_legislation_runtime_acceptance.mjs`;
- both descriptors under the safe relative `bundle/` root;
- the production index at `explorer-build/index.html`; and
- both current Chrome captures under `output/playwright/`.

Every material has an exact positive byte count and SHA-256 digest. The receipt
reports only these safe paths, never a `../` path back into an Explorer or
legislation checkout. Its `outputs.receipt` value is exactly
`explorer-runtime-acceptance.json`, matching the Whole-Law pre-RC controller.
The production build also has a deterministic file count and tree digest.
Publication is write-once: the runner creates independent single-link files,
accepts an already-present file only when its complete bytes are identical, and
fails rather than replacing a divergent, symbolic or linked destination.
Use a fresh external directory for each measured attempt.

The receipt binds every browser version, exact measurements, gate decisions and
limitations. Live official full-text search is replaced with an empty
deterministic Atom response so source availability cannot change the static
local-search measurement. The accessibility gate names its assessed standard
as `WCAG 2.2 AA`.

The detailed `gates` and `browsers` evidence remains authoritative. Stable
release-facing projections additionally expose overall runtime counts plus
`cross_engine`, `accessibility`, `performance` and `integrity` statuses. These
paths are the contract consumed by the UK Legislation clean-room reproduction
gate. The integrity projection fails closed unless both descriptors, the
production build and the exact two-current-Chrome-screenshot set have canonical
paths, positive byte counts and valid SHA-256 evidence. A stale, missing,
duplicated or extra screenshot cannot satisfy a passing receipt.

The projection contract can be tested without building the application or
running the real corpus:

```sh
pnpm test:acceptance-contract
```
