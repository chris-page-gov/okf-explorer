---
type: "API Product"
title: "Police API"
description: "The API provides a rich data source for information, including: - neighbourhood team members - upcoming events - street-level crime and outcome data - nearest police stations The API is implemented as a standard JSON web service using HTTP GET and POST requests. Full request and response examples are provided in the documentation."
resource: "https://data.police.uk/api/"
timestamp: "2020-10-28"
tags: "government-services, justice-and-policing, rest-http, uk-police"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Police API

The API provides a rich data source for information, including: - neighbourhood team members - upcoming events - street-level crime and outcome data - nearest police stations The API is implemented as a standard JSON web service using HTTP GET and POST requests. Full request and response examples are provided in the documentation.

## Metadata

- Type: API Product
- Provider: [UK Police](../organisations/uk-police.md)
- Canonical provider: UK Police
- Source adapter: api_gov_uk_catalogue
- Source tier: declared_api_catalogue
- Confidence: declared
- Assurance status: declared
- Access model: unknown
- Contract status: documentation-only
- Licence: Not specified (not-specified)
- Licence basis: not-specified
- Licence source: not-specified
- Licence confidence: 0.2
- Quality band: medium
- DCAT term: `dcat:DataService`
- OpenAPI term: `OpenAPI Object`

- Endpoint: https://data.police.uk/api/
- Documentation: https://data.police.uk/docs/

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
