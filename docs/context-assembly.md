# Governed context assembly

Ask OKF assembles a bounded evidence package from an explicitly declared
producer index. It resolves declared concept phrases, follows directed
relationships and checks the producer's scoped evidence requirements. It does
not generate an AI answer or decide whether a person qualifies for a benefit.

The byte budget includes source text, provenance, traversal paths and gap
explanations. When the package is too large, the engine removes whole selected
records and recalculates missing requirements before measuring again. It must
not discard an otherwise usable package merely because a final missing-evidence
explanation was added after trimming. If the remaining metadata itself cannot
fit, an explicit insufficient-evidence fallback remains valid. Smaller packages
can omit important material; their budget diagnostics are part of the evidence
boundary, not an answer-quality score.

Search remains a separate discovery operation. Its ranking is not a substitute
for the context engine's dependency and provenance checks. The
[inspection](ask-okf-gap-analysis-2026-09-16.md) and
[architecture decision](adr-ask-okf-context-assembly.md) explain this extension.

## Components

| Component | Responsibility |
| --- | --- |
| Producer index | Declare aliases, evidence, semantic assertions, scope and required context in a versioned document. |
| `src/lib/context/index.ts` | Resolve phrases and assemble evidence without browser state, external retrieval, DWP-specific code or model calls. |
| Source adapter | Load the declared index, verify its digest and snapshot, and preserve its source identity. |
| Ask OKF interface | Present the returned package, paths, provenance and missing evidence. |
| Optional tool adapter | Expose the same read-only operations where the current host supports them. |
| Independent evaluator | Compare an observed package with frozen A–H requirements. |

The paths above are relative to `apps/okf-explorer/`. A bundle without the
optional `entrypoints.context_assembly` index is not silently promoted into a
governed context source. Its ordinary Search remains available.

## What a producer declares

The [additive v1 schemas](../profiles/context-assembly/v1/README.md) separate
concept, evidence and scope records. Each record has a stable semantic ID and
local route. Source passages retain their text, locator, source-file digest,
literal digest, capture date, authority, rights and scope. Any source date keeps
its separate role and precision.

Assertions name their source, target and absolute predicate. The engine follows
the supported DC Terms and SKOS predicates in their declared direction. A
`skos:related` association remains an association; it does not become a legal
condition or entailment. Context requirements identify necessary records for a
declared set of resolved concepts. They are checked after traversal and never
used as hidden retrieval seeds.

An optional `covers` list explicitly includes supporting concepts in a
requirement's scope. Every resolved concept must be covered by an applicable
requirement's `when_all` or `covers` list. Otherwise the package is insufficient;
one supported part cannot silently stand in for the whole question.

An optional `required_paths` list declares exact directed assertion chains.
The engine checks that their records and assertion IDs are retained with the
specified direction, even if another route reached those records. Paths are
checked after traversal and never used to seed it. Missing paths make the
requirement insufficient; finding all the named records alone is not enough.

The producer remains responsible for the quality and completeness of that
modelling. A missing relationship can produce an incomplete package even when
the original source document exists. A complete declared dependency closure
does not prove that every relevant legal source has been modelled.

## Read the package

Start with `evidence_status`, the resolved concepts and any ambiguities or
unresolved terms. Then inspect `selected`, its directed `paths`, the retained
`relationships` and each requirement's `missing` list. Source text is evidence,
never an instruction to execute code or fetch another resource.

The three evidence outcomes are:

- **Sufficient:** the applicable, declared requirements are retained within the
  package's scope, with no reported blocking gaps. This is not a verified answer.
- **Insufficient:** required evidence, interpretation, provenance or budget is
  missing. Read the specific gaps rather than inferring a negative domain fact.
- **Conflicting:** the producer explicitly declared conflicting evidence. The
  engine reports that conflict without selecting a winner.

Conflict detection does not discover every possible contradiction in prose.
Alias resolution uses declared phrases rather than a model's general knowledge.
Unknown questions can therefore be insufficient even when a human could locate
relevant material elsewhere in the corpus.

## Bounds and identity

Default limits are 64 records, 128 relationships, depth 6 and 524,288 bytes.
Maximum limits are 200 records, 1,000 relationships, depth 8 and 524,288 bytes;
the minimum byte budget is 8,192. Whole evidence records are retained or omitted;
their text is never silently shortened to fit. The package records omissions
and cannot describe a budget-truncated result as sufficient.

`context_id` binds the deterministic package content. The package also retains
the index URL, exact index digest and bundle snapshot. A local evaluation can
use a public source locator while reading frozen local bytes; its receipt says
which happened and makes no claim that the URL was fetched.

## Execute an independent evaluation

From the Explorer checkout, use the locked Python environment and Node 26:

```sh
uv sync --locked
node --experimental-strip-types scripts/run_context_evaluation.mjs \
  --index /path/to/assembly-index.json \
  --case /path/to/evaluation-case.json \
  --output /path/to/execution-receipt.json
```

The runner uses the actual TypeScript engine. It validates the index, case and
package against pinned local schemas, checks exact source identities and
directed paths, and independently recomputes the package identity and byte
count. Assessor requirements never enter the assembler. Add `--check` to replay
the deterministic checks against an existing receipt; this preserves the
original observation timestamp.

Run the focused contract and evaluator controls with:

```sh
uv run --locked python -m unittest tests.test_context_assembly -v
pnpm --dir apps/okf-explorer exec vitest run src/lib/context/context.test.ts
```

Read the [A–H evaluation method](context-assembly-evaluation.md) before
interpreting a passing result. Existing lexical MCP measurements and earlier
source-guided model trials remain separate evidence.

## Interface and host boundary

The package and evaluator work without WebMCP or a language model. Optional
WebMCP registration is feature-detected; registration alone does not prove that
the user's AI host can invoke the tools. Browser journeys, genuine tool calls
and model responses require their own observations against the exact deployed
implementation. No such outcome follows automatically from an engine test.

## Full-source discovery

A producer may additionally declare a hash-bound `entrypoints.context_corpus`
manifest. Ask OKF prefers that explicitly advertised corpus; an invalid corpus
fails closed, without silently reverting to the smaller index. The original
`context_assembly` adapter remains compatible for producers without a corpus.

The shared corpus reader selects whole pages from the complete frozen lexical
index, then uses the existing concepts and directed assertions. Inspect the
package's `retrieval` section for corpus/page counts, query words, scored
candidates, fetched bytes, limits and omissions. A lexical candidate is separate
from a resolved concept. No source selection becomes an official interpretation.

Read the [full-source architecture decision](adr-full-source-context-discovery.md)
for exact ranking, limits, integrity checks and failure behaviour. Search,
Reader and Ask can have different declared coverage: for example, a DMG Reader
can expose an Ask corpus that also includes ADM. Evidence without a corresponding
Reader record links directly to its cited source.

## Relationships in large views

Graph and Links expose bounded pages of relationships with counts and navigation.
Graph shows 72 loaded incident relationships per page; Links shows 180 per page.
Opening a relationship stack reveals its members; collapsing it restores the
stack. Overview Links uses the bundle's actual record routes rather than assuming
a `dataset/` prefix. A page counter describes loaded relationships, not a claim
that an entire remote graph has already been fetched. These display controls do
not add relationships missing from the producer's semantic model.
