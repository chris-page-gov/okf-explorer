# Engine-pinned replay: local candidate evidence

Observed on 21 September 2026. **Not deployed.** Package/service version remains
0.5.0 and the four approved source revisions are unchanged. These receipts do not
attest a new public service, model answer, current law or specialist acceptance.

## What passed

- [Actual integration](integration/observation.json): eight combinations of four
  approved immutable DWP versions and two frozen assemblers; 50 source files read
  from exact Git blobs and hash-verified. Both SDK generations validate the
  catalogue envelope. Full tool results, ordered catalogue pages and reconstructed
  complete package slices match direct assembly.
- Every preceding-engine package matches the complete canonical SHA-256 in the
  unchanged original 0.5.0 receipt. All four engine-unspecified historical replays
  succeed within the shared limits and retain unknown originating-engine status.
- [Actual local Chrome](browser/observation.json): Chrome 153.0.8010.52, eight tool
  calls, frozen custody profile. Checks include inert link opening, keyboard
  submission, explicit engine/context identity on pagination, exact displayed
  source text, machine-package view, same-tab fragment changes, and visible
  historical-unavailable/pinned-mismatch refusal without replacement evidence.
- Unit checks cover the two-attempt limit, full-byte ambiguity, incompatible
  source/engine pairs, shared resource and deadline bounds, exact 8 KiB Unicode
  delivery, build-input admission and engine manifests. Runtime/build source
  and observation helpers are hash-bound; fresh output directories are required.

No corpus network, public-service or model calls were made. The local browser
uses the actual service handler with a vendored historical profile; it does not
claim full-corpus browser coverage, a screen-reader evaluation or ChatGPT/Voice
acceptance. The source files and questions used here were already approved public
examples; anonymous user questions are not stored by the service.

## Exact candidate

Worker SHA-256:
`0720239e4657fba2fcaa037a2fdfb6fa7ba16f4adcc9c92db4bb99cfadcff706`.

Both observation directories retain their exact build receipt. The current
assembler is frozen from `c4f2de0a99b7bc2f8b8c8a06a3c715fb56b66d8e`; the previous
one is frozen from `b9a3b68b6dbf222f9a73cc8f450dd53f126e1b55`. Manifest hashes
identify implementations independently of their human-friendly labels.

The care-home source/budget pair reproduces both outcomes:

| Implementation | Records | Relationships | Complete canonical SHA-256 | Status |
| --- | ---: | ---: | --- | --- |
| Previous b9 | 35 | 50 | `454b793795579f7bdda1e94f435ed30d5cdcb551e56dca2f1df8c8ba545f5af3` | Insufficient |
| Current c4f | 35 | 61 | See current row in the integration receipt | Insufficient |

Changing the assembler changes selection; preserving historical evidence does
not establish that either result is sufficient. The original custody profile
retains its bounded historical sufficient result, without extending that finding
to current law or the wider corpus.

## Measured build increment

[Local measurements](build-sizes.json), using gzip level 9:

| Output | Previous raw bytes | Candidate raw bytes | Previous gzip bytes | Candidate gzip bytes |
| --- | ---: | ---: | ---: | ---: |
| Worker | 3,385,784 | 3,457,792 | 611,322 | 628,143 |
| Node | 2,764,524 | 2,836,456 | 488,042 | 505,896 |

The Worker grows by 72,008 raw bytes and 16,821 locally compressed bytes. These
measurements include the replay implementation and Reader changes; they are not
hosted compression, memory, cold-start or latency measurements. The earlier
Worker and Node digests match the retained required-evidence candidate build.

## Reproduce safely

From the service directory, use a locked installation and a new output directory:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run check
npm test
node --experimental-strip-types scripts/verify-versioned-replay.ts \
  --dwp-root /path/to/okf-dwp --out /path/to/new-integration
node --experimental-strip-types scripts/verify-versioned-review.ts \
  --playwright-module /path/to/locked/@playwright/test/index.mjs \
  --out /path/to/new-browser-observation
```

The browser harness requires installed Chrome and permission to listen on
loopback. It does not download browsers or dependencies. Its temporary local
server closes after the check. Do not reuse a retained observation directory.

## Preserved earlier attempts

The [history](history/) directories preserve actual earlier files, separately
labelled by retrospective classifications:

- Browser attempt 01: sandbox refused loopback listening before Chrome launched.
  Its early harness did not produce a failure receipt; the classification states
  this limitation and preserves the executed script.
- Browser attempt 02: real Chrome exposed the pre-existing same-tab fragment
  issue. The preceding recipe remained active and the negative check timed out.
  The fix now clears old evidence and reparses the new fragment without a call.
- Browser attempt 03: preliminary pass before the final observation-input
  admission/provenance improvements.
- Integration attempt 01: preliminary eight-pair pass before the independently
  identified shared-deadline guard was corrected.

All published 0.4.0/0.5.0 and required-evidence receipts remain byte-for-byte
unchanged. A new observation must never relabel those records as this build.
