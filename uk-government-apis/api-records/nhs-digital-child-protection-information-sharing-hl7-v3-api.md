---
type: "API Product"
title: "Child Protection - Information Sharing - HL7 V3 API"
description: "Use this API to access Child Protection - Information Sharing (CP-IS), the national electronic database of child protection information.The API can be used by local authorities and unscheduled care providers as follows: - Local authoritiesAs a local authority, you can:- upload a patient's CP-IS information- receive a notification when the patient's CP-IS information is accessed from an unscheduled care setting- receive a notification of an inactive NHS numberLocal authorities originally used a CP-IS client to transfer CP-IS data from their children’s social care systems to CP-IS via the Spine. This was replaced by the MESH client which all local authorities now use to exchange information with CP-IS - see connections 1 to 4 on the diagram.## Unscheduled care providersAs an unscheduled care provider, you can:- get a patient's CP-IS information - which automatically triggers a notification to the relevant local authority - see connections 5 and 6 on the diagram## Scheduled care providersCP-IS is not currently available for use in scheduled care settings.## Information held in CP-ISCP-IS holds the following information for each registered patient:- NHS number- details of their plan -…"
resource: "https://digital.nhs.uk/developer/api-catalogue/child-protection-information-sharing-hl7-v3"
timestamp: "2024-04-23"
tags: "government-services, health-and-care, hl7-v3, mesh, nhs-digital, streaming, tax-and-customs"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Child Protection - Information Sharing - HL7 V3 API

Use this API to access Child Protection - Information Sharing (CP-IS), the national electronic database of child protection information.The API can be used by local authorities and unscheduled care providers as follows: - Local authoritiesAs a local authority, you can:- upload a patient's CP-IS information- receive a notification when the patient's CP-IS information is accessed from an unscheduled care setting- receive a notification of an inactive NHS numberLocal authorities originally used a CP-IS client to transfer CP-IS data from their children’s social care systems to CP-IS via the Spine. This was replaced by the MESH client which all local authorities now use to exchange information with CP-IS - see connections 1 to 4 on the diagram.## Unscheduled care providersAs an unscheduled care provider, you can:- get a patient's CP-IS information - which automatically triggers a notification to the relevant local authority - see connections 5 and 6 on the diagram## Scheduled care providersCP-IS is not currently available for use in scheduled care settings.## Information held in CP-ISCP-IS holds the following information for each registered patient:- NHS number- details of their plan -…

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/child-protection-information-sharing-hl7-v3
- Documentation: https://digital.nhs.uk/developer/api-catalogue/child-protection-information-sharing-hl7-v3

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
