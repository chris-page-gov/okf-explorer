---
type: "API Product"
title: "GP Connect Send Document - FHIR"
description: "Use this integration to send a PDF consultation summary to a registered GP practice - using GP Connect Messaging.For example, use it to send a document containing a patient's consultation notes to their GP practice when a patient is seen:- at another GP practice than their own- by an out of hours service- by a district nurse at homeEach message sent using this integration uses the GP Connect Messaging components, MESH, and ITK3, to deliver the message.Each message sent is a FHIR Message, defined as a FHIR composition, constructed to meet the ITK3 standard with a specific payload structure.For more details, see the GP Connect specifications for developers."
resource: "https://digital.nhs.uk/developer/api-catalogue/gp-connect-send-document-fhir"
timestamp: "2024-04-23"
tags: "fhir, government-services, health-and-care, mesh, nhs-digital"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# GP Connect Send Document - FHIR

Use this integration to send a PDF consultation summary to a registered GP practice - using GP Connect Messaging.For example, use it to send a document containing a patient's consultation notes to their GP practice when a patient is seen:- at another GP practice than their own- by an out of hours service- by a district nurse at homeEach message sent using this integration uses the GP Connect Messaging components, MESH, and ITK3, to deliver the message.Each message sent is a FHIR Message, defined as a FHIR composition, constructed to meet the ITK3 standard with a specific payload structure.For more details, see the GP Connect specifications for developers.

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/gp-connect-send-document-fhir
- Documentation: https://digital.nhs.uk/developer/api-catalogue/gp-connect-send-document-fhir

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
