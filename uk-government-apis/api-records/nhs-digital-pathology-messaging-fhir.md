---
type: "API Product"
title: "Pathology Messaging - FHIR"
description: "Use this integration to share pathology results from a Laboratory Information Management System (LIMS) to the requestor, typically a healthcare worker in NHS primary or secondary care.Initially it focuses on haematology and clinical biochemistry test reporting - also known as chemical pathology.This integration uses MESH to send and receive pathology results.It is intended to replace the current Pathology Messaging - EDIFACT API and supersedes Laboratory HL7 V3 (see the Message Implementation Manual under Domains -> Health and Clinical Management -> Laboratory)."
resource: "https://digital.nhs.uk/developer/api-catalogue/pathology-messaging-fhir"
timestamp: "2024-04-23"
tags: "edifact, fhir, health-and-care, hl7-v3, mesh, nhs-digital"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Pathology Messaging - FHIR

Use this integration to share pathology results from a Laboratory Information Management System (LIMS) to the requestor, typically a healthcare worker in NHS primary or secondary care.Initially it focuses on haematology and clinical biochemistry test reporting - also known as chemical pathology.This integration uses MESH to send and receive pathology results.It is intended to replace the current Pathology Messaging - EDIFACT API and supersedes Laboratory HL7 V3 (see the Message Implementation Manual under Domains -> Health and Clinical Management -> Laboratory).

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/pathology-messaging-fhir
- Documentation: https://digital.nhs.uk/developer/api-catalogue/pathology-messaging-fhir

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
