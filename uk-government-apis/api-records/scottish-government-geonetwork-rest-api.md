---
type: "API Product"
title: "GeoNetwork REST API"
description: "The Scottish Spatial Data Infrastructure API endpoint allows access to all the functionality of the Geonetwork metadata catalog. Whilst some functionality is limited to authenticated users and administrators only, published metadata records can be returned using the `records` endpoint and the record UUID, for example `https://spatialdata.gov.scot/geonetwork/srv/api/records/{uuid}`."
resource: "https://spatialdata.gov.scot/geonetwork/srv/api"
timestamp: "2020-11-12"
tags: "public-administration, rest-http, scottish-government"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# GeoNetwork REST API

The Scottish Spatial Data Infrastructure API endpoint allows access to all the functionality of the Geonetwork metadata catalog. Whilst some functionality is limited to authenticated users and administrators only, published metadata records can be returned using the `records` endpoint and the record UUID, for example `https://spatialdata.gov.scot/geonetwork/srv/api/records/{uuid}`.

## Metadata

- Type: API Product
- Provider: [Scottish Government](../organisations/scottish-government.md)
- Canonical provider: Scottish Government
- Source adapter: api_gov_uk_catalogue
- Source tier: declared_api_catalogue
- Confidence: declared
- Assurance status: declared
- Access model: unknown
- Contract status: documentation-only
- Quality band: medium

- Endpoint: https://spatialdata.gov.scot/geonetwork/srv/api
- Documentation: https://spatialdata.gov.scot/geonetwork/doc/api

## Credential Requirements

- unknown: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: GOV.UK API Catalogue CSV
- Source URL: https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv
