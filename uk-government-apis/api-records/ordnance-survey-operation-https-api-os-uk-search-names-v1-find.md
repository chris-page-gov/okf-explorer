---
type: "API Operation"
title: "OS Names API Find Operation"
description: "A free string text search of OS Names, intended to be an ambiguous/fuzzy search. Find can locate a feature using just its name."
resource: "https://api.os.uk/search/names/v1/find"
timestamp: ""
tags: "geospatial, ordnance-survey, rest-http"
confidence: "declared"
source_adapter: "ordnance_survey_api_os_uk"
---

# OS Names API Find Operation

A free string text search of OS Names, intended to be an ambiguous/fuzzy search. Find can locate a feature using just its name.

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

- Endpoint: https://api.os.uk/search/names/v1/find
- Documentation: https://osdatahub.os.uk/docs/names/overview

## Credential Requirements

- api_key: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: Ordnance Survey API link document
- Source URL: https://api.os.uk/search/names
