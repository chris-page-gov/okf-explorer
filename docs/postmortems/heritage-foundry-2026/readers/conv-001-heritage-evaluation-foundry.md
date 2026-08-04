---
"@context":
  - https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/context.jsonld
  - https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/semantic-context.jsonld
"@id": https://chris-page-gov.github.io/okf-explorer/docs/postmortems/heritage-foundry-2026/readers/conv-001-heritage-evaluation-foundry.html
"@type": https://schema.org/Conversation
type: Conversation
title: "Heritage Evaluation Foundry task reader"
description: "Complete redacted start-to-finish reader for the heritage Evaluation Foundry task."
generated:
  by: process:heritage-foundry-postmortem-builder
  at: "2026-08-04T05:00:00Z"
assertion_status: normalized
assertion_scope: real-world
tags:
  - postmortem
  - conversation-reader
  - heritage-evaluation-foundry
---
# Heritage Evaluation Foundry Task Reader

This reader inlines every visible user prompt and Codex commentary/final response in chronological order. The extraction boundary is described in [Methodology](../methodology.md).

## Exchange Map

| Exchange | Prompt | Responses | Standalone note |
|---|---|---:|---|
| [EX-0001](#ex-0001) | Assess access and define the heritage Evaluation Foundry | 6 | [note](../exchanges/0001-assess-access-and-define-the-heritage-evaluation-foundry.md) |
| [EX-0002](#ex-0002) | Explain the separate tiny assurance fixture | 1 | [note](../exchanges/0002-explain-the-separate-tiny-assurance-fixture.md) |
| [EX-0003](#ex-0003) | Implement and publish the complete heritage exemplar | 5 | [note](../exchanges/0003-implement-and-publish-the-complete-heritage-exemplar.md) |
| [EX-0004](#ex-0004) | Correct the GitHub authentication diagnosis | 131 | [note](../exchanges/0004-correct-the-github-authentication-diagnosis.md) |
| [EX-0005](#ex-0005) | Confirm graph browsing cannot mutate the bundle | 54 | [note](../exchanges/0005-confirm-graph-browsing-cannot-mutate-the-bundle.md) |
| [EX-0006](#ex-0006) | Create the end-to-end engineering postmortem | 16 | [note](../exchanges/0006-create-the-end-to-end-engineering-postmortem.md) |
| [EX-0007](#ex-0007) | Resolve the postmortem architecture questions | 1 | [note](../exchanges/0007-resolve-the-postmortem-architecture-questions.md) |
| [EX-0008](#ex-0008) | Implement every recommended refactoring and publication control | 48 | [note](../exchanges/0008-implement-every-recommended-refactoring-and-publication-control.md) |

## Conversation

### EX-0001

**Prompt:** Assess access and define the heritage Evaluation Foundry

- User timestamp: `2026-08-02T21:46:49.261Z`
- Standalone note: [EX-0001](../exchanges/0001-assess-access-and-define-the-heritage-evaluation-foundry.md)

#### User Prompt

````text
Review repo state, branches/worktrees/PRs and issues, I want to create a derivative of the Foundry documented process (docs/beginners/19-foundry-authoring-and-domain-profiles.md) which suits a functionality evaluation for a set of sources which would fulfil the conversation with ChatGPT here https://chatgpt.com/s/t_6a6fb49b51188191ba36529e6691cd05

I suggest drafting the process, testing that with the recommended National Heritage sample for everything that can be found in Coventry and Warwickshire with each and every feature maximised so that the power of the system is demonstrated and their questions, based on prior knowledge, will be able to be answered. Ensure there is extensive coverage of terms and names in the search index that tolerates alternatives and misspelling.

Do you have access to everything you need?
````

#### Codex Response

##### Response 1 (commentary)

- Timestamp: `2026-08-02T21:46:57.868Z`

````text
I’ll first establish the repository’s exact local/GitHub state, then inspect the referenced Foundry process and the shared ChatGPT conversation. I’m using the GitHub repository workflow skill because branches, worktrees, PRs, and issues are central to deciding whether we can begin cleanly and what existing work must be preserved.
````

##### Response 2 (commentary)

- Timestamp: `2026-08-02T21:47:25.436Z`

````text
The checkout is clean and `main` exactly matches `origin/main`, but there are two active auxiliary worktrees and several historical/local branches. I’m checking their divergence and the live GitHub PR/issue state now, so any proposed derivative can start from the right base without colliding with unfinished work.
````

##### Response 3 (commentary)

- Timestamp: `2026-08-02T21:48:01.293Z`

````text
GitHub is clear: there are no open PRs, six open roadmap issues, and all local feature branches—including both checked-out auxiliary worktrees—are already merged into `main`. The only access question so far is the ChatGPT share link: the generic fetch path cannot retrieve it, so I’m using the Chrome session workflow to determine whether the conversation is available through your authenticated browser context.
````

##### Response 4 (commentary)

- Timestamp: `2026-08-02T21:49:58.296Z`

````text
I can read the full shared conversation through the authenticated browser session. Its target is unambiguous: a separate “Evaluation Foundry,” proved on protected heritage across Coventry and Warwickshire, with faithful data plus clearly labelled synthetic supplementation only where needed. I’m now verifying that the authoritative heritage sources expose enough text, geography, relationships, dates, risk history, and reuse rights to satisfy that target—not just that the pages exist.
````

##### Response 5 (commentary)

- Timestamp: `2026-08-02T21:52:47.271Z`

````text
The source check has exposed one important design constraint. Historic England’s public FeatureServer is excellent for identifiers, names, grades, designation/amendment dates, links, and geometry, while individual List pages add the rich OGL text, authorities, parishes, reasons, sources, and legal context. They are not one equivalent bulk feed. I’m using the UK geospatial semantic-layer workflow to pin the exact Coventry-plus-Warwickshire administrative scope and avoid treating a place-name search as a completeness denominator.
````

##### Response 6 (final_answer)

- Timestamp: `2026-08-02T21:58:32.721Z`

````text
Yes—there is enough access to draft the process and begin a working evaluation. I cannot yet promise the fully enriched, all-record regional result until two source/implementation gates are closed.

### Repository state

- `main` is clean at `f5d38674` and exactly matches `origin/main`.
- No open pull requests.
- Six open roadmap issues: [#49 vocabulary](https://github.com/chris-page-gov/okf-explorer/issues/49), [#50 validation](https://github.com/chris-page-gov/okf-explorer/issues/50), [#51 inference](https://github.com/chris-page-gov/okf-explorer/issues/51), [#52 ontology navigation](https://github.com/chris-page-gov/okf-explorer/issues/52), [#53 dark theme](https://github.com/chris-page-gov/okf-explorer/issues/53), and [#54 standards exporters/provenance](https://github.com/chris-page-gov/okf-explorer/issues/54).
- All eight local feature branches are already merged into `main`.
- All three auxiliary worktrees are clean; two are merged historical branches and one is the detached `v0.5.7` release checkout.
- One unmerged remote Dependabot branch remains, dated 16 July 2026, with no open PR.
- No existing PR or issue overlaps “Evaluation Foundry” or the heritage exemplar.

A fresh `codex/evaluation-foundry-heritage` branch from `main` would therefore be safe.

### Access confirmed

- I can read the complete shared ChatGPT conversation, including its proposed Evaluation Foundry, feature matrix, artefacts, and heritage exemplar.
- The current [Foundry guide]([LOCAL_REPO]/docs/beginners/19-foundry-authoring-and-domain-profiles.md:1), schemas, prompts, validators, real-consumer acceptance runner, and browser evaluation harness are available.
- Historic England provides a public NHLE FeatureServer with stable identifiers, names, grades, dates, links, points and polygons. Its Open Data Hub supplies multiple formats/APIs under OGL with required attribution. [Historic England downloads](https://historicengland.org.uk/listing/the-list/data-downloads), [licensing terms](https://historicengland.org.uk/terms/website-terms-conditions/open-data-hub/).
- Individual List pages provide the richer official text, locations, legal context, reasons, sources and legacy identifiers; their text is explicitly OGL except where stated, while maps have separate restrictions. [Example: Coventry Cathedral](https://historicengland.org.uk/listing/the-list/list-entry/1342941).
- Annual Heritage at Risk data is available through supported datasets and spreadsheets. Historic England explicitly says to keep yearly layers separate and not scrape the HAR website. [HAR publications](https://historicengland.org.uk/listing/heritage-at-risk/publications/).
- The exact geographic scope is resolvable through live authoritative boundaries: Coventry `E08000026` plus Warwickshire `E10000031`.

### Two gates to close

1. **Rich bulk acquisition.** The open FeatureServer’s fields are much narrower than the individual List records and search taxonomy. We need to establish a supported bulk route for narratives, historic periods, associated people, parish/authority fields and alternative names. HAR must come from its datasets/spreadsheets, never website scraping.

2. **True misspelling tolerance.** The current small-bundle search is substring-based, while large-corpus search supports normalization, exact tokens, prefixes and declared aliases. It does not implement general edit-distance or typo correction. See [small search]([LOCAL_REPO]/apps/okf-explorer/src/routes/+page.svelte:482) and [large search worker]([LOCAL_REPO]/apps/okf-explorer/src/workers/largeSearch.worker.ts:153). Maximising this exemplar therefore requires an explainable spelling/variant index and correction tests, not merely more keywords.

The full geographic corpus is also much larger than the earlier 150–300-record suggestion. A bounding-box sizing probe found over 14,000 listed-building candidates before exact boundary clipping, plus monuments, parks/gardens and battlefields. This should be designed as a large-corpus exemplar with a separate tiny assurance fixture.

So: no additional account, plugin, credential, or document is needed from you now. I can proceed with the derivative process and initial source proof, while treating rich bulk acquisition and typo-tolerant retrieval as explicit gates rather than quietly overstating coverage.
````

[Back to exchange map](#exchange-map)

### EX-0002

**Prompt:** Explain the separate tiny assurance fixture

- User timestamp: `2026-08-02T22:02:21.764Z`
- Standalone note: [EX-0002](../exchanges/0002-explain-the-separate-tiny-assurance-fixture.md)

#### User Prompt

````text
Explain with a separate tiny assurance fixture
````

#### Codex Response

##### Response 1 (final_answer)

- Timestamp: `2026-08-02T22:02:48.693Z`

````text
A separate tiny assurance fixture is a deliberately small, controlled heritage bundle used to prove that the builder and Explorer work correctly before processing the complete Coventry and Warwickshire corpus.

It is separate because the full corpus is large, changes over time, and cannot safely contain deliberately malformed test data.

For example, the fixture might contain 15–30 representative records covering:

- a listed-building point and polygon;
- a scheduled monument;
- a registered park or garden;
- a battlefield;
- multiple grades and local authorities;
- designation and amendment dates;
- several years of Heritage at Risk observations;
- explicit asset–place, asset–person and asset–complex relationships;
- official names, historical names, aliases and controlled misspellings;
- complete and deliberately missing optional metadata.

From this valid base, the tests create isolated negative variants:

- duplicate or missing identifiers;
- invalid geometry or coordinate order;
- unresolved relationship targets;
- ambiguous dates;
- unavailable source links;
- stale observations;
- rights restrictions;
- malformed paths;
- altered search shards;
- digest mismatches.

The two-stage assurance is:

1. **Producer assurance:** build the fixture twice and require byte-identical output, valid schemas, expected search/facet contents and matching plane digests.
2. **Consumer assurance:** load those exact bytes through the real locked Explorer. Verify successful journeys for the valid fixture and explicit degradation or fail-closed behaviour for every negative variant.

The complete regional corpus then serves a different purpose:

| Artifact | What it proves |
|---|---|
| Tiny assurance fixture | Correctness, determinism and known failure behaviour |
| Full Coventry–Warwickshire corpus | Completeness, scale, usefulness and real-world feature coverage |
| Optional synthetic supplement | How unsupported features would look, clearly excluded from claims about the source |

Thus, passing the tiny fixture does not prove that the regional data is complete or semantically correct. It proves that when the full harvest is built, any failures are much more likely to be source or mapping problems—not an unknown defect in the pipeline or Explorer.
````

[Back to exchange map](#exchange-map)

### EX-0003

**Prompt:** Implement and publish the complete heritage exemplar

- User timestamp: `2026-08-02T22:14:14.264Z`
- Standalone note: [EX-0003](../exchanges/0003-implement-and-publish-the-complete-heritage-exemplar.md)

#### User Prompt

````text
Great, can you now set a goal to complete the full implementation of everything in Coventry and Warwickshire with as much detail as possible and then adding the synthetic supplement.

I would like the exemplar to be an exemplar illustration of the possibilities opened up by extending the YAML front matter to YAML-LD - enhancing the Graph and linking in other areas of the interface. This should include a section in the report (suitable for a beginner) that focusses on what this suggested extension of the OKF specification provides in addition.
Also, all links, including to the 'rich' pages mentioned, should be validated as well as the publication as a Site in GitHub with links going to HTML pages and all Markdown can be correctly rendered within the interface.

I accept that this work may require OKF Explorer to be enhanced as well and you have permission to update that too.

I am now asking you to run unattended from now
````

#### Codex Response

##### Response 1 (commentary)

- Timestamp: `2026-08-02T22:14:34.515Z`

````text
I’m setting this as an unattended completion goal, with the full regional corpus, YAML-LD exemplar, Explorer enhancements, synthetic supplement, beginner report, link validation, and verified GitHub Pages publication all inside the acceptance boundary. I’ll use the GitHub workflow for repository/publication state, the UK geospatial workflow for the exact two-area denominator, and real-browser testing for every public route and restored journey.
````

##### Response 2 (commentary)

- Timestamp: `2026-08-02T22:16:11.588Z`

````text
One publication prerequisite needs attention later: the local GitHub CLI is installed but its saved token is invalid. The connected GitHub app still has repository admin access, so I’m continuing the complete local implementation and validation unattended; I’ll return to the push/Pages gate once the artifact is ready, without weakening any publication check.
````

##### Response 3 (commentary)

- Timestamp: `2026-08-02T22:16:36.277Z`

````text
I’m splitting three bounded workstreams while I build the Evaluation Foundry structure: one for source completeness and supported Historic England acquisition, one for the YAML-LD semantic extension contract, and one for backward-compatible typo-tolerant search. They are isolated so the large-corpus builder and documentation can advance without waiting on each investigation.
````

##### Response 4 (commentary)

- Timestamp: `2026-08-02T22:18:36.153Z`

````text
I’m continuing the implementation on the isolated branch. The first pass is locking the corpus/source contract and YAML-LD compatibility boundary while the independent search and heritage-source audits proceed; I’ll keep the synthetic material physically and semantically separate from the authoritative corpus.
````

##### Response 5 (commentary)

- Timestamp: `2026-08-02T22:23:27.006Z`

````text
Historic England’s normal HTTP and clean-browser paths are currently stopped by its Cloudflare challenge, while the official ArcGIS API remains fully reachable. I’m treating rich-page text as a separately evidenced enhancement plane—never as a silent completeness claim—and probing the site’s sanctioned download/API surfaces before fixing that contract.
````

[Back to exchange map](#exchange-map)

### EX-0004

**Prompt:** Correct the GitHub authentication diagnosis

- User timestamp: `2026-08-02T22:24:30.160Z`
- Standalone note: [EX-0004](../exchanges/0004-correct-the-github-authentication-diagnosis.md)

#### User Prompt

````text
# Response annotations:
Each item contains text selected from an earlier Codex response and may include a user comment. Treat items as Annotation 1, Annotation 2, and so on in array order. Use every selection as context and address every comment. When addressing multiple comments, label each answer with its annotation number (for example, `Annotation 1`) so the user can match it to the numbered annotation.
<response-annotations>
[{"text":"the local GitHub CLI is installed but its saved token is invalid."}]
</response-annotations>

## My request for Codex:
This is valid outside your sandbox -
````

#### Codex Response

##### Response 1 (commentary)

- Timestamp: `2026-08-02T22:24:35.303Z`

````text
Understood: the invalid-token result was sandbox-specific, not a repository/account problem. I’ll use the CLI outside the sandbox at the publication gate and verify it now so this does not remain a false blocker.
````

##### Response 2 (commentary)

- Timestamp: `2026-08-02T22:28:27.059Z`

````text
Annotation 1: confirmed. I reran the GitHub authentication check outside the sandbox; the `chris-page-gov` credential is valid with repository and workflow access. I’m continuing unattended with publication/authentication treated as available.
````

##### Response 3 (commentary)

- Timestamp: `2026-08-02T22:31:31.615Z`

````text
The official spatial feeds support a complete, exact-boundary corpus. I’m also testing Historic England’s own browser-only export path as an optional enrichment plane; it will not be allowed to weaken the complete authoritative denominator or blur licensing constraints.
````

##### Response 4 (commentary)

- Timestamp: `2026-08-02T22:36:40.315Z`

````text
I’ve confirmed the exact acceptance model from the shared ChatGPT conversation: one canonical result-set state must carry through list, graph, timeline, map, resources and a selected data card, with source/normalized/inferred/synthetic authority kept visible. I’m now wiring the spatial model so source points and derived polygon centroids are not presented as the same kind of evidence.
````

##### Response 5 (commentary)

- Timestamp: `2026-08-02T22:53:06.393Z`

````text
Annotation 1: confirmed. The GitHub credentials work when the CLI runs with the repository’s approved external access, so I’m treating GitHub review, PR creation, merge, and Pages publication as available—not as a blocker. I’m continuing the full implementation and will verify the deployed URLs in a real browser before calling it complete.
````

##### Response 6 (commentary)

- Timestamp: `2026-08-02T22:53:48.327Z`

````text
The implementation is now past the repository/credentials audit. I’m tightening the corpus builder around three publication identities—faithful, tiny assurance, and synthetic—so no generated URL or count can accidentally cross those boundaries. The first compile exposed one newly introduced URL-construction syntax error; I’m correcting that before generating any fixtures.
````

##### Response 7 (commentary)

- Timestamp: `2026-08-02T23:04:50.052Z`

````text
The YAML-LD extension is being implemented as an actual integrity-checked semantic layer, not decorative front matter: stable IRIs map to Explorer routes, predicates are governed, and every graph edge will have both a direct JSON-LD triple and one evidence-bearing reified assertion. I’m now wiring that contract into the large-corpus builder so legacy edges still work while the interface can expose predicate, authority, derivation, evidence, rights, and synthetic scope.
````

##### Response 8 (commentary)

- Timestamp: `2026-08-02T23:16:25.502Z`

````text
The first real UI increment is working: heritage records now get a dedicated beginner-readable panel for designation, risk-observation, geography, source-native identity, and YAML-LD assertion fields. Focused search/geospatial/presentation tests pass (19/19), and the Svelte compiler reports zero errors or warnings. The synthetic bundle also builds byte-identically with its own namespace and all three exclusion flags enforced.
````

##### Response 9 (commentary)

- Timestamp: `2026-08-02T23:26:47.726Z`

````text
Annotation 1: confirmed—the token is valid when the GitHub CLI runs with the appropriate permissions, and authenticated access is working. I’m continuing unattended; the beginner report is now drafted, while the corpus acquisition, YAML-LD/Explorer work, and publication gates proceed in parallel.
````

##### Response 10 (commentary)

- Timestamp: `2026-08-03T04:41:25.569Z`

````text
The authoritative freeze is now complete: 6,556 NHLE records plus 1,109 annual Heritage at Risk observations, with exact boundary evidence and repeatable acquisition. I’m now turning those inputs into the faithful full corpus and the small assurance corpus, then I’ll run the site and browser gates before publishing.
````

##### Response 11 (commentary)

- Timestamp: `2026-08-03T04:46:56.063Z`

````text
The complete snapshot reconciles the seven cross-boundary listed buildings correctly by using the canonical point payload plus the official polygon representation only for membership evidence. I’m preserving that distinction in provenance—6,556 unique designations, with no duplicate records or silent geometry substitution.
````

##### Response 12 (commentary)

- Timestamp: `2026-08-03T04:51:02.505Z`

````text
The separate assurance fixture is now genuinely source-backed: Coventry Cathedral plus one exact NHLE/HAR pair, three records total, four relationships, and byte-bound receipts back to the full freeze. The synthetic supplement remains a different namespace and is still default-off and excluded from faithful counts/search.
````

##### Response 13 (commentary)

- Timestamp: `2026-08-03T04:52:08.326Z`

````text
The assembled site now passes its complete internal audit: 13,873 files, 241 rendered Markdown pages, and 4,533 checked links. I’m moving through the actual 100-query consumer evaluation next; this is the point where unsupported historical/person associations must stay visibly unsupported rather than being made to look complete.
````

##### Response 14 (commentary)

- Timestamp: `2026-08-03T04:56:01.153Z`

````text
An independent corpus audit caught two real integrity defects before publication: HAR records pointed at mismatched resource routes, and same-year “addition” rows could be mistaken for a prior annual observation. Both are now fail-closed invariants with regression tests; I’m rebuilding every corpus and rerunning the evaluation from a clean site.
````

##### Response 15 (commentary)

- Timestamp: `2026-08-03T05:10:05.622Z`

````text
Search now loads correctly and the browser confirms the intended behavior: source-backed misspellings are corrected and explained, while zero-denominator categories and unsupported person claims return precise empty states instead of broad partial matches. I’m measuring all 100 questions against that exact behavior before freezing the report claims.
````

##### Response 16 (commentary)

- Timestamp: `2026-08-03T05:12:22.208Z`

````text
Annotation 1 — confirmed. The GitHub token is valid when checked outside the sandbox, and I’ll use the approved elevated GitHub commands for PR, merge, and Pages work. I’m continuing the unattended implementation now; authentication is no longer a blocker.
````

##### Response 17 (commentary)

- Timestamp: `2026-08-03T05:13:17.070Z`

````text
The fresh integrity audit is clean across the full corpus, search index, release roots, and YAML-LD graph. I’m now converting the remaining report placeholders into measured gate results and exercising all 100 representative questions; the first 50 already confirm correct zero-result handling for unsupported designation classes.
````

##### Response 18 (commentary)

- Timestamp: `2026-08-03T05:21:27.649Z`

````text
The retrieval model is now stronger without broadening source claims: reviewed familiar names are provenance-bound, annual missing fields are searchable and displayed as explicitly unknown, and only vocabulary from actually emitted YAML-LD edges is projected into Search. I’m regenerating all three isolated products so the index, record chunks, graph, resources, and integrity roots stay byte-aligned.
````

##### Response 19 (commentary)

- Timestamp: `2026-08-03T05:25:47.553Z`

````text
The complete 100-query probe now retrieves all evidence-backed familiar names, annual years and fields, graph predicates, YAML-LD identifiers, source geometry, licence terms, and declared typo variants. Unsupported person/period associations remain honest bounded gaps. Next I’m running the release-grade app build and full browser evaluator rather than treating that probe as the final acceptance receipt.
````

##### Response 20 (commentary)

- Timestamp: `2026-08-03T05:35:17.459Z`

````text
A real-browser check exposed one useful Explorer defect before release: custom corpus routes such as `asset/1116402` were searchable but the targeted record loader still assumed every record began with `dataset/`. I’m correcting that generic consumer path now; this is exactly the kind of backward-compatible Explorer enhancement the exemplar was intended to reveal.
````

##### Response 21 (commentary)

- Timestamp: `2026-08-03T05:42:41.462Z`

````text
Annotation 1: agreed—the GitHub credential is valid outside the sandbox. I’ll use the approved escalated GitHub commands for PR, checks, merge, and Pages publication; I won’t treat authentication as a blocker. I’m finishing the two remaining browser-journey contract fixes, then I’ll run the full evaluation and publication gates unattended.
````

##### Response 22 (commentary)

- Timestamp: `2026-08-03T05:43:50.946Z`

````text
The exact rich-page journey now resolves Coventry Cathedral by its NHLE identifier before opening Historic England, so it cannot accidentally select a Heritage-at-Risk row. I also made source inspection deterministic when the same control appears in both the action bar and metadata. I’m exercising those changes against the built Site now.
````

##### Response 23 (commentary)

- Timestamp: `2026-08-03T05:51:59.451Z`

````text
The browser audit exposed one genuine UI default issue: when an inferred series made “Dates and related records” visible, the generic “Overview” section also opened. I’ve corrected that so the primary context opens and secondary metadata remains folded. The faithful journey now hydrates NHLE 1076651 first and selects an official HAR→NHLE YAML-LD edge—not a cosmetic facet edge—before continuing to the exact Coventry Cathedral rich page.
````

##### Response 24 (commentary)

- Timestamp: `2026-08-03T06:03:01.751Z`

````text
The core tiny and faithful journeys now pass. I’ve added the remaining deterministic controls—sort, folded-section toggle, relationship-drawer resize, explicit-geometry map reduction—and repaired the synthetic journey so it hydrates its own adjacency shard before proving a `model-derived` / `synthetic-fixture` edge. The publication journey now uses a proper multi-page browser context; before deployment it is expected to remain the sole terminal gate.
````

##### Response 25 (commentary)

- Timestamp: `2026-08-03T06:07:47.762Z`

````text
The tiny assurance fixture still passes with its added disclosure interaction, and the isolated synthetic journey passes with the explicit model-derived edge. The faithful run has reached the heavier graph/map portion; I’m checking each new control rather than treating mere page load as success.
````

##### Response 26 (commentary)

- Timestamp: `2026-08-03T06:16:06.942Z`

````text
A documentation audit found two release-blocking correctness issues, and I’m addressing both: JSON-LD keyword keys such as `@context` must be quoted in YAML 1.2, and “every presentation plane” was overstated because Links and Narrative were not in the executable journey. I’m fixing the YAML source/templates and adding those two views, plus beginner landing pages for the tiny and synthetic fixtures.
````

##### Response 27 (commentary)

- Timestamp: `2026-08-03T06:23:59.165Z`

````text
The obsolete failed `evaluation/heritage/results/latest` receipts have been removed so they cannot be mistaken for release evidence. After regeneration, the faithful corpus is 7,665 records with 6,556 NHLE assets, 1,109 annual HAR rows, 9,613 governed relationships, and 22,073 search tokens. The clean Site reading closure is 241 pages and 4,536 internal references; I’m now running all 100 questions against those regenerated bytes.
````

##### Response 28 (commentary)

- Timestamp: `2026-08-03T06:29:08.567Z`

````text
The question gate is behaving as intended: all positive-bound questions through HQ056 are returning source-backed records, while the exact zero categories score 88/100 on explicit, settled empty-state evidence rather than accidental words elsewhere on the page. I also corrected the evaluator’s empty-state settle condition so subsequent and CI runs do not incur spurious 30-second waits.
````

##### Response 29 (commentary)

- Timestamp: `2026-08-03T06:35:17.594Z`

````text
Annotation 1: confirmed — the GitHub CLI token is valid outside the sandbox. I’ll use the approved out-of-sandbox GitHub commands for PR, CI, Pages, and deployment checks; I won’t treat authentication as a blocker. I’m continuing the unattended implementation and validation now.
````

##### Response 30 (commentary)

- Timestamp: `2026-08-03T06:36:13.881Z`

````text
The local corpus is intact and already exposes the OGL metadata at record level. I’m making that evidence visible in the selected-record interface, while the documentation and publication-evidence wording are being tightened in parallel. Then I’ll rerun the 100-question gate and the full browser journeys.
````

##### Response 31 (commentary)

- Timestamp: `2026-08-03T06:41:08.594Z`

````text
The coverage/profile audit now matches the clean local Site receipt: 241 rendered reading pages and 4,556 checked references. I’m regenerating the faithful, tiny, and synthetic outputs from their frozen inputs so the controlling fixtures and published artifacts remain byte-synchronized.
````

##### Response 32 (commentary)

- Timestamp: `2026-08-03T06:45:23.766Z`

````text
The regenerated candidate is internally synchronized: 7,665 faithful records, separate three-record tiny and synthetic bundles, five independently rooted artifact planes, and eight Explorer presentation views. I’m now moving from build evidence to execution evidence: clean Site assembly, the 100-question suite, and all local browser journeys.
````

##### Response 33 (commentary)

- Timestamp: `2026-08-03T06:48:08.476Z`

````text
The question gate is now running against the clean assembled Site, not against producer fixtures. Exact, familiar-name, typo, geography, designation, risk, and explicit zero-result questions are all passing so far; the zero-result cases are being scored only when the interface visibly settles at an expected bounded empty state.
````

##### Response 34 (commentary)

- Timestamp: `2026-08-03T06:52:27.966Z`

````text
The 100-question browser gate now passes all 100 questions at or above 80, averaging 92.7/100. The faithful journey exposed two harness false negatives—not product failures: it was reading the resize label from the decorative grip and checking map markers only after the journey had left Map. I corrected those observations to use the keyboard-labelled summary and the marker count captured while Map was active; tiny and faithful now both pass, and the isolated synthetic journey also passes.
````

##### Response 35 (commentary)

- Timestamp: `2026-08-03T07:04:13.390Z`

````text
All source, semantic, registry, bundle, legacy-viewer, OKF, and Site publication gates now pass on the synchronized candidate. The Site contains 14,015 files; its bounded reading closure remains 241 pages with 4,567 resolved references. I’m running the cross-browser Foundry publication suite next, followed by the broader Explorer browser suite.
````

##### Response 36 (commentary)

- Timestamp: `2026-08-03T07:08:38.648Z`

````text
Annotation 1: confirmed. I’m continuing with GitHub operations outside the sandbox where the valid CLI credentials are available; the implementation is now at the final browser/CI and publication gates.
````

##### Response 37 (commentary)

- Timestamp: `2026-08-03T07:09:04.695Z`

````text
The full cross-browser suite found one stale expectation, repeated identically in Chrome, Firefox, and WebKit; the application behavior is correct. I’m aligning that test with the current governed-provenance wording and the actual relationship card that owns the licence fields, then rerunning the gate.
````

##### Response 38 (commentary)

- Timestamp: `2026-08-03T07:11:13.556Z`

````text
The corrected relationship test now passes in Chrome, and the clean full rerun has passed all Chrome and Firefox cases so far. WebKit is the remaining third-browser leg.
````

##### Response 39 (commentary)

- Timestamp: `2026-08-03T07:12:47.826Z`

````text
All 153 Explorer journeys and all 63 rendered Foundry/document journeys now pass across Chrome, Firefox, and WebKit. I’m doing the final repository and GitHub readiness audit next, with separate checks for accidental artifacts and publication state before I stage anything.
````

##### Response 40 (commentary)

- Timestamp: `2026-08-03T07:13:36.159Z`

````text
The hygiene audit caught one real publication defect before staging: a screenshot named `.png` actually contained JPEG/JFIF bytes. I’m re-encoding that same image as a genuine PNG so GitHub Pages serves it with the correct media type; its companion screenshot is already valid.
````

##### Response 41 (commentary)

- Timestamp: `2026-08-03T07:14:26.025Z`

````text
A second audit finding is more consequential: the assembled Pages tree is about 989 MB, just under GitHub Pages’ documented 1 GB published-site limit. I’m treating that as a release risk, not a pass by arithmetic alone—adding a deterministic size gate and checking whether existing heavyweight projections can be reduced without weakening this exemplar before publication.
````

##### Response 42 (commentary)

- Timestamp: `2026-08-03T07:15:45.776Z`

````text
The audit also found a reproducibility flaw in the earlier site count: ignored `results/latest` evaluator outputs were being discovered and copied into the local Site, although CI would never have them. I’m fixing the builder to exclude those ephemeral result directories by rule, preserving the files in the user’s workspace, then I’ll rebuild and replace every affected metric and receipt with clean-checkout values.
````

##### Response 43 (commentary)

- Timestamp: `2026-08-03T07:23:37.335Z`

````text
The reproducible Site now has the clean-checkout figures: 239 rendered reading pages, 4,543 checked internal references, 14,009 publishable files, and 989,266,842 bytes—10,733,158 bytes below the Pages limit. Because that correction changed the candidate’s rooted control metadata, I’m rerunning both the full 100-question browser evaluation and all three local consumer journeys against the new root rather than carrying forward evidence from the prior candidate.
````

##### Response 44 (commentary)

- Timestamp: `2026-08-03T07:24:00.986Z`

````text
The evaluator itself is available, but its standalone process did not inherit the application workspace’s Playwright module path. I’ve identified the documented local module path and am rerunning the same gate with that explicit dependency binding; this is an environment correction, not a test or product change.
````

##### Response 45 (commentary)

- Timestamp: `2026-08-03T07:25:46.868Z`

````text
The refreshed run is progressing normally through the corrected candidate: all 66 questions completed so far remain above the 80-point assurance threshold, including the intentionally empty-category checks.
````

##### Response 46 (commentary)

- Timestamp: `2026-08-03T07:28:21.957Z`

````text
The audit challenged one opaque assurance value correctly: the two-build tree hash needed a code-defined canonical algorithm, not an ad hoc shell convention. I’m moving that digest into the heritage builder itself so every build prints the same reproducible path-and-content tree root, and adding tests that independently bind the receipt to the generated corpus.
````

##### Response 47 (commentary)

- Timestamp: `2026-08-03T07:32:59.828Z`

````text
The cross-runtime gzip defect is fixed with a header-level regression test, all three corpora are regenerated, and two independently rebuilt full trees now share the builder-defined canonical root `cc31cd…`. I’m doing the final browser rerun against these exact bytes; this is the last local evidence refresh before staging.
````

##### Response 48 (commentary)

- Timestamp: `2026-08-03T07:38:12.818Z`

````text
The final evidence refresh is complete: 100/100 questions score at least 80, and tiny, faithful, and synthetic journeys are again 3/3 passed against the runtime-independent final corpus. The release receipt now binds both the five-plane root and an independently test-verified 2,940-file canonical tree. I’m running the complete pre-commit matrix now, including a final exact Site-size fixed point.
````

##### Response 49 (commentary)

- Timestamp: `2026-08-03T07:40:39.141Z`

````text
All local gates now pass on the final tree, including the exact fixed-point Site size and 63 rendered-page tests across three browsers. One audit issue was specifically Python 3.12 versus 3.14 gzip behavior, so I’m adding a real Python 3.12 full-test run before the large commit instead of relying only on the new header regression test.
````

##### Response 50 (commentary)

- Timestamp: `2026-08-03T07:42:24.158Z`

````text
The branch is still exactly based on current `origin/main`, and GitHub authentication is valid outside the sandbox as you noted. The candidate contains no per-file GitHub limit violation; I’m staging the audited source, generated corpora, fixtures, tests, and evidence now, with ignored local results and Finder metadata excluded by Git rules.
````

##### Response 51 (commentary)

- Timestamp: `2026-08-03T07:43:14.687Z`

````text
The staged review caught four literal trailing-space hard breaks in generated methodology Markdown. They are valid CommonMark but fail the repository’s whitespace gate. I’m replacing them at the generator with paragraph-safe formatting, regenerating the three presentation planes, and rerunning only the affected determinism, Site, and rendered-page gates; the Explorer data/search/semantic bytes used by the 100-question and interaction receipts remain unchanged.
````

##### Response 52 (commentary)

- Timestamp: `2026-08-03T07:43:56.975Z`

````text
The independent code review found a substantive data issue before commit: delivered source geometries are WGS84 (`WKID 4326`), but generated record provenance labelled them `EPSG:27700`. I’m correcting this at the source-normalization boundary with explicit snapshot-derived CRS validation, then regenerating and rebinding the corpus; this affects record metadata, so the question and journey receipts will be refreshed once more.
````

##### Response 53 (commentary)

- Timestamp: `2026-08-03T07:47:26.724Z`

````text
Annotation 1 — confirmed. The GitHub CLI token is valid outside the sandbox; I’ll use that authenticated context for the remaining repository, PR, and publication work. I’m continuing the unattended implementation, including the CRS correctness fix identified in final review.
````

##### Response 54 (commentary)

- Timestamp: `2026-08-03T07:50:02.938Z`

````text
The external authentication check is settled. Strict pre-commit review has now surfaced three source-integrity issues beyond the original CRS label: official-origin enforcement, invented 1 January precision for annual HAR records, and suppressed “unknown” fallbacks in the heritage detail view. I’m correcting all four at the producer and consumer layers before regenerating the corpus.
````

##### Response 55 (commentary)

- Timestamp: `2026-08-03T08:05:11.684Z`

````text
The review has now identified a genuine scope defect: 25 annual HAR rows for two Cumbria assets were admitted only because “Warwick Bridge” contained the alias “Warwick.” I’m treating that as a release blocker, removing locality-only authority, and rebuilding the faithful denominator from 1,109 to 1,084. I’m also correcting multipart Esri topology and HAR geography provenance rather than merely relabelling outputs.
````

##### Response 56 (commentary)

- Timestamp: `2026-08-03T08:12:26.337Z`

````text
The producer-level fixes now pass the focused 32-test suite. The corrected frozen snapshot contains 6,556 spatially selected NHLE assets and 1,084 defensibly scoped annual HAR rows; the tiny fixture remains three exact source-backed records. I’m regenerating all three corpora now so topology, year precision, semantic deep links, and reversible geography evidence are exercised together.
````

##### Response 57 (commentary)

- Timestamp: `2026-08-03T08:17:24.168Z`

````text
Annotation 1 — confirmed: the GitHub CLI token is valid in the authenticated context outside the sandbox. I’m using that context for GitHub operations and continuing the unattended implementation; I’m now tightening the report and rerunning the complete publication gates before the two-phase Pages release.
````

##### Response 58 (commentary)

- Timestamp: `2026-08-03T08:18:37.828Z`

````text
The authenticated GitHub path is settled. The strict audit exposed two claims that need correction before release: the true Site-internal reference count is 4,148 (not the broader 4,543 checked-link count), and Heritage at Risk membership must be described as reversible authority-field normalization rather than spatial intersection. I’m binding both into the generated evidence and tests now.
````

##### Response 59 (commentary)

- Timestamp: `2026-08-03T08:20:12.480Z`

````text
The corpus contract is now explicit at the source level: 6,556 NHLE records are selected by pinned boundary intersection, while 1,084 annual risk rows are selected only through authoritative local-government fields with the exact workbook cell retained. I’m running the Explorer’s full unit/type/deterministic-build gates against that distinction before regenerating the publication bytes.
````

##### Response 60 (commentary)

- Timestamp: `2026-08-03T08:22:12.237Z`

````text
The beginner process and report now explain the YAML-LD extension in practical terms: stable identity, governed predicates, relationship-level evidence, safe deep links, and one graph identity reused across Search, Graph, Links, Map, Resources, Timeline, Type, and the selected-record card. I’m regenerating the full source-backed corpus so those controlling profile and mapping changes are part of the exact release root.
````

##### Response 61 (commentary)

- Timestamp: `2026-08-03T08:24:26.314Z`

````text
The regenerated faithful tree is byte-identical across two independent 2,938-file builds at the same timestamp (`563bfece…`). Its five-plane release root is `d41a67d1…`. I’m assembling the exact Site next; the first pass is expected to reject the deliberately stale candidate receipt and report the observed hashes/size needed to bind the final receipt.
````

##### Response 62 (commentary)

- Timestamp: `2026-08-03T08:25:19.264Z`

````text
The exact assembled Site reports 239 reading pages, 4,148 internal references, and 987,432,082 bytes—12,567,918 bytes under the Pages limit. The stale receipt correctly failed closed. I’ve started the local server outside the sandbox and am now rerunning all 100 browser-scored questions against these exact bytes.
````

##### Response 63 (commentary)

- Timestamp: `2026-08-03T08:26:49.596Z`

````text
The first 47 of 100 browser questions have completed successfully on the corrected corpus; scores are 94 except for three deliberately unsupported designation categories, which score 88 while exposing the gap rather than inventing records. The evaluator is continuing through risk, graph, provenance, search-alias, typo, and publication-readiness questions.
````

##### Response 64 (commentary)

- Timestamp: `2026-08-03T08:29:00.706Z`

````text
All 100 questions passed the 80-point threshold (92.7 average), and the tiny, faithful, and synthetic-isolation browser journeys all passed. I’m freezing those exact result JSON files with deterministic gzip, binding their hashes plus the new app/corpus roots into the local candidate receipt, then rebuilding the Site to a size-and-link fixed point.
````

##### Response 65 (commentary)

- Timestamp: `2026-08-03T08:31:30.387Z`

````text
The Site has reached a fixed point: 14,007 files, 239 reading pages, 4,148 resolved internal references, and 987,431,772 bytes—12,568,228 bytes below the Pages limit. The receipt now matches those exact observations. I’m doing one final browser smoke on this rebuilt Site, then the complete Python and cross-browser regression suite.
````

##### Response 66 (commentary)

- Timestamp: `2026-08-03T08:33:33.273Z`

````text
The full regression run is healthy so far: all 51 Chrome cases passed, including accessibility, geometry precision, large-corpus hydration, graph controls, durable state, and the new deep-link paths. Firefox is now running the same contract, followed by WebKit.
````

##### Response 67 (commentary)

- Timestamp: `2026-08-03T08:36:04.984Z`

````text
The repository gates are green on the local Python 3.14 environment (176 tests), and all 153 Explorer plus 63 Foundry tests passed in Chrome, Firefox, and WebKit. I found the bundled Python 3.12 runtime used by CI; I’m giving the corpus and receipt gates one compatibility pass there as well.
````

##### Response 68 (commentary)

- Timestamp: `2026-08-03T08:37:15.286Z`

````text
Python 3.12’s full 176-test suite passed. Its stricter corpus check correctly noticed the ignored browser-output working directories; I removed only `evaluation/heritage/results/` after preserving the two deterministic result receipts under `evaluation-foundry/.../evidence/receipts/`. Those working files were generated and recoverable by rerunning the evaluator.
````

##### Response 69 (commentary)

- Timestamp: `2026-08-03T08:38:38.331Z`

````text
The full local candidate is now proven, but I’m deliberately not publishing it with discoverable live links in the same step. The first PR will carry the bytes and stable YAML-LD identities while withholding README, registry, and landing-page promotion; after Pages deploys, I’ll verify the exact ten public routes and rich pages, then use a second PR to add the verified links and public receipt.
````

##### Response 70 (commentary)

- Timestamp: `2026-08-03T08:42:50.842Z`

````text
The unadvertised PR-1 candidate is now fixed at release root `44b9dcec…`, full-tree digest `0aba2d45…`, 14,007 Site files, 4,134 internal references, and 987,424,364 bytes. Because removing the registry promotion changed the exact Explorer build identity, I’m rerunning the browser evidence once more against this precise candidate before committing it.
````

##### Response 71 (commentary)

- Timestamp: `2026-08-03T08:47:21.474Z`

````text
The PR-1 browser receipts now bind the exact unadvertised app (`bdbcbf7c…`) and corpus (`44b9dcec…`), again with a 92.7 question average and all three journeys passing. The Site is fixed at 987,424,363 bytes. I’m running the final dual-Python validation matrix and then an independent repository audit before staging.
````

##### Response 72 (commentary)

- Timestamp: `2026-08-03T08:51:39.821Z`

````text
The exact PR-1 candidate has also passed the refreshed 63-case Foundry suite in all three engines. The last local gate now running is the 153-case Explorer suite against the registry-withheld app build; the independent receipt and repository audits are running alongside it.
````

##### Response 73 (commentary)

- Timestamp: `2026-08-03T08:59:07.677Z`

````text
The independent audit found and I fixed two subtle integrity gaps: the feature-coverage receipt now uses the descriptor’s exact generation timestamp, and the Site receipt now roots all 14,006 non-receipt published files so a same-size mutation cannot pass. The current Site tree is `c7bc739c…`; I’m rerunning both Python versions and the final Site gate against that stronger contract.
````

##### Response 74 (commentary)

- Timestamp: `2026-08-03T09:00:14.278Z`

````text
All substantive gates are now green, including the stronger Site-tree receipt on Python 3.12 and 3.14. I’m refreshing the previously stale Git index now, then the audit agent will inspect the exact cached diff that will become PR 1.
````

##### Response 75 (commentary)

- Timestamp: `2026-08-03T09:02:29.969Z`

````text
Annotation 1 is confirmed: the GitHub CLI token is valid in the approved external context. I’m continuing unattended from the clean, fully audited PR1 candidate through CI, deployment verification, and the public-promotion PR.
````

##### Response 76 (commentary)

- Timestamp: `2026-08-03T09:02:36.570Z`

````text
The exact staged PR1 candidate is clean and independently audited: 3,868 paths, no unstaged or untracked files, every local gate passing, and the Pages build remains 12.6 MB below its 1 GB limit. I’m committing and publishing this deliberately unadvertised candidate now.
````

##### Response 77 (commentary)

- Timestamp: `2026-08-03T09:03:29.485Z`

````text
PR1 is pushed at commit `a9b36fab`. Its public calls-to-action remain intentionally withheld; the next gate is GitHub CI followed by an exact deployed Pages journey, after which I’ll create the small promotion/receipt PR.
````

##### Response 78 (commentary)

- Timestamp: `2026-08-03T09:05:54.911Z`

````text
CI has completed the app validation, unit tests, dependency inventory, and deterministic build stages; the required job is still progressing. There are no reviews or unresolved conversations, so I’m arming squash auto-merge rather than leaving the completed gate waiting for intervention.
````

##### Response 79 (commentary)

- Timestamp: `2026-08-03T09:06:01.355Z`

````text
The repository does not permit GitHub auto-merge, so no state changed. I’ll perform the squash merge immediately after the required check reports success.
````

##### Response 80 (commentary)

- Timestamp: `2026-08-03T09:07:56.872Z`

````text
The required check has reached the 153-test Chromium/Firefox/WebKit stage; all ten preceding stages are green. The promotion changes remain blocked until this candidate is actually deployed and verified.
````

##### Response 81 (commentary)

- Timestamp: `2026-08-03T09:12:30.758Z`

````text
CI is still healthy in the cross-browser suite (about six minutes elapsed, no failed stage). This is the longest pre-Python stage; I’m continuing to monitor rather than weakening or skipping it.
````

##### Response 82 (commentary)

- Timestamp: `2026-08-03T09:13:50.830Z`

````text
All 153 Explorer journeys now pass on Chromium, Firefox, and WebKit in GitHub CI. The workflow has advanced to regenerating and byte-checking the faithful, tiny, and synthetic heritage corpora.
````

##### Response 83 (commentary)

- Timestamp: `2026-08-03T09:15:15.405Z`

````text
PR #67 is fully green and merge-ready: all 32 CI stages passed in 10m55s, with no review or conversation blockers. I’m merging the unadvertised candidate now; Pages deployment and real-browser identity checks come next.
````

##### Response 84 (commentary)

- Timestamp: `2026-08-03T09:17:26.397Z`

````text
The unadvertised candidate is merged as `65e22ac`. Its Pages build has passed checkout, dependency installation, and Svelte validation and is now proving the browser app’s deterministic artifact before assembling the 987 MB Site.
````

##### Response 85 (commentary)

- Timestamp: `2026-08-03T09:18:39.816Z`

````text
Pages has now revalidated all three heritage corpora, YAML-LD constraints, OKF bundles, and the legislation corpus. It is assembling the final static Site; upload and deployment remain before any public URL can be called verified.
````

##### Response 86 (commentary)

- Timestamp: `2026-08-03T09:20:22.789Z`

````text
GitHub reports the exact PR1 deployment successful. I’m now spending the bounded public gate on a real Chromium run: the three functional journeys plus all ten exact publication URLs, including Markdown-to-HTML identities and the official Historic England rich-page opening.
````

##### Response 87 (commentary)

- Timestamp: `2026-08-03T09:22:05.786Z`

````text
Public candidate status: **unverified**. The bounded browser gate failed because the deployed Explorer never exposed its search input within 30 seconds on the first tiny-fixture journey; I stopped the remaining checks at the 60-second boundary. I will diagnose only the affected deployment/boot path before rerunning—no release rebuild or promotion is being assumed.
````

##### Response 88 (commentary)

- Timestamp: `2026-08-03T09:24:15.793Z`

````text
The deployment itself is healthy: root HTML, app assets, faithful/tiny descriptors, and generated HTML all return 200. The failure is isolated to the evaluation harness: each journey’s leading-slash bundle path discarded GitHub Pages’ `/okf-explorer/` prefix and fetched a confirmed 404. I’m fixing that explicit-override rule in the harness, with a regression test, before rerunning the same deployed candidate.
````

##### Response 89 (commentary)

- Timestamp: `2026-08-03T09:27:03.789Z`

````text
The corrected run proves the deployed functionality: faithful, tiny, and synthetic journeys all passed, including typo search, YAML-LD graph/links, deep state, and the Historic England tab. The terminal publication journey is still **unverified** because its URL checker sampled the client-rendered Explorer immediately after `DOMContentLoaded`, before “Coventry and Warwickshire” appeared. I’m adding a bounded identity wait and fail-closed exit status, then rerunning only this affected gate.
````

##### Response 90 (commentary)

- Timestamp: `2026-08-03T09:28:22.226Z`

````text
The terminal publication gate now passes 10/10 exact URLs, including the Explorer identity and all Markdown-rendered HTML pages. I’m completing the public receipt with two representative official-page identity checks (NHLE and HAR) and the governed YAML-LD deep-link selection before enabling discovery.
````

##### Response 91 (commentary)

- Timestamp: `2026-08-03T09:29:56.052Z`

````text
The NHLE rich page is live and identity-matched (HTTP 200, “Cathedral of St Michael … 1342941”). The representative HAR URL embedded by the source adapter is genuinely stale: Historic England returns its own 404 page. I’m resolving the current official route and will correct only the HAR rich-link template plus its dependent link/receipt planes.
````

##### Response 92 (commentary)

- Timestamp: `2026-08-03T09:35:07.875Z`

````text
A second deployed-link defect is confirmed: the YAML-LD risk-record IRIs use `/okf-explorer/index.html?...`, but this Pages deployment serves the app only at `/okf-explorer/`; the former returns a real 404. I’m correcting the canonical IRI template to the verified root URL and will regenerate/redeploy the unadvertised candidate before producing any public receipt.
````

##### Response 93 (commentary)

- Timestamp: `2026-08-03T09:39:13.467Z`

````text
The corrected root-form YAML-LD deep link has been proven in the deployed app: it selects “Coventry City Walls” and normalizes the fragment to the governed route. The official HAR search form also returns HTTP 200 and the expected “Church of St Peter … Radway” identity; the corpus will now link to that stable identifier search instead of inventing Historic England’s opaque register-item ID.
````

##### Response 94 (commentary)

- Timestamp: `2026-08-03T09:43:11.681Z`

````text
The correction is now scoped: 122 unique numeric HAR identifiers across 1,084 annual observations will use exact official searches; 6,556 NHLE pages stay direct. I’ve also extended the terminal journey to check both representative official identities and the YAML-LD deep link. I’m regenerating only the affected corpus planes, still with public promotion withheld.
````

##### Response 95 (commentary)

- Timestamp: `2026-08-03T09:50:27.418Z`

````text
Annotation 1 acknowledged: the GitHub CLI credential is valid in the authenticated environment outside the sandbox. I’ll use that context for GitHub operations and won’t treat the sandbox’s credential visibility as an authentication failure.

I’m continuing the unattended implementation. The candidate is merged and deployed provisionally; I’m now closing two project-root routing defects found by real-browser testing before the promotion release.
````

##### Response 96 (commentary)

- Timestamp: `2026-08-03T09:50:51.837Z`

````text
The audit has now isolated three concrete defects: reading-page links used `/index.html`, the evaluator mishandled a slashless Pages root, and the generated 404 shell used account-root assets. The heritage corpora themselves are clean. I’m fixing all three at their source and adding regression tests before rebuilding the Site.
````

##### Response 97 (commentary)

- Timestamp: `2026-08-03T09:54:40.773Z`

````text
The routing fixes now have passing focused coverage, and the standalone 404 has passed the full Explorer unit suite (301 tests total) plus two clean deterministic builds. I’m binding that new Explorer build identity into the candidate and rebuilding the publication plane next.
````

##### Response 98 (commentary)

- Timestamp: `2026-08-03T09:55:44.632Z`

````text
The rebuilt Site now passes its exact tree/size receipt: 14,007 files, 239 rendered reading pages, 4,134 internal references, and 12.77 MB of Pages headroom. The stale `/index.html` deep links are gone, and the new 404 contains no account-root asset references. I’m rerunning the 100-question and three-journey browser evidence against these exact bytes.
````

##### Response 99 (commentary)

- Timestamp: `2026-08-03T09:57:55.196Z`

````text
The exact rebuilt candidate is progressing cleanly through the browser evaluation: the first 66 questions all pass, including familiar names, designation aliases, risk history, periods, people, and one-edit typo cases. No score has fallen below the required threshold.
````

##### Response 100 (commentary)

- Timestamp: `2026-08-03T10:01:13.343Z`

````text
The final local evidence is now 100/100 questions at a 92.7 average and 3/3 functional journeys passed, including the tiny fixture and default-off synthetic isolation. I’ve sealed those exact JSON results into deterministic gzip receipts; the remaining local work is the full cross-version validation and three-browser matrix before publication.
````

##### Response 101 (commentary)

- Timestamp: `2026-08-03T10:03:35.167Z`

````text
The complete local validation is still green: all three generated corpora reproduce byte-for-byte, 182 Python tests pass on both Python 3.12 and 3.14, and all 301 Explorer unit/contract tests pass. The three-browser end-to-end run has completed Chrome and is now cleanly progressing through Firefox.
````

##### Response 102 (commentary)

- Timestamp: `2026-08-03T10:05:56.180Z`

````text
All 153 general browser tests and all 63 Foundry/Markdown tests now pass across Chrome, Firefox, and WebKit. The mandatory pre-publication build is green with the exact receipt-bound Site tree. I’m doing an independent final diff/receipt audit before committing the correction branch.
````

##### Response 103 (commentary)

- Timestamp: `2026-08-03T10:07:56.807Z`

````text
A final receipt audit caught an important provenance subtlety before commit: the rerun question evaluator had inherited the manifest’s absolute public bundle, while the three journey start URLs correctly used local candidate bundles. The scores were valid but not bound to the intended local data plane. I’m rerunning the 100 questions with an explicit local bundle and strengthening the receipt test so this cannot recur.
````

##### Response 104 (commentary)

- Timestamp: `2026-08-03T10:16:32.413Z`

````text
The independent reviews are finding exactly the kind of edge-case drift this release is meant to prevent. I’m addressing four verified issues before sealing the branch: the HAR prefilter-to-authoritative 1,109→1,084 reconciliation, a complete 15,280 official-link occurrence count, HAR-specific UI wording, and publication receipts that capture the genuinely normalized final URL rather than a pre-hydration value.
````

##### Response 105 (commentary)

- Timestamp: `2026-08-03T10:22:51.785Z`

````text
Annotation 1 — confirmed: the GitHub CLI token is valid outside the sandbox, and I’m using that authenticated context for GitHub operations. I’m continuing unattended with the final link-coverage and receipt corrections before opening the correction PR.
````

##### Response 106 (commentary)

- Timestamp: `2026-08-03T10:23:31.703Z`

````text
The final-hash race is now fail-closed. I’m expanding the publication journey so every externally authored link in the report—not just representative corpus URLs—gets a terminal browser identity check; bulk generated links remain structurally validated to avoid abusive source-site traffic.
````

##### Response 107 (commentary)

- Timestamp: `2026-08-03T10:27:37.504Z`

````text
The independent receipt audit found four substantive edge cases beyond stale evidence: synthetic links were mislabeled as official, two YAML-LD document identities omitted their published `.html` targets, one beginner example used a placeholder URL, and NHLE rich-page validation allowed path suffix tricks. I’m correcting each before regeneration.
````

##### Response 108 (commentary)

- Timestamp: `2026-08-03T10:29:24.291Z`

````text
All report-authored external destinations are now represented in the terminal journey, the YAML-LD document IRIs resolve to their actual HTML pages, and the stricter source-link policy is covered by negative tests. I’m regenerating the faithful, tiny, and synthetic products from their frozen snapshots with one shared provenance timestamp.
````

##### Response 109 (commentary)

- Timestamp: `2026-08-03T10:32:52.576Z`

````text
The regenerated faithful corpus now roots at `f0a1791c…`; the deterministic Explorer app roots at `0cb83c10…`. The assembled local Site is serving those exact bytes, and I’m rerunning all 100 scored questions plus the three local consumer journeys against that final candidate.
````

##### Response 110 (commentary)

- Timestamp: `2026-08-03T10:39:03.404Z`

````text
One infrastructure constraint is now explicit: Historic England serves Cloudflare 403s to default headless automation, while the same pages pass in the genuine browser session. I’m testing a real installed Chrome execution path for the terminal gate; I will preserve the fail-closed identity checks and will not reinterpret a challenge page as success.
````

##### Response 111 (commentary)

- Timestamp: `2026-08-03T10:46:30.035Z`

````text
The sealed 100-question run passed all 100 at or above 80, averaging 92.7, and its result now includes the exact served descriptor SHA-256 and generation identity. I’m completing the three isolated local journeys next, then I’ll freeze both receipts deterministically.
````

##### Response 112 (commentary)

- Timestamp: `2026-08-03T10:48:24.688Z`

````text
The failed tiny/synthetic run exposed an evidence-option ambiguity, not a product defect: `--bundle` intentionally overrode every journey’s own bundle. I added `--candidate-bundle` so the receipt can bind to the local faithful descriptor while tiny, faithful, and synthetic journeys still load their separate declared bundles.
````

##### Response 113 (commentary)

- Timestamp: `2026-08-03T10:50:22.038Z`

````text
The refreshed local evidence is now fully bound and green: 100/100 questions, 3/3 separated journeys, exact descriptor hashes, timestamp ordering, all three corpus roots, app manifest, and the final Site tree. The strengthened receipt test passes with 83 focused tests; I’m now repeating independent corpus checks and then running the full repository gates.
````

##### Response 114 (commentary)

- Timestamp: `2026-08-03T10:59:02.224Z`

````text
All application, Python, documentation, registry, legislation, Foundry, and cross-browser suites are green so far (188 Python tests on both Python 3.12 and 3.14; 301 app tests; 153 Explorer E2E; 63 Foundry E2E). The large government-API synchronization check is simply still running; I’m letting its bounded deterministic pass finish before sealing Git status.
````

##### Response 115 (commentary)

- Timestamp: `2026-08-03T11:03:23.867Z`

````text
Before publishing, I’m preflighting the complete 27-action terminal journey against the currently deployed unadvertised candidate using installed headed Chrome. This specifically proves that the protected Historic England pages can be identity-checked without treating Cloudflare’s headless challenge as a pass.
````

##### Response 116 (commentary)

- Timestamp: `2026-08-03T11:11:06.307Z`

````text
Annotation 1 — confirmed. The GitHub CLI token is valid outside the sandbox, so I’ll use that authenticated external context for GitHub operations. I’m continuing the unattended implementation from the current correction branch, beginning with the remaining browser-receipt and evaluator hardening work.
````

##### Response 117 (commentary)

- Timestamp: `2026-08-03T11:11:52.345Z`

````text
I’ve split the remaining implementation so the evaluator and Python validator can be hardened independently. In parallel, I’m producing a small, auditable receipt from the genuine in-app Chrome session for the eleven Historic England pages that reject fresh automated browser contexts.
````

##### Response 118 (commentary)

- Timestamp: `2026-08-03T11:14:48.515Z`

````text
The genuine session returned HTTP 200 and matched the intended identity text on all eleven protected pages. Two pages canonicalise their URLs: the HAR search adds its page-size query parameter, and the older “advice” route redirects to the current Heritage at Risk route; both will be pinned explicitly in the journey.
````

##### Response 119 (commentary)

- Timestamp: `2026-08-03T11:18:01.790Z`

````text
The receipt is now part of the fixture contract, and the Foundry validator accepts it only under those strict conditions. I’m propagating the revised journey into the faithful, tiny, and synthetic outputs with the same pinned generation time so the data build remains reproducible.
````

##### Response 120 (commentary)

- Timestamp: `2026-08-03T11:22:49.930Z`

````text
The faithful corpus has now reproduced byte-for-byte in two fresh 2,938-file builds, while the tiny and synthetic roots remain unchanged. I’m refreshing the three local browser journeys against the newly assembled Site; the publication journey remains separate so it cannot be mistaken for deployed proof.
````

##### Response 121 (commentary)

- Timestamp: `2026-08-03T11:24:54.069Z`

````text
The refreshed evaluator is progressing normally: the first twenty of one hundred questions have each scored 94/100. I’m letting the full suite finish and will bind its exact JSON and compressed digests into the candidate receipt.
````

##### Response 122 (commentary)

- Timestamp: `2026-08-03T11:29:09.627Z`

````text
The current local candidate is fully bound again: 100/100 questions scored at least 80, all three local journeys passed, the faithful release root and Site tree match their receipts, and the assembled Site passes its 1 GB gate with 12.7 MB headroom. I’m now exercising the 27-action publication journey against the existing unadvertised deployment as a preflight—not as final proof of the correction branch.
````

##### Response 123 (commentary)

- Timestamp: `2026-08-03T11:29:50.621Z`

````text
The full local evidence set is now current, including candidate identity in both result files and the protected-page receipt in the Site. I’m running the complete Python and Svelte validation suites next, followed by deterministic corpus/build checks and the three-browser journeys.
````

##### Response 124 (commentary)

- Timestamp: `2026-08-03T11:31:13.550Z`

````text
The code and data suites are green: 200 Python tests, 301 Svelte/Node tests, synchronized full/tiny/synthetic corpora, registry, constraints, SBOM, bundle, viewer and OKF conformance. One Site check was invalidated because a later app test intentionally rebuilt without its manifest; I’m completing browser tests first, then I’ll regenerate the deterministic manifest and rerun the Site gate last.
````

##### Response 125 (commentary)

- Timestamp: `2026-08-03T11:37:12.885Z`

````text
A consistency sweep found one stale local Site metric: adding the published browser-receipt link increased the audited internal-reference count from 4,134 to 4,135. I’m correcting that claim everywhere it appears, then regenerating the three corpus roots and final receipt once more; record counts and browser scores are unaffected.
````

##### Response 126 (commentary)

- Timestamp: `2026-08-03T11:44:44.262Z`

````text
I’m continuing unattended. Annotation 1 is accepted: the GitHub CLI credentials are valid in the external execution context. I’m now closing the remaining publication-binding, receipt, and self-contained-fixture gaps before regenerating and revalidating the release candidate.
````

##### Response 127 (commentary)

- Timestamp: `2026-08-03T11:45:28.996Z`

````text
The link receipt is being strengthened from a Boolean assertion into replayable evidence: each protected page will carry the actual DOM excerpt, page title, final URL, timestamp, status, and the receipt digest. This keeps the small exception channel auditable while ordinary Site links remain live-tested.
````

##### Response 128 (commentary)

- Timestamp: `2026-08-03T11:49:57.850Z`

````text
The faithful mirror now includes its executable closure (`questions.json` plus the protected-link receipt): 2,940 files for 7,640 real records. Tiny remains 498 files/3 real records, and the isolated synthetic supplement remains 349 files/3 synthetic records. I’m proving repeatability against two fresh output directories next.
````

##### Response 129 (commentary)

- Timestamp: `2026-08-03T11:55:39.621Z`

````text
The candidate now assembles as a 987,298,300-byte GitHub Pages artifact with 12,701,700 bytes of headroom, 239 rendered reading pages, 4,135 internal references, and an exact 14,009-file receipt tree. The deterministic Explorer application hash is unchanged, which isolates the new bytes to the intended corpus/evidence closure.
````

##### Response 130 (commentary)

- Timestamp: `2026-08-03T11:57:13.639Z`

````text
The exact assembled candidate is now being exercised in two independent real-browser runs: the complete 100-question functionality evaluation and the three local journeys covering the tiny assurance fixture, full faithful corpus, and explicit synthetic isolation. The evaluator also hashes the descriptor bytes before it launches the journeys.
````

##### Response 131 (commentary)

- Timestamp: `2026-08-03T12:02:15.492Z`

````text
One extra release-binding safeguard is necessary before I trust the public preflight: the deployed descriptor has intentionally stable bytes, while its executable closure just changed. I’m therefore binding the public check to the deployed `assurance/plane-roots.json` release root as well as the descriptor SHA; this prevents an older deployment with the same descriptor from passing.
````

[Back to exchange map](#exchange-map)

### EX-0005

**Prompt:** Confirm graph browsing cannot mutate the bundle

- User timestamp: `2026-08-03T12:03:35.949Z`
- Standalone note: [EX-0005](../exchanges/0005-confirm-graph-browsing-cannot-mutate-the-bundle.md)

#### User Prompt

````text
I opened the URL and clicked around the graph, I hope this did not change the bundle!
````

#### Codex Response

##### Response 1 (commentary)

- Timestamp: `2026-08-03T12:03:43.322Z`

````text
It did not change the bundle. The published Explorer is a static, read-only site: graph clicks only change browser-side view state (and sometimes the URL fragment/query). There is no write endpoint back into the bundle or repository. I’m also continuing to verify the candidate from file hashes, so any byte-level change would be detected independently.
````

##### Response 2 (commentary)

- Timestamp: `2026-08-03T12:05:51.314Z`

````text
Local functionality is now green: all 100 questions scored (average 92.7; every score at least 80), and all three tiny/faithful/synthetic journeys passed. I’ve frozen those JSON results into deterministic gzip receipts and am running the full repository validation matrix before publication.
````

##### Response 3 (commentary)

- Timestamp: `2026-08-03T12:10:35.480Z`

````text
The full local gate is now clean: 209 Python tests, 301 app tests, 153 cross-browser UI tests, 63 cross-browser Foundry/Markdown tests, deterministic corpus/app builds, semantic and source-constraint validation, SBOM, link/render audit, and the final Site build. I’m moving this exact candidate into the review-and-deploy workflow now.
````

##### Response 4 (commentary)

- Timestamp: `2026-08-03T12:12:05.789Z`

````text
PR [#68](https://github.com/chris-page-gov/okf-explorer/pull/68) is now open with the exact validated commit. I’m waiting for GitHub’s independent checks; I’ll merge only after they are green, then verify the resulting Pages deployment byte-for-byte and through the terminal browser journey.
````

##### Response 5 (commentary)

- Timestamp: `2026-08-03T12:13:33.149Z`

````text
GitHub’s required CI is still running; no failure has appeared. The local matrix already mirrors the workflow, including all three browser engines, but I’m retaining the independent GitHub gate before merge.
````

##### Response 6 (commentary)

- Timestamp: `2026-08-03T12:15:26.418Z`

````text
CI has completed setup, dependency validation, unit tests, SBOM, and deterministic app build successfully. It is currently in the independent three-browser UI stage; the later corpus, documentation, Site, and Foundry stages are queued.
````

##### Response 7 (commentary)

- Timestamp: `2026-08-03T12:17:56.214Z`

````text
The independent browser stage is slower on the GitHub runner than locally, but remains active and has not reported a retry or failure. I’m continuing to watch the exact run rather than treating elapsed time as success.
````

##### Response 8 (commentary)

- Timestamp: `2026-08-03T12:19:47.369Z`

````text
Still no CI fault signal; the same three-browser job is running. This workflow is intentionally single-worker and executes 153 tests sequentially, so the elapsed time is consistent with its design.
````

##### Response 9 (commentary)

- Timestamp: `2026-08-03T12:21:12.823Z`

````text
The three-browser CI stage has passed. GitHub has also completed Python setup, semantic dependencies, fixture validation, and all three heritage corpus checks; it is now running the 209-test Python suite.
````

##### Response 10 (commentary)

- Timestamp: `2026-08-03T12:22:30.590Z`

````text
Every CI stage through the 987 MB static Site build has passed, including documentation lockstep and generated corpus reproducibility. Only the final 63-test Chrome/Firefox/WebKit Foundry and rendered-Markdown stage remains.
````

##### Response 11 (commentary)

- Timestamp: `2026-08-03T12:24:43.057Z`

````text
Annotation 1 — confirmed: the GitHub CLI credentials are valid in the external execution context, and I’ll use that authenticated context for the remaining merge and publication work.

Your graph exploration did not alter the bundle: the published explorer is a static, read-only client, so clicks only changed browser-local navigation state. I’m continuing with the clean, CI-passed PR, then I’ll verify the exact deployed candidate in a real browser before promoting the report.
````

##### Response 12 (commentary)

- Timestamp: `2026-08-03T12:24:54.671Z`

````text
PR #68 is still clean and mergeable, and its full GitHub CI suite passed. I’m merging that exact reviewed candidate now; the next gate is the Pages deployment for the resulting immutable commit.
````

##### Response 13 (commentary)

- Timestamp: `2026-08-03T12:25:16.770Z`

````text
The reviewed candidate is now merged as commit `c8e8fac3ef2beddae7bdc99988ae9c5aac2431f2`. GitHub Pages is building that exact commit; I’m following its run rather than testing a moving or assumed URL.
````

##### Response 14 (commentary)

- Timestamp: `2026-08-03T12:27:03.094Z`

````text
The Pages build has cleared the application validation, deterministic application build, dependency setup, and Evaluation Foundry fixture checks. It is now validating the full generated heritage closure—the large-corpus gate expected to take most of this run.
````

##### Response 15 (commentary)

- Timestamp: `2026-08-03T12:28:11.860Z`

````text
The complete site artifact—roughly the one-gigabyte publication closure—has now built, validated, and uploaded successfully. GitHub is in the final Pages deployment step; once it reports success I’ll run the fail-closed public journey against the deployed descriptor and release-root hashes.
````

##### Response 16 (commentary)

- Timestamp: `2026-08-03T12:28:56.461Z`

````text
Pages has deployed commit `c8e8fac3…` successfully. I’m starting the terminal public gate now: it binds the live descriptor and full release root to the reviewed candidate, then exercises the publication journey, HTML/Markdown routes, graph/search behavior, deep-link fallback, and protected Historic England source-link evidence.
````

##### Response 17 (commentary)

- Timestamp: `2026-08-03T12:29:13.911Z`

````text
The terminal public journey passed on its first run against the deployed candidate. I’m now extracting the receipt details—observed hashes, URLs, browser assertions, and fallback checks—so the beginner report can be promoted from “candidate pending publication” to a source-backed public result.
````

##### Response 18 (commentary)

- Timestamp: `2026-08-03T12:35:19.940Z`

````text
The cleanest way to preserve the terminal evidence is an immutable GitHub Release asset tied to the final deployed commit. That avoids a self-referential Pages hash loop. I’m promoting the report and machine-readable coverage from provisional to evaluated, then the final deployment will get a tagged evidence release and a fresh exact-browser check that also validates that release page.
````

##### Response 19 (commentary)

- Timestamp: `2026-08-03T12:38:13.719Z`

````text
The promotion touches only evidence/status and publication entry points, but those controls are deliberately inside the rooted corpus. That means I will not reuse the earlier release root: after these edits I’ll regenerate it, rerun the 100-question and three local journeys, rebuild the Site receipt, and verify the promoted deployment as a new exact candidate.
````

##### Response 20 (commentary)

- Timestamp: `2026-08-03T12:40:31.587Z`

````text
The report and both human/machine profiles are now promoted and internally consistent: the beginner YAML-LD explanation remains intact, authority limits remain explicit, and the first deployed candidate’s exact evidence is recorded. I’m finishing the registry, copy-ready URLs, generated landing-page wording, and release-page journey action before regeneration.
````

##### Response 21 (commentary)

- Timestamp: `2026-08-03T12:43:03.112Z`

````text
The promotion source edits are complete and the remaining “planned/pending” wording is now confined to the intentionally local pre-publication receipt. I’m regenerating all three corpus products at the pinned generation time so only the governed control, registry, landing-page, and digest consequences change.
````

##### Response 22 (commentary)

- Timestamp: `2026-08-03T12:48:02.381Z`

````text
The promoted corpus is deterministic across two independent builds for faithful, tiny, and synthetic products. Its descriptor remains `2b06…`, while the deliberately changed release roots are now `000790…`, `6c8b…`, and `14f76…`; the rebuilt Site is 987,323,025 bytes with 12,676,975 bytes of Pages headroom. I’m running the full test matrix now.
````

##### Response 23 (commentary)

- Timestamp: `2026-08-03T12:50:32.952Z`

````text
The unit/static matrix is green: 209 Python tests, 276 application tests, 25 build/acceptance tests, zero Svelte diagnostics, the pinned SBOM, and the deterministic app build all passed. The cross-browser suite is progressing normally through Chrome and Firefox; no failures so far.
````

##### Response 24 (commentary)

- Timestamp: `2026-08-03T12:53:13.880Z`

````text
The full validation matrix found one expected synchronization consequence: adding the now-public heritage bundle to the YAML-LD registry requires regenerating its JSON, JSON-LD, and application-static projections. I’m doing that now, then I’ll re-root the deterministic app/Site receipt; all substantive corpus, Foundry, OKF, constraints, and legislation checks already passed.
````

##### Response 25 (commentary)

- Timestamp: `2026-08-03T12:57:03.245Z`

````text
All final static and generated checks are now green, including the seven-bundle registry and the rebuilt app/Site roots. For stronger closure, I’m rerunning the 100 scored questions and the three local real-consumer journeys against this final assembled Site—not carrying their earlier results forward merely because the descriptor filename stayed stable.
````

##### Response 26 (commentary)

- Timestamp: `2026-08-03T12:59:01.861Z`

````text
The final 100-question rerun is exercising exact names, familiar alternatives, grades, source categories, time slices, and typo cases against the rebuilt Site. The first 43 are all above the pass threshold; bounded source-absent categories are correctly scoring as explained empty states rather than invented records.
````

##### Response 27 (commentary)

- Timestamp: `2026-08-03T13:09:38.797Z`

````text
The final local evidence is now refreshed, not inherited: 100/100 questions again averaged 92.7 with all scores at least 80, and tiny/faithful/synthetic journeys passed 3/3 against the rebuilt Site. Their deterministic compressed receipts, timestamps, manifest hash, app root, corpus roots, and Site tree are all rebound; three independent reviewers are doing a last read-only consistency pass.
````

##### Response 28 (commentary)

- Timestamp: `2026-08-03T13:11:24.450Z`

````text
The final diff is intentionally small relative to the implementation PR: 29 files, mainly status/evidence metadata, three generated landing pages and roots, registry projections, evaluator-output hygiene, and tests. No heritage records, search shards, source snapshots, semantic assertions, or application code changed during promotion.
````

##### Response 29 (commentary)

- Timestamp: `2026-08-03T13:16:38.725Z`

````text
Clicks in the deployed graph are read-only browser state, so they cannot alter the bundle or repository. I’m now resolving the last promotion consistency detail, then I’ll publish the final tagged build and run the exact public browser gate against it.
````

##### Response 30 (commentary)

- Timestamp: `2026-08-03T13:17:01.115Z`

````text
The reviewer’s case-matching concern is already covered by executable code: both the JavaScript evaluator and Python validator compare identity excerpts case-insensitively. I found one real presentation ambiguity—machine-readable local-build fields still showed the earlier deployed candidate’s 4,135 references—so I’m separating that historical observation from the current promotion build’s 4,157 references.
````

##### Response 31 (commentary)

- Timestamp: `2026-08-03T13:19:25.346Z`

````text
The regenerated faithful corpus is byte-for-byte deterministic across two independent builds. Its descriptor remains stable, while the release root correctly changed to bind the clarified 4,157-reference promotion metadata; the assembled Site now recomputes cleanly at 14,010 files with 12.67 MB headroom.
````

##### Response 32 (commentary)

- Timestamp: `2026-08-03T13:19:54.804Z`

````text
To honour “all links” literally at the public gate, I’m closing the audit’s four remaining terminal gaps: the tiny and synthetic Explorer entry URLs, plus the cited immutable implementation commit and successful Pages run. Internal Markdown/HTML links remain exhaustively checked by the Site builder; these additions make the final browser journey 32 actions rather than 28.
````

##### Response 33 (commentary)

- Timestamp: `2026-08-03T13:24:08.441Z`

````text
All three interaction journeys passed again on the rebuilt faithful, tiny, and isolated synthetic bundles. The 100-question evaluation is still running and has passed its first 20 questions at 94/100 each.
````

##### Response 34 (commentary)

- Timestamp: `2026-08-03T13:25:14.225Z`

````text
The question run remains clean through 69/100. Scores are within the previously established 88–94 range, including risk history, designation aliases, chronology, people, and deliberately sparse categories.
````

##### Response 35 (commentary)

- Timestamp: `2026-08-03T13:26:03.504Z`

````text
The complete 100-question browser evaluation passed: 100/100 scored at least 80, none below 60, with the same 92.7 average. I’m sealing these fresh results and the three passing local journeys into deterministic evidence before the full repository gate.
````

##### Response 36 (commentary)

- Timestamp: `2026-08-03T13:27:51.172Z`

````text
One defensive unit test caught a useful contract issue introduced by the broader link journey. The corpus, Foundry validator, tiny fixture, and synthetic isolation all pass; I’m now adjusting the publication-binding test/contract so extra audited GitHub links cannot be mistaken for an alternate candidate bundle.
````

##### Response 37 (commentary)

- Timestamp: `2026-08-03T13:29:24.306Z`

````text
The strengthened binding now accepts only auxiliary Explorer bundles that are declared by the fixture family and rejects arbitrary ones. All 209 Python tests, registry/constraint checks, OKF bundle/viewer conformance, legislation validation, and diff hygiene now pass.
````

##### Response 38 (commentary)

- Timestamp: `2026-08-03T13:30:31.372Z`

````text
All local publication surfaces now pass in Chrome, Firefox, and WebKit (63/63), alongside 276 app tests, 25 build-contract tests, zero Svelte diagnostics, a 136-component SBOM check, and a deterministic Explorer build. I’m at the final diff/commit boundary before GitHub CI and deployment.
````

##### Response 39 (commentary)

- Timestamp: `2026-08-03T13:31:28.907Z`

````text
The promotion commit is sealed and clean at `0d377c917493460d7264eaecb9563a0ba0e91523`; documentation lockstep also passes. I’m pushing it now, then I’ll wait for the full GitHub matrix before merging and deploying.
````

##### Response 40 (commentary)

- Timestamp: `2026-08-03T13:32:36.060Z`

````text
PR [#69](https://github.com/chris-page-gov/okf-explorer/pull/69) is open and its full CI workflow is running. The branch is pushed from the valid external GitHub authentication context.
````

##### Response 41 (commentary)

- Timestamp: `2026-08-03T13:33:52.111Z`

````text
CI is still active rather than queued or failed; this repository’s matrix includes three-browser E2E, corpus synchronization, the 1 GB Site build, and all semantic checks, so a few minutes is expected.
````

##### Response 42 (commentary)

- Timestamp: `2026-08-03T13:35:38.467Z`

````text
CI has completed setup, Svelte/app/unit/SBOM/deterministic-build stages successfully and is currently in the full 153-test cross-browser Explorer suite. No failure has appeared.
````

##### Response 43 (commentary)

- Timestamp: `2026-08-03T13:38:01.382Z`

````text
The long-running browser matrix remains healthy. I’m keeping the merge blocked until GitHub reports the entire workflow green, including the later Python, semantic, Site-size, and Foundry-page stages.
````

##### Response 44 (commentary)

- Timestamp: `2026-08-03T13:40:30.685Z`

````text
The cross-browser suite is the only active stage and has not timed out; all preceding checks are green. I’m continuing to monitor rather than bypassing it.
````

##### Response 45 (commentary)

- Timestamp: `2026-08-03T13:42:41.624Z`

````text
PR #69 is fully green after 10m30s, including the complete 153-test cross-browser Explorer suite and every later semantic/Site/Foundry gate. I’m merging this exact reviewed commit now.
````

##### Response 46 (commentary)

- Timestamp: `2026-08-03T13:43:14.912Z`

````text
The promotion merged as `0b5d748dc13ed83134592fc0873a2ff25d83eada`. GitHub Pages run [30819232224](https://github.com/chris-page-gov/okf-explorer/actions/runs/30819232224) has started for that exact SHA; the release and terminal receipt remain deliberately gated on its success.
````

##### Response 47 (commentary)

- Timestamp: `2026-08-03T13:45:04.954Z`

````text
The final Pages job is progressing normally: checkout, Svelte validation, deterministic app build, Python setup, dependencies, and Foundry validation are green; it is now regenerating and checking all heritage corpora.
````

##### Response 48 (commentary)

- Timestamp: `2026-08-03T13:46:46.871Z`

````text
Pages run 30819232224 succeeded and deployed the exact merge SHA. I’m creating the immutable release at that commit now; only after the release page exists can action 28 and the complete 32-action public journey be honestly evaluated.
````

##### Response 49 (commentary)

- Timestamp: `2026-08-03T13:47:31.131Z`

````text
The exact promoted deployment passed the terminal gate: 1/1 public journey, all 32/32 actions, and both assertions. This includes the immutable release, every report external/rich-page link, all rendered HTML pages, faithful/tiny/synthetic Explorer URLs, and the cited run/commit identities.
````

##### Response 50 (commentary)

- Timestamp: `2026-08-03T13:48:57.781Z`

````text
The release asset API accepted three uploads before rejecting basename collisions; I’ve inspected the exact partial state. I’m correcting only the two ambiguous `results.json`/`results.md` assets, then uploading uniquely named evidence files so each digest is unambiguous.
````

##### Response 51 (commentary)

- Timestamp: `2026-08-03T13:50:33.013Z`

````text
The release now has six uniquely named evidence assets with server-reported SHA-256 digests matching the local files, and its notes record the exact merge, Pages run, descriptor, plane roots, release root, and terminal pass. I’m doing one independent final audit round against the public release and receipts before closing the goal.
````

##### Response 52 (commentary)

- Timestamp: `2026-08-03T13:53:15.661Z`

````text
The independent public audit is clean: the tag resolves to the exact merge, the Pages run matches it, all six release assets download and hash correctly, and action 28 independently returns the exact release title and URL.
````

##### Response 53 (commentary)

- Timestamp: `2026-08-03T13:55:24.854Z`

````text
All three independent reviewers now report no blocker: public URLs, tag/commit identity, downloaded asset digests, current-versus-historical metrics, case-insensitive matching, source/generated parity, and the complete receipt chain reconcile exactly.
````

##### Response 54 (final_answer)

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

[Back to exchange map](#exchange-map)

### EX-0006

**Prompt:** Create the end-to-end engineering postmortem

- User timestamp: `2026-08-04T03:48:15.405Z`
- Standalone note: [EX-0006](../exchanges/0006-create-the-end-to-end-engineering-postmortem.md)

#### User Prompt

````text
This still appeared inefficient with things that we found late on resulting in full rebuild and test cycle. As we did with the full process I want you to collect the logs and other details so that you can do a complete analysis and writeup of the end-to-end process.

Once we have all the details we can do an analysis of how the process and data can be refactored and revised to minimise the impact of errors discovered late in the process, for example by making the build more modular or introducing further checking into earlier stages.

As part of the output from this, I would like a full prompt-response conversation trace as we did in the 'ai-engineering-lab-hackathon-london-2026' postmortem writeup
````

#### Codex Response

##### Response 1 (commentary)

- Timestamp: `2026-08-04T03:48:27.383Z`

````text
I’ll treat this as an evidence-backed engineering postmortem, using the report-building skill for the analysis structure and the GitHub skill for PR/workflow evidence. I’ll first locate the earlier hackathon postmortem and every available local/GitHub/task log, then build a complete chronological trace and identify where late discoveries forced broad rebuilds.
````

##### Response 2 (commentary)

- Timestamp: `2026-08-04T03:49:11.359Z`

````text
The report will target a technical audience and support one decision: how to restructure the Foundry pipeline so a late metadata, journey, or publication finding invalidates only its dependency cone—not the entire corpus and test matrix. The durable writeup will include the evidence timeline, measured rebuild amplification, failure analysis, recommendations, and an auditable prompt-response trace.
````

##### Response 3 (commentary)

- Timestamp: `2026-08-04T03:51:02.118Z`

````text
I found the same safe pattern used in the hackathon postmortem: retain the raw task export outside the published bundle, generate a redacted public derivative, and give readers both one chronological reader and per-exchange notes. I’m now exporting this task through the app’s own task-history interface so the trace is generated from timestamps and messages rather than reconstructed from memory.
````

##### Response 4 (commentary)

- Timestamp: `2026-08-04T03:53:28.301Z`

````text
A time-sensitive detail surfaced in the GitHub evidence: the three exact Pages deployment archives are still downloadable, but their one-day retention windows expire today. I’m preserving those immutable deployment inputs now in the ignored private evidence plane; only hashes, sizes, run metadata, and redacted summaries will enter the public postmortem.
````

##### Response 5 (commentary)

- Timestamp: `2026-08-04T03:55:43.676Z`

````text
All three deployment archives were captured before expiry. GitHub delivered each as an uncompressed 954 MiB `artifact.tar` despite a roughly 210 MiB transfer size, so I’m losslessly compressing the private copies and recording both the original tar digest and the stored-file digest; decompression reproduces the exact downloaded tar byte-for-byte.
````

##### Response 6 (commentary)

- Timestamp: `2026-08-04T04:03:55.300Z`

````text
The private evidence plane is now complete: 30 indexed records plus the three retained deployment archives, totalling 628 MiB. The key diagnosis is already clear: GitHub did not fail; it repeated three complete green pipelines. The late discoveries were made in local audits and public browser gates, and the Evaluation Foundry derivative had dropped the parent Foundry’s producer→plane→consumer dependency graph—the control needed to rerun only affected work.
````

##### Response 7 (commentary)

- Timestamp: `2026-08-04T04:06:52.584Z`

````text
I’m using the visualization skill for one part of the report because the dependency-cone change is much easier to audit as a graph than as prose: it will show which source, plane, consumer, Site, and evidence nodes should invalidate one another. Quantitative claims will remain in tables sourced from the run registers, so the diagram does not invent measurements.
````

##### Response 8 (commentary)

- Timestamp: `2026-08-04T04:16:01.331Z`

````text
The evidence plane is now preserved, including the expiring deployment artifacts. I’m moving through the reproducibility gates next: compile the collectors/builders, generate the public trace and report, then exercise the same Markdown, site, link, bundle, and browser journeys that a published version would face.
````

##### Response 9 (commentary)

- Timestamp: `2026-08-04T04:18:48.832Z`

````text
The first generated pass exposed exactly the kind of early gate the postmortem recommends: interpolated tables prevented Markdown dedenting, so the narrative would have rendered as code. I fixed that in the report generator and added a regression test; I also corrected the release wording from “immutable” to the evidence-supported “digest-bound and policy-frozen.”
````

##### Response 10 (commentary)

- Timestamp: `2026-08-04T04:25:05.615Z`

````text
The portable report is now built from the same validated analytical artifact used for its chart, table, metric cards, sources, and semantic fallback. Its packaged Chromium gate passed at both 1440px and 390px, including source-dialog interaction and zero external runtime requests. I’m at repository closure now: exact generated-file lint, targeted regressions, then the mandated bundle/viewer/OKF/Site gates.
````

##### Response 11 (commentary)

- Timestamp: `2026-08-04T04:25:18.723Z`

````text
The mandated command names initially selected the bare system Python, which lacks the repository’s `jsonschema` dependency; that is an environment failure before any project check ran. The repository virtual environment has the pinned dependency, so I’m rerunning the identical scripts there and will record both the failed launcher attempt and the valid project results in the trace.
````

##### Response 12 (commentary)

- Timestamp: `2026-08-04T04:26:22.301Z`

````text
The Site gate has now reproduced the architectural coupling in a controlled way. All 254 reading pages and 4,872 documentation links resolve, but adding the postmortem changes the global Site tree, so the heritage candidate’s historical receipt correctly refuses to describe it. I’m treating that as evidence—not overwriting the released heritage receipt—and checking the narrowest way to publish documentation without pretending the old candidate hash covers new files.
````

##### Response 13 (commentary)

- Timestamp: `2026-08-04T04:28:20.168Z`

````text
The narrow Site rebind now passes without rebuilding heritage data or rerunning unchanged browser/evaluation planes. It reuses the exact faithful, tiny, synthetic, and Explorer roots; only postmortem lint, bundle/viewer synchronization, OKF conformance, documentation links, Site inventory, capacity, and Site-tree identity were rerun. The receipt records that reuse explicitly, so the optimization is auditable rather than implicit.
````

##### Response 14 (commentary)

- Timestamp: `2026-08-04T04:31:08.133Z`

````text
The postmortem’s own publication failure is now part of the analysis, with one important safeguard: the report links to the exact Site receipt but does not embed the Site hash inside the Site closure. That avoids recreating the observer/self-reference loop the report identifies. I’m adding a bounded real-browser reading journey now because “Markdown rendered in the interface” needs more than a source-level link check.
````

##### Response 15 (commentary)

- Timestamp: `2026-08-04T04:34:31.539Z`

````text
Everything substantive is now green in preflight: 215 Python tests, the Foundry validator, postmortem lint/redaction, bundle/viewer synchronization, OKF conformance, and the analytical HTML’s responsive browser verifier. I’m taking the final trace snapshot and running one exact Site build plus one browser reading journey against that frozen output; after that I’ll hand back the report without publishing an unverified public URL.
````

##### Response 16 (final_answer)

- Timestamp: `2026-08-04T04:42:24.204Z`

````text
Completed on `codex/heritage-foundry-postmortem`.

The central finding is that the Evaluation Foundry retained plane hashes but dropped the parent Foundry’s executable producer→plane→consumer dependency graph. That made broad regeneration and full green test cycles the safest available response to late discoveries. PR #69 is the clearest evidence: only Presentation/publication material changed, but the complete browser, question, and journey suites ran again.

Deliverables:

- [Portable analytical HTML report]([LOCAL_ASSISTANT_HOME]/visualizations/2026/08/02/019fc471-90ec-7633-abde-8e72fcdd5280/heritage-foundry-postmortem/report.html)
- [Repository postmortem index]([LOCAL_REPO]/docs/postmortems/heritage-foundry-2026/index.md)
- [Full technical postmortem]([LOCAL_REPO]/docs/postmortems/heritage-foundry-2026/postmortem.md)
- [Complete public-safe prompt-response reader]([LOCAL_REPO]/docs/postmortems/heritage-foundry-2026/readers/conv-001-heritage-evaluation-foundry.md)
- [Selective-rerun architecture]([LOCAL_REPO]/docs/postmortems/heritage-foundry-2026/architecture.md)
- [Evidence and methodology]([LOCAL_REPO]/docs/postmortems/heritage-foundry-2026/evidence.md)

The trace includes all six visible user exchanges and every visible Codex commentary/final response, including the correction that GitHub authentication was valid outside the sandbox and the assurance that graph browsing was read-only. Hidden instructions, reasoning, tool payloads, credentials, and local evidence paths are excluded. Raw evidence—including three deployment archives preserved before expiry—remains in the ignored private evidence plane; public hashes and registers provide the audit trail.

Validation passed: 215 Python tests, Evaluation Foundry validation, generated-file/redaction/link lint, bundle and legacy-viewer synchronization, OKF conformance, exact Site assembly, and a real-browser journey through the rendered postmortem and conversation reader. The portable report separately passed canonical artifact validation and Chromium QA at desktop and narrow widths. The bare system `python3` lacked `jsonschema`; the same mandated project gates passed with the repository `.venv`.

The postmortem itself also proved the proposed optimization in miniature: a documentation-only Site-shell rebind reused unchanged heritage, tiny, synthetic, and Explorer roots while rerunning only the affected publication gates. That reuse is explicit in the machine receipt.

Nothing has been committed, pushed, or publicly deployed. I have not supplied a public postmortem URL because this exact branch has not passed a deployed identity and browser journey check.

::git-create-branch{cwd="[LOCAL_REPO]" branch="codex/heritage-foundry-postmortem"}
````

[Back to exchange map](#exchange-map)

### EX-0007

**Prompt:** Resolve the postmortem architecture questions

- User timestamp: `2026-08-04T07:14:19.203Z`
- Standalone note: [EX-0007](../exchanges/0007-resolve-the-postmortem-architecture-questions.md)

#### User Prompt

````text
## My request for Codex:
Discuss the **Further questions**
Should promotion/status metadata ever be inside a candidate rather than exclusively in a signed promotion envelope?
Which browser change classes need three engines per pull request, and which can move to nightly plus terminal-release assurance?
Should YAML-LD or JSON-LD be canonical, with the other materialized only at release time?
Should link validation be hash-sharded and refreshed on its own freshness schedule?
Which publication unit should own future exemplars before the current Pages closure reaches its limit?
````

#### Codex Response

##### Response 1 (final_answer)

- Timestamp: `2026-08-04T07:17:11.238Z`

````text
My recommended position is:

| Question | Recommendation |
|---|---|
| Promotion/status metadata | Keep workflow status outside the candidate in signed envelopes |
| Browser coverage | Risk-based per-PR selection; full three-engine assurance nightly and at release |
| YAML-LD vs JSON-LD | YAML-LD authoring source, normalized semantic model, generated JSON-LD interchange |
| Link validation | Separate deterministic structural checks from independently refreshed external evidence |
| Future exemplars | Separate domain-owned publication units; keep OKF Explorer as the shell and registry |

## 1. Promotion and status metadata

Promotion status should normally be exclusively in a signed promotion envelope.

The candidate may contain immutable facts about itself:

- candidate identifier and content roots;
- source-freeze and schema versions;
- generator and consumer contract versions;
- applicable promotion policy;
- its declared role, such as `candidate`.

It should not be rewritten to say `evaluated`, `published`, `superseded`, or `revoked`. Those are decisions or observations made about the candidate after it exists.

A promotion envelope should bind:

- candidate, Explorer and Site-component roots;
- stable test-result fingerprints;
- required policy version;
- deployment identity;
- approval or verification actor;
- observation timestamp;
- status and any expiry;
- signature.

Later envelopes can promote, supersede or revoke the same candidate without changing its bytes. The registry and interface can display the latest valid envelope while retaining the complete history.

The exception is domain status that was itself present in the source—for example, a heritage asset’s risk status at a particular date. That belongs in the candidate as a qualified assertion. It is distinct from the publication workflow’s status.

This separation is the most important decision because it removes the evidence→candidate observer loop.

## 2. Three-engine browser assurance

I would use three risk classes rather than treating “browser tests” as one indivisible suite.

| Change class | Pull-request assurance | Scheduled/release assurance |
|---|---|---|
| Browser runtime, routing, hydration, workers, storage, graph/map rendering, CSS/layout, accessibility interaction, browser dependencies or the journey runner itself | Affected journeys in Chrome, Firefox and WebKit | Complete three-engine suite at release |
| Generated data, search shards, semantic mappings, registry projections or presentation configuration with an unchanged consumer contract | Unit/contract checks plus a targeted Chromium consumer journey | Complete three-engine suite nightly and at release |
| Markdown, reports, evidence envelopes, release metadata and external-link observations | Render/link/Site checks; browser reading smoke when HTML changes | Nightly documentation journey and terminal publication journey |
| Pure schemas, Python processing or internal tooling that cannot affect published bytes | Deterministic and contract tests only | Covered transitively by periodic complete audits |

Some qualifications matter:

- Changes to browser-test infrastructure require all three engines because the evidence mechanism itself changed.
- CSS, focus management, downloads, service workers, URL restoration, SVG/canvas and worker behaviour deserve cross-engine PR testing.
- An authenticated check of a protected Historic England page is source-identity evidence, not an Explorer compatibility test. It generally needs one genuine browser, not three engines.
- Terminal release should retain the complete matrix until the impact planner has accumulated strong historical and mutation evidence.

Thus PR #69 should have received registry, Site, reading-page and terminal-publication checks—not the complete corpus and Explorer matrix.

## 3. YAML-LD or JSON-LD canonical form

“Canonical” should be separated into three meanings:

1. **Authoring source:** constrained YAML-LD front matter in Markdown.
2. **Semantic identity:** a normalized graph/data model independent of serialization.
3. **Interchange format:** generated JSON-LD.

YAML-LD is the right authoring source here because Markdown is already the repository’s source of truth and YAML is approachable for beginners and curators. But it must be a deliberately constrained, lossless YAML representation of the JSON-LD data model—not an alternative semantic language.

The normalized graph should determine semantic equality and semantic roots. Raw YAML bytes should have their own source hash, but formatting, key ordering or quoting changes should not imply a different graph when the meaning is unchanged.

I would not generate JSON-LD only at release time. That would move projection defects—such as the YAML quoting issue already encountered—to the latest possible stage. Instead:

- generate and validate affected JSON-LD shards whenever semantic inputs change;
- reuse unchanged content-addressed projections;
- assemble the complete JSON-LD release view at promotion time.

The Explorer should consume the normalized contract rather than depending on YAML parser behaviour. JSON-LD then remains the standards-facing interchange form without forcing authors to maintain two equivalent sources.

## 4. Link-validation sharding and freshness

Yes, but internal and external links need different treatment.

Internal Site links are deterministic build dependencies. They should be checked immediately for affected pages against a complete route/fragment index. They do not need a freshness schedule.

External links should have two separate artifacts:

- a stable **link-intent manifest** in the candidate, containing the canonical URL, expected identifier or page identity, source record and criticality;
- timestamped **observation receipts** outside the candidate, containing response status, redirects, final URL, identity match, access method, ETag/Last-Modified where available, and expiry.

Storage should be hash-sharded by canonical URL, with a reverse index from records to link hashes. This means:

- a changed record rewrites only its adjacency and relevant link shards;
- the same official URL is checked once even if many records use it;
- domain grouping can still control concurrency and rate limits;
- a refreshed observation does not alter the corpus or Site candidate.

Freshness should be risk-based:

- critical identity/provenance links: required at terminal promotion and refreshed relatively frequently;
- ordinary official references: scheduled refresh with a longer lifetime;
- immutable commit/tag evidence: validate at publication;
- transient authentication, throttling and server errors: retry/classify without immediately treating them as broken identity.

Promotion should fail when a required critical observation is expired or conclusively broken—not merely because an optional contextual link is temporarily unavailable.

This would replace the current 19.5 MB monolithic link-validation output with bounded, reusable evidence.

## 5. Publication ownership for future exemplars

No further production-scale exemplar should be added to the current `okf-explorer` Pages closure. The current local Site is 988,193,432 bytes, leaving only 11,806,568 bytes below its configured one-billion-byte guard.

I would separate ownership as follows:

- `okf-explorer`: application shell, general documentation, schemas, registry and compatibility routes;
- one independently deployed unit per exemplar family or domain lifecycle;
- a separate promotion/evidence channel referencing both the Explorer build and exemplar roots.

For this exemplar, a natural unit would be something like `okf-heritage-coventry-warwickshire`, containing:

- faithful corpus;
- tiny assurance fixture;
- isolated synthetic supplement;
- domain documentation and semantic exports;
- its own releases, Pages deployment and receipts.

The central registry would point to its descriptor and latest signed promotion envelope. A thin compatibility route could remain in `okf-explorer`.

The boundary should follow ownership and update cadence, not merely file size. Two packs belong together only when they share:

- source freeze and refresh schedule;
- curator or accountable owner;
- rights/access policy;
- schema/profile lifecycle;
- promotion and rollback decision.

I would introduce a soft capacity threshold—well below the hard limit—so ordinary updates and evidence never consume the last few percent of headroom. Existing heritage material can migrate after byte-for-byte and browser parity is proved; future exemplars should use the separated model immediately.

Taken together, these decisions produce a clean architecture: human-authored YAML-LD generates independently rooted data components; JSON-LD is a validated projection; the Explorer is a separately rooted consumer; external observations and promotion decisions live in signed envelopes; and an impact planner chooses only the affected build and assurance cones.
````

[Back to exchange map](#exchange-map)

### EX-0008

**Prompt:** Implement every recommended refactoring and publication control

- User timestamp: `2026-08-04T07:21:33.342Z`
- Standalone note: [EX-0008](../exchanges/0008-implement-every-recommended-refactoring-and-publication-control.md)

#### User Prompt

````text
## My request for Codex:
Implement all the '**Recommended next steps'**
````

#### Codex Response

##### Response 1 (commentary)

- Timestamp: `2026-08-04T07:22:11.677Z`

````text
I’m treating “all” literally: profile/schema v2, impact planning, candidate/evidence separation, modular and sharded generation, early adversarial fixtures, conditional CI, component Site assembly, publication-unit separation, and enforceable release provenance. I’m using the GitHub repository workflow skill because the result spans code, workflows, release policy, and publication topology; I’ll preserve the current postmortem changes and make each optimization fail-closed and independently testable.
````

##### Response 2 (commentary)

- Timestamp: `2026-08-04T07:25:15.784Z`

````text
The first implementation pass is now split cleanly: profile/planner, corpus emitters, and Site/CI/release topology are proceeding in parallel. I’m building the early adversarial gate separately so each of the 13 late-finding classes has a tiny executable counterexample before any full corpus or browser run.
````

##### Response 3 (commentary)

- Timestamp: `2026-08-04T07:34:41.586Z`

````text
GitHub’s current platform controls do support this directly: repository-level release immutability now has a documented API, and immutable releases automatically bind the tag, assets, commit and a signed release attestation. I’m treating that as an actual terminal gate—not merely wording in a policy file—and will enable it before publishing the new release unit.
````

##### Response 4 (commentary)

- Timestamp: `2026-08-04T07:47:46.747Z`

````text
The modular build now has a verified no-op second pass and safe stale-file handling. I’m resolving the last cross-cutting contract now: Site assurance will consume a signed, digest-bound promotion envelope outside the candidate, so publication status never leaks back into candidate data.
````

##### Response 5 (commentary)

- Timestamp: `2026-08-04T07:53:15.477Z`

````text
The goal is now explicitly active for the full implementation and publication outcome. The early gate covers all 13 reconstructed late defects; the modular faithful build is down from 176 MB to 129 MB and a repeat build writes zero files. I’m holding the one expensive canonical regeneration until the profile, CI and publication contracts have converged.
````

##### Response 6 (commentary)

- Timestamp: `2026-08-04T08:07:11.558Z`

````text
All authoring contracts are now converged: Profile v2 and historical shadow replay pass, candidate metadata is observation-free, the interaction journeys are intact, and the frozen snapshots carry the external namespace directly. I’m starting the single canonical family regeneration now; this is the intentional expensive step the refactor is designed to avoid repeating.
````

##### Response 7 (commentary)

- Timestamp: `2026-08-04T08:13:12.423Z`

````text
The implementation is now in integration rather than design: the modular Foundry builder, Profile v2 impact planner, adversarial microfixtures, external publication unit, and candidate/evidence separation are in place. I’m completing the Site/CI integration and postmortem trace in parallel, then I’ll run the full local gates before creating and verifying the independent public exemplar and immutable release.
````

##### Response 8 (commentary)

- Timestamp: `2026-08-04T08:13:43.823Z`

````text
A focused export test has confirmed that the independent publication unit preserves every candidate byte and Merkle/root receipt while rewriting only relocated fixture references. The earlier temporary export was stale, so I’m rematerializing it now and will verify that no main-repository paths survive in the external profile.
````

##### Response 9 (commentary)

- Timestamp: `2026-08-04T08:22:52.174Z`

````text
The Site/CI workstream has landed with 43 focused checks: ordinary pull requests are impact-planned, full three-engine assurance is retained nightly/manual, Site components are content-addressed, and link observations are kept outside candidate bytes. Integration exposed and fixed one additional late-path defect: the published profile’s authoring-relative paths escaped the external publication root; both the rooted profile and exported fixture now resolve correctly.
````

##### Response 10 (commentary)

- Timestamp: `2026-08-04T08:39:50.111Z`

````text
I’m continuing from the current implementation and audit state. I’m treating the new audit findings as release blockers: candidate/promotion separation, real selector consumption, YAML-LD canonicalization, receipt freshness/semantics, and the two-release closure all need to be made executable—not merely documented—before publication.
````

##### Response 11 (commentary)

- Timestamp: `2026-08-04T08:48:58.689Z`

````text
The release design is now being converted from one self-referential release into a cycle-free protocol: immutable candidate release → fresh terminal assurance → immutable promotion release. The promotion envelope will bind the first release and its evidence; verification of the second release remains an external observation, which avoids an impossible “release proves itself before it exists” loop.
````

##### Response 12 (commentary)

- Timestamp: `2026-08-04T09:01:00.105Z`

````text
The modular/early-gate work is now materially in place: impact receipts are recomputed rather than trusted, historical shadow cases execute as tests, candidate evidence is excluded from both Site and external export, selector outputs drive actual browser suites, and YAML-LD now round-trips through a normalized graph identity before JSON-LD materialization. I’m moving through integration failures now before any public state is created.
````

##### Response 13 (commentary)

- Timestamp: `2026-08-04T09:03:18.516Z`

````text
I’m continuing the implementation from the remaining focused failures: first I’m making validation-only journeys independent of mutable assurance evidence, then I’ll regenerate the complete corpus and receipts, run the full gate matrix, and publish/verify the two-release external exemplar.
````

##### Response 14 (commentary)

- Timestamp: `2026-08-04T09:06:00.558Z`

````text
The first failure exposed a useful boundary bug rather than just stale output: the exported journey manifest still carried central-repository bundle paths. I’m correcting that so the same manifest resolves `/`, `/tiny/`, and `/synthetic/` beneath whichever publication root is under test, while receipt deferral is now an explicit validation-only mode rather than an implicit weakening.
````

##### Response 15 (commentary)

- Timestamp: `2026-08-04T09:08:56.841Z`

````text
The deterministic corpus checks now pass across all three families; only the intentionally timestamped local evidence receipt is stale. I’m rebuilding the Explorer and Site first, then I’ll regenerate that receipt from fresh browser results instead of editing its hashes by hand. In parallel, I’ve asked for independent audits of the release workflows, terminal browser wiring, and YAML-LD export closure.
````

##### Response 16 (commentary)

- Timestamp: `2026-08-04T09:15:55.209Z`

````text
The independent audits found three genuine late-stage blockers, and they’re exactly the kind the refactor is meant to surface early: v2 semantic roots were being rechecked with the v1 byte-root algorithm; publication-root journey paths were being interpreted as repository-root paths; and the external terminal workflow pointed at a nonexistent root JavaScript project. I’m fixing these as shared validation/runtime contracts before generating any release evidence.
````

##### Response 17 (commentary)

- Timestamp: `2026-08-04T09:21:48.643Z`

````text
I’m continuing the implementation from the audit findings. I’ll close the release-workflow and evidence-integrity gaps first, then run the full deterministic/browser suite and publish only after the exact public URLs pass identity and journey checks.
````

##### Response 18 (commentary)

- Timestamp: `2026-08-04T09:22:54.423Z`

````text
The main remaining security concern is now narrow: a successful attestation must prove the exact workflow, tag ref, source commit, and complete immutable release asset set—not merely “some attestation from this repository.” I’m tightening that contract and its regression tests while the other integrity fixes land in parallel.
````

##### Response 19 (commentary)

- Timestamp: `2026-08-04T09:29:51.990Z`

````text
GitHub authentication is confirmed valid in the external execution context under `chris-page-gov`; the earlier token diagnosis was sandbox-specific. I’ll use that context only when the candidate has passed its local gates.
````

##### Response 20 (commentary)

- Timestamp: `2026-08-04T09:33:10.251Z`

````text
The release templates now fail closed on the exact triggering tag ref, resolved assurance commit, workflow identity, engine result files, and complete release asset closure. The focused topology suite is green; I’m reviewing the integrated paths next so the separate changes agree on one receipt schema.
````

##### Response 21 (commentary)

- Timestamp: `2026-08-04T09:36:59.168Z`

````text
I’m using the GitHub publication skill now because the next safe early check is external repository capability—not content publication. This lets me detect Pages or immutable-release account constraints before a late release cycle.
````

##### Response 22 (commentary)

- Timestamp: `2026-08-04T09:37:37.841Z`

````text
The independent public repository now exists at [chris-page-gov/okf-heritage-coventry-warwickshire](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire). It is intentionally still empty: Pages is not yet configured, and immutable releases report `enabled: false`; I’m treating those as pre-publication gates, not silently publishing an unverified candidate.
````

##### Response 23 (commentary)

- Timestamp: `2026-08-04T09:39:27.205Z`

````text
The application contract is green: 276 Vitest cases, 32 Node contract cases, Svelte diagnostics, and the pinned SBOM all pass. I’m now moving the exhaustive link observation forward—before release—so any source failure is caught against the current 64-shard manifest rather than discovered in terminal promotion.
````

##### Response 24 (commentary)

- Timestamp: `2026-08-04T09:40:48.657Z`

````text
The exhaustive observer is still running normally; it emits only at completion because the 7,000-plus canonical URL checks are concurrent and receipt-oriented. No failure output has appeared. Separately, the new local evidence materializer is being made conservative: it will claim one independently verifiable build tree unless a second-build receipt actually exists, eliminating the former unverifiable “two builds” claim.
````

##### Response 25 (commentary)

- Timestamp: `2026-08-04T09:42:36.472Z`

````text
The preflight is network-bound rather than CPU-bound and remains within its declared timeout/cycle budget. The new repository’s capability audit also confirms the expected starting state—Actions available, Pages absent, immutable releases disabled—so bootstrap can be explicit and testable before the first workflow-bearing push.
````

##### Response 26 (commentary)

- Timestamp: `2026-08-04T09:46:46.562Z`

````text
The early full-link preflight did exactly what it was meant to do: it found a release-blocking policy mismatch before R1. Of 13,505 canonical URLs, 7,288 returned success; 5,961 Historic England links returned their protected-origin `403`, and 256 links point to the not-yet-deployed external Pages site. I’m encoding the 403 case as an explicit host/risk/status policy outcome tied to source identity—not as generic success—while the 256 deployment URLs must remain hard failures until Pages exists.
````

##### Response 27 (commentary)

- Timestamp: `2026-08-04T09:48:33.130Z`

````text
The external platform gates are now configured before content publication: Pages is Actions-only with HTTPS, immutable releases are enabled, and Actions requires full-SHA action pinning. The repository contains only an empty bootstrap commit; the planned Pages URL is still correctly treated as unpublished and unverified.
````

##### Response 28 (commentary)

- Timestamp: `2026-08-04T09:50:31.378Z`

````text
I’m continuing the full implementation and publication sequence. The local assurance evidence is now generated by a strict, deterministic receipt builder; I’m closing the early link-policy gap next, then I’ll run the full corpus, Site, browser, release, and public-URL gates before treating any recommendation as complete.
````

##### Response 29 (commentary)

- Timestamp: `2026-08-04T09:52:09.315Z`

````text
The early link run exposed a useful distinction: Historic England’s machine endpoint returns a deliberate 403 for 5,961 otherwise well-formed official links, while undeployed exemplar URLs correctly remain hard 404 failures. I’ve encoded only that exact host/risk/status tuple as a policy-declared “protected origin”; mutation tests must prove that no broader 403/404 exception can slip through.
````

##### Response 30 (commentary)

- Timestamp: `2026-08-04T09:52:41.500Z`

````text
The complete Python suite is now 291/293 passing. The only two failures are intentional stale-evidence guards: the checked-in local receipt still names the pre-refactor corpus and Explorer build. I’m moving into the real-browser run now; its exact results will be used to replace that receipt, after which those guards should close without weakening them. I’m using the Playwright workflow because this gate must exercise the rendered interface, not just inspect generated files.
````

##### Response 31 (commentary)

- Timestamp: `2026-08-04T09:53:23.429Z`

````text
The modular Site builder stopped exactly as designed: it found a Finder `[LOCAL_STATE_FILE]` inside generated `_site/legislation` and refused to overwrite/delete an unexplained local file. That file is outside the publication source, ignored by Git, and forbidden by the repository policy; I’m removing only that exact disposable artifact, then rerunning the assembly rather than wiping the Site.
````

##### Response 32 (commentary)

- Timestamp: `2026-08-04T10:00:09.915Z`

````text
The browser run is now exercising the independently exported unit (not the central Site shell): faithful, tiny, and synthetic bundles sit at the publication root, exactly as they will on the dedicated Pages site. That exposed and corrected one more stale local-assurance assumption—the receipt validator had still hard-coded the pre-extraction `/evaluation/heritage/…` layout.
````

##### Response 33 (commentary)

- Timestamp: `2026-08-04T10:04:57.500Z`

````text
The first browser probe correctly failed rather than producing false assurance: the dedicated unit is a data-and-reading publication, while the interactive runtime remains owned by OKF Explorer. I’m now testing the actual architecture as a same-origin local composite—Explorer runtime plus the exported unit under `/publication/`. In parallel, I’ve assigned exact-link closure and “adversarial gate first” CI ordering as two bounded fixes from the final gap audit.
````

##### Response 34 (commentary)

- Timestamp: `2026-08-04T10:08:52.236Z`

````text
The complete functionality run passed: all 100 questions scored at least 80, with a 92.7 average. That includes Coventry/Warwickshire place discovery, designations, historical risk states, graph relationships, authority/provenance, alternative spellings, and deliberate misspellings. I’m now running the three exact interaction journeys for faithful, tiny, and synthetic-isolation bundles.
````

##### Response 35 (commentary)

- Timestamp: `2026-08-04T10:14:57.537Z`

````text
The deterministic corpus checks are clean: 7,640 faithful records plus the 3-record tiny fixture and 3-record synthetic supplement all reproduce their exact release roots; all 13 reconstructed late-finding microfixtures also pass. The remaining local closure is the expanded all-links gate, followed by the full integrated test matrix and exact export.
````

##### Response 36 (commentary)

- Timestamp: `2026-08-04T10:17:31.229Z`

````text
Local acceptance is now fully green: 297 Python tests, 276 UI unit tests, 32 Node contract tests, zero Svelte diagnostics, a deterministic Explorer build, and the 100-question/three-journey browser evidence. The exact export now contains 4,050 materials and its all-links universe is 13,548 URLs; the publication gate will not accept a partial faithful-only receipt.
````

##### Response 37 (commentary)

- Timestamp: `2026-08-04T10:19:47.881Z`

````text
I’ve reached the first publishable candidate boundary. The worktree has only in-scope source, generated corpus, assurance, workflow, report, and test changes; no file exceeds 80 MB, and ignored raw logs/Finder metadata remain outside Git. I’m staging this exact closure now so the remote assurance commit can be referenced by the independent release workflow.
````

##### Response 38 (commentary)

- Timestamp: `2026-08-04T10:21:07.974Z`

````text
The central assurance commit is now pushed and draft PR #70 exists. I’m keeping it draft while the independent publication runs: the external workflows will pin central commit `8aeca7d8…`, so their evidence cannot drift to later branch content. Next I’m watching PR CI and materializing that same candidate into the dedicated repository.
````

##### Response 39 (commentary)

- Timestamp: `2026-08-04T10:22:13.833Z`

````text
The external manifest checker caught one transient Python bytecode file that its own import created inside `site/scripts`. That is not candidate content and is precisely why the bootstrap runbook specifies bytecode-disabled validation; I’m removing only that generated `.pyc`, rerunning with bytecode disabled, and leaving the export manifest unchanged.
````

##### Response 40 (commentary)

- Timestamp: `2026-08-04T10:23:25.515Z`

````text
The external candidate is pushed and its validation/Pages runs have started. One release workflow produced an immediate startup failure on the ordinary `main` push—before R1—so I’m treating that as a workflow-definition defect and inspecting only that failed plane; the candidate and Site bytes are unchanged.
````

##### Response 41 (commentary)

- Timestamp: `2026-08-04T10:26:16.521Z`

````text
I’m continuing the implementation through the publication chain, beginning with the invalid candidate-tag trigger found during the first independent-repository run. I’ll limit this correction to the workflow/test dependency cone, then resume exact-commit Pages, release, terminal-assurance, promotion, and report closure.
````

##### Response 42 (commentary)

- Timestamp: `2026-08-04T10:26:57.290Z`

````text
The failure is confirmed as GitHub’s trigger-pattern syntax, not a corpus or bundle defect. The broad tag trigger is now paired with the existing strict release-policy validator, so malformed dates still fail closed without forcing any data rebuild.
````

##### Response 43 (commentary)

- Timestamp: `2026-08-04T10:28:14.077Z`

````text
The independent repository is now running candidate validation and Pages deployment for exact commit `51881ccc…`. The previous full-candidate commit itself passed both checks; only its malformed release-trigger declaration failed, which confirms the correction stayed isolated from the 4,050-material publication.
````

##### Response 44 (commentary)

- Timestamp: `2026-08-04T10:29:52.966Z`

````text
Exact-commit candidate validation and Pages deployment both passed for `51881ccc…`, and GitHub’s deployment record binds the public environment to that SHA. I’m now freezing this same commit as the immutable R1 candidate; the release contains no promotion/status metadata by design.
````

##### Response 45 (commentary)

- Timestamp: `2026-08-04T10:30:39.363Z`

````text
R1 reached the platform but failed during release construction, so I’m stopping the promotion chain at that boundary and inspecting the exact failing step. The deployed candidate remains unchanged and valid; I won’t retag or rebuild until the failure’s dependency cone is known.
````

##### Response 46 (commentary)

- Timestamp: `2026-08-04T10:35:26.695Z`

````text
Two live runs have now exposed exactly the late-stage coupling the refactor was meant to reveal: Python contracts implicitly depended on a locally prebuilt app, and browser tests implicitly depended on generated SvelteKit state. Both are being converted into explicit, early artifact/setup dependencies. Separately, the release control is being revised so GitHub’s least-privilege workflow token never needs repository-administration access; immutable release evidence will come from the published release and its signed release attestation.
````

##### Response 47 (commentary)

- Timestamp: `2026-08-04T10:38:48.614Z`

````text
The release redesign is converging on a clean separation: the tagged commit remains the immutable publication subject, while the updated workflow and an exact Explorer commit form a separately recorded assurance control plane. This also lets workflow-only commits avoid redeploying Pages, preserving the already-proved candidate deployment SHA.
````

##### Response 48 (commentary)

- Timestamp: `2026-08-04T10:44:29.203Z`

````text
The first live dependency correction is now proven: Python contracts consumed the uploaded app artifact and all 297 tests passed. The three-engine browser job also passed its newly explicit SvelteKit materialization step and is still executing the terminal-equivalent journeys.
````

[Back to exchange map](#exchange-map)
