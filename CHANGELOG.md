# Changelog

## v0.4.2 - 2026-07-11 - Explorer identity alignment

- Aligned the private Explorer package and citation metadata with the current
  independently published Explorer product and patch release.
- Replaced the inherited AI Infrastructure bundle citation identity with the
  generic OKF Explorer software identity, canonical repository and Pages URL.
- Updated the live GitHub repository description and homepage to describe the
  federated Explorer, registry, profile and conformance-tooling role.

## 2026-07-11 — Federated bundle publication and YAML-LD foundation

- Adopted independently published OKF bundle wikis as the production
  architecture, with the Explorer acting as a generic consumer and curated
  registry rather than the canonical corpus host.
- Added the experimental OKF Bundle Wiki Profile v1, versioned JSON-LD context,
  JSON Schemas, SHACL shapes and a YAML 1.2/YAML-LD parser with pinned context
  loading.
- Replaced the line-based Markdown frontmatter parser with structured parsing
  while retaining the legacy Explorer projection.
- Added a single YAML-LD registry source that generates Explorer JSON and
  JSON-LD projections.
- Added a machine-readable source constraint ledger and human escalation guide
  so fair-use, access-control and licensing concerns remain visible without
  silently removing prototype features.
- Added semantic identity metadata to large-corpus descriptors and deterministic
  route-scoped relationship adjacency shards, allowing the Explorer to show a
  selected concept's links without hydrating the full relationship table.
- Added governed model-assisted legislation enrichment with a reproducible
  Responses API runner, checked-in reviewed rules, explicit cost/usage logging,
  universal provenance-bearing subject/type/entity edges and compressed
  route-scoped adjacency. The initial API project quota failure is retained in
  the constraint ledger rather than reducing the prototype's feature scope.
- Published the complete legislation bundle independently at
  `chris-page-gov/okf-uk-legislation` with protected `main`, green CI, GitHub
  Pages and release `v0.2.0`; the Explorer registry now treats that publication
  as canonical.
- Published the 41,520-record UK Government APIs bundle independently at
  `chris-page-gov/okf-uk-government-apis`, with protected `main`, CI, Pages,
  276,996 relationships, route adjacency and release `v0.4.0`.
- Published the 155-concept/579-relationship AI Infrastructure Markdown wiki
  independently at `chris-page-gov/okf-ai-infrastructure` with YAML-LD,
  JSON-LD, protected `main`, CI, Pages and release `v0.4.0`.
- Renamed the product repository to `chris-page-gov/okf-explorer`, moved the
  Svelte Explorer to the Pages root, retained `/next/` as a query/hash-preserving
  compatibility redirect, and made the independent AI bundle the default.
- Released Explorer v0.4.0 support for machine-readable `okf-moved.v1`
  descriptors so legacy bundle URLs can forward to canonical independent
  publications without copying their corpora.
- Checked in and applied the standard protected-`main` policy: strict required
  CI, one approval, stale-review dismissal, conversation resolution,
  administrator enforcement, linear history, and no force pushes or deletions.
- Overrode the SvelteKit transitive `cookie` dependency to the patched 0.7
  series, closing the low-severity `GHSA-pxg6-pf52-xh8x` alert reported after
  the repository rename.

All notable changes to this repository are recorded here. Entries are grouped by
date and describe the user-visible publication effect, validation run, and any
source-of-truth changes.

## Unreleased

- Hardened deterministic large-corpus retrieval against stale bundle responses,
  silent or crashed workers, malformed facet values, metadata-gap filters and
  approximate capped-posting totals. Dynamic facets and result summaries now
  remain explicit about fallback and truncation semantics, and legacy small
  bundles normalize scalar alias/tag fields before client-side searching.
- Added persona, user-story and question traceability for every hosted README
  exemplar, plus opt-in browser journeys for retrieval URL state, facets,
  sorting, graph relationships, drawer resizing, folded full-record sections
  and source inspection without replacing the Explorer window.
- Kept the graph relationship drawer above the sticky pins bar so its resize
  grip receives real pointer drags as well as keyboard input.
- Changed broad large-corpus searches that span more than the safe result-chunk
  budget to return the highest-ranked bounded subset instead of failing. The
  result summary retains the full match count and explains the browser-memory
  safeguard without implying AI token usage.
- Added backward-compatible large-corpus delivery through integrity-bound,
  same-origin byte-range packs. Descriptor, search-worker, record-chunk and
  route-adjacency fetches preserve their logical paths while enforcing the v1
  pack index, 64 MiB bounds, exact HTTP 206 ranges, dual SHA-256 checks and
  gzip decoding limits; existing direct static bundles continue unchanged.
- Added optional `okf-operational-metadata.v1` sidecar loading for large
  corpora, allowing source-backed operational enrichment to be refreshed
  without rewriting dataset or search chunks.

### Added

- Added an in-Explorer Source Inspector for machine-readable record links, with
  a human summary, searchable collapsible JSON tree, raw view, copy controls,
  response provenance and a bounded 10 MB client-side fetch. Known legacy
  data.gov.uk action URLs resolve through the canonical browser-readable GOV.UK
  CKAN action endpoint.
- Added an optional, provenance-bearing `operational_metadata` contract for
  canonical source, authoritative publisher, update frequency, current release,
  full/delta distributions, API access, technical specification and licence.
- Added a complete work-level UK legislation OKF pack generated from every year facet in the official legislation.gov.uk Atom catalogue, including primary, secondary, draft, devolved, retained-EU and historical document types.
- Added ELI 1.5 / ELI-I, Schema.org `Legislation`, legislation.gov.uk FRBR/CLML and Akoma Ntoso crosswalks, normalized legal categories and title-derived topic navigation with explicit non-authoritative classification warnings.
- Added progressive official CLML discovery in the Svelte Explorer. A selected work can resolve every Part, Chapter, section, article, regulation, rule, schedule, paragraph and nested P1-P7 structure with official passage links and copyable provenance citations.
- Added combined static-title and official remote full-text search, legislation-specific facets, complete access-method documentation and disclosure of the currently authenticated research bulk/SPARQL surfaces.
- Added a 100-question barrister-oriented AI-answer evaluation suite, 100-point legal/provenance rubric, answer JSON Schema and deterministic evaluator with a hard cap for missing official or proposition-level provenance.
- Added corpus completeness validation, fixture generation in CI, Pages publication wiring and a registry entry for the shareable hosted legislation viewer.
- Added deterministic gzip support for large dataset/search chunks in the Explorer and generator, preserving the complete corpus within practical repository and Pages sizes.
- Added a maintained UK Legislation documentation spine covering getting started, personas and user journeys, an illustrated legislation-specific manual, agent research, evaluation and publication maintenance.
- Added four hosted-Explorer illustrations with a machine-readable capture manifest so corpus overview, exact-title search, work provenance and live CLML passage discovery can be refreshed reproducibly.
- Promoted UK Legislation to a first-class hosted example in the README opening and cross-linked the documentation spine from repository, publication and architecture guides.

### Changed

- Made **View source data** the primary source-record action and relabelled the
  direct endpoint as **Open raw JSON ↗**. Raw external responses always open in
  a separate tab, so they cannot replace the current Explorer state.
- Relabelled harvested CKAN dates as catalogue metadata and added a current
  source/maintenance disclosure. Resource hosts remain discovery leads until a
  bundle supplies canonical-source evidence and provenance.
- Kept Explorer search fully static and deterministic while adding durable
  query, repeated facet-filter and sort state to public URLs, including
  Back/Forward restoration and compatible small-bundle type filtering.
- Added backward-compatible `okf-static-search.v2` filter postings, missing
  metadata buckets, filter-before-limit execution, dynamic facet counts,
  structured match explanations and deterministic relevance/newest/title/
  metadata-quality sorting, with the existing v1 full-index path retained as a
  correctness fallback.
- Split the retrieval panel into Search, Filter results and Sort controls, added
  removable active-filter chips and meaningful candidate totals, and replaced
  raw scores with plain-language "Why this matched" evidence.
- Added a reproducible 30-query ranking benchmark for weighted, field-weighted
  IDF and IDF-plus-exact-boost strategies. The benchmark gate retains the
  current weighted default because neither candidate reaches the required 3%
  macro nDCG@10 improvement.
- Added an illustrated static search and filtering manual captured against the
  58,461-record GOV.UK CKAN corpus, covering deterministic match explanations,
  repeated facet filters, sorting, result totals, v1 fallback and v2 indexed
  execution.
- Fixed large-corpus browser searches by copying reactive retrieval state into
  structured-clone-safe data before posting requests to the search worker.
- Standardized absent and legacy `None`/`null` metadata as `Not specified
  (metadata gap)` in record details and illustrated the wording in the new
  manual.
- Replaced the ambiguous large-corpus `tokens` label with `distinct indexed
  terms` and an explicit explanation that the count is local search-index
  vocabulary, not AI or billable model usage.
- Added deterministic organisation-aware retrieval for exact publisher names
  and unambiguous abbreviations. Existing CKAN v1 bundles reuse their compact
  delta-encoded publisher postings, while new v2 bundles can publish explicit
  entity aliases through `data/search/entities.json`; recognition remains
  visible in suggestions and match explanations.
- Fixed the graph relationship drawer so its larger drag target changes a real
  row height, retains pointer capture and also supports keyboard resizing.
- Kept an inspected relationship visibly selected in both the drawer and graph
  instead of clearing edge-only highlight state during selection reconciliation.
- Added an early record-date summary plus a contextual Dates and related records
  block. It distinguishes source update dates from resource/coverage years,
  follows explicit series metadata, and says when the bundle contains no other
  record in that series rather than guessing from title similarity.
- Moved the lightweight search card's Load full record action beside the title
  and changed secondary detail-card sections to folded disclosures, leaving the
  first Overview section open by default.

## v0.3.0 - 2026-07-09 - Standards-Aligned API Demonstrator

- Added `docs/okf-standards-crosswalk.md`, a field-by-field crosswalk between
  the OKF record contract and DCAT/DCAT-AP (`dcat:DataService`) and OpenAPI,
  including a record-type crosswalk, an access-model to
  `securitySchemes.type` mapping, and a worked example built from the
  Ordnance Survey `search/places/v1/postcode` record. Cross-linked from
  `docs/index.md`, `docs/repository-guide.md`, `docs/okf-bundle-authoring.md`
  and `docs/ai-okf-usage.md`.
- Added local standards concept pages for [DCAT](standards/dcat.md),
  [DCAT-AP](standards/dcat-ap.md) and [DQV](standards/dqv.md), and refreshed
  [OpenAPI](standards/openapi.md) so API-related OKF bundles can link to local
  standard metadata as well as official sources.
- Extended the UK Government APIs builder so every generated API/data record
  carries compact standards-alignment metadata: `dcat_type`, `openapi_type`,
  DCAT/OpenAPI export status, OpenAPI security-scheme mapping and missing
  standards requirements for future DCAT/OpenAPI exporters.
- Updated the Explorer detail card to render DCAT/OpenAPI terms in monospace
  with explanatory info bubbles and a Standards Alignment section.
- Expanded the crosswalk, API source specification, bundle-authoring guide, AI
  usage guide and pack-parity notes with a standards gap analysis and cautious
  export-readiness policy.
- Changed the Pages build so the root URL redirects to the canonical Svelte
  Explorer under `next/`, while the old dependency-free Explorer is published
  explicitly under `legacy/` and the single-file legacy viewer remains available
  through `viewer.html` / `view.html`.
- Added a legacy Explorer handoff for large-corpus descriptors and clarified
  facet-detail totals so matched record counts are not confused with capped
  preview rows.
- Softened selected facet and record highlighting in the Explorer so active
  records remain readable without the heavy saturated-blue card treatment.
- Fixed graph stack double-click handling so synthetic stack nodes are
  highlighted or expanded in place instead of becoming unreadable graph-centre
  routes.

## v0.2.0 - 2026-07-08

### Added

- Added `docs/index.md` as the documentation landing page for repository
  navigation, Explorer use, AI usage, bundle authoring, evaluation and dated
  review records.
- Added `docs/repository-guide.md` so contributors can find the publication
  pipeline, stable public URLs, validation commands and source-of-truth
  boundaries.
- Added `docs/ai-okf-usage.md` with prompts and access rules for pointing an AI
  at small OKF bundles or large-corpus descriptors without losing provenance.
- Added `docs/okf-bundle-authoring.md` with the minimum record contract,
  Explorer feature contract, facet/relationship guidance, metadata-repair
  rules and acceptance checklist for new OKF bundles.
- Added `docs/okf-explorer-persona-manual.md`, a screenshot-led manual that
  documents Explorer UI behaviour through personas and user stories.
- Added `docs/demo-script-2026-07-09.md`, a 20 minute demonstration script for
  the UK Government APIs OKF exemplar and Explorer workflow.
- Added current Explorer screenshots under `docs/assets/okf-explorer-manual/`
  covering overview, Provider facet, search, record card, graph, timeline,
  type, resources and Rugby search states.
- Added `scripts/check_documentation_lockstep.py` and wired it into
  `okf-explorer-ci` so human PRs that change publication-critical source,
  generated corpus, tests, workflows, or Explorer source must also update
  documentation and this changelog.
- Added a 100-question OKF Explorer evaluation suite, additive 100-point
  scoring rubric, visual-regression manifest, and browser harness at
  `scripts/evaluate_okf_explorer.mjs`.
- Added graph-overlap screenshot evidence so relationship-label layering,
  overlapping white boxes, and arrow-to-icon placement remain testable review
  concerns.
- Added a separate 100-question GOV.UK CKAN evaluation suite with the same
  additive rubric and pack-aware `target_bundle` support in the harness.
- Added `docs/okf-pack-parity.md` to define parity expectations between the UK
  Government APIs OKF exemplar and the GOV.UK CKAN large-corpus pack.
- Added OS Data Hub visual-regression evidence for search-context loss,
  unreadable dense graph clusters and misleading record-type breakdowns.

### Changed

- Marked the 2026-07-07 code review as a historical record superseded by the
  2026-07-08 follow-up and later `main` merges.
- Updated the 2026-07-08 code-review follow-up with a current-state checkpoint
  and final status table after remediation and later Explorer fixes were merged.
- The UK Government APIs OKF builder now canonicalises OGL licence variants to
  `open-government-licence-v3` and records explicit licence basis/confidence on
  each API/data record.
- ONS records with no source-declared licence now infer Open Government Licence
  v3.0 from ONS terms and mark the record as
  `provider-terms-inferred`, preserving lower confidence than directly declared
  licence metadata.
- Ordnance Survey provider-native API records now infer
  `ordnance-survey-licence-required` from OS licensing guidance instead of
  remaining `not-specified` or being incorrectly treated as OGL.
- OKF Explorer large-corpus search now prepares the static index in the
  background, debounces typing, and shows explicit search/index status.
- The right-hand record card now uses clearer metadata section titles, clickable
  topic/format/tag chips, and info bubbles for licence basis, evidence counts
  and metadata-quality percentages.
- Dense graph relationship rows are stacked into count-bearing graph nodes and
  the relationship list is shown as a drawer-style panel with its own scroll
  area.
- Dense large-corpus graphs now group API/data records by record type, expose a
  visible "Grouped by record type" caption, and expand one record-type stack at
  a time.
- Dense graph stacks now count the full matching reduction while expanded
  stacks show a bounded sample with the sample size stated in the caption.
- Opened graph stacks with many records now sub-group by an available semantic
  facet such as format, topic, licence, access model, contract status, source
  adapter or update year, so dense OS/Data Hub clusters no longer expand into a
  single unreadable fan-in.
- Large-corpus facets now hide duplicate `canonical_publisher` navigation when
  `publisher` is available, expose an in-facet search box, and reveal values in
  pages instead of capping the list at 18.
- Large-corpus facets now render only the active facet body, keep the facet open
  after a value is selected, and normalise hyphen/underscore text consistently
  between the facet search query and the searched values.
- Facet value clicks now behave as single-select by default; Ctrl-click,
  Cmd-click or Shift-click adds/removes values for multi-select filtering.
- Graph node glyphs now distinguish providers, formats, topics, licences, tags
  and hosts/resource types with different compact SVG icons while preserving
  selected and stacked states.
- Graph legends now show the same shape vocabulary used in the graph, including
  opened stack groups.
- Double-clicking graph metadata nodes such as provider, host, format, topic,
  tag or licence now applies the corresponding facet reduction when available,
  so left-panel counts and graph context stay aligned.
- The graph view now separates inspection from graph navigation: single-clicking
  a graph node updates the data card, while double-clicking a navigable node
  recentres/reduces the graph context.
- Large-corpus search now exposes an explicit clear button and clears stale
  selected-record context as soon as a materially different query is typed.
- Bundle URL suggestions now close when focus or pointer interaction moves
  outside the URL control.
- Info bubbles for created, modified and timeline dates now use distinct scoped
  help keys so only the requested explanation opens.
- Large graph arrows now use source and target node shape padding so arrowheads
  terminate at the visual edge of stack/card/circle nodes.
- The graph relationship list now has a centre drag handle for resizing its
  drawer height.
- The large-corpus timeline now defaults to newest dated records first and can
  be viewed as latest records, years, quarters or months; clicking grouped time
  buckets applies the matching date facet.
- Large-corpus in-app Back/Forward now preserves the inspected data card state
  when returning from graph metadata inspection.
- Large-corpus full-index hydration now fetches static JSON chunks in smaller
  batches and retries transient CDN/server failures, reducing the risk of a
  GitHub Pages `503` when opening high-cardinality facets such as Provider.

### Fixed

- Fixed transient GitHub Pages shard failures during Provider facet hydration by
  reducing chunk-fetch concurrency and retrying HTTP 503/5xx responses before
  surfacing an Explorer error.
- Fixed the two open PR review issues: closed facet bodies no longer trigger
  repeated full-corpus facet scans, and facet search tokens are normalised with
  the same hyphen/underscore handling as facet values.
- Reduced the misleading `not-specified` licence gap for ONS CKAN-derived data
  products, data access endpoints, generated contract records, and OS
  provider-native API records.
- Generated Markdown concept pages now expose licence, licence source, licence
  basis, and licence confidence.
- Lightweight search-result detail cards now preserve licence metadata and use
  the same metadata-quality and timestamp wording as fully hydrated record
  cards.
- Graph relationship arrows now render to the trimmed visual boundary of the
  source and target icons rather than passing through card/icon centres.

### Validation

- `python3 -m unittest discover -s tests`
- `python3 scripts/check_documentation_lockstep.py`
- `python3 scripts/build_okf_bundle.py --check`
- `python3 scripts/update_viewer.py --check`
- `python3 scripts/check_okf.py`
- `pnpm test`, `pnpm check`, and `pnpm build` in `apps/okf-explorer/`
- `python3 scripts/build_uk_government_api_okf.py --check`
- `python3 scripts/build_site.py`
- `node scripts/evaluate_okf_explorer.mjs --base-url http://127.0.0.1:8002/_site/next/ --bundle ../uk-government-apis/okf-explorer.json --limit 100`
- `node scripts/evaluate_okf_explorer.mjs --no-browser --suite evaluation/gov-ckan/questions.json`
- `node scripts/evaluate_okf_explorer.mjs --no-browser --suite evaluation/okf-explorer/questions.json`
- Live GitHub Pages header checks for
  `uk-government-apis/okf-explorer.json` and `uk-government-apis/data/apis-9.json`.
- Targeted Playwright smoke against `http://127.0.0.1:8002/_site/next/`
  covering facet search/open state, graph legend/drawer, bundle suggestion
  dismissal, and timeline latest/quarter ordering.
- `git diff --check`
