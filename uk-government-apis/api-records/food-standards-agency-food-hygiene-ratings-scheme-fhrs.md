---
type: "API Product"
title: "Food Hygiene Ratings Scheme (FHRS)"
description: "The FHRS API provides free programmatic access to the Food Standards Agency Rating Data for England, Scotland, Wales and Northern Ireland. Developers can leverage FSA data to provide their own services and websites, allowing you to build and develop custom solutions that are consistent with the data being held and displayed by the FSA. As a developer you get access to the same data and the majority of the same functionality that is used to deliver the Food Hygiene Rating Scheme website. Other than calling the available endpoints, there are no registration requirements for developers before they can start using the Food Standards Agency data. No sign-up process, API keys, or login details are required at this time to use the service."
resource: "https://api.ratings.food.gov.uk/"
timestamp: "2024-04-23"
tags: "food-standards-agency, government-services, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Food Hygiene Ratings Scheme (FHRS)

The FHRS API provides free programmatic access to the Food Standards Agency Rating Data for England, Scotland, Wales and Northern Ireland. Developers can leverage FSA data to provide their own services and websites, allowing you to build and develop custom solutions that are consistent with the data being held and displayed by the FSA. As a developer you get access to the same data and the majority of the same functionality that is used to deliver the Food Hygiene Rating Scheme website. Other than calling the available endpoints, there are no registration requirements for developers before they can start using the Food Standards Agency data. No sign-up process, API keys, or login details are required at this time to use the service.

## Metadata

- Type: API Product
- Provider: [Food Standards Agency](../organisations/food-standards-agency.md)
- Canonical provider: Food Standards Agency
- Source adapter: api_gov_uk_catalogue
- Source tier: declared_api_catalogue
- Confidence: declared
- Assurance status: declared
- Access model: api-key
- Contract status: documentation-only
- Licence: Not specified (not-specified)
- Licence basis: not-specified
- Licence source: not-specified
- Licence confidence: 0.2
- Quality band: high
- DCAT term: `dcat:DataService`
- OpenAPI term: `OpenAPI Object`

- Endpoint: https://api.ratings.food.gov.uk/
- Documentation: https://api.ratings.food.gov.uk/help

## Standards Alignment

This generated record is standards-alignable, not standards-conformant by itself. DCAT-AP conformance needs an RDF export; OpenAPI conformance needs a complete `openapi` document.

- DCAT / DCAT-AP: `dcat:DataService`; export status `data-service-with-gaps`.
- DCAT missing requirements: `dcterms:license`
- OpenAPI: `OpenAPI Object`; export status `service-stub-with-gaps`.
- OpenAPI security scheme: `apiKey`.
- OpenAPI missing requirements: `info.license`
- Crosswalk: [OKF Standards Crosswalk](../../docs/okf-standards-crosswalk.md)

## Credential Requirements

- api_key: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: GOV.UK API Catalogue CSV
- Source URL: https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv
