---
type: "API Product"
title: "Pathology Messaging - HL7 V3"
description: "Use this integration to request laboratory tests and send the results back to the requester, usually the patient's GP or consultant. Results can also be copied to other healthcare providers for information.One request can lead to several results reports and each report is complete in its own right. If incomplete reports are issued, a final report carries all the reported information, replacing the originals entirely.This integration is not widely adopted - it is only used as part of the NHS Newborn Blood Spot (NBS) Screening Programme which involves a limited number of pathology laboratories. Pathology Messaging - EDIFACT API supports most of the pathology interactions.This integration will be superseded by the Pathology Messaging - FHIR API."
resource: "https://digital.nhs.uk/developer/api-catalogue/pathology-messaging-hl7-v3"
timestamp: "2024-04-23"
tags: "edifact, fhir, health-and-care, hl7-v3, nhs-digital"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Pathology Messaging - HL7 V3

Use this integration to request laboratory tests and send the results back to the requester, usually the patient's GP or consultant. Results can also be copied to other healthcare providers for information.One request can lead to several results reports and each report is complete in its own right. If incomplete reports are issued, a final report carries all the reported information, replacing the originals entirely.This integration is not widely adopted - it is only used as part of the NHS Newborn Blood Spot (NBS) Screening Programme which involves a limited number of pathology laboratories. Pathology Messaging - EDIFACT API supports most of the pathology interactions.This integration will be superseded by the Pathology Messaging - FHIR API.

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/pathology-messaging-hl7-v3
- Documentation: https://digital.nhs.uk/developer/api-catalogue/pathology-messaging-hl7-v3

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
