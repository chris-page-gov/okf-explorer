---
type: "API Product"
title: "OS Vector Tile API"
description: "OS Vector Tile API is a vector tile service providing detailed Ordnance Survey data as a customisable basemap. It can be used with most web mapping libraries including Mapbox GL JS, Leaflet, OpenLayers and ArcGIS API for JavaScript."
resource: "https://api.os.uk/maps/vector/v1"
timestamp: ""
tags: "geospatial, ordnance-survey, rest-http"
confidence: "declared"
source_adapter: "ordnance_survey_api_os_uk"
---

# OS Vector Tile API

OS Vector Tile API is a vector tile service providing detailed Ordnance Survey data as a customisable basemap. It can be used with most web mapping libraries including Mapbox GL JS, Leaflet, OpenLayers and ArcGIS API for JavaScript.

## Metadata

- Type: API Product
- Provider: [Ordnance Survey](../organisations/ordnance-survey.md)
- Canonical provider: Ordnance Survey
- Source adapter: ordnance_survey_api_os_uk
- Source tier: provider_native_api
- Confidence: declared
- Assurance status: assured
- Access model: api-key
- Contract status: service-description
- Licence: Ordnance Survey licence required (ordnance-survey-licence-required)
- Licence basis: provider-terms-inferred
- Licence source: https://www.ordnancesurvey.co.uk/licensing
- Licence confidence: 0.7
- Quality band: medium
- DCAT term: `dcat:DataService`
- OpenAPI term: `OpenAPI Object`

- Endpoint: https://api.os.uk/maps/vector/v1
- Documentation: https://osdatahub.os.uk/docs/vts/overview

## Standards Alignment

This generated record is standards-alignable, not standards-conformant by itself. DCAT-AP conformance needs an RDF export; OpenAPI conformance needs a complete `openapi` document.

- DCAT / DCAT-AP: `dcat:DataService`; export status `data-service-ready`.
- DCAT missing requirements: none recorded
- OpenAPI: `OpenAPI Object`; export status `service-stub-ready`.
- OpenAPI security scheme: `apiKey`.
- OpenAPI missing requirements: none recorded
- Crosswalk: [OKF Standards Crosswalk](../../docs/okf-standards-crosswalk.md)

## Credential Requirements

- api_key: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: Ordnance Survey API link document
- Source URL: https://api.os.uk/maps/vector/v1
