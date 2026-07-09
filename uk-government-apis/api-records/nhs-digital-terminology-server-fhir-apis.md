---
type: "API Product"
title: "Terminology Server - FHIR APIs"
description: "Use these APIs to retrieve content from the NHS England Terminology Server, including:- international terminologies and classifications - such as SNOMED-CT and ICD-10- national terminologies - such as NHS Data Model and Dictionary codesYou can:- directly query the terminology server in real time, using a number of FHIR APIs, as defined by the HL7 FHIR-compliant terminology module standard- access a syndicated feed of terminology and classifications content in a machine-readable format, via an API- syndicate content across a group of terminology servers- share your own terminologies with othersSome content in the Terminology Server is freely available for read access, such as Data Dictionary. Other content is subject to access controls appropriate to the license, such as SNOMED-CT.To see what terminologies and classifications you can retrieve, see content in the NHS England Terminology Server.As well as these APIs, there are a number of end user terminology browsing tools available.For more information, see terminology servers."
resource: "https://digital.nhs.uk/developer/api-catalogue/terminology-server-fhir"
timestamp: "2024-04-23"
tags: "fhir, government-services, health-and-care, hl7-v3, nhs-digital"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Terminology Server - FHIR APIs

Use these APIs to retrieve content from the NHS England Terminology Server, including:- international terminologies and classifications - such as SNOMED-CT and ICD-10- national terminologies - such as NHS Data Model and Dictionary codesYou can:- directly query the terminology server in real time, using a number of FHIR APIs, as defined by the HL7 FHIR-compliant terminology module standard- access a syndicated feed of terminology and classifications content in a machine-readable format, via an API- syndicate content across a group of terminology servers- share your own terminologies with othersSome content in the Terminology Server is freely available for read access, such as Data Dictionary. Other content is subject to access controls appropriate to the license, such as SNOMED-CT.To see what terminologies and classifications you can retrieve, see content in the NHS England Terminology Server.As well as these APIs, there are a number of end user terminology browsing tools available.For more information, see terminology servers.

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/terminology-server-fhir
- Documentation: https://digital.nhs.uk/developer/api-catalogue/terminology-server-fhir

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
