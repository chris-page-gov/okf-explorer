---
type: "API Product"
title: "Directory of Services - Urgent and Emergency Care - REST API"
description: "Use this API to access Directory of Services (DoS) information on a wide range of health and care services across England. You can search for services based on a combination of parameters: - the patient’s age, sex, and current location- the patient’s clinical needYou can also search for services using similar parameters, such as by:- service type - find matching service type ID, location and optional patient details- clinical term - find matching symptoms, location and optional patient details- ODS code - find active services with a matching ODS code- service ID - find active services with a matching service identifierThis service is widely used in an Urgent and Emergency Care context.It is not currently suitable for referrals from services using NHS Pathways outcomes, such as NHS 111 - for this, use the Directory of Services - Urgent and Emergency Care - SOAP API.You need a valid DoS account to use this API."
resource: "https://digital.nhs.uk/developer/api-catalogue/directory-of-services-urgent-and-emergency-care-rest"
timestamp: "2024-04-23"
tags: "government-services, health-and-care, nhs-digital, soap-wsdl"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Directory of Services - Urgent and Emergency Care - REST API

Use this API to access Directory of Services (DoS) information on a wide range of health and care services across England. You can search for services based on a combination of parameters: - the patient’s age, sex, and current location- the patient’s clinical needYou can also search for services using similar parameters, such as by:- service type - find matching service type ID, location and optional patient details- clinical term - find matching symptoms, location and optional patient details- ODS code - find active services with a matching ODS code- service ID - find active services with a matching service identifierThis service is widely used in an Urgent and Emergency Care context.It is not currently suitable for referrals from services using NHS Pathways outcomes, such as NHS 111 - for this, use the Directory of Services - Urgent and Emergency Care - SOAP API.You need a valid DoS account to use this API.

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/directory-of-services-urgent-and-emergency-care-rest
- Documentation: https://digital.nhs.uk/developer/api-catalogue/directory-of-services-urgent-and-emergency-care-rest

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
