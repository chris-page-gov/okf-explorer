# Workbench page-tool verification

Recorded on 24 September 2026, with a later sidebar observation below. Local
checks, public browser observations and actual sidebar calls have separate
scopes. The [design](adr-workbench-page-tools.md) and
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
the absent generated module. The isolated retry passed; the other 20 browser
checks passed in the original run.

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
`validation/workbench-tools/2026-09-24/pre-tools-heritage/` and
`validation/workbench-tools/2026-09-24/pre-concurrency-review-heritage/`.
The final local receipt binds source commit `57c2e572` and application tree
`2156ce7311499be99c5d01e5322f7a3db27e3305352ca588710cf38757e0d919`;
all 53 affected receipt and evaluation tests passed after the refresh.
These are general Explorer regression checks, not DWP answer-quality results
or public-deployment evidence.

## Native browser and host observations

Before the final concurrency and history corrections, the connected Edge browser
on the isolated local candidate reported
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

In that initial observation, the assistant connection advertised `pageAssets` and `cdp`, with no
dedicated `webmcp` capability. These native developer calls therefore do **not**
prove integrated assistant-host invocation. No host setting was changed and no
panel renderer was invoked. The tested fallbacks are typed data, ordinary page
controls and a deep link.

## Observed public workbench release

The protected checks passed before [Explorer PR146](https://github.com/chris-page-gov/okf-explorer/pull/146)
and [DWP PR39](https://github.com/chris-page-gov/okf-dwp/pull/39) merged. Each
merged Git tree matches its reviewed candidate. Explorer Pages run `36056044297`
passed build, deployment and its exact-identity browser check.

A separate Chrome journey then verified the public workbench in 9.1 seconds:
68 observed responses, no console errors, blocked calculation inspection for
staff-016, all four qualified carer interaction rows for staff-039, and the Graph,
Requirements and unknown Rates views. The 390-pixel page had no horizontal
overflow. Chrome did not expose native page tools; that gate is **unavailable**,
not a successful AI-client integration.

| Binding | Observed value |
| --- | --- |
| Explorer source | `ce975e90704d1e7cdd15e15c304a92d39759bd99` |
| Explorer application tree SHA-256 | `2156ce7311499be99c5d01e5322f7a3db27e3305352ca588710cf38757e0d919` |
| Explorer application manifest SHA-256 | `72707262ade5bee62818b030489ab1f941f8246a5908e50e38b7ae8f2165008e` |
| DWP source | `d31f16fb7143d04b9de73e14cd493cfb832ae83e` |
| Additive DWP manifest SHA-256 | `294c665de0060769fe05c8e4774d864c540f9b24678791771ee9ed5054b3a65f` |

[Open the observed calculation-inspection case](https://chris-page-gov.github.io/okf-explorer/evidence/?manifest=https%3A%2F%2Fraw.githubusercontent.com%2Fchris-page-gov%2Fokf-dwp%2Fd31f16fb7143d04b9de73e14cd493cfb832ae83e%2Fevaluation%2Fevidence-workbench%2Ftools-manifest.json&case=staff-016&tab=calculation).
The source manifest is immutable; the application URL can later serve a newer
build. These observations cover the workbench, not DWP's separate learning-site
publication, an award calculation or a complete legal answer. All 40 retained
contexts remain insufficient.

## Remaining gates

- Automatic Site-tools discovery in the Edge extension, fresh-conversation
  repeatability and custom panel rendering. The developer-assisted sidebar
  invocation below is a narrower, successful observation.
- Specialist acceptance, complete legal applicability and source closure for
  the staff questions.
- Reviewed dated rate and executable calculation contracts; the newly identified
  GOV.UK adviser calculation guide is a source lead outside the frozen packages.
- A later application release requires a new public observation. Earlier PR145
  receipts and the PR146 observation above retain their own exact builds.

## Later Edge sidebar observation

On 24 September 2026, the actual ChatGPT sidebar used the page's native
registered tools through its authorised CDP developer connection. CDP means
Chrome DevTools Protocol: a browser developer interface, broader than these
seven workbench tools. It called `okf_get_state`, `okf_get_view_data` and
`okf_show_view`, displayed staff-016 **Requirements**, and explained the
returned gaps. A plain-English follow-up displayed staff-039 **Interactions**
and explained rows 1–3 of 4 with the partial-coverage and unreviewed notices.
The page changes were independently checked.

The [DWP sidebar record and starter](https://github.com/chris-page-gov/okf-dwp/blob/42cea5e79e19bd28dce7fccf7b7fe792e3714ce3/docs/workbench-sidebar-demo.md)
retain the manifest hash, result identifiers, observed calling convention and
boundaries. Restricted page inspection returned `undefined` for
`document.modelContext` while native inspection in the same tab found the
registered tools. That restricted result alone was therefore not evidence of
broken registration.

No replacement registry was injected and no browser flag or extension setting
was changed by the coordinating task. This proves the recorded sidebar route;
it does not prove automatic dedicated WebMCP discovery, remote MCP source
admission or correct benefits answers. A fresh conversation must discover its
own supported interface and respect its own permissions.

### Fresh conversation on 25 September 2026

A fresh Edge sidebar conversation repeated the Requirements journey using the
published starter. After native clipboard interaction failed, entering the
same public prompt through the accessibility text field succeeded. The sidebar
used the existing authorised developer connection, discovered the native
registered tools and called `okf_get_state`, `okf_get_view_data` and
`okf_show_view`. It displayed result
`v-8a0d7bd9-e5c8-44d0-9c4d-8d2002d3b43a` and verified revision 3.

The coordinating task independently observed the page change from Calculation
stages to Requirements for `staff-016`, showing rows 1–3 of six. The sidebar
explained the returned gaps, retained `insufficient` and the absence of supplied
source references, and calculated no award. The displayed model was
`5.6 Sol Medium`. This was one actual sidebar request, not an answer-quality
comparison. No browser setting, permission or existing user draft was changed.

This demonstrates a second, fresh-session use of the developer-connection
route. Automatic dedicated Site-tools discovery and other hosts remain separate
acceptance checks. The [DWP connection guide](https://chris-page-gov.github.io/okf-dwp/docs/chatgpt-connection.html)
keeps the saved workbench, fresh browser assembly and remote MCP routes distinct.
