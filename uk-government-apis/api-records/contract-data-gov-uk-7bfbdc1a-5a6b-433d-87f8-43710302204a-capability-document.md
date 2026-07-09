---
type: "Capability Document"
title: "DCLG INSPIRE OGC WMS Service contract"
description: "Machine-readable or service-description contract inferred for DCLG INSPIRE OGC WMS Service from public metadata."
resource: "https://www.data.gov.uk/dataset/ceremonial-county-boundaries-of-england"
timestamp: "2014-10-29T15:00:07.073361"
tags: "department-for-communities-and-local-government, geospatial, government-services, wms"
confidence: "observed"
source_adapter: "contract_discovery"
---

# DCLG INSPIRE OGC WMS Service contract

Machine-readable or service-description contract inferred for DCLG INSPIRE OGC WMS Service from public metadata.

## Metadata

- Type: Capability Document
- Provider: [Ministry of Housing, Communities and Local Government](../organisations/department-for-communities-and-local-government.md)
- Canonical provider: Ministry of Housing Communities And Local Government
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

- Endpoint: https://www.data.gov.uk/dataset/ceremonial-county-boundaries-of-england
- Documentation: https://www.data.gov.uk/dataset/ceremonial-county-boundaries-of-england

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
