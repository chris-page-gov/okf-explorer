---
type: "API Operation"
title: "ONS Beta API: List dataset editions"
description: "Template operation for the ONS Beta API: List dataset editions."
resource: "https://api.beta.ons.gov.uk/v1/datasets/{dataset_id}/editions"
timestamp: ""
tags: "office-for-national-statistics, population-and-statistics, rest-http"
confidence: "declared"
source_adapter: "ons_beta_api"
---

# ONS Beta API: List dataset editions

Template operation for the ONS Beta API: List dataset editions.

## Metadata

- Type: API Operation
- Provider: [Office for National Statistics](../organisations/office-for-national-statistics.md)
- Canonical provider: Office For National Statistics
- Source adapter: ons_beta_api
- Source tier: provider_native_api
- Confidence: declared
- Assurance status: assured
- Access model: anonymous
- Contract status: service-description
- Licence: Open Government Licence v3.0 (open-government-licence-v3)
- Licence basis: provider-terms-inferred
- Licence source: https://www.ons.gov.uk/help/terms-conditions#using-ons-content
- Licence confidence: 0.75
- Quality band: medium
- DCAT term: `dcat:DataService endpoint`
- OpenAPI term: `Operation Object`

- Endpoint: https://api.beta.ons.gov.uk/v1/datasets/{dataset_id}/editions
- Documentation: https://developer.ons.gov.uk/

## Standards Alignment

This generated record is standards-alignable, not standards-conformant by itself. DCAT-AP conformance needs an RDF export; OpenAPI conformance needs a complete `openapi` document.

- DCAT / DCAT-AP: `dcat:DataService endpoint`; export status `roll-up-to-parent-service`.
- DCAT missing requirements: none recorded
- OpenAPI: `Operation Object`; export status `operation-fragment`.
- OpenAPI security scheme: `none`.
- OpenAPI missing requirements: `HTTP method`, `parameters`, `responses`
- Crosswalk: [OKF Standards Crosswalk](../../docs/okf-standards-crosswalk.md)

## Credential Requirements

- none: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: ONS Beta API
- Source URL: https://api.beta.ons.gov.uk/v1
