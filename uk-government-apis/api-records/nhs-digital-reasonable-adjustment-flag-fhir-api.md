---
type: "API Product"
title: "Reasonable Adjustment Flag - FHIR API"
description: "Use this API to access and update the Reasonable Adjustment Flag - a national record which indicates that a patient requires reasonable adjustments and optionally includes details of impairments and adjustments to be considered. You can: - check if a Reasonable Adjustment Flag exists- read a Reasonable Adjustment Flag- create a Reasonable Adjustment Flag- update a Reasonable Adjustment Flag- remove a Reasonable Adjustment FlagThe flag consists of three parts: - details of consent to share the Flag and how this was obtained. Consent may have been given by the patient or via a 'best interest decision' under the Mental Capacity Act (2005). In some cases consent can also be obtained from a lasting power of attorney for health and welfare or a court appointed deputy.- details of impairments, which enable clinicians to understand the range of adjustments the patient may require. Note that the patient may decline to say what their impairments are.- details of reasonable adjustments to services which are needed by the patient when providing their care.This API can only be used by relevant health and care staff providing direct care, authenticated with an NHS smartcard or equivalent. The e…"
resource: "https://digital.nhs.uk/developer/api-catalogue/reasonable-adjustment-flag-fhir"
timestamp: "2024-04-23"
tags: "fhir, health-and-care, justice-and-policing, nhs-digital"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Reasonable Adjustment Flag - FHIR API

Use this API to access and update the Reasonable Adjustment Flag - a national record which indicates that a patient requires reasonable adjustments and optionally includes details of impairments and adjustments to be considered. You can: - check if a Reasonable Adjustment Flag exists- read a Reasonable Adjustment Flag- create a Reasonable Adjustment Flag- update a Reasonable Adjustment Flag- remove a Reasonable Adjustment FlagThe flag consists of three parts: - details of consent to share the Flag and how this was obtained. Consent may have been given by the patient or via a 'best interest decision' under the Mental Capacity Act (2005). In some cases consent can also be obtained from a lasting power of attorney for health and welfare or a court appointed deputy.- details of impairments, which enable clinicians to understand the range of adjustments the patient may require. Note that the patient may decline to say what their impairments are.- details of reasonable adjustments to services which are needed by the patient when providing their care.This API can only be used by relevant health and care staff providing direct care, authenticated with an NHS smartcard or equivalent. The e…

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/reasonable-adjustment-flag-fhir
- Documentation: https://digital.nhs.uk/developer/api-catalogue/reasonable-adjustment-flag-fhir

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
