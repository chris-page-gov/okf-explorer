---
type: "API Product"
title: "GP Connect (Patient Facing) Appointment Management - FHIR API"
description: "Use this API to book and manage patient appointments at their GP practice. You can: - search for free slots- book an appointment- retrieve a patient’s appointments- get details of a single appointment- cancel an appointmentYou cannot: - amend a patient's appointments beyond cancelling- re-schedule a patient's appointments (this must be done by cancelling and re-booking)To use this API, the end user must be a patient who is: - registered with the GP practice- registered with NHS login to P9 identity verification level"
resource: "https://digital.nhs.uk/developer/api-catalogue/gp-connect-patient-facing-appointment-management-fhir"
timestamp: "2024-04-23"
tags: "fhir, government-services, health-and-care, nhs-digital"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# GP Connect (Patient Facing) Appointment Management - FHIR API

Use this API to book and manage patient appointments at their GP practice. You can: - search for free slots- book an appointment- retrieve a patient’s appointments- get details of a single appointment- cancel an appointmentYou cannot: - amend a patient's appointments beyond cancelling- re-schedule a patient's appointments (this must be done by cancelling and re-booking)To use this API, the end user must be a patient who is: - registered with the GP practice- registered with NHS login to P9 identity verification level

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/gp-connect-patient-facing-appointment-management-fhir
- Documentation: https://digital.nhs.uk/developer/api-catalogue/gp-connect-patient-facing-appointment-management-fhir

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
