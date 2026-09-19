# Decision: add bounded full-source discovery to Ask OKF

Status: implemented for evaluation, 19 September 2026.

## Problem

A source corpus can contain thousands of pages while its governed context index
contains only one small, explicitly modelled task. Searching more pages does not
by itself supply the missing concepts, qualifications or evidence requirements.
The DWP hospital and staff questions exposed this distinction.

## Decision

Keep the existing context index and add an optional `context_corpus` manifest.
The manifest binds the existing semantic index, all non-empty source page
records and a complete sharded lexical index. It records empty extracted pages
separately. Acquisition, source publication and legal applicability remain
separate facts.

A reusable `context/corpus.ts` module retrieves a bounded set of whole candidate
pages, verifies every transferred and decoded file, then calls the same context
assembler. It does not add relationships, aliases, evidence requirements or an
AI answer. The browser, WebMCP adapter and remote MCP service use this module.
The package has an optional `retrieval` section. Existing packages without this
section remain compatible.

Page ranking uses the question's words only, after the documented normalisation
and generic question-word exclusion. It does not expand the query using matched
concept labels: a broadly declared alias might name a more narrowly scoped rule.
Concept resolution and directed traversal remain separate, inspectable results.
Whole candidate pages are prioritised before those graph seeds, so a large graph
cannot silently consume the entire package before new evidence is included.

## Bounds and security

Each manifest/file is at most 4 MiB decoded. References must remain beneath the
manifest directory, with no parent paths, encoded escapes, arbitrary URLs,
credentials or redirects. Both compressed and decoded SHA-256 hashes and exact
lengths are checked. Streaming reads enforce the declared limits before parsing.

Per call, discovery allows 24 distinct query tokens, 16 candidate pages, 64 files,
16 MiB transferred and 32 MiB decoded. Tokens over 64 characters are omitted with
an explicit query-budget report. Pages are ranked by the sum of
`1 + floor(1000 * log2(1 + corpus_records / posting_count))` for each matched term;
ties use the canonical record ordinal. This is lexical ranking, not a confidence
score. Record identifiers and source text do not encode executable instructions.

The working semantic/evidence index remains within 4 MiB; whole candidate pages
are omitted if necessary. The existing node, edge, depth and response-byte limits
then apply. All query, candidate, resource, working-index and response omissions
are visible and make the result insufficient. A caller can still get useful
source evidence in an insufficient package. There is no web-search or model
fallback.

The public service has a separately approved immutable corpus version. Only its
manifest-declared files at that version can be fetched. It caches verified public
bytes within a bounded cache; cache hits do not change package accounting or
identity. The earlier fully embedded index remains available by explicit version.
No caller-supplied URL, credentials or write-capable tool is accepted.

## Consequences

Full-source discovery is available before full domain modelling. This makes
missing semantic coverage measurable without claiming it is solved. Results may
include historical amendments, repeated passages, unrelated neighbouring text
or damaged PDF extraction. Existing broad aliases can resolve to narrowly scoped
concepts; consumers must read the scope. No completeness claim follows from a
lexical match, recent capture, official source label or graph connection.

The DWP discovery corpus deliberately has no completeness profiles. Its packages
remain insufficient until independently reviewed task requirements establish a
bounded question scope. The original custody profile remains separately usable
within its original assumptions.

## Validation

Synthetic non-DWP tests cover deterministic whole-page retrieval, normalisation,
unsafe paths, altered compressed data, decompression limits, invalid ordinals,
conflicting canonical evidence and small output budgets. Browser tests cover
hash/snapshot rejection, source links, visible retrieval limits and unchanged
narrow-index journeys across Chrome, Firefox and WebKit. Source producers verify
all indexed pages; evaluation reports independently located evidence separately
from answerability and specialist acceptance.
