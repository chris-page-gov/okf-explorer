---
type: "API Product"
title: "Subscription Service API"
description: "ECNS subscription API allows other government departments and organisations to register or de-register subscriptions to citizen updates."
resource: ""
timestamp: "2023-05-16"
tags: "department-for-work-and-pensions, government-services, planning-and-property, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Subscription Service API

ECNS subscription API allows other government departments and organisations to register or de-register subscriptions to citizen updates.

## Metadata

- Type: API Product
- Provider: [Department for Work And Pensions](../organisations/department-for-work-and-pensions.md)
- Canonical provider: Department for Work And Pensions
- Source adapter: api_gov_uk_catalogue
- Source tier: declared_api_catalogue
- Confidence: declared
- Assurance status: declared
- Access model: approval-required
- Contract status: undocumented-in-catalogue
- Licence: isc (isc)
- Licence basis: source-declared
- Licence source: ISC
- Licence confidence: 0.9
- Quality band: medium
- DCAT term: `dcat:DataService`
- OpenAPI term: `OpenAPI Object`


## Standards Alignment

This generated record is standards-alignable, not standards-conformant by itself. DCAT-AP conformance needs an RDF export; OpenAPI conformance needs a complete `openapi` document.

- DCAT / DCAT-AP: `dcat:DataService`; export status `data-service-with-gaps`.
- DCAT missing requirements: `dcat:endpointDescription`, `dcat:endpointURL`
- OpenAPI: `OpenAPI Object`; export status `service-stub-with-gaps`.
- OpenAPI security scheme: `metadata-only`.
- OpenAPI missing requirements: `externalDocs.url`, `servers[].url`
- Crosswalk: [OKF Standards Crosswalk](../../docs/okf-standards-crosswalk.md)

## Credential Requirements

- approval_required: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: GOV.UK API Catalogue CSV
- Source URL: https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv
