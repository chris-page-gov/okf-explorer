---
type: "API Product"
title: "Bulk Data File List"
description: "The API lists the bulk data files available to download for a specific information type. For each file in list there will be a URL to download the file. The sandbox endpoint is `https://test-api.service.hmrc.gov.uk`."
resource: "https://api.service.hmrc.gov.uk"
timestamp: "2020-09-02"
tags: "government-services, hm-revenue-customs, rest-http, tax-and-customs"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Bulk Data File List

The API lists the bulk data files available to download for a specific information type. For each file in list there will be a URL to download the file. The sandbox endpoint is `https://test-api.service.hmrc.gov.uk`.

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
- Quality band: medium

- Endpoint: https://api.service.hmrc.gov.uk
- Documentation: https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/secure-data-exchange-bulk-download

## Credential Requirements

- unknown: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: GOV.UK API Catalogue CSV
- Source URL: https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv
