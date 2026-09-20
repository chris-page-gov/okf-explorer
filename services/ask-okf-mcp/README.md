# Ask OKF remote MCP service

A read-only remote transport for Explorer's existing governed context assembly
engine. It serves approved immutable public OKF-DWP versions anonymously. It makes no
model calls and requires no API key. This is an independent experiment, not an
official DWP service or individual benefits advice.

[Service changelog](CHANGELOG.md). The package version remains **0.5.0** for
the combined DMG and ADM Reader, household/care-home concepts and selected
statutory evidence. This checkout additionally contains an **undeployed shared-engine
candidate** for required-evidence allocation, with a
[separate local integration observation](validation/candidates/required-evidence-2026-09-21/README.md).
It preserves the four approved source versions and existing read-only contracts,
limits and Content Security Policy (CSP). Candidate checks do not attest a new
public 0.5.0 deployment.

The default release is pinned to DWP commit
`3ef0e786e9a18e76fa17c7d925ff509d6d6c9f84`. The build verifies its manifest;
an unpinned or altered release fails closed.
Local tests are not a deployment receipt or a claim that hosting injects no
scripts or cookies. Earlier 0.3.x observations remain historical evidence.

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
verifies the vendored default corpus manifest and reports its immutable identity.
Source shards are verified when requested, so health does not claim every remote
asset is currently reachable. `ASK_OKF_PORT`
changes the local port. The Node wrapper binds loopback deliberately. HTTPS
production hosting uses the Worker build, `dist/server/index.js`, whose default
export implements `fetch(request)`. It has no Node or Ajv dependency and is tested
with dynamic code generation prohibited. Build metadata is in
`dist/build-receipt.json`. Host and origin allow-lists are deployment-owned source
configuration in `src/service.ts`, not caller-supplied parameters.

### Reproduce the four-version local integration

The [current engine-candidate receipt](validation/candidates/required-evidence-2026-09-21/approved-versions.json)
checks the actual vendored source loader, all four immutable version identities,
official SDK 2 and SDK 1 full-package parity, and lossless compact replay of each
complete package. It also checks that a
historical replay cannot silently switch to the current version. The local
corpus reader verifies every requested file against its manifest digest; it
makes no network calls and does not establish remote reachability or hosting.

From this service directory, with all four documented DWP commits available in
a local Git repository. The runner reads exact immutable Git blobs, not the
working-tree files; it refuses to overwrite an existing observation:

```sh
npm run build
node --experimental-strip-types scripts/verify-approved-versions.ts \
  --dwp-root /path/to/okf-dwp \
  --out /tmp/approved-versions-0.5.0-new-run.json
npm run check
npm test
```

The candidate run verified 108 immutable source files and reproduced all four
custody contexts through both SDK versions. It also ran the live verifier’s
exact compact cases locally: self-funded permanent care-home admission at
256 KiB on the current corpus, Child DLA/PIP at 256 KiB on the earlier staff
corpus, the abroad question at 32 KiB on the discovery corpus, and original
custody replay. Source text, provenance, paths,
diagnostics, relationships and complete package slices matched the shared engine.
The three corpus packages remained insufficient; the original custody package
retained its historical, bounded sufficient result and original context identity.
The candidate care-home package contains 35 selected records and 61 relationships;
the [preserved original 0.5.0 observation](validation/approved-versions-0.5.0.json)
contained 35 records and 50 relationships. This
is bounded evidence delivery, not a finding that the question can be answered
completely. The unit suite uses the same real loader and checks the receipt against the
executed runner and current service build. It requires no DWP checkout or network.

The build keeps logical dependency paths stable across real and symlinked
locked installations. Tests compare Worker, Node and receipt bytes in both
layouts. An earlier symlink-dependent local build is [preserved as historical
evidence](validation/history/0.4.0-symlink/classification.json), with its original
receipt and Worker hash. The [0.4.0 receipt](validation/approved-versions-0.4.0.json)
also remains unchanged. The new receipt comes from an actual four-version run
against this candidate; its exact build-hash check remains enforced. Each
receipt attests its recorded engine and bindings, not arbitrary future engines.
The [first 0.5.0 candidate observation](validation/history/0.5.0-source-family-label/classification.json)
is also preserved: its landing page still called the Reader facet “Source
manual”. The subsequent original 0.5.0 build corrected this to “Source family”
and reran the integration without changing context identities. The new
required-evidence engine observation is separate: it changes three corpus
custody context identifiers and the compact care-home identifier. The other
three compact identifiers remain exact. See the
[candidate comparison and boundaries](validation/candidates/required-evidence-2026-09-21/README.md#context-identity-changes-are-explicit).
An immutable source version does not freeze a future engine's package identity;
older receipts and replay identifiers remain tied to their recorded engine.

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

Use the manifest's `question`, `replay.version`, `replay.budget` and `context_id`
unchanged for every read. Request `section: "diagnostics"` to inspect boundaries,
then `section: "record_text", record_id: "<selected ID>"` for a passage and
`record_metadata` for provenance and inclusion reasons. Follow `next_offset`
until null and check `content_sha256` before treating a value as complete.
Catalogue continuation uses `delivery.next_offset` and requires `context_id`.

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

`version` is optional. Omission selects the combined
staff-semantic corpus: 513 PDFs, 19,090 measured DMG/ADM pages and 18,197 non-empty
evidence records. The 893 empty extractions remain accounted for. Its additive
semantic base has 901 records and 1,427 assertions, including 51 authored
concepts, 40 staff-task profiles, legislative reference metadata and 20 selected
statutory units linked by 43 source-backed references. Machine extraction and
normalisation remain distinct from official sources and specialist approval.
These statutory records are additional semantic evidence; they are not included
in the 18,197 PDF-page evidence records or the 513-PDF source count.

| Source selection | Behaviour |
| --- | --- |
| Omit `version`, or `3ef0e786e9a18e76fa17c7d925ff509d6d6c9f84` | Combined DMG and ADM corpus with household/care-home concepts, proposed staff-task requirements and selected statutory bodies |
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

- All three approved corpus manifests are vendored and hash-verified at build and first
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

The undeployed shared-engine candidate passes local registry, SDK transport and HTML-header tests.
The registry rejects cross-version manifest swaps and modified bytes; all three
historical versions stay explicit. Pending metadata prevents release builds.
The primary `compact_delivery` receipt now covers the exact staff question
“Does Pension Credit stop is a citizen moves into a care home permanently if
they are self-funding?” at a 256 KiB context budget. The supplied question's
wording is preserved. `compact_delivery_versions` also retains prior-staff
Child DLA/PIP, the discovery-corpus abroad case and original custody replay.
The live verifier has seven full-package cases and four compact cases, all
using their version-specific source binding.

Hosting, response headers, body transformations, cookies and client behaviour
need separate deployment receipts tied to the engine actually published. Earlier
0.5.0 observations do not attest this changed candidate. No hosting issue is
declared closed by these source changes.

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
The preceding staff release and discovery release remain in separately named
`okf-dwp-staff-corpus-*` and `okf-dwp-previous-corpus-*` vendor files. The original
custody index remains vendored separately. Regenerate the Worker and rerun context
acceptance checks. Preserve explicit
historical versions; never change a public version to serve different bytes.
No mutable branch alias, model fallback or general web search is provided.

## Verify a remote deployment

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
