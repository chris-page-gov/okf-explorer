---
type: "API Operation"
title: "OS Places API nearest Operation"
description: "Takes a pair of coordinates (X and Y) as an input to determine the closest address."
resource: "https://api.os.uk/search/places/v1/nearest"
timestamp: ""
tags: "geospatial, ordnance-survey, rest-http"
confidence: "declared"
source_adapter: "ordnance_survey_api_os_uk"
---

# OS Places API nearest Operation

Takes a pair of coordinates (X and Y) as an input to determine the closest address.

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

- Endpoint: https://api.os.uk/search/places/v1/nearest
- Documentation: https://osdatahub.os.uk/docs/places/overview

## Credential Requirements

- api_key: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: Ordnance Survey API link document
- Source URL: https://api.os.uk/search/places
