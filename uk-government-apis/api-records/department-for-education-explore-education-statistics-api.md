---
type: "API Product"
title: "Explore education statistics API"
description: "The explore education statistics API is built following REST principles and provides access to data sets published by on the explore education statistics service, allowing you to: - get summary information about data sets and their related resources - query data sets based on specific criteria - download the underlying CSV files of data sets Note that not all data sets available in EES are accessible via the API. For a full list of data sets published by EES, visit the [Data catalogue](https://explore-education-statistics.service.gov.uk/data-catalogue) on the main website."
resource: "https://explore-education-statistics.service.gov.uk/"
timestamp: "2025-03-25"
tags: "department-for-education, education-and-skills, government-services, population-and-statistics, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Explore education statistics API

The explore education statistics API is built following REST principles and provides access to data sets published by on the explore education statistics service, allowing you to: - get summary information about data sets and their related resources - query data sets based on specific criteria - download the underlying CSV files of data sets Note that not all data sets available in EES are accessible via the API. For a full list of data sets published by EES, visit the [Data catalogue](https://explore-education-statistics.service.gov.uk/data-catalogue) on the main website.

## Metadata

- Type: API Product
- Provider: [Department for Education](../organisations/department-for-education.md)
- Canonical provider: Department for Education
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

- Endpoint: https://explore-education-statistics.service.gov.uk/
- Documentation: https://api.education.gov.uk/statistics/docs/

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
