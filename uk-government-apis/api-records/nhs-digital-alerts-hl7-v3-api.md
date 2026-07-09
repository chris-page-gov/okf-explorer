---
type: "API Product"
title: "Alerts - HL7 V3 API"
description: "Use this API to send an alert for the attention of a Privacy Officer - also known as Summary Care Record Governance Person (SGP) in community pharmacies - so they can audit proactively whether access to a patient’s data was appropriate. This provides a general alerting mechanism covering, for example, when a user looks up a patient on the Summary Care Record application (SCRa).A healthcare worker must be present and authenticated with an NHS smartcard or a modern alternative to use this API."
resource: "https://digital.nhs.uk/developer/api-catalogue/alerts-hl7-v3"
timestamp: "2024-04-23"
tags: "health-and-care, hl7-v3, nhs-digital"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Alerts - HL7 V3 API

Use this API to send an alert for the attention of a Privacy Officer - also known as Summary Care Record Governance Person (SGP) in community pharmacies - so they can audit proactively whether access to a patient’s data was appropriate. This provides a general alerting mechanism covering, for example, when a user looks up a patient on the Summary Care Record application (SCRa).A healthcare worker must be present and authenticated with an NHS smartcard or a modern alternative to use this API.

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/alerts-hl7-v3
- Documentation: https://digital.nhs.uk/developer/api-catalogue/alerts-hl7-v3

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
