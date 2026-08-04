---
"@context":
  - https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/context.jsonld
  - https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/semantic-context.jsonld
"@id": https://chris-page-gov.github.io/okf-explorer/docs/postmortems/heritage-foundry-2026/exchanges/0004-correct-the-github-authentication-diagnosis.html
"@type": https://schema.org/Conversation
type: Conversation
title: "Correct the GitHub authentication diagnosis"
description: "Redacted prompt-response exchange EX-0004 from the heritage Foundry task."
generated:
  by: process:heritage-foundry-postmortem-builder
  at: "2026-08-04T13:16:54Z"
assertion_status: normalized
assertion_scope: real-world
tags:
  - postmortem
  - conversation
  - heritage-evaluation-foundry
---
# EX-0004: Correct the GitHub authentication diagnosis

[EX-0003](0003-implement-and-publish-the-complete-heritage-exemplar.md) | [start-to-finish reader](../readers/conv-001-heritage-evaluation-foundry.md) | [EX-0005](0005-confirm-graph-browsing-cannot-mutate-the-bundle.md)

## Publication Boundary

This is a public-safe derivative of the visible task conversation. It excludes hidden instructions, private reasoning, tool arguments, tool outputs, credentials and local evidence paths. Commentary and final responses are preserved.

## User Prompt

- Timestamp: `2026-08-02T22:24:30.160Z`

````text
# Response annotations:
Each item contains text selected from an earlier Codex response and may include a user comment. Treat items as Annotation 1, Annotation 2, and so on in array order. Use every selection as context and address every comment. When addressing multiple comments, label each answer with its annotation number (for example, `Annotation 1`) so the user can match it to the numbered annotation.
<response-annotations>
[{"text":"the local GitHub CLI is installed but its saved token is invalid."}]
</response-annotations>

## My request for Codex:
This is valid outside your sandbox -
````

## Codex Response

### Response 1 (commentary)

- Timestamp: `2026-08-02T22:24:35.303Z`

````text
Understood: the invalid-token result was sandbox-specific, not a repository/account problem. I’ll use the CLI outside the sandbox at the publication gate and verify it now so this does not remain a false blocker.
````

### Response 2 (commentary)

- Timestamp: `2026-08-02T22:28:27.059Z`

````text
Annotation 1: confirmed. I reran the GitHub authentication check outside the sandbox; the `chris-page-gov` credential is valid with repository and workflow access. I’m continuing unattended with publication/authentication treated as available.
````

### Response 3 (commentary)

- Timestamp: `2026-08-02T22:31:31.615Z`

````text
The official spatial feeds support a complete, exact-boundary corpus. I’m also testing Historic England’s own browser-only export path as an optional enrichment plane; it will not be allowed to weaken the complete authoritative denominator or blur licensing constraints.
````

### Response 4 (commentary)

- Timestamp: `2026-08-02T22:36:40.315Z`

````text
I’ve confirmed the exact acceptance model from the shared ChatGPT conversation: one canonical result-set state must carry through list, graph, timeline, map, resources and a selected data card, with source/normalized/inferred/synthetic authority kept visible. I’m now wiring the spatial model so source points and derived polygon centroids are not presented as the same kind of evidence.
````

### Response 5 (commentary)

- Timestamp: `2026-08-02T22:53:06.393Z`

````text
Annotation 1: confirmed. The GitHub credentials work when the CLI runs with the repository’s approved external access, so I’m treating GitHub review, PR creation, merge, and Pages publication as available—not as a blocker. I’m continuing the full implementation and will verify the deployed URLs in a real browser before calling it complete.
````

### Response 6 (commentary)

- Timestamp: `2026-08-02T22:53:48.327Z`

````text
The implementation is now past the repository/credentials audit. I’m tightening the corpus builder around three publication identities—faithful, tiny assurance, and synthetic—so no generated URL or count can accidentally cross those boundaries. The first compile exposed one newly introduced URL-construction syntax error; I’m correcting that before generating any fixtures.
````

### Response 7 (commentary)

- Timestamp: `2026-08-02T23:04:50.052Z`

````text
The YAML-LD extension is being implemented as an actual integrity-checked semantic layer, not decorative front matter: stable IRIs map to Explorer routes, predicates are governed, and every graph edge will have both a direct JSON-LD triple and one evidence-bearing reified assertion. I’m now wiring that contract into the large-corpus builder so legacy edges still work while the interface can expose predicate, authority, derivation, evidence, rights, and synthetic scope.
````

### Response 8 (commentary)

- Timestamp: `2026-08-02T23:16:25.502Z`

````text
The first real UI increment is working: heritage records now get a dedicated beginner-readable panel for designation, risk-observation, geography, source-native identity, and YAML-LD assertion fields. Focused search/geospatial/presentation tests pass (19/19), and the Svelte compiler reports zero errors or warnings. The synthetic bundle also builds byte-identically with its own namespace and all three exclusion flags enforced.
````

### Response 9 (commentary)

- Timestamp: `2026-08-02T23:26:47.726Z`

````text
Annotation 1: confirmed—the token is valid when the GitHub CLI runs with the appropriate permissions, and authenticated access is working. I’m continuing unattended; the beginner report is now drafted, while the corpus acquisition, YAML-LD/Explorer work, and publication gates proceed in parallel.
````

### Response 10 (commentary)

- Timestamp: `2026-08-03T04:41:25.569Z`

````text
The authoritative freeze is now complete: 6,556 NHLE records plus 1,109 annual Heritage at Risk observations, with exact boundary evidence and repeatable acquisition. I’m now turning those inputs into the faithful full corpus and the small assurance corpus, then I’ll run the site and browser gates before publishing.
````

### Response 11 (commentary)

- Timestamp: `2026-08-03T04:46:56.063Z`

````text
The complete snapshot reconciles the seven cross-boundary listed buildings correctly by using the canonical point payload plus the official polygon representation only for membership evidence. I’m preserving that distinction in provenance—6,556 unique designations, with no duplicate records or silent geometry substitution.
````

### Response 12 (commentary)

- Timestamp: `2026-08-03T04:51:02.505Z`

````text
The separate assurance fixture is now genuinely source-backed: Coventry Cathedral plus one exact NHLE/HAR pair, three records total, four relationships, and byte-bound receipts back to the full freeze. The synthetic supplement remains a different namespace and is still default-off and excluded from faithful counts/search.
````

### Response 13 (commentary)

- Timestamp: `2026-08-03T04:52:08.326Z`

````text
The assembled site now passes its complete internal audit: 13,873 files, 241 rendered Markdown pages, and 4,533 checked links. I’m moving through the actual 100-query consumer evaluation next; this is the point where unsupported historical/person associations must stay visibly unsupported rather than being made to look complete.
````

### Response 14 (commentary)

- Timestamp: `2026-08-03T04:56:01.153Z`

````text
An independent corpus audit caught two real integrity defects before publication: HAR records pointed at mismatched resource routes, and same-year “addition” rows could be mistaken for a prior annual observation. Both are now fail-closed invariants with regression tests; I’m rebuilding every corpus and rerunning the evaluation from a clean site.
````

### Response 15 (commentary)

- Timestamp: `2026-08-03T05:10:05.622Z`

````text
Search now loads correctly and the browser confirms the intended behavior: source-backed misspellings are corrected and explained, while zero-denominator categories and unsupported person claims return precise empty states instead of broad partial matches. I’m measuring all 100 questions against that exact behavior before freezing the report claims.
````

### Response 16 (commentary)

- Timestamp: `2026-08-03T05:12:22.208Z`

````text
Annotation 1 — confirmed. The GitHub token is valid when checked outside the sandbox, and I’ll use the approved elevated GitHub commands for PR, merge, and Pages work. I’m continuing the unattended implementation now; authentication is no longer a blocker.
````

### Response 17 (commentary)

- Timestamp: `2026-08-03T05:13:17.070Z`

````text
The fresh integrity audit is clean across the full corpus, search index, release roots, and YAML-LD graph. I’m now converting the remaining report placeholders into measured gate results and exercising all 100 representative questions; the first 50 already confirm correct zero-result handling for unsupported designation classes.
````

### Response 18 (commentary)

- Timestamp: `2026-08-03T05:21:27.649Z`

````text
The retrieval model is now stronger without broadening source claims: reviewed familiar names are provenance-bound, annual missing fields are searchable and displayed as explicitly unknown, and only vocabulary from actually emitted YAML-LD edges is projected into Search. I’m regenerating all three isolated products so the index, record chunks, graph, resources, and integrity roots stay byte-aligned.
````

### Response 19 (commentary)

- Timestamp: `2026-08-03T05:25:47.553Z`

````text
The complete 100-query probe now retrieves all evidence-backed familiar names, annual years and fields, graph predicates, YAML-LD identifiers, source geometry, licence terms, and declared typo variants. Unsupported person/period associations remain honest bounded gaps. Next I’m running the release-grade app build and full browser evaluator rather than treating that probe as the final acceptance receipt.
````

### Response 20 (commentary)

- Timestamp: `2026-08-03T05:35:17.459Z`

````text
A real-browser check exposed one useful Explorer defect before release: custom corpus routes such as `asset/1116402` were searchable but the targeted record loader still assumed every record began with `dataset/`. I’m correcting that generic consumer path now; this is exactly the kind of backward-compatible Explorer enhancement the exemplar was intended to reveal.
````

### Response 21 (commentary)

- Timestamp: `2026-08-03T05:42:41.462Z`

````text
Annotation 1: agreed—the GitHub credential is valid outside the sandbox. I’ll use the approved escalated GitHub commands for PR, checks, merge, and Pages publication; I won’t treat authentication as a blocker. I’m finishing the two remaining browser-journey contract fixes, then I’ll run the full evaluation and publication gates unattended.
````

### Response 22 (commentary)

- Timestamp: `2026-08-03T05:43:50.946Z`

````text
The exact rich-page journey now resolves Coventry Cathedral by its NHLE identifier before opening Historic England, so it cannot accidentally select a Heritage-at-Risk row. I also made source inspection deterministic when the same control appears in both the action bar and metadata. I’m exercising those changes against the built Site now.
````

### Response 23 (commentary)

- Timestamp: `2026-08-03T05:51:59.451Z`

````text
The browser audit exposed one genuine UI default issue: when an inferred series made “Dates and related records” visible, the generic “Overview” section also opened. I’ve corrected that so the primary context opens and secondary metadata remains folded. The faithful journey now hydrates NHLE 1076651 first and selects an official HAR→NHLE YAML-LD edge—not a cosmetic facet edge—before continuing to the exact Coventry Cathedral rich page.
````

### Response 24 (commentary)

- Timestamp: `2026-08-03T06:03:01.751Z`

````text
The core tiny and faithful journeys now pass. I’ve added the remaining deterministic controls—sort, folded-section toggle, relationship-drawer resize, explicit-geometry map reduction—and repaired the synthetic journey so it hydrates its own adjacency shard before proving a `model-derived` / `synthetic-fixture` edge. The publication journey now uses a proper multi-page browser context; before deployment it is expected to remain the sole terminal gate.
````

### Response 25 (commentary)

- Timestamp: `2026-08-03T06:07:47.762Z`

````text
The tiny assurance fixture still passes with its added disclosure interaction, and the isolated synthetic journey passes with the explicit model-derived edge. The faithful run has reached the heavier graph/map portion; I’m checking each new control rather than treating mere page load as success.
````

### Response 26 (commentary)

- Timestamp: `2026-08-03T06:16:06.942Z`

````text
A documentation audit found two release-blocking correctness issues, and I’m addressing both: JSON-LD keyword keys such as `@context` must be quoted in YAML 1.2, and “every presentation plane” was overstated because Links and Narrative were not in the executable journey. I’m fixing the YAML source/templates and adding those two views, plus beginner landing pages for the tiny and synthetic fixtures.
````

### Response 27 (commentary)

- Timestamp: `2026-08-03T06:23:59.165Z`

````text
The obsolete failed `evaluation/heritage/results/latest` receipts have been removed so they cannot be mistaken for release evidence. After regeneration, the faithful corpus is 7,665 records with 6,556 NHLE assets, 1,109 annual HAR rows, 9,613 governed relationships, and 22,073 search tokens. The clean Site reading closure is 241 pages and 4,536 internal references; I’m now running all 100 questions against those regenerated bytes.
````

### Response 28 (commentary)

- Timestamp: `2026-08-03T06:29:08.567Z`

````text
The question gate is behaving as intended: all positive-bound questions through HQ056 are returning source-backed records, while the exact zero categories score 88/100 on explicit, settled empty-state evidence rather than accidental words elsewhere on the page. I also corrected the evaluator’s empty-state settle condition so subsequent and CI runs do not incur spurious 30-second waits.
````

### Response 29 (commentary)

- Timestamp: `2026-08-03T06:35:17.594Z`

````text
Annotation 1: confirmed — the GitHub CLI token is valid outside the sandbox. I’ll use the approved out-of-sandbox GitHub commands for PR, CI, Pages, and deployment checks; I won’t treat authentication as a blocker. I’m continuing the unattended implementation and validation now.
````

### Response 30 (commentary)

- Timestamp: `2026-08-03T06:36:13.881Z`

````text
The local corpus is intact and already exposes the OGL metadata at record level. I’m making that evidence visible in the selected-record interface, while the documentation and publication-evidence wording are being tightened in parallel. Then I’ll rerun the 100-question gate and the full browser journeys.
````

### Response 31 (commentary)

- Timestamp: `2026-08-03T06:41:08.594Z`

````text
The coverage/profile audit now matches the clean local Site receipt: 241 rendered reading pages and 4,556 checked references. I’m regenerating the faithful, tiny, and synthetic outputs from their frozen inputs so the controlling fixtures and published artifacts remain byte-synchronized.
````

### Response 32 (commentary)

- Timestamp: `2026-08-03T06:45:23.766Z`

````text
The regenerated candidate is internally synchronized: 7,665 faithful records, separate three-record tiny and synthetic bundles, five independently rooted artifact planes, and eight Explorer presentation views. I’m now moving from build evidence to execution evidence: clean Site assembly, the 100-question suite, and all local browser journeys.
````

### Response 33 (commentary)

- Timestamp: `2026-08-03T06:48:08.476Z`

````text
The question gate is now running against the clean assembled Site, not against producer fixtures. Exact, familiar-name, typo, geography, designation, risk, and explicit zero-result questions are all passing so far; the zero-result cases are being scored only when the interface visibly settles at an expected bounded empty state.
````

### Response 34 (commentary)

- Timestamp: `2026-08-03T06:52:27.966Z`

````text
The 100-question browser gate now passes all 100 questions at or above 80, averaging 92.7/100. The faithful journey exposed two harness false negatives—not product failures: it was reading the resize label from the decorative grip and checking map markers only after the journey had left Map. I corrected those observations to use the keyboard-labelled summary and the marker count captured while Map was active; tiny and faithful now both pass, and the isolated synthetic journey also passes.
````

### Response 35 (commentary)

- Timestamp: `2026-08-03T07:04:13.390Z`

````text
All source, semantic, registry, bundle, legacy-viewer, OKF, and Site publication gates now pass on the synchronized candidate. The Site contains 14,015 files; its bounded reading closure remains 241 pages with 4,567 resolved references. I’m running the cross-browser Foundry publication suite next, followed by the broader Explorer browser suite.
````

### Response 36 (commentary)

- Timestamp: `2026-08-03T07:08:38.648Z`

````text
Annotation 1: confirmed. I’m continuing with GitHub operations outside the sandbox where the valid CLI credentials are available; the implementation is now at the final browser/CI and publication gates.
````

### Response 37 (commentary)

- Timestamp: `2026-08-03T07:09:04.695Z`

````text
The full cross-browser suite found one stale expectation, repeated identically in Chrome, Firefox, and WebKit; the application behavior is correct. I’m aligning that test with the current governed-provenance wording and the actual relationship card that owns the licence fields, then rerunning the gate.
````

### Response 38 (commentary)

- Timestamp: `2026-08-03T07:11:13.556Z`

````text
The corrected relationship test now passes in Chrome, and the clean full rerun has passed all Chrome and Firefox cases so far. WebKit is the remaining third-browser leg.
````

### Response 39 (commentary)

- Timestamp: `2026-08-03T07:12:47.826Z`

````text
All 153 Explorer journeys and all 63 rendered Foundry/document journeys now pass across Chrome, Firefox, and WebKit. I’m doing the final repository and GitHub readiness audit next, with separate checks for accidental artifacts and publication state before I stage anything.
````

### Response 40 (commentary)

- Timestamp: `2026-08-03T07:13:36.159Z`

````text
The hygiene audit caught one real publication defect before staging: a screenshot named `.png` actually contained JPEG/JFIF bytes. I’m re-encoding that same image as a genuine PNG so GitHub Pages serves it with the correct media type; its companion screenshot is already valid.
````

### Response 41 (commentary)

- Timestamp: `2026-08-03T07:14:26.025Z`

````text
A second audit finding is more consequential: the assembled Pages tree is about 989 MB, just under GitHub Pages’ documented 1 GB published-site limit. I’m treating that as a release risk, not a pass by arithmetic alone—adding a deterministic size gate and checking whether existing heavyweight projections can be reduced without weakening this exemplar before publication.
````

### Response 42 (commentary)

- Timestamp: `2026-08-03T07:15:45.776Z`

````text
The audit also found a reproducibility flaw in the earlier site count: ignored `results/latest` evaluator outputs were being discovered and copied into the local Site, although CI would never have them. I’m fixing the builder to exclude those ephemeral result directories by rule, preserving the files in the user’s workspace, then I’ll rebuild and replace every affected metric and receipt with clean-checkout values.
````

### Response 43 (commentary)

- Timestamp: `2026-08-03T07:23:37.335Z`

````text
The reproducible Site now has the clean-checkout figures: 239 rendered reading pages, 4,543 checked internal references, 14,009 publishable files, and 989,266,842 bytes—10,733,158 bytes below the Pages limit. Because that correction changed the candidate’s rooted control metadata, I’m rerunning both the full 100-question browser evaluation and all three local consumer journeys against the new root rather than carrying forward evidence from the prior candidate.
````

### Response 44 (commentary)

- Timestamp: `2026-08-03T07:24:00.986Z`

````text
The evaluator itself is available, but its standalone process did not inherit the application workspace’s Playwright module path. I’ve identified the documented local module path and am rerunning the same gate with that explicit dependency binding; this is an environment correction, not a test or product change.
````

### Response 45 (commentary)

- Timestamp: `2026-08-03T07:25:46.868Z`

````text
The refreshed run is progressing normally through the corrected candidate: all 66 questions completed so far remain above the 80-point assurance threshold, including the intentionally empty-category checks.
````

### Response 46 (commentary)

- Timestamp: `2026-08-03T07:28:21.957Z`

````text
The audit challenged one opaque assurance value correctly: the two-build tree hash needed a code-defined canonical algorithm, not an ad hoc shell convention. I’m moving that digest into the heritage builder itself so every build prints the same reproducible path-and-content tree root, and adding tests that independently bind the receipt to the generated corpus.
````

### Response 47 (commentary)

- Timestamp: `2026-08-03T07:32:59.828Z`

````text
The cross-runtime gzip defect is fixed with a header-level regression test, all three corpora are regenerated, and two independently rebuilt full trees now share the builder-defined canonical root `cc31cd…`. I’m doing the final browser rerun against these exact bytes; this is the last local evidence refresh before staging.
````

### Response 48 (commentary)

- Timestamp: `2026-08-03T07:38:12.818Z`

````text
The final evidence refresh is complete: 100/100 questions score at least 80, and tiny, faithful, and synthetic journeys are again 3/3 passed against the runtime-independent final corpus. The release receipt now binds both the five-plane root and an independently test-verified 2,940-file canonical tree. I’m running the complete pre-commit matrix now, including a final exact Site-size fixed point.
````

### Response 49 (commentary)

- Timestamp: `2026-08-03T07:40:39.141Z`

````text
All local gates now pass on the final tree, including the exact fixed-point Site size and 63 rendered-page tests across three browsers. One audit issue was specifically Python 3.12 versus 3.14 gzip behavior, so I’m adding a real Python 3.12 full-test run before the large commit instead of relying only on the new header regression test.
````

### Response 50 (commentary)

- Timestamp: `2026-08-03T07:42:24.158Z`

````text
The branch is still exactly based on current `origin/main`, and GitHub authentication is valid outside the sandbox as you noted. The candidate contains no per-file GitHub limit violation; I’m staging the audited source, generated corpora, fixtures, tests, and evidence now, with ignored local results and Finder metadata excluded by Git rules.
````

### Response 51 (commentary)

- Timestamp: `2026-08-03T07:43:14.687Z`

````text
The staged review caught four literal trailing-space hard breaks in generated methodology Markdown. They are valid CommonMark but fail the repository’s whitespace gate. I’m replacing them at the generator with paragraph-safe formatting, regenerating the three presentation planes, and rerunning only the affected determinism, Site, and rendered-page gates; the Explorer data/search/semantic bytes used by the 100-question and interaction receipts remain unchanged.
````

### Response 52 (commentary)

- Timestamp: `2026-08-03T07:43:56.975Z`

````text
The independent code review found a substantive data issue before commit: delivered source geometries are WGS84 (`WKID 4326`), but generated record provenance labelled them `EPSG:27700`. I’m correcting this at the source-normalization boundary with explicit snapshot-derived CRS validation, then regenerating and rebinding the corpus; this affects record metadata, so the question and journey receipts will be refreshed once more.
````

### Response 53 (commentary)

- Timestamp: `2026-08-03T07:47:26.724Z`

````text
Annotation 1 — confirmed. The GitHub CLI token is valid outside the sandbox; I’ll use that authenticated context for the remaining repository, PR, and publication work. I’m continuing the unattended implementation, including the CRS correctness fix identified in final review.
````

### Response 54 (commentary)

- Timestamp: `2026-08-03T07:50:02.938Z`

````text
The external authentication check is settled. Strict pre-commit review has now surfaced three source-integrity issues beyond the original CRS label: official-origin enforcement, invented 1 January precision for annual HAR records, and suppressed “unknown” fallbacks in the heritage detail view. I’m correcting all four at the producer and consumer layers before regenerating the corpus.
````

### Response 55 (commentary)

- Timestamp: `2026-08-03T08:05:11.684Z`

````text
The review has now identified a genuine scope defect: 25 annual HAR rows for two Cumbria assets were admitted only because “Warwick Bridge” contained the alias “Warwick.” I’m treating that as a release blocker, removing locality-only authority, and rebuilding the faithful denominator from 1,109 to 1,084. I’m also correcting multipart Esri topology and HAR geography provenance rather than merely relabelling outputs.
````

### Response 56 (commentary)

- Timestamp: `2026-08-03T08:12:26.337Z`

````text
The producer-level fixes now pass the focused 32-test suite. The corrected frozen snapshot contains 6,556 spatially selected NHLE assets and 1,084 defensibly scoped annual HAR rows; the tiny fixture remains three exact source-backed records. I’m regenerating all three corpora now so topology, year precision, semantic deep links, and reversible geography evidence are exercised together.
````

### Response 57 (commentary)

- Timestamp: `2026-08-03T08:17:24.168Z`

````text
Annotation 1 — confirmed: the GitHub CLI token is valid in the authenticated context outside the sandbox. I’m using that context for GitHub operations and continuing the unattended implementation; I’m now tightening the report and rerunning the complete publication gates before the two-phase Pages release.
````

### Response 58 (commentary)

- Timestamp: `2026-08-03T08:18:37.828Z`

````text
The authenticated GitHub path is settled. The strict audit exposed two claims that need correction before release: the true Site-internal reference count is 4,148 (not the broader 4,543 checked-link count), and Heritage at Risk membership must be described as reversible authority-field normalization rather than spatial intersection. I’m binding both into the generated evidence and tests now.
````

### Response 59 (commentary)

- Timestamp: `2026-08-03T08:20:12.480Z`

````text
The corpus contract is now explicit at the source level: 6,556 NHLE records are selected by pinned boundary intersection, while 1,084 annual risk rows are selected only through authoritative local-government fields with the exact workbook cell retained. I’m running the Explorer’s full unit/type/deterministic-build gates against that distinction before regenerating the publication bytes.
````

### Response 60 (commentary)

- Timestamp: `2026-08-03T08:22:12.237Z`

````text
The beginner process and report now explain the YAML-LD extension in practical terms: stable identity, governed predicates, relationship-level evidence, safe deep links, and one graph identity reused across Search, Graph, Links, Map, Resources, Timeline, Type, and the selected-record card. I’m regenerating the full source-backed corpus so those controlling profile and mapping changes are part of the exact release root.
````

### Response 61 (commentary)

- Timestamp: `2026-08-03T08:24:26.314Z`

````text
The regenerated faithful tree is byte-identical across two independent 2,938-file builds at the same timestamp (`563bfece…`). Its five-plane release root is `d41a67d1…`. I’m assembling the exact Site next; the first pass is expected to reject the deliberately stale candidate receipt and report the observed hashes/size needed to bind the final receipt.
````

### Response 62 (commentary)

- Timestamp: `2026-08-03T08:25:19.264Z`

````text
The exact assembled Site reports 239 reading pages, 4,148 internal references, and 987,432,082 bytes—12,567,918 bytes under the Pages limit. The stale receipt correctly failed closed. I’ve started the local server outside the sandbox and am now rerunning all 100 browser-scored questions against these exact bytes.
````

### Response 63 (commentary)

- Timestamp: `2026-08-03T08:26:49.596Z`

````text
The first 47 of 100 browser questions have completed successfully on the corrected corpus; scores are 94 except for three deliberately unsupported designation categories, which score 88 while exposing the gap rather than inventing records. The evaluator is continuing through risk, graph, provenance, search-alias, typo, and publication-readiness questions.
````

### Response 64 (commentary)

- Timestamp: `2026-08-03T08:29:00.706Z`

````text
All 100 questions passed the 80-point threshold (92.7 average), and the tiny, faithful, and synthetic-isolation browser journeys all passed. I’m freezing those exact result JSON files with deterministic gzip, binding their hashes plus the new app/corpus roots into the local candidate receipt, then rebuilding the Site to a size-and-link fixed point.
````

### Response 65 (commentary)

- Timestamp: `2026-08-03T08:31:30.387Z`

````text
The Site has reached a fixed point: 14,007 files, 239 reading pages, 4,148 resolved internal references, and 987,431,772 bytes—12,568,228 bytes below the Pages limit. The receipt now matches those exact observations. I’m doing one final browser smoke on this rebuilt Site, then the complete Python and cross-browser regression suite.
````

### Response 66 (commentary)

- Timestamp: `2026-08-03T08:33:33.273Z`

````text
The full regression run is healthy so far: all 51 Chrome cases passed, including accessibility, geometry precision, large-corpus hydration, graph controls, durable state, and the new deep-link paths. Firefox is now running the same contract, followed by WebKit.
````

### Response 67 (commentary)

- Timestamp: `2026-08-03T08:36:04.984Z`

````text
The repository gates are green on the local Python 3.14 environment (176 tests), and all 153 Explorer plus 63 Foundry tests passed in Chrome, Firefox, and WebKit. I found the bundled Python 3.12 runtime used by CI; I’m giving the corpus and receipt gates one compatibility pass there as well.
````

### Response 68 (commentary)

- Timestamp: `2026-08-03T08:37:15.286Z`

````text
Python 3.12’s full 176-test suite passed. Its stricter corpus check correctly noticed the ignored browser-output working directories; I removed only `evaluation/heritage/results/` after preserving the two deterministic result receipts under `evaluation-foundry/.../evidence/receipts/`. Those working files were generated and recoverable by rerunning the evaluator.
````

### Response 69 (commentary)

- Timestamp: `2026-08-03T08:38:38.331Z`

````text
The full local candidate is now proven, but I’m deliberately not publishing it with discoverable live links in the same step. The first PR will carry the bytes and stable YAML-LD identities while withholding README, registry, and landing-page promotion; after Pages deploys, I’ll verify the exact ten public routes and rich pages, then use a second PR to add the verified links and public receipt.
````

### Response 70 (commentary)

- Timestamp: `2026-08-03T08:42:50.842Z`

````text
The unadvertised PR-1 candidate is now fixed at release root `44b9dcec…`, full-tree digest `0aba2d45…`, 14,007 Site files, 4,134 internal references, and 987,424,364 bytes. Because removing the registry promotion changed the exact Explorer build identity, I’m rerunning the browser evidence once more against this precise candidate before committing it.
````

### Response 71 (commentary)

- Timestamp: `2026-08-03T08:47:21.474Z`

````text
The PR-1 browser receipts now bind the exact unadvertised app (`bdbcbf7c…`) and corpus (`44b9dcec…`), again with a 92.7 question average and all three journeys passing. The Site is fixed at 987,424,363 bytes. I’m running the final dual-Python validation matrix and then an independent repository audit before staging.
````

### Response 72 (commentary)

- Timestamp: `2026-08-03T08:51:39.821Z`

````text
The exact PR-1 candidate has also passed the refreshed 63-case Foundry suite in all three engines. The last local gate now running is the 153-case Explorer suite against the registry-withheld app build; the independent receipt and repository audits are running alongside it.
````

### Response 73 (commentary)

- Timestamp: `2026-08-03T08:59:07.677Z`

````text
The independent audit found and I fixed two subtle integrity gaps: the feature-coverage receipt now uses the descriptor’s exact generation timestamp, and the Site receipt now roots all 14,006 non-receipt published files so a same-size mutation cannot pass. The current Site tree is `c7bc739c…`; I’m rerunning both Python versions and the final Site gate against that stronger contract.
````

### Response 74 (commentary)

- Timestamp: `2026-08-03T09:00:14.278Z`

````text
All substantive gates are now green, including the stronger Site-tree receipt on Python 3.12 and 3.14. I’m refreshing the previously stale Git index now, then the audit agent will inspect the exact cached diff that will become PR 1.
````

### Response 75 (commentary)

- Timestamp: `2026-08-03T09:02:29.969Z`

````text
Annotation 1 is confirmed: the GitHub CLI token is valid in the approved external context. I’m continuing unattended from the clean, fully audited PR1 candidate through CI, deployment verification, and the public-promotion PR.
````

### Response 76 (commentary)

- Timestamp: `2026-08-03T09:02:36.570Z`

````text
The exact staged PR1 candidate is clean and independently audited: 3,868 paths, no unstaged or untracked files, every local gate passing, and the Pages build remains 12.6 MB below its 1 GB limit. I’m committing and publishing this deliberately unadvertised candidate now.
````

### Response 77 (commentary)

- Timestamp: `2026-08-03T09:03:29.485Z`

````text
PR1 is pushed at commit `a9b36fab`. Its public calls-to-action remain intentionally withheld; the next gate is GitHub CI followed by an exact deployed Pages journey, after which I’ll create the small promotion/receipt PR.
````

### Response 78 (commentary)

- Timestamp: `2026-08-03T09:05:54.911Z`

````text
CI has completed the app validation, unit tests, dependency inventory, and deterministic build stages; the required job is still progressing. There are no reviews or unresolved conversations, so I’m arming squash auto-merge rather than leaving the completed gate waiting for intervention.
````

### Response 79 (commentary)

- Timestamp: `2026-08-03T09:06:01.355Z`

````text
The repository does not permit GitHub auto-merge, so no state changed. I’ll perform the squash merge immediately after the required check reports success.
````

### Response 80 (commentary)

- Timestamp: `2026-08-03T09:07:56.872Z`

````text
The required check has reached the 153-test Chromium/Firefox/WebKit stage; all ten preceding stages are green. The promotion changes remain blocked until this candidate is actually deployed and verified.
````

### Response 81 (commentary)

- Timestamp: `2026-08-03T09:12:30.758Z`

````text
CI is still healthy in the cross-browser suite (about six minutes elapsed, no failed stage). This is the longest pre-Python stage; I’m continuing to monitor rather than weakening or skipping it.
````

### Response 82 (commentary)

- Timestamp: `2026-08-03T09:13:50.830Z`

````text
All 153 Explorer journeys now pass on Chromium, Firefox, and WebKit in GitHub CI. The workflow has advanced to regenerating and byte-checking the faithful, tiny, and synthetic heritage corpora.
````

### Response 83 (commentary)

- Timestamp: `2026-08-03T09:15:15.405Z`

````text
PR #67 is fully green and merge-ready: all 32 CI stages passed in 10m55s, with no review or conversation blockers. I’m merging the unadvertised candidate now; Pages deployment and real-browser identity checks come next.
````

### Response 84 (commentary)

- Timestamp: `2026-08-03T09:17:26.397Z`

````text
The unadvertised candidate is merged as `65e22ac`. Its Pages build has passed checkout, dependency installation, and Svelte validation and is now proving the browser app’s deterministic artifact before assembling the 987 MB Site.
````

### Response 85 (commentary)

- Timestamp: `2026-08-03T09:18:39.816Z`

````text
Pages has now revalidated all three heritage corpora, YAML-LD constraints, OKF bundles, and the legislation corpus. It is assembling the final static Site; upload and deployment remain before any public URL can be called verified.
````

### Response 86 (commentary)

- Timestamp: `2026-08-03T09:20:22.789Z`

````text
GitHub reports the exact PR1 deployment successful. I’m now spending the bounded public gate on a real Chromium run: the three functional journeys plus all ten exact publication URLs, including Markdown-to-HTML identities and the official Historic England rich-page opening.
````

### Response 87 (commentary)

- Timestamp: `2026-08-03T09:22:05.786Z`

````text
Public candidate status: **unverified**. The bounded browser gate failed because the deployed Explorer never exposed its search input within 30 seconds on the first tiny-fixture journey; I stopped the remaining checks at the 60-second boundary. I will diagnose only the affected deployment/boot path before rerunning—no release rebuild or promotion is being assumed.
````

### Response 88 (commentary)

- Timestamp: `2026-08-03T09:24:15.793Z`

````text
The deployment itself is healthy: root HTML, app assets, faithful/tiny descriptors, and generated HTML all return 200. The failure is isolated to the evaluation harness: each journey’s leading-slash bundle path discarded GitHub Pages’ `/okf-explorer/` prefix and fetched a confirmed 404. I’m fixing that explicit-override rule in the harness, with a regression test, before rerunning the same deployed candidate.
````

### Response 89 (commentary)

- Timestamp: `2026-08-03T09:27:03.789Z`

````text
The corrected run proves the deployed functionality: faithful, tiny, and synthetic journeys all passed, including typo search, YAML-LD graph/links, deep state, and the Historic England tab. The terminal publication journey is still **unverified** because its URL checker sampled the client-rendered Explorer immediately after `DOMContentLoaded`, before “Coventry and Warwickshire” appeared. I’m adding a bounded identity wait and fail-closed exit status, then rerunning only this affected gate.
````

### Response 90 (commentary)

- Timestamp: `2026-08-03T09:28:22.226Z`

````text
The terminal publication gate now passes 10/10 exact URLs, including the Explorer identity and all Markdown-rendered HTML pages. I’m completing the public receipt with two representative official-page identity checks (NHLE and HAR) and the governed YAML-LD deep-link selection before enabling discovery.
````

### Response 91 (commentary)

- Timestamp: `2026-08-03T09:29:56.052Z`

````text
The NHLE rich page is live and identity-matched (HTTP 200, “Cathedral of St Michael … 1342941”). The representative HAR URL embedded by the source adapter is genuinely stale: Historic England returns its own 404 page. I’m resolving the current official route and will correct only the HAR rich-link template plus its dependent link/receipt planes.
````

### Response 92 (commentary)

- Timestamp: `2026-08-03T09:35:07.875Z`

````text
A second deployed-link defect is confirmed: the YAML-LD risk-record IRIs use `/okf-explorer/index.html?...`, but this Pages deployment serves the app only at `/okf-explorer/`; the former returns a real 404. I’m correcting the canonical IRI template to the verified root URL and will regenerate/redeploy the unadvertised candidate before producing any public receipt.
````

### Response 93 (commentary)

- Timestamp: `2026-08-03T09:39:13.467Z`

````text
The corrected root-form YAML-LD deep link has been proven in the deployed app: it selects “Coventry City Walls” and normalizes the fragment to the governed route. The official HAR search form also returns HTTP 200 and the expected “Church of St Peter … Radway” identity; the corpus will now link to that stable identifier search instead of inventing Historic England’s opaque register-item ID.
````

### Response 94 (commentary)

- Timestamp: `2026-08-03T09:43:11.681Z`

````text
The correction is now scoped: 122 unique numeric HAR identifiers across 1,084 annual observations will use exact official searches; 6,556 NHLE pages stay direct. I’ve also extended the terminal journey to check both representative official identities and the YAML-LD deep link. I’m regenerating only the affected corpus planes, still with public promotion withheld.
````

### Response 95 (commentary)

- Timestamp: `2026-08-03T09:50:27.418Z`

````text
Annotation 1 acknowledged: the GitHub CLI credential is valid in the authenticated environment outside the sandbox. I’ll use that context for GitHub operations and won’t treat the sandbox’s credential visibility as an authentication failure.

I’m continuing the unattended implementation. The candidate is merged and deployed provisionally; I’m now closing two project-root routing defects found by real-browser testing before the promotion release.
````

### Response 96 (commentary)

- Timestamp: `2026-08-03T09:50:51.837Z`

````text
The audit has now isolated three concrete defects: reading-page links used `/index.html`, the evaluator mishandled a slashless Pages root, and the generated 404 shell used account-root assets. The heritage corpora themselves are clean. I’m fixing all three at their source and adding regression tests before rebuilding the Site.
````

### Response 97 (commentary)

- Timestamp: `2026-08-03T09:54:40.773Z`

````text
The routing fixes now have passing focused coverage, and the standalone 404 has passed the full Explorer unit suite (301 tests total) plus two clean deterministic builds. I’m binding that new Explorer build identity into the candidate and rebuilding the publication plane next.
````

### Response 98 (commentary)

- Timestamp: `2026-08-03T09:55:44.632Z`

````text
The rebuilt Site now passes its exact tree/size receipt: 14,007 files, 239 rendered reading pages, 4,134 internal references, and 12.77 MB of Pages headroom. The stale `/index.html` deep links are gone, and the new 404 contains no account-root asset references. I’m rerunning the 100-question and three-journey browser evidence against these exact bytes.
````

### Response 99 (commentary)

- Timestamp: `2026-08-03T09:57:55.196Z`

````text
The exact rebuilt candidate is progressing cleanly through the browser evaluation: the first 66 questions all pass, including familiar names, designation aliases, risk history, periods, people, and one-edit typo cases. No score has fallen below the required threshold.
````

### Response 100 (commentary)

- Timestamp: `2026-08-03T10:01:13.343Z`

````text
The final local evidence is now 100/100 questions at a 92.7 average and 3/3 functional journeys passed, including the tiny fixture and default-off synthetic isolation. I’ve sealed those exact JSON results into deterministic gzip receipts; the remaining local work is the full cross-version validation and three-browser matrix before publication.
````

### Response 101 (commentary)

- Timestamp: `2026-08-03T10:03:35.167Z`

````text
The complete local validation is still green: all three generated corpora reproduce byte-for-byte, 182 Python tests pass on both Python 3.12 and 3.14, and all 301 Explorer unit/contract tests pass. The three-browser end-to-end run has completed Chrome and is now cleanly progressing through Firefox.
````

### Response 102 (commentary)

- Timestamp: `2026-08-03T10:05:56.180Z`

````text
All 153 general browser tests and all 63 Foundry/Markdown tests now pass across Chrome, Firefox, and WebKit. The mandatory pre-publication build is green with the exact receipt-bound Site tree. I’m doing an independent final diff/receipt audit before committing the correction branch.
````

### Response 103 (commentary)

- Timestamp: `2026-08-03T10:07:56.807Z`

````text
A final receipt audit caught an important provenance subtlety before commit: the rerun question evaluator had inherited the manifest’s absolute public bundle, while the three journey start URLs correctly used local candidate bundles. The scores were valid but not bound to the intended local data plane. I’m rerunning the 100 questions with an explicit local bundle and strengthening the receipt test so this cannot recur.
````

### Response 104 (commentary)

- Timestamp: `2026-08-03T10:16:32.413Z`

````text
The independent reviews are finding exactly the kind of edge-case drift this release is meant to prevent. I’m addressing four verified issues before sealing the branch: the HAR prefilter-to-authoritative 1,109→1,084 reconciliation, a complete 15,280 official-link occurrence count, HAR-specific UI wording, and publication receipts that capture the genuinely normalized final URL rather than a pre-hydration value.
````

### Response 105 (commentary)

- Timestamp: `2026-08-03T10:22:51.785Z`

````text
Annotation 1 — confirmed: the GitHub CLI token is valid outside the sandbox, and I’m using that authenticated context for GitHub operations. I’m continuing unattended with the final link-coverage and receipt corrections before opening the correction PR.
````

### Response 106 (commentary)

- Timestamp: `2026-08-03T10:23:31.703Z`

````text
The final-hash race is now fail-closed. I’m expanding the publication journey so every externally authored link in the report—not just representative corpus URLs—gets a terminal browser identity check; bulk generated links remain structurally validated to avoid abusive source-site traffic.
````

### Response 107 (commentary)

- Timestamp: `2026-08-03T10:27:37.504Z`

````text
The independent receipt audit found four substantive edge cases beyond stale evidence: synthetic links were mislabeled as official, two YAML-LD document identities omitted their published `.html` targets, one beginner example used a placeholder URL, and NHLE rich-page validation allowed path suffix tricks. I’m correcting each before regeneration.
````

### Response 108 (commentary)

- Timestamp: `2026-08-03T10:29:24.291Z`

````text
All report-authored external destinations are now represented in the terminal journey, the YAML-LD document IRIs resolve to their actual HTML pages, and the stricter source-link policy is covered by negative tests. I’m regenerating the faithful, tiny, and synthetic products from their frozen snapshots with one shared provenance timestamp.
````

### Response 109 (commentary)

- Timestamp: `2026-08-03T10:32:52.576Z`

````text
The regenerated faithful corpus now roots at `f0a1791c…`; the deterministic Explorer app roots at `0cb83c10…`. The assembled local Site is serving those exact bytes, and I’m rerunning all 100 scored questions plus the three local consumer journeys against that final candidate.
````

### Response 110 (commentary)

- Timestamp: `2026-08-03T10:39:03.404Z`

````text
One infrastructure constraint is now explicit: Historic England serves Cloudflare 403s to default headless automation, while the same pages pass in the genuine browser session. I’m testing a real installed Chrome execution path for the terminal gate; I will preserve the fail-closed identity checks and will not reinterpret a challenge page as success.
````

### Response 111 (commentary)

- Timestamp: `2026-08-03T10:46:30.035Z`

````text
The sealed 100-question run passed all 100 at or above 80, averaging 92.7, and its result now includes the exact served descriptor SHA-256 and generation identity. I’m completing the three isolated local journeys next, then I’ll freeze both receipts deterministically.
````

### Response 112 (commentary)

- Timestamp: `2026-08-03T10:48:24.688Z`

````text
The failed tiny/synthetic run exposed an evidence-option ambiguity, not a product defect: `--bundle` intentionally overrode every journey’s own bundle. I added `--candidate-bundle` so the receipt can bind to the local faithful descriptor while tiny, faithful, and synthetic journeys still load their separate declared bundles.
````

### Response 113 (commentary)

- Timestamp: `2026-08-03T10:50:22.038Z`

````text
The refreshed local evidence is now fully bound and green: 100/100 questions, 3/3 separated journeys, exact descriptor hashes, timestamp ordering, all three corpus roots, app manifest, and the final Site tree. The strengthened receipt test passes with 83 focused tests; I’m now repeating independent corpus checks and then running the full repository gates.
````

### Response 114 (commentary)

- Timestamp: `2026-08-03T10:59:02.224Z`

````text
All application, Python, documentation, registry, legislation, Foundry, and cross-browser suites are green so far (188 Python tests on both Python 3.12 and 3.14; 301 app tests; 153 Explorer E2E; 63 Foundry E2E). The large government-API synchronization check is simply still running; I’m letting its bounded deterministic pass finish before sealing Git status.
````

### Response 115 (commentary)

- Timestamp: `2026-08-03T11:03:23.867Z`

````text
Before publishing, I’m preflighting the complete 27-action terminal journey against the currently deployed unadvertised candidate using installed headed Chrome. This specifically proves that the protected Historic England pages can be identity-checked without treating Cloudflare’s headless challenge as a pass.
````

### Response 116 (commentary)

- Timestamp: `2026-08-03T11:11:06.307Z`

````text
Annotation 1 — confirmed. The GitHub CLI token is valid outside the sandbox, so I’ll use that authenticated external context for GitHub operations. I’m continuing the unattended implementation from the current correction branch, beginning with the remaining browser-receipt and evaluator hardening work.
````

### Response 117 (commentary)

- Timestamp: `2026-08-03T11:11:52.345Z`

````text
I’ve split the remaining implementation so the evaluator and Python validator can be hardened independently. In parallel, I’m producing a small, auditable receipt from the genuine in-app Chrome session for the eleven Historic England pages that reject fresh automated browser contexts.
````

### Response 118 (commentary)

- Timestamp: `2026-08-03T11:14:48.515Z`

````text
The genuine session returned HTTP 200 and matched the intended identity text on all eleven protected pages. Two pages canonicalise their URLs: the HAR search adds its page-size query parameter, and the older “advice” route redirects to the current Heritage at Risk route; both will be pinned explicitly in the journey.
````

### Response 119 (commentary)

- Timestamp: `2026-08-03T11:18:01.790Z`

````text
The receipt is now part of the fixture contract, and the Foundry validator accepts it only under those strict conditions. I’m propagating the revised journey into the faithful, tiny, and synthetic outputs with the same pinned generation time so the data build remains reproducible.
````

### Response 120 (commentary)

- Timestamp: `2026-08-03T11:22:49.930Z`

````text
The faithful corpus has now reproduced byte-for-byte in two fresh 2,938-file builds, while the tiny and synthetic roots remain unchanged. I’m refreshing the three local browser journeys against the newly assembled Site; the publication journey remains separate so it cannot be mistaken for deployed proof.
````

### Response 121 (commentary)

- Timestamp: `2026-08-03T11:24:54.069Z`

````text
The refreshed evaluator is progressing normally: the first twenty of one hundred questions have each scored 94/100. I’m letting the full suite finish and will bind its exact JSON and compressed digests into the candidate receipt.
````

### Response 122 (commentary)

- Timestamp: `2026-08-03T11:29:09.627Z`

````text
The current local candidate is fully bound again: 100/100 questions scored at least 80, all three local journeys passed, the faithful release root and Site tree match their receipts, and the assembled Site passes its 1 GB gate with 12.7 MB headroom. I’m now exercising the 27-action publication journey against the existing unadvertised deployment as a preflight—not as final proof of the correction branch.
````

### Response 123 (commentary)

- Timestamp: `2026-08-03T11:29:50.621Z`

````text
The full local evidence set is now current, including candidate identity in both result files and the protected-page receipt in the Site. I’m running the complete Python and Svelte validation suites next, followed by deterministic corpus/build checks and the three-browser journeys.
````

### Response 124 (commentary)

- Timestamp: `2026-08-03T11:31:13.550Z`

````text
The code and data suites are green: 200 Python tests, 301 Svelte/Node tests, synchronized full/tiny/synthetic corpora, registry, constraints, SBOM, bundle, viewer and OKF conformance. One Site check was invalidated because a later app test intentionally rebuilt without its manifest; I’m completing browser tests first, then I’ll regenerate the deterministic manifest and rerun the Site gate last.
````

### Response 125 (commentary)

- Timestamp: `2026-08-03T11:37:12.885Z`

````text
A consistency sweep found one stale local Site metric: adding the published browser-receipt link increased the audited internal-reference count from 4,134 to 4,135. I’m correcting that claim everywhere it appears, then regenerating the three corpus roots and final receipt once more; record counts and browser scores are unaffected.
````

### Response 126 (commentary)

- Timestamp: `2026-08-03T11:44:44.262Z`

````text
I’m continuing unattended. Annotation 1 is accepted: the GitHub CLI credentials are valid in the external execution context. I’m now closing the remaining publication-binding, receipt, and self-contained-fixture gaps before regenerating and revalidating the release candidate.
````

### Response 127 (commentary)

- Timestamp: `2026-08-03T11:45:28.996Z`

````text
The link receipt is being strengthened from a Boolean assertion into replayable evidence: each protected page will carry the actual DOM excerpt, page title, final URL, timestamp, status, and the receipt digest. This keeps the small exception channel auditable while ordinary Site links remain live-tested.
````

### Response 128 (commentary)

- Timestamp: `2026-08-03T11:49:57.850Z`

````text
The faithful mirror now includes its executable closure (`questions.json` plus the protected-link receipt): 2,940 files for 7,640 real records. Tiny remains 498 files/3 real records, and the isolated synthetic supplement remains 349 files/3 synthetic records. I’m proving repeatability against two fresh output directories next.
````

### Response 129 (commentary)

- Timestamp: `2026-08-03T11:55:39.621Z`

````text
The candidate now assembles as a 987,298,300-byte GitHub Pages artifact with 12,701,700 bytes of headroom, 239 rendered reading pages, 4,135 internal references, and an exact 14,009-file receipt tree. The deterministic Explorer application hash is unchanged, which isolates the new bytes to the intended corpus/evidence closure.
````

### Response 130 (commentary)

- Timestamp: `2026-08-03T11:57:13.639Z`

````text
The exact assembled candidate is now being exercised in two independent real-browser runs: the complete 100-question functionality evaluation and the three local journeys covering the tiny assurance fixture, full faithful corpus, and explicit synthetic isolation. The evaluator also hashes the descriptor bytes before it launches the journeys.
````

### Response 131 (commentary)

- Timestamp: `2026-08-03T12:02:15.492Z`

````text
One extra release-binding safeguard is necessary before I trust the public preflight: the deployed descriptor has intentionally stable bytes, while its executable closure just changed. I’m therefore binding the public check to the deployed `assurance/plane-roots.json` release root as well as the descriptor SHA; this prevents an older deployment with the same descriptor from passing.
````

## Contribution Reading

- User contribution: Corrected a sandbox-specific authentication diagnosis before it became a false blocker.
- Codex contribution: Separated producer/consumer correctness evidence from regional completeness and synthetic illustration.

[EX-0003](0003-implement-and-publish-the-complete-heritage-exemplar.md) | [start-to-finish reader](../readers/conv-001-heritage-evaluation-foundry.md) | [EX-0005](0005-confirm-graph-browsing-cannot-mutate-the-bundle.md)
