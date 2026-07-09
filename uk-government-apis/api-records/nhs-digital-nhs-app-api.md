---
type: "API Product"
title: "NHS App API"
description: "Use this API to engage with users of the NHS App - a simple and secure way for patients registered with a GP surgery in England to access a range of services on their smartphone or tablet. You can: - send in-app messages to specific users of the NHS App- include keyword replies to in-app messages- include free text replies to in-app messages- send native Apple or Android push notifications to mobile devices registered by specific users of the NHS App"
resource: "https://digital.nhs.uk/developer/api-catalogue/nhs-app"
timestamp: "2024-04-23"
tags: "health-and-care, nhs-digital, streaming"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# NHS App API

Use this API to engage with users of the NHS App - a simple and secure way for patients registered with a GP surgery in England to access a range of services on their smartphone or tablet. You can: - send in-app messages to specific users of the NHS App- include keyword replies to in-app messages- include free text replies to in-app messages- send native Apple or Android push notifications to mobile devices registered by specific users of the NHS App

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/nhs-app
- Documentation: https://digital.nhs.uk/developer/api-catalogue/nhs-app

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
