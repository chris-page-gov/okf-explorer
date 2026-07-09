---
type: "API Product"
title: "Directory of Services - Urgent and Emergency Care - SOAP API"
description: "Use this API to access Directory of Services (DoS) information on a wide range of health and care services across England. You can search for services based on a combination of parameters: - find an appropriate list of services for a specific clinical need- get technical endpoint information for a given service, using a service ID or ODS code- obtain capacity information for specified hospitals or wards, using a service ID or ODS codeThis service is widely used in an Urgent and Emergency Care context using NHS Pathways outcomes. For example, NHS 111 use it to find a service in real-time with the capacity to help a patient with given symptoms, within range of a given location.You need a valid DoS account to use this API."
resource: "https://digital.nhs.uk/developer/api-catalogue/directory-of-services-soap"
timestamp: "2024-04-23"
tags: "government-services, health-and-care, nhs-digital, soap-wsdl"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Directory of Services - Urgent and Emergency Care - SOAP API

Use this API to access Directory of Services (DoS) information on a wide range of health and care services across England. You can search for services based on a combination of parameters: - find an appropriate list of services for a specific clinical need- get technical endpoint information for a given service, using a service ID or ODS code- obtain capacity information for specified hospitals or wards, using a service ID or ODS codeThis service is widely used in an Urgent and Emergency Care context using NHS Pathways outcomes. For example, NHS 111 use it to find a service in real-time with the capacity to help a patient with given symptoms, within range of a given location.You need a valid DoS account to use this API.

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/directory-of-services-soap
- Documentation: https://digital.nhs.uk/developer/api-catalogue/directory-of-services-soap

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
