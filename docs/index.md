# OKF Explorer Documentation

This folder is the operating manual for the OKF Explorer, the UK Government
APIs exemplar, and related large-corpus OKF packs.

## Start Here

- [Repository guide](repository-guide.md) explains where the important files
  live and how the publication pipeline fits together.
- [Use the OKF Explorer](use-okf-explorer.md) remains the short path from a
  bundle URL to the hosted Explorer.
- [UK Legislation documentation spine](uk-legislation/index.md) routes legal researchers, counsel, data engineers, curators and AI evaluators to task-specific guidance.
- [Illustrated UK Legislation manual](uk-legislation/illustrated-manual.md) follows legislation-specific personas and user journeys from overview to selected-passage provenance.
- [Illustrated Explorer manual](okf-explorer-persona-manual.md) describes the
  UI through user stories and screenshots.
- [Use an AI with an OKF pack](ai-okf-usage.md) gives prompts and data-access
  rules for asking questions over a pack without losing provenance.
- [Create OKF bundles](okf-bundle-authoring.md) explains how to build bundles
  that take full advantage of Explorer facets, search, graph, timeline,
  resources and right-card metadata.
- [Federated bundle wiki architecture](okf-bundle-wiki-architecture-2026-07-11.md)
  defines independently published bundle wikis, YAML-LD/JSON-LD semantics,
  registry discovery, compatibility projections and the extraction plan.
- [Source constraint ledger](source-constraint-ledger.md) records fair-use,
  access-control, licensing and context-loading concerns for internal
  escalation without silently reducing prototype functionality.
- [OKF standards crosswalk](okf-standards-crosswalk.md) maps every OKF record
  field to its DCAT-AP and OpenAPI equivalent, so bundles stay federatable
  with external API/data catalogues.
- [20 minute demo script](demo-script-2026-07-09.md) is the prepared run of
  show-and-tell for the 2026-07-09 demonstration.

## Quality And Review

- [OKF Explorer evaluation harness](okf-explorer-evaluation.md) defines the
  100-question scoring suite, accessibility checks, GOV.UK-aligned publication
  rubric and visual-regression evidence.
- [UK Legislation architecture](uk-legislation-okf.md) documents the complete work catalogue, legal ontology, progressive provision resolver, official access methods and barrister-oriented AI evaluation contract.
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
https://chris-page-gov.github.io/okf-explorer/?bundle=https%3A%2F%2Fchris-page-gov.github.io%2Fai-infrastructure-wiki%2Fuk-government-apis%2Fokf-explorer.json&view=reader#overview
```

UK Government APIs descriptor:

```text
https://chris-page-gov.github.io/okf-uk-government-apis/okf-explorer.json
```

GOV.UK CKAN paired exemplar:

```text
https://chris-page-gov.github.io/okf-explorer/?bundle=https%3A%2F%2Fchris-page-gov.github.io%2Fai-engineering-lab-hackathon-london-2026%2Fgov-ckan%2Fokf-explorer.json&view=reader#overview
```

UK Legislation Explorer:

```text
https://chris-page-gov.github.io/okf-explorer/?bundle=https%3A%2F%2Fchris-page-gov.github.io%2Fai-infrastructure-wiki%2Flegislation%2Fokf-explorer.json&view=reader#overview
```
