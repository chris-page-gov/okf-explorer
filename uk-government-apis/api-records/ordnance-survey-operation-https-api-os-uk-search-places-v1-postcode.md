---
type: "API Operation"
title: "OS Places API postcode Operation"
description: "A search based on a property's postcode. The minimum for the resource is the area and district e.g. SO16, and will accept a full postcode consisting of the area, district, sector and unit e.g. SO16 0AS ."
resource: "https://api.os.uk/search/places/v1/postcode"
timestamp: ""
tags: "geospatial, ordnance-survey, rest-http"
confidence: "declared"
source_adapter: "ordnance_survey_api_os_uk"
---

# OS Places API postcode Operation

A search based on a property's postcode. The minimum for the resource is the area and district e.g. SO16, and will accept a full postcode consisting of the area, district, sector and unit e.g. SO16 0AS .

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
- Quality band: medium

- Endpoint: https://api.os.uk/search/places/v1/postcode
- Documentation: https://osdatahub.os.uk/docs/places/overview

## Credential Requirements

- api_key: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: Ordnance Survey API link document
- Source URL: https://api.os.uk/search/places
