# Verify an engine-pinned public release

This is the successor to the frozen service 0.5.0 live verifier. It has its own
runner and receipts. Older verifiers, published observations and received
packages remain unchanged.

The new runner is **prepared for a later authorised live check**. Its offline
unit tests and in-process SDK checks are not public-service observations.

## What the identities mean

A **source version** names an immutable OKF-DWP Git commit. An **engine ID**
identifies the exact context-assembly implementation. A **context ID** identifies
the selected context; the complete package also has a SHA-256 digest. All four
matter when reproducing an old evidence link.

The verifier compares the public service with an exact local, committed service
build. `/health` reports service, source and engine identities. It cannot prove
which Worker bytes the hosting platform deployed. The operator must separately
retain the hosting publication record for the expected Worker digest. The live
receipt therefore always says
`deployed_worker_bytes_independently_verified: false`.

## Prepare a run without contacting the service

From `services/ask-okf-mcp`, install the locked dependencies and build the exact
reviewed release using the existing service instructions. The verifier, its
transitive local helpers and build inputs must already belong to the supplied
comparison commit. Uncommitted comparator changes fail admission.

Use a new output directory whose parent already exists. Paths through symbolic
links are rejected. Replace every value below with the release's recorded
identity; these are placeholders, not claims about a deployed version.

```sh
node --experimental-strip-types scripts/verify-versioned-remote.ts \
  --origin https://ask-okf.crpage.chatgpt.site \
  --source-version EXACT_DWP_COMMIT \
  --expected-worker-sha256 EXACT_WORKER_SHA256 \
  --service-version EXACT_SERVICE_VERSION \
  --comparison-commit EXACT_EXPLORER_COMMIT \
  --dwp-root /path/to/okf-dwp \
  --out /path/to/new-offline-plan
```

Without `--execute-public`, this makes **zero HTTP requests**. It uses the real
vendored source loader, verifies the source against immutable local DWP Git
blobs, assembles each permitted source/engine pair and prepares the exact
expected catalogue and evidence slices. It writes `plan.json`, the executed
runner and its build receipt. It does not create a passing live observation.

The approved registry determines the pairs. Four sources supported by two
engines produce eight pairs; adding a fifth source supported only by the
current engine produces nine. An unsupported pair is never added merely to
complete a rectangular matrix.

Only two explicit public questions are used: the existing care-home acceptance
question and the unknown-term control `xylophonicquasarteleportation`. The
unknown-term control is actually assembled for the current source and engine at
512 KiB; it is separately labelled and must return no selected records and an
insufficient status. The care-home question preserves its original wording
exactly, including its typographical error. The original
0.5.0 care-home case is replayed with its original source, budget and expected
context ID and without an engine ID. Its complete canonical package must match
the frozen 0.5.0 receipt. Historical origin remains unspecified; successful
compatibility does not prove which engine originally produced the link.

## Execute after the release is authorised

Repeat the command with a **different, fresh output directory** and add
`--execute-public`. Do not reuse the planning directory. The runner repeats
immutable admission and prepares all expected results before its first HTTP
request. No public execution occurs merely by importing the runner or running
its tests.

The planned HTTP upper bound is:

```text
sum(catalogue pages + evidence slices for each permitted pair
    + catalogue pages + evidence slices for the original historical case
    + catalogue pages + evidence slices for the current unknown-term control)
+ 10 setup/discovery/closure/legacy-comparison requests
+ 4 negative controls
+ 1 incompatible-pair control, only when an incompatible approved pair exists
```

The allowance is conservative; the receipt records the actual requests. A plan
that cannot fit 200 requests fails before contacting the service. It does not
silently omit pairs, evidence slices or checks.

| Boundary | Limit |
| --- | ---: |
| Approved source/engine pairs | 16 |
| HTTP requests | Planned upper bound, at most 200 |
| Time between request starts | At least 750 milliseconds |
| HTTP request body | 32 KiB |
| HTTP response body | 256 KiB |
| Total received HTTP body bytes | 32 MiB |
| Individual HTTP request | 60 seconds |
| HTTP run | 10 minutes |
| Catalogue or individual evidence-value pages | 128 |
| Local immutable source files | 512 |
| Local immutable source bytes | 64 MiB |
| Individual local input | 8 MiB |

Bodies are counted while streaming. Headers alone do not establish size. The
run has no automatic retries or redirects and admits only the exact HTTPS
origin, `GET /health` and the reviewed read-only MCP methods at `POST /okf/mcp`.
No credentials or arbitrary questions are admitted. A failure stops further
network requests. These bounds concern the verifier's HTTP requests, not the
service's own source retrieval or its hosting platform's costs.

## What a passing live observation proves

- Health matches the approved source and engine catalogue and service version.
- SDK v2 discovers the reviewed read-only tool schemas and reconstructs every
  allowed pair's full package from bounded slices. A new question defaults to
  the current engine; subsequent catalogue and evidence requests retain its
  explicit engine ID, source, context ID and budget.
- SDK v1 discovers the same tools and returns the same current catalogue.
- Every catalogue page, ordered record ID, evidence slice, selected-record
  provenance and complete canonical package matches the direct local reference.
- The current and original historical cases also read a selected evidence
  record's full text and metadata, plus diagnostics, when evidence is selected.
- Unknown engines, unknown sources, changed expected context IDs and unavailable
  historical contexts return no evidence. An incompatible approved pair is
  checked when the registry contains one; otherwise it is explicitly marked
  not applicable. Each negative response must match the exact error-only result
  prepared by the local adapter. Extra content, duplicate JSON keys, extra
  envelopes or SSE events and changed request IDs are rejected.

The verifier does not call full `ask_okf`: MCP duplicates values in structured
and text output, which can make a 512 KiB package exceed a small response cap.
It requests 16 KiB catalogue pages and 64 KiB evidence slices. Complete package
reconstruction preserves the original budget, including 512 KiB contexts, while
keeping individual deliveries bounded.

This is delivery and reproducibility evidence. It does not establish legal
correctness, complete domain coverage, specialist acceptance, answer quality,
ChatGPT connector acceptance or live Voice access.

## Retained output

`observation.json` uses `okf-versioned-remote-verification.v1` and is labelled
`actual-public-http` only after the authorised run passes. It contains the
reported health catalogue, comparator and source hashes, actual request count,
per-response status/size/digest/time, package identities, provenance digests,
negative-control outcomes and an artefact hash manifest. Received canonical
packages are retained as gzip files; only the two fixed public questions appear in
them. Transport telemetry retains hashes rather than raw response or question
bodies. There is no model call or collection of anonymous users' questions.

`failure.json` records the bounded request telemetry and completed case summaries
if admission or an actual run fails. It does not retain raw error strings. A
partly completed failed attempt stays in its own directory. Creating a fresh
attempt never overwrites a prior observation.

## Offline controls

```sh
npm run check
node --experimental-strip-types --test test/versioned-remote.test.ts
```

The tests exercise exact CLI admission, the dynamic pair and request census,
streaming limits, pacing, no-retry failure, symlink rejection, altered evidence
and provenance, and both installed SDKs against the real in-process service.
Injected clocks and service adapters in these tests are labelled offline test
controls. They produce no `actual-public-http` receipt.
