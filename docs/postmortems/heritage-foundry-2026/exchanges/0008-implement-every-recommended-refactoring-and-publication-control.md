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

### Response 49 (commentary)

- Timestamp: `2026-08-04T10:51:18.017Z`

````text
The control-plane review found and fixed one schema boundary before deployment: the immutable candidate carried the old promotion template, so promotion now sources its template from the exact pinned Explorer assurance commit. Candidate bytes and the proven Pages deployment remain untouched.
````

### Response 50 (commentary)

- Timestamp: `2026-08-04T10:56:16.537Z`

````text
All 302 local contracts and mandatory publication gates are green. One intentional consequence is visible in the hashes: the control/report code changed the repository’s *prospective* export root, while the frozen public candidate stayed byte-identical. I’m auditing that boundary now to ensure mutable assurance controls are not accidentally treated as candidate data.
````

### Response 51 (commentary)

- Timestamp: `2026-08-04T11:04:33.137Z`

````text
The independent audit is clean after three release-safety corrections: R2 stays compatible with the candidate’s original v1 schema, privileged jobs install only trusted assurance dependencies, and Pages separates read-only build authority from deploy/OIDC authority. The complete 302-test gate has passed again.
````

### Response 52 (commentary)

- Timestamp: `2026-08-04T11:07:42.106Z`

````text
The control-only external commit passed candidate validation, created no Pages run, and the public deployment remains bound to `51881ccc…`. I’m now retrying R1 from `main` with the frozen tag as subject and `e7a34cc5…` as the distinct, exact assurance implementation.
````

### Response 53 (commentary)

- Timestamp: `2026-08-04T11:11:17.113Z`

````text
R1 is now immutable and independently verified: release ID `364807792`, archive SHA-256 `8e7e1e09…`, exact five-asset closure, and signed release attestation. Terminal assurance run `30903729068` has started against the same `51881ccc…` candidate and `e7a34cc5…` assurance commit.
````

### Response 54 (commentary)

- Timestamp: `2026-08-04T11:13:15.888Z`

````text
Terminal setup, R1 existence, and deployed-candidate identity all passed. The run is now observing the full 13,548-URL closure across rendered anchors plus faithful, tiny, and synthetic intent universes; this is the longest bounded stage.
````

### Response 55 (commentary)

- Timestamp: `2026-08-04T11:15:52.611Z`

````text
The final PR head has now passed its full Chrome/Firefox/WebKit suite as well as all Python, Foundry, documentation, release-policy, Site, impact, and adversarial gates. Only the two-second aggregate check is closing; external terminal assurance remains in the all-links phase.
````

### Response 56 (commentary)

- Timestamp: `2026-08-04T11:17:34.475Z`

````text
Terminal assurance has just failed inside the all-links stage. I’m inspecting the exact URL/result class now; R1 and Pages remain immutable and unaffected, and no R2 action will occur until the closure failure is resolved.
````

### Response 57 (commentary)

- Timestamp: `2026-08-04T11:19:58.685Z`

````text
The failed workflow omitted its diagnostic receipt because artifact upload was success-only—another early-diagnostics gap. A local exact-candidate reproduction is running now and will retain the URL-level receipt; I’ll also make terminal failure artifacts upload unconditionally so future failures are immediately actionable.
````

### Response 58 (commentary)

- Timestamp: `2026-08-04T11:26:02.478Z`

````text
The three failures were a bounded-observer defect, not broken publication content: policy and timing calculations promised two attempts, but the implementation made only one. Local diagnostics show transient Historic England timeouts and a transient ArcGIS 304/200 cache response. I’m adding the missing second attempt, explicit 304 reachability handling, and always-retained failure receipts before rerunning the same immutable R1.
````

### Response 59 (commentary)

- Timestamp: `2026-08-04T11:30:44.450Z`

````text
I’m continuing from the first terminal-assurance failure: the content itself was intact; the bounded link observer was missing its declared retry and mishandled HTTP 304. I’m finishing that correction first, then I’ll rerun the immutable candidate’s terminal gates, issue the promotion release, record the evidence, refresh the postmortem, and close the PR only after the public browser journey is verified.
````

### Response 60 (commentary)

- Timestamp: `2026-08-04T11:32:39.932Z`

````text
The diagnostic change now has regression coverage for four edge cases: one-and-only-one transient retry, no third attempt, no retry of an accepted protected-origin 403, and explicit 304 reachability evidence. I’m also preserving failure receipts with an always-run upload step so a future terminal failure remains diagnosable without a rebuild.
````

### Response 61 (commentary)

- Timestamp: `2026-08-04T11:35:19.647Z`

````text
The correction is now bounded and candidate-neutral: the worst-case retry backoff adds about 73 seconds within the existing 75-minute link budget, and the immutable R1 Site bytes and pinned validator hash remain unchanged. I’m running the complete local gate set before publishing the new assurance commit.
````

### Response 62 (commentary)

- Timestamp: `2026-08-04T11:36:50.222Z`

````text
The complete local gate set is green—306 tests, Foundry validation, bundle/viewer synchronization, OKF checks, publication export, postmortem validation, and the 10,273-file Site build. The exact assurance commit is now `e90bcc65ef325609ef78525dbfe87f39c810b0eb`; next I’m installing only the future diagnostic workflow on the external control branch, with an explicit check that the frozen candidate Site does not change.
````

### Response 63 (commentary)

- Timestamp: `2026-08-04T11:37:46.738Z`

````text
Terminal run [30905570025](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/actions/runs/30905570025) is running on the immutable candidate commit `51881ccc…` and the exact assurance commit `e90bcc65…`. The external control-only push left `site/**` unchanged; I’ll now watch the full link closure and all three browser engines rather than rebuilding the candidate.
````

### Response 64 (commentary)

- Timestamp: `2026-08-04T11:40:40.700Z`

````text
The rerun has passed both exact checkouts, the 40-hex assurance pin, and runtime setup; it is currently installing the pinned three-engine test environment. No candidate or Pages rebuild has been triggered—the assurance workflow is consuming the existing immutable R1 and public Site.
````

### Response 65 (commentary)

- Timestamp: `2026-08-04T11:44:05.604Z`

````text
The exact deployed identity check passed. The run is now traversing the complete 13,537-URL closure; this is the formerly failing gate, so I’m letting its bounded retry policy complete before moving to protected Chrome and the Chromium/Firefox/WebKit journeys.
````

### Response 66 (commentary)

- Timestamp: `2026-08-04T11:45:56.342Z`

````text
The 13,537-URL closure has now passed—the retry correction fixed the original failure. A different, later gate has exposed a protected-page Chrome failure before the three-engine journeys; I’m collecting its exact browser diagnostics now and will constrain any correction to that gate rather than rebuilding the candidate or repeating the link closure unnecessarily.
````

### Response 67 (commentary)

- Timestamp: `2026-08-04T11:49:50.515Z`

````text
The protected-page failure is a teardown race, not yet evidence of a content failure: the observer’s `finally` block could let a profile-directory `ENOTEMPTY` replace the real observation result. I’m correcting teardown so Chrome is asked to close gracefully, forced termination is awaited, profile deletion is bounded/retried, and any primary observation error remains the error reported.
````

### Response 68 (commentary)

- Timestamp: `2026-08-04T11:56:31.928Z`

````text
The cleanup fix exposed the hidden primary condition: Historic England now leaves the requested `q=1184627` page in place instead of redirecting it to the declared default-size URL. I’ve made the evidence stronger and transparent: genuine Chrome verifies the identity at both the requested URL and the declared canonical URL, records both final URLs plus the reprobe basis, and still satisfies the immutable R1 promotion contract. All 11 live protected pages now pass locally in genuine Chrome.
````

### Response 69 (commentary)

- Timestamp: `2026-08-04T11:59:36.328Z`

````text
The exact protected-browser assurance commit is now `ffc756f27c7391f9d2b8693557e7ad0e81500080`. It passed 306 Python tests, 276 app tests, 39 Node contract tests, Svelte diagnostics, unchanged publication export, unchanged runtime app identity, and all 11 protected pages in real Chrome. I’m rerunning the immutable terminal workflow with only that assurance pin changed.
````

### Response 70 (commentary)

- Timestamp: `2026-08-04T12:02:05.461Z`

````text
The rerun has again passed exact candidate identity and is in the full link-closure stage. Because the app and Site hashes are unchanged and the local genuine-Chrome journey already passes, this run is now checking that the same evidence holds in the Linux/Xvfb release environment before the three-engine matrix.
````

### Response 71 (commentary)

- Timestamp: `2026-08-04T12:02:57.657Z`

````text
Terminal assurance is fully green in 2m49s: exact candidate identity, all 13,537 canonical URLs, 11 protected Historic England pages in genuine Chrome, and all 32 publication actions in Chromium, Firefox, and WebKit. I’m now downloading and independently checking the four receipts before creating the detached promotion tag/release.
````

### Response 72 (commentary)

- Timestamp: `2026-08-04T12:04:30.105Z`

````text
The detached annotated tag `heritage-coventry-warwickshire-20260804-promotion.1` now resolves exactly to candidate commit `51881ccc…`. Promotion run [30907485088](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/actions/runs/30907485088) is binding the immutable R1 assets, terminal artifact digest, four assurance receipts, and exact control commit into R2.
````

### Response 73 (commentary)

- Timestamp: `2026-08-04T12:05:35.852Z`

````text
The promotion workflow correctly failed closed before any R2 release was created. R1 revalidation and envelope materialization passed; the trusted semantic validator rejected the new receipt at the next gate. I’m retrieving that exact error now—no tag target, candidate, Pages deployment, or release asset has been altered.
````

### Response 74 (commentary)

- Timestamp: `2026-08-04T12:08:16.317Z`

````text
The validator exposed three shift-left contract gaps, all before release publication: the 11.5 MB complete link receipt exceeded a generic 2 MB control-file limit; JavaScript’s millisecond timestamp and Python’s equivalent microsecond rendering were compared as strings; and the observer’s channel label differed from the policy label. I’m fixing these at their producers and adding a narrowly scoped terminal wrapper that raises the size bound only for the exact link-closure receipt, while leaving the immutable R1 validator byte-for-byte unchanged.
````

### Response 75 (commentary)

- Timestamp: `2026-08-04T12:12:58.347Z`

````text
The contract fixes are now pinned at `b030c618b833f2790ddd3642a96b11b3eda670ce`, with the original R1 validator still exactly `bd1bad9f…0075`. The external update changed only the promotion workflow; `site/**` remains identical to candidate `51881ccc…`. I’m generating one fresh terminal artifact so its channel and timestamps are natively correct rather than rewriting evidence after the fact.
````

### Response 76 (commentary)

- Timestamp: `2026-08-04T12:14:53.093Z`

````text
The fresh terminal run has passed exact deployed identity and is traversing the same bounded closure. The new evidence producers are active: Chrome will emit the policy’s exact channel, and each engine result will use the same six-digit UTC representation that the signed journey receipt records.
````

### Response 77 (commentary)

- Timestamp: `2026-08-04T12:18:29.565Z`

````text
The fresh artifact is internally consistent: channel `genuine-google-chrome-cdp`; all three raw engine timestamps exactly match their receipt rows; terminal artifact digest `sha256:09e3be84…d2b47`; assurance source `b030c618…`. The failed attempt created no release, so I’m safely reusing the same annotated promotion tag with this corrected evidence.
````

### Response 78 (commentary)

- Timestamp: `2026-08-04T12:19:49.518Z`

````text
Semantic validation now passes completely, including the 11.5 MB exact link closure. The workflow also created the envelope attestation, then failed closed in the provenance cross-check before drafting a release. I’m inspecting that specific tag/attestation binding; again, no R2 release exists yet.
````

### Response 79 (commentary)

- Timestamp: `2026-08-04T12:22:52.581Z`

````text
The attestation itself was valid; the old release-policy checker simply re-ran the same semantic validator without the terminal-only size scope. That is now wrapped separately—candidate-phase policy remains untouched, promotion-phase policy gets the exact 16 MB link-receipt allowance, and all 309 Python tests pass. The final assurance pin is `b0b78b8772341ec2b99ddd588389e4635eebe9e9`.
````

### Response 80 (commentary)

- Timestamp: `2026-08-04T12:24:50.355Z`

````text
This final terminal run is still in its expected bounded observation phase. The repeated work is now limited to the external assurance plane—no corpus generation, candidate archive, Site assembly, or Pages deployment is being repeated—and the postmortem will record these newly exposed dependency boundaries explicitly.
````

### Response 81 (commentary)

- Timestamp: `2026-08-04T12:27:46.276Z`

````text
Final terminal run [30908844005](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/actions/runs/30908844005) is green, pinned to `b0b78b87…`, with artifact digest `sha256:2f9e5544…f1447c`. R2 run [30909191165](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/actions/runs/30909191165) is now executing the complete semantic, cryptographic, asset-closure, and immutability sequence.
````

### Response 82 (commentary)

- Timestamp: `2026-08-04T12:29:49.177Z`

````text
The final promotion attempt is already in flight. I’m checking that immutable R2 release first; then I’ll seal the evidence ledger, regenerate the complete process trace/postmortem, run the exact-head gates, and merge only if every publication and browser assurance is green.
````

### Response 83 (commentary)

- Timestamp: `2026-08-04T12:30:02.441Z`

````text
R2 has succeeded: GitHub completed validation, attestation, publication, and post-publication immutability checks. I’m now independently reconciling its tag, assets, hashes, terminal artifact, and the report/evidence schema in parallel before treating that success badge as closure.
````

### Response 84 (commentary)

- Timestamp: `2026-08-04T12:30:15.949Z`

````text
I’m using the analytical report skill for the closure write-up because the deliverable is an evidence-backed postmortem, not merely prose. It requires the final report to separate observed facts, derived claims, caveats, and source lineage, which is exactly the discipline needed here.
````

### Response 85 (commentary)

- Timestamp: `2026-08-04T12:33:42.333Z`

````text
The terminal audit is exact and clean. It exercised 13,548 canonical URLs, used one bounded retry for only two transient ArcGIS calls, verified all 11 protected pages in genuine Chrome, and passed 32 actions plus 2 assertions in each of Chromium, Firefox, and WebKit. No failed URL remained, and every receipt hash cross-binds to the same immutable candidate.
````

### Response 86 (commentary)

- Timestamp: `2026-08-04T12:37:48.730Z`

````text
The promotion audit also passed independently: the R2 release is immutable, all ten assets match their release-attested digests, and both tags peel to the same candidate. I found one provenance-label wrinkle—the annotated tag’s human message names an earlier successful terminal run, while the attested R2 envelope correctly binds the later final run. I’m preserving that fact in the postmortem rather than rewriting an already-published tag.
````

### Response 87 (commentary)

- Timestamp: `2026-08-04T12:45:05.300Z`

````text
The portable report contains quantitative charts, so I’m also applying the visualization QA skill to the existing artifact. I’m preserving its chart families and reading order, updating only the closure evidence and resolved-status views, then using the packaged renderer’s own browser verifier.
````

### Response 88 (commentary)

- Timestamp: `2026-08-04T12:51:01.339Z`

````text
The refreshed portable report now validates and passes its packaged Chromium QA at 1440px and 390px, including the source dialog and keyboard interaction. It now shows the recommendations as implemented, the architecture questions as decisions, and the full nine-attempt closure—including the four bounded failures that caused zero candidate or Site rebuilds.
````

## Contribution Reading

- User contribution: Authorized implementation of every postmortem recommendation, including the release-integrity and external-publication controls.
- Codex contribution: Implemented the v2 profile, planner, modular outputs, early fixtures, conditional assurance, external unit and release policy, then completed the public promotion through terminal verification.

[EX-0007](0007-resolve-the-postmortem-architecture-questions.md) | [start-to-finish reader](../readers/conv-001-heritage-evaluation-foundry.md)
