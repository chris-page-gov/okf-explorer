---
type: "API Product"
title: "Directory of support services"
description: "The Southampton directory API is an Open Referral UK standard API of support services relevant to the city of Southampton, including adult social care, early years and childcare and SEND local offer services."
resource: "https://directory.southampton.gov.uk/api/services"
timestamp: "2023-02-20"
tags: "health-and-care, rest-http, scc"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Directory of support services

The Southampton directory API is an Open Referral UK standard API of support services relevant to the city of Southampton, including adult social care, early years and childcare and SEND local offer services.

## Metadata

- Type: API Product
- Provider: [Scc](../organisations/scc.md)
- Canonical provider: Scc
- Source adapter: api_gov_uk_catalogue
- Source tier: declared_api_catalogue
- Confidence: declared
- Assurance status: declared
- Access model: unknown
- Contract status: undocumented-in-catalogue
- Licence: Not specified (not-specified)
- Licence basis: not-specified
- Licence source: not-specified
- Licence confidence: 0.2
- Quality band: medium
- DCAT term: `dcat:DataService`
- OpenAPI term: `OpenAPI Object`

- Endpoint: https://directory.southampton.gov.uk/api/services

## Standards Alignment

This generated record is standards-alignable, not standards-conformant by itself. DCAT-AP conformance needs an RDF export; OpenAPI conformance needs a complete `openapi` document.

- DCAT / DCAT-AP: `dcat:DataService`; export status `data-service-with-gaps`.
- DCAT missing requirements: `dcat:endpointDescription`, `dcterms:license`
- OpenAPI: `OpenAPI Object`; export status `service-stub-with-gaps`.
- OpenAPI security scheme: `unknown`.
- OpenAPI missing requirements: `components.securitySchemes`, `externalDocs.url`, `info.license`
- Crosswalk: [OKF Standards Crosswalk](../../docs/okf-standards-crosswalk.md)

## Credential Requirements

- unknown: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: GOV.UK API Catalogue CSV
- Source URL: https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv
