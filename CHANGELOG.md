# Changelog

All notable changes to this repository are recorded here. Entries are grouped by
date and describe the user-visible publication effect, validation run, and any
source-of-truth changes.

## Unreleased

- No unreleased changes.

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
