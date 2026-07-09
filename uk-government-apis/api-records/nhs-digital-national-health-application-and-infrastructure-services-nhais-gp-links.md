---
type: "API Product"
title: "National Health Application and Infrastructure Services - NHAIS GP Links"
description: "Use this integration to manage GP registrations and other patient data in National Health Application and Infrastructure Services (NHAIS).You can:- register a patient at a GP practice- receive a patient deregistration (deduction) notification at the previous GP practice- update patient demographics information, such as addressThis integration uses MESH to send and receive messages. This integration forms part of the end-to-end GP registration process. For more details on the end-to-end process, contact us."
resource: "https://digital.nhs.uk/developer/api-catalogue/nhais-gp-links"
timestamp: "2024-04-23"
tags: "health-and-care, mesh, nhs-digital, planning-and-property, streaming"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# National Health Application and Infrastructure Services - NHAIS GP Links

Use this integration to manage GP registrations and other patient data in National Health Application and Infrastructure Services (NHAIS).You can:- register a patient at a GP practice- receive a patient deregistration (deduction) notification at the previous GP practice- update patient demographics information, such as addressThis integration uses MESH to send and receive messages. This integration forms part of the end-to-end GP registration process. For more details on the end-to-end process, contact us.

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/nhais-gp-links
- Documentation: https://digital.nhs.uk/developer/api-catalogue/nhais-gp-links

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
