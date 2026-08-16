# Annotated Authoritative-Source Register

This register records the primary sources used by the beginner curriculum,
their status and the boundary of what each can support. It was checked on
**10 August 2026**. A source's inclusion does not make it authoritative for
every claim, and a live “latest” page may change after that observation date.

The labels below are intentionally precise:

- **standard or Recommendation** means the publisher gives the document that
  formal status;
- **Working Draft** means work in progress, not a completed W3C
  Recommendation;
- **profile or vocabulary release** means a versioned community specification
  with its own governance;
- **guidance** helps apply policy or practice but is not automatically law;
- **platform documentation** describes a service and can change with it; and
- **project specification** describes the named project, not a universal
  standards-body consensus.

For applied UK public-service evidence, use the linked registers in
[okf-uk-living](https://github.com/chris-page-gov/okf-uk-living#start-here).
This page does not reproduce that corpus.

## Web And Data Syntax

### S01 Open Knowledge Format 02

- **Source:** [pinned Open Knowledge Format (OKF) v0.2 specification](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/3fcbb9f828c2f23d109c855ee403c3a4c81f3a96/okf/SPEC.md)
- **Status:** Version 0.2 project specification pinned to commit
  3fcbb9f828c2f23d109c855ee403c3a4c81f3a96.
- **Use:** Defines the intentionally minimal Markdown and YAML-frontmatter
  core, provenance, trust, lifecycle and attested-computation families.
- **Boundary:** It does not define a central ontology, required runtime or the
  additive Bundle Wiki YAML-LD profile. Unknown fields remain compatible.

### S02 CommonMark 0312

- **Source:** [CommonMark specification 0.31.2](https://spec.commonmark.org/0.31.2/)
- **Status:** Versioned CommonMark technical specification.
- **Use:** Defines the browser-compatible Markdown syntax assumed by the
  authored reading pages.
- **Boundary:** CommonMark does not define OKF frontmatter, semantic predicates,
  page styling or whether a link target is authoritative.

### S03 YAML 122

- **Source:** [YAML 1.2.2 specification](https://yaml.org/spec/1.2.2/)
- **Status:** YAML language specification, revision 1.2.2.
- **Use:** Defines YAML syntax and information models used for frontmatter and
  YAML-based artefacts.
- **Boundary:** Valid YAML is not automatically valid JSON, JSON-LD, YAML-LD,
  OKF or a project profile. Safe parsing and profile validation remain needed.

### S04 RFC 8259 JSON

- **Source:** [RFC 8259: The JavaScript Object Notation Data Interchange Format](https://www.rfc-editor.org/info/rfc8259/)
- **Status:** Internet Standard, December 2017.
- **Use:** Defines interoperable JSON syntax and processing expectations.
- **Boundary:** JSON validity checks syntax, not a project's structure,
  semantics, evidence or truth.

### S05 RFC 3986

- **Source:** [RFC 3986: Uniform Resource Identifier Generic Syntax](https://www.rfc-editor.org/info/rfc3986/)
- **Status:** Internet Standard, January 2005.
- **Use:** Defines generic Uniform Resource Identifier (URI) syntax, resolution
  and reference components.
- **Boundary:** A syntactically valid URI need not be safe to fetch, available,
  authoritative or a credential-free HTTP(S) URL.

### S06 RFC 3987

- **Source:** [RFC 3987: Internationalized Resource Identifiers](https://www.rfc-editor.org/info/rfc3987/)
- **Status:** IETF Proposed Standard, January 2005, with later updates noted by
  the RFC Editor.
- **Use:** Defines Internationalized Resource Identifier (IRI) syntax and URI
  mapping.
- **Boundary:** An IRI can identify a semantic resource without being a web
  page that the Reader should retrieve.

### S07 JSON Schema 202012

- **Source:** [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12)
- **Status:** Published draft specification, 16 June 2022, with versioned
  meta-schemas.
- **Use:** Defines structural validation for JSON instances and the schemas
  pinned by this project's profiles.
- **Boundary:** Passing a schema does not prove source authority, semantic
  truth, safe network access or full profile conformance beyond the schema.

## Linked Data And Knowledge Organisation

### S08 RDF 11 Concepts

- **Source:** [RDF 1.1 Concepts and Abstract Syntax](https://www.w3.org/TR/rdf11-concepts/)
- **Status:** W3C Recommendation, 25 February 2014.
- **Use:** Defines RDF graphs, triples, IRIs, blank nodes and literals.
- **Boundary:** It supplies a data model, not this project's public-service
  vocabulary, evidence policy, validation shape or screen layout.

### S09 RDF Schema 11

- **Source:** [RDF Schema 1.1](https://www.w3.org/TR/rdf-schema/)
- **Status:** W3C Recommendation, 25 February 2014.
- **Use:** Defines basic class, property, domain, range and subclass semantics.
- **Boundary:** Domain and range support inference; they are not substitutes
  for form or publication validation.

### S10 JSON-LD 11

- **Source:** [JSON-LD 1.1](https://www.w3.org/TR/json-ld11/)
- **Status:** W3C Recommendation, 16 July 2020.
- **Use:** Defines a JSON syntax and processing model for Linked Data.
- **Boundary:** A context mapping does not make a claim authoritative, and the
  Reader does not fetch or reason over arbitrary remote contexts.

### S11 YAML-LD 10

- **Source:** [YAML-LD 1.0](https://www.w3.org/TR/yaml-ld/)
- **Status:** **W3C Working Draft, 28 July 2026. It is not a W3C
  Recommendation.**
- **Use:** Defines draft conventions and constraints for representing Linked
  Data in YAML based on JSON-LD syntax, semantics and APIs.
- **Boundary:** It is work in progress and may change. This repository uses a
  constrained additive profile, pinned local contexts and generated JSON-LD;
  it does not make YAML-LD requirements universal OKF core.

### S12 SKOS Reference

- **Source:** [SKOS Simple Knowledge Organization System Reference](https://www.w3.org/TR/skos-reference/)
- **Status:** W3C Recommendation, 18 August 2009.
- **Use:** Defines concepts, concept schemes, labels and semantic relations for
  controlled knowledge-organisation systems.
- **Boundary:** SKOS broader and narrower relations do not automatically mean
  RDFS subclass, physical containment or a public-service process step.

### S13 OWL 2 Primer

- **Source:** [OWL 2 Web Ontology Language Primer, second edition](https://www.w3.org/TR/owl2-primer/)
- **Status:** W3C Recommendation, 11 December 2012; the Primer is an
  explanatory entry point to the OWL 2 document set.
- **Use:** Introduces expressive class and property semantics and inference.
- **Boundary:** The Primer is not a validation language, and this project uses
  only bounded, declared semantics rather than assuming unrestricted reasoning.

### S14 SHACL

- **Source:** [Shapes Constraint Language](https://www.w3.org/TR/shacl/)
- **Status:** W3C Recommendation, 20 July 2017.
- **Use:** Defines shapes for validating RDF graphs and reporting results.
- **Boundary:** A conforming result says a graph meets named shapes; it does
  not prove real-world completeness, authority or truth.

## Provenance Catalogues And Reuse

### S15 PROV-O

- **Source:** [PROV-O: The PROV Ontology](https://www.w3.org/TR/prov-o/)
- **Status:** W3C Recommendation, 30 April 2013.
- **Use:** Defines RDF terms for provenance entities, activities, agents and
  influences.
- **Boundary:** Traceability supports trust decisions but does not dictate a
  trust score or upgrade a derived claim to official authority.

### S16 DCAT 3

- **Source:** [Data Catalog Vocabulary version 3](https://www.w3.org/TR/vocab-dcat-3/)
- **Status:** W3C Recommendation, 22 August 2024.
- **Use:** Defines catalogue, dataset, data-service, distribution and related
  metadata terms.
- **Boundary:** Using selected DCAT terms is not full DCAT conformance. DCAT
  does not model every public-service episode or domain rule.

### S17 DCMI Metadata Terms

- **Source:** [DCMI Metadata Terms](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/)
- **Status:** Current Dublin Core Metadata Initiative specification maintained
  by the DCMI Usage Board; displayed issued version 20 January 2020.
- **Use:** Supplies broadly reused metadata properties, classes and encoding
  schemes, including rights and licence terms.
- **Boundary:** A DCMI property identifies meaning; it does not by itself state
  a project's cardinality, evidence or validation policy.

### S18 Data On The Web Best Practices

- **Source:** [Data on the Web Best Practices](https://www.w3.org/TR/dwbp/)
- **Status:** W3C Recommendation, 31 January 2017.
- **Use:** Provides best practices for discoverability, access, licensing,
  provenance, quality, versioning and reuse of web data.
- **Boundary:** Best-practice guidance is not automatic conformance to DCAT,
  OKF or a domain profile, and some practices depend on publishing context.

## Public Services Requirements And Evidence

### S19 CPSV-AP 320

- **Source:** [Core Public Service Vocabulary Application Profile 3.2.0](https://semiceu.github.io/CPSV-AP/releases/3.2.0/)
- **Status:** SEMIC Recommendation published 6 May 2024.
- **Use:** Provides a European application profile for describing public
  services, life and business events, rules, authorities, channels and outputs.
- **Boundary:** It is a minimal cross-border profile, not a complete UK service
  ontology, legal rulebook or claim that every service must use the profile.

### S20 CCCEV 220

- **Source:** [Core Criterion and Core Evidence Vocabulary 2.2.0](https://semiceu.github.io/CCCEV/releases/2.2.0/)
- **Status:** SEMIC Candidate Recommendation published 12 May 2026.
- **Use:** Models requirements, criteria and evidence exchanged to assess
  whether something is fulfilled.
- **Boundary:** Implementers must specialise the context-neutral model. Its
  status and broad evidence definition must not be presented as a final legal
  test for a particular UK service.

### S21 Open Referral UK

- **Source:** [Open Referral UK](https://openreferraluk.org/) and its
  [governance and release-cycle statement](https://openreferraluk.org/about/50-governance)
- **Status:** Community-governed UK profile of the international Human Services
  Data Specification; the publisher states version 3.0 is the current UK
  version, checked 10 August 2026.
- **Use:** Describes community-service information for consistent publication,
  discovery and exchange.
- **Boundary:** It is not a universal model of all government transactions,
  legal requirements, eligibility decisions or service episodes.

## GOV.UK Service And Content Guidance

### S22 GOV.UK Service Manual

- **Source:** [GOV.UK Service Manual](https://www.gov.uk/service-manual)
- **Status:** Live Government Digital Service guidance supporting the GOV.UK
  Service Standard.
- **Use:** Guides teams designing and operating public services.
- **Boundary:** Guidance must be read with applicable law, policy,
  organisational governance and devolved or local context. It is not an
  ontology or a record of every service.

### S23 GOV.UK Learning About Users And Their Needs

- **Source:** [Learning about users and their needs](https://www.gov.uk/service-manual/user-research/start-by-learning-user-needs)
- **Status:** GOV.UK Service Manual guidance; page states last updated 23 March
  2017 and remained live when checked.
- **Use:** Grounds user needs in research, user outcomes and language rather
  than preferred solutions.
- **Boundary:** A written user-need statement is still an assumption until
  supported and refined through appropriate research.

### S24 GOV.UK Service Standard Point 2

- **Source:** [Solve a whole problem for users](https://www.gov.uk/service-manual/service-standard/point-2-solve-a-whole-problem)
- **Status:** Live guidance for point 2 of the GOV.UK Service Standard.
- **Use:** Supports journey scope across organisational boundaries while
  cautioning against services that try to do everything at once.
- **Boundary:** It does not merge authorities, jurisdictions or data
  controllers, and it does not authorise sharing personal data.

### S25 GOV.UK Taxonomy Principles

- **Source:** [GOV.UK Taxonomy principles](https://www.gov.uk/government/publications/govuk-topic-taxonomy-principles/govuk-taxonomy-principles)
- **Status:** GOV.UK publication, published 13 June 2019.
- **Use:** Explains the purpose, hierarchy and tagging principles of the
  GOV.UK topic taxonomy.
- **Boundary:** GOV.UK topics describe what content is about. They are not
  automatically service types, life events, departments or ontology classes.

### S26 GOV.UK Content API

- **Source:** [GOV.UK Content API reference](https://content-api.publishing.service.gov.uk/reference.html)
- **Status:** Live technical documentation for the GOV.UK publishing platform.
- **Use:** Describes how machines retrieve GOV.UK content items and linked
  metadata.
- **Boundary:** API fields are operational projections and can change. An API
  response is not the whole GOV.UK taxonomy, a legal source or a proof that a
  service route applies to an individual.

### S27 GOV.UK Browse

- **Source:** [GOV.UK services and information browse pages](https://www.gov.uk/browse)
- **Status:** Live public navigation, checked 10 August 2026.
- **Use:** Shows a user-facing route into GOV.UK service and information areas.
- **Boundary:** Browse labels and hierarchy are presentation choices, not an
  exhaustive life-course ontology or proof of subject identity.

### S37 GOV.UK Content And Publishing Guidance

- **Source:** [GOV.UK content and publishing guidance](https://guidance.publishing.service.gov.uk/)
- **Status:** Live Government Digital Service guidance, checked 10 August
  2026.
- **Use:** Supplies the A to Z style guide and plain-English guidance used by
  this curriculum's [documentation style](../documentation-style.md).
- **Boundary:** It governs GOV.UK publishing practice. This independent
  technical curriculum follows applicable language and accessibility
  conventions but is not itself GOV.UK content.

## UK Data Statistics Ethics And Accessibility

### S28 Government Data Quality Framework

- **Source:** [The Government Data Quality Framework](https://www.gov.uk/government/publications/the-government-data-quality-framework/the-government-data-quality-framework)
- **Status:** UK government guidance published 3 December 2020.
- **Use:** Provides principles, a lifecycle and dimensions for managing data
  quality as fitness for purpose.
- **Boundary:** It does not certify an individual dataset or replace
  domain-specific controls, user research or source evidence.

### S29 Code Of Practice For Statistics

- **Source:** [Code of Practice for Statistics](https://code.statisticsauthority.gov.uk/)
- **Status:** Standards for producers of official statistics maintained by
  the UK Statistics Authority; edition 3.0 was in effect when checked.
- **Use:** Frames public value, quality and trustworthiness for official
  statistics.
- **Boundary:** It does not make every government number an official statistic
  or govern non-statistical service decisions by analogy.

### S30 Data And AI Ethics Framework

- **Source:** [Data and AI Ethics Framework](https://www.gov.uk/government/publications/data-ethics-framework/data-and-ai-ethics-framework)
- **Status:** UK government guidance updated 18 December 2025.
- **Use:** Guides responsible public-sector development, procurement and use
  of data and artificial intelligence across transparency, accountability,
  fairness, privacy, sustainability, societal impact and safety.
- **Boundary:** It complements rather than replaces law, regulation,
  professional ethics, technical security guidance or human accountability.

### S31 WCAG 22

- **Source:** [Web Content Accessibility Guidelines 2.2](https://www.w3.org/TR/WCAG22/)
- **Status:** W3C Recommendation, 12 December 2024.
- **Use:** Defines technology-neutral, testable success criteria for accessible
  web content.
- **Boundary:** Conformance requires testing against a declared level and
  scope. It does not guarantee that every disabled person's need is met, and
  automated checks alone are insufficient.

## Rights And Publication Assurance

### S32 Open Government Licence 30

- **Source:** [Open Government Licence version 3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/)
- **Status:** Reuse licence published by The National Archives.
- **Use:** Grants broad permission to copy, publish, distribute, transmit,
  adapt and exploit covered information subject to its conditions.
- **Boundary:** It does not cover excluded or third-party material and does
  not establish authority, accuracy, freshness or an obligation to publish.

### S33 GitHub Pages

- **Source:** [What is GitHub Pages?](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- **Status:** Live GitHub platform documentation.
- **Use:** Describes static-site hosting from a GitHub repository.
- **Boundary:** A successful deployment or HTTP response does not prove page
  identity, content correctness, accessibility or a complete user journey.

### S34 GitHub Releases

- **Source:** [About releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)
- **Status:** Live GitHub platform documentation.
- **Use:** Describes tagged releases, notes and downloadable release assets.
- **Boundary:** A release label is not evidence that assets passed this
  project's checks, match a candidate root or were promoted byte-identically.

### S35 GitHub Artifact Attestations

- **Source:** [Artifact attestations](https://docs.github.com/en/actions/concepts/security/artifact-attestations)
- **Status:** Live GitHub Actions security documentation.
- **Use:** Describes signed provenance claims and verification for build
  artefacts.
- **Boundary:** GitHub states that an attestation is not a guarantee that an
  artefact is secure. Verification policy, signer identity, subject digest and
  build instructions still require assessment.

### S36 SLSA 12

- **Source:** [Supply-chain Levels for Software Artifacts specification 1.2](https://slsa.dev/spec/v1.2/)
- **Status:** Approved specification version 1.2.
- **Use:** Defines tracks, levels and attestation formats for describing and
  improving software supply-chain security.
- **Boundary:** A SLSA level covers declared supply-chain properties; it does
  not establish application correctness, source truth, usability or release
  approval by itself.

## How To Use The Register

When citing a source in a curriculum claim:

1. link to the direct source rather than a search result or secondary summary;
2. name the exact version or date where the distinction matters;
3. state whether it is a Recommendation, draft, profile, guidance, licence or
   platform documentation;
4. say which claim the source can support and which it cannot;
5. retain the observation date for live material; and
6. recheck current operational or legal guidance before applying it to a real
   person.

The [foundational definitions](23-foundational-definitions.md) apply those
rules term by term. Chapter 8 explains why
[conformance and validation](08-validation-provenance-and-catalogue-standards.md#conformance-and-validation)
must name their exact profile and evidence.
