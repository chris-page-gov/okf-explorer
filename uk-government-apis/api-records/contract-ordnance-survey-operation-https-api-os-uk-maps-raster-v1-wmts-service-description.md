---
type: "Capability Document"
title: "OS Maps API - WMTS contract"
description: "Machine-readable or service-description contract inferred for OS Maps API - WMTS from public metadata."
resource: "https://osdatahub.os.uk/docs/wmts/overview"
timestamp: ""
tags: "geospatial, ordnance-survey, wmts"
confidence: "observed"
source_adapter: "contract_discovery"
---

# OS Maps API - WMTS contract

Machine-readable or service-description contract inferred for OS Maps API - WMTS from public metadata.

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
- DCAT term: `dcterms:Standard`
- OpenAPI term: `OpenAPI Description or external contract`

- Endpoint: https://osdatahub.os.uk/docs/wmts/overview
- Documentation: https://osdatahub.os.uk/docs/wmts/overview

## Standards Alignment

This generated record is standards-alignable, not standards-conformant by itself. DCAT-AP conformance needs an RDF export; OpenAPI conformance needs a complete `openapi` document.

- DCAT / DCAT-AP: `dcterms:Standard`; export status `contract-reference`.
- DCAT missing requirements: none recorded
- OpenAPI: `OpenAPI Description or external contract`; export status `contract-reference`.
- OpenAPI security scheme: `apiKey`.
- OpenAPI missing requirements: none recorded
- Crosswalk: [OKF Standards Crosswalk](../../docs/okf-standards-crosswalk.md)

## Credential Requirements

- api_key: secret value stored in OKF = False

## Provenance

- Source: Contract discovery from harvested API metadata
- Source URL: https://api.os.uk/maps/raster
