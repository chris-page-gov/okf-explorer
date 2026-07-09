---
type: "API Product"
title: "GP Connect (Patient Facing) Access Record - FHIR API"
description: "Use this API to access structured and coded information from a patient's GP practice record to consume in a patient facing service. The API accesses GP principal supplier systems and provides a consistent interface and data model. You can retrieve patient record data for the following: - medications- allergies- immunisations- consultations- problems- investigations- attachments- uncategorised data (other clinically coded items that are present in the record)You cannot currently use this API to: - write back to the GP record"
resource: "https://digital.nhs.uk/developer/api-catalogue/gp-connect-patient-facing-access-record-fhir"
timestamp: "2024-04-23"
tags: "fhir, government-services, health-and-care, nhs-digital"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# GP Connect (Patient Facing) Access Record - FHIR API

Use this API to access structured and coded information from a patient's GP practice record to consume in a patient facing service. The API accesses GP principal supplier systems and provides a consistent interface and data model. You can retrieve patient record data for the following: - medications- allergies- immunisations- consultations- problems- investigations- attachments- uncategorised data (other clinically coded items that are present in the record)You cannot currently use this API to: - write back to the GP record

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/gp-connect-patient-facing-access-record-fhir
- Documentation: https://digital.nhs.uk/developer/api-catalogue/gp-connect-patient-facing-access-record-fhir

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
