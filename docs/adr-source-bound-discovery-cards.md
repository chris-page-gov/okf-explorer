# Decision: source-bound discovery cards and sharded context relationships

Status: implemented for local evaluation. A producer release, public deployment
and each external client's acceptance remain separate gates.

## Problem

A passage can preserve its complete text but remain difficult to find in a
natural-language question. Its heading, subject description and everyday search
terms may live elsewhere. Adding those words to the source text would break its
provenance. Treating every paragraph summary as a domain concept would confuse
document structure with meaning and overwhelm the bounded semantic base index.

The logical corpus v2 also keeps all assertions in that base index. Large manual
graphs need bounded relationship reads, including proof that an apparently empty
relationship set is actually declared empty.

## Decision

Introduce `okf-context-corpus.v3` as an opt-in source contract. Leave corpus v1
and v2 selection, bytes and replay identities unchanged. Reuse the existing
Reader `context_corpus` entrypoint, context assembler and exact-read transport.
Do not add a separate chat system, remote service default or domain rule.

Three objects remain distinct:

1. A **discovery card** is a separately identified, source-linked description
   used to find a passage. It contains headings, a short summary and search
   aliases, with its own status, scope, authority, provenance and reuse basis.
2. An **evidence unit** is the exact complete source passage with its ordered
   page spans. It is the object selected into the evidence package.
3. A **concept** is an explicitly declared domain meaning. Only concept aliases
   in the small semantic base index participate in concept resolution.

A card's search aliases do not become concept aliases. Its summary does not
become evidence. A card cannot declare official status. Exact extracted headings
and an authored paraphrase still require their declared derivation and review;
source linkage alone does not establish applicability.

## Producer contract

The [v3 manifest](../profiles/context-assembly/v1/corpus-v3.schema.json) keeps the
existing physical-page census and canonical, ascending evidence-ID record shards.
It adds:

- `discovery`: a complete ordinal-aligned inventory of bounded card shards.
  Each [card](../profiles/context-assembly/v1/discovery-card.schema.json) has its
  own `id`, one `evidence_id` and `evidence_sha256`, the SHA-256 of canonical JSON
  for the **complete evidence record**, including metadata and source spans.
- `search`: separately versioned occurrence postings and fixed BM25 parameters.
- `relationships`: 256 hash-bound adjacency buckets, addressed by the existing
  FNV-1a first-byte algorithm applied to the exact canonical record ID.

The base index contains concept and scope records plus bounded requirements.
It contains no evidence records and no assertions. All assertions move into
the adjacency inventory. Every base record and evidence unit has an explicit
adjacency entry, even when both directions are empty. Each direction contains
sorted assertion rows, its exact count and a SHA-256 commitment to the canonical
JSON array of assertion IDs. Loaded endpoints must agree about an incident edge.

Producer-only inputs and descriptive metadata may go into inert `extensions` or
a separate build receipt. They are never interpreted as commands or fetch routes.
Every file remains confined beneath the manifest root and bound to its exact
transferred and decoded bytes. The producer must verify **every** card/evidence
pair, source span, posting, global term total and incident edge before publication.
Runtime checks are query-bounded and cannot replace that complete producer check.

## Ranking is explicit and separately versioned

`okf-bm25.v1` fixes `k1 = 1.2`, `b = 0.75` and the integer score scale at
1,000,000. These are a generic baseline, not parameters fitted to the staff
questions. They must not be changed without another strategy identity.

The source field is exactly `record.text`. The discovery field is
`[label, ...heading_path, summary, ...search_aliases].join('\n')`. Both use
NFKD-normalised, lowercase ASCII alphanumeric tokens of at least two characters;
unlike the earlier presence index, occurrence counts are retained. Query words
still use the shared question-scaffolding policy.

Each posting is `[ordinal, source_tf, source_length, discovery_tf,
discovery_length]`. For each field independently, `N` is the evidence-unit count,
`df` counts positive postings for that field and average length is its declared
total tokens divided by `N`. The contribution is:

```text
idf = ln(1 + (N - df + 0.5) / (df + 0.5))
score = round(1,000,000 × idf × tf × 2.2 /
              (tf + 1.2 × (0.25 + 0.75 × length / average_length)))
```

The two independently quantised field scores are added. Equal scores use the
canonical evidence ordinal. Returned diagnostics keep the source and discovery
scores and matching words separate. Scores are ranking values, not confidence,
truth or authority. Selected postings' frequencies and lengths are recomputed
from the bound card and full unit; a stale or inconsistent pair fails closed.

## Relationship admission and boundaries

Start only from real resolved concepts and ranked evidence units. Load each
visited unit's complete committed incident set, then follow supported outgoing
assertions using the existing `references`, `requires` and SKOS predicates.
Incoming assertions support navigation and audit; they are never silently
reversed or used to create new search seeds. Requirements never create seeds.

Missing cards, stale whole-record bindings, malformed incident commitments,
inconsistent directions, missing declared adjacency entries and altered files
reject the input. A declared destination absent from the unit inventory remains
an explicit missing-evidence issue. Resource and traversal limits produce an
insufficient package with omissions, never a completeness claim.

Retain the existing 24 query tokens, 16 candidates, 64 fetched files, 16 MiB
transferred, 32 MiB decoded, 8 MiB working index, 200 referenced-record attempts
and 2,000 examined relationships. V3 additionally bounds ranking to 2,000,000
posting rows and 200,000 distinct records. Cards have a maximum 2,000-character
summary, 20 heading components and 100 search aliases; every fetched shard is
bounded before decoding. Whole evidence units still fit or are omitted whole.

The assembled package can be larger than a transport response. Existing
`okf_context_manifest` and `okf_read_evidence` return exact bounded portions,
including discovery diagnostics and complete unit metadata. Transport does not
change the context identity, truncate a rule or resolve an evidence gap.

## Reader and future presentation

Existing Reader records, narratives, related links, resources and rich semantic
assertions can project the same card/unit pair. A future two-sided card could
show the navigational summary on one side and the exact passage, source spans,
dependencies and qualifications on the other. This change adds no such visual
interaction. It preserves the distinct identities and provenance needed for it.
The existing SeeLinks-style exploration controls remain presentation tools.

## Validation and limits of the claim

Synthetic non-departmental controls cover card-only discovery, real concept
routes, exact cross-page source text, dependencies beyond the lexical limit,
incoming direction, fixed ranking, resource ceilings, tampering and complete
bounded reconstruction. A new synthetic v2 fixture was captured using the
approved `ea485af6f5c20ba32e63772cc8e851dd44239e2b` source tree; the successor
replays its full package byte for byte. The existing retained v1 fixture remains
unchanged. No historical engine or observation is rewritten.

Source structure, producer coverage, retrieval, retained dependencies and answer
quality must be evaluated separately. Passing these contracts does not establish
complete manual semantics, legal answerability, specialist acceptance, model
quality, affordability or measured speed. No service admission or deployment is
implied by the browser consumer supporting the new contract.
