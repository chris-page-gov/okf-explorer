---
type: "API Product"
title: "e-Document Registration Service"
description: "Use this service to: send applications to change the register - automate the collection of correspondence and responses - receive the completed application back If you are a software developer: - Use this document to integrate data into your system Poll Request Service URL for production environment https://businessgateway.landregistry.gov.uk/b2b/ECDRS_SoapEngine/EDocumentRegistrationV2_1PollRequestWebService?wsdl Attachment Service URLs: https://businessgateway.landregistry.gov.uk/b2b/ECDRS_SoapEngine/AttachmentV2_1WebService?wsdl https://businessgateway.landregistry.gov.uk/b2b/ECDRS_SoapEngine/AttachmentV2_1PollRequestWebService?wsdl Correspondence/Requisition URL: https://businessgateway.landregistry.gov.uk/b2b/ECDRS_SoapEngine/CorrespondenceV2_1PollRequestWebService?wsdl Early Completion URL: https://businessgateway.landregistry.gov.uk/b2b/ECDRS_SoapEngine/EarlyCompletionV2_1PollRequestWebService?wsdl For test environment endpoints replace https://businessgateway.landregistry.gov.uk/b2b/ECDRS_SoapEngine with https://bgtest.landregistry.gov.uk/b2b/ECDRS_StubService"
resource: "https://businessgateway.landregistry.gov.uk/b2b/ECDRS_SoapEngine/EDocumentRegistrationV2_1WebService?wsdl"
timestamp: "2022-11-23"
tags: "environment, government-services, hm-land-registry, planning-and-property, soap-wsdl"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# e-Document Registration Service

Use this service to: send applications to change the register - automate the collection of correspondence and responses - receive the completed application back If you are a software developer: - Use this document to integrate data into your system Poll Request Service URL for production environment https://businessgateway.landregistry.gov.uk/b2b/ECDRS_SoapEngine/EDocumentRegistrationV2_1PollRequestWebService?wsdl Attachment Service URLs: https://businessgateway.landregistry.gov.uk/b2b/ECDRS_SoapEngine/AttachmentV2_1WebService?wsdl https://businessgateway.landregistry.gov.uk/b2b/ECDRS_SoapEngine/AttachmentV2_1PollRequestWebService?wsdl Correspondence/Requisition URL: https://businessgateway.landregistry.gov.uk/b2b/ECDRS_SoapEngine/CorrespondenceV2_1PollRequestWebService?wsdl Early Completion URL: https://businessgateway.landregistry.gov.uk/b2b/ECDRS_SoapEngine/EarlyCompletionV2_1PollRequestWebService?wsdl For test environment endpoints replace https://businessgateway.landregistry.gov.uk/b2b/ECDRS_SoapEngine with https://bgtest.landregistry.gov.uk/b2b/ECDRS_StubService

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

- Endpoint: https://businessgateway.landregistry.gov.uk/b2b/ECDRS_SoapEngine/EDocumentRegistrationV2_1WebService?wsdl
- Documentation: https://landregistry.github.io/bgtechdoc/services/edrs/

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
