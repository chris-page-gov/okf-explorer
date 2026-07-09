---
type: "API Product"
title: "Assessment Discharge and Withdrawal - FHIR"
description: "Use this integration to support transfer of care from hospital to social services for patients with care and support needs, as described in the Care Act 2014. It enables the exchange of structured information between hospitals and social care organisations.You can send:- hospital assessment notices to inform social services that an assessment of a patient's care and support needs is required- hospital discharge notices to confirm a patient's proposed discharge date- withdrawal notices to withdraw a previous assessment or discharge noticeYou can also send an admissions notice with this integration so a hospital can inform social services that a patient has been admitted.This is a messaging integration which uses MESH to send and receive messages.Information Standard SCCI2075 defines the minimum data sets that you must use for Assessment, Discharge and Withdrawal (ADW) notices. For additional message guidance on the implementation and use of ADW FHIR messages and some divergences from this ADW Information Standard, see Assessment Discharge and Withdrawal - FHIR API.This integration is in production but deprecated. Do not begin any development work using this API."
resource: "https://digital.nhs.uk/developer/api-catalogue/assessment-discharge-and-withdrawal-fhir"
timestamp: "2024-04-23"
tags: "fhir, government-services, health-and-care, mesh, nhs-digital"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Assessment Discharge and Withdrawal - FHIR

Use this integration to support transfer of care from hospital to social services for patients with care and support needs, as described in the Care Act 2014. It enables the exchange of structured information between hospitals and social care organisations.You can send:- hospital assessment notices to inform social services that an assessment of a patient's care and support needs is required- hospital discharge notices to confirm a patient's proposed discharge date- withdrawal notices to withdraw a previous assessment or discharge noticeYou can also send an admissions notice with this integration so a hospital can inform social services that a patient has been admitted.This is a messaging integration which uses MESH to send and receive messages.Information Standard SCCI2075 defines the minimum data sets that you must use for Assessment, Discharge and Withdrawal (ADW) notices. For additional message guidance on the implementation and use of ADW FHIR messages and some divergences from this ADW Information Standard, see Assessment Discharge and Withdrawal - FHIR API.This integration is in production but deprecated. Do not begin any development work using this API.

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/assessment-discharge-and-withdrawal-fhir
- Documentation: https://digital.nhs.uk/developer/api-catalogue/assessment-discharge-and-withdrawal-fhir

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
