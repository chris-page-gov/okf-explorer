---
type: "API Operation"
title: "Linked Identifier, Identifier Type Lookup Operation"
description: "Looks up linked identifiers when the input identifier type is known. Replace {identifierType} and {id} with the identifier type and identifier."
resource: "https://api.os.uk/search/links/v1/identifierTypes/{identifierType}/{id}"
timestamp: ""
tags: "geospatial, ordnance-survey, rest-http"
confidence: "declared"
source_adapter: "ordnance_survey_api_os_uk"
---

# Linked Identifier, Identifier Type Lookup Operation

Looks up linked identifiers when the input identifier type is known. Replace {identifierType} and {id} with the identifier type and identifier.

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

- Endpoint: https://api.os.uk/search/links/v1/identifierTypes/{identifierType}/{id}
- Documentation: https://osdatahub.os.uk/docs/linkedIdentifiers/overview

## Credential Requirements

- api_key: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: Ordnance Survey API link document
- Source URL: https://api.os.uk/search/links
