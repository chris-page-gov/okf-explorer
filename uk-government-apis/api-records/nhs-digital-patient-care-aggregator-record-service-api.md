---
type: "API Product"
title: "Patient Care Aggregator Record Service API"
description: "Use this API, as a secondary care provider, to let the Patient Care Aggregator know which patients you have bookings for. The Patient Care Aggregator needs this information in advance so it knows which secondary care providers to ask for a list of bookings when a patient requests the list using the NHS App. As a secondary care provider, you’ll also need to: - build an API using the Patient Care Aggregator Get Applications API standard that the Patient Care Aggregator can use to get a list of bookings for a patient- build a ‘patient portal’ web application that the patient can access via a hyperlink from the NHS AppFor more details, see Patient access to referrals and bookings via the Patient Care Aggregator."
resource: "https://digital.nhs.uk/developer/api-catalogue/patient-care-aggregator-record-service/patient-care-aggregator-record-service-api"
timestamp: "2024-04-23"
tags: "government-services, health-and-care, nhs-digital, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Patient Care Aggregator Record Service API

Use this API, as a secondary care provider, to let the Patient Care Aggregator know which patients you have bookings for. The Patient Care Aggregator needs this information in advance so it knows which secondary care providers to ask for a list of bookings when a patient requests the list using the NHS App. As a secondary care provider, you’ll also need to: - build an API using the Patient Care Aggregator Get Applications API standard that the Patient Care Aggregator can use to get a list of bookings for a patient- build a ‘patient portal’ web application that the patient can access via a hyperlink from the NHS AppFor more details, see Patient access to referrals and bookings via the Patient Care Aggregator.

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/patient-care-aggregator-record-service/patient-care-aggregator-record-service-api
- Documentation: https://digital.nhs.uk/developer/api-catalogue/patient-care-aggregator-record-service/patient-care-aggregator-record-service-api

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
