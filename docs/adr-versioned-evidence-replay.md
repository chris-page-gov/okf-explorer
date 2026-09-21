# Keep evidence replay stable across assembler upgrades

Status: implemented local candidate, not deployed. Decision date: 21 September 2026.

## Problem

A source version identifies the documents and authored relationships used by
Ask OKF. An assembler is the deterministic code that selects evidence from that
source. Keeping the same source does not keep that code unchanged.

The original 0.5.0 care-home example selected 35 records and 50 relationships.
The required-evidence assembler selected 35 records and 61 relationships from
the same source and budget. Both packages were insufficient. Their context IDs
differed. The existing ID check prevented unnoticed replacement, but an old link
could no longer recreate its original package.

## Decision

Keep two statically imported, byte-bound assemblers: Explorer commits
`c4f2de0a99b7bc2f8b8c8a06a3c715fb56b66d8e` and
`b9a3b68b6dbf222f9a73cc8f450dd53f126e1b55`. Each has a manifest committing to
its exact three source modules. The build verifies every module and derives the
engine ID from that manifest. There is no caller-supplied module path or URL.

The registry explicitly permits both engines for the four existing approved
source revisions. Adding a source to the bundle registry does not automatically
permit it for an older engine. Future source/engine pairs require review and
replay tests. The service and package version remain 0.5.0 in this candidate;
release/version changes are a separate integration task.

New replay recipes include `engine_id`. It identifies the implementation, while
the existing package field `engine: "okf-context-assembly.v1"` identifies the
capability family. `/health` lists the exact current implementation, retained
implementation and compatible source versions.

### New and explicit requests

A new question without an engine uses the current approved assembler. Its
response discloses the actual engine. An explicit engine must be compatible with
the requested source. When an expected `context_id` is supplied, every tool
requires that exact ID. Unknown engines, incompatible pairs and mismatches
return no evidence.

The full `ask_okf` package keeps its historical schema and bytes. Implementation
identity appears separately in the MCP result `_meta["okf/replay"]` and a second
text block. The first text block and `structuredContent` remain the package.

`ask_okf_manifest` and `read_okf_evidence` include a separate `replay_identity`
envelope. It contains the actual engine, explicit/default/compatibility mode,
the specified originating engine or `null`, matching engines, and a hash of
the complete canonical package. The manifest's replay arguments and review link
include the engine ID. Clients retain source version, engine, question, resolved
budget and expected context ID on every continuation.

### Historical recipes without an engine

When a request contains an expected context ID but no engine:

1. Try at most the two compatible approved engines, sequentially.
2. Keep only results with the expected context ID.
3. If multiple results match, compare their complete canonical package bytes.
4. Return identical evidence with the actual reconstruction engine and all
   matching engines. Label the originating engine unknown: a matching result
   cannot establish which implementation originally produced the link.
5. Different complete bytes with the same context ID are ambiguous. No match
   means historical replay is unavailable. Neither case returns replacement
   evidence or clears the expected ID.

A new link created from a successful compatibility replay explicitly pins the
implementation that reconstructed it. It does not retrospectively establish the
origin of the old link. The browser retains the unknown-origin notice while
reading further pages from that reconstruction.

The context ID deliberately omits itself and `budget.used_bytes` from its hash
calculation. Therefore the additional complete-package digest is necessary;
matching context IDs alone are not a byte-equivalence check.

### Shared limits and privacy

Both attempts share the existing limits: 64 file/decode operations, 16 MiB of
unique transferred public bytes and 32 MiB of decoded work. Reservations happen
before asynchronous I/O. The invocation cache shares only hash-verified public
source bytes; decoding a cached file again consumes another decode/file allowance.
The existing longer-lived public-source cache remains separately bounded.

A shared 60-second deadline covers both assemblies, including direct profiles.
Checks before/after assembly, canonicalisation and digest generation reject an
expired result even if no further fetch occurs. An abort signal also bounds
network waits. This does not claim to pre-empt synchronous JavaScript CPU work.
Existing HTTP body, origin, host, concurrency and rate controls remain active.

No anonymous questions or assembled packages are persisted. There are no write
tools. Source text remains inert and separately attributed. The source-family,
evidence-status, scope, ambiguity and review classifications are unchanged.

## Reader and delivery

The review page remains inert until the user submits its form. It accepts old
fragments and engine-pinned fragments, displays implementation and complete
package identity, and keeps the expected ID on failures. Editing the question
or source is an explicit new-task action, visibly labelled before submission.

Pagination checks the context ID, engine ID and complete-package digest.
Record text and source links keep the existing text-only rendering, safe-link
and content-security-policy boundaries. Catalogue responses remain within
16–64 KiB; evidence responses remain within 8–64 KiB including the additional
envelope. UTF-16 slice offsets, surrogate-pair boundaries and whole-value hashes
are preserved. Partial slices remain visibly partial.

## Deferred decisions

No durable snapshot store or native MCP `resources/read` interface is added.
The HTTPS review resource link still invokes bounded reconstruction. Approved
immutable evidence snapshots can later preserve selected public examples after
an engine is retired. Anonymous questions must not be published automatically.
An evidence package is not an AI-answer audit log or a specialist decision.

Retaining two implementations is a finite compatibility policy. Older engines
may be unavailable; unsupported historical links fail visibly. Adding or retiring
an implementation requires an explicit policy change and preserved acceptance
evidence. Transport and implementation identities remain distinct: a landing-page
edit need not invent a new selection algorithm.

## Validation and reproduction

From `services/ask-okf-mcp`, use the locked installation and checks:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run check
npm test
node --experimental-strip-types scripts/verify-versioned-replay.ts \
  --dwp-root /path/to/okf-dwp --out /path/to/new-observation
```

The local observation uses the real vendored loader and verifies exact immutable
DWP Git blobs before passing them to the adapter. It exercises both engines for
all four source versions, both SDK generations, ordered catalogue pages and
complete package slices. The historical packages must match complete-package
hashes in the unchanged original 0.5.0 receipt. These are local transport checks,
not a public deployment or AI-answer quality evaluation.

Focused controls cover unknown/incompatible engines, tampered IDs, the two-pass
limit and sequential order, same-ID/different-byte ambiguity, no-match refusal,
shared deadline/transfer/decode/file limits, integrity failures, minimum-sized
Unicode slices, and preserved engine identity on tool continuations.

The separate local Chrome harness exercises inert opening, keyboard submission,
historical-origin wording, catalogue and evidence identity, explicit new-task
editing and failure without replacement. It uses the frozen custody profile;
it does not claim full-corpus browser, screen-reader, ChatGPT or Voice acceptance.

Exact build-size and retained observation links are recorded in the service
[candidate documentation](../services/ask-okf-mcp/README.md). Local gzip sizes
are measurements, not hosting-capacity or latency guarantees.
