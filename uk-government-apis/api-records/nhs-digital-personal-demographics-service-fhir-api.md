---
type: "API Product"
title: "Personal Demographics Service - FHIR API"
description: "Use this API to access the Personal Demographics Service (PDS) - the national electronic database of NHS patient details such as name, address, date of birth, related people, registered GP and NHS number. You can: - search for patients- get patient details- update patient details- verify an NHS number for a patientYou cannot currently use this API to: - create a new record for a birth - use PDS HL7 V3 API- receive birth notifications - use PDS HL7 V3 API or PDS Notifications FHIR API- create a record for a new patient - use PDS HL7 V3 API- register a new patient at a GP Practice - use NHAIS GP Links API- receive patient death notifications - use PDS Notifications FHIR API- receive notifications about a patient's change of address - use PDS Notifications FHIR API- receive notifications about a patient's change of GP - use PDS Notifications FHIR API- receive notifications about any PDS record change - use PDS Notifications FHIR APIYou can read and update the following data: - NHS number (read only)- name- gender- addresses and contact details- birth information- death information- registered GP- nominated pharmacy- dispensing doctor pharmacy- medical appliance supplier pharmacy- rel…"
resource: "https://digital.nhs.uk/developer/api-catalogue/personal-demographics-service-fhir"
timestamp: "2024-04-23"
tags: "fhir, geospatial, government-services, health-and-care, hl7-v3, nhs-digital, planning-and-property, streaming"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Personal Demographics Service - FHIR API

Use this API to access the Personal Demographics Service (PDS) - the national electronic database of NHS patient details such as name, address, date of birth, related people, registered GP and NHS number. You can: - search for patients- get patient details- update patient details- verify an NHS number for a patientYou cannot currently use this API to: - create a new record for a birth - use PDS HL7 V3 API- receive birth notifications - use PDS HL7 V3 API or PDS Notifications FHIR API- create a record for a new patient - use PDS HL7 V3 API- register a new patient at a GP Practice - use NHAIS GP Links API- receive patient death notifications - use PDS Notifications FHIR API- receive notifications about a patient's change of address - use PDS Notifications FHIR API- receive notifications about a patient's change of GP - use PDS Notifications FHIR API- receive notifications about any PDS record change - use PDS Notifications FHIR APIYou can read and update the following data: - NHS number (read only)- name- gender- addresses and contact details- birth information- death information- registered GP- nominated pharmacy- dispensing doctor pharmacy- medical appliance supplier pharmacy- rel…

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/personal-demographics-service-fhir
- Documentation: https://digital.nhs.uk/developer/api-catalogue/personal-demographics-service-fhir

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
