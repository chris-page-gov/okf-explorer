---
type: "Capability Document"
title: "NatureScot Protected Areas WFS contract"
description: "Machine-readable or service-description contract inferred for NatureScot Protected Areas WFS from public metadata."
resource: "https://www.data.gov.uk/dataset/naturescot-protected-areas-wfs"
timestamp: "2025-10-04T10:03:59.670230"
tags: "geospatial, government-services, scottish-government-spatial-data-infrastructure, wms"
confidence: "observed"
source_adapter: "contract_discovery"
---

# NatureScot Protected Areas WFS contract

Machine-readable or service-description contract inferred for NatureScot Protected Areas WFS from public metadata.

## Metadata

- Type: Capability Document
- Provider: [Scottish Government SpatialData.gov.scot](../organisations/scottish-government-spatial-data-infrastructure.md)
- Canonical provider: Scottish Government Spatial Data Infrastructure
- Source adapter: contract_discovery
- Source tier: contract_discovery
- Confidence: observed
- Assurance status: observed
- Access model: anonymous
- Contract status: capability-document
- Licence: Not specified (not-specified)
- Licence basis: not-specified
- Licence source: not-specified
- Licence confidence: 0.2
- Quality band: high
- DCAT term: `dcterms:Standard`
- OpenAPI term: `OpenAPI Description or external contract`

- Endpoint: https://www.data.gov.uk/dataset/naturescot-protected-areas-wfs
- Documentation: https://www.data.gov.uk/dataset/naturescot-protected-areas-wfs

## Standards Alignment

This generated record is standards-alignable, not standards-conformant by itself. DCAT-AP conformance needs an RDF export; OpenAPI conformance needs a complete `openapi` document.

- DCAT / DCAT-AP: `dcterms:Standard`; export status `contract-reference`.
- DCAT missing requirements: `dcterms:license`
- OpenAPI: `OpenAPI Description or external contract`; export status `contract-reference`.
- OpenAPI security scheme: `none`.
- OpenAPI missing requirements: `info.license`
- Crosswalk: [OKF Standards Crosswalk](../../docs/okf-standards-crosswalk.md)

## Credential Requirements

- none: secret value stored in OKF = False

## Provenance

- Source: Contract discovery from harvested API metadata
- Source URL: https://ckan.publishing.service.gov.uk/api/3/action/package_search?fq=res_format:("WMS" OR "WFS" OR "WMTS" OR "WCS" OR "OGC API - Features" OR "OGC WFS" OR "OGC WMS" OR "ogc wfs" OR "ogc wms" OR "ArcGIS GeoServices REST API" OR "arcgis geoservices rest api" OR "Esri REST" OR "ESRI REST API" OR "ESRI Rest API" OR "esri rest api" OR "SPARQL" OR "API" OR "api")
