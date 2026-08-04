---
"@context":
  - https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/context.jsonld
  - https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/semantic-context.jsonld
"@id": https://chris-page-gov.github.io/okf-explorer/docs/postmortems/heritage-foundry-2026/exchanges/0005-confirm-graph-browsing-cannot-mutate-the-bundle.html
"@type": https://schema.org/Conversation
type: Conversation
title: "Confirm graph browsing cannot mutate the bundle"
description: "Redacted prompt-response exchange EX-0005 from the heritage Foundry task."
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
# EX-0005: Confirm graph browsing cannot mutate the bundle

[EX-0004](0004-correct-the-github-authentication-diagnosis.md) | [start-to-finish reader](../readers/conv-001-heritage-evaluation-foundry.md) | [EX-0006](0006-create-the-end-to-end-engineering-postmortem.md)

## Publication Boundary

This is a public-safe derivative of the visible task conversation. It excludes hidden instructions, private reasoning, tool arguments, tool outputs, credentials and local evidence paths. Commentary and final responses are preserved.

## User Prompt

- Timestamp: `2026-08-03T12:03:35.949Z`

````text
I opened the URL and clicked around the graph, I hope this did not change the bundle!
````

## Codex Response

### Response 1 (commentary)

- Timestamp: `2026-08-03T12:03:43.322Z`

````text
It did not change the bundle. The published Explorer is a static, read-only site: graph clicks only change browser-side view state (and sometimes the URL fragment/query). There is no write endpoint back into the bundle or repository. I’m also continuing to verify the candidate from file hashes, so any byte-level change would be detected independently.
````

### Response 2 (commentary)

- Timestamp: `2026-08-03T12:05:51.314Z`

````text
Local functionality is now green: all 100 questions scored (average 92.7; every score at least 80), and all three tiny/faithful/synthetic journeys passed. I’ve frozen those JSON results into deterministic gzip receipts and am running the full repository validation matrix before publication.
````

### Response 3 (commentary)

- Timestamp: `2026-08-03T12:10:35.480Z`

````text
The full local gate is now clean: 209 Python tests, 301 app tests, 153 cross-browser UI tests, 63 cross-browser Foundry/Markdown tests, deterministic corpus/app builds, semantic and source-constraint validation, SBOM, link/render audit, and the final Site build. I’m moving this exact candidate into the review-and-deploy workflow now.
````

### Response 4 (commentary)

- Timestamp: `2026-08-03T12:12:05.789Z`

````text
PR [#68](https://github.com/chris-page-gov/okf-explorer/pull/68) is now open with the exact validated commit. I’m waiting for GitHub’s independent checks; I’ll merge only after they are green, then verify the resulting Pages deployment byte-for-byte and through the terminal browser journey.
````

### Response 5 (commentary)

- Timestamp: `2026-08-03T12:13:33.149Z`

````text
GitHub’s required CI is still running; no failure has appeared. The local matrix already mirrors the workflow, including all three browser engines, but I’m retaining the independent GitHub gate before merge.
````

### Response 6 (commentary)

- Timestamp: `2026-08-03T12:15:26.418Z`

````text
CI has completed setup, dependency validation, unit tests, SBOM, and deterministic app build successfully. It is currently in the independent three-browser UI stage; the later corpus, documentation, Site, and Foundry stages are queued.
````

### Response 7 (commentary)

- Timestamp: `2026-08-03T12:17:56.214Z`

````text
The independent browser stage is slower on the GitHub runner than locally, but remains active and has not reported a retry or failure. I’m continuing to watch the exact run rather than treating elapsed time as success.
````

### Response 8 (commentary)

- Timestamp: `2026-08-03T12:19:47.369Z`

````text
Still no CI fault signal; the same three-browser job is running. This workflow is intentionally single-worker and executes 153 tests sequentially, so the elapsed time is consistent with its design.
````

### Response 9 (commentary)

- Timestamp: `2026-08-03T12:21:12.823Z`

````text
The three-browser CI stage has passed. GitHub has also completed Python setup, semantic dependencies, fixture validation, and all three heritage corpus checks; it is now running the 209-test Python suite.
````

### Response 10 (commentary)

- Timestamp: `2026-08-03T12:22:30.590Z`

````text
Every CI stage through the 987 MB static Site build has passed, including documentation lockstep and generated corpus reproducibility. Only the final 63-test Chrome/Firefox/WebKit Foundry and rendered-Markdown stage remains.
````

### Response 11 (commentary)

- Timestamp: `2026-08-03T12:24:43.057Z`

````text
Annotation 1 — confirmed: the GitHub CLI credentials are valid in the external execution context, and I’ll use that authenticated context for the remaining merge and publication work.

Your graph exploration did not alter the bundle: the published explorer is a static, read-only client, so clicks only changed browser-local navigation state. I’m continuing with the clean, CI-passed PR, then I’ll verify the exact deployed candidate in a real browser before promoting the report.
````

### Response 12 (commentary)

- Timestamp: `2026-08-03T12:24:54.671Z`

````text
PR #68 is still clean and mergeable, and its full GitHub CI suite passed. I’m merging that exact reviewed candidate now; the next gate is the Pages deployment for the resulting immutable commit.
````

### Response 13 (commentary)

- Timestamp: `2026-08-03T12:25:16.770Z`

````text
The reviewed candidate is now merged as commit `c8e8fac3ef2beddae7bdc99988ae9c5aac2431f2`. GitHub Pages is building that exact commit; I’m following its run rather than testing a moving or assumed URL.
````

### Response 14 (commentary)

- Timestamp: `2026-08-03T12:27:03.094Z`

````text
The Pages build has cleared the application validation, deterministic application build, dependency setup, and Evaluation Foundry fixture checks. It is now validating the full generated heritage closure—the large-corpus gate expected to take most of this run.
````

### Response 15 (commentary)

- Timestamp: `2026-08-03T12:28:11.860Z`

````text
The complete site artifact—roughly the one-gigabyte publication closure—has now built, validated, and uploaded successfully. GitHub is in the final Pages deployment step; once it reports success I’ll run the fail-closed public journey against the deployed descriptor and release-root hashes.
````

### Response 16 (commentary)

- Timestamp: `2026-08-03T12:28:56.461Z`

````text
Pages has deployed commit `c8e8fac3…` successfully. I’m starting the terminal public gate now: it binds the live descriptor and full release root to the reviewed candidate, then exercises the publication journey, HTML/Markdown routes, graph/search behavior, deep-link fallback, and protected Historic England source-link evidence.
````

### Response 17 (commentary)

- Timestamp: `2026-08-03T12:29:13.911Z`

````text
The terminal public journey passed on its first run against the deployed candidate. I’m now extracting the receipt details—observed hashes, URLs, browser assertions, and fallback checks—so the beginner report can be promoted from “candidate pending publication” to a source-backed public result.
````

### Response 18 (commentary)

- Timestamp: `2026-08-03T12:35:19.940Z`

````text
The cleanest way to preserve the terminal evidence is an immutable GitHub Release asset tied to the final deployed commit. That avoids a self-referential Pages hash loop. I’m promoting the report and machine-readable coverage from provisional to evaluated, then the final deployment will get a tagged evidence release and a fresh exact-browser check that also validates that release page.
````

### Response 19 (commentary)

- Timestamp: `2026-08-03T12:38:13.719Z`

````text
The promotion touches only evidence/status and publication entry points, but those controls are deliberately inside the rooted corpus. That means I will not reuse the earlier release root: after these edits I’ll regenerate it, rerun the 100-question and three local journeys, rebuild the Site receipt, and verify the promoted deployment as a new exact candidate.
````

### Response 20 (commentary)

- Timestamp: `2026-08-03T12:40:31.587Z`

````text
The report and both human/machine profiles are now promoted and internally consistent: the beginner YAML-LD explanation remains intact, authority limits remain explicit, and the first deployed candidate’s exact evidence is recorded. I’m finishing the registry, copy-ready URLs, generated landing-page wording, and release-page journey action before regeneration.
````

### Response 21 (commentary)

- Timestamp: `2026-08-03T12:43:03.112Z`

````text
The promotion source edits are complete and the remaining “planned/pending” wording is now confined to the intentionally local pre-publication receipt. I’m regenerating all three corpus products at the pinned generation time so only the governed control, registry, landing-page, and digest consequences change.
````

### Response 22 (commentary)

- Timestamp: `2026-08-03T12:48:02.381Z`

````text
The promoted corpus is deterministic across two independent builds for faithful, tiny, and synthetic products. Its descriptor remains `2b06…`, while the deliberately changed release roots are now `000790…`, `6c8b…`, and `14f76…`; the rebuilt Site is 987,323,025 bytes with 12,676,975 bytes of Pages headroom. I’m running the full test matrix now.
````

### Response 23 (commentary)

- Timestamp: `2026-08-03T12:50:32.952Z`

````text
The unit/static matrix is green: 209 Python tests, 276 application tests, 25 build/acceptance tests, zero Svelte diagnostics, the pinned SBOM, and the deterministic app build all passed. The cross-browser suite is progressing normally through Chrome and Firefox; no failures so far.
````

### Response 24 (commentary)

- Timestamp: `2026-08-03T12:53:13.880Z`

````text
The full validation matrix found one expected synchronization consequence: adding the now-public heritage bundle to the YAML-LD registry requires regenerating its JSON, JSON-LD, and application-static projections. I’m doing that now, then I’ll re-root the deterministic app/Site receipt; all substantive corpus, Foundry, OKF, constraints, and legislation checks already passed.
````

### Response 25 (commentary)

- Timestamp: `2026-08-03T12:57:03.245Z`

````text
All final static and generated checks are now green, including the seven-bundle registry and the rebuilt app/Site roots. For stronger closure, I’m rerunning the 100 scored questions and the three local real-consumer journeys against this final assembled Site—not carrying their earlier results forward merely because the descriptor filename stayed stable.
````

### Response 26 (commentary)

- Timestamp: `2026-08-03T12:59:01.861Z`

````text
The final 100-question rerun is exercising exact names, familiar alternatives, grades, source categories, time slices, and typo cases against the rebuilt Site. The first 43 are all above the pass threshold; bounded source-absent categories are correctly scoring as explained empty states rather than invented records.
````

### Response 27 (commentary)

- Timestamp: `2026-08-03T13:09:38.797Z`

````text
The final local evidence is now refreshed, not inherited: 100/100 questions again averaged 92.7 with all scores at least 80, and tiny/faithful/synthetic journeys passed 3/3 against the rebuilt Site. Their deterministic compressed receipts, timestamps, manifest hash, app root, corpus roots, and Site tree are all rebound; three independent reviewers are doing a last read-only consistency pass.
````

### Response 28 (commentary)

- Timestamp: `2026-08-03T13:11:24.450Z`

````text
The final diff is intentionally small relative to the implementation PR: 29 files, mainly status/evidence metadata, three generated landing pages and roots, registry projections, evaluator-output hygiene, and tests. No heritage records, search shards, source snapshots, semantic assertions, or application code changed during promotion.
````

### Response 29 (commentary)

- Timestamp: `2026-08-03T13:16:38.725Z`

````text
Clicks in the deployed graph are read-only browser state, so they cannot alter the bundle or repository. I’m now resolving the last promotion consistency detail, then I’ll publish the final tagged build and run the exact public browser gate against it.
````

### Response 30 (commentary)

- Timestamp: `2026-08-03T13:17:01.115Z`

````text
The reviewer’s case-matching concern is already covered by executable code: both the JavaScript evaluator and Python validator compare identity excerpts case-insensitively. I found one real presentation ambiguity—machine-readable local-build fields still showed the earlier deployed candidate’s 4,135 references—so I’m separating that historical observation from the current promotion build’s 4,157 references.
````

### Response 31 (commentary)

- Timestamp: `2026-08-03T13:19:25.346Z`

````text
The regenerated faithful corpus is byte-for-byte deterministic across two independent builds. Its descriptor remains stable, while the release root correctly changed to bind the clarified 4,157-reference promotion metadata; the assembled Site now recomputes cleanly at 14,010 files with 12.67 MB headroom.
````

### Response 32 (commentary)

- Timestamp: `2026-08-03T13:19:54.804Z`

````text
To honour “all links” literally at the public gate, I’m closing the audit’s four remaining terminal gaps: the tiny and synthetic Explorer entry URLs, plus the cited immutable implementation commit and successful Pages run. Internal Markdown/HTML links remain exhaustively checked by the Site builder; these additions make the final browser journey 32 actions rather than 28.
````

### Response 33 (commentary)

- Timestamp: `2026-08-03T13:24:08.441Z`

````text
All three interaction journeys passed again on the rebuilt faithful, tiny, and isolated synthetic bundles. The 100-question evaluation is still running and has passed its first 20 questions at 94/100 each.
````

### Response 34 (commentary)

- Timestamp: `2026-08-03T13:25:14.225Z`

````text
The question run remains clean through 69/100. Scores are within the previously established 88–94 range, including risk history, designation aliases, chronology, people, and deliberately sparse categories.
````

### Response 35 (commentary)

- Timestamp: `2026-08-03T13:26:03.504Z`

````text
The complete 100-question browser evaluation passed: 100/100 scored at least 80, none below 60, with the same 92.7 average. I’m sealing these fresh results and the three passing local journeys into deterministic evidence before the full repository gate.
````

### Response 36 (commentary)

- Timestamp: `2026-08-03T13:27:51.172Z`

````text
One defensive unit test caught a useful contract issue introduced by the broader link journey. The corpus, Foundry validator, tiny fixture, and synthetic isolation all pass; I’m now adjusting the publication-binding test/contract so extra audited GitHub links cannot be mistaken for an alternate candidate bundle.
````

### Response 37 (commentary)

- Timestamp: `2026-08-03T13:29:24.306Z`

````text
The strengthened binding now accepts only auxiliary Explorer bundles that are declared by the fixture family and rejects arbitrary ones. All 209 Python tests, registry/constraint checks, OKF bundle/viewer conformance, legislation validation, and diff hygiene now pass.
````

### Response 38 (commentary)

- Timestamp: `2026-08-03T13:30:31.372Z`

````text
All local publication surfaces now pass in Chrome, Firefox, and WebKit (63/63), alongside 276 app tests, 25 build-contract tests, zero Svelte diagnostics, a 136-component SBOM check, and a deterministic Explorer build. I’m at the final diff/commit boundary before GitHub CI and deployment.
````

### Response 39 (commentary)

- Timestamp: `2026-08-03T13:31:28.907Z`

````text
The promotion commit is sealed and clean at `0d377c917493460d7264eaecb9563a0ba0e91523`; documentation lockstep also passes. I’m pushing it now, then I’ll wait for the full GitHub matrix before merging and deploying.
````

### Response 40 (commentary)

- Timestamp: `2026-08-03T13:32:36.060Z`

````text
PR [#69](https://github.com/chris-page-gov/okf-explorer/pull/69) is open and its full CI workflow is running. The branch is pushed from the valid external GitHub authentication context.
````

### Response 41 (commentary)

- Timestamp: `2026-08-03T13:33:52.111Z`

````text
CI is still active rather than queued or failed; this repository’s matrix includes three-browser E2E, corpus synchronization, the 1 GB Site build, and all semantic checks, so a few minutes is expected.
````

### Response 42 (commentary)

- Timestamp: `2026-08-03T13:35:38.467Z`

````text
CI has completed setup, Svelte/app/unit/SBOM/deterministic-build stages successfully and is currently in the full 153-test cross-browser Explorer suite. No failure has appeared.
````

### Response 43 (commentary)

- Timestamp: `2026-08-03T13:38:01.382Z`

````text
The long-running browser matrix remains healthy. I’m keeping the merge blocked until GitHub reports the entire workflow green, including the later Python, semantic, Site-size, and Foundry-page stages.
````

### Response 44 (commentary)

- Timestamp: `2026-08-03T13:40:30.685Z`

````text
The cross-browser suite is the only active stage and has not timed out; all preceding checks are green. I’m continuing to monitor rather than bypassing it.
````

### Response 45 (commentary)

- Timestamp: `2026-08-03T13:42:41.624Z`

````text
PR #69 is fully green after 10m30s, including the complete 153-test cross-browser Explorer suite and every later semantic/Site/Foundry gate. I’m merging this exact reviewed commit now.
````

### Response 46 (commentary)

- Timestamp: `2026-08-03T13:43:14.912Z`

````text
The promotion merged as `0b5d748dc13ed83134592fc0873a2ff25d83eada`. GitHub Pages run [30819232224](https://github.com/chris-page-gov/okf-explorer/actions/runs/30819232224) has started for that exact SHA; the release and terminal receipt remain deliberately gated on its success.
````

### Response 47 (commentary)

- Timestamp: `2026-08-03T13:45:04.954Z`

````text
The final Pages job is progressing normally: checkout, Svelte validation, deterministic app build, Python setup, dependencies, and Foundry validation are green; it is now regenerating and checking all heritage corpora.
````

### Response 48 (commentary)

- Timestamp: `2026-08-03T13:46:46.871Z`

````text
Pages run 30819232224 succeeded and deployed the exact merge SHA. I’m creating the immutable release at that commit now; only after the release page exists can action 28 and the complete 32-action public journey be honestly evaluated.
````

### Response 49 (commentary)

- Timestamp: `2026-08-03T13:47:31.131Z`

````text
The exact promoted deployment passed the terminal gate: 1/1 public journey, all 32/32 actions, and both assertions. This includes the immutable release, every report external/rich-page link, all rendered HTML pages, faithful/tiny/synthetic Explorer URLs, and the cited run/commit identities.
````

### Response 50 (commentary)

- Timestamp: `2026-08-03T13:48:57.781Z`

````text
The release asset API accepted three uploads before rejecting basename collisions; I’ve inspected the exact partial state. I’m correcting only the two ambiguous `results.json`/`results.md` assets, then uploading uniquely named evidence files so each digest is unambiguous.
````

### Response 51 (commentary)

- Timestamp: `2026-08-03T13:50:33.013Z`

````text
The release now has six uniquely named evidence assets with server-reported SHA-256 digests matching the local files, and its notes record the exact merge, Pages run, descriptor, plane roots, release root, and terminal pass. I’m doing one independent final audit round against the public release and receipts before closing the goal.
````

### Response 52 (commentary)

- Timestamp: `2026-08-03T13:53:15.661Z`

````text
The independent public audit is clean: the tag resolves to the exact merge, the Pages run matches it, all six release assets download and hash correctly, and action 28 independently returns the exact release title and URL.
````

### Response 53 (commentary)

- Timestamp: `2026-08-03T13:55:24.854Z`

````text
All three independent reviewers now report no blocker: public URLs, tag/commit identity, downloaded asset digests, current-versus-historical metrics, case-insensitive matching, source/generated parity, and the complete receipt chain reconcile exactly.
````

### Response 54 (final_answer)

- Timestamp: `2026-08-03T13:56:22.688Z`

````text
Complete and published.

Public entry points:

- [Faithful OKF Explorer](https://chris-page-gov.github.io/okf-explorer/?bundle=https%3A%2F%2Fchris-page-gov.github.io%2Fokf-explorer%2Fevaluation%2Fheritage%2Fokf-explorer.json)
- [Beginner report and YAML-LD explanation](https://chris-page-gov.github.io/okf-explorer/docs/heritage-evaluation-report.html)
- [Evaluation profile](https://chris-page-gov.github.io/okf-explorer/evaluation-foundry/fixtures/heritage-warwickshire/profile.html)
- [Tiny assurance fixture](https://chris-page-gov.github.io/okf-explorer/evaluation/heritage/tiny/index.html)
- [Isolated synthetic supplement](https://chris-page-gov.github.io/okf-explorer/evaluation/heritage/synthetic/index.html)
- [Immutable release and evidence](https://github.com/chris-page-gov/okf-explorer/releases/tag/heritage-coventry-warwickshire-20260803)

The faithful corpus contains 7,640 records: 6,556 spatially intersecting NHLE records and 1,084 authoritative-field Heritage at Risk records. It includes 22,200 resources, 9,566 relationships, 22,040 indexed terms and 626,287 postings, with extensive aliases and bounded one-edit misspelling support. The three-record tiny fixture is entirely source-backed; the three-record synthetic supplement is separate and default-off.

The YAML-LD extension adds stable identities, typed entities, governed relationships, assertion status/scope, provenance and evidence, with YAML-LD/JSON-LD semantic exports. Graph, Links and Type views use those semantics while retaining compatibility with ordinary OKF Markdown consumers.

Final assurance:

- PR [#69](https://github.com/chris-page-gov/okf-explorer/pull/69) merged as `0b5d748dc13ed83134592fc0873a2ff25d83eada`.
- [Pages run 30819232224](https://github.com/chris-page-gov/okf-explorer/actions/runs/30819232224) passed at that exact commit.
- Terminal journey: 32/32 actions and 2/2 assertions, comprising 21 live-browser and 11 identity-bound genuine-browser checks.
- All six release evidence assets download successfully and match their published SHA-256 digests.
- Descriptor SHA-256: `2b06dc70e8d1943e18617d4edcb09bd5041ff8f7b7611828d1c9d24070b37149`.
- Release root: `83b6be80cc009a23142ca946b2bad515fa14c149ea4222b4b2bf1035a3ea2e7e`.
- Tests passed: 209 Python, 276 Vitest, 25 build-contract, 153 Explorer cross-browser and 63 Foundry cross-browser tests; 100/100 evaluation questions scored at least 80.
- The Site renders 239 reading pages, validates 4,566 links and 4,157 internal references, and remains within the GitHub Pages size limit.

Clicking around the graph did not alter anything. It changes only in-memory/browser URL state; the static Site exposes no bundle-writing endpoint. A post-attachment 32-action rerun passed with the same descriptor and release root.

Unrelated state was preserved: Dependabot PRs #65–66, roadmap issues #49–54, and existing auxiliary branches/worktrees remain untouched. One pre-existing prunable worktree entry remains; I did not destructively remove it.

Annotation 1 — confirmed. The GitHub CLI credentials are valid in the external execution context, and all GitHub operations used that authenticated context.

Goal completed using 6,075,093 tokens over approximately 15h 41m elapsed time.

::git-create-branch{cwd="[LOCAL_REPO]" branch="codex/promote-heritage-publication"}
::git-stage{cwd="[LOCAL_REPO]"}
::git-commit{cwd="[LOCAL_REPO]"}
::git-push{cwd="[LOCAL_REPO]" branch="codex/promote-heritage-publication"}
::git-create-pr{cwd="[LOCAL_REPO]" branch="codex/promote-heritage-publication" url="https://github.com/chris-page-gov/okf-explorer/pull/69" isDraft=false}
````

## Contribution Reading

- User contribution: Raised a data-integrity concern after interacting with the public graph.
- Codex contribution: Separated producer/consumer correctness evidence from regional completeness and synthetic illustration.

[EX-0004](0004-correct-the-github-authentication-diagnosis.md) | [start-to-finish reader](../readers/conv-001-heritage-evaluation-foundry.md) | [EX-0006](0006-create-the-end-to-end-engineering-postmortem.md)
