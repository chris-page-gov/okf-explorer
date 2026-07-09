---
type: "API Product"
title: "Customs Inventory Linking Exports"
description: "This API enables the functionality to support the Inventory Linking Export process. Inventory Linking controls and monitors cargo moving through temporary storage facilities, and allows the movement/transition through frontiers. There are three functional areas: - consolidation - this enables the combining of consignments into one master consignment, or splitting into multiple consignments - movement - records the movement of consignments within Customs controlled storage facilities - query - the querying of data held within the Inventory Linking Export database Within each of these functional areas, there are multiple message types, each performing a specific activity. The sandbox endpoint is `https://test-api.service.hmrc.gov.uk`."
resource: "https://api.service.hmrc.gov.uk"
timestamp: "2020-09-02"
tags: "government-services, hm-revenue-customs, rest-http, tax-and-customs"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Customs Inventory Linking Exports

This API enables the functionality to support the Inventory Linking Export process. Inventory Linking controls and monitors cargo moving through temporary storage facilities, and allows the movement/transition through frontiers. There are three functional areas: - consolidation - this enables the combining of consignments into one master consignment, or splitting into multiple consignments - movement - records the movement of consignments within Customs controlled storage facilities - query - the querying of data held within the Inventory Linking Export database Within each of these functional areas, there are multiple message types, each performing a specific activity. The sandbox endpoint is `https://test-api.service.hmrc.gov.uk`.

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
- Documentation: https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/customs-inventory-linking-exports

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
