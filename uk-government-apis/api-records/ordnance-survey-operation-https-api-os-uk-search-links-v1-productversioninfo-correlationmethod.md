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
- Licence: Ordnance Survey licence required (ordnance-survey-licence-required)
- Licence basis: provider-terms-inferred
- Licence source: https://www.ordnancesurvey.co.uk/licensing
- Licence confidence: 0.7
- Quality band: medium
- DCAT term: `dcat:DataService endpoint`
- OpenAPI term: `Operation Object`

- Endpoint: https://api.os.uk/search/links/v1/productVersionInfo/{correlationMethod}
- Documentation: https://osdatahub.os.uk/docs/linkedIdentifiers/overview

## Standards Alignment

This generated record is standards-alignable, not standards-conformant by itself. DCAT-AP conformance needs an RDF export; OpenAPI conformance needs a complete `openapi` document.

- DCAT / DCAT-AP: `dcat:DataService endpoint`; export status `roll-up-to-parent-service`.
- DCAT missing requirements: none recorded
- OpenAPI: `Operation Object`; export status `operation-fragment`.
- OpenAPI security scheme: `apiKey`.
- OpenAPI missing requirements: `HTTP method`, `parameters`, `responses`
- Crosswalk: [OKF Standards Crosswalk](../../docs/okf-standards-crosswalk.md)

## Credential Requirements

- api_key: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: Ordnance Survey API link document
- Source URL: https://api.os.uk/search/links
