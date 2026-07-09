---
type: "API Product"
title: "UK-AIR Sensor Observation Service"
description: "This is an [OGC](https://www.ogc.org/) standards based Sensor Observation Service interface to Defra's UK Air Information Resource (UK-AIR). The service supports the UK obligations to European air quality e-Reporting initiative and Defra Open Data policy. The SOS provides a machine readable access point for air pollution measurements funded by Defra, Scottish Government, Welsh Government and Department of the Environment Northern Ireland. The service implements [INSPIRE guidelines](https://inspire.ec.europa.eu/id/document/tg/download-sos). You can read more about the [European air quality e-Reporting initiative](http://www.eionet.europa.eu/aqportal) and the [OGC SOS 2.0 standard](https://www.ogc.org/standards/sos)."
resource: "https://uk-air.defra.gov.uk/sos-ukair/service?service=SOS&request=GetCapabilities"
timestamp: "2020-02-06"
tags: "defra, environment, geospatial, government-services, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# UK-AIR Sensor Observation Service

This is an [OGC](https://www.ogc.org/) standards based Sensor Observation Service interface to Defra's UK Air Information Resource (UK-AIR). The service supports the UK obligations to European air quality e-Reporting initiative and Defra Open Data policy. The SOS provides a machine readable access point for air pollution measurements funded by Defra, Scottish Government, Welsh Government and Department of the Environment Northern Ireland. The service implements [INSPIRE guidelines](https://inspire.ec.europa.eu/id/document/tg/download-sos). You can read more about the [European air quality e-Reporting initiative](http://www.eionet.europa.eu/aqportal) and the [OGC SOS 2.0 standard](https://www.ogc.org/standards/sos).

## Metadata

- Type: API Product
- Provider: [Defra](../organisations/defra.md)
- Canonical provider: Defra
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

- Endpoint: https://uk-air.defra.gov.uk/sos-ukair/service?service=SOS&request=GetCapabilities
- Documentation: https://uk-air.defra.gov.uk/data/about_sos

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
