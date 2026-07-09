---
type: "Capability Document"
title: "Download Data contract"
description: "Machine-readable or service-description contract inferred for Download Data from public metadata."
resource: "https://www.data.gov.uk/dataset/urban-area"
timestamp: "2024-10-18T13:47:06.090462"
tags: "geospatial, reigate-and-banstead-borough-council, wfs"
confidence: "observed"
source_adapter: "contract_discovery"
---

# Download Data contract

Machine-readable or service-description contract inferred for Download Data from public metadata.

## Metadata

- Type: Capability Document
- Provider: [Reigate and Banstead Borough Council](../organisations/reigate-and-banstead-borough-council.md)
- Canonical provider: Reigate And Banstead Borough Council
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

- Endpoint: https://www.data.gov.uk/dataset/urban-area
- Documentation: https://www.data.gov.uk/dataset/urban-area

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
