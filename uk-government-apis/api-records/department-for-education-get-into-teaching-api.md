---
type: "API Product"
title: "Get into Teaching API"
description: "Provides a RESTful API for integrating with the Get into Teaching CRM."
resource: ""
timestamp: "2020-08-24"
tags: "department-for-education, education-and-skills, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Get into Teaching API

Provides a RESTful API for integrating with the Get into Teaching CRM.

## Metadata

- Type: API Product
- Provider: [Department for Education](../organisations/department-for-education.md)
- Canonical provider: Department for Education
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

- Documentation: https://github.com/DFE-Digital/get-into-teaching-api

## Standards Alignment

This generated record is standards-alignable, not standards-conformant by itself. DCAT-AP conformance needs an RDF export; OpenAPI conformance needs a complete `openapi` document.

- DCAT / DCAT-AP: `dcat:DataService`; export status `data-service-with-gaps`.
- DCAT missing requirements: `dcat:endpointURL`, `dcterms:license`
- OpenAPI: `OpenAPI Object`; export status `service-stub-with-gaps`.
- OpenAPI security scheme: `unknown`.
- OpenAPI missing requirements: `components.securitySchemes`, `info.license`, `servers[].url`
- Crosswalk: [OKF Standards Crosswalk](../../docs/okf-standards-crosswalk.md)

## Credential Requirements

- unknown: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: GOV.UK API Catalogue CSV
- Source URL: https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv
