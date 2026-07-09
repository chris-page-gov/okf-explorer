---
type: "API Product"
title: "OS Linked Identifiers API"
description: "The OS Linked Identifiers API allows users to access the valuable relationships between properties, streets and OS MasterMap identifiers for free. An identifier is a unique reference assigned to a specific thing, so when you are talking to someone else you can use it to ensure you're talking about the same thing. They are used all the time, such as telephone numbers, postcodes and customer reference numbers. OS is striving to make its identifiers more accessible and useful for its customers. The OS Linked Identifiers API takes this further by enabling the linking together of datasets that are using different identifiers; for example, linking a property address (UPRN - Unique Property Reference Number) to the street that it is on (USRN - Unique Street Reference Number)."
resource: "https://api.os.uk/search/links/v1"
timestamp: "2020-08-24"
tags: "geospatial, ordnance-survey, planning-and-property, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# OS Linked Identifiers API

The OS Linked Identifiers API allows users to access the valuable relationships between properties, streets and OS MasterMap identifiers for free. An identifier is a unique reference assigned to a specific thing, so when you are talking to someone else you can use it to ensure you're talking about the same thing. They are used all the time, such as telephone numbers, postcodes and customer reference numbers. OS is striving to make its identifiers more accessible and useful for its customers. The OS Linked Identifiers API takes this further by enabling the linking together of datasets that are using different identifiers; for example, linking a property address (UPRN - Unique Property Reference Number) to the street that it is on (USRN - Unique Street Reference Number).

## Metadata

- Type: API Product
- Provider: [Ordnance Survey](../organisations/ordnance-survey.md)
- Canonical provider: Ordnance Survey
- Source adapter: api_gov_uk_catalogue
- Source tier: declared_api_catalogue
- Confidence: declared
- Assurance status: declared
- Access model: unknown
- Contract status: documentation-only
- Licence: osdatahub.os.uk (osdatahub-os-uk)
- Licence basis: source-declared
- Licence source: https://osdatahub.os.uk/legal/termsConditions
- Licence confidence: 0.9
- Quality band: medium
- DCAT term: `dcat:DataService`
- OpenAPI term: `OpenAPI Object`

- Endpoint: https://api.os.uk/search/links/v1
- Documentation: https://osdatahub.os.uk/docs/linkedIdentifiers/overview

## Standards Alignment

This generated record is standards-alignable, not standards-conformant by itself. DCAT-AP conformance needs an RDF export; OpenAPI conformance needs a complete `openapi` document.

- DCAT / DCAT-AP: `dcat:DataService`; export status `data-service-ready`.
- DCAT missing requirements: none recorded
- OpenAPI: `OpenAPI Object`; export status `service-stub-with-gaps`.
- OpenAPI security scheme: `unknown`.
- OpenAPI missing requirements: `components.securitySchemes`
- Crosswalk: [OKF Standards Crosswalk](../../docs/okf-standards-crosswalk.md)

## Credential Requirements

- unknown: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: GOV.UK API Catalogue CSV
- Source URL: https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv
