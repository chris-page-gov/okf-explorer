---
type: "API Operation"
title: "OS Places API radius Operation"
description: "Takes a pair of coordinates as the centre for a circle and returns all addresses that are intersected by it."
resource: "https://api.os.uk/search/places/v1/radius"
timestamp: ""
tags: "geospatial, ordnance-survey, rest-http"
confidence: "declared"
source_adapter: "ordnance_survey_api_os_uk"
---

# OS Places API radius Operation

Takes a pair of coordinates as the centre for a circle and returns all addresses that are intersected by it.

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

- Endpoint: https://api.os.uk/search/places/v1/radius
- Documentation: https://osdatahub.os.uk/docs/places/overview

## Credential Requirements

- api_key: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: Ordnance Survey API link document
- Source URL: https://api.os.uk/search/places
