# Workbench page-tool verification

Recorded on 24 September 2026. This is candidate verification, not a claim of
deployed AI-host compatibility. The [design](adr-workbench-page-tools.md) and
[user guide](workbench-page-tools.md) explain the boundaries.

## Reproducible application measurement

The local replay invokes the real `WorkbenchSession`, with local file-backed
fetch confined to DWP's public workbench directory. The ordinary loader still
checks hashes and canonical package identities. No model, external network,
benefit calculation or new source acquisition is involved.

```sh
node scripts/measure_workbench_tools.mjs \
  --manifest /path/to/okf-dwp/evaluation/evidence-workbench/tools-manifest.json \
  --manifest-sha256 294c665de0060769fe05c8e4774d864c540f9b24678791771ee9ed5054b3a65f \
  --output validation/workbench-tools/2026-09-24/measurement-new-run.json
```

Use a new output filename for each observation; preserve the published receipts.

See [measurement-reviewed.json](../validation/workbench-tools/2026-09-24/measurement-reviewed.json)
for every call, source and engine-file hash. DWP's additive manifest SHA-256 is
`294c665de0060769fe05c8e4774d864c540f9b24678791771ee9ed5054b3a65f`.

| Measure | Observation |
| --- | --- |
| Registered descriptors | 7; 8,640 serialised bytes; 2,160 estimated tokens |
| Service calls | 181; no failures in the corrected bounded journeys |
| Reply bodies across these journeys | 1,444,434 bytes |
| Complete canonical packages for the same 40 cases | 20,303,318 bytes |
| Graph, requirements and unknown-rates views | 40/40 completed, following table continuations |
| Package identity and status preservation | 40/40 unchanged; all remain `insufficient` |
| Carer interaction and formula cases | Search, exact passage, relationship, model inspection and retained presentation exercised |

The byte comparison measures different **amounts of delivered information**:
targeted views versus all complete packages. It is not an equivalent-answer
compression benchmark or an answer-quality improvement. Token counts are a
character heuristic, not model usage. Elapsed times are local observations,
not network or assistant-host latency.

The [initial control](../validation/workbench-tools/2026-09-24/measurement-initial.json)
deliberately remains available: attempting all 40 cases in one uninterrupted
session reached the cumulative journey ceiling. The corrected all-case check
starts one bounded session per case. A human who reaches the ceiling must
explicitly reload the manifest; tools cannot reset their own budget. Reset now
also aborts pending reads, including reloads of identical manifest bytes.

## Independent checks and corrections

Service tests use a synthetic, non-DWP context with network denied. They check
admission, private-record rejection, snapshot and cursor expiry, exact Unicode
reassembly within a 2 KiB response, aborted reads, stale display revisions,
partial-view coverage, source references restricted to delivered rows, same-hash
reload cancellation and model/case mismatch rejection. Adapter tests check
registration lifetime, cancellation, schemas and descriptor size.

Independent review found and corrected flaws before publication: a
same-digest reload could let an older read resume; partial model tables included
sources from undisplayed rows; and an explicit model ID could be paired with an
unrelated case. Browser checks also found a missing keyboard focus target on
scrollable tables. A second review corrected concurrent calls bypassing the
cumulative byte ceiling and a delayed package read overriding Back/Forward
navigation. Model citations absent from an already loaded package now fail
closed; citations into unopened packages are verified when opened. These
failures have regression coverage. The earlier
[measurement](../validation/workbench-tools/2026-09-24/measurement.json) remains
unchanged; the reviewed replay binds the corrected source files.

The reviewed application has 809 passing unit tests, including 48 focused
evidence tests. All 93 runnable Node contract tests passed (one is skipped).
The first Node attempt was blocked by sandbox restrictions on browser launch
and localhost listeners; the permitted retry passed. One Chrome UI check could
not load while a concurrent build rewrote `.svelte-kit`; its error log identified
the absent generated module, and the isolated retry is recorded separately.

Chrome, Firefox and WebKit journeys cover manual navigation, back/forward,
optional registration, tool-to-page retained presentation, safe source links,
and a 390-pixel layout with Axe accessibility checks. These tests use a mock
registry where needed; they are separate from native observations below.

The existing Heritage regression suite was also rerun in Chrome against the
assembled static candidate: all 100 questions scored at least 80 (mean 92.6),
and all three local journeys passed. The refreshed
[candidate receipt](../evaluation-foundry/fixtures/heritage-warwickshire/evidence/local-candidate-receipt.json)
binds the observed application bytes. The preceding receipt and compressed
browser results remain byte-for-byte in
`validation/workbench-tools/2026-09-24/pre-tools-heritage/`.
These are general Explorer regression checks, not DWP answer-quality results
or public-deployment evidence.

## Native browser and host observations

On the isolated local candidate, the connected Edge browser reported
`Edg/153.0.0.0`, a secure localhost context and all seven native tools. Calls
through native `document.modelContext.executeTool` exercised state, search,
view data, presentation, blocked calculation inspection, evidence and directed
relationships. A 2,992-byte interaction view delivered rows 1–3 of 4; the page
displayed exactly that retained result and its partial-coverage warning.
The model inspection returned `blocked`, `execution_allowed: false`; a cited
361-character passage was returned whole, with two selected relationships.

Compatibility failure retained: passing a JavaScript object to Edge 153's
native developer `executeTool` produced `Failed to parse input arguments`.
Passing `JSON.stringify(arguments)` succeeded, and the native result was a
JSON string. This concerns developer invocation syntax in that browser build;
the registered application handler receives an object. Do not silently apply
examples from a different draft/browser version.

The current assistant connection advertises `pageAssets` and `cdp`, with no
dedicated `webmcp` capability. These native developer calls therefore do **not**
prove integrated assistant-host invocation. No host setting was changed and no
panel renderer was invoked. The tested fallbacks are typed data, ordinary page
controls and a deep link. Public deployment needs its own exact-build check.

## Remaining gates

- Actual assistant-host discovery, invocation and panel rendering.
- Specialist acceptance, complete legal applicability and source closure for
  the staff questions.
- Reviewed dated rate and executable calculation contracts; the newly identified
  GOV.UK adviser calculation guide is a source lead outside the frozen packages.
- A new public deployment receipt. Earlier PR145 receipts describe the earlier
  build and must not be relabelled as evidence for this candidate.
