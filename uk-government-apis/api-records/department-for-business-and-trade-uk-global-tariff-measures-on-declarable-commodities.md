---
type: "API Product"
title: "UK Global Tariff (measures on declarable commodities)"
description: "The UK Global Tariff (UKGT) is the UK's first independent tariff policy which replaced the EU Common External Tariff (CET) which applied until 31 December 2020. This tariff entered into force on 1 January 2021. The UKGT applies to all goods imported into the UK. It lists preferential measures where the UK has entered into a new trade agreement or arrangement with a third country or territory. For other countries and territories, it shows the UK's Most Favoured Nation (MFN) tariffs. The dataset does not include other import duties (such as VAT) and details of quota volumes. This table (one of 3 available) is an expanded table showing the measures that apply to all declarable commodity codes. These are 10-digit codes which are at the lowest level in the commodity code hierarchy (for example, when they do not have any commodity codes below them in the hierarchy) and are therefore at the most granular classification for that product. Any code in this table is usable on declarations at the rates specified. The tariffs in this dataset are a representation of future events and as such are subject to change. You can use this data when you need to make a calculation against the new duties…"
resource: "https://data.api.trade.gov.uk/v1/datasets/uk-tariff-2021-01-01/versions/latest/tables/measures-on-declarable-commodities/data?format=csv&download"
timestamp: "2022-02-15"
tags: "business-and-economy, department-for-business-and-trade, population-and-statistics, rest-http, tax-and-customs"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# UK Global Tariff (measures on declarable commodities)

The UK Global Tariff (UKGT) is the UK's first independent tariff policy which replaced the EU Common External Tariff (CET) which applied until 31 December 2020. This tariff entered into force on 1 January 2021. The UKGT applies to all goods imported into the UK. It lists preferential measures where the UK has entered into a new trade agreement or arrangement with a third country or territory. For other countries and territories, it shows the UK's Most Favoured Nation (MFN) tariffs. The dataset does not include other import duties (such as VAT) and details of quota volumes. This table (one of 3 available) is an expanded table showing the measures that apply to all declarable commodity codes. These are 10-digit codes which are at the lowest level in the commodity code hierarchy (for example, when they do not have any commodity codes below them in the hierarchy) and are therefore at the most granular classification for that product. Any code in this table is usable on declarations at the rates specified. The tariffs in this dataset are a representation of future events and as such are subject to change. You can use this data when you need to make a calculation against the new duties…

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

- Endpoint: https://data.api.trade.gov.uk/v1/datasets/uk-tariff-2021-01-01/versions/latest/tables/measures-on-declarable-commodities/data?format=csv&download
- Documentation: https://data.api.trade.gov.uk/v1/datasets/uk-tariff-2021-01-01/versions/latest/metadata?format=html

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
