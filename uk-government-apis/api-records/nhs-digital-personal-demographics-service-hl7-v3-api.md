---
type: "API Product"
title: "Personal Demographics Service - HL7 V3 API"
description: "Use this API to access the Personal Demographics Service (PDS), the national electronic database of NHS patient details such as name, address, date of birth, related people, registered GP and NHS number.You can:- search for patients- check that you have the correct NHS number for a patient- get patient details- create a new record for a birth- receive birth notifications - although another option is PDS Notifications FHIR API- create a record for a new patient (except for GPs - see below)You should not use this API to create a new record when registering a new patient at a GP Practice. Instead, use National Health Application and Infrastructure Services (NHAIS).You can retrieve current and historical demographic information for a patient including:- NHS number- name- gender- birth information- address- contact details- registered GP- preferred pharmacy- consent information- related people, such as next of kin- death information### Spine Mini Service Provider (SMSP) optionsThere are also commercially available products which give easier access to PDS, known as Spine Mini Service Providers (SMSPs).These and other conforming software products are listed in our Conformance Catalogue.I…"
resource: "https://digital.nhs.uk/developer/api-catalogue/personal-demographics-service-hl7-v3"
timestamp: "2024-04-23"
tags: "fhir, geospatial, government-services, health-and-care, hl7-v3, nhs-digital, planning-and-property, streaming"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Personal Demographics Service - HL7 V3 API

Use this API to access the Personal Demographics Service (PDS), the national electronic database of NHS patient details such as name, address, date of birth, related people, registered GP and NHS number.You can:- search for patients- check that you have the correct NHS number for a patient- get patient details- create a new record for a birth- receive birth notifications - although another option is PDS Notifications FHIR API- create a record for a new patient (except for GPs - see below)You should not use this API to create a new record when registering a new patient at a GP Practice. Instead, use National Health Application and Infrastructure Services (NHAIS).You can retrieve current and historical demographic information for a patient including:- NHS number- name- gender- birth information- address- contact details- registered GP- preferred pharmacy- consent information- related people, such as next of kin- death information### Spine Mini Service Provider (SMSP) optionsThere are also commercially available products which give easier access to PDS, known as Spine Mini Service Providers (SMSPs).These and other conforming software products are listed in our Conformance Catalogue.I…

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/personal-demographics-service-hl7-v3
- Documentation: https://digital.nhs.uk/developer/api-catalogue/personal-demographics-service-hl7-v3

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
