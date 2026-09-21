# Required-evidence allocation: offline development comparison

This is a new local engine observation over immutable DWP commit `3ef0e786e9a18e76fa17c7d925ff509d6d6c9f84`. It does not change any historical evidence package, model attempt or deployed service. The [architecture decision](../../../docs/adr-required-evidence-allocation.md) describes the candidate and its limitations.

## Results

[Attempt 03](attempt-03/comparison.json) uses the corrected replay-admission runner. All 40 staff-question occurrences run against the same source index, lexical shards, question registry and budget for each engine. The baseline is Explorer commit `b9a3b68b6dbf222f9a73cc8f450dd53f126e1b55`; the candidate source files are archived beside its receipt and identified by SHA-256 hashes.

| Measure | 256 KiB baseline → candidate | 512 KiB baseline → candidate |
| --- | ---: | ---: |
| Known case/source candidate matches | 169 → 177 of 177 | 176 → 177 of 177 |
| Retained declared path occurrences | 330 → 377 of 377 | 362 → 377 of 377 |
| Cases using an extra allocation pass | 16 | 9 |
| Exact baseline packages preserved | 23 of 40 | 31 of 40 |
| Cases changed only by dependency diagnostics | Staff 030 | None |
| Sufficient full-corpus contexts | **0** | **0** |

Counts are case/path occurrences, not unique source pages or independently validated answer accuracy. The first comparison uses the existing declarations: care-home household continuations that were not yet declared as required cannot gain protection from this engine change alone.

The [scoped custody control](custody-regression.json) remains byte for byte identical: **52 records, 127 relationships**, context `urn:sha256:2f7f91af02e098db5447eb1f3e92d0ac78449e3dacc8be68c3fce89a6657d7a9`. Its sufficient status applies only to that original captured custody scope. It does not establish contemporary legal completeness or change the insufficient full-corpus results above.

The 18 synthetic allocation/dependency controls cover competing node, edge and byte limits, exact unaffected-package preservation, lexical seeds, invalid or reversed paths, public access, digests, scope, rights, authority, depth, ambiguity and dependency diagnostics after trimming. Seven separate runner admission controls reject changed modules before import, unapproved files/manifest fields, directory symlinks and oversized modules. These are security and reproducibility checks, not substantive legal review.

## Reproduce without model calls or network retrieval

From the Explorer checkout, with Node supporting TypeScript stripping:

```sh
node --experimental-strip-types validation/context-allocation/2026-09-21/compare.mjs \
  --dwp-root /path/to/okf-dwp \
  --check validation/context-allocation/2026-09-21/attempt-03
node --experimental-strip-types validation/context-allocation/2026-09-21/check-custody.mjs \
  /path/to/okf-dwp --check
node --test validation/context-allocation/2026-09-21/admission.test.mjs
pnpm --dir apps/okf-explorer exec vitest run src/lib/context/allocation.test.ts
```

The DWP checkout must contain the named immutable commit. The runner reads those Git blobs directly, checks their sizes before reading, and the corpus adapter verifies advertised hashes. It does not use the checkout's changing semantic files or private correspondence. Replay checks archived candidate module digests, approved archive paths and the runner identity **before importing archived code**. It rejects symlinks in the archive path or candidate directory and bounds reads. Results then compare deterministically, excluding recorded wall-clock timings and runtime labels. A fresh run requires an unused `--output` directory and never overwrites earlier observations.

One in-process timing per case/engine is retained for diagnosis. Read caching, execution order and local runtime affect it. No deployed performance, causal latency improvement, affordability or provider ranking is established.

## Preserved earlier observations

[Attempt 01](attempt-01/comparison.json) contains the same engine and source inputs, with the same substantive results. Its original runner checked archived candidate digests only at the end of replay, after importing them. That is not safe admission for an untrusted or modified archive. It also lacked full parent-directory symlink admission checks.

The first observation and its exact executed runner remain unchanged. No tampering or unexpected execution was observed in that local run; this statement does not remove the replay weakness. Use the corrected runner with **Attempt 03** for current verification. The original receipt is historical evidence, not a recommended executable replay recipe.

[Attempt 02](attempt-02/comparison.json) reran the original candidate with corrected replay admission. It is retained unchanged. Attempt 03 additionally preserves existing dependency-diagnostic order when no dependency is newly missing: Staff 030 at 512 KiB is now exactly unchanged. At 256 KiB, three stale dependency diagnostics whose source records had already been removed are corrected; this does not make the context sufficient. The [earlier custody control](custody-history/attempt-01.json) retains its original engine binding; the current custody receipt records a fresh execution of the final candidate.
