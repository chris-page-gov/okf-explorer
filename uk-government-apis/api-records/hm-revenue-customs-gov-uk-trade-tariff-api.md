---
type: "API Product"
title: "GOV.UK Trade Tariff API"
description: "The GOV.UK Trade Tariff API makes it easy to access UK Trade Tariff data from [the Trade Tariff service](https://www.gov.uk/trade-tariff). The data includes commodity codes, import/export controls, customs duty and VAT rates. It is accessed via HTTPS and returns data in a JSON format. The reference documentation provides a thorough overview of the endpoints and the response format."
resource: "https://www.trade-tariff.service.gov.uk/uk/api"
timestamp: "2025-03-23"
tags: "business-and-economy, government-services, hm-revenue-customs, rest-http, tax-and-customs"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# GOV.UK Trade Tariff API

The GOV.UK Trade Tariff API makes it easy to access UK Trade Tariff data from [the Trade Tariff service](https://www.gov.uk/trade-tariff). The data includes commodity codes, import/export controls, customs duty and VAT rates. It is accessed via HTTPS and returns data in a JSON format. The reference documentation provides a thorough overview of the endpoints and the response format.

## Metadata

- Type: API Product
- Provider: [HM Revenue Customs](../organisations/hm-revenue-customs.md)
- Canonical provider: HM Revenue Customs
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

- Endpoint: https://www.trade-tariff.service.gov.uk/uk/api
- Documentation: https://api.trade-tariff.service.gov.uk/

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
