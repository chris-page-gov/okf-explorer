---
type: "Capability Document"
title: "OS Maps API contract"
description: "Machine-readable or service-description contract inferred for OS Maps API from public metadata."
resource: "https://osdatahub.os.uk/docs/wmts/overview"
timestamp: ""
tags: "geospatial, ordnance-survey, wmts"
confidence: "observed"
source_adapter: "contract_discovery"
---

# OS Maps API contract

Machine-readable or service-description contract inferred for OS Maps API from public metadata.

## Metadata

- Type: Capability Document
- Provider: [Ordnance Survey](../organisations/ordnance-survey.md)
- Canonical provider: Ordnance Survey
- Source adapter: contract_discovery
- Source tier: contract_discovery
- Confidence: observed
- Assurance status: declared
- Access model: api-key
- Contract status: service-description
- Licence: Ordnance Survey licence required (ordnance-survey-licence-required)
- Licence basis: source-declared
- Licence source: https://www.ordnancesurvey.co.uk/licensing
- Licence confidence: 0.9
- Quality band: medium

- Endpoint: https://osdatahub.os.uk/docs/wmts/overview
- Documentation: https://osdatahub.os.uk/docs/wmts/overview

## Credential Requirements

- api_key: secret value stored in OKF = False

## Provenance

- Source: Contract discovery from harvested API metadata
- Source URL: https://api.os.uk/maps/raster
