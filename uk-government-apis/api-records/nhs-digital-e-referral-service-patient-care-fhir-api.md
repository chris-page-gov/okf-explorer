---
type: "API Product"
title: "e-Referral Service Patient Care – FHIR API"
description: "Use this API to retrieve referrals for a patient from the e-Referral Service (e-RS) and, if applicable, retrieve service information for a referral that has a current appointment booking with a service or is currently deferred to a service. This API is designed to be used by the Patient Care Aggregator. As an integrated system acting on behalf of a patient, you can: - retrieve a patient's referrals- retrieve information for a single serviceYou cannot use this API to: - get patient personal demographic details – instead, use the Personal Demographic Service (PDS)You can access the following data: - a summary of each active referralAccess modes This API has one access mode: - Access mode: Patient access- Authentication via: NHS login- Functions: Get own details- Availability: In production, beta Patient, user-restricted access This access mode allows integrated systems acting on behalf of a patient to access Patient Care FHIR API endpoints by authenticating users with NHS login."
resource: "https://digital.nhs.uk/developer/api-catalogue/e-referral-service-patient-care-fhir"
timestamp: "2024-04-23"
tags: "fhir, government-services, health-and-care, nhs-digital"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# e-Referral Service Patient Care – FHIR API

Use this API to retrieve referrals for a patient from the e-Referral Service (e-RS) and, if applicable, retrieve service information for a referral that has a current appointment booking with a service or is currently deferred to a service. This API is designed to be used by the Patient Care Aggregator. As an integrated system acting on behalf of a patient, you can: - retrieve a patient's referrals- retrieve information for a single serviceYou cannot use this API to: - get patient personal demographic details – instead, use the Personal Demographic Service (PDS)You can access the following data: - a summary of each active referralAccess modes This API has one access mode: - Access mode: Patient access- Authentication via: NHS login- Functions: Get own details- Availability: In production, beta Patient, user-restricted access This access mode allows integrated systems acting on behalf of a patient to access Patient Care FHIR API endpoints by authenticating users with NHS login.

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/e-referral-service-patient-care-fhir
- Documentation: https://digital.nhs.uk/developer/api-catalogue/e-referral-service-patient-care-fhir

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
