# Changelog

## Unreleased

- Govern selective CPSV-AP 3.2.0 adoption across the OKF producer portfolio,
  preserving DCAT/DCAT-AP, ELI and statistical-model boundaries while
  requiring pinned standards assets, evidence-bearing mappings and honest
  subset-validation claims.
- Pin the canonical Bundle Wiki v1 profile to the complete, byte-exact
  Explorer v0.6.0 16-file tree and an adjacent machine-readable vendor lock.
  Reconciliation now fails closed on a missing, extra or drifted canonical
  mirror, checks every declared relationship schema, and offers an explicit
  symlink-safe profile sync with opt-in replacement of divergent files.

## v0.6.0 - 2026-08-10 - OKF 0.2 semantic contracts and governed YAML-LD

- Completed the local nine-repository OKF 0.2/YAML-LD migration: every
  reviewed `okf-*` repository now declares one machine-readable semantic
  contract, absolute semantic identities plus safe local routes, synchronised
  direct and reified assertions, deterministic runtime projections and exact
  setup/build/check guidance. Added positive, negative and compatibility
  fixtures; shared-schema sampling to the cross-repository auditor; compact
  digest-bound semantic shards for large graphs; and a bounded rich-runtime
  Reader path with lifecycle-separated planes, SHA-256 route locators and
  per-plane incident assertion commitments. This release commits the Explorer
  contract, plugin and Explorer-owned migration as v0.6.0. The remaining
  producer migrations are independent working-tree changes and are not claimed
  here as committed, released, deployed or publicly verified.
- Closed the independent cross-layer review findings before declaring local
  completion. The shared assertion schema now requires preferred labels and
  canonical credential-free HTTP(S) authority/evidence/rights sources; every
  pinning producer validates its complete population against the exact shared
  bytes. Explicit YAML-LD graphs now fail closed on missing, duplicate, unsafe
  or inconsistent routes and incomplete assertions instead of deriving routes
  from IRIs. The portable contract auditor validates the complete contract
  shape. The older heritage-corpus producer now propagates the preferred label
  into every reified assertion too, so tightening the shared schema does not
  leave a second Explorer-owned generator behind. Rich route hydration now
  takes priority independently of record
  locators, decodes shards sequentially, drops undeclared row properties and
  enforces aggregate compressed-byte, retained-text, evidence and supporting-
  assertion ceilings in addition to its existing row/chunk bounds.
- Hardened the portable contract and plugin review boundary: declared paths and
  globs must stay repository-relative and contained—including authoritative
  inputs and symlinked prefixes—and glob expansion has an explicit match-count
  ceiling. Tooling strings remain untrusted declarations until reviewed against
  trusted guidance, and sampled plain/gzip artefacts are read under explicit
  on-disk and decoded-byte limits. Malformed relationship, semantic or runtime
  JSON now fails the audit instead of disappearing as an empty sample or
  aborting reconciliation, and the shared assertion schema uses the same
  whitespace-free RFC-style IRI rule as the reconciler and Reader.
- Completed the Explorer repository's own OKF 0.2 semantic migration. The
  Markdown graph now deterministically emits `okf-bundle.yamlld`,
  `okf-bundle.jsonld` and a compatibility runtime bundle from one normalised
  source. Its 579 directed Markdown links are represented conservatively as
  evidence-bearing `dcterms:references` assertions with absolute identities,
  suffix-free semantic routes, direct triples, reified assertion nodes,
  provenance and rights; section placement is not promoted into an invented
  domain predicate. Site assembly verifies and publishes both semantic
  representations alongside the runtime projection.
- Added an additive large-record contract for repository-authored Narrative
  Markdown, enclosing-process context, previous/next steps, variants and
  related routes. A selected record now uses this content instead of the
  generic reduced-corpus narrative when the producer supplies it.
- Added typed resource source access with `link`, `json`, `xml` and `text`
  display modes. Explorer fetches only explicitly browser-readable JSON, XML
  and text, renders XML/text as inert escaped content, retains
  `source_api_url` as JSON-only compatibility behaviour and always preserves a
  direct official-source link. No response is persisted or redistributed.
- Standardised authored release pages, semantic profiles, CI labels, plugin
  guidance and visible Explorer copy on British English and GOV.UK plain
  English conventions. Repository and generated producer-agent guidance now
  preserves exact schema values, identifiers, official titles and upstream
  product terminology where localisation would be incorrect or incompatible.
- Made focused-graph navigation explicit and reversible: Graph actions now
  recentre the inspected record, preserve the prior focus in the URL, reset
  the viewport and let browser Back restore the previous focus and inspector.
  Bounded focus graphs enter the established ordered relationship regions at
  four relationships rather than falling back to an unstructured radial view.
- Clarified the large-corpus facet controls as `Clear filters` and `Reset facet
  layout`, grouped them together with Guidance, and kept the compact bundle
  loader beside the Explorer title at tablet widths.
- Tightened graph pointer targets so an icon no longer owns the empty span to
  its label or overlaps another node. List labels now sit inline on their
  outside edge, staircase labels prefer the available left/right width, and
  each visible label retains its own exact clickable target.
- Labelled single record-type stacks as `All matching …`, distinguishing a
  bounded loaded subset from the full match count. Opening a large stack now
  always produces semantic subgroups, with deterministic title bands/ranges as
  the fallback, instead of fanning out as many as 72 individual records. Each
  subgroup can be opened again, and every open/close step is URL-backed so
  browser Back restores the preceding stack depth.
- Split a single dense relationship family into paired left/right columns,
  placing two icons per row and keeping both label columns outside the focus.
  Smaller lists retain the established single-column relationship region.
- Added an explicit open-stack hierarchy above the graph canvas. Every opened
  level keeps its sibling choices together across the row, marks the active
  branch as `Open below`, names the level shown in the graph, and moves inactive
  siblings out of the child canvas. Switching branches or using browser Back
  therefore produces a visible structural change as well as different counts;
  relationship rows use those groups' human labels rather than encoded routes.
- Compressed the graph chrome without flattening its visual hierarchy: node or
  relationship keys now share one horizontally scrollable rail with authority,
  hierarchy levels use slimmer breadcrumb-like rows, and facet cards use tighter
  headers, value rows and three-value summary samples so more of the corpus and
  graph remain visible at laptop and tablet heights.
- Added an evidence-backed Heritage Evaluation Foundry engineering postmortem,
  complete public-safe prompt-response trace, machine-readable process
  registers and a modular content-addressed report builder. The analysis
  reconstructs all three pull requests and six green workflows, identifies
  late-discovery amplification, and specifies an Evaluation Profile v2 impact
  planner and selective-rerun architecture. Rendered reading pages now declare
  the project-relative SVG favicon so direct documentation journeys do not
  create a spurious `/favicon.ico` browser error.
- Implemented every postmortem recommendation: Evaluation Profile v2 and its
  consumer lock; a fail-closed, explainable impact planner; promotion evidence
  outside candidate roots; `normalized-core` and per-plane emitters with
  manifest-owned changed-only writes; 13 adversarial late-finding
  microfixtures; conditional parallel CI plus nightly three-engine shadow
  assurance; content-addressed Site components; hash-sharded semantic and link
  intents; an independently rooted heritage publication unit; and an annotated,
  attested, immutable-release policy. The faithful, tiny and synthetic
  candidates now share one explicit external URL family while remaining
  identity- and count-isolated.
- Made the public verification harness resolve GitHub Pages project-root
  bundle paths, wait for client-rendered identity, select a single terminal
  journey and return a failing exit status when any browser journey fails.
- Made every rendered reading-page return link target the project directory
  root rather than the non-route `/index.html`, and replaced the generated SPA
  fallback with a standalone, accessible 404 whose assets and return link stay
  inside the `/okf-explorer/` GitHub Pages project root.
- Replaced the retired HAR `/list-entry/{NHLE}` inference with the live
  Historic England register search bound by an exact `q=ListEntry` parameter;
  direct NHLE rich pages remain unchanged. YAML-LD record links now prefer the
  Pages project root so SvelteKit hydrates the governed deep route rather than
  treating `/index.html` as an application route.
- Made the external tiny-bundle acceptance fixture wait for the expected
  selected-record heading, so browser success proves hydration completed
  instead of merely observing the pre-hydration panel shell.
- Added a production-scale Evaluation Foundry exemplar for every supported
  National Heritage List for England feature intersecting the exact Coventry
  and Warwickshire district boundaries, plus sanctioned annual Heritage at
  Risk workbook evidence from 2013 to 2025.
- Added a separate source-backed tiny assurance fixture and a clearly labelled,
  default-off synthetic supplement so sparse semantic capabilities can be
  demonstrated without contaminating faithful records, counts or search.
- Extended OKF Markdown additively with governed YAML-LD identity, predicates,
  qualified assertions and deterministic JSON-LD projections, while retaining
  backward-compatible rendering for consumers that understand only ordinary
  YAML front matter and Markdown.
- Added Explorer presentations for heritage detail, source geometry and
  qualified graph evidence, together with bounded alternative-name and
  one-edit typo-tolerant search whose corrections remain visible to users.
- Added a beginner-facing process, 100-question evaluation suite, executable
  consumer journeys, source acquisition and reconciliation receipts,
  identifier-bound link validation, release-root integrity checks and rendered
  HTML publication for the faithful, tiny and synthetic products.
- Promoted the Coventry and Warwickshire profile from provisional to evaluated
  after its exact GitHub Pages descriptor and release root passed the terminal
  browser journey; published copy-ready faithful, tiny and synthetic entry
  points and registered the exemplar in the YAML-LD bundle registry.
- Added a final release-page journey action and a digest-bound, policy-frozen
  tagged-release evidence handoff, while excluding accidental Foundry
  evaluator output from both Git and Site assembly so post-deployment receipts
  cannot alter the verified publication closure. GitHub currently reports the
  release itself as mutable, which the postmortem records as remaining work.

## v0.5.7 - 2026-07-29 - Fail-closed descriptor identity

- Fail closed when a document declares a large-corpus schema without the
  matching `okf-large-corpus` kind, or declares the large-corpus kind without
  the supported schema, instead of silently normalising it as an empty small
  bundle.
- Added unit and real-browser malformed/degraded descriptor coverage for
  producer compatibility gates.

## v0.5.6 - 2026-07-29 - Consumer-proof Foundry releases

- Added a dry-run-first repository bootstrap scaffolder/checker for empty,
  imported and explicitly adopted targets. It creates only reviewed
  foundations and disabled CI, preserves existing files and never initializes
  Git, creates a remote, pushes or publishes.
- Added a bundle-agnostic, package-level real-browser acceptance command that
  binds the exact Explorer source/lock/build, bundle tree and descriptor
  identity to declarative journeys, requests, console output, restored state
  and terminal outcome.
- Extended the authoring profile with repository lifecycle, executable
  consumer identity, explicit compatibility windows, concrete validator paths
  and a 60-second tool-first public-URL share gate.
- Made the Foundry authoring contract machine-check a pinned consumer
  inventory and lock, a connected producer-to-public-route dependency graph,
  two-stage real-consumer fixtures, digest planes, bidirectional compatibility
  and post-deployment deep links.
- Updated both Foundry prompts, the prompt kit, beginner guidance, schema,
  template and semantic validator so a producer-only pass cannot authorise a
  release.
- Made a selected large-corpus record hydrate its resource index before the
  Resources view renders, with a three-browser regression proving the linked
  resource is visible while targeted Graph hydration remains bounded.

## v0.5.5 - 2026-07-29 - Bounded relationship navigation and OKF Foundry

- Replaced the misleading whole-relationship loader on large-corpus facet
  cards with bounded related-record previews, exact match totals and
  index-derived Graph/Links projections. Worker-backed facets no longer
  attempt full record or relationship hydration when their bounded postings
  already provide the required context.
- Made search-result selection load the chosen record's route-scoped adjacency
  immediately, while preserving the whole-corpus memory guard.
- Documented the distinction between the small semantic representations,
  chunked JSON assertion plane and facet membership; added a copy-ready UK
  Legislation AI traversal and declared the current absence of a
  source-and-target route index for the official-effects datapack.
- Published the complete documentation dependency graph as responsive HTML,
  including links embedded in tables and links from documentation into the
  sample knowledge corpus. Internal Markdown navigation now rewrites to
  deterministic HTML routes with stable heading anchors; a post-build crawl
  fails publication for raw same-site Markdown links, missing targets or
  missing fragments, duplicate identifiers, and missing scripts, stylesheets
  or images. Raw source remains machine-discoverable as an exact-build
  alternate, while the visible source link uses GitHub's rendered HTML view.
- Published the Foundry prompt kit, both copy-ready prompts, worked examples
  and authoring profile as safe, responsive HTML. The prompt pages provide
  accessible one-click exact-copy controls, plain-text downloads and an
  AI-neutral procedure and completion checklist while retaining canonical
  Markdown and schema URLs.
- Made the rendered beginner guide's desktop chapter panel independently
  scrollable without moving the article, while retaining normal mobile flow.
- Added deterministic, browser-rendered HTML publication for the complete
  beginner learning path, with accessible chapter navigation, responsive
  tables, safe Markdown handling and links back to the source files.
- Updated Playwright to 1.62.0 and `svelte-check` to 4.7.4 in one
  release-assured maintenance change, including the synchronised lockfile and
  CycloneDX dependency inventory.
- Updated Playwright to 1.62.1, synchronised the CycloneDX inventory, and
  verified the patch with the affected Chrome journeys before the full
  Chrome, Firefox and WebKit assurance matrix.
- Updated SvelteKit to 2.70.1, Svelte to 5.56.8 and Vite to 8.1.5 while
  retaining the compatible TypeScript 6 toolchain, and limited the Dependabot
  Explorer stack group to minor and patch releases so future major migrations
  receive isolated pull requests and validation.
- Updated SvelteKit to 2.70.2 and Vite to 8.2.0, refreshed and checked the
  CycloneDX dependency inventory, and verified the resolved dependency set
  with a clean moderate-or-higher registry audit. The update resolves the
  repository's transitive PostCSS advisory with PostCSS 8.5.25.
- Added a 20-chapter, zero-background learning path covering the complete OKF
  Explorer foundation: browser and static-app concepts, Markdown and bundle
  publication, large-corpus loading, deterministic retrieval, graph and
  semantic-web modelling, validation and provenance, coordinated views,
  geospatial and legislation data, AI infrastructure and federated AI,
  OKF v0.2 trust and lifecycle, bundle federation, Foundry authoring, governed
  enrichment and release assurance, security and accessibility, publication
  checks and contributor workflows.
  The documentation landing page, repository guide, README and advanced
  ontology architecture now route unfamiliar readers into the relevant
  beginner chapters.
- Added a general two-stage OKF authoring protocol: a read-only domain and
  standards warm-up followed by a deterministic build, assurance and
  publication controller.
- Added the versioned `okf-domain-profile.v1` JSON Schema and a complete YAML
  template so research decisions pass between tasks as a bounded,
  hash-lockable contract instead of an unbounded transcript.
- Added a profile validator for JSON Schema, evidence/task/rights/decision
  cross-references and byte-independent JSON/YAML data equivalence.
- Made the handoff carry an explicit collection profile, material claim
  register, calibrated-confidence rules, source format/identity/version
  behaviour, identifier schemes, task risks and standards conflicts so the
  machine contract can represent every fact required by the warm-up prompt.
- Encoded source-native identity, orthogonal authority/evidence axes,
  standards applicability, tiny-fixture preflight, immutable acquisition,
  content-addressed reuse, optional governed model enrichment, frozen-candidate
  security and byte-identical RC promotion.
- Grounded the protocol with cross-domain checks for UK legislation, ONS data
  discovery and GOV.UK content while retaining the strict boundary between OKF
  0.2 core conformance and the additive Foundry production profile.

## v0.5.4 - 2026-07-27 - Pages artefact closure

- Preserved the deterministic Svelte fallback during final Pages assembly
  instead of replacing its manifest-bound `404.html` with a second file.
- Added a fail-closed post-assembly check that rehashes every application
  material declared by the canonical build manifest before Pages upload.
- Retained the independently observed v0.5.3 mismatch as evidence for the
  corrective release rather than weakening the immutable-artefact gate.

## v0.5.3 - 2026-07-27 - Reproducible production builds

- Bound SvelteKit's application-version seed to the synchronised package
  version, removing its timestamp default from application-version metadata
  and client chunk generation.
- Added a fail-closed two-build regression that cleans generated state before
  each production build and compares every generated path and file digest,
  including the exact `index.html` bytes.
- Made both pull-request CI and the Pages publication workflow run the
  deterministic two-build proof before site assembly.
- Published the canonical per-file build manifest with the Pages app and made
  the release-bound runtime stage its exact bytes plus every described build
  file, closing the prior self-attested whole-tree digest boundary.
- Added fail-closed validation for missing, extra, duplicate, unsafe, linked
  and tampered build materials while retaining in-memory manifest derivation
  for mutable local v1 acceptance runs.

## v0.5.2 - 2026-07-26 - Frozen runtime evidence closure

- Made the release-bound legislation runtime receipt self-contained beneath its
  external evidence directory, with safe relative paths and byte/SHA-256
  identities for the runner, both bundle descriptors, the Pages build index
  and every Chrome screenshot.
- Added exact build-index/tree and screenshot-set integrity checks, the
  canonical external receipt basename, and an explicit WCAG 2.2 AA
  accessibility gate for the Whole-Law release controller.
- Kept the Explorer UI and browser journey unchanged while making a passing
  `okf-explorer-runtime-acceptance.v2` receipt independently rehashable.

## v0.5.1 - 2026-07-26 - Governed enrichment runtime hardening

- Added byte- and SHA-verified cross-binding for the accepted assertion
  manifest, independent audit and reviewer receipt before model-assisted
  relationships can become available.
- Made model-enrichment shard loading fail closed and retryable, with global
  assertion-ID uniqueness, exact route/predicate/target validation and
  incomplete-route recovery that cannot be hidden by cached healthy shards.
- Preserved and displayed assertion rights provenance, restored reactive
  availability state, and announced model-enrichment status and failures to
  assistive technology.
- Updated the legislation runtime and evaluation journeys for compact facets,
  bounded record hydration and the current 906,754-relationship publication.

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

## v0.5.0 - 2026-07-26 - Whole-Law federation and bounded runtime

- Added governed metadata-term registries and closed-world validation reports
  to the bundle-wiki profile. Explorer now provides searchable bundle-wide and
  record-scoped term definitions, provenance and validation evidence; bundle
  UI terms can also supply existing `(i)` help text. Semantic-resource labels
  are derived from their actual YAML-LD or JSON-LD serialisation.
- Added a reproducible production-build acceptance runner and evidence receipt
  for the final local Whole-Law/Legislation publication. Chrome, Firefox and
  WebKit now prove federation-child completion, sub-1 MiB compressed startup,
  bounded cold/warm search, facet layout, coloured graph relationships,
  keyboard operation and release-blocking axe results.
- Bounded histogram segment counts by the provider presentation contract so
  24-pixel keyboard targets no longer overflow the navigation panel, and
  normalised source-native `derived-non-official` authority to the distinct
  derived graph style without losing its provenance label.
- Added the additive `okf-explorer-federation.v1` control plane and
  `okf-relationship-assertion.v2` contract. Federations load only their
  overview first; child descriptors and data shards remain untouched until a
  user selects a child.
- Added fail-closed child coverage, authority, freshness, discovery-route and
  relationship-summary validation. Official, deterministic-derived,
  model-assisted and unclassified relationships now have distinct labels,
  detail evidence and graph styling.
- Added declared descriptor fallback routes so Pages, raw-content and mirrored
  descriptors can recover in a fixed order without probing guessed repository
  paths. Repository, documentation and archive links remain visible recovery
  destinations but are never parsed as descriptors.
- Added bounded YAML-LD loading for `.yamlld`, `.yaml` and `.yml` documents,
  including safe JSON content sniffing when static hosts use
  `application/octet-stream`. YAML uses the 1.2 core schema, unique keys, no
  merge keys, no aliases and no custom/executable tags.
- Registered the future UK Whole-Law OKF descriptor and its declared raw
  fallback, repository, documentation, release archive and repository
  subpath.
- Made single-child federation landings useful above the fold and added a
  separate compact inventory for researched source families, so planned legal
  source coverage is visible without misrepresenting it as implemented child
  bundles.
- Prevented complete facet indexes from falling through to whole-corpus record
  hydration while a search worker is starting or lacks filter postings.
  Low-cardinality searchable facets retain coloured distributions, facet
  inventory counts are explicit, stale federation routes are cleared when a
  child opens, and a 50,000-record safety gate rejects unsafe full-index loads
  with a recoverable explanation.
- Added `okf-record-locator-sharded.v1` support so a selected result hydrates
  one integrity-aware record shard by route or search ordinal. Corpus-wide
  relationship hydration is likewise bounded at 100,000 advertised rows;
  larger bundles continue through summaries and route-scoped adjacency.
- Replaced the intermediate-width stacked workspace with a two-column
  navigation/stage layout and a collapsible detail row, preserving the
  overview-first Explorer experience in the in-app browser.

- Made OKF Explorer a dual-version OKF v0.2 exemplar. Structured
  `generated`, `sources`, `verified`, lifecycle, freshness and Attested
  Computation fields now have first-class passive presentation; v0.1
  `timestamp` and body `# Citations` remain labelled fallbacks, with v0.2
  fields taking precedence. Loading a bundle never executes its computation,
  executor or attester.
- Migrated the canonical AI infrastructure Markdown to v0.2, including
  spec-shaped reserved indexes/log, actor-bearing generation and verification,
  lifecycle status and structured provenance. Generators for the small bundle,
  UK Government APIs and UK Legislation now emit v0.2 Markdown while retaining
  the existing YAML-LD, federation, static-search, facet, datapack, integrity
  and presentation extensions. The migration uses the corpus's Git authoring
  commit for generation time instead of treating source publication dates as
  provenance events. Actor-free legacy `verified: yes` flags remain
  unverified rather than being upgraded into invented human review events.
- Split documentation and checks between permissive OKF v0.2 core conformance
  and the stricter Explorer authoring profile. Structured and unknown
  frontmatter fields/types survive generated bundle projection.
- Accepted the dual reader against a locally rebuilt pre-migration `okf-ons`
  publication and its v0.2 successor: both load all 5,097 records, 12 facet
  bars and the exact 382-record region reduction, while only the v0.2
  descriptor advertises its core Markdown layer.
- Changed large-corpus Timeline to distinguish the period represented by a
  release from the date its catalogue metadata was harvested. Repeating
  datasets are grouped into series and compact year/month release links;
  catalogue timestamps are used only as an explicitly labelled fallback.
- Added structured record comparison. Explorer separates other releases in
  the same series from genuine alternative datasets, links each item to its
  own durable route, displays declared field differences, and suppresses
  legacy `Compare before selecting:` prose when the structured alternative
  records are present. Title-derived series are explicitly labelled as a
  presentation aid rather than asserted semantic identity.
- Changed Map to use a bounded viewport with an internally scrolling result
  list and compact horizontally scrollable reduction controls. A labelled
  OpenStreetMap reference layer supplies geographic context while the
  metadata, coverage outline and result list remain usable if map tiles fail.
- Fixed single-predicate facet graphs to use the same stable relationship
  region layout as other metadata fan-outs, retain an accessible Layout
  control, and avoid the inconsistent diagonal stack previously shown for
  values such as `every 12 weeks`.
- Added hierarchy-aware, diverse high-cardinality facet previews. Declared
  bundle hierarchies take precedence; legacy facets receive bounded Year,
  Format, Region and Other summaries instead of a count-only sample. Documented
  SKOS hierarchy authoring in YAML-LD and added SKOS/RDFS/OWL prefixes to the
  pinned bundle-wiki context.
- Changed committed view, graph-key, label, node-type, relationship-highlight
  and graph-layout choices to create addressable browser history entries.
  Re-selecting or Ctrl/Cmd-clicking a highlighted graph node or relationship
  now clears it. The compact graph toolbar again exposes Auto versus
  relationship-region layout.
- Locked the focused node's type in the visible node key so a stale or newly
  selected hide-type control cannot imply that the graph focus can disappear.
- Added a maintained viewer capability inventory, feature matrix, conflict
  register and regression contract across the classic OKF canvas, modern
  LLM-Wiki, CFTE, OKFR, original CKAN and canonical Svelte lineages.
- Added safe small-bundle Markdown tables and Mermaid-lite flowcharts, plus
  exchange-aware Narrative and Timeline presentations that preserve user
  prompts, final answers and chronological commentary.
- Changed small- and large-corpus graphs to use complete non-overlapping
  node-and-relationship label layers on a two-second cycle, with persistent
  selected context, Pause/Resume and reduced-motion handling. Reciprocal
  directed relationships now use distinct curves, collapse identical labels
  and place different labels nearer their sources.
- Added predicate-and-direction relationship controls for large focus graphs:
  Auto or explicit semantic regions, group/member visibility, drag and button
  ordering, reset and durable `graph.*` URL state. The node key now lists only
  types in the displayed graph, and left-list labels remain visible in an
  above-left placement that keeps them out of centre-facing relationships.
  Controlled list and staircase regions keep every node label visible without
  cycling, paint labels above node symbols, compact vertical lists, spread
  staircases across the available width and separate same-side relationship
  lanes. The logical canvas now follows the centre panel aspect ratio, and the
  lower-right staircase exit is reserved before right-list placement. Repeated
  edge predicates are consolidated to one label per group; only conflicting
  edge labels cycle.
- Made graph and relationship controls compact and sticky within the centre
  panel. Plain wheel input now scrolls the panel, while the slower graph zoom
  requires Ctrl/Command+wheel or the explicit buttons.
- Replaced the wrapping graph key and layout panels with a two-line control
  surface. The first line keeps zoom, label-set cycling, node types,
  and relationship types available; the second line switches between
  only the node and predicate types present in the current graph. Node types
  can be hidden without losing their restore control, while selecting a
  relationship type highlights its source nodes, target nodes and directed
  edges. Relationship inspection now separates Source, Relationship and Target
  evidence into three tabs, and SVG keyboard focus follows the edge instead of
  drawing a rectangular outline across unrelated nodes. The Nodes and
  Relationships mode buttons show their current visible counts. Redundant
  on/off wording and the exposed Layout panel were removed; pressed styling
  identifies the active key while the automatic relationship-region layout is
  retained. Focus graphs now repeat the focused node name as an SVG title and
  anchor publisher and licence nodes at the lower left and lower right, giving
  exported screenshots a document-like final line.
- Fixed the dual-collapsed workspace grid so both context rails remain 44px,
  and fixed wrapped relationship-drawer rows so their text cannot overlap.
- Added edge width for an explicit varying numeric relationship metric while
  keeping constant or undocumented scores neutral and arrowheads fixed-size.
  Persistent label placement now looks ahead so a focus label cannot consume
  the only viable position for a boundary-node label.
- Added a layered ontology and semantic graph architecture covering RDF/JSON-LD
  instances, RDFS/SKOS vocabularies, bounded OWL 2 RL-style inference, SHACL
  validation, DCAT/PROV evidence, predicate registries and the strict
  separation of semantics from Explorer presentation.
- Fixed graph panning that previously failed when a drag began over a node or
  relationship, suppressed native drag ghosts, retained context in folded side
  rails, and made detail panels reliably touch-scrollable on mobile.
- Fixed invisible node and label interaction rectangles inheriting white SVG
  borders that cut through graph labels.
- Added unit and Playwright regression coverage for label-layer completeness,
  reciprocal edges, the ONS 21-node/20-relationship focus graph, graph panning,
  safe rich Markdown, conversation views, collapsed context and Android-sized
  detail scrolling.
- Added optional `okf-explorer-provider-datapack.v1` loading for large corpora,
  with formal pack/manifest schemas, required governed-snapshot bindings,
  SHA-256 manifest/pack integrity, bundle-base-path validation, non-exhaustive
  reviewed comparison evidence, HTTPS-only provider actions, and visible
  bundle, record/search and inherited resource status. Matching records outside
  the bounded comparison are labelled as not reviewed, while paired examples
  without a recorded difference are labelled as aligned only in reviewed
  fields. Paired rows with changed known fields require exact, unique difference
  evidence and fail closed when it is missing; declared differences must also
  reference paired examples and match their known values. The deterministic ONS
  fixture demonstrates a governed April 2026 Average house price snapshot
  alongside a May 2026 reviewed upstream reference without claiming live
  validation.
- Added an experimental bundle-level Explorer presentation profile and a more
  compact facet workspace: provider labels/order/control defaults, bundle-local
  user pin/hide/reorder preferences, complete-data distribution strips,
  numeric/date histograms, search-first high-cardinality previews, hierarchy
  browsing, and tabbed result/detail panels. Multi-valued facet reduction is
  now bounded and assignment-aware.
- Removed complete single-valued dimensions from Suggested facets because they
  cannot reduce the current result set. They remain available under All and
  remain visible when selected, explicitly shown or pinned.
- Restored small-bundle graph and link compatibility with generator-produced
  `edges`, added Markdown-body search and safe body rendering, exposed
  credential-redacted source/resource links, and made selected Schema.org,
  provenance and complete node JSON available from the detail pane.
- Updated the SvelteKit, Svelte, Vite and `svelte-check` development stack while
  retaining TypeScript 6.0.3 until the Svelte checker supports TypeScript 7's
  changed module shape.
- Added repeatable post-deployment Playwright execution against the public
  GitHub Pages Explorer, hardened the browser evaluator against cold large-index
  startup, and corrected journey validation for canonical default-sort URLs and
  keyboard relationship selection.
- Added a deterministic geospatial Map canvas for both small and large OKF
  bundles. It classifies declared coverage, coordinates, UK places,
  ArcGIS/OGC services and spatial files; persists Map reductions in public
  URLs; keeps representative centroids distinct from boundaries; and limits
  direct GeoJSON/ArcGIS geometry loading to explicit bounded preview actions
  with source-link recovery.
- Added dedicated Map personas and user stories for area-based policy analysis,
  spatial data analysis, provenance-preserving inspection, locator precision,
  bounded previews, progressive recovery, durable URL state, accessibility and
  trustworthy pack authoring, with machine-readable links to focused browser
  assertions.
- Added an 18-scenario Playwright Map suite covering deterministic small and
  large bundle paths, every reduction and selection control, exact versus
  representative locator states, GeoJSON/OGC/ArcGIS success and cap handling,
  linked-only and failed-resource recovery, durable URL history, keyboard and
  responsive behaviour, empty/loading states and the bounded record list. CI
  now runs the suite, and documentation lockstep treats its tests, config and
  journey traceability as controlled publication surfaces. Journey validation
  also fails on missing or untraced `GEO-E2E-*` identifiers.
- Fixed the UK place vocabulary to recognise canonical display labels such as
  `London` and `North East`, preventing recognised areas from also appearing
  under Other declared coverage.
- Hardened deterministic large-corpus retrieval against stale bundle responses,
  silent or crashed workers, malformed facet values, metadata-gap filters and
  approximate capped-posting totals. Dynamic facets and result summaries now
  remain explicit about fallback and truncation semantics, and legacy small
  bundles normalise scalar alias/tag fields before client-side searching.
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
- Added ELI 1.5 / ELI-I, Schema.org `Legislation`, legislation.gov.uk FRBR/CLML and Akoma Ntoso crosswalks, normalised legal categories and title-derived topic navigation with explicit non-authoritative classification warnings.
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
