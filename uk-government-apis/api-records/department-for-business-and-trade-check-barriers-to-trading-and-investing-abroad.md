---
type: "API Product"
title: "Check barriers to trading and investing abroad"
description: "Check barriers to trading and investing abroad is the service to which DBT publishes trade barriers. It is aimed at UK-based businesses planning to export goods, provide services or invest money in another country. The dataset will give you information about things that could slow down, stop or raise costs for UK companies and citizens doing business in a specific country (a ‘trade barrier’). API calls can be made using a GET request to `https://data.api.trade.gov.uk/v1/datasets/market-barriers/versions/latest/data?format=json`."
resource: "https://data.api.trade.gov.uk/v1/datasets/market-barriers/versions/latest/data?format=json"
timestamp: "2020-03-09"
tags: "business-and-economy, department-for-business-and-trade, government-services, planning-and-property, population-and-statistics, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Check barriers to trading and investing abroad

Check barriers to trading and investing abroad is the service to which DBT publishes trade barriers. It is aimed at UK-based businesses planning to export goods, provide services or invest money in another country. The dataset will give you information about things that could slow down, stop or raise costs for UK companies and citizens doing business in a specific country (a ‘trade barrier’). API calls can be made using a GET request to `https://data.api.trade.gov.uk/v1/datasets/market-barriers/versions/latest/data?format=json`.

## Metadata

- Type: API Product
- Provider: [Department for Business And Trade](../organisations/department-for-business-and-trade.md)
- Canonical provider: Department for Business And Trade
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

- Endpoint: https://data.api.trade.gov.uk/v1/datasets/market-barriers/versions/latest/data?format=json
- Documentation: https://data.api.trade.gov.uk/

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
