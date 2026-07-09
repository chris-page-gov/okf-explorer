---
type: "API Product"
title: "Summary Care Record - FHIR API"
description: "Use this API to access or update a patient's Summary Care Record (SCR) - an electronic record of important patient information, created from GP medical records. SCRs can be seen and used by authorised staff in other areas of the health and care system involved in the patient's direct care. This API is currently only approved for use in primary care software, specifically GP software. We hope to make it available for secondary care in the future. You can vote for this on our interactive product backlog. Also use this API to update a patient's consent to share their SCR, and to raise a privacy alert where you have to override a patient's dissent to share their SCR in certain circumstances. You can: - get a patient's SCR identifier- get a patient's SCR- upload a patient's SCR- send a privacy alert message, if you have to override a patient's dissent to view their SCR- update a patient's consent to share their SCRA healthcare worker must be present and authenticated with an NHS smartcard or a modern alternative to use this API."
resource: "https://digital.nhs.uk/developer/api-catalogue/summary-care-record-fhir"
timestamp: "2024-04-23"
tags: "fhir, health-and-care, nhs-digital"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Summary Care Record - FHIR API

Use this API to access or update a patient's Summary Care Record (SCR) - an electronic record of important patient information, created from GP medical records. SCRs can be seen and used by authorised staff in other areas of the health and care system involved in the patient's direct care. This API is currently only approved for use in primary care software, specifically GP software. We hope to make it available for secondary care in the future. You can vote for this on our interactive product backlog. Also use this API to update a patient's consent to share their SCR, and to raise a privacy alert where you have to override a patient's dissent to share their SCR in certain circumstances. You can: - get a patient's SCR identifier- get a patient's SCR- upload a patient's SCR- send a privacy alert message, if you have to override a patient's dissent to view their SCR- update a patient's consent to share their SCRA healthcare worker must be present and authenticated with an NHS smartcard or a modern alternative to use this API.

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/summary-care-record-fhir
- Documentation: https://digital.nhs.uk/developer/api-catalogue/summary-care-record-fhir

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
