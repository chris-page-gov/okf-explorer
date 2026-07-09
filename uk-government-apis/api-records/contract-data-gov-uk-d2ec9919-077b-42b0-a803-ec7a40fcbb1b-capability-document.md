---
type: "Capability Document"
title: "Download service (SPARQL form point) contract"
description: "Machine-readable or service-description contract inferred for Download service (SPARQL form point) from public metadata."
resource: "https://www.gov.uk/government/publications/land-registry-data/public-data"
timestamp: "2013-02-27T11:33:02.010617"
tags: "government-services, land-registry, planning-and-property, sparql"
confidence: "observed"
source_adapter: "contract_discovery"
---

# Download service (SPARQL form point) contract

Machine-readable or service-description contract inferred for Download service (SPARQL form point) from public metadata.

## Metadata

- Type: Capability Document
- Provider: [HM Land Registry](../organisations/land-registry.md)
- Canonical provider: Land Registry
- Source adapter: contract_discovery
- Source tier: contract_discovery
- Confidence: observed
- Assurance status: declared
- Access model: anonymous
- Contract status: capability-document
- Licence: Open Government Licence v3.0 (open-government-licence-v3)
- Licence basis: source-declared
- Licence source: uk-ogl
- Licence confidence: 0.9
- Quality band: high
- DCAT term: `dcterms:Standard`
- OpenAPI term: `OpenAPI Description or external contract`

- Endpoint: https://www.gov.uk/government/publications/land-registry-data/public-data
- Documentation: https://www.gov.uk/government/publications/land-registry-data/public-data

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
