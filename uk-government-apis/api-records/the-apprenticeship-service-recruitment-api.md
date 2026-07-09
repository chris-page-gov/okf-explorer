---
type: "API Product"
title: "Recruitment API"
description: "The Recruitment API allows you to create an advert on Find an apprenticeship using your existing systems. Submitting a new vacancy advert via this API will create the vacancy advert in the live system. We provide a sandbox version of the API which you can use for testing purposes. The sandbox is available at: https://api-sandbox.apprenticeships.education.gov.uk/managevacancies. Note: In order to use the Recruitment API you need to obtain an API key from either an Employer or Training Provider registered on the Apprenticeship Service. More information is available on the developer portal."
resource: "https://api.apprenticeships.education.gov.uk/managevacancies"
timestamp: "2022-01-24"
tags: "education-and-skills, government-services, rest-http, the-apprenticeship-service"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Recruitment API

The Recruitment API allows you to create an advert on Find an apprenticeship using your existing systems. Submitting a new vacancy advert via this API will create the vacancy advert in the live system. We provide a sandbox version of the API which you can use for testing purposes. The sandbox is available at: https://api-sandbox.apprenticeships.education.gov.uk/managevacancies. Note: In order to use the Recruitment API you need to obtain an API key from either an Employer or Training Provider registered on the Apprenticeship Service. More information is available on the developer portal.

## Metadata

- Type: API Product
- Provider: [The Apprenticeship Service](../organisations/the-apprenticeship-service.md)
- Canonical provider: The Apprenticeship Service
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

- Endpoint: https://api.apprenticeships.education.gov.uk/managevacancies
- Documentation: https://developer.apprenticeships.education.gov.uk/

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
