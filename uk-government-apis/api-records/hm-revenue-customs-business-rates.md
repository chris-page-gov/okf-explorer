---
type: "API Product"
title: "Business Rates"
description: "This API provides endpoints related to Business Rates. The Valuation Office Agency (VOA) sets the rateable value of a property. Local councils use this to calculate a business rates bill for that property. Before using this API please ensure you have registered with the VOA for Business Rates via the website. The sandbox endpoint is `https://test-api.service.hmrc.gov.uk`."
resource: "https://api.service.hmrc.gov.uk"
timestamp: "2020-09-02"
tags: "business-and-economy, government-services, hm-revenue-customs, planning-and-property, rest-http, tax-and-customs"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Business Rates

This API provides endpoints related to Business Rates. The Valuation Office Agency (VOA) sets the rateable value of a property. Local councils use this to calculate a business rates bill for that property. Before using this API please ensure you have registered with the VOA for Business Rates via the website. The sandbox endpoint is `https://test-api.service.hmrc.gov.uk`.

## Metadata

- Type: API Product
- Provider: [HM Revenue Customs](../organisations/hm-revenue-customs.md)
- Canonical provider: HM Revenue Customs
- Source adapter: api_gov_uk_catalogue
- Source tier: declared_api_catalogue
- Confidence: declared
- Assurance status: declared
- Access model: approval-required
- Contract status: documentation-only
- Quality band: high

- Endpoint: https://api.service.hmrc.gov.uk
- Documentation: https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/business-rates-api

## Credential Requirements

- approval_required: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: GOV.UK API Catalogue CSV
- Source URL: https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv
