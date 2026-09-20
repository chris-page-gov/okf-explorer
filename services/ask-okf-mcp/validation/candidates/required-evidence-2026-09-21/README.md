# Required-evidence engine: local integration observation

**Undeployed engine candidate.** This observation does not replace the
[original 0.5.0 receipt](../../approved-versions-0.5.0.json), attest the public
service, or introduce a new service release. Package version `0.5.0`, the four
approved source pins, source bytes and read-only tool contracts are unchanged.

Observed at **00:36:46 BST on 21 September 2026** (`2026-09-20T23:36:46.001Z`).
The [integration receipt](approved-versions.json) binds the unchanged executed
runner and its helpers. The [build receipt](build-receipt.json) records the
candidate source hashes and Worker SHA-256
`0a52a679eef3d7598ec3dac4b3352966a38f401e1e4b18dd52e2d453583a86f2`.
The [classification and comparison](classification.json) binds both receipts,
preserved earlier observations and the exact before/after context identifiers.

## What was exercised

The actual production service adapter and vendored source loader ran in process.
A manifest-limited local reader supplied exact immutable DWP Git blobs, checking
each file's size and SHA-256. There were no network or model calls. The compiled
Worker is hash-bound by its build receipt; this run did not invoke a deployed
Worker or establish hosting behaviour.

- **108 immutable source files** checked.
- **Four custody packages** matched the direct shared engine through both the
  official SDK 2 client and the SDK 1 compatibility client.
- **Four compact cases** reconstructed complete bounded packages and checked
  catalogues, source text, provenance, paths, diagnostics and delivery limits.
- Historical replay inputs could not silently switch source versions.

The three corpus custody results and the three substantive compact results
remain **insufficient**. The original 52-record custody profile retains its
historical bounded `sufficient` result and exact context identifier. None of
these checks establishes legal completeness, specialist approval or answer
accuracy.

## Context identity changes are explicit

A source commit freezes source bytes, not every future engine's selection or
diagnostics. The new required-evidence allocation changes all three corpus
custody identifiers. In the compact cases:

| Case | Candidate records / relationships | Context identity versus original 0.5.0 observation |
| --- | --- | --- |
| Household care home, 262,144-byte budget | 35 / 61 | Changed; earlier package had 35 / 50 |
| Earlier staff Child DLA/PIP, 262,144-byte budget | 50 / 36 | Unchanged |
| Earlier abroad question, 32,768-byte budget | 6 / 0 | Unchanged |
| Original custody profile, 524,288-byte budget | 52 / 127 | Unchanged |

Each replay URL contains an expected context identifier. The candidate receipt's
URLs name the normal public origin because they exercise the real recipe
format, but here they were supplied only to the local adapter. They are **not
verified public replay links**. Earlier identifiers must not be rewritten or
silently accepted as the candidate result.

## Reproduce locally

From `services/ask-okf-mcp`, use the locked dependencies and a local DWP repository
containing all four approved commits. Choose a fresh output filename; the runner
refuses to overwrite an observation.

```sh
npm run build
node --experimental-strip-types scripts/verify-approved-versions.ts \
  --dwp-root /path/to/okf-dwp \
  --out /tmp/required-evidence-integration-new-run.json
npm run check
npm test
```

The service unit test binds the current candidate receipt to the current build
and unchanged runner. Separate tests keep the earlier observations intact. No
public browser, ChatGPT or Voice acceptance is claimed here.
