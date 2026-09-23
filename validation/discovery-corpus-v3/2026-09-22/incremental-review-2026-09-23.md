# Independent incremental discovery runtime review

Reviewed changes after `770cab5b` on 23 September 2026. Read-only source review; no full DWP evaluation, provider calls, publication or runtime adoption by this reviewer.

## Result

No blocker found in the reviewed incremental scope. Actual resolved concepts supply initial traversal seeds; assessor requirements do not. Concept paths precede lexical hydration while sharing unchanged file, transfer, decoded-byte, relationship and depth limits. Missing resource paths and depth destinations remain explicit. Minimum visited depth allows a later lexical seed to reopen shallower traversal; incoming relationships remain audit-only.

Compact candidate and incident locators bind whole canonical metadata hashes. Separate bounded readers verify manifest-declared transfer and decoded bytes, ordinal/bucket selection, hashes, identities, public card access, incident directions/counts and assertion-ID commitments before returning original scope/provenance. These reads do not alter context identity or turn cards into evidence. Schema alternatives preserve earlier full diagnostics.

The owner added the requested shallower lexical-seed regression: a concept reaches A at depth 1, then lexical A at depth 0 admits B, with two examined edges and unique incident diagnostics. The reviewer reran the focused suite after this addition; all 39 controls passed.

## Checks and limits

Direct installed Vitest: `./node_modules/.bin/vitest run src/lib/context/discovery-corpus.test.ts` — initially **38/38 passed**, then **39/39 passed** after the additional re-entry control.

The first attempted focused invocation, `npm test -- --run src/lib/context/discovery-corpus.test.ts`, was incorrectly routed through the repository's combined test script. All 720 Vitest tests and the deterministic build passed, but later unrelated native-browser and listener contracts failed in the sandbox (`MachPortRendezvous … Permission denied`, `listen EPERM 127.0.0.1`), and Node attempted to execute the Vitest file as a separate test. This invocation exited 1 and is not counted as full acceptance. No test assertions were weakened; no broader rerun was made.

This review does not establish final DWP answerability, corpus-wide ranking gains, affordability or live client compatibility. The root owns the unchanged-source runtime comparison and later semantic increment separately. The documented 32 KiB metadata refusal remains a visible limitation.

## Reviewed file hashes

```json
{
  "apps/okf-explorer/src/lib/context/corpusV3.ts": "d129d94a61c795d65996b7e206aa0715536645f27a274a702df8eaedabbb3282",
  "apps/okf-explorer/src/lib/context/types.ts": "27a61c10e73bce3a26e727d20bd97dc7ea07a6cf13874657da7d70d549d504fc",
  "apps/okf-explorer/src/lib/context/discovery-corpus.test.ts": "be0104915a4384b7f5415f1e997c533ff1ddf00004e0873fc6f90943e60e16ec",
  "profiles/context-assembly/v1/common.schema.json": "3254763c16a5aff9a569f9818ebd8200b308ecdc5a29f7cca5c3812aed8dd207",
  "profiles/context-assembly/v1/package.schema.json": "f739177136b3a307a849c87fd949482237c662d9ad0551fb11cd64600f922c28",
  "tests/test_context_assembly.py": "c8d797d2115dd5233f953010676345727f86c05526d4ec94ce874c788708e65a",
  "docs/adr-source-bound-discovery-cards.md": "49ea06458c84a5e2cb4b8aa282a6784f995c441b8674c61ebdf3b64b40621505"
}
```
