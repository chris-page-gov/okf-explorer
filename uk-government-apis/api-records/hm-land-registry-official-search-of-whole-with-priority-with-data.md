---
type: "API Product"
title: "Official Search of Whole (with Priority) with Data"
description: "An Official Search of Whole (with Priority) with Data protects agreements between buyers, sellers and lenders. The Official Search of Whole (with Priority) with Data RESTful API expands on the existing Official Search of Whole (with Priority) SOAP API, see HMLR Developer Pack [here](https://landregistry.github.io/bgtechdoc/services/official_search_of_whole/) for information on the existing service. Each service can be used: - when your application relates to the whole of the registered title to protect transfers, leases and mortgages. - both services prevent any registrations of adverse interest for 30 business days. Each service will also tell you about: - alterations made to the register since the search from date - applications against the title that have not yet been completed - existing official searches - outline applications that are not protected by official search For test environment endpoint replace https://businessgateway.landregistry.gov.uk/bg2/api with https://bgtest.landregistry.gov.uk/bg2test/api"
resource: "https://businessgateway.landregistry.gov.uk/bg2/api/v1/official-searches-of-whole"
timestamp: "2024-01-24"
tags: "business-and-economy, environment, government-services, hm-land-registry, planning-and-property, soap-wsdl"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Official Search of Whole (with Priority) with Data

An Official Search of Whole (with Priority) with Data protects agreements between buyers, sellers and lenders. The Official Search of Whole (with Priority) with Data RESTful API expands on the existing Official Search of Whole (with Priority) SOAP API, see HMLR Developer Pack [here](https://landregistry.github.io/bgtechdoc/services/official_search_of_whole/) for information on the existing service. Each service can be used: - when your application relates to the whole of the registered title to protect transfers, leases and mortgages. - both services prevent any registrations of adverse interest for 30 business days. Each service will also tell you about: - alterations made to the register since the search from date - applications against the title that have not yet been completed - existing official searches - outline applications that are not protected by official search For test environment endpoint replace https://businessgateway.landregistry.gov.uk/bg2/api with https://bgtest.landregistry.gov.uk/bg2test/api

## Metadata

- Type: API Product
- Provider: [HM Land Registry](../organisations/hm-land-registry.md)
- Canonical provider: HM Land Registry
- Source adapter: api_gov_uk_catalogue
- Source tier: declared_api_catalogue
- Confidence: declared
- Assurance status: declared
- Access model: approval-required
- Contract status: documentation-only
- Quality band: high

- Endpoint: https://businessgateway.landregistry.gov.uk/bg2/api/v1/official-searches-of-whole
- Documentation: https://landregistry.github.io/bgtechdoc/services/official_search_of_whole_rest/

## Credential Requirements

- approval_required: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: GOV.UK API Catalogue CSV
- Source URL: https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv
