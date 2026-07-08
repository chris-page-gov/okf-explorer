---
type: "API Operation"
title: "OS Names API Nearest Operation"
description: "The nearest resource returns the closest address to a given point. This is done by using a pair of BNG coordinates (to two decimal places or less) as the input. The property will only be considered to be included by the search if the Address Seed is in range of the search, regardless of the property's physical boundaries."
resource: "https://api.os.uk/search/names/v1/nearest"
timestamp: ""
tags: "geospatial, ordnance-survey, rest-http"
confidence: "declared"
source_adapter: "ordnance_survey_api_os_uk"
---

# OS Names API Nearest Operation

The nearest resource returns the closest address to a given point. This is done by using a pair of BNG coordinates (to two decimal places or less) as the input. The property will only be considered to be included by the search if the Address Seed is in range of the search, regardless of the property's physical boundaries.

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

- Endpoint: https://api.os.uk/search/names/v1/nearest
- Documentation: https://osdatahub.os.uk/docs/names/overview

## Credential Requirements

- api_key: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: Ordnance Survey API link document
- Source URL: https://api.os.uk/search/names
