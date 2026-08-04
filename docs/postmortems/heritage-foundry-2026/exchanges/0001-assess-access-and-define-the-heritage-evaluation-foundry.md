---
"@context":
  - https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/context.jsonld
  - https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/semantic-context.jsonld
"@id": https://chris-page-gov.github.io/okf-explorer/docs/postmortems/heritage-foundry-2026/exchanges/0001-assess-access-and-define-the-heritage-evaluation-foundry.html
"@type": https://schema.org/Conversation
type: Conversation
title: "Assess access and define the heritage Evaluation Foundry"
description: "Redacted prompt-response exchange EX-0001 from the heritage Foundry task."
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
# EX-0001: Assess access and define the heritage Evaluation Foundry

[start-to-finish reader](../readers/conv-001-heritage-evaluation-foundry.md) | [EX-0002](0002-explain-the-separate-tiny-assurance-fixture.md)

## Publication Boundary

This is a public-safe derivative of the visible task conversation. It excludes hidden instructions, private reasoning, tool arguments, tool outputs, credentials and local evidence paths. Commentary and final responses are preserved.

## User Prompt

- Timestamp: `2026-08-02T21:46:49.261Z`

````text
Review repo state, branches/worktrees/PRs and issues, I want to create a derivative of the Foundry documented process (docs/beginners/19-foundry-authoring-and-domain-profiles.md) which suits a functionality evaluation for a set of sources which would fulfil the conversation with ChatGPT here https://chatgpt.com/s/t_6a6fb49b51188191ba36529e6691cd05

I suggest drafting the process, testing that with the recommended National Heritage sample for everything that can be found in Coventry and Warwickshire with each and every feature maximised so that the power of the system is demonstrated and their questions, based on prior knowledge, will be able to be answered. Ensure there is extensive coverage of terms and names in the search index that tolerates alternatives and misspelling.

Do you have access to everything you need?
````

## Codex Response

### Response 1 (commentary)

- Timestamp: `2026-08-02T21:46:57.868Z`

````text
I’ll first establish the repository’s exact local/GitHub state, then inspect the referenced Foundry process and the shared ChatGPT conversation. I’m using the GitHub repository workflow skill because branches, worktrees, PRs, and issues are central to deciding whether we can begin cleanly and what existing work must be preserved.
````

### Response 2 (commentary)

- Timestamp: `2026-08-02T21:47:25.436Z`

````text
The checkout is clean and `main` exactly matches `origin/main`, but there are two active auxiliary worktrees and several historical/local branches. I’m checking their divergence and the live GitHub PR/issue state now, so any proposed derivative can start from the right base without colliding with unfinished work.
````

### Response 3 (commentary)

- Timestamp: `2026-08-02T21:48:01.293Z`

````text
GitHub is clear: there are no open PRs, six open roadmap issues, and all local feature branches—including both checked-out auxiliary worktrees—are already merged into `main`. The only access question so far is the ChatGPT share link: the generic fetch path cannot retrieve it, so I’m using the Chrome session workflow to determine whether the conversation is available through your authenticated browser context.
````

### Response 4 (commentary)

- Timestamp: `2026-08-02T21:49:58.296Z`

````text
I can read the full shared conversation through the authenticated browser session. Its target is unambiguous: a separate “Evaluation Foundry,” proved on protected heritage across Coventry and Warwickshire, with faithful data plus clearly labelled synthetic supplementation only where needed. I’m now verifying that the authoritative heritage sources expose enough text, geography, relationships, dates, risk history, and reuse rights to satisfy that target—not just that the pages exist.
````

### Response 5 (commentary)

- Timestamp: `2026-08-02T21:52:47.271Z`

````text
The source check has exposed one important design constraint. Historic England’s public FeatureServer is excellent for identifiers, names, grades, designation/amendment dates, links, and geometry, while individual List pages add the rich OGL text, authorities, parishes, reasons, sources, and legal context. They are not one equivalent bulk feed. I’m using the UK geospatial semantic-layer workflow to pin the exact Coventry-plus-Warwickshire administrative scope and avoid treating a place-name search as a completeness denominator.
````

### Response 6 (final_answer)

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

## Contribution Reading

- User contribution: Set the evaluation goal, regional scope, source family and search-quality bar.
- Codex contribution: Inspected repository, source, browser and geospatial evidence and bounded the unknowns.

[start-to-finish reader](../readers/conv-001-heritage-evaluation-foundry.md) | [EX-0002](0002-explain-the-separate-tiny-assurance-fixture.md)
