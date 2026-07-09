---
type: "API Product"
title: "Push Pull Notifications"
description: "Use the Push Pull Notifications API to get notifications (pull) and to send notifications (push) automatically. Other HMRC APIs create notifications in response to events like asynchronous API requests. The sandbox endpoint is `https://test-api.service.hmrc.gov.uk`."
resource: "https://api.service.hmrc.gov.uk"
timestamp: "2020-09-02"
tags: "government-services, hm-revenue-customs, streaming, tax-and-customs"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Push Pull Notifications

Use the Push Pull Notifications API to get notifications (pull) and to send notifications (push) automatically. Other HMRC APIs create notifications in response to events like asynchronous API requests. The sandbox endpoint is `https://test-api.service.hmrc.gov.uk`.

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
- Documentation: https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/push-pull-notifications-api

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
