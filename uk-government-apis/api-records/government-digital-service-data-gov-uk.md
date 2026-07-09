---
type: "API Product"
title: "Data.gov.uk"
description: "This API allows you to access the data.gov.uk dataset metadata in a machine-readable way, as JSON. A dataset's metadata includes details such as title, description, usage licence, and a list of 'resources', which describe each data file that makes up the dataset. Each resource contains a format, description and URL (for example for download)."
resource: "https://data.gov.uk/api/action/"
timestamp: "2020-08-24"
tags: "government-digital-service, government-services, population-and-statistics, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Data.gov.uk

This API allows you to access the data.gov.uk dataset metadata in a machine-readable way, as JSON. A dataset's metadata includes details such as title, description, usage licence, and a list of 'resources', which describe each data file that makes up the dataset. Each resource contains a format, description and URL (for example for download).

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

- Endpoint: https://data.gov.uk/api/action/
- Documentation: https://guidance.data.gov.uk/get_data/api_documentation/

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
