---
type: "API Product"
title: "HMPPS Auth"
description: "The service provides access to HMPPS internal services."
resource: "https://sign-in.hmpps.service.justice.gov.uk/auth"
timestamp: "2023-02-20"
tags: "government-services, justice-and-policing, ministry-of-justice, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# HMPPS Auth

The service provides access to HMPPS internal services.

## Metadata

- Type: API Product
- Provider: [Ministry of Justice](../organisations/ministry-of-justice.md)
- Canonical provider: Ministry of Justice
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

- Endpoint: https://sign-in.hmpps.service.justice.gov.uk/auth
- Documentation: https://github.com/ministryofjustice/hmpps-auth

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
