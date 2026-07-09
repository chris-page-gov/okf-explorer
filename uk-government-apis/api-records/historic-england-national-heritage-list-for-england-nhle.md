---
type: "API Product"
title: "National Heritage List for England (NHLE)"
description: "The National Heritage List for England (NHLE) is the only official, up to date, register of all nationally protected historic buildings and sites in England - listed buildings, scheduled monuments, protected wrecks, registered parks and gardens, and battlefields. This data uses the British National Grid (EPSG:27700) spatial reference. It contains points and polygons for Listed Buildings, Building Preservation Notices and Certificates of Immunity. Data is updated daily. ‘Listing’ is the all-encompassing term for the legal protection given to a building, monument, structure or site through the planning system. It is recognition of historical, architectural or archaeological significance, intended to ensure that the character of the asset in question is preserved for future generations. The main types of Listing are: Listed Buildings Scheduled Monuments Registered Parks and Gardens Registered Battlefields Protected Wreck Sites World Heritage Sites"
resource: "https://services-eu1.arcgis.com/ZOdPfBS3aqqDYPUQ/arcgis/rest/services/National_Heritage_List_for_England_NHLE_v02_VIEW/FeatureServer"
timestamp: "2023-10-11"
tags: "arcgis-rest, historic-england, planning-and-property"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# National Heritage List for England (NHLE)

The National Heritage List for England (NHLE) is the only official, up to date, register of all nationally protected historic buildings and sites in England - listed buildings, scheduled monuments, protected wrecks, registered parks and gardens, and battlefields. This data uses the British National Grid (EPSG:27700) spatial reference. It contains points and polygons for Listed Buildings, Building Preservation Notices and Certificates of Immunity. Data is updated daily. ‘Listing’ is the all-encompassing term for the legal protection given to a building, monument, structure or site through the planning system. It is recognition of historical, architectural or archaeological significance, intended to ensure that the character of the asset in question is preserved for future generations. The main types of Listing are: Listed Buildings Scheduled Monuments Registered Parks and Gardens Registered Battlefields Protected Wreck Sites World Heritage Sites

## Metadata

- Type: API Product
- Provider: [Historic England](../organisations/historic-england.md)
- Canonical provider: Historic England
- Source adapter: api_gov_uk_catalogue
- Source tier: declared_api_catalogue
- Confidence: declared
- Assurance status: declared
- Access model: approval-required
- Contract status: undocumented-in-catalogue
- Licence: Open Government Licence v3.0 (open-government-licence-v3)
- Licence basis: source-declared
- Licence source: Open Government Licence
- Licence confidence: 0.9
- Quality band: medium
- DCAT term: `dcat:DataService`
- OpenAPI term: `OpenAPI Object`

- Endpoint: https://services-eu1.arcgis.com/ZOdPfBS3aqqDYPUQ/arcgis/rest/services/National_Heritage_List_for_England_NHLE_v02_VIEW/FeatureServer

## Standards Alignment

This generated record is standards-alignable, not standards-conformant by itself. DCAT-AP conformance needs an RDF export; OpenAPI conformance needs a complete `openapi` document.

- DCAT / DCAT-AP: `dcat:DataService`; export status `data-service-with-gaps`.
- DCAT missing requirements: `dcat:endpointDescription`
- OpenAPI: `OpenAPI Object`; export status `service-stub-with-gaps`.
- OpenAPI security scheme: `metadata-only`.
- OpenAPI missing requirements: `externalDocs.url`
- Crosswalk: [OKF Standards Crosswalk](../../docs/okf-standards-crosswalk.md)

## Credential Requirements

- approval_required: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: GOV.UK API Catalogue CSV
- Source URL: https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv
