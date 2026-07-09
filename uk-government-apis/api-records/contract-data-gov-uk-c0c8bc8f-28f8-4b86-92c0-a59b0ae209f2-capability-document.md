---
type: "Capability Document"
title: "INSPIRE Download Service contract"
description: "Machine-readable or service-description contract inferred for INSPIRE Download Service from public metadata."
resource: "https://www.data.gov.uk/dataset/local-landscape-character-areas1"
timestamp: "2023-03-30T12:40:31.649738"
tags: "derbyshire-county-council, geospatial, government-services, wms"
confidence: "observed"
source_adapter: "contract_discovery"
---

# INSPIRE Download Service contract

Machine-readable or service-description contract inferred for INSPIRE Download Service from public metadata.

## Metadata

- Type: Capability Document
- Provider: [Derbyshire County Council](../organisations/derbyshire-county-council.md)
- Canonical provider: Derbyshire County Council
- Source adapter: contract_discovery
- Source tier: contract_discovery
- Confidence: observed
- Assurance status: declared
- Access model: anonymous
- Contract status: capability-document
- Licence: Creative Commons Attribution (cc-by)
- Licence basis: source-declared
- Licence source: cc-by
- Licence confidence: 0.9
- Quality band: high
- DCAT term: `dcterms:Standard`
- OpenAPI term: `OpenAPI Description or external contract`

- Endpoint: https://www.data.gov.uk/dataset/local-landscape-character-areas1
- Documentation: https://www.data.gov.uk/dataset/local-landscape-character-areas1

## Standards Alignment

This generated record is standards-alignable, not standards-conformant by itself. DCAT-AP conformance needs an RDF export; OpenAPI conformance needs a complete `openapi` document.

- DCAT / DCAT-AP: `dcterms:Standard`; export status `contract-reference`.
- DCAT missing requirements: none recorded
- OpenAPI: `OpenAPI Description or external contract`; export status `contract-reference`.
- OpenAPI security scheme: `none`.
- OpenAPI missing requirements: none recorded
- Crosswalk: [OKF Standards Crosswalk](../../docs/okf-standards-crosswalk.md)

## Credential Requirements

- none: secret value stored in OKF = False

## Provenance

- Source: Contract discovery from harvested API metadata
- Source URL: https://ckan.publishing.service.gov.uk/api/3/action/package_search?fq=res_format:("WMS" OR "WFS" OR "WMTS" OR "WCS" OR "OGC API - Features" OR "OGC WFS" OR "OGC WMS" OR "ogc wfs" OR "ogc wms" OR "ArcGIS GeoServices REST API" OR "arcgis geoservices rest api" OR "Esri REST" OR "ESRI REST API" OR "ESRI Rest API" OR "esri rest api" OR "SPARQL" OR "API" OR "api")
