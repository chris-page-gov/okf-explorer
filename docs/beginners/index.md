# OKF Explorer From The Beginning

This learning path explains the ideas behind OKF Explorer without assuming
experience of web development, data catalogues, search systems, knowledge
graphs, ontologies, public-sector data or AI infrastructure.

It is an introduction to the whole product, not a simplified replacement for
the detailed specifications elsewhere in this repository. Each chapter gives
you the vocabulary and mental model needed to read those specifications.

The curriculum uses the separate
[okf-uk-living project](https://github.com/chris-page-gov/okf-uk-living)
as its applied UK citizen-service example. Links take you to that project's 24
life-course domains, evidence registers and branching journeys without copying
its corpus into this repository.

## Choose A Route

You do not need to read everything in one sitting.

### Fifteen-Minute Orientation

Use this route to decide whether the curriculum is relevant:

1. Spend 8 minutes on
   [From a missed collection to an ontology](00-data-information-knowledge-and-ontology.md),
   from the opening through
   [DIKW](00-data-information-knowledge-and-ontology.md#dikw-a-useful-prompt-not-a-universal-law).
2. Spend 4 minutes on
   [The product in plain language](01-product-in-plain-language.md#three-things-with-similar-names)
   to separate OKF, a bundle and the Explorer.
3. Spend 3 minutes using the stable definitions of
   [ontology](23-foundational-definitions.md#ontology),
   [assertion](23-foundational-definitions.md#assertion),
   [evidence](23-foundational-definitions.md#evidence),
   [authority](23-foundational-definitions.md#authority) and
   [scope](23-foundational-definitions.md#scope).

At the end, you should be able to say why a recorded non-collection is data,
why local rules supply context, why an evidence-bearing conclusion is not
automatically official, and why an ontology is not simply the top of a DIKW
pyramid.

### Ninety-Minute Foundation

Use this route before a workshop or first contribution:

1. **20 minutes:** read the complete
   [missed-collection on-ramp](00-data-information-knowledge-and-ontology.md).
2. **10 minutes:** read
   [The product in plain language](01-product-in-plain-language.md).
3. **15 minutes:** read
   [Markdown, OKF and small bundles](03-markdown-okf-and-small-bundles.md).
4. **15 minutes:** read
   [Knowledge graphs and stable identifiers](06-knowledge-graphs-and-identifiers.md).
5. **15 minutes:** read
   [Validation, provenance and catalogue standards](08-validation-provenance-and-catalogue-standards.md).
6. **10 minutes:** read the Reader, Graph, Links and accessibility sections of
   [Explorer views and presentation](09-explorer-views-and-presentation.md).
7. **5 minutes:** answer the on-ramp's
   [understanding check](00-data-information-knowledge-and-ontology.md#check-your-understanding)
   and follow any unclear term into the
   [foundational definitions](23-foundational-definitions.md).

### Publisher Route

If you will create or maintain an OKF publication:

1. complete the 90-minute foundation;
2. read [Large corpora and progressive loading](04-large-corpora-and-progressive-loading.md)
   if the collection will not fit the small-bundle path;
3. read [Security, privacy, accessibility and responsible use](13-security-privacy-accessibility-and-responsible-use.md)
   and [Building, testing and publishing](14-building-testing-and-publishing.md);
4. read [OKF v0.2 trust, lifecycle and attestation](17-okf-v02-trust-lifecycle-and-attestation.md)
   and [Foundry authoring and domain profiles](19-foundry-authoring-and-domain-profiles.md);
5. use the [authoritative-source register](24-authoritative-source-register.md)
   to label every specification, draft, guidance source and licence accurately;
   and
6. follow the project [semantic contract](../../okf.semantic.json) before any
   semantic or relationship change; and
7. use the [canonical semantic-authoring and rollout ledger](../okf-0.2-yaml-ld-semantic-authoring.md#local-implementation-and-release-ledger)
   to distinguish local implementation from review, release, deployment and
   public verification.

### Reviewer Route

If you will review meaning, evidence or publication readiness:

1. read the [foundational definitions](23-foundational-definitions.md), with
   particular attention to evidence, authority, provenance, confidence,
   status, scope, jurisdiction and observation time;
2. inspect the [authoritative-source register](24-authoritative-source-register.md)
   and challenge claims that omit a source's status or boundary;
3. read [Validation, provenance and catalogue standards](08-validation-provenance-and-catalogue-standards.md)
   and [Security, privacy, accessibility and responsible use](13-security-privacy-accessibility-and-responsible-use.md);
4. read [Governed enrichment and release assurance](20-governed-enrichment-and-release-assurance.md),
   [Release gates, evidence and owner review](21-release-gates-evidence-and-owner-review.md)
   and [Evaluation Foundry and YAML-LD](22-evaluation-foundry-and-yaml-ld.md);
5. verify that YAML-LD 1.0 is described as a
   [W3C Working Draft](24-authoritative-source-register.md#s11-yaml-ld-10),
   not a Recommendation; and
6. check the [canonical semantic-authoring and rollout ledger](../okf-0.2-yaml-ld-semantic-authoring.md#local-implementation-and-release-ledger)
   before repeating an implementation or release-state claim; and
7. check that ordinary Markdown links remain distinguishable from declared
   domain predicates.

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

0. [From a missed collection to an ontology](00-data-information-knowledge-and-ontology.md)
   builds the data, information, knowledge and ontology foundations, treats
   DIKW as a contested heuristic, and introduces a branching public-service
   example.
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
22. [Evaluation Foundry and YAML-LD](22-evaluation-foundry-and-yaml-ld.md)
    adapts the Foundry process for functionality evaluation, then explains
    what additive YAML-LD identity, predicates, assertion evidence and linked
    Explorer routes provide beyond ordinary OKF front matter.
23. [Foundational definitions](23-foundational-definitions.md) supplies stable,
    cross-referenced definitions for the curriculum's core data, semantic,
    evidence and public-service terms.
24. [Annotated authoritative-source register](24-authoritative-source-register.md)
    records direct primary links, document status, observation dates, uses and
    boundaries.

## Shorter Routes

If you want to use the Explorer but not change it, take the 15-minute
orientation, then read chapters 3, 5 and 9,
then use the [illustrated Explorer manual](../okf-explorer-persona-manual.md).

If you want to publish a bundle, read chapters 1, 3, 4, 5, 6, 8 and 14, then
continue with [Create OKF bundles that use the Explorer well](../okf-bundle-authoring.md).

If the ontology architecture document brought you here, read chapters 6, 7, 8
and 9. They explain every conceptual layer assumed by
[Ontology and semantic graph architecture](../ontology-and-semantic-graph-architecture-2026-07-24.md).

If you want to inspect one complete example before following the full learning
path, use the
[AI Infrastructure knowledge-graph walkthrough](../ai-infrastructure-knowledge-graph-walkthrough.md).
It starts in a web browser, requires no GitHub account or coding tools, and
then gives an optional Obsidian route.

If you want to contribute code, read chapters 1 through 9, then 13 through 21.
The domain chapters are still important before changing Map or legislation
features.

If you want an AI to research a pack, read chapters 1, 5 and 8, then follow
[Use an AI with an OKF pack](../ai-okf-usage.md).

If you own or review a release but do not implement it, read chapters 13, 14,
19, 20 and 21 after the reviewer route. Chapter 21 explains exactly which
decisions require owner input and which results must come from tools or
independent reviewers.

## Coverage Map

This table makes the scope explicit. “Introduced in” is the beginner
explanation; “continue with” is the detailed contract or operating manual.

| Area | Introduced in | Continue with |
|---|---|---|
| Data, information, knowledge, DIKW and ontology | 0 and 23 | [Ontology architecture](../ontology-and-semantic-graph-architecture-2026-07-24.md) |
| Public-service and evidence vocabulary | 0 and 23 | [Applied okf-uk-living corpus](https://github.com/chris-page-gov/okf-uk-living) |
| Standards, guidance, source status and boundaries | 24 | [Standards crosswalk](../okf-standards-crosswalk.md) |
| Product purpose and evidence journey | 1 | [Explorer persona manual](../okf-explorer-persona-manual.md) |
| Browser, URLs, HTTP, static apps, Svelte, PWA | 2 | [Repository guide](../repository-guide.md) |
| Markdown, frontmatter, links and OKF records | 3 | [Bundle authoring](../okf-bundle-authoring.md) |
| Small-bundle normalisation and compatibility | 3 | [OKF conformance](../okf-conformance.md) |
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
| Functionality evaluation, isolated synthetic fixtures and YAML-LD | 22 | [Heritage evaluation profile](../../evaluation-foundry/fixtures/heritage-warwickshire/profile.md) |
| OKF 0.2/YAML-LD implementation and live rollout state | 17, 20, 21 and 22 | [Canonical semantic-authoring and rollout ledger](../okf-0.2-yaml-ld-semantic-authoring.md#local-implementation-and-release-ledger) |

## Implementation Coverage Audit

The learning path also covers every maintained implementation area rather than
only the concepts named in architecture documents:

| Implementation area | Beginner chapters |
|---|---|
| Canonical Svelte application and browser runtime | 1, 2, 9 and 13 |
| Small-bundle loader and compatibility normalisation | 3 |
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
| Evaluation profiles, YAML-LD semantic registries and direct/reified graph assertions | 22 |

## One Principle To Keep Throughout

The Explorer tries to keep four things distinguishable:

1. what a source actually said;
2. what a builder normalised or inferred;
3. what publication rules require;
4. how the interface currently presents the result.

Many difficult design decisions become easier once those are not treated as
the same thing.
