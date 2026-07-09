---
type: "API Product"
title: "Official Search of Part"
description: "An Official Search of Part (with priority) protects agreements between buyers, sellers and lenders. Use this service when your application relates to part of a registered title, to protect transfers, leases and mortgages. It also prevents any registrations of adverse interest for 30 business days. It will also tell you about: - alterations made on the register since the search from date - applications against the title not yet complete - existing official searches - outline applications that are not protected by official search - land to be transferred, leased or mortgaged, that falls outside of the extent of the registered title If you’re a software developer: Use this document to integrate data into your system. Poll request Service URL for production environment: https://businessgateway.landregistry.gov.uk/b2b/BGSoapEngine/OfficialSearchOfPartV2_1PollRequestWebService?wsdl For test environment endpoints, replace `https://businessgateway.landregistry.gov.uk/b2b/BGSoapEngine` with `https://bgtest.landregistry.gov.uk/b2b/BGStubService`"
resource: "https://businessgateway.landregistry.gov.uk/b2b/BGSoapEngine/OfficialSearchOfPartV2_1WebService?wsdl"
timestamp: "2024-06-24"
tags: "business-and-economy, environment, government-services, hm-land-registry, planning-and-property, soap-wsdl"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Official Search of Part

An Official Search of Part (with priority) protects agreements between buyers, sellers and lenders. Use this service when your application relates to part of a registered title, to protect transfers, leases and mortgages. It also prevents any registrations of adverse interest for 30 business days. It will also tell you about: - alterations made on the register since the search from date - applications against the title not yet complete - existing official searches - outline applications that are not protected by official search - land to be transferred, leased or mortgaged, that falls outside of the extent of the registered title If you’re a software developer: Use this document to integrate data into your system. Poll request Service URL for production environment: https://businessgateway.landregistry.gov.uk/b2b/BGSoapEngine/OfficialSearchOfPartV2_1PollRequestWebService?wsdl For test environment endpoints, replace `https://businessgateway.landregistry.gov.uk/b2b/BGSoapEngine` with `https://bgtest.landregistry.gov.uk/b2b/BGStubService`

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

- Endpoint: https://businessgateway.landregistry.gov.uk/b2b/BGSoapEngine/OfficialSearchOfPartV2_1WebService?wsdl
- Documentation: https://landregistry.github.io/bgtechdoc/services/official_search_of_part/

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
