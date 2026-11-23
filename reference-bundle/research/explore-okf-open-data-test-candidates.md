---
type: "Research"
title: "Open data for the Explore OKF pilot"
description: "Authoritative UK sources and a bounded Coventry citizen journey for testing readable labels, useful semantic linking and exploratory publication."
tags: [okf, authoring, linked-data, uk-government, public-services]
language: en-GB
generated: { by: process:okf-authoring-methodology-review, at: 2026-08-12T00:00:00Z }
status: draft
sources:
  - { id: w3c-dwbp, resource: "https://www.w3.org/TR/dwbp/" }
  - { id: cpsv-ap, resource: "https://semiceu.github.io/CPSV-AP/" }
  - { id: govuk-content-api, resource: "https://content-api.publishing.service.gov.uk/" }
  - { id: ons-digital-boundaries, resource: "https://www.ons.gov.uk/methodology/geography/geographicalproducts/digitalboundaries" }
---

# Open Data For The Explore OKF Pilot

Status: researched shortlist for owner review, 12 August 2026.

This note selects public, understandable data that can test the revised OKF
authoring methodology recorded in the companion documentation source
`docs/okf-authoring-methodology-review-2026-08-12.md` before the full
`okf-uk-living` pack is reviewed. It is a source plan, not a claim that every
source has already been acquired or licensed for every use.

## Recommended Pilot

Use one bounded citizen story: **moving to Coventry and finding everyday local
services**. Limit the first snapshot to one local-authority area, a small set
of service types and roughly 30–60 human-facing entities.

The pilot should let someone answer:

- What official guidance applies when I move home?
- Which council area and boundary contains the selected place?
- Who manages household waste and what official statistics describe it?
- Which schools, health organisations, transport stops and police services are
  nearby or serve the area?
- Which organisation provides each service, what is its official identifier
  and where can I verify it?
- Which links are official facts, reviewed mappings, editorial navigation or
  unresolved hypotheses?

This slice is deliberately smaller than the life-course corpus. It exercises
the hard cross-linking problems without repeating Land Registry or processing
thousands of records before a person can review the model.

## Source Shortlist

| Source | What it contributes | Linking value | Access and cautions | Pilot decision |
| --- | --- | --- | --- | --- |
| [GOV.UK Content API](https://content-api.publishing.service.gov.uk/) | Official guidance and content links, including publishing organisations | Connect citizen tasks, guidance, organisations and related content through stable GOV.UK paths | No authentication is required; the service is beta and documents a 10 requests/second limit. Snapshot exact responses and retain source paths | Include a small hand-selected set |
| [data.gov.uk CKAN API](https://guidance.data.gov.uk/get_data/api_documentation/) | Dataset and publisher metadata | Connect service topics to official datasets and catalogue publishers | No API key and no stated rate limit, but each dataset's own licence and source must still be checked | Include metadata discovery only |
| [ONS digital boundaries](https://www.ons.gov.uk/methodology/geography/geographicalproducts/digitalboundaries) | Full, generalised, clipped and ultra-generalised administrative boundaries | Anchor records to official geography codes and test scale-appropriate map sidecars | Boundary vintages change. Select the correct date and generalisation for the rendered scale; record OGL attribution | Include Coventry boundary at several resolutions |
| [ONS postcode products](https://www.ons.gov.uk/methodology/geography/geographicalproducts/postcodeproducts) | Postcode-to-geography lookup products | Join a citizen-entered postcode to official statistical and administrative geographies | Postcodes can be sensitive when combined with personal records; the pilot uses an area/example postcode, never a person's address | Include one non-personal demonstration lookup |
| [WasteDataFlow local-authority waste data](https://www.data.gov.uk/dataset/0e0c12d8-24f6-461f-b4bc-f6d6a5bf2de5/waste-data-flow) | Local-authority waste-management statistics | Connect the everyday “rubbish and recycling” topic to a council and official data evidence | Bulk CSV under the stated Open Government Licence; distinguish service guidance from statistics and verify current resource links | Include one recent Coventry slice |
| [NaPTAN downloads](https://beta-naptan.dft.gov.uk/download) | National Public Transport Access Nodes | Test official stop identifiers, names, coordinates and local-authority subsets | National and local-authority CSV/XML downloads are available; snapshot a bounded subset and preserve native codes | Include a small Coventry subset |
| [Get Information about Schools](https://www.get-information-schools.service.gov.uk/) | Establishment and group records | Test schools, responsible bodies, establishment status and official identifiers | Public search/download is available, while editing functions are secured. Record download date and field definitions | Include a few representative establishments |
| [NHS Organisation Data Service FHIR API](https://digital.nhs.uk/developer/api-catalogue/organisation-data-service-fhir) | Health-service organisations and relationships | Test official organisation codes, names, roles and lifecycle | API and downloadable OpenAPI description are available. Organisations are not evidence that a particular person is eligible or registered | Include a few Coventry organisations |
| [Police API](https://www.api.gov.uk/ukp/police-api/) | Police forces, neighbourhoods, stations, street-level crime and outcomes | Test organisation, place and service relationships plus strong privacy/interpretation limits | The catalogue lists JSON endpoints; crime points can be anonymised/approximated and must not be treated as a person's event | Include organisation/neighbourhood metadata; defer crime events |
| [legislation.gov.uk developer resources](https://www.legislation.gov.uk/developer) | Legislation identities and machine formats | Link a carefully chosen service rule to an official legislative work | Legal relevance must be evidenced, not inferred from keywords; do not turn guidance into legal advice | Conditional, one reviewed example at most |
| [Companies House API](https://developer.company-information.service.gov.uk/get-started) | Public company and officer data | Later tests a “start a company” journey and official company identifiers | Requires an API key. Do not make credentials part of the first public zero-credential fixture | Defer to a second pilot |

Being listed in the [UK Government API Catalogue](https://www.api.gov.uk/) does
not prove that an endpoint is open, anonymous, current or licensed for the
intended operation. Each source retains its own access and rights decision.

## Semantic Model To Exercise

### Entity Families

- citizen life event or task;
- public service;
- guidance/content item;
- public organisation and organisational unit;
- dataset and distribution;
- place, statistical geography and boundary representation;
- school, health organisation, transport stop and police neighbourhood;
- concept scheme, concept and mapping assertion; and
- source observation, generation activity, rights statement and evidence item.

### Reused Vocabularies

- [CPSV-AP](https://semiceu.github.io/CPSV-AP/) for evidenced public services,
  events, channels and competent authorities;
- [DCAT 3](https://www.w3.org/TR/vocab-dcat-3/) and DCAT-AP where applicable for
  datasets, catalogues and distributions;
- [SKOS](https://www.w3.org/TR/skos-reference/) for the life-event/topic scheme
  and qualified mappings;
- [PROV-O](https://www.w3.org/TR/prov-o/) and Dublin Core Terms for source and
  generation evidence;
- Schema.org only where an exact class/property mapping is evidenced; and
- GeoSPARQL or an explicitly scoped geospatial projection for geometry and
  spatial relations, without inferring administrative containment from a
  rough display polygon.

The [W3C Data on the Web Best Practices](https://www.w3.org/TR/dwbp/) provides
the cross-domain publication baseline: stable identifiers, reused vocabulary,
coverage, provenance, licensing, feedback and complementary human/machine
presentations.

## Cross-Link Register

The pilot should create and review link sets rather than adding incidental
edges.

| Link set | Example predicate | Evidence rule | Coverage denominator |
| --- | --- | --- | --- |
| Service to provider | CPSV `hasCompetentAuthority` or reviewed equivalent | Source explicitly names the responsible body | All included public services |
| Service to life event | CPSV event/service relation or local editorial navigation predicate | Source/profile review establishes relevance; never keyword similarity alone | All included services intended for life-event navigation |
| Record to official source | `prov:wasDerivedFrom` / `dcterms:source` | Exact acquired source response or distribution | Every generated record |
| Organisation to official identifier | Source-native identifier plus governed IRI mapping | Issuer and identifier syntax match | Every included organisation eligible for that register |
| Entity to place | `dcterms:spatial` or governed domain predicate | Exact official code, coordinate or reviewed containment evidence | Every included location-dependent entity |
| Concept mapping | SKOS mapping property | Scheme scope and mapping strength reviewed | Every local concept declared eligible for external mapping |
| Dataset to distribution | `dcat:distribution` | Catalogue/source explicitly relates them | Every included dataset with a public distribution |
| Boundary to resolution/vintage | local governed projection plus provenance | ONS product metadata names resolution and date | Every cached boundary representation |

Each row expands into an exact unique candidate-ID inventory plus linked,
unresolved, excluded and conflicting candidate-ID sets whose disjoint union is
the inventory. The deterministic extraction rule, canonical inventory digest
and evidence bind it to the frozen source snapshot. Link assertions are
counted separately; each has a stable ID and one identity-bound dereference
result. An
exclusion names the exact eligible candidate IDs, rule and evidence and cannot
overlap another outcome. The pilot should not set a percentage target before
the eligible population is known, but graph-reachable label coverage is always
100 per cent. This proves reconciliation only inside the author-declared
inventory; owner/domain review must judge whether the deterministic eligibility
rule omitted anything from the frozen source snapshot. Mapping predicates must
agree with their declared strength. Every target must remain inside its
URI-aware namespace, with encoded path delimiters rejected. Duplicate
candidate-target assertions are rejected, and dereference outcomes come from
machine-readable terminal results. For approved v1 results, one approval-grade
evidence item must carry both the canonical complete-result digest and the
result's exact `observed_at`; coverage must also be current.

## Boundary Sidecar Test

The Coventry example is well suited to the proposed governed multi-resolution
geospatial pack. Cache the same official boundary at the resolutions needed
for national overview, regional context and local inspection. Each member
records:

- official geography code and boundary vintage;
- source product and retrieval evidence;
- simplification/generalisation level and intended zoom range;
- coordinate reference system and generated GeoJSON projection;
- licence and attribution;
- geometry hash, byte count and bounding box; and
- a rule prohibiting the geometry from being used as more precise evidence
  than its source/generalisation supports.

This directly tests the earlier failure where a crude three-polygon UK outline
looked authoritative at the wrong scale.

## Exploratory Publication Shape

The first Explore OKF snapshot should contain:

- a one-page citizen narrative and five to ten competency questions;
- 30–60 entity records with complete readable labels;
- a compact label/type index covering every relationship endpoint;
- a small SKOS concept scheme for “moving home and local services”;
- CPSV-AP service projections only for evidenced services;
- several source-native official identifier mappings;
- a multi-resolution Coventry boundary sidecar;
- link-coverage and unresolved-mapping tables;
- a limitations and source-rights page;
- machine-equivalent YAML-LD/JSON-LD/RDF projections where selected; and
- an exploratory descriptor/banner with route-preserving feedback.

It should not contain the complete `okf-uk-living` corpus, personal addresses,
an inferred legal-advice graph, live credentials or bulk crime-event data.

## Test Matrix

| Risk or capability | Deliberate fixture |
| --- | --- |
| Opaque identifiers | Official codes and generated IDs whose readable labels must still appear in every view |
| False identity | Similar organisation/place names with different official identifiers |
| Qualified mappings | Exact, close, broader, related and unresolved SKOS examples |
| Lazy loading | A relationship whose endpoint is outside the current record shard but present in the compact label index |
| Duplicate projection | The same governed assertion available from semantic and compatibility metadata paths |
| Temporal change | Organisation or boundary records with explicit vintage/status |
| Geospatial scale | Full and generalised boundary representations selected at different zooms |
| Access difference | Anonymous APIs, bulk files and a planned credentialled source |
| Source failure | One unavailable response retained as a gap, never fabricated |
| Citizen readability | A novice journey that names providers, places and next actions without exposing internal IDs |
| Exploratory status | Banner persists across Reader, Graph, Links, Map and copied deep links |

## Selection Decision

Start with GOV.UK content, ONS geography, WasteDataFlow and a very small
NaPTAN/GIAS/NHS ODS selection. Add Police organisation metadata only if the
first slice remains easy to understand. Defer Companies House and legislation
until the core label, link, banner and feedback contracts pass.

This source order minimises access friction while providing heterogeneous
identifiers, organisations, services, datasets, places, geometry and concept
mappings. It is sufficiently everyday to explain an ontology to a novice and
sufficiently structured to expose authoring-method defects before the
`okf-uk-living` review.
