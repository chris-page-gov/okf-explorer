# Fictional study-club context acceptance

This non-DWP fixture checks the same generic engine and A–H evaluator with
invented activity and room records. The reading circle depends on its activity
passage and the Library room passage. The Workshop room's unknown accessibility
must not be replaced by the Library room's step-free statement.

`index.json` is a static export of `studyClubContextFixture()` from
`apps/okf-explorer/src/test/contextFixture.ts`. Its exact current output was
compared with this export using the already installed TypeScript compiler in
memory. No application source or compiler options were changed.
`provenance.json` binds the definition and exported bytes. The source date and
capture date inside the fixture are invented teaching metadata, not real
observations about a service.

`case.json` is the separate assessor case. It requires the directed activity to
room chain and exact evidence identity, and excludes unrelated room evidence.
The assembler receives no expected source IDs or rubric.

From the repository root:

```sh
node --experimental-strip-types scripts/run_context_evaluation.mjs \
  --index tests/fixtures/context-study-club/index.json \
  --case tests/fixtures/context-study-club/case.json \
  --output tests/fixtures/context-study-club/execution-workbench-v2.json --check
```

The retained execution observes three selected records and all A–H stages
passing. It demonstrates this specific synthetic dependency, not accuracy on
arbitrary datasets. The engine's separate unit controls exercise missing,
ambiguous, conflicting, restricted and budget-limited cases. The DWP acceptance
also executes mutations of its own real source index.

The 24 September workbench integration records its current consumer in
`execution-workbench-v2.json`. The original `execution.json` remains unchanged
as a historical observation. This new run compares the same source and case;
implementation hashes include the additional delivery module and schemas.
