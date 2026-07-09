---
type: "API Product"
title: "GP Connect Access Record: Structured - FHIR API"
description: "Use this API to access structured information from a patient’s registered GP practice record. Structured information is patient data in a coded format that a consuming system can import and process.The API accesses GP principal supplier systems, provides a consistent interface and data model, and is brokered through Spine. You can retrieve data from GP practice records for the following areas:- medications- allergiesData is available for the following clinical areas:- immunizations- consultations- problems- investigations- outbound referrals- diary entries- uncategorised data (other clinically coded items that are present in the record)These clinical areas are still in development; there is enough data to test, but it is subject to change as GP systems suppliers go through the development process.It does not include:- extended demographics information - for example, about carers- flags and alerts- templates- test requestsCommon use cases include:- access GP medications on admission to secondary care, reducing transcription errors- active checking of a patient's prescription in unscheduled care- out-of-hours GP accesses patient's medications, allergies and problems- midwife views p…"
resource: "https://digital.nhs.uk/developer/api-catalogue/gp-connect-access-record-structured-fhir"
timestamp: "2024-04-23"
tags: "fhir, health-and-care, nhs-digital, planning-and-property"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# GP Connect Access Record: Structured - FHIR API

Use this API to access structured information from a patient’s registered GP practice record. Structured information is patient data in a coded format that a consuming system can import and process.The API accesses GP principal supplier systems, provides a consistent interface and data model, and is brokered through Spine. You can retrieve data from GP practice records for the following areas:- medications- allergiesData is available for the following clinical areas:- immunizations- consultations- problems- investigations- outbound referrals- diary entries- uncategorised data (other clinically coded items that are present in the record)These clinical areas are still in development; there is enough data to test, but it is subject to change as GP systems suppliers go through the development process.It does not include:- extended demographics information - for example, about carers- flags and alerts- templates- test requestsCommon use cases include:- access GP medications on admission to secondary care, reducing transcription errors- active checking of a patient's prescription in unscheduled care- out-of-hours GP accesses patient's medications, allergies and problems- midwife views p…

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/gp-connect-access-record-structured-fhir
- Documentation: https://digital.nhs.uk/developer/api-catalogue/gp-connect-access-record-structured-fhir

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
