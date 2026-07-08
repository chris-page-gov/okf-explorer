---
type: "API Product"
title: "Land Charges Full Search"
description: "A land charge is an interest in land that imposes an obligation on the landowner in favour of some other person. Use this service to request an official search of the Land Charges Register. If you're a software developer: - Use this document to integrate data into your system. Poll Request Service URL for production environment: https://businessgateway.landregistry.gov.uk/b2b/BGSoapEngine/FullSearchV2_1PollRequestWebService?wsdl For test environment endpoints replace https://businessgateway.landregistry.gov.uk/b2b/BGSoapEngine with https://bgtest.landregistry.gov.uk/b2b/BGStubService"
resource: "https://businessgateway.landregistry.gov.uk/b2b/BGSoapEngine/FullSearchV2_1WebService?wsdl"
timestamp: "2023-01-10"
tags: "environment, government-services, hm-land-registry, planning-and-property, soap-wsdl"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Land Charges Full Search

A land charge is an interest in land that imposes an obligation on the landowner in favour of some other person. Use this service to request an official search of the Land Charges Register. If you're a software developer: - Use this document to integrate data into your system. Poll Request Service URL for production environment: https://businessgateway.landregistry.gov.uk/b2b/BGSoapEngine/FullSearchV2_1PollRequestWebService?wsdl For test environment endpoints replace https://businessgateway.landregistry.gov.uk/b2b/BGSoapEngine with https://bgtest.landregistry.gov.uk/b2b/BGStubService

## Metadata

- Type: API Product
- Provider: [HM Land Registry](../organisations/hm-land-registry.md)
- Canonical provider: HM Land Registry
- Source adapter: api_gov_uk_catalogue
- Source tier: declared_api_catalogue
- Confidence: declared
- Assurance status: declared
- Access model: approval-required
- Contract status: wsdl-indicated
- Quality band: high

- Endpoint: https://businessgateway.landregistry.gov.uk/b2b/BGSoapEngine/FullSearchV2_1WebService?wsdl
- Documentation: https://landregistry.github.io/bgtechdoc/services/land_charges_full_search/

## Credential Requirements

- approval_required: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: GOV.UK API Catalogue CSV
- Source URL: https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv
