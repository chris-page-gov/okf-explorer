---
type: "API Product"
title: "Access to Driver Data API"
description: "The Access to Driver Data API allows authorised consumers to retrieve the driving records of UK citizens. It returns driver data, including current driving licence details, for a supplied driving licence number."
resource: "https://driver-vehicle-licensing.api.gov.uk/full-driver-enquiry/v1/driving-licences/retrieve"
timestamp: "2023-10-12"
tags: "driver-and-vehicle-licensing-agency, rest-http, transport"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Access to Driver Data API

The Access to Driver Data API allows authorised consumers to retrieve the driving records of UK citizens. It returns driver data, including current driving licence details, for a supplied driving licence number.

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

- Endpoint: https://driver-vehicle-licensing.api.gov.uk/full-driver-enquiry/v1/driving-licences/retrieve
- Documentation: https://developer-portal.driver-vehicle-licensing.api.gov.uk/apis/driver-view/driver-view-description.html

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
