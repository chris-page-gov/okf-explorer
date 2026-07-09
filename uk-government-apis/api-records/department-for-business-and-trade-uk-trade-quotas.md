---
type: "API Product"
title: "UK Trade Quotas"
description: "This dataset shows the quotas available in the UK Tariff along with their current or final balances, updated daily. You can use this data to analyse quota applicability and utilisation in bulk, and to understand trends in quota application and usage over time. Please see the full UK Trade Quotas summary for detailed information on what this dataset contains and what it can be used for. Parameters can be specified to the API to filter the returned results. See the metadata at the documentation link for more information on how to access the API and how to use the filters."
resource: "https://data.api.trade.gov.uk/v1/datasets/uk-trade-quotas/versions/v1.0.22/reports/quotas-including-current-volumes/data?format=csv&download"
timestamp: "2022-02-15"
tags: "business-and-economy, department-for-business-and-trade, population-and-statistics, rest-http, tax-and-customs"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# UK Trade Quotas

This dataset shows the quotas available in the UK Tariff along with their current or final balances, updated daily. You can use this data to analyse quota applicability and utilisation in bulk, and to understand trends in quota application and usage over time. Please see the full UK Trade Quotas summary for detailed information on what this dataset contains and what it can be used for. Parameters can be specified to the API to filter the returned results. See the metadata at the documentation link for more information on how to access the API and how to use the filters.

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

- Endpoint: https://data.api.trade.gov.uk/v1/datasets/uk-trade-quotas/versions/v1.0.22/reports/quotas-including-current-volumes/data?format=csv&download
- Documentation: https://data.api.trade.gov.uk/v1/datasets/uk-trade-quotas/versions/v1.0.22/metadata?format=html

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
