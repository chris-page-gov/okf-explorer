---
type: "Capability Document"
title: "INSPIRE OGC WFS service contract"
description: "Machine-readable or service-description contract inferred for INSPIRE OGC WFS service from public metadata."
resource: "https://www.data.gov.uk/dataset/ddc-inspire-ogc-wfs-service4"
timestamp: "2015-05-20T10:00:11.105860"
tags: "daventry-district-council, geospatial, government-services, wfs"
confidence: "observed"
source_adapter: "contract_discovery"
---

# INSPIRE OGC WFS service contract

Machine-readable or service-description contract inferred for INSPIRE OGC WFS service from public metadata.

## Metadata

- Type: Capability Document
- Provider: [Daventry District Council](../organisations/daventry-district-council.md)
- Canonical provider: Daventry District Council
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

- Endpoint: https://www.data.gov.uk/dataset/ddc-inspire-ogc-wfs-service4
- Documentation: https://www.data.gov.uk/dataset/ddc-inspire-ogc-wfs-service4

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
