---
type: "API Product"
title: "Application Enquiry"
description: "Use this service to view applications that are not yet completed by HM Land Registry. Use this service to find out: an application's progress status, the reason for application delays, information about recently completed or cancelled applications, the full priority period for Official Searches. Poll Request Service URL for production environment: https://businessgateway.landregistry.gov.uk/b2b/BGSoapEngine/ApplicationEnquiryV1_0PollRequestWebService?wsdl Test environment URL: https://bgtest.landregistry.gov.uk/b2b/BGStubService/ApplicationEnquiryV1_0WebService?wsdl Poll Request Service URL for test environment: https://bgtest.landregistry.gov.uk/b2b/BGStubService/ApplicationEnquiryV1_0PollRequestWebService?wsdl"
resource: "https://businessgateway.landregistry.gov.uk/b2b/BGSoapEngine/ApplicationEnquiryV1_0WebService?wsdl"
timestamp: "2022-10-11"
tags: "environment, government-services, hm-land-registry, planning-and-property, soap-wsdl"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Application Enquiry

Use this service to view applications that are not yet completed by HM Land Registry. Use this service to find out: an application's progress status, the reason for application delays, information about recently completed or cancelled applications, the full priority period for Official Searches. Poll Request Service URL for production environment: https://businessgateway.landregistry.gov.uk/b2b/BGSoapEngine/ApplicationEnquiryV1_0PollRequestWebService?wsdl Test environment URL: https://bgtest.landregistry.gov.uk/b2b/BGStubService/ApplicationEnquiryV1_0WebService?wsdl Poll Request Service URL for test environment: https://bgtest.landregistry.gov.uk/b2b/BGStubService/ApplicationEnquiryV1_0PollRequestWebService?wsdl

## Metadata

- Type: API Product
- Provider: [HM Land Registry](../organisations/hm-land-registry.md)
- Canonical provider: HM Land Registry
- Source adapter: api_gov_uk_catalogue
- Source tier: declared_api_catalogue
- Confidence: declared
- Assurance status: declared
- Access model: unknown
- Contract status: wsdl-indicated
- Licence: Not specified (not-specified)
- Licence basis: not-specified
- Licence source: not-specified
- Licence confidence: 0.2
- Quality band: high
- DCAT term: `dcat:DataService`
- OpenAPI term: `OpenAPI Object`

- Endpoint: https://businessgateway.landregistry.gov.uk/b2b/BGSoapEngine/ApplicationEnquiryV1_0WebService?wsdl
- Documentation: https://landregistry.github.io/bgtechdoc/services/application_enquiry/

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
