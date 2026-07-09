---
type: "API Product"
title: "Patient Care Aggregator - FHIR API"
description: "Use this API to get an aggregated list of referrals and bookings for a patient from secondary care providers. The API aggregates details of referrals and bookings from a number of systems. For details, see status and roadmap. We might add other providers in the future. This API is only for use in patient-facing applications, not point-of-care applications. For more details, see Patient access to referrals and bookings via the Patient Care Aggregator."
resource: "https://digital.nhs.uk/developer/api-catalogue/patient-care-aggregator-fhir"
timestamp: "2024-04-23"
tags: "fhir, health-and-care, nhs-digital"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Patient Care Aggregator - FHIR API

Use this API to get an aggregated list of referrals and bookings for a patient from secondary care providers. The API aggregates details of referrals and bookings from a number of systems. For details, see status and roadmap. We might add other providers in the future. This API is only for use in patient-facing applications, not point-of-care applications. For more details, see Patient access to referrals and bookings via the Patient Care Aggregator.

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/patient-care-aggregator-fhir
- Documentation: https://digital.nhs.uk/developer/api-catalogue/patient-care-aggregator-fhir

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
