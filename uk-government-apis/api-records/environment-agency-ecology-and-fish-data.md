---
type: "API Product"
title: "Ecology and Fish Data"
description: "The Ecology and Fish Data API provides access to the Environment Agency's open data on freshwater fish data, as well as freshwater and marine ecology survey data. This data collection is taken from the National Fish Populations Database (NFPD) and Biosys (Biological survey database). The Ecology and Fish Data API uses a data model that harmonises these different sources, so that measurements taken for variety of purposes can be queried in a consistent way.The most central points of interest are the **Observations**. Each observation has a single result for a particular **Observable Property** for a particular **Feature of Interest**. Please visit the [Defra Data Services Platform Support](https://environment.data.gov.uk/support) to let us know about any issues or to ask questions."
resource: "https://environment.data.gov.uk/ecology/api/"
timestamp: "2022-07-21"
tags: "environment, environment-agency, government-services, planning-and-property, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Ecology and Fish Data

The Ecology and Fish Data API provides access to the Environment Agency's open data on freshwater fish data, as well as freshwater and marine ecology survey data. This data collection is taken from the National Fish Populations Database (NFPD) and Biosys (Biological survey database). The Ecology and Fish Data API uses a data model that harmonises these different sources, so that measurements taken for variety of purposes can be queried in a consistent way.The most central points of interest are the **Observations**. Each observation has a single result for a particular **Observable Property** for a particular **Feature of Interest**. Please visit the [Defra Data Services Platform Support](https://environment.data.gov.uk/support) to let us know about any issues or to ask questions.

## Metadata

- Type: API Product
- Provider: [Environment Agency](../organisations/environment-agency.md)
- Canonical provider: Environment Agency
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

- Endpoint: https://environment.data.gov.uk/ecology/api/
- Documentation: https://environment.data.gov.uk/ecology/api/v1/index.html

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
