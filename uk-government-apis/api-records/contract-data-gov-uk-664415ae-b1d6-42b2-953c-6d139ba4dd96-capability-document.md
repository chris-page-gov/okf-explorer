---
type: "Capability Document"
title: "INSPIRE Download Service contract"
description: "Machine-readable or service-description contract inferred for INSPIRE Download Service from public metadata."
resource: "https://www.data.gov.uk/dataset/liverpool-regionally-important-geological-sites"
timestamp: "2015-10-07T16:40:13.281605"
tags: "geospatial, government-services, liverpool-city-council, wfs"
confidence: "observed"
source_adapter: "contract_discovery"
---

# INSPIRE Download Service contract

Machine-readable or service-description contract inferred for INSPIRE Download Service from public metadata.

## Metadata

- Type: Capability Document
- Provider: [Liverpool City Council](../organisations/liverpool-city-council.md)
- Canonical provider: Liverpool City Council
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

- Endpoint: https://www.data.gov.uk/dataset/liverpool-regionally-important-geological-sites
- Documentation: https://www.data.gov.uk/dataset/liverpool-regionally-important-geological-sites

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
