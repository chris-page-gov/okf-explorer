---
type: "API Product"
title: "Electronic Transmission of Prescriptions Web Services - SOAP API"
description: "Use this API to get Electronic Prescription Service (EPS) dispenser (and dispensing appliance contractor) information for a patient via NHS UK Web Services.You can search for dispenser information using:a valid ODS code (previously known as NACS code)their name and service type (community pharmacy or appliance contractor), and whether they are EPS-enabled or nottheir name and location and the service type, and whether they are EPS-enabled or nottheir postcode and service type, and whether they are EPS-enabled or notUse this API if you are building GP software - it provides additional information about dispensing appliance contractors that is not available through Electronic Prescription Service Directory of Services API.As one of the Directory of Services APIs, this also provides data to the Electronic Prescription Service Directory of Services API.Before you begin any development work using this API, contact us to discuss your best options."
resource: "https://digital.nhs.uk/developer/api-catalogue/electronic-transmission-of-prescriptions-web-services-soap"
timestamp: "2024-04-23"
tags: "geospatial, government-services, health-and-care, nhs-digital, planning-and-property, soap-wsdl"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Electronic Transmission of Prescriptions Web Services - SOAP API

Use this API to get Electronic Prescription Service (EPS) dispenser (and dispensing appliance contractor) information for a patient via NHS UK Web Services.You can search for dispenser information using:a valid ODS code (previously known as NACS code)their name and service type (community pharmacy or appliance contractor), and whether they are EPS-enabled or nottheir name and location and the service type, and whether they are EPS-enabled or nottheir postcode and service type, and whether they are EPS-enabled or notUse this API if you are building GP software - it provides additional information about dispensing appliance contractors that is not available through Electronic Prescription Service Directory of Services API.As one of the Directory of Services APIs, this also provides data to the Electronic Prescription Service Directory of Services API.Before you begin any development work using this API, contact us to discuss your best options.

## Metadata

- Type: API Product
- Provider: [NHS Digital](../organisations/nhs-digital.md)
- Canonical provider: NHS Digital
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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/electronic-transmission-of-prescriptions-web-services-soap
- Documentation: https://digital.nhs.uk/developer/api-catalogue/electronic-transmission-of-prescriptions-web-services-soap

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
