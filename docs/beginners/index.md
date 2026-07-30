# OKF Explorer From The Beginning

This learning path explains the ideas behind OKF Explorer without assuming
experience of web development, data catalogues, search systems, knowledge
graphs, ontologies, public-sector data or AI infrastructure.

It is an introduction to the whole product, not a simplified replacement for
the detailed specifications elsewhere in this repository. Each chapter gives
you the vocabulary and mental model needed to read those specifications.

## What You Will Be Able To Explain

After working through this guide, you should be able to explain:

- what the Explorer, an OKF bundle and a source record each are;
- how Markdown becomes a browsable graph without becoming the only data
  format the product can load;
- why small and large corpora use different publication shapes;
- how a static website can search thousands of records without an application
  server;
- the difference between search, filtering, ranking, facets and context
  selection;
- what RDF, JSON-LD, RDFS, SKOS, OWL, SHACL, DCAT and PROV each contribute;
- why validation, inference, evidence and screen layout are separate concerns;
- how geospatial and UK legislation records introduce domain-specific rules;
- how security, privacy, accessibility and provenance shape apparently simple
  interface decisions;
- how source Markdown, generated files, browser code, tests and GitHub Pages
  fit into one publication pipeline.
- how OKF v0.2 trust and lifecycle metadata remain distinct from source
  authority;
- how federations discover independent child bundles without loading them;
- how domain profiles, governed enrichment and hash-bound release evidence
  connect research decisions to tested public bytes;
- what release gates, checks, evidence, receipts, candidate roots, independent
  review, owner approval and byte-identical promotion each mean; and
- why a gate number must name its Foundry or project-specific catalogue.

You do not need to learn every acronym before opening the Explorer. The aim is
to build one idea at a time and show where it appears in the implementation.

## Learning Path

Read the chapters in order if the subject is new to you:

1. [The product in plain language](01-product-in-plain-language.md) introduces
   the problem, the people involved and the central source-to-evidence journey.
2. [Web and browser foundations](02-web-and-browser-foundations.md) explains
   URLs, HTTP, static sites, browser storage, workers, Svelte and PWAs.
3. [Markdown, OKF and small bundles](03-markdown-okf-and-small-bundles.md)
   explains records, frontmatter, links, nodes, relationships and the small
   bundle build.
4. [Large corpora and progressive loading](04-large-corpora-and-progressive-loading.md)
   explains descriptors, manifests, control and data planes, chunks, shards,
   compression, integrity and lazy loading.
5. [Search, filters, facets and context](05-search-filters-facets-and-context.md)
   explains deterministic retrieval from the query box to a bounded evidence
   package.
6. [Knowledge graphs and stable identifiers](06-knowledge-graphs-and-identifiers.md)
   introduces graph modelling, direction, types, predicates, IRIs and
   vocabularies.
7. [The semantic web and ontologies](07-semantic-web-and-ontologies.md) builds
   RDF, JSON-LD, RDFS, SKOS and OWL from a single example.
8. [Validation, provenance and catalogue standards](08-validation-provenance-and-catalogue-standards.md)
   separates JSON Schema and SHACL checks from inference, then introduces
   PROV, DCAT, DCAT-AP, DQV and OpenAPI.
9. [Explorer views and presentation](09-explorer-views-and-presentation.md)
   explains why Reader, Graph, Links, Timeline, Type, Resources, Map and
   Narrative are coordinated views of the same evidence.
10. [Geospatial data](10-geospatial-data.md) introduces place names,
    coordinates, geometries, GeoJSON, services, evidence levels and safe
    previews.
11. [UK legislation data](11-uk-legislation-data.md) introduces legal works,
    document structure, ELI, Schema.org, CLML, Atom feeds and authority.
12. [AI infrastructure and federated AI](12-ai-infrastructure-and-federated-ai.md)
    explains the subject matter in the repository's original sample corpus.
13. [Security, privacy, accessibility and responsible use](13-security-privacy-accessibility-and-responsible-use.md)
    explains the product's cross-cutting safeguards and limits.
14. [Building, testing and publishing](14-building-testing-and-publishing.md)
    follows a change from source material through generation, tests and static
    publication.
15. [A contributor's repository tour](15-contributor-repository-tour.md) maps
    the concepts to directories and gives safe change recipes.
16. [Beginner glossary](16-beginner-glossary.md) is a quick reference for
    terms used across the learning path.
17. [OKF v0.2 trust, lifecycle and attestation](17-okf-v02-trust-lifecycle-and-attestation.md)
    explains the permissive core, structured generation and sources,
    verification events, lifecycle metadata and passive Attested Computation
    discovery.
18. [Federated bundles](18-federated-bundles.md) explains overview-first
    federation, explicit child loading, coverage and authority summaries,
    fallback routes and bounded cross-publication discovery.
19. [Foundry authoring and domain profiles](19-foundry-authoring-and-domain-profiles.md)
    explains the research-to-build handoff, evidence axes, standards
    applicability, tiny fixtures and byte-identical release promotion.
20. [Governed enrichment and release assurance](20-governed-enrichment-and-release-assurance.md)
    explains model-assisted assertion governance, independent acceptance
    evidence, deterministic builds, SBOMs and multi-browser runtime receipts.
21. [Release gates, evidence and owner review](21-release-gates-evidence-and-owner-review.md)
    explains every Foundry G0–G9 gate from first principles, distinguishes
    project-local gate catalogues, and gives beginner review checklists and
    copy-ready owner decisions.

## Shorter Routes

If you want to use the Explorer but not change it, read chapters 1, 3, 5 and 9,
then use the [illustrated Explorer manual](../okf-explorer-persona-manual.md).

If you want to publish a bundle, read chapters 1, 3, 4, 5, 6, 8 and 14, then
continue with [Create OKF bundles that use the Explorer well](../okf-bundle-authoring.md).

If the ontology architecture document brought you here, read chapters 6, 7, 8
and 9. They explain every conceptual layer assumed by
[Ontology and semantic graph architecture](../ontology-and-semantic-graph-architecture-2026-07-24.md).

If you want to contribute code, read chapters 1 through 9, then 13 through 21.
The domain chapters are still important before changing Map or legislation
features.

If you want an AI to research a pack, read chapters 1, 5 and 8, then follow
[Use an AI with an OKF pack](../ai-okf-usage.md).

If you own or review a release but do not implement it, read chapters 13, 14,
19, 20 and 21. Chapter 21 explains exactly which decisions require owner input
and which results must come from tools or independent reviewers.

## Coverage Map

This table makes the scope explicit. “Introduced in” is the beginner
explanation; “continue with” is the detailed contract or operating manual.

| Area | Introduced in | Continue with |
|---|---|---|
| Product purpose and evidence journey | 1 | [Explorer persona manual](../okf-explorer-persona-manual.md) |
| Browser, URLs, HTTP, static apps, Svelte, PWA | 2 | [Repository guide](../repository-guide.md) |
| Markdown, frontmatter, links and OKF records | 3 | [Bundle authoring](../okf-bundle-authoring.md) |
| Small-bundle normalization and compatibility | 3 | [OKF conformance](../okf-conformance.md) |
| Descriptors, manifests, chunks, shards and lazy loading | 4 | [Overview context](../explorer-overview-context.md) |
| Registries, releases and provider datapacks | 4 | [Provider datapacks](../provider-datapacks.md) |
| Search, filters, ranking, facets and context | 5 | [Search and filtering design](../search-filtering-design.md) |
| Graphs, identifiers, predicates and vocabularies | 6 | [Ontology architecture](../ontology-and-semantic-graph-architecture-2026-07-24.md) |
| RDF, JSON-LD, RDFS, SKOS and OWL | 7 | [Ontology architecture](../ontology-and-semantic-graph-architecture-2026-07-24.md) |
| JSON Schema, SHACL, PROV, DCAT, DCAT-AP, DQV, OpenAPI | 8 | [Standards crosswalk](../okf-standards-crosswalk.md) |
| Explorer views, URL state and graph presentation | 9 | [Overview context](../explorer-overview-context.md) |
| Geospatial discovery and bounded preview | 10 | [Geospatial design](../geospatial-map-exploration.md) |
| Legislation catalogue and live provisions | 11 | [UK Legislation documentation](../uk-legislation/index.md) |
| Agent-ready infrastructure and federated AI | 12 | [AI infrastructure corpus](../../index.md) |
| Security, source constraints, privacy and accessibility | 13 | [Source constraint ledger](../source-constraint-ledger.md) |
| Builders, validation, evaluation and Pages publication | 14 | [Repository guide](../repository-guide.md) |
| Codebase and contributor workflow | 15 | [Repository guide](../repository-guide.md) |
| OKF v0.2 core, trust and passive attestation metadata | 17 | [OKF conformance](../okf-conformance.md) |
| Federation loading and relationship authority | 18 | [Federated bundles](../federated-bundles.md) |
| Domain warm-up and reproducible authoring handoff | 19 | [Foundry prompt kit](../okf-authoring-prompt-kit.md) |
| Governed enrichment and frozen runtime evidence | 20 | [Legislation runtime acceptance](../legislation-runtime-acceptance.md) |
| Release gates, receipts, independent review and owner decisions | 21 | [Foundry build prompt](../prompts/okf-bundle-build.md) |

## Implementation Coverage Audit

The learning path also covers every maintained implementation area rather than
only the concepts named in architecture documents:

| Implementation area | Beginner chapters |
|---|---|
| Canonical Svelte application and browser runtime | 1, 2, 9 and 13 |
| Small-bundle loader and compatibility normalization | 3 |
| Large-corpus loader, manifests and release data plane | 4 |
| Static search client, worker, facets and retrieval URL state | 5 |
| Graph, facet, source and conversation presentation modules | 6 and 9 |
| Geospatial classification and preview modules | 10 and 13 |
| Legislation search, CLML parsing and detail view | 11 |
| Small bundle, registry, API, legislation and site builders | 3, 4, 8, 11 and 14 |
| Bundle-wiki JSON-LD context, schemas and SHACL shapes | 7 and 8 |
| Registry and provider-datapack publication | 4 and 8 |
| Source constraint ledger and external loading boundaries | 13 |
| Unit tests, Playwright journeys and question evaluation | 14 |
| Legacy PWA and single-file compatibility viewers | 2, 3, 9 and 14 |
| AI infrastructure, standards, framework and research corpus | 12 |
| Repository layout and safe change workflows | 15 |
| OKF v0.2 trust, lifecycle and Attested Computation presentation | 17 |
| Federation descriptors, source families and explicit child loading | 18 |
| Authoring profiles and warm-up/build handoff | 19 |
| Governed model enrichment and official-effects reconciliation | 20 |
| Deterministic build manifests, SBOM and runtime acceptance | 20 |
| Foundry G0–G9, project gate catalogues and owner review | 21 |

## One Principle To Keep Throughout

The Explorer tries to keep four things distinguishable:

1. what a source actually said;
2. what a builder normalized or inferred;
3. what publication rules require;
4. how the interface currently presents the result.

Many difficult design decisions become easier once those are not treated as
the same thing.
