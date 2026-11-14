# Graph service candidate: 14 November 2026

Status: locally validated candidate. Public SDK and native plugin acceptance
require separate deployment observations.

The graph source is pinned to DWP producer
`2e12f20cfd20e62a67197e7aade4ea612b873684`, graph SHA-256
`ff51d877ed13f7089e7512224a4a8dcd356d0ae8e5964fe33349edf0a263b426`
and graph engine
`urn:okf:graph-engine:sha256:c75b01d322236e4c13fc1ad72a7e3424203dbae2413c4e6be64b960d8566cb42`.
The admission, portable client and runtime are verified by the ordinary build
without a candidate override. Navigation remains model-derived and unreviewed;
all graph plans retain insufficient status, no AI answer and open obligations.

The complete service suite passes 112 tests with one existing skip. Its new
SDK verifier tests exercise both supported SDK generations, source-text and
obligation mutations, duplicate provenance, schema drift, streamed response
ceilings, cancellation, aborts and fixed origins. Preflight binds 106 unique
questions across 108 case occurrences to the producer's complete package hashes.
It makes no HTTP or model calls.

The [Chrome observation](browser/chrome-receipt.json) retains the historical
52-record custody package at `/okf/mcp`, exact source text, metadata, diagnostics,
pagination, inert fragments and stale-question controls. All four browser tests
pass with no console errors. The [retained build receipt](browser/build-receipt.json)
matches that observation's exact receipt digest. The [screenshot](browser/chrome-source-evidence.png)
and [complete test result](browser/results.json) preserve its actual scope.
These are local transport and interface observations; legal applicability,
specialist acceptance and comprehensive accessibility remain unresolved.
