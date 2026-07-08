# OKF Explorer Documentation

This folder is the operating manual for the OKF Explorer, the UK Government
APIs exemplar, and related large-corpus OKF packs.

## Start Here

- [Repository guide](repository-guide.md) explains where the important files
  live and how the publication pipeline fits together.
- [Use the OKF Explorer](use-okf-explorer.md) remains the short path from a
  bundle URL to the hosted Explorer.
- [Illustrated Explorer manual](okf-explorer-persona-manual.md) describes the
  UI through user stories and screenshots.
- [Use an AI with an OKF pack](ai-okf-usage.md) gives prompts and data-access
  rules for asking questions over a pack without losing provenance.
- [Create OKF bundles](okf-bundle-authoring.md) explains how to build bundles
  that take full advantage of Explorer facets, search, graph, timeline,
  resources and right-card metadata.
- [20 minute demo script](demo-script-2026-07-09.md) is the prepared run of
  show-and-tell for the 2026-07-09 demonstration.

## Quality And Review

- [OKF Explorer evaluation harness](okf-explorer-evaluation.md) defines the
  100-question scoring suite, accessibility checks, GOV.UK-aligned publication
  rubric and visual-regression evidence.
- [OKF pack parity](okf-pack-parity.md) keeps the UK Government APIs and GOV.UK
  CKAN packs aligned as paired exemplars.
- [OKF conformance](okf-conformance.md) records the v0.1 conformance boundary
  and intentional deviations.
- [Explorer overview context](explorer-overview-context.md) specifies the
  generated overview/analysis contract consumed by the Explorer.

## Dated Review Records

- [Code review, 2026-07-07](code-review-2026-07-07.md) is the original review
  report. It is preserved as historical evidence and is superseded for current
  pack status.
- [Code review follow-up, 2026-07-08](code-review-2026-07-08.md) records the
  remediation, publication checks and current pack checkpoint.

## Research Basis

The documentation and evaluation rubric are deliberately aligned with current
public service guidance rather than only internal engineering preferences:

- GOV.UK Service Standard: understand users and their needs; solve a whole
  problem; make the service simple to use; make sure everyone can use it; use
  open standards and common platforms; protect privacy and security; define
  success measures; and operate a reliable service.
- GOV.UK accessibility guidance: services should meet WCAG 2.2 level AA,
  account for common assistive technologies, and use both automated and manual
  testing.

Useful references:

- [GOV.UK Service Standard](https://www.gov.uk/service-manual/service-standard)
- [GOV.UK accessibility introduction](https://www.gov.uk/service-manual/helping-people-to-use-your-service/making-your-service-accessible-an-introduction)
- [GOV.UK Design System accessibility strategy](https://design-system.service.gov.uk/community/accessibility-strategy/)

## Public URLs

Hosted Svelte Explorer with the UK Government APIs exemplar:

```text
https://chris-page-gov.github.io/ai-infrastructure-wiki/next/?bundle=https%3A%2F%2Fchris-page-gov.github.io%2Fai-infrastructure-wiki%2Fuk-government-apis%2Fokf-explorer.json&view=reader#overview
```

UK Government APIs descriptor:

```text
https://chris-page-gov.github.io/ai-infrastructure-wiki/uk-government-apis/okf-explorer.json
```

GOV.UK CKAN paired exemplar:

```text
https://chris-page-gov.github.io/ai-infrastructure-wiki/next/?bundle=https%3A%2F%2Fchris-page-gov.github.io%2Fai-engineering-lab-hackathon-london-2026%2Fgov-ckan%2Fokf-explorer.json&view=reader#overview
```
