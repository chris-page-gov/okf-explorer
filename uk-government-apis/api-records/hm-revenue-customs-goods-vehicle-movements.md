---
type: "API Product"
title: "Goods Vehicle Movements"
description: "This API provides resources related to the Goods Vehicle Movement Service. The Goods Vehicle Movement Service (GVMS) links declaration references together. This means the person moving goods only needs to present one reference at the frontier to prove that their goods have pre-lodged declarations. The GVMS also links the movement of goods to declarations, meaning they can be automatically arrived and departed in HMRC systems in near-real-time. It also notifies users via your software whether their inbound goods have been successfully cleared in HMRC systems by the time they arrive in the UK. The sandbox endpoint is `https://test-api.service.hmrc.gov.uk`."
resource: "https://api.service.hmrc.gov.uk"
timestamp: "2020-09-02"
tags: "government-services, hm-revenue-customs, rest-http, tax-and-customs, transport"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Goods Vehicle Movements

This API provides resources related to the Goods Vehicle Movement Service. The Goods Vehicle Movement Service (GVMS) links declaration references together. This means the person moving goods only needs to present one reference at the frontier to prove that their goods have pre-lodged declarations. The GVMS also links the movement of goods to declarations, meaning they can be automatically arrived and departed in HMRC systems in near-real-time. It also notifies users via your software whether their inbound goods have been successfully cleared in HMRC systems by the time they arrive in the UK. The sandbox endpoint is `https://test-api.service.hmrc.gov.uk`.

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
- Licence: Not specified (not-specified)
- Licence basis: not-specified
- Licence source: not-specified
- Licence confidence: 0.2
- Quality band: medium
- DCAT term: `dcat:DataService`
- OpenAPI term: `OpenAPI Object`

- Endpoint: https://api.service.hmrc.gov.uk
- Documentation: https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/goods-movement-system-haulier-api

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
