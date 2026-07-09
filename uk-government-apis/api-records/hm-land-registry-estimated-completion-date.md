---
type: "API Product"
title: "Estimated Completion Date"
description: "Overview The Estimated Completion Date (ECD) is a date by which the application is likely to be completed. It is not based on the individual application but is an estimate of when the majority (90%) of that application type will be completed. In order to retain parity with our Portal customer experience, we require that anyone integrating with this service refer to the estimated completion timeframes which can be found at https://www.gov.uk/guidance/hm-land-registry-estimated-completion-timeframes. We also see benefit in end users being familiar with the above URL, the insights provided are likely to reduce the need for customer contact. Therefore we also ask that you make your customers aware of the above URL. The ECD: Is calculated on and from the day an application is received by HMLR. May take up to an hour to be displayed after application submission. Is updated every 30 calendar days until the application is completed or cancelled. Is updated if HMLR correspondence is issued (first item of correspondence only). For test endpoint, replace https://businessgateway.landregistry.gov.uk/bg2 with https://bgtest.landregistry.gov.uk/bg2test"
resource: "https://businessgateway.landregistry.gov.uk/bg2/api/v1/applications/{application_reference}/estimate-completion-date"
timestamp: "2023-10-12"
tags: "government-services, hm-land-registry, planning-and-property, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Estimated Completion Date

Overview The Estimated Completion Date (ECD) is a date by which the application is likely to be completed. It is not based on the individual application but is an estimate of when the majority (90%) of that application type will be completed. In order to retain parity with our Portal customer experience, we require that anyone integrating with this service refer to the estimated completion timeframes which can be found at https://www.gov.uk/guidance/hm-land-registry-estimated-completion-timeframes. We also see benefit in end users being familiar with the above URL, the insights provided are likely to reduce the need for customer contact. Therefore we also ask that you make your customers aware of the above URL. The ECD: Is calculated on and from the day an application is received by HMLR. May take up to an hour to be displayed after application submission. Is updated every 30 calendar days until the application is completed or cancelled. Is updated if HMLR correspondence is issued (first item of correspondence only). For test endpoint, replace https://businessgateway.landregistry.gov.uk/bg2 with https://bgtest.landregistry.gov.uk/bg2test

## Metadata

- Type: API Product
- Provider: [HM Land Registry](../organisations/hm-land-registry.md)
- Canonical provider: HM Land Registry
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

- Endpoint: https://businessgateway.landregistry.gov.uk/bg2/api/v1/applications/{application_reference}/estimate-completion-date
- Documentation: https://landregistry.github.io/bgtechdoc/services/estimated_completion_date/

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
