---
type: "API Product"
title: "COVID-19 Test Results - FHIR API"
description: "Use this API to access a patient’s coronavirus (COVID-19) test results history. You can: - get a patient's COVID-19 test history, based on their NHS number with an optional specific date rangeYou cannot currently use this API to: - get details of other types of testYou get the following data: - COVID-19 test event detailsData availability, timing and quality All test records are verified to ensure the NHS number is correct before making them available via the API. In most cases this is automatic, and the record is available within 48 hours of the test event, sometimes sooner. In a very small number of cases, we are unable to verify the NHS number, and we do not make the test record available at all."
resource: "https://digital.nhs.uk/developer/api-catalogue/covid-19-test-results-fhir"
timestamp: "2024-04-23"
tags: "fhir, health-and-care, nhs-digital"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# COVID-19 Test Results - FHIR API

Use this API to access a patient’s coronavirus (COVID-19) test results history. You can: - get a patient's COVID-19 test history, based on their NHS number with an optional specific date rangeYou cannot currently use this API to: - get details of other types of testYou get the following data: - COVID-19 test event detailsData availability, timing and quality All test records are verified to ensure the NHS number is correct before making them available via the API. In most cases this is automatic, and the record is available within 48 hours of the test event, sometimes sooner. In a very small number of cases, we are unable to verify the NHS number, and we do not make the test record available at all.

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/covid-19-test-results-fhir
- Documentation: https://digital.nhs.uk/developer/api-catalogue/covid-19-test-results-fhir

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
