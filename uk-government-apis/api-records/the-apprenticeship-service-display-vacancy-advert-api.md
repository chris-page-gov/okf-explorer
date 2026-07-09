---
type: "API Product"
title: "Display vacancy advert API"
description: "The display vacancy advert API allows you to retrieve recruitment adverts from Find an apprenticeship. You can filter results based upon a variety of criteria in order to display the returned adverts on your own website."
resource: "https://api.apprenticeships.education.gov.uk/vacancies"
timestamp: "2022-01-24"
tags: "government-services, rest-http, the-apprenticeship-service"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Display vacancy advert API

The display vacancy advert API allows you to retrieve recruitment adverts from Find an apprenticeship. You can filter results based upon a variety of criteria in order to display the returned adverts on your own website.

## Metadata

- Type: API Product
- Provider: [The Apprenticeship Service](../organisations/the-apprenticeship-service.md)
- Canonical provider: The Apprenticeship Service
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

- Endpoint: https://api.apprenticeships.education.gov.uk/vacancies
- Documentation: https://developer.apprenticeships.education.gov.uk/

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
