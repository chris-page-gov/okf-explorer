---
type: "Capability Document"
title: "allotments contract"
description: "Machine-readable or service-description contract inferred for allotments from public metadata."
resource: "https://www.data.gov.uk/dataset/allotments18"
timestamp: "2014-09-23T11:20:06.831650"
tags: "braintree-district-council, geospatial, government-services, wms"
confidence: "observed"
source_adapter: "contract_discovery"
---

# allotments contract

Machine-readable or service-description contract inferred for allotments from public metadata.

## Metadata

- Type: Capability Document
- Provider: [Braintree District Council](../organisations/braintree-district-council.md)
- Canonical provider: Braintree District Council
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

- Endpoint: https://www.data.gov.uk/dataset/allotments18
- Documentation: https://www.data.gov.uk/dataset/allotments18

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
