# Ask OKF remote MCP service

A read-only remote transport for Explorer's existing governed context assembly
engine. It serves approved immutable public OKF-DWP versions anonymously. It makes no
model calls and requires no API key. This is an independent experiment, not an
official DWP service or individual benefits advice.

[Service changelog](CHANGELOG.md) · [Software version](package.json) ·
[Publication procedure](../../docs/remote-mcp-publication.md). Software preparation
and recorded public deployment are separate states.

Service 0.7.0 defaults to the immutable Evidence Connect DMG and ADM source
`7eeded763042ddd0070f4fed834c6074149e8e2f` with the compatible Explorer
engine `d6930bbcddaab616deec002d9e6efff6e3aae953`. Its corpus manifest
and descriptor are vendored by exact byte hash. Discovery cards, source units
and relationship navigation remain separate from legal applicability and answer
quality. All five earlier source revisions and their historical replay paths
remain explicitly available. A new question uses the engine paired with its
selected source; an omitted source selects Evidence Connect. Refresh installed
tool metadata after publication and test the intended client session using the
[connection guide](../../docs/remote-mcp.md#connect-in-chatgpt).

<!-- ask-okf-publication:start -->
## Recorded public deployment: 0.7.0

For the **latest recorded deployment and verification**, use the shared
[DWP service publication status](https://github.com/chris-page-gov/okf-dwp/blob/main/docs/service-publication.md). This dated observation is not a live health check.

On 25 September 2026, the [hosting record](https://github.com/chris-page-gov/okf-dwp/blob/0858f6318188f7812eaff78fce81bda7a5531f5b/validation/compact-delivery/v0.7.0/deployment.json)
records service **0.7.0** as deployed. The separate
[public SDK observation](https://github.com/chris-page-gov/okf-dwp/blob/0858f6318188f7812eaff78fce81bda7a5531f5b/validation/compact-delivery/v0.7.0/sdk/attempt-01/observation.json)
passed **12 evidence cases and 135 requests**,
reconstructing complete packages from bounded reads. It recorded
11,974,541 received bytes, no automatic retries and no model calls.

| Identity | Recorded value |
| --- | --- |
| DWP source | `7eeded763042ddd0070f4fed834c6074149e8e2f` |
| Context engine | `d6930bbcddaab616deec002d9e6efff6e3aae953` |
| Deployed runtime | `31d8c3436ed289bfd694b7889a9e5edea834ea8b` |
| SDK verifier | `31d8c3436ed289bfd694b7889a9e5edea834ea8b` |
| Local Worker SHA-256 | `9c7f31dc62e40b69de10a22aa7685becb16bbe22531d6ee78a9bbc357adfc680` |

The hosting record and public health report have different scopes: health does not
independently attest hosted Worker bytes. Delivery checks do not establish complete
legal evidence, specialist acceptance, answer quality or compatibility with a
particular ChatGPT, Data agent or Voice client. This observation includes no new
public browser journey. Earlier failures and observations retain their own scope.
<!-- ask-okf-publication:end -->

The earlier 0.6.1 source retains all four sources available in 0.5.0. It uses the c4f
assembler; the older sources retain both frozen assemblers. The new default adds
a third pinned engine and gives ten approved source/engine pairs. The build checks
the exact manifests and all three engine archives. Historical
context IDs and complete-package hashes remain enforced. See the
[local preparation observation](validation/candidates/release-0.6.0-2026-09-21/README.md),
[versioned replay decision](../../docs/adr-versioned-evidence-replay.md) and
[live verification protocol](VERSIONED-REMOTE-VERIFICATION.md).

## Run and check

Use Node 22 or later from the repository root:

```sh
cd services/ask-okf-mcp
npm ci --ignore-scripts
npm run check
npm test
npm run build
npm start
```

The local development endpoint is `http://127.0.0.1:8787/mcp`. The equivalent
`/okf/mcp` route avoids a hosting-platform-reserved `/mcp` path; the public
landing page advertises `/okf/mcp`. Both routes use the same handler and tools.
`GET /health`
verifies the vendored default corpus manifest and reports its immutable identity,
current `engine_id` and the approved source/engine compatibility pairs.
Source shards are verified when requested, so health does not claim every remote
asset is currently reachable. `ASK_OKF_PORT`
changes the local port. The Node wrapper binds loopback deliberately. HTTPS
production hosting uses the Worker build, `dist/server/index.js`, whose default
export implements `fetch(request)`. It has no Node or Ajv dependency and is tested
with dynamic code generation prohibited. Build metadata is in
`dist/build-receipt.json`. Host and origin allow-lists are deployment-owned source
configuration in `src/service.ts`, not caller-supplied parameters.

### Reproduce versioned local replay

The [0.6.0 candidate observation](validation/candidates/release-0.6.0-2026-09-21/README.md)
checks ten actual local cases: the current care-home and unknown-term questions
at 512 KiB, plus eight historical source/assembler combinations. The four
preceding-engine packages match the original 0.5.0 complete-package hashes.
Both SDK generations check the catalogue; bounded reads reconstruct every
complete package. The care-home package remains insufficient.

To reproduce the historical 0.6.0 candidate, use its recorded Explorer checkout
with all five approved DWP commits in a local Git repository:

```sh
npm run build
node --experimental-strip-types scripts/verify-release-0.6.ts \
  --dwp-root /path/to/okf-dwp --out /path/to/new-observation
npm run check
npm test
```

The output directory must be new. This reads verified immutable Git blobs and
makes no HTTP or model calls. It is not a public hosting, latency or legal
acceptance check. The preceding `verify-versioned-replay.ts` runner and its
four-source observations remain frozen; reproduce them from their recorded
source revision, not against the changed five-source registry.

The [original 0.5.0 observation](validation/approved-versions-0.5.0.json),
[required-evidence observation](validation/candidates/required-evidence-2026-09-21/README.md)
and all earlier build/receipt archives remain unchanged. Their previous runners
belong to those historical source checkouts; use the new runner above for this
historical candidate's engine envelopes. For this checkout, use the
[versioned verification protocol](VERSIONED-REMOTE-VERIFICATION.md), supplying
the exact current software version and committed build. Its offline mode makes
no HTTP requests. The original care-home example contains 35 records
and 50 relationships; the newer engine's same-source package contains 35 records
and 61 relationships. Both remain insufficient. Preserving their bytes does not
upgrade their evidence status.

The build verifies all three frozen implementation manifests and every declared module.
It also keeps logical dependency paths stable across real and symlinked locked
installations; a regression compares Worker, Node and receipt bytes. An earlier
path-dependent build remains [historical evidence](validation/history/0.4.0-symlink/classification.json).
Each observation binds its actual implementation and build, never arbitrary future
code. A new source revision requires an explicit source/engine compatibility entry.

### Browser assurance

After installing the service dependencies above, use the existing Explorer
browser-test dependencies from the repository root:

```sh
cd apps/okf-explorer
pnpm install --frozen-lockfile
pnpm exec svelte-kit sync
pnpm exec playwright test --config playwright.service-review.config.ts
```

The test configuration builds and starts this service on port 8787, or reuses a
running local preview. It checks Chrome, Firefox and WebKit using the frozen,
vendored historical profile. The required `remote-mcp-browser` CI job runs Chrome; local
cross-browser results and screenshots are written to
`output/playwright/service-review/` at the repository root.

The checks cover inert shared links, explicit replay, catalogue and content
paging, exact displayed source hashes, the selected record's title and source,
provenance, gaps, stale-question handling and escaped source markup. A separate
synthetic response tests hostile markup; it is not source evidence. These checks
do not attest a live deployment, current legal answerability or an AI client's
reasoning. Set `ASK_OKF_REVIEW_BASE_URL` only when intentionally checking another
service deployment; that disables automatic local server startup.

## Compact evidence and browser review

Since version 0.3.0, two read-only tools are available alongside the unchanged full-package tool:

- `ask_okf_manifest`: assemble a context and return a small catalogue. Start here
  when the AI client cannot receive a complete package in one response.
- `read_okf_evidence`: reassemble and verify the same context, then read selected
  evidence, provenance, paths, gaps or the full package in bounded exact slices.

Use the manifest's `question`, `replay.version`, `replay.engine_id`, `replay.budget` and `context_id`
unchanged for every read. Request `section: "diagnostics"` to inspect boundaries,
then `section: "record_text", record_id: "<selected ID>"` for a passage and
`record_metadata` for provenance and inclusion reasons. Follow `next_offset`
until null and check `content_sha256` before treating a value as complete.
Catalogue continuation uses `delivery.next_offset` and retains the same engine and
expected `context_id`. The separate `replay_identity.package_sha256` binds the
complete canonical package; the older context-ID convention is not its full-byte hash.

A result defaults to 16 KiB; `delivery_bytes` allows up to 64 KiB without changing
selection. MCP's text/structured copies and link envelope can be larger than a
single result. A fully delivered package can still be insufficient. The manifest
is not source evidence; no tool generates an AI answer.

Open the returned `review_url` to inspect the same evidence in a browser. The
page is inert until **Recreate evidence** is selected; each request verifies
approved source files and the requested context identity. The URL fragment
contains the general question and may persist in browser/client history.
This is evidence replay, not a stored audit log or AI-answer replay.

See the [delivery decision](../../docs/adr-compact-evidence-delivery.md) for schemas,
privacy, limits and alternatives. Local review: `http://127.0.0.1:8787/review/`.
Release observations distinguish candidate checks from actual deployment.

## Full-package tool contract

`ask_okf` accepts this object:

```json
{
  "bundle": "okf-dwp",
  "question": "A claimant is imprisoned. Explain the effect on JSA, IS, State Pension Credit and ESA, distinguishing loss of payment from loss of entitlement, and trace each conclusion to the relevant DMG guidance."
}
```

`version` is optional. Omission selects Evidence Connect: 513 PDFs, 19,090
measured DMG/ADM pages and 18,197 non-empty extracted pages. The 893 empty
extractions remain accounted for. Its 53,737 source-led records are discovery
units and separately authored profiles; discovery cards are navigation aids,
not legal summaries. The preceding combined corpus's additive
semantic base has 903 records and 1,482 assertions, including 51 authored
concepts, 40 staff-task profiles, legislative reference metadata and 20 selected
statutory units linked by 43 source-backed references. Machine extraction and
normalisation remain distinct from official sources and specialist approval.
These statutory records are additional semantic evidence; they are not included
in the 18,197 PDF-page evidence records or the 513-PDF source count.

| Source selection | Behaviour |
| --- | --- |
| Omit `version`, or `7eeded763042ddd0070f4fed834c6074149e8e2f` | Evidence Connect DMG/ADM source units and task profiles; v3 engine only |
| `723bcc5b015ab38a026625c2148edbd784edf7c7` | Preceding combined partner/household qualifications; 0.6.1 engine only |
| `3ef0e786e9a18e76fa17c7d925ff509d6d6c9f84` | Combined DMG and ADM corpus with household/care-home concepts, proposed staff-task requirements and selected statutory bodies |
| `9de52acf1db84b27f8933d80480eaa850e74fa33` | Earlier staff semantic corpus with metadata-only legal references, retained with its own manifest and binding |
| `bf50ef8d91b9f1ccc2cbdb354198eae74c9ed752` | Earlier full-source discovery corpus, retained byte for byte with its own manifest and binding |
| `efb05c66616a9cd4328a86cf412780fe7bc7cf0b` | Original 52-record custody acceptance profile, with its original immutable index and result |

The combined profiles expose missing scope, source closure, legal-version and
independent-review obligations: all 203 declared obligations remain open.
The statutory additions preserve acquisition dates, requested versions, source
locators, rights and extraction limitations. They are selected evidence, not a
complete amendment/territorial analysis or accepted case applicability. They
do not promote a retrieved page to a
complete answer. The earlier discovery corpus lacks task completeness
requirements and remains insufficient. The custody profile's bounded sufficiency
result applies only to its own declared historical scope. Source capture,
retrieval and an adequately evidenced answer are different claims.

Arbitrary URLs,
unknown bundles/versions and extra fields are rejected. An optional `budget`
accepts `max_nodes`, `max_relationships`, `max_depth` and `max_bytes`, with the
existing core limits. A lower budget can produce an insufficient package.

The response's `structuredContent` is the unchanged `okf-governed-context.v1`
package. Its sole text content block is JSON for the same complete package.
There is no answer wrapper or second schema. The output contract composes
[the canonical package schema](../../profiles/context-assembly/v1/package.schema.json)
and local common definitions. All selection, evidence status, scope, provenance,
paths and omissions come from the shared core. HTTP timings remain outside the
reproducible evidence package.

The official SDK 2.0.0 serves current `2026-07-28` requests and stateless legacy
Streamable HTTP. Tests use both the current SDK with the protocol pinned and
SDK 1.30.0. Legacy responses are SSE; current responses are JSON. Standalone
GET streams, sessions, write tools and subscriptions are not supported. No
`search`/`fetch` pair is needed for ordinary one-call context assembly; this
service does not claim ChatGPT Deep Research compatibility.

## Security and operational limits

- All four approved corpus manifests are vendored and hash-verified at build and first
  use. The shared engine fetches only manifest-listed, hash-bound assets below
  the approved immutable GitHub revision. Redirects and arbitrary URLs are
  rejected. Provenance links are data, never fetch targets. The original custody
  index remains entirely vendored and makes no runtime source requests.
  The service adapter uses `redirect: 'manual'` and rejects every non-OK response,
  including all 3xx statuses, without following `Location`. This preserves the
  shared core's redirect rejection on Worker runtimes which reject the Fetch
  `error` redirect mode before making a request. An isolated workerd
  `1.20260918.1` run reproduced that failure and verified this transport change;
  it is not a replacement for hosted acceptance.
- Immutable public asset bytes have an 8 MiB, 64-file LRU cache per service
  instance. Every asset's size and digest are checked before caching; the shared
  core independently verifies and accounts for files on every context request.
  Questions and assembled packages are never cached.
- Maximum 32 KiB request body, 2,000-character question and 10-second body-read
  deadline. Encoded bodies, batch requests and URL query parameters are rejected.
- Four admitted requests at once and 120 per minute per process/isolate. These
  protect a single instance; hosting must provide any deployment-wide quota or
  distributed denial-of-service protection.
- Origins are exact HTTPS allow-list entries. Requests without Origin are
  permitted for remote non-browser MCP clients. Host checks prevent DNS rebinding.
- The service application creates no cookies and stores no credentials, user
  identities or questions. Hosting intermediaries may have separate behaviours;
  these require a live check. Do not send personal claimant data.
- HTML responses carry `Cache-Control: no-store, no-transform`; JSON, JavaScript,
  MCP and error responses retain `no-store`. Existing CSP restrictions remain.
  [Cloudflare documents that `no-transform` prevents JavaScript Detections
  injection](https://developers.cloudflare.com/cloudflare-challenges/challenge-types/javascript-detections/#if-your-origin-sends-a-no-transform-header)
  (checked 20 September 2026). This is a targeted origin-header change, not proof
  that all hosting scripts, challenges or cookies have been eliminated.
- Diagnostics contain tool/service/bundle version, elapsed time, considered and
  selected record/assertion counts, selected path-step count, package size,
  evidence status, truncation and fixed error codes. They exclude question text,
  raw input, source text, IP addresses, headers and raw exception strings.
- `traversed_path_steps` counts steps in retained explanatory paths; it is not a
  claim to instrument every internal graph operation. Considered counts describe
  the supplied index for historical requests; default corpus diagnostics instead
  label its available record count. The returned package records actual retrieval
  work and omissions. Hosting access logs have their own retention policy.
- Tools are annotated read-only, idempotent and closed-world. Those annotations
  are hints, not a security boundary. Source text, tool descriptions and returned
  data remain untrusted inputs to any AI client.
- Complete packages can approach 0.5 MiB; JSON text plus structured content can make
  the MCP response approximately 1 MiB. A client must ingest the complete result
  or disclose its own limit; this service never silently clips it.

## Assurance and deployment

The 0.6.0 implementation passes registry, SDK transport and HTML-header
controls. Cross-version manifest swaps and the previous engine/new source
combination fail closed. Four historical source versions remain explicit.
The new local integration preserves the original care-home wording and verifies
both current public questions at a 512 KiB context budget. The current care-home
package is 523,326 bytes with 55 records and 115 relationships; it remains
insufficient. The actual unknown-term control has zero selected records and also
remains insufficient. Whole-package transport equality does not close evidence
or applicability gaps.

Hosting, response headers, body transformations, cookies and client behaviour
need separate deployment receipts tied to the engine actually published. Earlier
0.5.0 observations do not attest 0.6.0. The dated 0.6.0 hosting and SDK records
above do not establish new public-browser or client-specific acceptance.

The earlier full-source public HTTPS service was verified on 19 September 2026 using
the official SDK 2.0.0 with protocol `2026-07-28`. Its imprisonment and hospital
packages matched direct shared-core execution in full; both remain insufficient
and report core truncation. Explicit historical imprisonment retained its
original sufficient package and context identity. Explorer source revision
`751201168bf16ad9caec80eb4c1b9bf8514f1c71` produced the deployed Worker
`bd14ead0a450f95ec60efc8f87def3d17b5ad071fd7c2a20f410a1347312c5af`.
The [initial remote access record](../../docs/remote-mcp.md#initial-full-source-https-verification)
separates hosting and SDK receipts from the independently passing 43-case raw
HTTP run. All 43 results remain insufficient; retrieving candidate evidence is
not an answer-quality assessment. Subsequent client and published-browser
observations are maintained in
[OKF-DWP's demonstration record](https://github.com/chris-page-gov/okf-dwp/blob/main/docs/remote-mcp-demo.md).
An initial ChatGPT call exposed conversational-word ranking noise, prompting a
separately evaluated shared English query-filter correction. The earlier hosted
receipt certifies only its recorded engine and deployment bytes.

Tests cover immutable hashes, current and legacy SDK parity with the direct
index and corpus engines, full-text/structured-content equality, input rejection,
small-budget failure, historical hospital gaps, exact origins/hosts, malformed
requests, bounded verified asset caching, concurrency, rate limits, safe
diagnostics and Worker execution without dynamic code generation. Corpus
transport fixtures are explicitly synthetic; separate DWP source/evaluation
receipts check the actual corpus. These tests do not prove ChatGPT or Voice access.

The deployment owner must test the actual HTTPS endpoint from ChatGPT and retain
raw responses before claiming live compatibility. Explorer page-local WebMCP and
remote MCP are separate transports over the same core. See
[the architecture decision](ARCHITECTURE.md) and
[remote access documentation](../../docs/remote-mcp.md) for the deployment
and client acceptance record.

## Updating the approved bundle

Use a reviewed change to vendor the new manifest and update
`vendor/okf-dwp-corpus-release.json` with its immutable commit, snapshot, size and
SHA-256 together. A pending publication blocks the release build. The new default
manifest path is `combined/context/corpus/manifest.json`, matching the additive
Explorer descriptor so identical questions/budgets use the same binding.
Recopy the final manifest if the combined projection changes before pinning.
The preceding household, staff and discovery releases remain in separately named
`okf-dwp-household-corpus-*`, `okf-dwp-staff-corpus-*` and
`okf-dwp-previous-corpus-*` vendor files. The original
custody index remains vendored separately. Regenerate the Worker and rerun context
acceptance checks. Preserve explicit
historical versions; never change a public version to serve different bytes.
No mutable branch alias, model fallback or general web search is provided.

## Verify a remote deployment

For a new observation, use the [bounded verifier](VERSIONED-REMOTE-VERIFICATION.md).
It defaults to an offline plan, binds the exact source/engine catalogue and
requires `--execute-public` for an authorised live observation. Its received
compact slices reconstruct the same 512 KiB contexts. Each run needs its own
receipt; the dated observation above is preserved. Health reports identities;
only a separate hosting publication record
can bind the deployed Worker.

### Historical 0.5.0 verification procedure

The procedure below records the preceding four-source verifier. It remains
unchanged for historical reproduction at its recorded release commit. Do not
use it as the acceptance protocol for 0.6.0.

The official SDK acceptance client calls the exact imprisonment, hospital and
staff questions across the four approved versions. It pins MCP `2026-07-28`, validates discovery
against the canonical input/output schemas and all read-only annotations, then
compares every returned package field with a fresh call to the unchanged local
engine. Discovery remains insufficient; historical custody retains its original
bounded sufficiency result. It also checks JSON text parity and bundle identity
advertised by `/health`.

Before contacting the endpoint, the verifier checks every recorded build input
and output digest, requires runtime inputs and build logic to match the recorded
Git commit, and reproduces the local build byte for byte. It fails on changed
runtime inputs or a stale receipt. The receipt separately hashes and classifies
the verifier itself, including an explicitly uncommitted verification script;
it never presents an arbitrary working tree as committed source.

```sh
node scripts/verify-remote.mjs --endpoint https://ask-okf.crpage.chatgpt.site/okf/mcp --output /tmp/ask-okf-sdk-verification.json
```

Every HTTP request to the service, including health and SDK discovery, starts
at least 750 ms after the previous one. This conservative client pacing stays
below the service's 120-request/minute limit when no other client shares that
instance. Direct immutable-source downloads are separate. The receipt records
the interval, observed minimum spacing, request/status counts and zero automatic
retries; SDK reconnection retries are disabled. A 429 or other failed request
stops verification. Preserve that failure; do not silently rerun it. The pacing
helper is independently hash-bound with the verifier and tested with concurrent
requests, rate-limited responses and network failure.

The small receipt records question and package digests, context identifiers,
versions, counts, evidence status and timings. It excludes source passages and
question text. Retain the hosting receipt separately: matching data and a local
build digest alone do not prove which Worker build was deployed. SDK success is
also separate from actual ChatGPT and Voice acceptance.

## Logical-unit consumer compatibility

The shared context profile can describe exact logical-unit source spans. Current
schema composition resolves that optional shape from pinned local files, and
compact `record_metadata` reads preserve every span. The archive exporter binds
its added validator and schema dependencies explicitly. These are consumer
capabilities, not new source or engine approvals.

The two frozen service adapters remain restricted to corpus v1 and refuse
corpus v2 before fetching evidence. Their source compatibility pairs, module
bytes and historical receipts remain unchanged. A public logical-unit service
requires a separately reviewed immutable engine, source approval and actual
verification. See the [logical-unit decision](../../docs/adr-logical-evidence-units.md).
