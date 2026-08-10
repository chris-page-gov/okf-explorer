# OKF Explorer Documentation

This folder is the operating manual for the OKF Explorer, the UK Government
APIs exemplar, and related large-corpus OKF packs.

## Start Here

- [OKF Explorer from the beginning](beginners/index.md) is the complete
  zero-background learning path. It introduces the web application, Markdown
  and OKF bundles, large-corpus loading, search, graphs, semantic-web
  standards, provenance, Explorer views, geospatial and legislation data, AI
  infrastructure, v0.2 trust, federation, Foundry authoring, governed
  enrichment, release gates, evidence receipts, owner review, release
  assurance, safety, testing and contribution workflow before routing into
  the advanced specifications.
- [Repository guide](repository-guide.md) explains where the important files
  live and how the publication pipeline fits together.
- [Use the OKF Explorer](use-okf-explorer.md) remains the short path from a
  bundle URL to the hosted Explorer.
- [UK Legislation documentation spine](uk-legislation/index.md) routes legal researchers, counsel, data engineers, curators and AI evaluators to task-specific guidance.
- [Illustrated UK Legislation manual](uk-legislation/illustrated-manual.md) follows legislation-specific personas and user journeys from overview to selected-passage provenance.
- [Illustrated Explorer manual](okf-explorer-persona-manual.md) describes the
  UI through user stories and screenshots.
- [Geospatial Map personas and user stories](geospatial-map-personas-and-user-stories.md)
  explains who needs spatial discovery, what can go wrong and how each need is
  covered by browser tests.
- [Illustrated Geospatial Map manual](geospatial-map-manual.md) walks through
  evidence, place reductions, locator precision, record selection, bounded
  previews and progressive recovery.
- [Static search and filtering manual](static-search-filtering-manual.md)
  illustrates deterministic search, multi-value filters, sorting, match
  explanations and durable retrieval URLs against the GOV.UK CKAN corpus.
- [GOV.UK CKAN personas and user journeys](gov-ckan-personas-and-user-journeys.md)
  links CKAN-specific user needs to all 100 questions and the executable
  interaction journeys.
- [Use an AI with an OKF pack](ai-okf-usage.md) gives prompts and data-access
  rules for asking questions over a pack without losing provenance.
- [Create OKF bundles](okf-bundle-authoring.md) explains how to build bundles
  that take full advantage of Explorer facets, search, graph, timeline,
  resources and right-card metadata.
- [OKF Foundry prompt kit](okf-authoring-prompt-kit.md) provides a general
  two-stage domain-research and build protocol, a versioned machine handoff and
  reusable assurance gates for any document or record collection.
- [Evaluation Foundry and YAML-LD](beginners/22-evaluation-foundry-and-yaml-ld.md)
  adapts that process for functionality evaluation, explains additive semantic
  identity and assertions for beginners, and keeps source-backed, tiny and
  synthetic products visibly separate.
- [Coventry and Warwickshire heritage fixture family](../evaluation-foundry/fixtures/heritage-warwickshire/README.md)
  links the evaluation profile, reversible mappings, executable journeys,
  question suite and three generated corpus roles.
- [Facet presentation experiment](facet-presentation-experiment.md) defines
  provider and user control, compact distributions, hierarchy tabs and the
  optional presentation sidecar.
- [Provider datapacks](provider-datapacks.md) define how governed bundle
  snapshots, bounded reviewed upstream references, known drift and external
  provider actions remain visibly distinct.
- [Federated OKF bundles](federated-bundles.md) define the overview-first
  control plane, child discovery and fallback routes, relationship authority
  classes and generator acceptance checks.
- [Federated bundle wiki architecture](okf-bundle-wiki-architecture-2026-07-11.md)
  defines independently published bundle wikis, YAML-LD/JSON-LD semantics,
  registry discovery, compatibility projections and the extraction plan.
- [Ontology and semantic graph architecture](ontology-and-semantic-graph-architecture-2026-07-24.md)
  separates RDF instances, RDFS/SKOS vocabularies, bounded OWL inference,
  SHACL validation, PROV/DCAT evidence and Explorer presentation, and records
  the predicate-aware graph delivery roadmap.
- [YAML-LD relationship assertion mapping](yaml-ld-relationship-assertion-mapping.md)
  records how evidence-bearing semantic assertions project into the current
  Explorer relationship runtime and federation control-plane rows.
- [YAML-LD default semantic layer implementation plan](yaml-ld-default-semantic-layer-implementation-plan.md)
  stages the move from semantic authoring to runtime-default loading without
  breaking existing JSON publication contracts.
- [OKF 0.2 and YAML-LD semantic authoring](okf-0.2-yaml-ld-semantic-authoring.md)
  is the executable cross-repository contract: one semantic source, rich
  directed assertions, generated projections, safe routes and Reader
  behaviour.
- [OKF repository agent-guidance review](okf-agent-guidance-review-2026-08-09.md)
  explains the portable guidance design and the complementary roles of the
  nine reviewed repositories; the validated plugin source is under
  `plugins/okf-repositories/`.
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
- [Coventry and Warwickshire heritage evaluation report](heritage-evaluation-report.md)
  records the source scope, feature evidence, limitations, link checks,
  consumer journeys and the extra value provided by the YAML-LD extension.
- [Heritage Evaluation Foundry engineering postmortem](postmortems/heritage-foundry-2026/index.md)
  reconstructs the complete prompt-response, local-build, pull-request,
  deployment and release process; it identifies late-discovery amplification
  and proposes a dependency-planned, selective-rerun architecture.
- [UK Legislation architecture](uk-legislation-okf.md) documents the complete work catalogue, legal ontology, progressive provision resolver, official access methods and barrister-oriented AI evaluation contract.
- [OKF pack parity](okf-pack-parity.md) keeps the UK Government APIs and GOV.UK
  CKAN packs aligned as paired exemplars.
- [OKF conformance](okf-conformance.md) records the v0.2 core boundary, v0.1
  compatibility fallbacks and additive Explorer profile.
- [Explorer overview context](explorer-overview-context.md) specifies the
  generated overview/analysis contract consumed by the Explorer.
- [Viewer capability parity](viewer-capability-parity-2026-07-24.md) inventories
  the LLM-Wiki and OKF viewer lineages, records the complete feature matrix,
  and makes every retained, ported, equivalent, conflicting or remaining
  capability explicit.
- [Geospatial Map exploration](geospatial-map-exploration.md) specifies the
  deterministic Map canvas, spatial evidence levels, reduction state and
  progressive external-preview path being developed on the `geospatial`
  branch.

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

Hosted Svelte Explorer with the primary ONS data-discovery exemplar:

```text
https://chris-page-gov.github.io/okf-explorer/?bundle=https%3A%2F%2Fchris-page-gov.github.io%2Fokf-ons%2Fokf-explorer.json&view=reader#overview
```

ONS data-discovery descriptor:

```text
https://chris-page-gov.github.io/okf-ons/okf-explorer.json
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
https://chris-page-gov.github.io/okf-explorer/?bundle=https%3A%2F%2Fchris-page-gov.github.io%2Fokf-uk-legislation%2Fokf-explorer.json&view=reader#overview
```

UK Whole-Law federation:

```text
https://chris-page-gov.github.io/okf-explorer/?bundle=https%3A%2F%2Fchris-page-gov.github.io%2Fokf-uk-legislation%2Fwhole-law%2Fokf-explorer.json&view=reader
```

Coventry and Warwickshire heritage functionality evaluation:

```text
https://chris-page-gov.github.io/okf-explorer/?bundle=https%3A%2F%2Fchris-page-gov.github.io%2Fokf-explorer%2Fevaluation%2Fheritage%2Fokf-explorer.json
```
