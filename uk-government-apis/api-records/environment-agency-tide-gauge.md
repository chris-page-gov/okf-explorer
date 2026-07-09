---
type: "API Product"
title: "Tide Gauge"
description: "The UK National Tide Gauge Network is owned and operated by the Environment Agency on behalf of the UK Coastal Flood Forecasting service (a partnership between the Environment Agency, Natural Resources Wales, the Scottish Environment Protection Agency and Northern Ireland Department for Infrastructure - Rivers). It records tidal elevations at 44 locations around the UK coast. Data is made available in near real-time with measurements reported every 15 mins. The measurements provide mean sea level within each 15 min window and are reported both relative to local datum (unit m) and relative to the Ordnance Datum at Newlyn (unit mAOD). The Tide Gauge API provides access to these measurements, and to information on the monitoring stations providing those measurements. It is compatible with (and integrated into) the API for water level/flow and rainfall readings. The API data is normally updated every 15 mins so typically the latest available reading will lag between 15 and 30 mins. Note that all times given by the API are in GMT (also known as UTC), as indicated by the Z suffix (see XML Schema datatypes). These APIs are provided as open data under the Open Government Licence with no r…"
resource: "http://environment.data.gov.uk/flood-monitoring/id/stations?type=TideGauge"
timestamp: "2020-08-26"
tags: "environment, environment-agency, geospatial, government-services, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Tide Gauge

The UK National Tide Gauge Network is owned and operated by the Environment Agency on behalf of the UK Coastal Flood Forecasting service (a partnership between the Environment Agency, Natural Resources Wales, the Scottish Environment Protection Agency and Northern Ireland Department for Infrastructure - Rivers). It records tidal elevations at 44 locations around the UK coast. Data is made available in near real-time with measurements reported every 15 mins. The measurements provide mean sea level within each 15 min window and are reported both relative to local datum (unit m) and relative to the Ordnance Datum at Newlyn (unit mAOD). The Tide Gauge API provides access to these measurements, and to information on the monitoring stations providing those measurements. It is compatible with (and integrated into) the API for water level/flow and rainfall readings. The API data is normally updated every 15 mins so typically the latest available reading will lag between 15 and 30 mins. Note that all times given by the API are in GMT (also known as UTC), as indicated by the Z suffix (see XML Schema datatypes). These APIs are provided as open data under the Open Government Licence with no r…

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

- Endpoint: http://environment.data.gov.uk/flood-monitoring/id/stations?type=TideGauge
- Documentation: http://environment.data.gov.uk/flood-monitoring/doc/tidegauge

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
