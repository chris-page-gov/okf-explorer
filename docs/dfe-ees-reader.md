# Read DfE CSV data with its metadata sidecar

Explorer can open an Explore Education Statistics (EES) data CSV with its matching `.meta.csv` file. The [DfE Open Data Standards](https://dfe-analytical-services.github.io/analysts-guide/statistics-production/ud.html) describe this paired publishing format. The sidecar defines filters and indicators; standard time and geography columns do not need those definitions.

## Open a pair

Choose **Inspect CSV data** on the learning home, or open the local `/data/` route. Select both files, then choose **Inspect selected files**. They stay in browser memory: they are not uploaded, retained in browser storage or sent to an AI. Choosing another file clears the previous preview. **Clear inspection** clears the displayed result; the file controls remain available.

**Try the DfE example** opens the bundled public guide files: 15 observations, 11 columns and four exact sidecar joins. The [acquisition record](../apps/okf-explorer/static/examples/dfe-ees/source.json) retains their URLs and hashes. Publisher labels such as `Numberofchildren` remain exact.

The Reader shows source names, sidecar labels and roles, units, display precision, filter hints and grouping declarations. It offers an exact-value filter and previews the first 100 matching observations with the complete matching count. Up to 500 distinct filter choices are listed. The downloadable JSON inspection report binds the files by SHA-256 and retains definitions, interpretation and warnings.

Limits are 8 MiB per file, 100,000 observations, 256 columns and 500,000 cells. Larger inputs need a separately prepared bounded extract. UTF-8, a byte-order mark, quoted commas/newlines and doubled quotes are supported. Malformed quoting, inconsistent widths, duplicate headings or definitions, unmatched metadata names, missing compulsory columns, invalid roles and invalid precision are rejected. Filenames must form a `name.csv` / `name.meta.csv` pair. Unknown units are preserved with a warning and displayed without numeric formatting. Indicator grouping and the filter grouping column retain their distinct meanings.

## Preserve meaning

Turn **Apply sidecar display formatting** off to see exact values. Formatting never changes stored source strings. Numeric zero is distinct from `c` (suppressed), `x` (unavailable), `z` (inapplicable), `low`/`k` (rounded to zero) and `u` (low reliability). Empty cells stay empty and their meaning remains unspecified. Strings, formulas and markup are rendered as text, without execution or aggregation.

The declared `indicator_dp` controls display precision; blank uses the guide's two-decimal default. `numberstring` preserves identifier-like values. Numbers beyond the formatter's safe precision remain original text. Raw values remain available through the unformatted view and the local source files.

The original demo uses `geographical_level`; detailed guidance uses `geographic_level`. Either exact spelling is accepted and both together are rejected. Neither is silently renamed. Unlisted columns without metadata are labelled **Unspecified**, with a warning: single-level filters can legitimately omit definitions. Matching names do not prove that two files are the correct publisher pair or edition; check provenance before use.

## Scope and verification

This is bounded local pair inspection. It does not establish statistical accuracy, disclosure safety, current geography-code membership, row-grain uniqueness, DfE upload acceptance or rights to use the data. The publisher screener remains separate. The inspection report is not certification.

The native EES Reader is separate from the [proposed OKF+ tabular-data profile](../profiles/analytical-data/v1/index.md), which expects `okf-analytical-data.json` plus CSVs and has its own versioned validator. This feature does not manufacture that manifest, change the candidate profile or declare publisher adoption. Typed datetime, richer spatial rules and general analytical-manifest previews remain separate.

The implementation is `apps/okf-explorer/src/lib/analytical/ees.ts`, with the `/data/` page. Unit tests exercise the public demo, exact joins, both spellings, CSV escaping, zero/symbols, precision, literal content and bounds. Installed-Chrome tests cover local and bundled loading, numeric/raw views, filtering, hash-bound JSON download, narrow layout and removal of stale output. These are functional checks, not participant or comprehensive accessibility acceptance.

Discovery confirmed that the generic profile had already merged through PR #199. The retained analytical worktree matched `main`. The separate Standards and Architecture work contained an EES checker and receipt, but no native pair importer. This change reuses its documented interpretation and reacquires only the two public examples directly from DfE, without importing the private research packet or changing that active worktree.
