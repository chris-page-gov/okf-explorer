# Ask OKF remote MCP service

A read-only remote transport for Explorer's existing governed context assembly
engine. It serves approved immutable public OKF-DWP versions anonymously. It makes no
model calls and requires no API key. This is an independent experiment, not an
official DWP service or individual benefits advice.

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

## Compact evidence and browser review

Version 0.3.0 adds two read-only tools alongside the unchanged full-package tool:

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
  "version": "bf50ef8d91b9f1ccc2cbdb354198eae74c9ed752",
  "question": "A claimant is imprisoned. Explain the effect on JSA, IS, State Pension Credit and ESA, distinguishing loss of payment from loss of entitlement, and trace each conclusion to the relevant DMG guidance."
}
```

`version` is optional; omission selects that pinned full-source discovery corpus:
513 PDFs, 19,090 measured DMG/ADM pages and 18,197 non-empty evidence records.
The 893 empty extracted pages remain explicitly accounted for. The corpus also
retains 282 existing concepts and 1,105 directed semantic relationships.

The original 52-record custody acceptance profile remains available by requesting
`version: "efb05c66616a9cd4328a86cf412780fe7bc7cf0b"`. Its immutable index and result
are preserved. Broader corpus discovery has no completeness requirements and
therefore returns `evidence_status: insufficient`, even when useful evidence is
retrieved. Source capture, retrieval and a sufficient answer are different claims.

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

- The default corpus manifest is vendored and hash-verified at build and first
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
- No cookies, credentials, user identities or saved questions. Do not send
  personal claimant data.
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
- Complete packages are about 0.5 MiB; JSON text plus structured content can make
  the MCP response approximately 1 MiB. A client must ingest the complete result
  or disclose its own limit; this service never silently clips it.

## Assurance and deployment

The full-source public HTTPS service was verified on 19 September 2026 using
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
SHA-256 together. A pending publication blocks the release build. The pinned
manifest path is `full-dmg/context/corpus/manifest.json`, matching the additive
Explorer descriptor so identical questions/budgets use the same binding.
Regenerate the Worker and rerun context acceptance checks. Preserve explicit
historical versions; never change a public version to serve different bytes.
No mutable branch alias, model fallback or general web search is provided.

## Verify a remote deployment

The official SDK acceptance client calls the exact imprisonment and hospital
questions against full-source discovery and repeats imprisonment against the
historical custody version. It pins MCP `2026-07-28`, validates discovery
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

The small receipt records question and package digests, context identifiers,
versions, counts, evidence status and timings. It excludes source passages and
question text. Retain the hosting receipt separately: matching data and a local
build digest alone do not prove which Worker build was deployed. SDK success is
also separate from actual ChatGPT and Voice acceptance.
