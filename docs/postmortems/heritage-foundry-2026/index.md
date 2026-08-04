---
"@context":
  - https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/context.jsonld
  - https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/semantic-context.jsonld
"@id": https://chris-page-gov.github.io/okf-explorer/docs/postmortems/heritage-foundry-2026/index.html
"@type": https://schema.org/Report
type: Report
title: "Heritage Evaluation Foundry engineering postmortem"
description: "Evidence-backed process analysis, complete trace and selective-rerun implementation register."
generated:
  by: process:heritage-foundry-postmortem-builder
  at: "2026-08-04T05:00:00Z"
assertion_status: normalized
assertion_scope: real-world
tags:
  - postmortem
  - evaluation-foundry
  - process-improvement
---
# Heritage Evaluation Foundry Engineering Postmortem

This package reconstructs the Coventry and Warwickshire heritage exemplar from the task conversation, local Git history, three pull requests, six GitHub Actions baseline runs, three retained Pages artifacts, nine R1/terminal/R2 closure runs and both immutable release closures.

## Start Here

- [Technical postmortem](postmortem.md)
- [End-to-end process timeline](process-timeline.md)
- [Implemented dependency and assurance architecture](architecture.md)
- [Evidence and publication boundary](evidence.md)
- [Methodology and metric definitions](methodology.md)
- [Conversation summary](conversation-summary.md)
- [Full prompt-response reader](readers/conv-001-heritage-evaluation-foundry.md)

## Headline Measures

| Measure | Value | Definition |
|---|---|---|
| Original PR/Pages runs | 6 | All successful, all attempt 1 |
| R1/terminal/R2 attempts | 9 | 5 passed; 4 fail-closed findings |
| GitHub workflow wall time | 43m 41s | Three CI plus three Pages runs |
| PR file touches | 4,280 | Includes repeated generated files |
| Late findings reconstructed | 13 | Local audits and public gates |
| Final Site | 14,010 files | 987,329,754 bytes |
| Visible prompt-response exchanges | 8 | 302 Codex responses at extraction |

## Prompt-Response Exchanges

| Exchange | Prompt | Responses |
|---|---|---:|
| [EX-0001](exchanges/0001-assess-access-and-define-the-heritage-evaluation-foundry.md) | Assess access and define the heritage Evaluation Foundry | 6 |
| [EX-0002](exchanges/0002-explain-the-separate-tiny-assurance-fixture.md) | Explain the separate tiny assurance fixture | 1 |
| [EX-0003](exchanges/0003-implement-and-publish-the-complete-heritage-exemplar.md) | Implement and publish the complete heritage exemplar | 5 |
| [EX-0004](exchanges/0004-correct-the-github-authentication-diagnosis.md) | Correct the GitHub authentication diagnosis | 131 |
| [EX-0005](exchanges/0005-confirm-graph-browsing-cannot-mutate-the-bundle.md) | Confirm graph browsing cannot mutate the bundle | 54 |
| [EX-0006](exchanges/0006-create-the-end-to-end-engineering-postmortem.md) | Create the end-to-end engineering postmortem | 16 |
| [EX-0007](exchanges/0007-resolve-the-postmortem-architecture-questions.md) | Resolve the postmortem architecture questions | 1 |
| [EX-0008](exchanges/0008-implement-every-recommended-refactoring-and-publication-control.md) | Implement every recommended refactoring and publication control | 88 |

## Machine-Readable Registers

- [Session register](data/session-register.json)
- [Exchange register](data/exchange-register.json)
- [Relevant local command events](data/command-event-register.json)
- [GitHub run register](data/github-run-register.json)
- [R1/terminal/R2 attempt register](data/publication-attempt-register.json)
- [Rebuild-cycle register](data/rebuild-cycle-register.json)
- [Evidence register](data/evidence-register.json)
- [Current PR/publication/release evidence](data/current-publication-evidence.json)
- [Report metrics](data/report-metrics.json)
- [Implementation and acceptance register](data/implementation-acceptance-register.json)
- [Architecture and release decisions](data/architecture-decisions.json)
- [Publication decisions](data/publication-decisions.json)
- [Publication lint](data/publication-lint-report.json)
