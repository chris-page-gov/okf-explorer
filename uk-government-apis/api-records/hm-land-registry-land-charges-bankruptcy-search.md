---
type: "API Product"
title: "Land Charges Bankruptcy Search"
description: "Use this service to find bankruptcy details on the Land Charges Register. If you’re a software developer - Use this document to integrate data into your system. Poll Request Service URL for production environment: https://businessgateway.landregistry.gov.uk/b2b/BGSoapEngine/BankruptcySearchV2_1PollRequestWebService?wsdl For test environment endpoints replace https://businessgateway.landregistry.gov.uk/b2b/BGSoapEngine with https://bgtest.landregistry.gov.uk/b2b/BGStubService"
resource: "https://businessgateway.landregistry.gov.uk/b2b/BGSoapEngine/BankruptcySearchV2_1WebService?wsdl"
timestamp: "2023-02-13"
tags: "environment, government-services, hm-land-registry, planning-and-property, soap-wsdl"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Land Charges Bankruptcy Search

Use this service to find bankruptcy details on the Land Charges Register. If you’re a software developer - Use this document to integrate data into your system. Poll Request Service URL for production environment: https://businessgateway.landregistry.gov.uk/b2b/BGSoapEngine/BankruptcySearchV2_1PollRequestWebService?wsdl For test environment endpoints replace https://businessgateway.landregistry.gov.uk/b2b/BGSoapEngine with https://bgtest.landregistry.gov.uk/b2b/BGStubService

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
- Licence: Not specified (not-specified)
- Licence basis: not-specified
- Licence source: not-specified
- Licence confidence: 0.2
- Quality band: high
- DCAT term: `dcat:DataService`
- OpenAPI term: `OpenAPI Object`

- Endpoint: https://businessgateway.landregistry.gov.uk/b2b/BGSoapEngine/BankruptcySearchV2_1WebService?wsdl
- Documentation: https://landregistry.github.io/bgtechdoc/services/land_charges_bankruptcy_search/

## Standards Alignment

This generated record is standards-alignable, not standards-conformant by itself. DCAT-AP conformance needs an RDF export; OpenAPI conformance needs a complete `openapi` document.

- DCAT / DCAT-AP: `dcat:DataService`; export status `data-service-with-gaps`.
- DCAT missing requirements: `dcterms:license`
- OpenAPI: `OpenAPI Object`; export status `service-stub-with-gaps`.
- OpenAPI security scheme: `metadata-only`.
- OpenAPI missing requirements: `info.license`
- Crosswalk: [OKF Standards Crosswalk](../../docs/okf-standards-crosswalk.md)

## Credential Requirements

- approval_required: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: GOV.UK API Catalogue CSV
- Source URL: https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv
