---
type: "API Product"
title: "Services"
description: "Use this API to search for community and volunteer-run services in Buckinghamshire. It is a partial implementation of the [Open Referral UK](https://openreferraluk.org/) standard for human services data."
resource: "https://api.familyinfo.buckinghamshire.gov.uk/api/v1/services"
timestamp: "2021-03-09"
tags: "buckinghamshire-council, government-services, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Services

Use this API to search for community and volunteer-run services in Buckinghamshire. It is a partial implementation of the [Open Referral UK](https://openreferraluk.org/) standard for human services data.

## Metadata

- Type: API Product
- Provider: [Buckinghamshire Council](../organisations/buckinghamshire-council.md)
- Canonical provider: Buckinghamshire Council
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

- Endpoint: https://api.familyinfo.buckinghamshire.gov.uk/api/v1/services
- Documentation: https://github.com/wearefuturegov/outpost-api-service/wiki

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
