# UK Legislation Data

The UK Legislation pack is not just another set of documents. Legal identity,
versions, extent, commencement, amendments and provision structure all affect
whether evidence supports a legal proposition.

This chapter explains the data model. It does not provide legal advice.

## Discovery Is Not Authority

A catalogue result helps locate an instrument. It is not, by itself, the law.

A responsible research path is:

1. find the exact legal work;
2. distinguish it from similarly titled or related instruments;
3. load the official structured text;
4. identify the exact provision;
5. check version, commencement, extent and amendments;
6. cite a direct official passage;
7. state unresolved legal or factual issues.

The Explorer supports this path but does not replace legal judgment.

## Types Of UK Legislation

The corpus contains many official type codes, including:

- UK Public General Acts;
- local and private Acts;
- Measures and devolved primary legislation;
- UK Statutory Instruments;
- Scottish, Welsh and Northern Ireland instruments;
- draft instruments;
- retained EU-origin material;
- Church Measures and other specialist families.

The pack groups records into broad categories such as primary, secondary,
draft, EU-origin and other for discovery. It retains the official type code so
the broad grouping does not erase legal form.

## Year, Number And Citation

Titles are not unique. A work is commonly distinguished by:

- document type;
- year;
- number;
- jurisdiction;
- official identifier or citation.

Search results should show these fields before a user assumes that a familiar
title is the intended authority.

## Work, Expression And Manifestation

The legislation.gov.uk model uses ideas related to the Functional Requirements
for Bibliographic Records:

- **Work** — the abstract legal resource;
- **Expression** — a version or expression of that work;
- **Manifestation** — a concrete representation such as XML, HTML, PDF or RDF.

One Act is not a different legal work merely because it is available as both
HTML and PDF. A point-in-time expression may differ from the latest revised
expression.

This distinction is important for stable identity and citation.

## Provisions And Structure

Legal documents contain nested structural units:

- Parts;
- Chapters;
- sections or articles;
- subsections and paragraphs;
- regulations or rules;
- Schedules and nested provisions;
- explanatory and signed sections.

The work-level catalogue contains discovery metadata. When a user selects a
work, the Explorer can fetch official CLML and build its provision tree on
demand.

This is **progressive completeness**:

- every work is present in the checked catalogue snapshot;
- every recognized provision of a selected work is discovered from its
  authoritative XML when requested;
- the static repository does not freeze hundreds of millions of provision
  nodes.

## CLML

Crown Legislation Markup Language, or **CLML**, is the authoritative structured
XML used by legislation.gov.uk.

CLML elements identify document structure and can contain:

- stable element IDs;
- numbers and titles;
- passage text;
- extent and status;
- nested provisions.

The Explorer maps structural element names to readable types such as Section,
Article, Regulation, Rule or Paragraph while preserving the original element
and ID.

The official ID supports a pinpoint passage URL.

## Atom Feeds

Atom is an XML feed format. Legislation.gov.uk exposes feeds for discovery and
search.

The builder uses official facets and year-bounded retrieval to create the
complete work index for a snapshot. It checks retrieved counts against the
official year counts and deduplicates by official work identifier.

The Explorer can also add official live full-text search results to local
title search. The interface identifies which source produced a result.

## ELI

European Legislation Identifier, or **ELI**, provides an RDF vocabulary and
identifier pattern for legal resources, versions and related metadata.

The pack uses ELI as its primary semantic spine for:

- legal resource identity;
- dates and types;
- jurisdictions;
- versions and manifestations;
- later modelling of legal effects.

ELI-I extends the approach for amendments, commencement, repeal and other
legal effects.

## Schema.org Legislation

Schema.org provides widely recognized web terms for legislation. It helps
general web interoperability and discovery.

It is a compatibility layer, not a replacement for ELI's legal-resource model
or CLML's authoritative UK document structure.

## Akoma Ntoso

Akoma Ntoso is an international XML standard for parliamentary, legislative
and judicial documents. Legislation.gov.uk can supply it as a manifestation.

It is valuable for cross-jurisdiction exchange. The Explorer still uses CLML
for the native UK provision structure.

## Topics And Derived Relationships

The pack assigns broad topics from titles to help discovery. These topics are:

- deterministic;
- explicitly non-authoritative;
- not legal propositions.

High-precision model-assisted rules can propose literal title matches, but an
accepted rule is then governed, applied deterministically and published with
its model, prompt, review status and cost provenance.

Relationships such as “classified as,” “has document type” and conservative
“mentions entity” links carry assertion status. A topic chip must never be
treated as proof of a work's legal effect.

## Version, Commencement And Extent

Three questions are easily confused:

- **Version:** What did the text say at the relevant point in time?
- **Commencement:** Was the provision legally in force?
- **Extent:** To which legal jurisdictions or territories did it extend?

A latest revised text may not answer a historical question. A provision can
exist in the document yet not be commenced for the situation being analyzed.
Extent and application can require further legal interpretation.

The researcher must also inspect changes made and changes received, including
unapplied effects where relevant.

## A Proposition Ledger

A counsel-grade answer is built from discrete propositions. For each material
proposition record:

- source title and official identifier;
- direct selected-passage URL;
- supporting text or faithful paraphrase;
- version or point-in-time context;
- commencement and extent context;
- retrieval date;
- unresolved amendment, interpretation or missing-fact issue.

Citing only an Act landing page is not pinpoint provenance.

## Source Access And Fair Use

The builder:

- identifies itself;
- caches official responses;
- retries temporary failures;
- starts from a conservative request rate;
- records hashes, bytes and cache status.

An advertised bulk or SPARQL interface may be unavailable to an anonymous
client. The pack records the observed access conflict rather than claiming to
have harvested a restricted source.

## Boundaries Of The Pack

The pack is designed for legislation completeness, not:

- case-law completeness;
- commentary or textbook authority;
- a guarantee that a provision applies to particular facts;
- legal advice.

An answer must distinguish statutory text, derived classification, inference,
missing facts and the need for other authorities.

## Continue

Start a real research task with the [UK Legislation documentation spine](../uk-legislation/index.md)
and [Getting started](../uk-legislation/getting-started.md).

## Next

[AI infrastructure and federated AI](12-ai-infrastructure-and-federated-ai.md)
introduces the subject matter of the original Markdown sample corpus.
