---
type: "API Product"
title: "Rainfall"
description: "The Environment Agency has approximately 1000 real-time rain gauges which are connected by telemetry. Measurements of the amount of precipitation (mm) are captured in Tipping Bucket Raingauges (TBR). The data reported here gives accumulated totals for each 15 min period. The data is typically transferred once or twice per day. The Rainfall API provides access to these rainfall measurements, and to information on the monitoring stations providing those measurements. It is compatible with (and integrated into) the API for water level/flow readings. Note that for information protection reasons the rainfall monitoring stations do not have names and their geographic location has been reduced to a 100m grid. These APIs are provided as open data under the Open Government Licence with no requirement for registration. If you make use of this data please acknowledge this with the following attribution statement: 'This uses Environment Agency rainfall data from the real-time data API (Beta)'. Please visit the [Defra Data Services Platform Support](https://environment.data.gov.uk/support) to let us know about any issues or to ask questions."
resource: "http://environment.data.gov.uk/flood-monitoring/id/stations?parameter=rainfall"
timestamp: "2020-08-26"
tags: "environment, environment-agency, government-services, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Rainfall

The Environment Agency has approximately 1000 real-time rain gauges which are connected by telemetry. Measurements of the amount of precipitation (mm) are captured in Tipping Bucket Raingauges (TBR). The data reported here gives accumulated totals for each 15 min period. The data is typically transferred once or twice per day. The Rainfall API provides access to these rainfall measurements, and to information on the monitoring stations providing those measurements. It is compatible with (and integrated into) the API for water level/flow readings. Note that for information protection reasons the rainfall monitoring stations do not have names and their geographic location has been reduced to a 100m grid. These APIs are provided as open data under the Open Government Licence with no requirement for registration. If you make use of this data please acknowledge this with the following attribution statement: 'This uses Environment Agency rainfall data from the real-time data API (Beta)'. Please visit the [Defra Data Services Platform Support](https://environment.data.gov.uk/support) to let us know about any issues or to ask questions.

## Metadata

- Type: API Product
- Provider: [Environment Agency](../organisations/environment-agency.md)
- Canonical provider: Environment Agency
- Source adapter: api_gov_uk_catalogue
- Source tier: declared_api_catalogue
- Confidence: declared
- Assurance status: declared
- Access model: anonymous
- Contract status: documentation-only
- Licence: Not specified (not-specified)
- Licence basis: not-specified
- Licence source: not-specified
- Licence confidence: 0.2
- Quality band: high
- DCAT term: `dcat:DataService`
- OpenAPI term: `OpenAPI Object`

- Endpoint: http://environment.data.gov.uk/flood-monitoring/id/stations?parameter=rainfall
- Documentation: http://environment.data.gov.uk/flood-monitoring/doc/rainfall

## Standards Alignment

This generated record is standards-alignable, not standards-conformant by itself. DCAT-AP conformance needs an RDF export; OpenAPI conformance needs a complete `openapi` document.

- DCAT / DCAT-AP: `dcat:DataService`; export status `data-service-with-gaps`.
- DCAT missing requirements: `dcterms:license`
- OpenAPI: `OpenAPI Object`; export status `service-stub-with-gaps`.
- OpenAPI security scheme: `none`.
- OpenAPI missing requirements: `info.license`
- Crosswalk: [OKF Standards Crosswalk](../../docs/okf-standards-crosswalk.md)

## Credential Requirements

- none: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: GOV.UK API Catalogue CSV
- Source URL: https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv
