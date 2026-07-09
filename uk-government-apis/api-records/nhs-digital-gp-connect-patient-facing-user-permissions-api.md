---
type: "API Product"
title: "GP Connect (Patient Facing) User Permissions API"
description: "Use this API to list and manage the permissions a patient has to their medical record and a selection of services provided at their GP practice. You can: - get a patient's permissions- request to update a patient's permissions to a higher levelYou cannot: - request to update a patient's permissions to a lower levelTo use this API, the end user must be a patient who is: - registered with the GP practice- registered with NHS login to P9 identity verification levelThis API allows you to manage the permissions for: - appointments- prescriptions- medical recordThis API is designed to respect the policy changes made in order to- allow patients to access their future medical record entries.For more details, see- access to patient records through the NHS App."
resource: "https://digital.nhs.uk/developer/api-catalogue/gp-connect-patient-facing-user-permissions"
timestamp: "2024-04-23"
tags: "health-and-care, nhs-digital, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# GP Connect (Patient Facing) User Permissions API

Use this API to list and manage the permissions a patient has to their medical record and a selection of services provided at their GP practice. You can: - get a patient's permissions- request to update a patient's permissions to a higher levelYou cannot: - request to update a patient's permissions to a lower levelTo use this API, the end user must be a patient who is: - registered with the GP practice- registered with NHS login to P9 identity verification levelThis API allows you to manage the permissions for: - appointments- prescriptions- medical recordThis API is designed to respect the policy changes made in order to- allow patients to access their future medical record entries.For more details, see- access to patient records through the NHS App.

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/gp-connect-patient-facing-user-permissions
- Documentation: https://digital.nhs.uk/developer/api-catalogue/gp-connect-patient-facing-user-permissions

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
