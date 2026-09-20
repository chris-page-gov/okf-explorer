# Inspect alternative meanings and load evidence efficiently

Ask OKF assembles evidence. It does not choose a legal interpretation or generate
an answer. This change improves two independent parts of that process: inspecting
ambiguous meanings and loading the files that already contain selected evidence.

## Ambiguity is a question to inspect

A bundle may give the same abbreviation to two concepts. The resolver still
reports both candidates in `ambiguities`; neither becomes a `resolved_concept`.
The assembler now follows each candidate's declared, directed relationships so
the reader can inspect the source material behind each possible meaning.

Every alternative root and subsequent selection reason says **Ambiguous
alternative**, and its traversal path retains that candidate's identifier as the
seed. Evidence for one candidate is not transferred to the other. Only explicitly
resolved concepts activate evidence requirements. The unresolved ambiguity still
prevents a sufficient result, even when both branches have useful passages.
The evidence interface shows an **Alternative meaning** label beside each
retained branch item and keeps the matching ambiguity visible above it.

The same limits apply to these branches: node count, relationship count, depth
and whole-package bytes. Shared junctions retain each alternative's path, up to
the existing four-path-per-record bound; an omitted alternative path is reported.
A restricted passage is not exposed. Missing governance,
source digests, omitted dependencies and explicit conflicts remain visible. The
assembler does not use an evaluation's required record IDs as retrieval seeds.

For example, if a fictional club uses one label for both a reading circle and a
repair demonstration, the reader can inspect the library evidence under the first
candidate and the workshop evidence under the second. It cannot conclude that
the workshop shares the library's access arrangements.

## Four concurrent file reads within the same limits

Corpus discovery previously awaited every search and record shard separately.
It now loads up to four distinct files concurrently in deterministic batches.
A shard is one bounded file containing part of the index or source records.

The loader reserves each file's declared transfer and decompressed size before
starting a request. Parallel reads therefore cannot overrun the existing file,
transfer-byte or decompressed-byte limits. Repeated references are deduplicated.
Denied files receive an explicit omission and are not requested again.

Each admitted file still requires its exact length and SHA-256 digest, a confined
URL, and a matching decompressed length and digest. A failed batch is fully settled
before the operation fails; no following batch is started. The selection order,
lexical ranking, provenance and resource accounting do not depend on response
completion order. The ranking calculation also reuses each term's fixed weight
instead of recalculating it for every matching page.

## An explicit semantic-index limit

The authored semantic index and the working graph may now be up to **8 MiB**
(8,388,608 UTF-8 JSON bytes). This applies to a corpus `base_index` and a direct
`context_assembly` index. The shared `MAX_CONTEXT_INDEX_BYTES` constant enforces
the same ceiling in both consumers. Both transferred and decompressed base-index
references must respect that limit.

The corpus manifest, each search posting file and each source-record file retain
their **4 MiB** limits. Each assembly still admits at most 64 files, **16 MiB** of
transfer bytes and **32 MiB** of decompressed bytes. Output packages remain capped
at 524,288 bytes. Whole candidate pages that would exceed the working-index limit
are omitted with an explicit diagnostic. No source release is rewritten.

These are input/output bounds per assembly, not a total process-memory promise:
parsing and traversal also allocate JavaScript objects. A larger base increases
that working memory and consumes more of the unchanged transfer allowance. The
remote service's existing 8 MiB byte cache remains bounded by eviction; a base
close to its full capacity can evict other files and itself be evicted by the next
shard. Replays may therefore refetch more bytes. The cache is not enlarged by this
change; compressed or partitioned semantic inputs remain a future optimisation.

## What the checks establish

The synthetic tests cover alternative paths without resolved meanings, inactive
requirements, restricted evidence, all context budgets, deterministic packages,
four-file concurrency, reordered responses, transfer and decompressed ceilings,
deduplication, and stopping after a failed batch. Boundary controls accept an
exact 8 MiB semantic index, reject one extra byte, preserve the lower file limits
and verify the direct-index adapter. A browser regression checks separate labels,
inspectable selection reasons and unresolved machine-readable output. These
tests contain no DWP benefit or paragraph rules.

```sh
pnpm --dir apps/okf-explorer exec vitest run src/lib/context
pnpm --dir apps/okf-explorer check
pnpm --dir apps/okf-explorer exec playwright test tests/ui/ask-okf.spec.ts --project=chrome
```

A separate read-only development comparison used the previously published DWP
staff index, without changing its source records or relationships. Candidate-page
overlap rose from 169 to 171 of 177. Thirty-eight of 40 packages were byte-identical;
the two changed packages contained the deliberately ambiguous abbreviation. All
40 remained insufficient and contained no AI answer. The six other missing
candidate pages had no directed path from the resolved concepts. Increasing a
node budget cannot repair an absent semantic path; those need source-grounded
authoring or a corrected evaluation expectation.

In a controlled scheduling experiment, a cached local fetcher added ten
milliseconds per file. Three repeats across five cases, alternating engine order,
produced median times of 304–393 milliseconds before and 155–193 milliseconds
after in the [retained portable DWP comparison](https://github.com/chris-page-gov/okf-dwp/blob/main/docs/context-performance.md).
This measures the scheduling change under an artificial delay. It is not
a public-network benchmark, a service-level promise or evidence of answer
accuracy. Published browser journeys and historical model-trial receipts require
their own exact input and deployment identities.

Changing engine or application bytes also invalidates receipts that bind those
bytes. The synthetic context replay, remote service integration and Heritage
browser evidence must be executed again; an unchanged source corpus does not
make an earlier application receipt current. Their required CI gates remain in
place, and earlier versioned observations remain in Git history.

The refreshed remote compatibility run also records a bounded behaviour change
for the older DWP `bf50ef8d91b9f1ccc2cbdb354198eae74c9ed752` corpus: the larger
working-index allowance retains 128 relationships rather than 127, with the same
64 selected records and an insufficient evidence status. Its context identifier
therefore changes. The other two approved versions retain their context
identifiers. An old replay recipe whose expected identifier no longer matches
continues to fail closed; this refresh does not claim byte-for-byte compatibility
for every historical package.
