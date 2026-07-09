---
type: "API Product"
title: "BGS OpenGeoscience OGCAPI Server"
description: "This server provides endpoints for a selection of BGS geospatial data using the OGCAPI suite of standards (https://ogcapi.ogc.org/). Data includes; geology, sensor, earthquake, landslide and borehole data. The BGS has a wide range of datasets and wants to increase access to these, publishing as many as possible under Open Government Licence. The API is powered by https://pygeoapi.io/"
resource: "https://ogcapi.bgs.ac.uk/openapi?f=json"
timestamp: "2022-02-01"
tags: "bgs, geospatial, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# BGS OpenGeoscience OGCAPI Server

This server provides endpoints for a selection of BGS geospatial data using the OGCAPI suite of standards (https://ogcapi.ogc.org/). Data includes; geology, sensor, earthquake, landslide and borehole data. The BGS has a wide range of datasets and wants to increase access to these, publishing as many as possible under Open Government Licence. The API is powered by https://pygeoapi.io/

## Metadata

- Type: API Product
- Provider: [BGS](../organisations/bgs.md)
- Canonical provider: BGS
- Source adapter: api_gov_uk_catalogue
- Source tier: declared_api_catalogue
- Confidence: declared
- Assurance status: declared
- Access model: unknown
- Contract status: openapi-indicated
- Licence: data under open government license (data-under-open-government-license)
- Licence basis: source-declared
- Licence source: Data under Open Government License
- Licence confidence: 0.9
- Quality band: high
- DCAT term: `dcat:DataService`
- OpenAPI term: `OpenAPI Object`

- Endpoint: https://ogcapi.bgs.ac.uk/openapi?f=json
- Documentation: https://ogcapi.bgs.ac.uk/openapi?f=html

## Standards Alignment

This generated record is standards-alignable, not standards-conformant by itself. DCAT-AP conformance needs an RDF export; OpenAPI conformance needs a complete `openapi` document.

- DCAT / DCAT-AP: `dcat:DataService`; export status `data-service-ready`.
- DCAT missing requirements: none recorded
- OpenAPI: `OpenAPI Object`; export status `service-stub-with-gaps`.
- OpenAPI security scheme: `unknown`.
- OpenAPI missing requirements: `components.securitySchemes`
- Crosswalk: [OKF Standards Crosswalk](../../docs/okf-standards-crosswalk.md)

## Credential Requirements

- unknown: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: GOV.UK API Catalogue CSV
- Source URL: https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv
