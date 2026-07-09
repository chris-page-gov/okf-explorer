# OKF Standards Crosswalk (DCAT-AP / OpenAPI)

This repository's OKF record contract ([okf-bundle-authoring.md](okf-bundle-authoring.md))
is deliberately plain-English Markdown and JSON, not RDF or an executable API
description. That is the right choice for authoring and for the Explorer, but
it means every bundle re-derives field names from scratch. This page is the
standing crosswalk between the OKF fields already in use (see the
`api-records/*.md` Metadata blocks in `uk-government-apis/`) and the two
external standards that already cover this domain:

- **DCAT / DCAT-AP** ([W3C DCAT 3](https://www.w3.org/TR/vocab-dcat-3/), a
  Recommendation since August 2024, and its European application profile
  [DCAT-AP 3.0.0](https://semiceu.github.io/DCAT-AP/releases/3.0.0/)) for
  describing a catalogued API as a `dcat:DataService` alongside the datasets
  it serves. This is the vocabulary GOV.UK's own CKAN-based catalogues
  (data.gov.uk) and EU open-data portals already use, so aligning to it keeps
  the UK Government APIs pack federatable with those catalogues rather than
  inventing a parallel schema.
- **OpenAPI** ([OAS 3.1/3.2](https://spec.openapis.org/oas/v3.1.0.html)) for
  the executable contract of a REST API: paths, operations, and security
  schemes. `sources/UK-Government-API-OKF.md` already states the governing
  principle — OKF describes, links, and governs the API estate; OpenAPI (and
  AsyncAPI, Arazzo) remain the executable domain contracts that OKF should
  reference, not replace. This document operationalises that principle field
  by field.

Use this page when designing a new bundle's frontmatter or generator, when
deciding what a new field should be called, or when someone outside this
repository asks "what does `licence basis` mean in DCAT/OpenAPI terms?"

## Status: standards-alignable, not standards-conformant

Nothing here changes today's output format. `uk-government-apis/api-records/*.md`
and the `okf-explorer.json` shards stay Markdown/JSON. Full DCAT-AP conformance
requires an RDF serialisation (Turtle/JSON-LD) with DCAT-AP's cardinality rules
(for example `dcat:endpointURL` is mandatory, 1..n); full OpenAPI conformance
requires a complete `openapi` document per API version. This repository does
neither yet. What this crosswalk guarantees instead is that every OKF field
already has a named, correct target in both standards, so a future exporter
(or a hand-written report, like the OS inventory produced from this pack) can
translate without guessing. Treat "DCAT-alignable" and "OpenAPI-alignable" as
the honest claim; do not describe a bundle as DCAT-AP or OpenAPI conformant
unless an RDF or `openapi.yaml` artefact actually ships alongside it.

## Repository implementation status

The standards are now localised in the OKF source tree as browser-compatible
Markdown concept pages:

- [DCAT](../standards/dcat.md) for `dcat:DataService`, `dcat:Dataset`,
  `dcat:endpointURL`, `dcat:endpointDescription`, publisher and licence terms.
- [DCAT-AP](../standards/dcat-ap.md) as the federated public-data catalogue
  profile that future RDF exports should validate against.
- [OpenAPI](../standards/openapi.md) for executable HTTP API descriptions,
  including `servers`, `paths`, operation objects, schemas and security schemes.
- [DQV](../standards/dqv.md) as the standards-family home for future quality
  annotations where OKF metadata-quality signals need export semantics.
- [W3C PROV](../standards/w3c-prov.md) for source adapter, observed timestamp
  and harvest activity provenance.

`scripts/build_uk_government_api_okf.py` applies this crosswalk to the
`uk-government-apis` large-corpus bundle by emitting, for each API/data record:

- `dcat_type`;
- `openapi_type`;
- `dcat_export_status`;
- `openapi_export_status`;
- `openapi_security_scheme`;
- `standards_alignment.dcat.required_missing`;
- `standards_alignment.openapi.required_missing`.

The generated descriptor also exposes `okf-standards-crosswalk.v1`, local and
official standard references, and aggregate missing-field counts in
`data/analysis/overview.json`. These fields are intentionally compact per
record; the full field semantics live here and in the local standards pages.

## API-bundle gap analysis

The current UK Government APIs OKF is much closer to a standards-aligned
catalogue than to executable API specification output. That is the right state
for an observed multi-source pack, but it leaves clear gaps:

| Export target | Current coverage | Remaining gap |
|---|---|---|
| DCAT `dcat:DataService` | API products, provider-native APIs and data-access endpoints are mapped to `dcat:DataService`; endpoint/documentation/publisher/licence fields are preserved when observed. | A DCAT-AP-conformant RDF exporter is not yet implemented; some records still lack explicit `dcat:endpointURL`, `dcat:endpointDescription`, licence or publisher evidence. |
| DCAT `dcat:Dataset` | data.gov.uk and ONS data products map to `dcat:Dataset`; provider and licence inference is recorded with basis and confidence. | Dataset distributions, themes and provenance need richer source-specific export rules before claiming DCAT-AP profile conformance. |
| OpenAPI service stub | API products and data endpoints can produce an `info`, `servers` and `externalDocs` skeleton where endpoint metadata exists. | Most harvested sources do not expose complete methods, paths, parameters, responses, schemas, examples or security flows, so generated OpenAPI is a stub unless a contract parser enriches it. |
| OpenAPI operation fragment | OS and ONS operation-like records can be represented as operation fragments. | HTTP method, operationId, parameters, request/response schemas and error models are often missing and must not be invented. |
| OpenAPI security schemes | `access_model` now maps to `apiKey`, `oauth2`, `none`, `metadata-only` or `unknown`. | The location/name of API keys, OAuth flow, scopes, token URLs and sender-constrained-token requirements need provider-specific contract parsing. |
| DQV quality annotations | OKF metadata-quality dimensions are named and explained in the UI. | No DQV RDF is emitted yet, and quality percentages remain catalogue-completeness signals rather than assurance metrics. |
| PROV provenance | Records and relationships carry source adapter, source URL, confidence and observed timestamp. | A full PROV activity graph for each adapter run is not emitted yet. |

For all API-related bundles, treat these gaps as build requirements rather than
documentation caveats. A bundle can be `standards-alignable` at publication
time, but it should not claim `DCAT-AP conformant` or `OpenAPI conformant`
until the relevant artefact is generated and validated.

## Export-readiness requirements

A DCAT export for an API-like record needs, at minimum:

- stable IRI or route;
- `rdf:type`, usually `dcat:DataService` or `dcat:Dataset`;
- `dcterms:title`;
- `dcterms:description`;
- `dcterms:publisher`;
- `dcterms:license`;
- `dcat:endpointURL` for services;
- `dcat:endpointDescription` where documentation or a contract is known;
- `dcat:servesDataset` when an API service exposes known data products;
- `dcterms:conformsTo` for OpenAPI, WSDL, OGC capabilities, SPARQL service
  descriptions or other contracts.

An OpenAPI export needs, at minimum:

- `openapi` version;
- `info.title`;
- `info.version` or a documented placeholder policy;
- `info.description`;
- `info.license` where known;
- `servers[].url`;
- `paths` with HTTP methods for operation-level records;
- operation summaries/descriptions;
- parameters and request/response schemas where known;
- `externalDocs.url` for documentation;
- `components.securitySchemes` when authentication is observed.

If any of these fields are unavailable, the exporter should emit either a
clearly labelled stub or no artefact. It must not invent method, parameter,
response, schema, licence, access or security details.

## Explorer terminology rules

The Explorer should prefer standards names where the standards are authoritative
and retain OKF names where the standards do not have an exact concept:

- Use code-style rendering for standards terms, for example
  `dcat:DataService`, `dcat:endpointURL`, `OpenAPI Object`,
  `Operation Object`, `components.securitySchemes`.
- Explain standards terms through info bubbles rather than replacing
  user-facing OKF labels wholesale.
- Distinguish metadata-quality percentages from DQV/assurance terminology.
- Keep OKF-native fields such as `confidence`, `licence_basis`,
  `source_adapter` and `relationship_density`, but describe their export
  target or standards gap.

## Record-type crosswalk

| OKF `type` (this repo) | DCAT / DCAT-AP class | OpenAPI equivalent | Notes |
|---|---|---|---|
| `API Product` | `dcat:DataService` | `info` object of one API's OpenAPI document | The product is the service-level description; DCAT does not separate product/version, so version state goes in `dct:conformsTo` / `dcat:version` on the same `DataService`. |
| `API Operation` | Not a separate DCAT class — model as `dcat:endpointURL` + `dcat:endpointDescription` on the parent `dcat:DataService`, or as a `dcat:Distribution` when the operation returns a static extract | `paths.<path>.<method>` operation object | DCAT has no first-class "operation" concept; this is a known gap the repo already documents in `sources/UK-Government-API-OKF.md`. Keep `API Operation` as an OKF-native type and only crosswalk its fields (endpoint, doc, access) upward to the parent product's `DataService`. |
| `Capability Document` / `Contract` | The value of `dct:conformsTo` on the related `dcat:DataService` | The `openapi.yaml`/WSDL/WFS capabilities document itself | Do not model contracts as their own `DataService`; they are the standard the service conforms to. |
| `Provider API Portal` | `foaf:homepage` / `dcat:landingPage` of the publisher's `dcat:Catalog` | `servers` entry with no dedicated OpenAPI concept | Portal pages are catalogue-level, not service-level. |
| `Organisation` | `dct:publisher` (`foaf:Agent`) | `info.contact` / `info.license` attribution | — |
| `Data Product` / `Dataset` | `dcat:Dataset` | Not represented in OpenAPI (OpenAPI describes the service, not the data) | `dcat:servesDataset` links the `DataService` to this. |

## Field crosswalk

| OKF field (Metadata block / Minimum Record Contract) | DCAT / DCAT-AP property | OpenAPI field | Notes |
|---|---|---|---|
| `title` | `dcterms:title` | `info.title` (product) / operation `summary` (operation) | Direct mapping. |
| `description` | `dcterms:description` | `info.description` / operation `description` | Direct mapping. |
| `id` / `route` | catalogue-assigned IRI for the resource | N/A (routes are an OKF/Explorer concept) | DCAT wants a global IRI; the route is this repo's stable local identifier and should be treated as the local part of that IRI. |
| `type` / `record_type` | `rdf:type` (see record-type table above) | N/A | — |
| Provider / Canonical provider | `dct:publisher` | `info.contact` | — |
| Endpoint | `dcat:endpointURL` | `servers[].url` (product) or resolved `{server}{path}` (operation) | `dcat:endpointURL` is DCAT-AP's one *mandatory* `DataService` property — if a bundle can only guarantee one crosswalk-ready field, make it this one. |
| Documentation | `dcat:endpointDescription` | `externalDocs.url` | DCAT 3 explicitly recommends `dcat:endpointDescription` point at a machine- or human-readable description of the endpoint's operations and parameters — the same role `externalDocs` plays in OpenAPI. |
| Source tier / Source adapter | `dcterms:provenance` (free text) or a `prov:Activity` on a `dcat:CatalogRecord` | N/A | OpenAPI has no provenance concept; this stays OKF/DCAT-only. |
| Confidence / Assurance status | No direct DCAT property — closest is `dqv:QualityAnnotation` (Data Quality Vocabulary, used alongside DCAT) | N/A | Flag as a genuine gap rather than forcing a fit. |
| Contract status | `dcterms:conformsTo` (points at the contract resource) | Presence/absence of a discoverable `openapi.yaml` | — |
| Licence | `dcterms:license` | `info.license.name` / `info.license.url` | Direct mapping. |
| Licence basis / Licence confidence | No DCAT property — this is OKF's own provenance-of-metadata concept | N/A | Keep as an OKF-native field; note it in `dcterms:provenance` free text if exporting. |
| Access model | Not modelled in DCAT directly; DCAT-AP uses `dcatap:availability` for a different concept (distribution lifecycle, not auth) | `components.securitySchemes.<name>.type` | See the access-model table below — this is the one field where OpenAPI, not DCAT, is the authoritative vocabulary. |
| Tags / topics | `dcat:keyword` / `dcat:theme` | `tags` | Direct mapping. |
| Timestamps (`timestamp`, generated/observed dates) | `dcterms:issued` / `dcterms:modified` | `info.version` (for the API's own version history, not wall-clock time) | — |

## Access model → OpenAPI `securityScheme.type`

| OKF `access_model` value | OpenAPI `securitySchemes.<name>.type` | Notes |
|---|---|---|
| `api-key` | `apiKey` | Set `in`/`name` to `header`/`query` per provider docs when known; this repo does not currently record that level of detail. |
| `oauth2` | `oauth2` | Record the flow (`authorizationCode`, `clientCredentials`, etc.) once known; OS's `OS OAuth 2 API` record is the flow endpoint itself and should be the `tokenUrl` of an `oauth2` scheme. |
| `unknown` | Omit `security`/`securitySchemes` and say so explicitly | This is a metadata gap, not evidence the API is open. Per `okf-bundle-authoring.md`'s metadata-repair rules, never silently upgrade `unknown` to `none`. |
| (not yet used) `none` | Empty `security: []` | Reserve this for a source that explicitly documents no authentication, not for missing data. |

## Worked example: OS Places API postcode Operation

This is the record from `uk-government-apis/api-records/ordnance-survey-operation-https-api-os-uk-search-places-v1-postcode.md`.

Existing OKF metadata (unchanged):

```text
- Type: API Operation
- Endpoint: https://api.os.uk/search/places/v1/postcode
- Documentation: https://osdatahub.os.uk/docs/places/overview
- Access model: api-key
- Licence: Ordnance Survey licence required
- Licence basis: provider-terms-inferred
```

Equivalent DCAT (DCAT 3 Turtle, on the parent `OS Places API` `DataService`,
per the record-type table above — operations roll up rather than each getting
their own `DataService`):

```turtle
<https://api.os.uk/search/places/v1>
  a dcat:DataService ;
  dcterms:title "OS Places API" ;
  dcat:endpointURL <https://api.os.uk/search/places/v1> ;
  dcat:endpointDescription <https://osdatahub.os.uk/docs/places/overview> ;
  dcterms:license <https://www.ordnancesurvey.co.uk/licensing> ;
  dcterms:publisher <https://www.ordnancesurvey.co.uk/> .
```

Equivalent OpenAPI path-item fragment (operation-level):

```yaml
paths:
  /search/places/v1/postcode:
    get:
      summary: OS Places API postcode Operation
      description: >-
        A search based on a property's postcode.
      externalDocs:
        url: https://osdatahub.os.uk/docs/places/overview
      security:
        - apiKeyAuth: []
components:
  securitySchemes:
    apiKeyAuth:
      type: apiKey
      in: query
      name: key
```

The `apiKey` `in`/`name` values above are illustrative — this repository does
not currently harvest that level of detail and a generator should not invent
it; leave `in`/`name` unset (or add a documented `unknown` placeholder) until
a source declares it.

## How to use this when building a bundle

1. Start from `okf-bundle-authoring.md`'s Minimum Record Contract — it is
   still the canonical authoring reference.
2. When you need to name a new field, check the field crosswalk table first.
   Reusing a name that already has a DCAT/OpenAPI target keeps the bundle
   federatable; inventing a new name for something already in this table is a
   documentation debt.
3. If a concept genuinely has no DCAT or OpenAPI equivalent (confidence,
   licence basis, quality bands are the known examples), keep it OKF-native
   and say so here rather than forcing a bad fit.
4. If a bundle ever ships an RDF or `openapi.yaml` export, it should be
   generated from these mappings, and the export's conformance claim should
   be checked against the "standards-alignable, not standards-conformant"
   section above before it is described as DCAT-AP or OpenAPI conformant.

## Sources

- [Data Catalog Vocabulary (DCAT) — Version 3, W3C Recommendation, 22 August 2024](https://www.w3.org/TR/vocab-dcat-3/)
- [DCAT-AP 3.0.0, SEMICeu](https://semiceu.github.io/DCAT-AP/releases/3.0.0/)
- [OpenAPI Specification v3.1.0](https://spec.openapis.org/oas/v3.1.0.html)
- [OpenAPI Specification v3.2.0](https://spec.openapis.org/oas/v3.2.0.html)
- [Describing API Security, OpenAPI Initiative](https://learn.openapis.org/specification/security.html)
- `sources/UK-Government-API-OKF.md` (this repository's own design note mapping the API domain onto OKF, and the source of the "OKF describes/links/governs, OpenAPI remains the executable contract" principle)
