---
type: "API Operation"
title: "Linked Identifier Current Product Version Info Lookup Operation"
description: "This service is available as a GET resource method allowing you to discover the current product version information. Replace {correlationMethod} with a correlation method from the correlation method table found in the Technical Specification."
resource: "https://api.os.uk/search/links/v1/productVersionInfo/{correlationMethod}"
timestamp: ""
tags: "geospatial, ordnance-survey, rest-http"
confidence: "declared"
source_adapter: "ordnance_survey_api_os_uk"
---

# Linked Identifier Current Product Version Info Lookup Operation

This service is available as a GET resource method allowing you to discover the current product version information. Replace {correlationMethod} with a correlation method from the correlation method table found in the Technical Specification.

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

- Endpoint: https://api.os.uk/search/links/v1/productVersionInfo/{correlationMethod}
- Documentation: https://osdatahub.os.uk/docs/linkedIdentifiers/overview

## Credential Requirements

- api_key: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: Ordnance Survey API link document
- Source URL: https://api.os.uk/search/links
