---
"@context":
  - https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/context.jsonld
  - https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/semantic-context.jsonld
"@id": https://chris-page-gov.github.io/okf-explorer/docs/postmortems/heritage-foundry-2026/conversation-summary.html
"@type": https://schema.org/Report
type: Report
title: "Heritage Foundry conversation contribution summary"
description: "Exchange-level summary of user direction and Codex implementation contributions."
generated:
  by: process:heritage-foundry-postmortem-builder
  at: "2026-08-04T05:00:00Z"
assertion_status: normalized
assertion_scope: real-world
tags:
  - postmortem
  - conversation
  - contributions
---
# Heritage Foundry Conversation Contribution Summary

The user supplied the outcome, source/geographic boundary, quality bar,
unattended authority, correction of the sandbox authentication diagnosis and the
postmortem/refactoring question. The user then required explicit answers to the
architecture questions and authorized implementation of every recommendation.
Codex inferred and implemented the detailed producer, Explorer, validation,
selective-assurance and publication machinery, then exposed late findings and
pending public-promotion gates through commentary rather than hiding them from
the trace.

| Exchange | Prompt | User contribution | Codex contribution |
|---|---|---|---|
| [EX-0001](exchanges/0001-assess-access-and-define-the-heritage-evaluation-foundry.md) | Assess access and define the heritage Evaluation Foundry | Set the evaluation goal, regional scope, source family and search-quality bar. | Inspected repository, source, browser and geospatial evidence and bounded the unknowns. |
| [EX-0002](exchanges/0002-explain-the-separate-tiny-assurance-fixture.md) | Explain the separate tiny assurance fixture | Asked for the assurance fixture to be explained as a separate product. | Separated producer/consumer correctness evidence from regional completeness and synthetic illustration. |
| [EX-0003](exchanges/0003-implement-and-publish-the-complete-heritage-exemplar.md) | Implement and publish the complete heritage exemplar | Authorized the full unattended build, YAML-LD extension, Site publication and Explorer changes. | Collected evidence and produced the engineering postmortem and selective-rerun design. |
| [EX-0004](exchanges/0004-correct-the-github-authentication-diagnosis.md) | Correct the GitHub authentication diagnosis | Corrected a sandbox-specific authentication diagnosis before it became a false blocker. | Separated producer/consumer correctness evidence from regional completeness and synthetic illustration. |
| [EX-0005](exchanges/0005-confirm-graph-browsing-cannot-mutate-the-bundle.md) | Confirm graph browsing cannot mutate the bundle | Raised a data-integrity concern after interacting with the public graph. | Separated producer/consumer correctness evidence from regional completeness and synthetic illustration. |
| [EX-0006](exchanges/0006-create-the-end-to-end-engineering-postmortem.md) | Create the end-to-end engineering postmortem | Requested evidence collection, process analysis, refactoring options and a complete trace. | Collected evidence and produced the engineering postmortem and selective-rerun design. |
| [EX-0007](exchanges/0007-resolve-the-postmortem-architecture-questions.md) | Resolve the postmortem architecture questions | Asked for explicit decisions on candidate status, browser tiers, semantic canonicalization, link freshness and exemplar ownership. | Resolved the five architecture questions as one coherent candidate, assurance and publication model. |
| [EX-0008](exchanges/0008-implement-every-recommended-refactoring-and-publication-control.md) | Implement every recommended refactoring and publication control | Authorized implementation of every postmortem recommendation, including the release-integrity and external-publication controls. | Implemented the v2 profile, planner, modular outputs, early fixtures, conditional assurance, external unit and release policy, with public promotion kept pending until terminal verification. |


Read the [complete start-to-finish trace](readers/conv-001-heritage-evaluation-foundry.md)
for the actual prompts and responses rather than relying on this synthesis.
