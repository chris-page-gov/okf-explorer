---
type: "API Product"
title: "Driver Find API"
description: "The Find Driver API allows authorised external clients to retrieve summary driver data with fine-grained search criteria. It returns driver summary data, including driving licence number, last name and gender, for the supplied search criteria."
resource: "https://driver-vehicle-licensing.api.gov.uk/driver-find"
timestamp: "2023-10-12"
tags: "driver-and-vehicle-licensing-agency, government-services, rest-http, transport"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Driver Find API

The Find Driver API allows authorised external clients to retrieve summary driver data with fine-grained search criteria. It returns driver summary data, including driving licence number, last name and gender, for the supplied search criteria.

## Metadata

- Type: API Product
- Provider: [Driver And Vehicle Licensing Agency](../organisations/driver-and-vehicle-licensing-agency.md)
- Canonical provider: Driver And Vehicle Licensing Agency
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

- Endpoint: https://driver-vehicle-licensing.api.gov.uk/driver-find
- Documentation: https://developer-portal.driver-vehicle-licensing.api.gov.uk/apis/drivers-find/drivers-find-description.html

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
