---
type: "API Product"
title: "OS Names API"
description: "A free, searchable, reliable database to help you find and verify populated places, road names, road numbers and postcodes. OS Names API is a reliable way of supporting the discovery or identification and visualisation of a named place; geocoding; routing and navigation, and linking diverse information such as statistics or descriptions. OS Names can locate a feature using just its name, or it can find the closest location to a given point."
resource: "https://api.os.uk/search/names/v1"
timestamp: "2020-08-24"
tags: "geospatial, ordnance-survey, population-and-statistics, rest-http, transport"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# OS Names API

A free, searchable, reliable database to help you find and verify populated places, road names, road numbers and postcodes. OS Names API is a reliable way of supporting the discovery or identification and visualisation of a named place; geocoding; routing and navigation, and linking diverse information such as statistics or descriptions. OS Names can locate a feature using just its name, or it can find the closest location to a given point.

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

- Endpoint: https://api.os.uk/search/names/v1
- Documentation: https://osdatahub.os.uk/docs/names/overview

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
