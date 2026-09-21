# Service 0.6.0 candidate: local release verification

This is an **undeployed candidate**, not a public service acceptance receipt.
There were no HTTP or model calls in these observations.

## What changed

The default source is the final combined DWP revision
`723bcc5b015ab38a026625c2148edbd784edf7c7`, snapshot
`dwp-combined-context-574558533a74278179f3`. Its exact manifest is 718,466 bytes,
SHA-256 `be9fb7be5d942a74a550812e3ca858b4fbbca81f8afaf8d14b5f731eca08212a`.
The former default `3ef0e786…`, staff `9de52acf…`, discovery `bf50ef8d…` and
custody `efb05c66…` revisions remain separately approved with their original bytes.

Only the current c4f engine is approved for the new source. Both c4f and b9
remain approved for each old source: nine source/engine pairs in total. The
full-package family stays `okf-governed-context.v1`; exact engine identity is
carried separately. The older engine is rejected for the new source before
source-page retrieval.

## Actual local observations

The current [integration receipt](integration-02/observation.json) binds its
executed runner, actual Worker build, exact source files and received packages.
Ten cases passed through the real local adapter and both SDK generations:

- Care-home question on the new source at 512 KiB: **523,326 bytes**, 55 records,
  115 relationships, `insufficient`.
- Unknown-term control `xylophonicquasarteleportation` on the new source at
  512 KiB: **4,385 bytes**, no selected records or relationships, `insufficient`.
- The four earlier compact questions under each of their two approved engines.
  Every earlier b9 package matches the whole-package hash from the original
  0.5.0 receipt. Four engine-unspecified historical recipes reproduce those
  packages while retaining the unknown originating-engine status.

The run read 74 exact immutable Git files, totalling 23,768,700 distinct bytes.
Each case checked a full local tool response, ordered catalogue pagination and
lossless complete-package reconstruction. This local full-response test does
not claim a large public response is acceptable to a client. The successor
public verifier uses compact slices throughout.

The [first local pass](integration/observation.json) remains intact. The second
run added explicit aggregate source-file/byte caps and per-Git-read timeouts to
the new runner. All ten canonical package hashes remain identical. The first
run is not relabelled as having executed the later guardrails.

The [build-size comparison](build-sizes.json) measures raw and gzip-9 artefact
sizes locally. It does not measure host compression, capacity, memory or
latency. The [artefact manifest](artifact-manifest.json) binds this directory.

## Reproduce

From `services/ask-okf-mcp`, with all five source commits in a local DWP Git
repository and a new output directory:

```sh
npm ci --ignore-scripts
npm run build
node --experimental-strip-types scripts/verify-release-0.6.ts \
  --dwp-root /path/to/okf-dwp --out /path/to/new-local-observation
npm run check
npm test
```

The old four-source runner and earlier receipts remain unchanged. Run historical
procedures at their recorded source revision. The new
[public verification protocol](../../../VERSIONED-REMOTE-VERIFICATION.md) first
requires a committed comparator and an offline plan; public execution then
requires explicit authorisation and `--execute-public`.

These checks establish source/version routing and evidence delivery. They do
not close the 203 outstanding obligations, establish current law, authorise an
entitlement decision, accept a model answer or demonstrate ChatGPT Voice.
