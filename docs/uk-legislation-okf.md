# UK Legislation OKF

This is the architecture and data-model volume of the [UK Legislation documentation spine](uk-legislation/index.md). For task guidance use [Getting started](uk-legislation/getting-started.md); for worked interfaces use the [illustrated manual](uk-legislation/illustrated-manual.md).

## Public viewer

[Open the UK Legislation OKF Explorer](https://chris-page-gov.github.io/okf-explorer/?bundle=https%3A%2F%2Fchris-page-gov.github.io%2Fokf-uk-legislation%2Fokf-explorer.json&view=reader#overview).

The canonical bundle descriptor is `https://chris-page-gov.github.io/okf-uk-legislation/okf-explorer.json`; the independently versioned source repository is `https://github.com/chris-page-gov/okf-uk-legislation`. It is an overview-first, chunked catalogue designed for browser navigation and agent progressive discovery. The checked-in work index is complete against the official Atom year facets at generation time; document subdivisions are complete on demand because the Explorer reads the selected work's authoritative CLML rather than freezing hundreds of millions of provision nodes into Git.

Work and search-result chunks use deterministic gzip files. The Explorer streams and decompresses only the requested chunks in the browser; manifests, facets, ontology pages and search shards remain directly inspectable. This keeps the complete publication within practical GitHub/Pages limits without dropping records.

## What “complete” means

The generator first reads the `/all/data.feed` facets, then retrieves every year with `results-count=10000` and checks that each response count exactly equals the official year-facet count. It separately retrieves `/draft/data.feed`. Work IDs are deduplicated by the official `/id/{type}/{year}/{number}` identifier. The corpus validator requires at least 300,000 unique works and representative primary, secondary, devolved and EU-origin type codes.

For each selected work, the browser obtains the official `application/xml` manifestation and walks every recognized CLML structural element:

- preliminaries, Body and EUBody;
- Group, Part, Chapter, Division, Title, Section and Subsection containers;
- Pblock, PsubBlock, P1group-P3group and P1-P7 nested provisions;
- Schedules, Schedule, Appendix, Annex, Attachments and explanatory/signed sections.

Each node retains the CLML element name and ID, receives a normalized human type such as Section, Article, Regulation, Rule or Paragraph where the ID supports it, records number/title/text/extent/status, retains its parent/depth and links to the official selected passage. This is progressive completeness: discovery metadata is local; authoritative text is fetched only for the work being researched.

## Ontology decision

No single vocabulary covers identity, versions, manifestations, subdivisions and legal effects well enough. The pack uses a layered model:

| Need | Vocabulary | Use in this pack |
|---|---|---|
| legal identity and versions | [European Legislation Identifier 1.5](https://op.europa.eu/en/web/eu-vocabularies/eli) | `eli:LegalResource` work identity, with the legislation.gov.uk FRBR Work/Expression/Manifestation interpretation |
| changes and legal effects | [ELI-I](https://interoperable-europe.ec.europa.eu/collection/eli-european-legislation-identifier/solution/eli-i) | target vocabulary for amendments, commencements, repeals and other effects |
| web interoperability | [Schema.org Legislation](https://schema.org/Legislation) | searchable `schema:Legislation` class and familiar identifier/type/date/jurisdiction/change properties |
| authoritative UK structure | [legislation.gov.uk model](https://legislation.github.io/data-documentation/model/legislation.html) and [CLML 2.6](https://legislation.github.io/clml-schema/userguide.html) | native work IDs, versions, manifestations, Parts, sections, articles, regulations, schedules and nested provisions |
| international document interchange | [Akoma Ntoso 1.0](https://docs.oasis-open.org/legaldocml/akn-core/v1.0/) | supported official manifestation and cross-jurisdiction interchange target |

ELI is the primary semantic spine. Schema.org is a compatibility layer, not a replacement for ELI or CLML. CLML is authoritative for UK subdivision shape. The official [ELI-to-Schema.org mapping](https://op.europa.eu/documents/3938058/11669184/eli-sdo.ttl) informs the crosswalk.

## Normalized categories, types and topics

Official type codes are retained. They are also grouped into `primary`, `secondary`, `draft`, `eu-origin` and `other`, with separate jurisdiction and document-type facets. This preserves Church Measures, local/private Acts, old Parliament material, ministerial directions and other uncommon families rather than forcing them into a misleading primary/secondary binary.

Topics are a deterministic title-only discovery aid across constitutional, civil, criminal, employment, tax, company, land, environment, health, education, family, immigration, welfare, transport, data, consumer, local-government, election, defence, equality, intellectual-property, professional-regulation and EU themes. They are explicitly labelled non-authoritative. An agent must never treat a topic assignment as a legal proposition.

The complete work catalogue now emits provenance-bearing `classified as`, `has
document type` and conservative `mentions entity` relationships. A governed
model-assisted rule file proposes only high-precision literal title matches;
accepted rules are applied deterministically to every work and remain labelled
derived and non-official. Route-scoped FNV-1a adjacency shards let the Explorer
load the selected work's relationships without hydrating the corpus-wide edge
table. The model runner records prompt version, model, review state, token usage
and cost. Its first direct API attempt was rejected for project quota before
output, so the current accepted rules were supplied by the Codex session and
the recorded API cost is $0.00.

## Official access methods

Every record carries the URLs available from its Atom entry and documents the wider interfaces:

- website and stable identifier URIs;
- Atom search/browse feeds, including official full-text search;
- CLML/XML, Akoma Ntoso XML, HTML/XHTML, PDF and RDF manifestations where supplied;
- content negotiation and linked-data URIs;
- table-of-contents and publication-log feeds;
- changes made and changes received feeds for legal effects;
- point-in-time/version and extent controls exposed by legislation.gov.uk;
- bulk and SPARQL surfaces documented by the [Legislation Research service](https://research.legislation.gov.uk/data).

At the 2026-07-10 generation checkpoint, the advertised Research bulk downloads and SPARQL endpoint returned HTTP 401 with a “By Invitation Only” authentication challenge to an anonymous client, even though their documentation describes public access. The pack records this unresolved live-access conflict and uses the working public Atom/CLML interfaces. It does not silently claim that the restricted surfaces were harvested.

The builder identifies itself, caches every response, retries transient server errors and starts requests conservatively under the [official fair-use guidance](https://legislation.github.io/data-documentation/fair-use.html). Source response hashes, byte counts and cache status are written into provenance metadata.

## Agent workflow for counsel-grade answers

1. Read the descriptor, overview, counts and notices; do not hydrate the whole corpus.
2. Narrow by category, type, year, jurisdiction, legal status and topic.
3. Search locally for titles and let the Explorer add official remote full-text matches.
4. Select the work and load its official CLML subdivision tree.
5. Identify the exact Part/section/article/regulation/schedule nodes and open their official passage links.
6. Check the displayed version, commencement, extent and changes made/received before drawing a conclusion.
7. Build an answer as discrete propositions. For each proposition record source title, direct passage URL, supporting passage, version and retrieval date.
8. Separate statutory text, inference, missing facts and any need for case law or other authority. This pack is legislation-complete, not a case-law database and not legal advice.

An answer that cites only an Act landing page is not provenance-complete. A direct passage link and supporting passage are required for every material proposition.

## Evaluation

`evaluation/legislation/questions.json` contains 100 questions across 25 authorities and four common research modes: rule extraction, application, temporal/currency analysis and counsel-style synthesis. The 100-point rubric weights substantive correctness, authoritative sourcing, proposition provenance, pinpoint passages, temporal/jurisdictional context, completeness/uncertainty and clarity.

Automated checks cover evidence structure and observable source properties. Expert review supplies the legal judgment that an automated keyword score cannot. Missing official citations, missing proposition ledgers, uncited propositions or failure to cite the expected passage cap an answer below 50.

## Rebuild and validate

```sh
python3 scripts/build_legislation_okf.py --refresh
python3 scripts/check_legislation_okf.py
python3 scripts/build_legislation_evaluation.py
cd apps/okf-explorer && pnpm test && pnpm check && pnpm build
cd ../.. && python3 scripts/build_site.py
```

The source cache under `tmp/legislation-okf-source/` is intentionally untracked. The generated `legislation/` pack is checked in so Pages deployment and review do not depend on live upstream availability.
