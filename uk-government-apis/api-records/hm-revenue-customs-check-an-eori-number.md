---
type: "API Product"
title: "Check an EORI Number"
description: "This API enables your application to: - check if an EORI number beginning with GB (issued by the UK) is valid - view the name and address of the business that the EORI number is registered to (if the business agreed to share this information) The sandbox endpoint is `https://test-api.service.hmrc.gov.uk`."
resource: "https://api.service.hmrc.gov.uk"
timestamp: "2020-09-02"
tags: "business-and-economy, geospatial, government-services, hm-revenue-customs, planning-and-property, rest-http, tax-and-customs"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Check an EORI Number

This API enables your application to: - check if an EORI number beginning with GB (issued by the UK) is valid - view the name and address of the business that the EORI number is registered to (if the business agreed to share this information) The sandbox endpoint is `https://test-api.service.hmrc.gov.uk`.

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
- Documentation: https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/check-eori-number-api

## Credential Requirements

- approval_required: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: GOV.UK API Catalogue CSV
- Source URL: https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv
