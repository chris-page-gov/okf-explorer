---
type: "API Product"
title: "BGS Sensor Data Service"
description: "This service provides an application programming interface (API) for data scientists, software developers and software applications to query and download BGS-hosted sensor data in machine-readable JSON format. The API is powered by FROST Server and conforms to the OGC SensorThings API specification (https://www.ogc.org/standards/sensorthings). See https://sensors.bgs.ac.uk/ for details, videos and code examples."
resource: "https://sensors.bgs.ac.uk/FROST-Server/v1.1"
timestamp: "2022-02-01"
tags: "bgs, geospatial, government-services, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# BGS Sensor Data Service

This service provides an application programming interface (API) for data scientists, software developers and software applications to query and download BGS-hosted sensor data in machine-readable JSON format. The API is powered by FROST Server and conforms to the OGC SensorThings API specification (https://www.ogc.org/standards/sensorthings). See https://sensors.bgs.ac.uk/ for details, videos and code examples.

## Metadata

- Type: API Product
- Provider: [BGS](../organisations/bgs.md)
- Canonical provider: BGS
- Source adapter: api_gov_uk_catalogue
- Source tier: declared_api_catalogue
- Confidence: declared
- Assurance status: declared
- Access model: unknown
- Contract status: documentation-only
- Licence: open government license (open-government-license)
- Licence basis: source-declared
- Licence source: Open Government License
- Licence confidence: 0.9
- Quality band: medium
- DCAT term: `dcat:DataService`
- OpenAPI term: `OpenAPI Object`

- Endpoint: https://sensors.bgs.ac.uk/FROST-Server/v1.1
- Documentation: https://sensors-docs.bgs.ac.uk/

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
