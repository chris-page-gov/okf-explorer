---
type: "API Product"
title: "Regulations and legislation for UK businesses"
description: "A dataset of laws and guidance that regulate business activities in England. The dataset contains metadata about each regulatory content item and links to the original content on GOV.UK, legislation.gov.uk or the regulator’s website. This dataset is still under development. It only includes regulations for the construction sector. It does not include content from regulators in Scotland, Wales or Northern Ireland. This data should not be used for official analysis or reporting."
resource: "https://data.api.trade.gov.uk/v1/datasets/uk-business-regulations/versions/latest/data?format=json"
timestamp: "2025-04-30"
tags: "business-and-economy, department-for-business-and-trade, government-services, population-and-statistics, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Regulations and legislation for UK businesses

A dataset of laws and guidance that regulate business activities in England. The dataset contains metadata about each regulatory content item and links to the original content on GOV.UK, legislation.gov.uk or the regulator’s website. This dataset is still under development. It only includes regulations for the construction sector. It does not include content from regulators in Scotland, Wales or Northern Ireland. This data should not be used for official analysis or reporting.

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
- Licence: Open Government Licence v3.0 (open-government-licence-v3)
- Licence basis: source-declared
- Licence source: https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/
- Licence confidence: 0.9
- Quality band: medium
- DCAT term: `dcat:DataService`
- OpenAPI term: `OpenAPI Object`

- Endpoint: https://data.api.trade.gov.uk/v1/datasets/uk-business-regulations/versions/latest/data?format=json
- Documentation: https://data.api.trade.gov.uk/v1/datasets/uk-business-regulations/versions/latest/metadata?format=html

## Standards Alignment

This generated record is standards-alignable, not standards-conformant by itself. DCAT-AP conformance needs an RDF export; OpenAPI conformance needs a complete `openapi` document.

- DCAT / DCAT-AP: `dcat:DataService`; export status `data-service-ready`.
- DCAT missing requirements: none recorded
- OpenAPI: `OpenAPI Object`; export status `service-stub-with-gaps`.
- OpenAPI security scheme: `unknown`.
- OpenAPI missing requirements: `components.securitySchemes`
- Crosswalk: [OKF Standards Crosswalk](../../docs/okf-standards-crosswalk.md)

## Credential Requirements

- unknown: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: GOV.UK API Catalogue CSV
- Source URL: https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv
