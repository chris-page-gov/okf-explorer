---
type: "API Product"
title: "Summary Care Record - HL7 V3 API"
description: "Use this API to access a patient's Summary Care Record (SCR) - a national electronic record of important patient information, created from GP summaries of medical records. SCRs can be seen and used by authorised staff in other areas of the health and care system involved in the patient's direct care.Summary Care Record was previously known as Personal Spine Information Service (PSIS).Also use this API to access the Access Control Service (ACS) - which manages consent to share information for SCR. GP systems must check consent to share before sharing a patient's Summary Care Record.You can:- create or add to a patient's Summary Care Record - as a GP system capable of uploading GP summaries- retrieve a patient's Summary Care Record- set and check consent to share information - via the Access Control Service (ACS)You cannot use this API to update GP medical records.### Spine Mini Service Provider (SMSP) optionsThere are also commercially available products which give easier access to SCR, known as Spine Mini Service Providers (SMSPs). These and other conforming software products are listed in our Conformance Catalogue.If you are interested in becoming a provider of one of these produ…"
resource: "https://digital.nhs.uk/developer/api-catalogue/summary-care-record-hl7-v3"
timestamp: "2024-04-23"
tags: "government-services, health-and-care, hl7-v3, nhs-digital"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Summary Care Record - HL7 V3 API

Use this API to access a patient's Summary Care Record (SCR) - a national electronic record of important patient information, created from GP summaries of medical records. SCRs can be seen and used by authorised staff in other areas of the health and care system involved in the patient's direct care.Summary Care Record was previously known as Personal Spine Information Service (PSIS).Also use this API to access the Access Control Service (ACS) - which manages consent to share information for SCR. GP systems must check consent to share before sharing a patient's Summary Care Record.You can:- create or add to a patient's Summary Care Record - as a GP system capable of uploading GP summaries- retrieve a patient's Summary Care Record- set and check consent to share information - via the Access Control Service (ACS)You cannot use this API to update GP medical records.### Spine Mini Service Provider (SMSP) optionsThere are also commercially available products which give easier access to SCR, known as Spine Mini Service Providers (SMSPs). These and other conforming software products are listed in our Conformance Catalogue.If you are interested in becoming a provider of one of these produ…

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/summary-care-record-hl7-v3
- Documentation: https://digital.nhs.uk/developer/api-catalogue/summary-care-record-hl7-v3

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
