---
type: "API Product"
title: "GP Connect (Patient Facing) Prescriptions - FHIR API"
description: "Use this API to manage a patient's prescriptions as held by their GP practice. You can: - request a new instance of a repeat prescription- view all of a patients medications, whether acute or repeat, past or present- cancel a repeat prescription request- check the status of a current prescription request- request a new instance of a repeat prescription to a one off nomination pharmacyThe end user must be a patient who is: - registered with the GP practice- registered with NHS login to P9 identity verification level For example: - a patient can view their own medication, request a new instance of a repeat prescription and cancel that request"
resource: "https://digital.nhs.uk/developer/api-catalogue/gp-connect-patient-facing-prescriptions-fhir"
timestamp: "2024-04-23"
tags: "fhir, health-and-care, nhs-digital"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# GP Connect (Patient Facing) Prescriptions - FHIR API

Use this API to manage a patient's prescriptions as held by their GP practice. You can: - request a new instance of a repeat prescription- view all of a patients medications, whether acute or repeat, past or present- cancel a repeat prescription request- check the status of a current prescription request- request a new instance of a repeat prescription to a one off nomination pharmacyThe end user must be a patient who is: - registered with the GP practice- registered with NHS login to P9 identity verification level For example: - a patient can view their own medication, request a new instance of a repeat prescription and cancel that request

## Metadata

- Type: API Product
- Provider: [NHS Digital](../organisations/nhs-digital.md)
- Canonical provider: NHS Digital
- Source adapter: api_gov_uk_catalogue
- Source tier: declared_api_catalogue
- Confidence: declared
- Assurance status: declared
- Access model: approval-required
- Contract status: documentation-only
- Licence: Not specified (not-specified)
- Licence basis: not-specified
- Licence source: not-specified
- Licence confidence: 0.2
- Quality band: high
- DCAT term: `dcat:DataService`
- OpenAPI term: `OpenAPI Object`

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/gp-connect-patient-facing-prescriptions-fhir
- Documentation: https://digital.nhs.uk/developer/api-catalogue/gp-connect-patient-facing-prescriptions-fhir

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
