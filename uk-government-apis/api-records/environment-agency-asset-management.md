---
type: "API Product"
title: "Asset Management"
description: "The Environment Agency maintains records on assets of many types related to environmental activities particularly flood defences, including some assets owned or managed by other bodies. The API provides access to these asset description records along with information on maintenance activities planned for the assets. Only some assets have an associated maintenance schedule. In the API the maintenance information is split in to three different types. Maintenance activities represent funded and scheduled work. A single activity may involve several maintenance actions on several different assets. We divide the activities into separate tasks, where each task represents a specific maintenance action on a single asset. Finally maintenance plans represent intended maintenance activities for future financial years but which have not necessarily been scheduled or funded at this stage. The API allows all activities, tasks and plans to be listed for a particular asset, set of assets or across all assets. Please visit the [Defra Data Services Platform Support](https://environment.data.gov.uk/support) to let us know about any issues or to ask questions."
resource: "http://environment.data.gov.uk/asset-management"
timestamp: "2020-08-26"
tags: "environment, environment-agency, government-services, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Asset Management

The Environment Agency maintains records on assets of many types related to environmental activities particularly flood defences, including some assets owned or managed by other bodies. The API provides access to these asset description records along with information on maintenance activities planned for the assets. Only some assets have an associated maintenance schedule. In the API the maintenance information is split in to three different types. Maintenance activities represent funded and scheduled work. A single activity may involve several maintenance actions on several different assets. We divide the activities into separate tasks, where each task represents a specific maintenance action on a single asset. Finally maintenance plans represent intended maintenance activities for future financial years but which have not necessarily been scheduled or funded at this stage. The API allows all activities, tasks and plans to be listed for a particular asset, set of assets or across all assets. Please visit the [Defra Data Services Platform Support](https://environment.data.gov.uk/support) to let us know about any issues or to ask questions.

## Metadata

- Type: API Product
- Provider: [Environment Agency](../organisations/environment-agency.md)
- Canonical provider: Environment Agency
- Source adapter: api_gov_uk_catalogue
- Source tier: declared_api_catalogue
- Confidence: declared
- Assurance status: declared
- Access model: unknown
- Contract status: documentation-only
- Licence: Not specified (not-specified)
- Licence basis: not-specified
- Licence source: not-specified
- Licence confidence: 0.2
- Quality band: medium
- DCAT term: `dcat:DataService`
- OpenAPI term: `OpenAPI Object`

- Endpoint: http://environment.data.gov.uk/asset-management
- Documentation: https://environment.data.gov.uk/asset-management/doc/reference

## Standards Alignment

This generated record is standards-alignable, not standards-conformant by itself. DCAT-AP conformance needs an RDF export; OpenAPI conformance needs a complete `openapi` document.

- DCAT / DCAT-AP: `dcat:DataService`; export status `data-service-with-gaps`.
- DCAT missing requirements: `dcterms:license`
- OpenAPI: `OpenAPI Object`; export status `service-stub-with-gaps`.
- OpenAPI security scheme: `unknown`.
- OpenAPI missing requirements: `components.securitySchemes`, `info.license`
- Crosswalk: [OKF Standards Crosswalk](../../docs/okf-standards-crosswalk.md)

## Credential Requirements

- unknown: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: GOV.UK API Catalogue CSV
- Source URL: https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv
