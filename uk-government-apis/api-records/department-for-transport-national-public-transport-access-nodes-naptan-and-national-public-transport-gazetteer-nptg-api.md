---
type: "API Product"
title: "National Public Transport Access Nodes (NaPTAN) and National Public Transport Gazetteer (NPTG) API"
description: "The NaPTAN & NPTG API can be used to automatically download transport, gazetteer and locality data. The API has three endpoints. The NaPTAN API allows you to download data either by ATCOAreaCode, a group of ATCOAreaCodes or the whole national dataset. The NPTG API allows you to download national gazetteer dataset. The NPTG localities API allows you to download national localities' dataset. The NaPTAN & NPTG data are available in either XML or CSV format."
resource: "https://naptan.api.dft.gov.uk/swagger/index.html"
timestamp: "2022-01-07"
tags: "department-for-transport, geospatial, population-and-statistics, rest-http, transport"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# National Public Transport Access Nodes (NaPTAN) and National Public Transport Gazetteer (NPTG) API

The NaPTAN & NPTG API can be used to automatically download transport, gazetteer and locality data. The API has three endpoints. The NaPTAN API allows you to download data either by ATCOAreaCode, a group of ATCOAreaCodes or the whole national dataset. The NPTG API allows you to download national gazetteer dataset. The NPTG localities API allows you to download national localities' dataset. The NaPTAN & NPTG data are available in either XML or CSV format.

## Metadata

- Type: API Product
- Provider: [Department for Transport](../organisations/department-for-transport.md)
- Canonical provider: Department for Transport
- Source adapter: api_gov_uk_catalogue
- Source tier: declared_api_catalogue
- Confidence: declared
- Assurance status: declared
- Access model: unknown
- Contract status: openapi-indicated
- Licence: Not specified (not-specified)
- Licence basis: not-specified
- Licence source: not-specified
- Licence confidence: 0.2
- Quality band: high
- DCAT term: `dcat:DataService`
- OpenAPI term: `OpenAPI Object`

- Endpoint: https://naptan.api.dft.gov.uk/swagger/index.html
- Documentation: https://naptan.api.dft.gov.uk/swagger/index.html

## Standards Alignment

This generated record is standards-alignable, not standards-conformant by itself. DCAT-AP conformance needs an RDF export; OpenAPI conformance needs a complete `openapi` document.

- DCAT / DCAT-AP: `dcat:DataService`; export status `data-service-with-gaps`.
- DCAT missing requirements: `dcterms:license`
- OpenAPI: `OpenAPI Object`; export status `service-stub-with-gaps`.
- OpenAPI security scheme: `unknown`.
- OpenAPI missing requirements: `components.securitySchemes`, `info.license`
- Crosswalk: [OKF Standards Crosswalk](../../docs/okf-standards-crosswalk.md)

## Credential Requirements

- unknown: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: GOV.UK API Catalogue CSV
- Source URL: https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv
