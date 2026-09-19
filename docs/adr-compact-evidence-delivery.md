# Decision: bounded evidence delivery and stateless review

Date: 19 September 2026. Status: accepted for the version 0.3.0 candidate;
publication and client observations are recorded separately.

## Problem

A governed context can contain useful evidence and still exceed an AI client's
response limit. Reducing the assembly budget changes the selected evidence and
can remove necessary qualifications. Delivery size and answerability therefore
need separate controls.

## Decision

Keep `ask_okf` and its complete `okf-governed-context.v1` output unchanged. Add
`ask_okf_manifest` and `read_okf_evidence` as read-only service tools. The generic
helper in `apps/okf-explorer/src/lib/context/delivery.ts` accepts an already
assembled package and contains no benefit names, paragraph numbers or retrieval
rules. These tools are a transport extension, not a second context assembler.

1. Assemble against an approved immutable source using the shared core.
2. Return a bounded record catalogue, evidence status, gap counts, source
   references and a replay recipe. A catalogue is explicitly not evidence.
3. On every subsequent request, reassemble the original question, version and
   context budget. Reject the request unless its context identity matches.
4. Read only selected record text, metadata, relationships, diagnostics or the
   entire package. Return contiguous slices with a full-value SHA-256 digest,
   offsets and a continuation offset. Preserve exact source text and escaping.
5. Link to a small browser review page that invokes those same tools. It does
   not maintain an audit database or reproduce an AI answer.

No questions or assembled packages are stored or cached. The existing bounded
cache contains only verified immutable public source files. Source refresh,
expert review and AI reasoning remain separate activities.

## Contract and limits

A manifest defaults to 16,384 bytes and permits up to 65,536. An evidence read
defaults to 16,384 bytes, with 8,192–65,536 supported. These limits apply to each
JSON result including escaping and metadata. MCP may return both structured
and text copies; its complete wire envelope can therefore be larger. The
manifest also has a resource link. A client must check its own receiving limit.

The original context budget controls selection; `delivery_bytes` controls only
transfer. A completely transferred package can still be `insufficient` or
`conflicting`. `context_truncated`, `retrieval_truncated` and delivery pagination
are distinct. Reading one slice can miss a qualification; clients must follow
`next_offset` to null for the complete selected value and check its digest.
Offsets count UTF-16 code units, are explicitly labelled and cannot split a
surrogate pair. JSON sections become parseable only after reconstruction.

Every read requires the exact context ID. Unknown versions, arbitrary URLs,
unselected records, invalid offsets and changed questions/budgets fail closed.
A catalogue page after offset zero also requires the identity. The full package
read allows an independent client to reconstruct and compare every field with
ordinary `ask_okf` output.

## Human review and privacy

`/review/` is a static shell. A replay link contains its general question,
immutable version, budget and identity in the URL fragment. The initial page
request and referrer omit the fragment; only selecting **Recreate evidence**
sends the question to the service. Browser history, copied links and AI-client
histories can retain it. Do not put claimant information in a question.

The page renders source content as text, has no model layer and only calls the
same-origin read-only MCP endpoint. Editing a question invalidates old evidence;
stale asynchronous reads cannot overwrite newer selections. Source links are
ordinary HTTP(S) links, never executable source instructions. The response has
an explicit content-security policy and no-referrer/no-store headers.

## Alternatives and consequences

- Lower assembly budgets remain useful but cannot solve lossless delivery.
- Server-side context storage would simplify retrieval, at the cost of question
  retention, expiry, access control and storage lifecycle. Defer it.
- An audit log would require durable event and model-answer records. Do not call
  stateless evidence replay an audit log or claim it reproduces an answer.
- MCP resources can complement tools later. Host support varies; a web review
  resource link and bounded tools are immediately testable without requiring a
  resource client. [MCP resources](https://modelcontextprotocol.io/specification/2026-07-28/server/resources)
  and [tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
  remain separate protocol surfaces.
- Replay repeats assembly and can cost more requests or latency. The existing
  source cache helps, but no token, monetary or model-accuracy saving is claimed.

## Verification

Generic tests reconstruct Unicode/escaped source text and whole packages,
exercise pagination and reject stale identities and invalid ranges. Service
checks exercise strict schemas, official SDKs, unchanged legacy package parity,
static review privacy and deterministic builds. Actual browser, hosted SDK and
AI-client observations must identify the tested source and deployment; local
checks do not certify a live host or ChatGPT Voice.
