# Logical-context compact delivery observation

This is a local fixed-source observation of the five existing DWP logical-unit
questions. It makes no network or model calls and does not admit a source to the
remote service. `measurement.json` binds every source file read, the logical
manifest, the runner and the six implementation modules.

## Findings

A 32 KiB inline package must fit evidence **and** diagnostic metadata. Repeating
an item-local warning for each long unit ID can consume the available space as
whole records are omitted. Grouping equal warnings while preserving every ID
avoids three of the four metadata-only refusals in this fixed sample. It does
not make all five inline contexts useful or sufficient.

| Existing question | Previous 32 KiB evidence units | Grouped 32 KiB evidence units | 512 KiB assembly delivered through 32 KiB responses |
| --- | ---: | ---: | ---: |
| Pension Credit abroad | 0 | 0 | 18 |
| Universal Credit temporary absence | 0 | 0 | 16 |
| Pension Credit partner abroad | 0 | 0 | 19 |
| Pension Credit temporary care | 0 | 1 | 15 |
| Pension Credit care-home alternatives | 0 | 0 | 14 |

All contexts remain **insufficient**. Selected units include uncertain lexical
candidates; a higher count is not a relevance, support or answer-quality score.
The larger assembly has a different selection budget: this is a comparison of
inline output with bounded transfer, not equal-budget answer accuracy.

Each 32 KiB delivery reconstructs exact selected text and metadata, including
ordered multi-page source spans, authority, scope, reasons and paths. The test
also reconstructs the entire package, relationships and diagnostics and checks
complete-value digests. Context identity is unchanged by delivery. A catalogue
is not evidence; a single partial read can omit a qualification.

The 59/55/59/53/51 calls per case include intentionally redundant verification:
whole-package reads and separate section/record reads. They are not minimal
production round-trip counts, latency measurements, token counts or cost claims.
The 32,768-byte bound covers each JSON result, not any host's surrounding or
duplicated tool envelope.

## Reproduce

Use the exact DWP commit and immutable inputs recorded in `measurement.json`.
The runner refuses a baseline archive from another manifest, unbound reads,
changed inputs, digest differences or an existing output destination.

```sh
node --experimental-strip-types validation/context-compact/2026-09-22/measure.mjs \
  /absolute/path/to/the-recorded-dwp-checkout \
  /absolute/path/to/a-new-observation.json
```

Observation time may differ. The deterministic case results must be compared
against the same implementation and input hashes; later semantic updates need
a new observation, not a relabelled copy of this receipt.

## Preserved checks and failures

`pre-grouping-study-club-execution.json` preserves the earlier current-engine
receipt unchanged before refreshing its implementation hashes. Its complete v1
context package is byte-identical to the refreshed fixture.

The first local transport test failed because the test asserted a spy call on
an ordinary function; using a spy in that fixture corrected the test. The first
Chrome invocation could not launch inside the sandbox. A subsequent invocation
could launch Chrome but could not reach the sandbox-blocked test server. Both
failed before exercising the application. Starting the isolated loopback server
outside the sandbox permitted the focused new journey and all 13 Ask journeys
to pass. Failure traces remain in the local ignored test-results directories.

The current local checks pass 680 Vitest tests, eight independent context
contract controls and all 13 Ask OKF Chrome journeys. The current study-club
execution and exact replay also pass. Public deployment and genuine external AI
client invocation remain separate acceptance gates.

## Local app assurance

The deterministic app tree is
`94824747b84f20b2e496efe253a1a5887816594e91fcc7e97d8102f129267825`;
its manifest SHA-256 is
`4db342b8959e834a81286a03bf08a2ed287bc5b69d4375470930d7d4505a70b3`.
The independent local Heritage observation passed all 100 questions at the
existing 80-point threshold (mean 92.6), and all three declared journeys. These
are Explorer regression checks over the frozen Heritage fixture, not DWP legal
acceptance or an answer-accuracy metric.

`pre-grouping-heritage/` preserves the previous receipt and its two compressed
result files unchanged. The current canonical receipt was materialised from new
question and journey observations bound to this exact app and assembled Site.
Source snapshot dates and source corpus bytes are unchanged.

An additional successful multi-page catalogue-continuation test passed after
the 680-test run (35 current transport tests in total). Final Svelte checking
reports zero errors and warnings. Twelve retained-archive controls pass; the
app contract suite passes 93 checks with one existing skip. Sandbox-only browser
launch and loopback-listen failures were retained and retried outside that
restriction. No failed assertion or source identity was weakened to obtain a pass.
