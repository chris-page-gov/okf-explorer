---
type: "API Product"
title: "National Data Opt-out - FHIR API"
description: "Use this API to capture patients' preferences and control sharing of their data by healthcare organisations for planning and research purposes using National Data Opt-out (NDOP). You can:- create National Data Opt-out preferences for a patient- update the National Data Opt-out preferences for a patient- display transaction history of National Data Opt-out preferences for a patientYou cannot currently:- get existing National Data Opt-out preferences for a patientUse the Check for National Data Opt-outs Service (POS) to get existing National Data Opt-out preferences for one or more patients. If your use case is not met by the POS service, please contact us."
resource: "https://digital.nhs.uk/developer/api-catalogue/national-data-opt-out-fhir"
timestamp: "2024-04-23"
tags: "fhir, government-services, health-and-care, nhs-digital, planning-and-property"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# National Data Opt-out - FHIR API

Use this API to capture patients' preferences and control sharing of their data by healthcare organisations for planning and research purposes using National Data Opt-out (NDOP). You can:- create National Data Opt-out preferences for a patient- update the National Data Opt-out preferences for a patient- display transaction history of National Data Opt-out preferences for a patientYou cannot currently:- get existing National Data Opt-out preferences for a patientUse the Check for National Data Opt-outs Service (POS) to get existing National Data Opt-out preferences for one or more patients. If your use case is not met by the POS service, please contact us.

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/national-data-opt-out-fhir
- Documentation: https://digital.nhs.uk/developer/api-catalogue/national-data-opt-out-fhir

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
