---
"@context":
  - https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/context.jsonld
  - https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/semantic-context.jsonld
"@id": https://chris-page-gov.github.io/okf-explorer/docs/postmortems/heritage-foundry-2026/exchanges/0008-implement-every-recommended-refactoring-and-publication-control.html
"@type": https://schema.org/Conversation
type: Conversation
title: "Implement every recommended refactoring and publication control"
description: "Redacted prompt-response exchange EX-0008 from the heritage Foundry task."
generated:
  by: process:heritage-foundry-postmortem-builder
  at: "2026-08-04T05:00:00Z"
assertion_status: normalized
assertion_scope: real-world
tags:
  - postmortem
  - conversation
  - heritage-evaluation-foundry
---
# EX-0008: Implement every recommended refactoring and publication control

[EX-0007](0007-resolve-the-postmortem-architecture-questions.md) | [start-to-finish reader](../readers/conv-001-heritage-evaluation-foundry.md)

## Publication Boundary

This is a public-safe derivative of the visible task conversation. It excludes hidden instructions, private reasoning, tool arguments, tool outputs, credentials and local evidence paths. Commentary and final responses are preserved.

## User Prompt

- Timestamp: `2026-08-04T07:21:33.342Z`

````text
## My request for Codex:
Implement all the '**Recommended next steps'**
````

## Codex Response

### Response 1 (commentary)

- Timestamp: `2026-08-04T07:22:11.677Z`

````text
I’m treating “all” literally: profile/schema v2, impact planning, candidate/evidence separation, modular and sharded generation, early adversarial fixtures, conditional CI, component Site assembly, publication-unit separation, and enforceable release provenance. I’m using the GitHub repository workflow skill because the result spans code, workflows, release policy, and publication topology; I’ll preserve the current postmortem changes and make each optimization fail-closed and independently testable.
````

### Response 2 (commentary)

- Timestamp: `2026-08-04T07:25:15.784Z`

````text
The first implementation pass is now split cleanly: profile/planner, corpus emitters, and Site/CI/release topology are proceeding in parallel. I’m building the early adversarial gate separately so each of the 13 late-finding classes has a tiny executable counterexample before any full corpus or browser run.
````

### Response 3 (commentary)

- Timestamp: `2026-08-04T07:34:41.586Z`

````text
GitHub’s current platform controls do support this directly: repository-level release immutability now has a documented API, and immutable releases automatically bind the tag, assets, commit and a signed release attestation. I’m treating that as an actual terminal gate—not merely wording in a policy file—and will enable it before publishing the new release unit.
````

### Response 4 (commentary)

- Timestamp: `2026-08-04T07:47:46.747Z`

````text
The modular build now has a verified no-op second pass and safe stale-file handling. I’m resolving the last cross-cutting contract now: Site assurance will consume a signed, digest-bound promotion envelope outside the candidate, so publication status never leaks back into candidate data.
````

### Response 5 (commentary)

- Timestamp: `2026-08-04T07:53:15.477Z`

````text
The goal is now explicitly active for the full implementation and publication outcome. The early gate covers all 13 reconstructed late defects; the modular faithful build is down from 176 MB to 129 MB and a repeat build writes zero files. I’m holding the one expensive canonical regeneration until the profile, CI and publication contracts have converged.
````

### Response 6 (commentary)

- Timestamp: `2026-08-04T08:07:11.558Z`

````text
All authoring contracts are now converged: Profile v2 and historical shadow replay pass, candidate metadata is observation-free, the interaction journeys are intact, and the frozen snapshots carry the external namespace directly. I’m starting the single canonical family regeneration now; this is the intentional expensive step the refactor is designed to avoid repeating.
````

### Response 7 (commentary)

- Timestamp: `2026-08-04T08:13:12.423Z`

````text
The implementation is now in integration rather than design: the modular Foundry builder, Profile v2 impact planner, adversarial microfixtures, external publication unit, and candidate/evidence separation are in place. I’m completing the Site/CI integration and postmortem trace in parallel, then I’ll run the full local gates before creating and verifying the independent public exemplar and immutable release.
````

### Response 8 (commentary)

- Timestamp: `2026-08-04T08:13:43.823Z`

````text
A focused export test has confirmed that the independent publication unit preserves every candidate byte and Merkle/root receipt while rewriting only relocated fixture references. The earlier temporary export was stale, so I’m rematerializing it now and will verify that no main-repository paths survive in the external profile.
````

### Response 9 (commentary)

- Timestamp: `2026-08-04T08:22:52.174Z`

````text
The Site/CI workstream has landed with 43 focused checks: ordinary pull requests are impact-planned, full three-engine assurance is retained nightly/manual, Site components are content-addressed, and link observations are kept outside candidate bytes. Integration exposed and fixed one additional late-path defect: the published profile’s authoring-relative paths escaped the external publication root; both the rooted profile and exported fixture now resolve correctly.
````

### Response 10 (commentary)

- Timestamp: `2026-08-04T08:39:50.111Z`

````text
I’m continuing from the current implementation and audit state. I’m treating the new audit findings as release blockers: candidate/promotion separation, real selector consumption, YAML-LD canonicalization, receipt freshness/semantics, and the two-release closure all need to be made executable—not merely documented—before publication.
````

### Response 11 (commentary)

- Timestamp: `2026-08-04T08:48:58.689Z`

````text
The release design is now being converted from one self-referential release into a cycle-free protocol: immutable candidate release → fresh terminal assurance → immutable promotion release. The promotion envelope will bind the first release and its evidence; verification of the second release remains an external observation, which avoids an impossible “release proves itself before it exists” loop.
````

### Response 12 (commentary)

- Timestamp: `2026-08-04T09:01:00.105Z`

````text
The modular/early-gate work is now materially in place: impact receipts are recomputed rather than trusted, historical shadow cases execute as tests, candidate evidence is excluded from both Site and external export, selector outputs drive actual browser suites, and YAML-LD now round-trips through a normalized graph identity before JSON-LD materialization. I’m moving through integration failures now before any public state is created.
````

### Response 13 (commentary)

- Timestamp: `2026-08-04T09:03:18.516Z`

````text
I’m continuing the implementation from the remaining focused failures: first I’m making validation-only journeys independent of mutable assurance evidence, then I’ll regenerate the complete corpus and receipts, run the full gate matrix, and publish/verify the two-release external exemplar.
````

### Response 14 (commentary)

- Timestamp: `2026-08-04T09:06:00.558Z`

````text
The first failure exposed a useful boundary bug rather than just stale output: the exported journey manifest still carried central-repository bundle paths. I’m correcting that so the same manifest resolves `/`, `/tiny/`, and `/synthetic/` beneath whichever publication root is under test, while receipt deferral is now an explicit validation-only mode rather than an implicit weakening.
````

### Response 15 (commentary)

- Timestamp: `2026-08-04T09:08:56.841Z`

````text
The deterministic corpus checks now pass across all three families; only the intentionally timestamped local evidence receipt is stale. I’m rebuilding the Explorer and Site first, then I’ll regenerate that receipt from fresh browser results instead of editing its hashes by hand. In parallel, I’ve asked for independent audits of the release workflows, terminal browser wiring, and YAML-LD export closure.
````

### Response 16 (commentary)

- Timestamp: `2026-08-04T09:15:55.209Z`

````text
The independent audits found three genuine late-stage blockers, and they’re exactly the kind the refactor is meant to surface early: v2 semantic roots were being rechecked with the v1 byte-root algorithm; publication-root journey paths were being interpreted as repository-root paths; and the external terminal workflow pointed at a nonexistent root JavaScript project. I’m fixing these as shared validation/runtime contracts before generating any release evidence.
````

### Response 17 (commentary)

- Timestamp: `2026-08-04T09:21:48.643Z`

````text
I’m continuing the implementation from the audit findings. I’ll close the release-workflow and evidence-integrity gaps first, then run the full deterministic/browser suite and publish only after the exact public URLs pass identity and journey checks.
````

### Response 18 (commentary)

- Timestamp: `2026-08-04T09:22:54.423Z`

````text
The main remaining security concern is now narrow: a successful attestation must prove the exact workflow, tag ref, source commit, and complete immutable release asset set—not merely “some attestation from this repository.” I’m tightening that contract and its regression tests while the other integrity fixes land in parallel.
````

### Response 19 (commentary)

- Timestamp: `2026-08-04T09:29:51.990Z`

````text
GitHub authentication is confirmed valid in the external execution context under `chris-page-gov`; the earlier token diagnosis was sandbox-specific. I’ll use that context only when the candidate has passed its local gates.
````

### Response 20 (commentary)

- Timestamp: `2026-08-04T09:33:10.251Z`

````text
The release templates now fail closed on the exact triggering tag ref, resolved assurance commit, workflow identity, engine result files, and complete release asset closure. The focused topology suite is green; I’m reviewing the integrated paths next so the separate changes agree on one receipt schema.
````

### Response 21 (commentary)

- Timestamp: `2026-08-04T09:36:59.168Z`

````text
I’m using the GitHub publication skill now because the next safe early check is external repository capability—not content publication. This lets me detect Pages or immutable-release account constraints before a late release cycle.
````

### Response 22 (commentary)

- Timestamp: `2026-08-04T09:37:37.841Z`

````text
The independent public repository now exists at [chris-page-gov/okf-heritage-coventry-warwickshire](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire). It is intentionally still empty: Pages is not yet configured, and immutable releases report `enabled: false`; I’m treating those as pre-publication gates, not silently publishing an unverified candidate.
````

### Response 23 (commentary)

- Timestamp: `2026-08-04T09:39:27.205Z`

````text
The application contract is green: 276 Vitest cases, 32 Node contract cases, Svelte diagnostics, and the pinned SBOM all pass. I’m now moving the exhaustive link observation forward—before release—so any source failure is caught against the current 64-shard manifest rather than discovered in terminal promotion.
````

### Response 24 (commentary)

- Timestamp: `2026-08-04T09:40:48.657Z`

````text
The exhaustive observer is still running normally; it emits only at completion because the 7,000-plus canonical URL checks are concurrent and receipt-oriented. No failure output has appeared. Separately, the new local evidence materializer is being made conservative: it will claim one independently verifiable build tree unless a second-build receipt actually exists, eliminating the former unverifiable “two builds” claim.
````

### Response 25 (commentary)

- Timestamp: `2026-08-04T09:42:36.472Z`

````text
The preflight is network-bound rather than CPU-bound and remains within its declared timeout/cycle budget. The new repository’s capability audit also confirms the expected starting state—Actions available, Pages absent, immutable releases disabled—so bootstrap can be explicit and testable before the first workflow-bearing push.
````

### Response 26 (commentary)

- Timestamp: `2026-08-04T09:46:46.562Z`

````text
The early full-link preflight did exactly what it was meant to do: it found a release-blocking policy mismatch before R1. Of 13,505 canonical URLs, 7,288 returned success; 5,961 Historic England links returned their protected-origin `403`, and 256 links point to the not-yet-deployed external Pages site. I’m encoding the 403 case as an explicit host/risk/status policy outcome tied to source identity—not as generic success—while the 256 deployment URLs must remain hard failures until Pages exists.
````

### Response 27 (commentary)

- Timestamp: `2026-08-04T09:48:33.130Z`

````text
The external platform gates are now configured before content publication: Pages is Actions-only with HTTPS, immutable releases are enabled, and Actions requires full-SHA action pinning. The repository contains only an empty bootstrap commit; the planned Pages URL is still correctly treated as unpublished and unverified.
````

### Response 28 (commentary)

- Timestamp: `2026-08-04T09:50:31.378Z`

````text
I’m continuing the full implementation and publication sequence. The local assurance evidence is now generated by a strict, deterministic receipt builder; I’m closing the early link-policy gap next, then I’ll run the full corpus, Site, browser, release, and public-URL gates before treating any recommendation as complete.
````

### Response 29 (commentary)

- Timestamp: `2026-08-04T09:52:09.315Z`

````text
The early link run exposed a useful distinction: Historic England’s machine endpoint returns a deliberate 403 for 5,961 otherwise well-formed official links, while undeployed exemplar URLs correctly remain hard 404 failures. I’ve encoded only that exact host/risk/status tuple as a policy-declared “protected origin”; mutation tests must prove that no broader 403/404 exception can slip through.
````

### Response 30 (commentary)

- Timestamp: `2026-08-04T09:52:41.500Z`

````text
The complete Python suite is now 291/293 passing. The only two failures are intentional stale-evidence guards: the checked-in local receipt still names the pre-refactor corpus and Explorer build. I’m moving into the real-browser run now; its exact results will be used to replace that receipt, after which those guards should close without weakening them. I’m using the Playwright workflow because this gate must exercise the rendered interface, not just inspect generated files.
````

### Response 31 (commentary)

- Timestamp: `2026-08-04T09:53:23.429Z`

````text
The modular Site builder stopped exactly as designed: it found a Finder `[LOCAL_STATE_FILE]` inside generated `_site/legislation` and refused to overwrite/delete an unexplained local file. That file is outside the publication source, ignored by Git, and forbidden by the repository policy; I’m removing only that exact disposable artifact, then rerunning the assembly rather than wiping the Site.
````

### Response 32 (commentary)

- Timestamp: `2026-08-04T10:00:09.915Z`

````text
The browser run is now exercising the independently exported unit (not the central Site shell): faithful, tiny, and synthetic bundles sit at the publication root, exactly as they will on the dedicated Pages site. That exposed and corrected one more stale local-assurance assumption—the receipt validator had still hard-coded the pre-extraction `/evaluation/heritage/…` layout.
````

### Response 33 (commentary)

- Timestamp: `2026-08-04T10:04:57.500Z`

````text
The first browser probe correctly failed rather than producing false assurance: the dedicated unit is a data-and-reading publication, while the interactive runtime remains owned by OKF Explorer. I’m now testing the actual architecture as a same-origin local composite—Explorer runtime plus the exported unit under `/publication/`. In parallel, I’ve assigned exact-link closure and “adversarial gate first” CI ordering as two bounded fixes from the final gap audit.
````

### Response 34 (commentary)

- Timestamp: `2026-08-04T10:08:52.236Z`

````text
The complete functionality run passed: all 100 questions scored at least 80, with a 92.7 average. That includes Coventry/Warwickshire place discovery, designations, historical risk states, graph relationships, authority/provenance, alternative spellings, and deliberate misspellings. I’m now running the three exact interaction journeys for faithful, tiny, and synthetic-isolation bundles.
````

### Response 35 (commentary)

- Timestamp: `2026-08-04T10:14:57.537Z`

````text
The deterministic corpus checks are clean: 7,640 faithful records plus the 3-record tiny fixture and 3-record synthetic supplement all reproduce their exact release roots; all 13 reconstructed late-finding microfixtures also pass. The remaining local closure is the expanded all-links gate, followed by the full integrated test matrix and exact export.
````

### Response 36 (commentary)

- Timestamp: `2026-08-04T10:17:31.229Z`

````text
Local acceptance is now fully green: 297 Python tests, 276 UI unit tests, 32 Node contract tests, zero Svelte diagnostics, a deterministic Explorer build, and the 100-question/three-journey browser evidence. The exact export now contains 4,050 materials and its all-links universe is 13,548 URLs; the publication gate will not accept a partial faithful-only receipt.
````

### Response 37 (commentary)

- Timestamp: `2026-08-04T10:19:47.881Z`

````text
I’ve reached the first publishable candidate boundary. The worktree has only in-scope source, generated corpus, assurance, workflow, report, and test changes; no file exceeds 80 MB, and ignored raw logs/Finder metadata remain outside Git. I’m staging this exact closure now so the remote assurance commit can be referenced by the independent release workflow.
````

### Response 38 (commentary)

- Timestamp: `2026-08-04T10:21:07.974Z`

````text
The central assurance commit is now pushed and draft PR #70 exists. I’m keeping it draft while the independent publication runs: the external workflows will pin central commit `8aeca7d8…`, so their evidence cannot drift to later branch content. Next I’m watching PR CI and materializing that same candidate into the dedicated repository.
````

### Response 39 (commentary)

- Timestamp: `2026-08-04T10:22:13.833Z`

````text
The external manifest checker caught one transient Python bytecode file that its own import created inside `site/scripts`. That is not candidate content and is precisely why the bootstrap runbook specifies bytecode-disabled validation; I’m removing only that generated `.pyc`, rerunning with bytecode disabled, and leaving the export manifest unchanged.
````

### Response 40 (commentary)

- Timestamp: `2026-08-04T10:23:25.515Z`

````text
The external candidate is pushed and its validation/Pages runs have started. One release workflow produced an immediate startup failure on the ordinary `main` push—before R1—so I’m treating that as a workflow-definition defect and inspecting only that failed plane; the candidate and Site bytes are unchanged.
````

### Response 41 (commentary)

- Timestamp: `2026-08-04T10:26:16.521Z`

````text
I’m continuing the implementation through the publication chain, beginning with the invalid candidate-tag trigger found during the first independent-repository run. I’ll limit this correction to the workflow/test dependency cone, then resume exact-commit Pages, release, terminal-assurance, promotion, and report closure.
````

### Response 42 (commentary)

- Timestamp: `2026-08-04T10:26:57.290Z`

````text
The failure is confirmed as GitHub’s trigger-pattern syntax, not a corpus or bundle defect. The broad tag trigger is now paired with the existing strict release-policy validator, so malformed dates still fail closed without forcing any data rebuild.
````

### Response 43 (commentary)

- Timestamp: `2026-08-04T10:28:14.077Z`

````text
The independent repository is now running candidate validation and Pages deployment for exact commit `51881ccc…`. The previous full-candidate commit itself passed both checks; only its malformed release-trigger declaration failed, which confirms the correction stayed isolated from the 4,050-material publication.
````

### Response 44 (commentary)

- Timestamp: `2026-08-04T10:29:52.966Z`

````text
Exact-commit candidate validation and Pages deployment both passed for `51881ccc…`, and GitHub’s deployment record binds the public environment to that SHA. I’m now freezing this same commit as the immutable R1 candidate; the release contains no promotion/status metadata by design.
````

### Response 45 (commentary)

- Timestamp: `2026-08-04T10:30:39.363Z`

````text
R1 reached the platform but failed during release construction, so I’m stopping the promotion chain at that boundary and inspecting the exact failing step. The deployed candidate remains unchanged and valid; I won’t retag or rebuild until the failure’s dependency cone is known.
````

### Response 46 (commentary)

- Timestamp: `2026-08-04T10:35:26.695Z`

````text
Two live runs have now exposed exactly the late-stage coupling the refactor was meant to reveal: Python contracts implicitly depended on a locally prebuilt app, and browser tests implicitly depended on generated SvelteKit state. Both are being converted into explicit, early artifact/setup dependencies. Separately, the release control is being revised so GitHub’s least-privilege workflow token never needs repository-administration access; immutable release evidence will come from the published release and its signed release attestation.
````

### Response 47 (commentary)

- Timestamp: `2026-08-04T10:38:48.614Z`

````text
The release redesign is converging on a clean separation: the tagged commit remains the immutable publication subject, while the updated workflow and an exact Explorer commit form a separately recorded assurance control plane. This also lets workflow-only commits avoid redeploying Pages, preserving the already-proved candidate deployment SHA.
````

### Response 48 (commentary)

- Timestamp: `2026-08-04T10:44:29.203Z`

````text
The first live dependency correction is now proven: Python contracts consumed the uploaded app artifact and all 297 tests passed. The three-engine browser job also passed its newly explicit SvelteKit materialization step and is still executing the terminal-equivalent journeys.
````

## Contribution Reading

- User contribution: Authorized implementation of every postmortem recommendation, including the release-integrity and external-publication controls.
- Codex contribution: Implemented the v2 profile, planner, modular outputs, early fixtures, conditional assurance, external unit and release policy, with public promotion kept pending until terminal verification.

[EX-0007](0007-resolve-the-postmortem-architecture-questions.md) | [start-to-finish reader](../readers/conv-001-heritage-evaluation-foundry.md)
