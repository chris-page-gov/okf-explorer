---
type: "API Product"
title: "OS Features API"
description: "Buildings, roads, greenspaces and much more. Get direct access to the most detailed geographic data for your analysis, taking full advantage of rich geometries and attributes to generate new insight. No need to download, store and manage large and complex datasets - we take care of that so you can focus on adding value."
resource: "https://api.os.uk/features/v1"
timestamp: "2020-08-24"
tags: "geospatial, health-and-care, ordnance-survey, wfs"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# OS Features API

Buildings, roads, greenspaces and much more. Get direct access to the most detailed geographic data for your analysis, taking full advantage of rich geometries and attributes to generate new insight. No need to download, store and manage large and complex datasets - we take care of that so you can focus on adding value.

## Metadata

- Type: API Product
- Provider: [Ordnance Survey](../organisations/ordnance-survey.md)
- Canonical provider: Ordnance Survey
- Source adapter: api_gov_uk_catalogue
- Source tier: declared_api_catalogue
- Confidence: declared
- Assurance status: declared
- Access model: unknown
- Contract status: documentation-only
- Licence: osdatahub.os.uk (osdatahub-os-uk)
- Licence basis: source-declared
- Licence source: https://osdatahub.os.uk/legal/termsConditions
- Licence confidence: 0.9
- Quality band: medium
- DCAT term: `dcat:DataService`
- OpenAPI term: `OpenAPI Object`

- Endpoint: https://api.os.uk/features/v1
- Documentation: https://osdatahub.os.uk/docs/wfs/overview

## Standards Alignment

This generated record is standards-alignable, not standards-conformant by itself. DCAT-AP conformance needs an RDF export; OpenAPI conformance needs a complete `openapi` document.

- DCAT / DCAT-AP: `dcat:DataService`; export status `data-service-ready`.
- DCAT missing requirements: none recorded
- OpenAPI: `OpenAPI Object`; export status `service-stub-with-gaps`.
- OpenAPI security scheme: `unknown`.
- OpenAPI missing requirements: `components.securitySchemes`
- Crosswalk: [OKF Standards Crosswalk](../../docs/okf-standards-crosswalk.md)

## Credential Requirements

- unknown: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: GOV.UK API Catalogue CSV
- Source URL: https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv
