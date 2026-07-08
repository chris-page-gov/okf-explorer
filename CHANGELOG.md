# Changelog

All notable changes to this repository are recorded here. Entries are grouped by
date and describe the user-visible publication effect, validation run, and any
source-of-truth changes.

## Unreleased

### Added

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

### Changed

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
- Large-corpus search now exposes an explicit clear button and clears stale
  selected-record context as soon as a materially different query is typed.
- Info bubbles for created, modified and timeline dates now use distinct scoped
  help keys so only the requested explanation opens.

### Fixed

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
- `git diff --check`
