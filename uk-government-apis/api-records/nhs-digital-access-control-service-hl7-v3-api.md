---
type: "API Product"
title: "Access Control Service HL7 V3 API"
description: "Use this API to access the Access Control Service (ACS) - which manages consent to share patient information, including their SCR.GP systems must check consent to share before sharing, for example, a patient's Summary Care Record (SCR).You can:- get the access permissions for a patient's documents, including their SCR- set access permissions on a patient's documents, including their SCRNote the Summary Care Record - FHIR API also has endpoints enabling you to get and set access permissions, the same as this ACS API.A healthcare worker must be present and authenticated with an NHS smartcard or a modern alternative to use this API."
resource: "https://digital.nhs.uk/developer/api-catalogue/access-control-service-hl7-v3"
timestamp: "2024-04-23"
tags: "fhir, government-services, health-and-care, hl7-v3, nhs-digital"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Access Control Service HL7 V3 API

Use this API to access the Access Control Service (ACS) - which manages consent to share patient information, including their SCR.GP systems must check consent to share before sharing, for example, a patient's Summary Care Record (SCR).You can:- get the access permissions for a patient's documents, including their SCR- set access permissions on a patient's documents, including their SCRNote the Summary Care Record - FHIR API also has endpoints enabling you to get and set access permissions, the same as this ACS API.A healthcare worker must be present and authenticated with an NHS smartcard or a modern alternative to use this API.

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/access-control-service-hl7-v3
- Documentation: https://digital.nhs.uk/developer/api-catalogue/access-control-service-hl7-v3

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
