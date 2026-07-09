---
type: "API Product"
title: "National Record Locator - FHIR API"
description: "Use this API to locate and access patient information shared by other healthcare organisations, to support the direct care of those patients, using the National Record Locator (NRL).As a \"provider\" or \"producer\" who holds information about patients, you can:- create a pointer in the NRL to your information- replace your NRL pointer with a newer pointer, superseding the old one- update your NRL pointer status to \"entered in error\"- delete your NRL pointer to this informationAs a \"consumer\" who needs access to the patient information being shared by providers, you can:- search for information by parameters including information ID, patient, information provider, information type, or number of matching results- retrieve an NRL pointer and access the informationThere is a growing list of health and social care organisations authorised to share records using NRL."
resource: "https://digital.nhs.uk/developer/api-catalogue/national-record-locator-fhir"
timestamp: "2024-04-23"
tags: "fhir, government-services, health-and-care, nhs-digital"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# National Record Locator - FHIR API

Use this API to locate and access patient information shared by other healthcare organisations, to support the direct care of those patients, using the National Record Locator (NRL).As a "provider" or "producer" who holds information about patients, you can:- create a pointer in the NRL to your information- replace your NRL pointer with a newer pointer, superseding the old one- update your NRL pointer status to "entered in error"- delete your NRL pointer to this informationAs a "consumer" who needs access to the patient information being shared by providers, you can:- search for information by parameters including information ID, patient, information provider, information type, or number of matching results- retrieve an NRL pointer and access the informationThere is a growing list of health and social care organisations authorised to share records using NRL.

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/national-record-locator-fhir
- Documentation: https://digital.nhs.uk/developer/api-catalogue/national-record-locator-fhir

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
