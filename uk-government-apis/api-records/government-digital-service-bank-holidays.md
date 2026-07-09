---
type: "API Product"
title: "Bank Holidays"
description: "The Bank Holidays API provides access to data about when bank holidays are in England and Wales, Scotland and Northern Ireland."
resource: "https://www.gov.uk/bank-holidays.json"
timestamp: "2020-08-24"
tags: "government-digital-service, government-services, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Bank Holidays

The Bank Holidays API provides access to data about when bank holidays are in England and Wales, Scotland and Northern Ireland.

## Metadata

- Type: API Product
- Provider: [Government Digital Service](../organisations/government-digital-service.md)
- Canonical provider: Government Digital Service
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

- Endpoint: https://www.gov.uk/bank-holidays.json
- Documentation: https://github.com/alphagov/frontend/blob/main/docs/calendars.md#calendars

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
