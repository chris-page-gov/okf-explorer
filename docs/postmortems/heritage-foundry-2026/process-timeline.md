---
"@context":
  - https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/context.jsonld
  - https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/semantic-context.jsonld
"@id": https://chris-page-gov.github.io/okf-explorer/docs/postmortems/heritage-foundry-2026/process-timeline.html
"@type": https://schema.org/Report
type: Report
title: "Heritage Foundry end-to-end process timeline"
description: "Chronology of implementation, late findings, pull requests, deployments and release assurance."
generated:
  by: process:heritage-foundry-postmortem-builder
  at: "2026-08-04T05:00:00Z"
assertion_status: normalized
assertion_scope: real-world
tags:
  - postmortem
  - timeline
  - evaluation-foundry
---
# Heritage Foundry End-To-End Process Timeline

## Summary

The work began with repository/source access review on 2 August. The full
unattended implementation ran from the first feature commit at
`2026-08-03T09:02:38Z` to the final release evidence uploads at about
`2026-08-03T13:49:21Z`: 4h 46m 43s of publicly evidenced commit-to-release
activity inside a much longer research/build task.

The six original PR and Pages runs did not fail. The later cycle-free release
closure deliberately failed closed four times while exercising previously
untested link, genuine-Chrome and R2 contracts. Every correction changed only
assurance/release controls: the candidate and deployed Site were never rebuilt.

## Late-Finding Chronology

| First visible timestamp | Class | Finding | Actual invalidation |
|---|---|---|---|
| 2026-08-03T04:56:01Z | Corpus integrity | HAR resource routes and same-year continuity could produce invalid links. | producer, faithful, tiny, synthetic, site, consumer |
| 2026-08-03T05:35:17Z | Explorer routing | The selected-record loader assumed every route started with dataset/. | app, browser journeys, site |
| 2026-08-03T06:16:06Z | Documentation and YAML | YAML-LD keyword quoting and executable Links/Narrative coverage were incomplete. | templates, corpora, docs, journeys, site |
| 2026-08-03T07:14:26Z | Publication capacity | The assembled Site was about 989 MB, close to the 1 GB Pages limit. | site assembly and publication |
| 2026-08-03T07:15:45Z | Build contamination | Ignored evaluator results were copied into the Site and changed local-only counts. | site discovery, receipts, published metrics |
| 2026-08-03T07:43:56Z | CRS provenance | WGS84 source geometry was incorrectly labelled EPSG:27700. | records, provenance, semantic graph, search, receipts |
| 2026-08-03T08:05:11Z | Geographic scope | Twenty-five Cumbria HAR rows matched only because Warwick Bridge contained Warwick. | source denominator and every downstream corpus plane |
| 2026-08-03T09:22:05Z | Public boot journey | The first deployed candidate did not expose Search within the 30-second action bound. | Pages-root routing, app shell, public journey |
| 2026-08-03T09:50:51Z | Project-root routing | Reading links, slashless Pages roots and the 404 shell assumed account-root paths. | site routes, evaluator, app shell, browser tests |
| 2026-08-03T12:02:15Z | Candidate binding | A stable descriptor could hide a changed executable closure, requiring plane-root binding. | release roots and public verification |
| 2026-08-03T12:35:19Z | Evidence recursion | Putting terminal evidence in the Site would create a self-referential hash loop. | promotion envelope and release assets |
| 2026-08-03T12:53:13Z | Registry synchronization | Publishing the YAML-LD registry entry required three generated projections and a new app root. | registry, app static, site, browser matrix |
| 2026-08-03T13:48:57Z | Release asset naming | Generic results.json/results.md basenames collided during release upload. | release evidence only |


## Pull-Request Phases

| PR | Phase | Files touched | Line change | Meaning |
|---|---|---|---|---|
| [#67](https://github.com/chris-page-gov/okf-explorer/pull/67) | Initial implementation | 3,868 | +580,091 / −188 | Initial complete producer, app, evaluation and publication implementation. |
| [#68](https://github.com/chris-page-gov/okf-explorer/pull/68) | Late correction and completion | 382 | +12,842 / −9,251 | Late source, provenance, topology, routing and publication corrections; 354 of 382 touched files were generated heritage outputs. |
| [#69](https://github.com/chris-page-gov/okf-explorer/pull/69) | Promotion and terminal publication | 30 | +582 / −132 | Status, registry, evidence and terminal-publication promotion; only one app file changed and no app source/test changed, but the whole CI matrix reran. |


## GitHub Run Chronology

| Start (UTC) | Phase | Run | Wall time | Result |
|---|---|---|---|---|
| 2026-08-03T09:03:51Z | PR #67 pull-request-ci | [30799819042](https://github.com/chris-page-gov/okf-explorer/actions/runs/30799819042) | 10m 58s | success, attempt 1 |
| 2026-08-03T09:15:21Z | PR #67 post-merge-pages | [30800609874](https://github.com/chris-page-gov/okf-explorer/actions/runs/30800609874) | 4m 08s | success, attempt 1 |
| 2026-08-03T12:12:01Z | PR #68 pull-request-ci | [30812594912](https://github.com/chris-page-gov/okf-explorer/actions/runs/30812594912) | 10m 43s | success, attempt 1 |
| 2026-08-03T12:25:01Z | PR #68 post-merge-pages | [30813485357](https://github.com/chris-page-gov/okf-explorer/actions/runs/30813485357) | 3m 40s | success, attempt 1 |
| 2026-08-03T13:31:49Z | PR #69 pull-request-ci | [30818372899](https://github.com/chris-page-gov/okf-explorer/actions/runs/30818372899) | 10m 40s | success, attempt 1 |
| 2026-08-03T13:42:56Z | PR #69 post-merge-pages | [30819232224](https://github.com/chris-page-gov/okf-explorer/actions/runs/30819232224) | 3m 32s | success, attempt 1 |


## R1, Terminal Assurance And R2 Closure

| Start (UTC) | Stage | Run | Wall time | Result | Finding or passed scope | Candidate / Site rebuilt |
|---|---|---|---|---|---|---|
| 2026-08-04T11:07:47Z | candidate-release-r1 | [30903522306](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/actions/runs/30903522306) | 1m 14s | success | The candidate tag, deterministic archive, archive attestation, complete asset set and platform immutability all passed on the first release attempt. | no / no |
| 2026-08-04T11:10:44Z | terminal-assurance | [30903729068](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/actions/runs/30903729068) | 5m 49s | failure | Observe every rendered anchor and all three intent universes | no / no |
| 2026-08-04T11:37:24Z | terminal-assurance | [30905570025](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/actions/runs/30905570025) | 8m 17s | failure | Observe every explicitly protected rich page in genuine Chrome | no / no |
| 2026-08-04T11:59:41Z | terminal-assurance | [30907144661](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/actions/runs/30907144661) | 2m 56s | success | The complete link closure, genuine-Chrome protected-page observations and three-engine journey passed, but the later promotion validator exposed receipt-contract mismatches that terminal generation had not checked. | no / no |
| 2026-08-04T12:04:20Z | promotion-release-r2 | [30907485088](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/actions/runs/30907485088) | 1m 00s | failure | Validate R1-compatible R2 with trusted exact controls | no / no |
| 2026-08-04T12:13:03Z | terminal-assurance | [30908113699](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/actions/runs/30908113699) | 4m 38s | success | Terminal generation and semantic promotion validation passed with aligned timestamps, channel and receipt size handling. | no / no |
| 2026-08-04T12:18:37Z | promotion-release-r2 | [30908527197](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/actions/runs/30908527197) | 1m 00s | failure | Enforce same-commit tags and exact envelope attestation | no / no |
| 2026-08-04T12:22:57Z | terminal-assurance | [30908844005](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/actions/runs/30908844005) | 4m 14s | success | All 13,548 canonical URLs, 11 protected pages and the 32-action three-engine journey passed with exact receipt cross-binding. | no / no |
| 2026-08-04T12:27:41Z | promotion-release-r2 | [30909191165](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/actions/runs/30909191165) | 1m 15s | success | R1 revalidation, terminal-envelope validation, envelope attestation, ten-asset closure, publication and platform immutability all passed. | no / no |


The first two terminal failures exposed missing network retry semantics and a
Chrome-process cleanup race. The next two promotion failures proved that a
downstream semantic/release validator was not being exercised early enough.
Those failures are the strongest direct evidence for the recommended shift-left
microfixtures and shared contracts: the final candidate commit remained
`51881ccc0ce1b77346b9cd8d4462c320bf203114` throughout all nine attempts.

## Publication Gates

- `2026-08-03T11:45:45Z–11:47:43Z`: authenticated browser evidence was
  captured for eleven protected Historic England pages.
- `2026-08-03T12:00:35Z`: the first local candidate receipt was fixed.
- `2026-08-03T12:28:41Z`: PR #68 Pages deployment completed.
- `2026-08-03T12:29:08Z`: the initial public journey passed 27/27 actions.
- `2026-08-03T13:27:15Z`: the promoted local candidate receipt was fixed.
- `2026-08-03T13:46:28Z`: PR #69 Pages deployment completed.
- `2026-08-03T13:46:54Z`: the evidence release was published.
- `2026-08-03T13:47:21Z`: the terminal public journey passed 32/32 actions.
- `2026-08-03T13:48:17Z–13:49:21Z`: uniquely named release receipts were
  uploaded after basename collisions were corrected.
- `2026-08-04T10:28:29Z`: the independently rooted heritage Pages deployment
  completed from the immutable candidate commit.
- `2026-08-04T11:08:48Z`: immutable candidate release R1 was published.
- `2026-08-04T12:27:11Z`: final terminal assurance completed with 13,548/13,548
  link identities, 11/11 protected pages and three 32-action browser journeys.
- `2026-08-04T12:28:42Z`: immutable promotion release R2 was published; its
  ten-asset release attestation verified at `2026-08-04T12:28:43Z`.

The 27-action candidate observation remains valid historical evidence, but the
machine profile still names action 28 as the final gate while the terminal
journey now has actions 29–32. Future profiles should derive stage counts and
gate labels from immutable receipts rather than duplicate them manually.
