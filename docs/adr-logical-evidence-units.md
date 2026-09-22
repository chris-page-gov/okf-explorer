# Decision: logical evidence units and bounded reference loading

Status: implemented in the reusable consumer; adoption by a corpus and admission
by a deployed service require separate verification.

## Problem

A PDF page is a physical location. A rule, definition or table can begin on one
page and continue on another. Returning one page can separate a statement from
its qualification. Conversely, returning several whole pages can consume most
of a context budget with unrelated material.

Segmentation alone does not discover missing concepts, establish relationships
or make an answer complete. Those remain separate producer and review tasks.

## Decision

Keep context records and packages at v1. Add optional, explicitly versioned
`evidence_unit` metadata to evidence records. A unit contains the exact joined
source text, its existing whole-text provenance digest and at most 32 ordered
source spans. Its kind, boundary method and completeness remain visible.

Use `okf-context-corpus.v2` when the number of retrieval units differs from the
physical page census. Keep the existing ordinal postings and hash-bound record
shards. Each v2 record shard declares an ascending, non-overlapping `first_id`
and `last_id` range. IDs use percent-encoded ASCII IRIs so producer and consumer
ordering agree. A loaded shard must contain exactly that range, in ID order.

V2 follows supported directed relationships from actual resolved concepts and
lexical candidates to load declared destinations outside the first 16 lexical
matches. It does not use evidence requirements as new seeds. The existing
`references`, `requires` and SKOS navigation predicates retain their meanings.
A structural continuation can belong to one compound unit; that does not create
a new semantic relationship or imply that two different passages are equivalent.

## Integrity and authority

Offsets are half-open UTF-8 byte positions in decoded source text and joined
unit text. They are not PDF byte offsets, JSON file offsets or the UTF-16 text
positions used by compact delivery. The declared joiner is empty, one newline
or two newlines; no undeclared prefix, suffix or joining text is allowed.

The runtime verifies whole-text coverage, valid UTF-8 fragment boundaries,
fragment digests and matching source/extraction URL and hash entries in record
provenance. The producer must additionally verify source-text hashes, offsets
and inclusion against the original frozen extraction. Explorer does not fetch
original PDFs or extraction files to make that check. A producer assertion is
therefore distinguishable from a runtime integrity check.

`provenance.literal_sha256` still hashes the entire `record.text`. Fragment
hashes belong only to `evidence_unit.spans`. This preserves existing integrity
semantics for readers and evaluators.

Machine detection does not confer specialist acceptance. An unresolved boundary
or page fallback produces `unresolved_unit_boundary` and an insufficient package.
`complete-within-declared-boundary` describes that passage boundary only; it does
not change assertion status, review status, applicability or open obligations.
The existing allocator does not prioritise a path whose governance checks fail.

## Bounds and omissions

Retain the 16 lexical candidates, 24 query tokens, 64 files, 16 MiB transfer,
32 MiB decoded data and 8 MiB working-index caps. V2 adds a ceiling of 200
referenced-record loading attempts and 2,000 examined supported relationships.
Requested traversal depth still applies. Record-shard reads remain hash-bound,
confined to the same corpus root, without redirects or credentials.

Missing range entries, missing records, depth limits and exhausted loading
budgets produce explicit retrieval omissions. Corrupt file bindings or invalid
unit structure reject the input. Units fit whole or are omitted whole; delivery
slicing does not change the assembled evidence unit. A selected summary whose
required support is omitted retains the existing missing-dependency diagnostic.

## Compatibility and evaluation

Corpus v1 keeps its physical-page count invariant, lexical-only loading and
package shape. A complete synthetic v1 package was executed with immutable
Explorer `74e29f551776b27b08bfe3bacd774282f0408ffd` and is replayed byte-equivalently
by the successor engine. Its recipe is the two-page `fixture()` in
`corpus.test.ts`, question `apples`, default budget and recorded synthetic URL.

Tests also cover cross-page Unicode, exact joins, false digests, missing
provenance, whole-unit omission, compact metadata reconstruction, directed
references beyond the lexical limit, ambiguous aliases, detached requirements,
unsupported relationships, missing destinations and the new resource bounds.
Frozen service engines, approved source registries and historical receipts are
unchanged. The new consumer is not automatically a new public service engine.

## References

- [Evidence-unit shape](../profiles/context-assembly/v1/evidence-unit.schema.json)
- [Corpus v2 shape](../profiles/context-assembly/v1/corpus-v2.schema.json)
- [Context assembly guide](context-assembly.md)
- [Required evidence allocation](adr-required-evidence-allocation.md)

## Import and publication boundaries

`index.ts` now imports `unit.ts`. Current exporter inventories, service build
relocation controls and comparator input admission include this dependency.
Local schema composition also includes the evidence-unit schema; it does not
fetch schema URLs. The retained archive interpreter supports only its declared
closed schema vocabulary, including the conditional unit shapes.

Existing frozen service adapters explicitly reject corpus v2. No approved engine
is replaced and no new source compatibility pair is inferred. Historical
release-specific runners and all stored observations remain bound to their
original releases; the current verifier must use a newly approved build when a
service later adopts logical units.

### Portable replay inputs

The v1 compatibility check retains both the original expected package and the
exact synthetic manifest and compressed resources that reproduce it. The first
Linux CI run exposed a fixture problem: regenerating gzip on another zlib
implementation changed the compressed size and hashes. Retaining input bytes
fixes the test's portability without changing the engine or the expected
historical package. A tampering control still rejects altered compressed bytes.
