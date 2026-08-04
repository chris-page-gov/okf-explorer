---
"@context":
  - https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/context.jsonld
  - https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/semantic-context.jsonld
"@id": https://chris-page-gov.github.io/okf-explorer/docs/postmortems/heritage-foundry-2026/postmortem.html
"@type": https://schema.org/TechArticle
type: TechArticle
title: "Heritage Evaluation Foundry engineering postmortem"
description: "End-to-end evidence, late-finding analysis and implemented selective-rerun controls."
generated:
  by: process:heritage-foundry-postmortem-builder
  at: "2026-08-04T13:16:54Z"
assertion_status: normalized
assertion_scope: real-world
tags:
  - postmortem
  - evaluation-foundry
  - engineering
  - process-improvement
---
# Heritage Evaluation Foundry Engineering Postmortem

## Technical Summary

The heritage exemplar achieved its functional and publication objective, but the
process was inefficient in exactly the way the user observed: late findings caused
broad regeneration and complete green test cycles. The original six PR/Pages runs
all succeeded on attempt 1; the later cycle-free R1/terminal/R2 closure then failed
closed four times while exposing contracts that had not been exercised early enough.
Crucially, those four corrections did **not** rebuild the candidate or Site.

The principal root cause is not simply that the corpus is large. The parent Foundry
already documents a producer→plane→consumer dependency graph and selective
invalidation. The Evaluation Foundry derivative retained plane hashes but omitted
that executable graph from its profile schema. Hashes could prove that bytes
changed; nothing could turn that information into a minimal work plan.

The clearest measured example is PR #69. It changed 30 files, no application source
or application tests, and only one app-static registry projection. Data, Search,
Semantic and Control roots stayed unchanged across faithful, tiny and synthetic
products; only Presentation roots and publication envelopes changed. Nevertheless,
CI reran all 153 Explorer cross-browser tests and all 63 Foundry browser tests, and
the local process reran all 100 questions plus three journeys. The stable question
projection hash was
`69ed22171699643ba8c9ce56dff0a8545011faf117b7d01c8c8036f12c732b1e` before
and after; the stable journey projection hash was
`d14e77085b01ca688d185c84f6ccc2371f687cc272f0362d9a674be36d5b0e08`.

That response is now implemented in the repository candidate: Evaluation Profile
v2 shares the parent Foundry dependency contract; a deterministic impact planner
selects separately owned plane emitters and assurance jobs; writes and Site
components are content-addressed; and mutable evidence is outside the candidate
hash closure. Public closure is now complete: the independently rooted Pages deployment, immutable R1, final terminal observations, attested promotion envelope and immutable R2 all bind candidate commit `51881ccc0ce1b77346b9cd8d4462c320bf203114`.

## Key Findings With Evidence

### 1. The derivative process dropped the control needed for selective reruns

The [Foundry beginner process](../../beginners/19-foundry-authoring-and-domain-profiles.md)
requires a consumer lock, producer/consumer dependency graph, invalidation rules
and transitive reruns. The
[authoring schema](../../../profiles/authoring/v1/domain-profile.schema.json)
models them. The
[Evaluation Profile v1 schema](../../../evaluation-foundry/schemas/okf-evaluation-profile.v1.schema.json)
reduces `consumer_contract` to four descriptive fields and the exemplar profile
therefore cannot answer: “which roots can I reuse, and which tests are required?”

In plain language: the build wrote labels on five boxes, but did not retain the
arrows between the boxes. When one label changed, the safest available choice was
to reopen every box.

### 2. Generation and Site assembly are monolithic

`build_corpus()` computes all output planes, while the inherited writer deletes
and rewrites the complete output tree. `build_site.py` deletes `_site/`, recopies
every public tree, then scans and hashes the assembled closure. The final corpus
family contains 3,787 files and 173,587,798 bytes; a two-build determinism cycle
writes roughly 347 MB before Site assembly.

PR #68 illustrates generated fan-out: 382 changed files, 354 generated heritage
artifacts (92.67%) and 273 generated binary files. The final semantic graph is
repeated across JSON-LD, YAML-LD and assertion copies—94,853,568 bytes, 54.86% of
the faithful corpus. `data/link-validation.json` is a separate 19,490,810-byte
monolith. Those shapes make a small semantic or link change expensive.

| PR | Phase | Files touched | Line change | Interpretation |
|---|---|---|---|---|
| [#67](https://github.com/chris-page-gov/okf-explorer/pull/67) | Initial implementation | 3,868 | +580,091 / −188 | Initial complete producer, app, evaluation and publication implementation. |
| [#68](https://github.com/chris-page-gov/okf-explorer/pull/68) | Late correction and completion | 382 | +12,842 / −9,251 | Late source, provenance, topology, routing and publication corrections; 354 of 382 touched files were generated heritage outputs. |
| [#69](https://github.com/chris-page-gov/okf-explorer/pull/69) | Promotion and terminal publication | 30 | +582 / −132 | Status, registry, evidence and terminal-publication promotion; only one app file changed and no app source/test changed, but the whole CI matrix reran. |


### 3. Evidence changes the candidate it is meant to observe

Question and journey receipts carry fresh timestamps and browser observations but
are copied into the Site whose root they help assure. Refreshing evidence therefore
changes the Site root even when logical outcomes do not. Protected-link evidence is
also placed in the corpus Control plane. This creates an observation→candidate loop
and explains why a release asset was introduced late to escape self-reference.

Stable outcome fingerprints should live next to timestamped observations. The
candidate should be immutable; an independent promotion/evidence envelope should
reference its roots and attach freshness evidence without rewriting it.

### 4. CI is path-insensitive and serial

Across three CI runs, workflow wall time was
32m 21s. The Explorer cross-browser
step consumed about 17m 48s and browser setup
another 2m 20s. Those operations dominated work
even when no app source changed.

In PR #69, browser setup plus the 153-test Explorer matrix consumed
417 of 630 CI-job seconds
(66.2%). A dependency plan could
have selected registry, Site, source-selection and terminal-publication checks,
while retaining a periodic/full promotion audit as a backstop.

| PR | Workflow | Run | Wall time | Recorded work |
|---|---|---|---|---|
| #67 | OKF Explorer CI | [30799819042](https://github.com/chris-page-gov/okf-explorer/actions/runs/30799819042) | 10m 58s | 176 Python; 276 Vitest; 24 Node; 153 Explorer; 63 Foundry |
| #67 | Publish GitHub Pages | [30800609874](https://github.com/chris-page-gov/okf-explorer/actions/runs/30800609874) | 4m 08s | Site build, archive and deploy |
| #68 | OKF Explorer CI | [30812594912](https://github.com/chris-page-gov/okf-explorer/actions/runs/30812594912) | 10m 43s | 209 Python; 276 Vitest; 25 Node; 153 Explorer; 63 Foundry |
| #68 | Publish GitHub Pages | [30813485357](https://github.com/chris-page-gov/okf-explorer/actions/runs/30813485357) | 3m 40s | Site build, archive and deploy |
| #69 | OKF Explorer CI | [30818372899](https://github.com/chris-page-gov/okf-explorer/actions/runs/30818372899) | 10m 40s | 209 Python; 276 Vitest; 25 Node; 153 Explorer; 63 Foundry |
| #69 | Publish GitHub Pages | [30819232224](https://github.com/chris-page-gov/okf-explorer/actions/runs/30819232224) | 3m 32s | Site build, archive and deploy |


All six runs were green, attempt 1. “Repeated full green validation” is the correct
diagnosis; “CI failure churn” is not.

### 5. The Site is a capacity and coupling boundary

The historical central Site at PR #69 has 14,010 files and
987,329,754 bytes, leaving only
12,670,246 bytes (1.267%)
below the configured one-billion-byte Pages limit. Every candidate rebuild scans,
hashes, archives and uploads that closure. Another large exemplar should not be
added to the same publication unit without separating independently rooted data
packs from the Explorer/docs shell.

### 5a. Publishing this postmortem reproduced the coupling—and proved a bounded rerun

On its first publication build, the postmortem passed its own generated-file and
redaction lint, and all 256 rendered
documentation pages with 4,556
internal references resolved. The Site gate then stopped because the historical
heritage receipt correctly described the earlier global Site tree rather than the
new documentation closure. No heritage or application byte had changed.

The correction used an explicit `documentation-only` shell rebind instead of a
heritage rebuild. It reused the unchanged faithful, tiny, synthetic and Explorer
roots; reran postmortem lint, bundle/viewer synchronization, OKF conformance,
documentation links, Site inventory, capacity and tree identity; and did not
rerun the 100-question suite or either browser matrix. That intermediate local Site
contained 10,272 files and retained the unchanged
Explorer root
`0047c04cbb4948f12c548eb08c824c5a5fe43353fe7e86f4048020bcb71dce56`. The command trace recorded the
explicit rerun and reuse sets at the time. Later full-candidate work superseded the
tracked [local-candidate receipt](../../../evaluation-foundry/fixtures/heritage-warwickshire/evidence/local-candidate-receipt.json),
so this report does not mislabel that current receipt as the historical rebind.
Self-describing Site closure values remain outside the closure they identify.

This documentation-only rebind preceded the general impact planner and its change
class was reviewed manually. The now-implemented planner generalizes the same proof:
unchanged roots plus an affected gate set can avoid a full corpus/evaluation/browser
cycle without weakening the Site publication gate.

### 6. Late checks were valuable, but many belonged earlier

The audits found substantive defects: same-year HAR continuity, a `dataset/` route
assumption, YAML-LD quoting, missing presentation journeys, evaluator-output Site
contamination, incorrect CRS provenance, 25 Warwick Bridge false positives,
project-root routing, stable-descriptor/changed-closure ambiguity, registry drift
and release basename collisions. Catching them before the terminal release was a
success. Discovering them after full-corpus generation was the cost.

Move adversarial microfixtures and schema/profile checks before the full build:

- authority-field matching must reject locality-only “Warwick” substrings;
- annual continuity must never link events inside one year;
- source CRS and delivered CRS labels must agree;
- arbitrary record routes must load without a `dataset/` prefix;
- Pages-root, slashless-root and 404 assets must use the project base;
- ephemeral results must be excluded from discovery;
- YAML-LD keywords, registry projections and declared auxiliary bundles must be
  synchronized;
- promotion action counts must be derived from receipts.

### 7. Plane ownership is too coarse and sometimes incorrect

The classifier checks generic `data/` paths before semantic suffixes, so
`data/semantic/*` is assigned to Data. Questions and protected-browser evidence are
assigned to Control. The target graph needs explicit Data, Resource, Relationship,
Search, Semantic, Presentation, Evaluation-Control, Evidence, App, Site-Reading,
Site-Data and Promotion ownership rather than path-order heuristics.

### 8. The final closure proves that late errors can be corrected without rebuilding data

The independently rooted candidate was fixed at commit
`51881ccc0ce1b77346b9cd8d4462c320bf203114` before R1. Nine subsequent workflow
attempts exercised candidate release, complete-link observation, genuine Chrome,
three browser engines, envelope validation, attestation and immutable promotion.
Four attempts failed closed; each correction was confined to assurance or release
controls, and every row below records `no / no` for candidate and Site rebuild.

| Attempt | Stage | Run | Result | Failed/passed boundary | Bounded correction or outcome | Candidate / Site rebuilt |
|---|---|---|---|---|---|---|
| RELATT-001 | candidate-release-r1 | [30903522306](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/actions/runs/30903522306) | success | all declared gates | No correction was required. | no / no |
| RELATT-002 | terminal-assurance | [30903729068](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/actions/runs/30903729068) | failure | Observe every rendered anchor and all three intent universes | Add one bounded retry for network, 429 and 5xx outcomes, a 0.25-second backoff, HTTP 304 reachability, attempt counts and failure-artifact retention. | no / no |
| RELATT-003 | terminal-assurance | [30905570025](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/actions/runs/30905570025) | failure | Observe every explicitly protected rich page in genuine Chrome | Treat signal exit as completion, wait after forced termination, retry profile removal, preserve the primary error and test the cleanup failure paths. | no / no |
| RELATT-004 | terminal-assurance | [30907144661](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/actions/runs/30907144661) | success | all declared gates | Validate the terminal artifact through the exact promotion contract before release and align receipt size, timestamp and browser-channel semantics. | no / no |
| RELATT-005 | promotion-release-r2 | [30907485088](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/actions/runs/30907485088) | failure | Validate R1-compatible R2 with trusted exact controls | Scope the larger bound to the exact link receipt, emit six-digit timestamps and use the policy channel genuine-google-chrome-cdp. No release was created. | no / no |
| RELATT-006 | terminal-assurance | [30908113699](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/actions/runs/30908113699) | success | all declared gates | The subsequent release-policy phase revealed that its older loader independently reapplied the generic 2 MiB limit. | no / no |
| RELATT-007 | promotion-release-r2 | [30908527197](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/actions/runs/30908527197) | failure | Enforce same-commit tags and exact envelope attestation | Route promotion release-policy validation through the same narrowly scoped terminal loader while retaining the 2 MiB default for every other control file. No release was created. | no / no |
| RELATT-008 | terminal-assurance | [30908844005](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/actions/runs/30908844005) | success | all declared gates | No further terminal correction was required. | no / no |
| RELATT-009 | promotion-release-r2 | [30909191165](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/actions/runs/30909191165) | success | all declared gates | No further correction was required; the immutable release and its post-publication verification are the terminal state. | no / no |


The failures reveal where the refactored process should move checks earlier:

- execute network retry/304 microfixtures before a 13,548-URL observation;
- exercise Chrome signal-exit and profile-cleanup paths without a public run;
- validate terminal artifacts with the exact downstream promotion loader before
  uploading them;
- share the large-receipt loader between semantic and release-policy phases;
- retain failed artifacts with `if: always()` so cleanup errors cannot erase the
  primary diagnostic.

The final terminal artifact covers all 13,548 canonical URLs. Two transient ArcGIS
calls succeeded on the single bounded retry; 6,685 protected-origin responses were
accepted only under the exact identifier-binding policy; all 11 delegated pages
passed in genuine Google Chrome; and Chromium, Firefox and WebKit each passed 32
actions plus two assertions. R2 then bound all ten release assets in a GitHub
Releases attestation and became platform-immutable.

One human-readable ambiguity remains visible by design: the annotated promotion
tag message names earlier successful terminal run `30907144661`, while the R2
assets contain the receipt hashes produced by final run `30908844005`. The
normalized publication register and retained R2 Actions artifact make that
cross-walk explicit. Moving the published tag would weaken provenance, so the
report records the discrepancy and treats the attested envelope plus exact
evidence cross-walk, not tag prose, as authoritative status.

The immutable R2 envelope does not itself carry the terminal run ID or terminal
artifact digest. Those facts are retained in the central evidence register and in
R2 Actions artifact `8892339639`, whose platform retention expires on 2 November
2026. This satisfies the declared release policy, but a future envelope schema
should include both fields so long-term provenance is self-contained after the
workflow artifact expires.

### 8a. The final central audit caught two more shell defects before merge

Exact-head PR run
[30911393031](https://github.com/chris-page-gov/okf-explorer/actions/runs/30911393031)
passed the impact, adversarial, Foundry, documentation, app, release-policy, Site
and Python-contract jobs, then failed closed in one Firefox documentation test.
The server returned HTTP 200 twice, but a zero-delay cross-origin meta refresh let
Firefox replace the initial navigation before `page.goto()` could return its
response. Chrome and WebKit passed. The correction now verifies the exact direct
HTTP response separately and renders that same HTML without its navigation
directive for deterministic three-engine body assertions.

A concurrent least-privilege audit found that the central Pages workflow granted
`pages: write` and `id-token: write` to every job. The corrected topology gives
ordinary jobs only `contents: read`, gives the Site builder `pages: read`, and
confines both write permissions to deployment. A machine test now rejects future
permission widening. Neither correction touches the external candidate or its
deployed Site; only a new exact-head central CI run is required.

## Local Build And Test Activity

The curated task log yields the following recognized local invocation counts. A
count is one executable command occurrence. When several commands shared an outer
orchestrator call, their individual wall times cannot be separated and are not
summed.

| Command category | Recognized invocations |
|---|---|
| site-build | 79 |
| heritage-build | 78 |
| python-tests | 55 |
| bundle-check | 40 |
| github-run | 25 |
| app-build | 21 |
| github-pr | 17 |
| explorer-evaluation | 11 |
| app-check | 10 |
| foundry-check | 8 |
| vitest | 7 |
| github-release | 6 |
| git-commit | 3 |
| git-push | 3 |
| playwright | 1 |


Raw command and tool output remains in the private evidence plane; the
[command-event register](data/command-event-register.json) contains sanitized
commands, timestamps and hashed call identities.

## Scope, Data And Metric Definitions

The scope is the single Codex task, repository history from `f5d38674` through
PR #70's assured implementation head, PRs #67–#69, their three CI and three Pages
runs, PR #70 CI, the independent Pages deployment, all nine R1/terminal/R2
attempts, both immutable releases and their retained receipts. Definitions for
workflow time, file touches, amplification, late findings, dependency cones and
outcome projections are in [Methodology](methodology.md).

The postmortem does not claim that every repeated check was worthless. Full
promotion audits catch planner mistakes. It distinguishes **required assurance**
from **work that could safely reuse content-addressed results after an explainable
impact plan**.

## Implementation And Acceptance Register

Every item from the earlier **Recommended Next Steps** list now has a concrete
repository implementation and an executable acceptance contract. Status is derived
from exact normalized PR, Pages, R1, terminal and R2 evidence; ongoing nightly or
freshness checks remain regression controls rather than unclosed implementation.
The same register is available as
[machine-readable JSON](data/implementation-acceptance-register.json).

| ID | Priority | Implemented change | State | Artifacts | Acceptance tests | Remaining terminal gate |
|---|---|---|---|---|---|---|
| IMP-001 | P0 | Publish Evaluation Profile v2 using the parent Foundry dependency contract. | implemented-and-terminal-publication-verified | [`evaluation-foundry/schemas/okf-evaluation-profile.v2.schema.json`](../../../evaluation-foundry/schemas/okf-evaluation-profile.v2.schema.json)<br>[`evaluation-foundry/fixtures/heritage-warwickshire/evaluation-profile.yaml`](../../../evaluation-foundry/fixtures/heritage-warwickshire/evaluation-profile.yaml)<br>[`evaluation-foundry/fixtures/heritage-warwickshire/consumer-lock.json`](../../../evaluation-foundry/fixtures/heritage-warwickshire/consumer-lock.json)<br>[`scripts/check_evaluation_foundry.py`](../../../scripts/check_evaluation_foundry.py) | [`tests/test_evaluation_foundry_impact.py`](../../../tests/test_evaluation_foundry_impact.py) | No terminal acceptance gate remains. |
| IMP-002 | P0 | Add a deterministic, explainable, fail-closed impact planner. | implemented-and-pr-70-verified | [`scripts/plan_evaluation_foundry_impact.py`](../../../scripts/plan_evaluation_foundry_impact.py)<br>[`evaluation-foundry/schemas/okf-evaluation-impact-plan.v1.schema.json`](../../../evaluation-foundry/schemas/okf-evaluation-impact-plan.v1.schema.json)<br>[`evaluation-foundry/fixtures/heritage-warwickshire/history/impact-shadow-cases.json`](../../../evaluation-foundry/fixtures/heritage-warwickshire/history/impact-shadow-cases.json) | [`tests/test_evaluation_foundry_impact.py`](../../../tests/test_evaluation_foundry_impact.py) | No implementation gate remains; the scheduled mutation shadow is an ongoing regression control. |
| IMP-003 | P0 | Keep mutable observations and promotion status outside candidate roots. | implemented-and-terminal-envelope-verified | [`evaluation-foundry/schemas/okf-evaluation-promotion-envelope.v1.schema.json`](../../../evaluation-foundry/schemas/okf-evaluation-promotion-envelope.v1.schema.json)<br>[`release-assurance/heritage-publication-envelope.json`](../../../release-assurance/heritage-publication-envelope.json)<br>[`scripts/check_promotion_envelope.py`](../../../scripts/check_promotion_envelope.py) | [`tests/test_evaluation_foundry_impact.py`](../../../tests/test_evaluation_foundry_impact.py) | No terminal promotion gate remains. |
| IMP-004 | P1 | Split normalized-core and plane emitters with changed-only atomic writes. | implemented-and-terminal-publication-verified | [`scripts/build_heritage_evaluation.py`](../../../scripts/build_heritage_evaluation.py)<br>[`scripts/heritage_build_io.py`](../../../scripts/heritage_build_io.py) | [`tests/test_build_heritage_evaluation.py`](../../../tests/test_build_heritage_evaluation.py) | No terminal acceptance gate remains. |
| IMP-005 | P1 | Run one adversarial microfixture per reconstructed late-finding class before large builds. | implemented-and-pr-70-verified | [`evaluation-foundry/fixtures/heritage-warwickshire/adversarial/microfixtures.json`](../../../evaluation-foundry/fixtures/heritage-warwickshire/adversarial/microfixtures.json)<br>[`evaluation-foundry/schemas/heritage-adversarial-microfixtures.v1.schema.json`](../../../evaluation-foundry/schemas/heritage-adversarial-microfixtures.v1.schema.json)<br>[`scripts/check_heritage_adversarial.py`](../../../scripts/check_heritage_adversarial.py)<br>[`.github/workflows/okf-explorer-ci.yml`](../../../.github/workflows/okf-explorer-ci.yml)<br>[`.github/workflows/pages.yml`](../../../.github/workflows/pages.yml)<br>[`.github/workflows/foundry-full-shadow.yml`](../../../.github/workflows/foundry-full-shadow.yml) | [`tests/test_heritage_adversarial.py`](../../../tests/test_heritage_adversarial.py)<br>[`tests/test_ci_publication_topology.py`](../../../tests/test_ci_publication_topology.py) | Nightly shadow evidence remains independent of the verified pull-request gate. |
| IMP-006 | P1 | Drive conditional parallel CI from the impact plan and retain a full shadow audit. | implemented-and-pr-70-verified | [`.github/workflows/okf-explorer-ci.yml`](../../../.github/workflows/okf-explorer-ci.yml)<br>[`.github/workflows/foundry-full-shadow.yml`](../../../.github/workflows/foundry-full-shadow.yml) | [`tests/test_evaluation_foundry_impact.py`](../../../tests/test_evaluation_foundry_impact.py)<br>[`tests/test_ci_publication_topology.py`](../../../tests/test_ci_publication_topology.py) | Nightly shadow evidence remains independent of the verified pull-request gate. |
| IMP-007 | P1 | Assemble the Site from content-addressed components. | implemented-and-terminal-publication-verified | [`scripts/site_component_cache.py`](../../../scripts/site_component_cache.py)<br>[`scripts/build_site.py`](../../../scripts/build_site.py)<br>[`.github/workflows/pages.yml`](../../../.github/workflows/pages.yml) | [`tests/test_site_component_cache.py`](../../../tests/test_site_component_cache.py)<br>[`tests/test_build_site.py`](../../../tests/test_build_site.py) | No terminal acceptance gate remains. |
| IMP-008 | P2 | Hash-shard semantic and link-intent outputs and remove the duplicate graph materialization. | implemented-and-terminal-link-closure-verified | [`scripts/build_heritage_evaluation.py`](../../../scripts/build_heritage_evaluation.py)<br>[`scripts/observe_link_intents.py`](../../../scripts/observe_link_intents.py)<br>[`.github/workflows/link-observation.yml`](../../../.github/workflows/link-observation.yml) | [`tests/test_build_heritage_evaluation.py`](../../../tests/test_build_heritage_evaluation.py)<br>[`tests/test_observe_link_intents.py`](../../../tests/test_observe_link_intents.py) | Scheduled freshness observations continue independently after promotion. |
| IMP-009 | P2 | Move the large heritage pack to an independently rooted publication unit. | implemented-and-external-promotion-verified | [`publication-units/heritage-coventry-warwickshire/publication-unit.json`](../../../publication-units/heritage-coventry-warwickshire/publication-unit.json)<br>[`scripts/export_publication_unit.py`](../../../scripts/export_publication_unit.py)<br>[`publication-units/heritage-coventry-warwickshire/repository-template/pages.yml`](../../../publication-units/heritage-coventry-warwickshire/repository-template/pages.yml)<br>[`release-assurance/heritage-postmortem-publication-evidence.json`](../../../release-assurance/heritage-postmortem-publication-evidence.json) | [`tests/test_publication_units.py`](../../../tests/test_publication_units.py) | No terminal publication gate remains. |
| IMP-010 | P2 | Require annotated tags, attestation, immutable releases and retained deterministic archives. | implemented-and-terminal-release-verified | [`release-assurance/release-policy.json`](../../../release-assurance/release-policy.json)<br>[`scripts/check_release_policy.py`](../../../scripts/check_release_policy.py)<br>[`publication-units/heritage-coventry-warwickshire/repository-template/promotion-release.yml`](../../../publication-units/heritage-coventry-warwickshire/repository-template/promotion-release.yml)<br>[`release-assurance/heritage-postmortem-publication-evidence.json`](../../../release-assurance/heritage-postmortem-publication-evidence.json) | [`tests/test_release_policy.py`](../../../tests/test_release_policy.py)<br>[`tests/test_ci_publication_topology.py`](../../../tests/test_ci_publication_topology.py) | No terminal release-integrity gate remains. |


The [architecture page](architecture.md) describes the implemented graph and
assurance tiers. Historical #68/#69 root comparisons and mutation tests remain
shadow evidence: reuse stays fail-closed when a path or old/new root cannot be
classified, while nightly and terminal full audits protect against planner error.

## Limitations, Uncertainty And Robustness

- Results describe one large exemplar; expected savings need validation on more
  change classes.
- GitHub timestamps are exact to their reported resolution; local nested-command
  durations are not available individually.
- The additive 43m 41s historical PR/Pages workflow total is not end-user elapsed
  latency if runs or jobs overlap; the nine release-closure runs are reported
  separately because their failures are part of the analysis rather than the
  original repeated-green baseline.
- The stable question/journey projections prove identical recorded outcomes for
  PR #68 versus #69; they do not prove every invisible browser state was identical.
- Selective reruns introduce under-invalidation risk. A periodic full audit,
  promotion full matrix and shadow comparison are mandatory safeguards.
- The public prompt trace is complete for visible messages only and intentionally
  excludes hidden reasoning and tool payloads.
- The promotion tag is annotated but unsigned. Policy requires an annotated tag
  plus an attested promotion envelope; it does not claim a signed Git tag.
- The immutable R2 envelope binds the terminal receipt hashes but does not embed
  the terminal run ID or artifact digest. The public evidence register preserves
  that cross-walk; a future envelope revision should make it self-contained.

## Resolved Architecture And Release Questions

The five earlier **Further Questions** are decisions now, with release integrity
made explicit as a sixth. Local policy/code acceptance and public terminal
promotion are deliberately separate states. The records are also published as
[machine-readable JSON](data/architecture-decisions.json).

| Decision | Question | Resolution | State | Implementation evidence |
|---|---|---|---|---|
| ADR-001 | Where should promotion/status metadata live? | Only immutable candidate self-facts and the stable promotion-policy reference belong in the candidate. Status, timestamps, runs and observations belong exclusively in a signed or GitHub-attested promotion envelope outside its roots. | implemented; terminal envelope verified | [`evaluation-foundry/schemas/okf-evaluation-profile.v2.schema.json`](../../../evaluation-foundry/schemas/okf-evaluation-profile.v2.schema.json)<br>[`evaluation-foundry/schemas/okf-evaluation-promotion-envelope.v1.schema.json`](../../../evaluation-foundry/schemas/okf-evaluation-promotion-envelope.v1.schema.json)<br>[`scripts/check_promotion_envelope.py`](../../../scripts/check_promotion_envelope.py) |
| ADR-002 | Which browser changes require three engines on a pull request? | Runtime, routing, workers, storage, graph, map, CSS/accessibility, browser dependencies, journey-runner and unknown changes require Chrome, Firefox and WebKit on the pull request. Contract-preserving data, search, semantic, registry and presentation changes use targeted Chromium on the pull request; the full three-engine matrix remains nightly and mandatory at terminal release. | implemented; PR #70 workflow evidence verified | [`evaluation-foundry/fixtures/heritage-warwickshire/evaluation-profile.yaml`](../../../evaluation-foundry/fixtures/heritage-warwickshire/evaluation-profile.yaml)<br>[`scripts/plan_evaluation_foundry_impact.py`](../../../scripts/plan_evaluation_foundry_impact.py)<br>[`.github/workflows/okf-explorer-ci.yml`](../../../.github/workflows/okf-explorer-ci.yml)<br>[`.github/workflows/foundry-full-shadow.yml`](../../../.github/workflows/foundry-full-shadow.yml) |
| ADR-003 | Should YAML-LD or JSON-LD be canonical? | YAML-LD is the human-maintained authoring form; the normalized graph and its semantic plane root define semantic equality; JSON-LD is generated interchange whenever the semantic plane changes and again at release. | implemented-local | [`docs/beginners/22-evaluation-foundry-and-yaml-ld.md`](../../../docs/beginners/22-evaluation-foundry-and-yaml-ld.md)<br>[`scripts/build_heritage_evaluation.py`](../../../scripts/build_heritage_evaluation.py) |
| ADR-004 | How should link validation be sharded and refreshed? | Stable link intents are sharded by SHA-256 of the canonical URL. Timestamped network and protected-page observations run on their own freshness schedule and are uploaded outside candidate and Site bytes. | implemented; terminal link closure verified | [`scripts/build_heritage_evaluation.py`](../../../scripts/build_heritage_evaluation.py)<br>[`scripts/observe_link_intents.py`](../../../scripts/observe_link_intents.py)<br>[`.github/workflows/link-observation.yml`](../../../.github/workflows/link-observation.yml) |
| ADR-005 | Which publication unit should own future exemplars? | The dedicated chris-page-gov/okf-heritage-coventry-warwickshire unit owns the heritage corpus, tiny fixture, synthetic supplement, data readers and releases. OKF Explorer continues to own the runtime, shared schemas, registry and docs shell. | implemented; external publication promoted | [`publication-units/heritage-coventry-warwickshire/publication-unit.json`](../../../publication-units/heritage-coventry-warwickshire/publication-unit.json)<br>[`scripts/export_publication_unit.py`](../../../scripts/export_publication_unit.py)<br>[`release-assurance/heritage-postmortem-publication-evidence.json`](../../../release-assurance/heritage-postmortem-publication-evidence.json) |
| ADR-006 | What release-integrity policy should apply? | Use an annotated tag bound to the exact source commit, a GitHub artifact attestation for the external promotion envelope and archive, platform immutable releases, draft-first asset attachment, and a deterministic release archive retained as a release asset. | policy implemented; terminal releases verified | [`release-assurance/release-policy.json`](../../../release-assurance/release-policy.json)<br>[`scripts/check_release_policy.py`](../../../scripts/check_release_policy.py)<br>[`publication-units/heritage-coventry-warwickshire/repository-template/promotion-release.yml`](../../../publication-units/heritage-coventry-warwickshire/repository-template/promotion-release.yml)<br>[`release-assurance/heritage-postmortem-publication-evidence.json`](../../../release-assurance/heritage-postmortem-publication-evidence.json) |
