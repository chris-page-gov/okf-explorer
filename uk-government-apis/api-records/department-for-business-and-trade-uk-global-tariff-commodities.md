---
type: "API Product"
title: "UK Global Tariff (commodities)"
description: "The UK Global Tariff (UKGT) is the UK's first independent tariff policy which replaced the EU Common External Tariff (CET) which applied until 31 December 2020. This tariff entered into force on 1 January 2021. The UKGT applies to all goods imported into the UK. It lists preferential measures where the UK has entered into a new trade agreement or arrangement with a third country or territory. For other countries and territories, it shows the UK's Most Favoured Nation (MFN) tariffs. The dataset does not include other import duties (such as VAT) and details of quota volumes. This table (one of 3 available) shows all of the commodities that are part of the UK's goods classification and their English descriptions. Codes are organised in a hierarchy with each \"parent\" code having zero or more \"child\" codes that represent a more specific classification of the parent commodity. Commodities at all depths of the commodity hierarchy are included, but only commodities without any children codes are declarable. The current parent code of each commodity code is also listed and is accurate at the time the file was generated – note that parent codes can change over time. The tariffs in this data…"
resource: "https://data.api.trade.gov.uk/v1/datasets/uk-tariff-2021-01-01/versions/latest/tables/commodities/data?format=csv&download"
timestamp: "2022-02-15"
tags: "business-and-economy, department-for-business-and-trade, population-and-statistics, rest-http, tax-and-customs"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# UK Global Tariff (commodities)

The UK Global Tariff (UKGT) is the UK's first independent tariff policy which replaced the EU Common External Tariff (CET) which applied until 31 December 2020. This tariff entered into force on 1 January 2021. The UKGT applies to all goods imported into the UK. It lists preferential measures where the UK has entered into a new trade agreement or arrangement with a third country or territory. For other countries and territories, it shows the UK's Most Favoured Nation (MFN) tariffs. The dataset does not include other import duties (such as VAT) and details of quota volumes. This table (one of 3 available) shows all of the commodities that are part of the UK's goods classification and their English descriptions. Codes are organised in a hierarchy with each "parent" code having zero or more "child" codes that represent a more specific classification of the parent commodity. Commodities at all depths of the commodity hierarchy are included, but only commodities without any children codes are declarable. The current parent code of each commodity code is also listed and is accurate at the time the file was generated – note that parent codes can change over time. The tariffs in this data…

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

- Endpoint: https://data.api.trade.gov.uk/v1/datasets/uk-tariff-2021-01-01/versions/latest/tables/commodities/data?format=csv&download
- Documentation: https://data.api.trade.gov.uk/v1/datasets/uk-tariff-2021-01-01/versions/v2.2.0/metadata?format=html

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
