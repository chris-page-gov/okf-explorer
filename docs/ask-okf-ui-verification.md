# Ask OKF interface and page-tool verification

Local implementation check: 16 September 2026. This receipt covers the synthetic
browser fixture and transport tests. It does not claim a published deployment,
specialist validation, or access from a particular AI host.

## Investigation

The inspected baseline was Explorer `ab2e863b` and DWP `75936d5f`. DWP's
`term/common-imprisonment-payability` had six incident assertions: three
model-assisted concept associations and three derived page references.
`term/common-criminal-custody` and `term/common-sp-remand-outcome` each had four.
Their adjacency buckets contained the same assertion IDs as the full relationship
shards, in both directions; their endpoint labels were present. Wider benefit
and legal relationships were absent from the authored graph.

`loadRelationshipsForRoute` in `src/lib/sources/largeCorpus.ts` resolves the
record alias and loads the incident adjacency bucket. The richer runtime uses
its own digest-bound route locator and active planes. The DWP baseline uses
ordinary adjacency. Neither path infers extra domain relationships.

In `src/routes/explore/+page.svelte`, `ensureLargeRouteRelationships` caches
route-specific edges, and `largeGraphModel` preserves direction. The six-edge
example is below the grouping threshold and display cap. Authority, relationship
and node-type filters are empty by default, but can be restored from a URL.
Graph grouping, display limits and hidden labels are presentation behaviour,
so the new context service does not use the drawn graph as its evidence source.

`runLargeSearch` changes query, selection and URL state, and can merge explicitly
configured legislation search results. Ask OKF does not call that handler or
change its worker. The Python adapter in `mcp/` remains the separately documented
local retrieval prototype; it is not a supported client-installable MCP server.

## Interface boundary

The separate Search and Ask OKF controls retain the existing Search state. The
Ask component loads the optional, digest-bound context index only on a question
request. It displays the engine's concepts, whole evidence passages, authority,
scope, provenance, traversal paths, declared requirements, omissions and limits.
Source text is rendered as inert text. Unsafe source URLs are not links.
Relationship and traversal summaries appear before the evidence cards. Whole
source passages expand on demand, with record navigation always available.
Copy and JSON-inspection controls appear at the top of the package.

The component keeps at most four packages in memory for the loaded source.
Source changes dispose the tool registration, cancel pending results and clear
those packages. Questions and packages are not written to browser storage or
the Explorer URL. No model call or external evidence fallback is made.

An evidence record can be outside the retained Search filters. Its explicitly
labelled button opens a separate Explorer tab with the bundle and record route;
the original Search and Ask state remain intact.

## WebMCP boundary

The current [WebMCP draft](https://webmachinelearning.github.io/webmcp/) uses
`document.modelContext.registerTool`, with registration lifetime controlled by
an `AbortSignal`. It is a Community Group draft, not a W3C Standard. The adapter
feature-detects that interface without a legacy fallback or polyfill. The two
tools are `okf_build_context` and `okf_explain_context`.

Both tools validate bounded input and declare read-only, untrusted-content
annotations. They return the same context package used by the interface.
Explanation accepts only an ID retained in the current bundle session.
The [Chrome tool-security guidance](https://developer.chrome.com/docs/ai/webmcp/secure-tools)
describes these annotations and the need to treat external content as untrusted.
Registration does not prove that an AI host can call the tools. The
[Chrome implementation guide](https://developer.chrome.com/docs/ai/webmcp)
describes the current origin trial and local flag; ordinary Ask functionality
continues when the optional browser API is absent.

The automated browser fixtures use an explicit test implementation of the
registration API. They verify the application contract, not native browser or
AI-host interoperability. A real page-tool list and invocation remain separate
acceptance evidence.

## Checks executed

From `apps/okf-explorer`:

```sh
pnpm check
pnpm exec vitest run src/lib/context/webmcp.test.ts
pnpm exec playwright test tests/ui/ask-okf.spec.ts --project=chrome
pnpm exec playwright test tests/ui/ask-okf.spec.ts --project=firefox --project=webkit
pnpm test:e2e:terminal
node --test scripts/run_impacted_browser_tests.test.mjs
```

Results: Svelte check reported no errors or warnings; all 17 transport cases
passed; eight browser cases passed in each of Chrome, Firefox and WebKit
(24 browser cases). The final three-engine Ask run included the expanded
machine-readable package and its keyboard-accessible, read-only text area.

The terminal browser run passed 306 interface cases and 78 rendered-document
cases across the three engines. Review then found that its explicit suite list
omitted Ask OKF and the existing Timeline provenance test. Both are now included
in the runner. A final focused run passed all 24 Ask cases and all three
Timeline provenance cases. All ten runner contract tests pass, including a
comparison with the actual interface test directory to prevent another silent
omission. The final `pnpm check` reported zero errors and zero warnings.

The browser cases cover lazy loading and preservation of Search state; missing
required evidence and smaller budgets; malformed optional review metadata;
inert injected source instructions and an
axe accessibility check; identical build/explain packages; failed-digest
isolation; cancellation on source change; and use without WebMCP at a narrow
viewport. The transport cases cover input bounds, unsupported properties,
unknown explanation input, registration failure and cancellation.

The existing bundle-switch path emitted its pre-existing SvelteKit history API
warning during the source-change case. This receipt does not claim a
warning-free browser run. Publication checks, production build identity,
actual DWP journeys and native host invocation are separate gates.

<a id="fresh-heritage-assurance"></a>

## Earlier Heritage assurance: context-budget correction

The existing Heritage corpus was exercised against the context-budget correction
on 20 September 2026 using Playwright with installed Google Chrome. All 100
questions met the required threshold of 80, with a mean of 92.6.
The tiny, faithful and synthetic-isolation journeys all passed, with no failed
actions, execution errors or validation-only records.

The question results were recorded at `2026-09-20T19:25:08.290000Z`; the journey
results at `2026-09-20T19:23:03.338000Z`. Both bind application tree
`fa442a5f0806c0c9c7f5ab19c1f1362fe48be5cf2a1628414f2bc17114c9dc58` and manifest
`1a08fe787725fc48c132068d08161c090fd6fae6395ffd01ec47309187e10087`.
These were fresh browser executions against the corrected application. Earlier
passing results retain their original build identities in Git history; they
were not relabelled as evidence for this build.

The [earlier local candidate receipt](https://github.com/chris-page-gov/okf-explorer/blob/b9a3b68b6dbf222f9a73cc8f450dd53f126e1b55/evaluation-foundry/fixtures/heritage-warwickshire/evidence/local-candidate-receipt.json)
binds the exact compressed execution results, application and assembled Site.
The materialiser checks the raw and compressed result identities, all 100
question records, every journey action and assertion, and observation timing.
The original source roots and generation date remain unchanged. See the
[evaluation harness](okf-explorer-evaluation.md#evidence-tied-to-an-explorer-build)
for the governed refresh procedure.

These results establish local runtime assurance. They do not establish public
deployment identity, native WebMCP host access, domain correctness or specialist
acceptance. The receipt retains its pending public deployment gate.

## Required-evidence allocation and record-type labels

A fresh local browser execution on **21 September 2026 at 00:48 BST** checked
application tree
`abbcbe8b30c208a2bc4e55a994ec41a7cc5d1a0deb1db51e187b0dd9eec8c4bb`
and manifest
`9fc8cb1bbf10e4e5182efd69d56f2b5ed39a2e6ecf942dce64357c4a529d1ce8`.
All **100 Heritage questions** reached the threshold of 80, with a mean of
**92.6**. The tiny, faithful and synthetic-isolation journeys all passed with
no failed actions, execution errors or validation-only records. Question results
were recorded at `2026-09-20T23:48:06.962000Z`; journey results at
`2026-09-20T23:46:06.995000Z`.

The [current local candidate receipt](../evaluation-foundry/fixtures/heritage-warwickshire/evidence/local-candidate-receipt.json)
binds the actual compressed results and assembled Site. Source corpus versions
remain unchanged; earlier runtime observations retain their own identities in
Git. This is cross-domain local browser assurance, not DWP legal review or a
public deployment check.

The additional mixed-record browser regression holds the full-record response
open, checks the declared type in the search summary, then confirms the same
label after loading. Eleven unit controls check label precedence, invalid or
blank fields and collection fallback. The shared context engine has 18 bounded
allocation/dependency controls. Its [DWP development comparison](../validation/context-allocation/2026-09-21/README.md)
and the [separate service integration](../services/ask-okf-mcp/validation/candidates/required-evidence-2026-09-21/README.md)
record their own source bindings, changed context identifiers and limits.
