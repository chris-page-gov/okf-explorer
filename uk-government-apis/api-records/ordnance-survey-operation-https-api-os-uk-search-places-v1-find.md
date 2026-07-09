---
type: "API Operation"
title: "OS Places API Find Operation"
description: "A free text search designed for quick use."
resource: "https://api.os.uk/search/places/v1/find"
timestamp: ""
tags: "geospatial, ordnance-survey, rest-http"
confidence: "declared"
source_adapter: "ordnance_survey_api_os_uk"
---

# OS Places API Find Operation

A free text search designed for quick use.

## Metadata

- Type: API Operation
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
- DCAT term: `dcat:DataService endpoint`
- OpenAPI term: `Operation Object`

- Endpoint: https://api.os.uk/search/places/v1/find
- Documentation: https://osdatahub.os.uk/docs/places/overview

## Standards Alignment

This generated record is standards-alignable, not standards-conformant by itself. DCAT-AP conformance needs an RDF export; OpenAPI conformance needs a complete `openapi` document.

- DCAT / DCAT-AP: `dcat:DataService endpoint`; export status `roll-up-to-parent-service`.
- DCAT missing requirements: none recorded
- OpenAPI: `Operation Object`; export status `operation-fragment`.
- OpenAPI security scheme: `apiKey`.
- OpenAPI missing requirements: `HTTP method`, `parameters`, `responses`
- Crosswalk: [OKF Standards Crosswalk](../../docs/okf-standards-crosswalk.md)

## Credential Requirements

- api_key: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: Ordnance Survey API link document
- Source URL: https://api.os.uk/search/places
