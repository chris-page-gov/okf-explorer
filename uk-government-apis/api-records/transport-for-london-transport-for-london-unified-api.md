---
type: "API Product"
title: "Transport for London Unified API"
description: "OpenAPI / Swagger spec: https://api.tfl.gov.uk/swagger/docs/v1 Swagger UI is here : https://api.tfl.gov.uk/swagger/ui/index.html To use the Unified API, developers should register for an Application ID and Key. Append the `app_id` and `app_key` query parameters to your requests. The public TfL data (or 'open data') released here is for open data users to use in their own software and services. We encourage software developers to use this data to present customer travel information in innovative ways - providing they adhere to the transport data terms and conditions."
resource: "https://api.tfl.gov.uk/"
timestamp: "2020-10-28"
tags: "government-services, planning-and-property, rest-http, transport, transport-for-london"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Transport for London Unified API

OpenAPI / Swagger spec: https://api.tfl.gov.uk/swagger/docs/v1 Swagger UI is here : https://api.tfl.gov.uk/swagger/ui/index.html To use the Unified API, developers should register for an Application ID and Key. Append the `app_id` and `app_key` query parameters to your requests. The public TfL data (or 'open data') released here is for open data users to use in their own software and services. We encourage software developers to use this data to present customer travel information in innovative ways - providing they adhere to the transport data terms and conditions.

## Metadata

- Type: API Product
- Provider: [Transport For London](../organisations/transport-for-london.md)
- Canonical provider: Transport For London
- Source adapter: api_gov_uk_catalogue
- Source tier: declared_api_catalogue
- Confidence: declared
- Assurance status: declared
- Access model: approval-required
- Contract status: openapi-indicated
- Licence: Not specified (not-specified)
- Licence basis: not-specified
- Licence source: not-specified
- Licence confidence: 0.2
- Quality band: high
- DCAT term: `dcat:DataService`
- OpenAPI term: `OpenAPI Object`

- Endpoint: https://api.tfl.gov.uk/
- Documentation: https://api.tfl.gov.uk/

## Standards Alignment

This generated record is standards-alignable, not standards-conformant by itself. DCAT-AP conformance needs an RDF export; OpenAPI conformance needs a complete `openapi` document.

- DCAT / DCAT-AP: `dcat:DataService`; export status `data-service-with-gaps`.
- DCAT missing requirements: `dcterms:license`
- OpenAPI: `OpenAPI Object`; export status `service-stub-with-gaps`.
- OpenAPI security scheme: `metadata-only`.
- OpenAPI missing requirements: `info.license`
- Crosswalk: [OKF Standards Crosswalk](../../docs/okf-standards-crosswalk.md)

## Credential Requirements

- approval_required: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: GOV.UK API Catalogue CSV
- Source URL: https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv
