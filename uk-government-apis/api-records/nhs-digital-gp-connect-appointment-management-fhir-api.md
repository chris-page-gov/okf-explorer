---
type: "API Product"
title: "GP Connect Appointment Management - FHIR API"
description: "Use this API to enable administrative and clinical end users to book and manage patient appointments held in any of the principal GP practice systems.You can:- retrieve a patient’s appointments- search for free slots- read an appointment- book an appointment- amend an appointment- cancel an appointmentFor example:- staff at a GP practice can book, view, amend or cancel appointments on behalf of a patient at another practice- organisations such as NHS 111 call centre, out of hours services, or extended access hubs can book, view, amend or cancel appointments on behalf of a patient at their registered GP practice or federated GP practicesNote: You need to use this API in conjunction with the GP Connect Foundations FHIR API. With this API you can:- get patient details - “Read Patient”- search for patient - “Patient Search”- get practitioner details - “Read Practitioner”- search for practitioner - “Practitioner Search”- get organisation details - “Read Organisation”- search for organisation - “Organisation Search”- get location details - “Read Location”- register patient - “Register Patient”For more details, see the GP Connect specifications for developers. Start your development work…"
resource: "https://digital.nhs.uk/developer/api-catalogue/gp-connect-appointment-management-fhir"
timestamp: "2024-04-23"
tags: "fhir, government-services, health-and-care, nhs-digital, planning-and-property"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# GP Connect Appointment Management - FHIR API

Use this API to enable administrative and clinical end users to book and manage patient appointments held in any of the principal GP practice systems.You can:- retrieve a patient’s appointments- search for free slots- read an appointment- book an appointment- amend an appointment- cancel an appointmentFor example:- staff at a GP practice can book, view, amend or cancel appointments on behalf of a patient at another practice- organisations such as NHS 111 call centre, out of hours services, or extended access hubs can book, view, amend or cancel appointments on behalf of a patient at their registered GP practice or federated GP practicesNote: You need to use this API in conjunction with the GP Connect Foundations FHIR API. With this API you can:- get patient details - “Read Patient”- search for patient - “Patient Search”- get practitioner details - “Read Practitioner”- search for practitioner - “Practitioner Search”- get organisation details - “Read Organisation”- search for organisation - “Organisation Search”- get location details - “Read Location”- register patient - “Register Patient”For more details, see the GP Connect specifications for developers. Start your development work…

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/gp-connect-appointment-management-fhir
- Documentation: https://digital.nhs.uk/developer/api-catalogue/gp-connect-appointment-management-fhir

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
