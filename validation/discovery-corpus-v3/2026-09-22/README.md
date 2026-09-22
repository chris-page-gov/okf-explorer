# Local discovery-corpus v3 verification

The candidate adds a generic source-bound discovery and relationship loader on
the approved Explorer base `ea485af6f5c20ba32e63772cc8e851dd44239e2b`.
See the [architecture decision](../../../docs/adr-source-bound-discovery-cards.md)
for the exact producer contract and fixed ranking parameters.

## Checks completed

Initial local checks at `770cab5b`: 713 application unit tests, 31 focused v3 controls within
that suite, nine schema/evaluation tests, 12 archive tests and 92 service tests
pass. Svelte reports zero errors and warnings. The deterministic application
build has tree SHA-256
`4b923c9d9ad4e4c65bf4dcc97864d9dabac4bae49008b96b8d13a1ae486e5dc2`
and manifest SHA-256
`6b4eea60cc8cc1f9522ab9b506f17daa70ab839ec15fb50dbff31e05143a1d96`.
Documentation lockstep, British English and whitespace checks pass.

- Generic source/card controls exercise exact multi-page units, separate ranking
  channels, actual concept resolution, directed dependencies outside the lexical
  shortlist, stale whole-record bindings, corrupted or missing cards, inconsistent
  graph commitments, resource limits and complete bounded reconstruction.
- The additional gzip control verifies compressed cards and rejects expansion
  beyond the declared decoded-byte binding.
- The existing Reader adapter admits v3 through its lazy, hash-bound
  `context_corpus` entrypoint. Reader loading and context loading remain separate.
- Existing v1 replay inputs and expected package are unchanged. A synthetic v2
  fixture captured using the approved base replays the full package exactly,
  including its cross-page spans, dependency and context identifier.
- Offline schema controls reject changed ranking parameters, mixed channel
  order, evidence masquerading as a card, official card status, missing bindings,
  fractional frequencies and incomplete direction declarations.
- The 12 existing archive controls pass, including actual retained historical
  packages. The 92 service tests pass with frozen engines and approved sources
  retained. These checks do not admit v3 to a deployed remote service.
- Independent read-only review found no blocker and independently ran the then
  30 new generic controls. Its suggested gzip control was subsequently added and
  passed. It also recommended measuring discovery diagnostic bytes separately
  in the domain experiment, because 16 full cards can exhaust a small package.

## Retained failure and correction

The first service run passed 91 of 92 tests. Its relocation test could not find
the new `corpusV3.ts` import in its copied source tree. The explicit fixture
inventory now includes that dependency, and all 92 tests pass, including exact
Worker/Node build identity with real and linked dependencies. The separate
observation build-input allowlist also includes the new module. Frozen engine
manifests and historical receipts were not edited.

Dependencies were installed from the existing lockfile and local npm cache,
offline, with install scripts disabled. No provider, model, acquisition or
external service calls were made for these checks.

## What these checks do not establish

These are local implementation and compatibility checks. They do not establish
complete domain coverage, source interpretation, source freshness, legal or
specialist acceptance, answer quality, affordability or measured performance on
the full manual. A public application release, exact deployed browser journey,
remote engine/source admission and client acceptance remain separate work.

The producer experiment must report source/card/heading coverage, source and
discovery ranking contributions, candidate and dependency retention, diagnostic
bytes, transferred/decoded bytes, exact delivery reads and unresolved obligations.
Keep the questions and source fixed before comparing outcomes; do not tune the
declared baseline ranking parameters to those questions.

## Full-corpus feedback and candidate correction

The first DWP producer experiment used engine `770cab5b` and retained all
forty questions at both budgets. It exposed two limitations: repeated full-card
metadata prevented useful 32 KiB inline results, and eager lexical hydration
spent the shared 64-file allowance before two declared concept paths finished.
The original result remains a failed acceptance attempt, not a replaced success.

The next candidate gives already resolved concepts' outgoing paths priority
and returns exact card/incident metadata references, with separately bounded
read helpers. Neither ranking parameters nor resource limits change. Generic
controls recover complete lazy metadata and reject altered hashes, IDs, ordinals
and counts; source units and every reported obligation remain separate.
720 application tests, ten schema checks and Svelte checking pass locally.
Independent review found no blocker. The subsequently added regression confirms
that a unit first reached at maximum concept depth can later act as a shallower
lexical seed, without counting its edges or diagnostics twice; all 39 focused
discovery controls pass with that addition.

A development observation over the same DWP manifest restores the two reported
path regressions at 512 KiB, without claiming an answer or completeness. Small
32 KiB inline contexts still refuse metadata honestly; larger assembly followed
by exact bounded reads remains necessary for these cases. The independent final
forty-case observation belongs to the DWP repository and remains a separate gate.

## Preserved CI failure

Draft PR 144's first CI run, `35793799419`, passed the app, remote service,
documentation and release-policy checks. Its context-execution and Python
contract jobs correctly rejected old current-app receipts: the study-club
receipt pinned the preceding implementation and the Heritage receipt pinned the
preceding app build. `pre-v3/` preserves that execution and the three Heritage
receipt files unchanged. The next refresh must execute the current engine and
actual browser journeys; rebinding old observations would not satisfy the gate.

That refresh has now run against the candidate app: all 100 Heritage questions
meet the suite's 80-point threshold (mean 92.6), and all three local interaction
journeys pass. The current receipt binds those new observations to app tree
`d3420a7e2673d6f172fc6f53a3f70e603b6fdfcefcf670ce3b681b90c3871397`
and manifest
`b04036e1774f6ee7b5a6e3f764ac645ac26d3f53b3dc7741dc2fb5fc81e24220`.
The study-club execution was freshly run with the candidate implementation;
its complete v1 context package remains byte-equivalent to the retained package.
These are actual local observations, not a public v3 deployment or DWP acceptance.

The first local receipt-refresh invocation could not install an uncached
dependency offline. The unchanged lockfile was verified against the existing
locked project environment, which then executed the refresh successfully. No
dependency version was changed. The independent review's first test invocation
also unintentionally entered broader browser/listener checks; macOS sandbox
permissions refused those listeners. Its direct focused rerun is recorded
separately from the successful authorised browser observation above.
