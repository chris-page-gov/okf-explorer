---
type: "API Product"
title: "Historic England Aerial Investigation Mapping data"
description: "Spatial data depicting archaeology that has been identified, mapped and recorded using aerial photographs and other aerial sources across England. Various data recorded by Historic England relating to aerial investigation and mapping projects. N.B. This is a dynamic dataset that is constantly evolving, not only with the addition of newly completed projects, but also with the reassessment of some earlier projects. See https://historicengland.org.uk/research/methods/airborne-remote-sensing/aerial-investigation/ for further details of Historic England's work with aerial sources."
resource: "https://services-eu1.arcgis.com/ZOdPfBS3aqqDYPUQ/arcgis/rest/services/HE_AIM_data/FeatureServer"
timestamp: "2023-10-11"
tags: "arcgis-rest, geospatial, historic-england, population-and-statistics"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Historic England Aerial Investigation Mapping data

Spatial data depicting archaeology that has been identified, mapped and recorded using aerial photographs and other aerial sources across England. Various data recorded by Historic England relating to aerial investigation and mapping projects. N.B. This is a dynamic dataset that is constantly evolving, not only with the addition of newly completed projects, but also with the reassessment of some earlier projects. See https://historicengland.org.uk/research/methods/airborne-remote-sensing/aerial-investigation/ for further details of Historic England's work with aerial sources.

## Metadata

- Type: API Product
- Provider: [Historic England](../organisations/historic-england.md)
- Canonical provider: Historic England
- Source adapter: api_gov_uk_catalogue
- Source tier: declared_api_catalogue
- Confidence: declared
- Assurance status: declared
- Access model: unknown
- Contract status: undocumented-in-catalogue
- Licence: Open Government Licence v3.0 (open-government-licence-v3)
- Licence basis: source-declared
- Licence source: Open Government Licence
- Licence confidence: 0.9
- Quality band: medium
- DCAT term: `dcat:DataService`
- OpenAPI term: `OpenAPI Object`

- Endpoint: https://services-eu1.arcgis.com/ZOdPfBS3aqqDYPUQ/arcgis/rest/services/HE_AIM_data/FeatureServer

## Standards Alignment

This generated record is standards-alignable, not standards-conformant by itself. DCAT-AP conformance needs an RDF export; OpenAPI conformance needs a complete `openapi` document.

- DCAT / DCAT-AP: `dcat:DataService`; export status `data-service-with-gaps`.
- DCAT missing requirements: `dcat:endpointDescription`
- OpenAPI: `OpenAPI Object`; export status `service-stub-with-gaps`.
- OpenAPI security scheme: `unknown`.
- OpenAPI missing requirements: `components.securitySchemes`, `externalDocs.url`
- Crosswalk: [OKF Standards Crosswalk](../../docs/okf-standards-crosswalk.md)

## Credential Requirements

- unknown: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: GOV.UK API Catalogue CSV
- Source URL: https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv
