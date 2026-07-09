---
type: "API Product"
title: "OpenDataCommunities (Official statistics from MHCLG.) LinkedData resource API"
description: "A URL pattern for accessing information about individual resources in OpenDataCommunities."
resource: "http://opendatacommunities.org/resource?uri={url-encoded-resource-uri}"
timestamp: "2020-11-05"
tags: "ministry-of-housing-communities-local-government, population-and-statistics, sparql"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# OpenDataCommunities (Official statistics from MHCLG.) LinkedData resource API

A URL pattern for accessing information about individual resources in OpenDataCommunities.

## Metadata

- Type: API Product
- Provider: [Ministry of Housing Communities Local Government](../organisations/ministry-of-housing-communities-local-government.md)
- Canonical provider: Ministry of Housing Communities Local Government
- Source adapter: api_gov_uk_catalogue
- Source tier: declared_api_catalogue
- Confidence: declared
- Assurance status: declared
- Access model: unknown
- Contract status: documentation-only
- Licence: licenced per dataset, but mostly ogl (licenced-per-dataset-but-mostly-ogl)
- Licence basis: source-declared
- Licence source: Licenced per dataset, but mostly OGL
- Licence confidence: 0.9
- Quality band: medium
- DCAT term: `dcat:DataService`
- OpenAPI term: `OpenAPI Object`

- Endpoint: http://opendatacommunities.org/resource?uri={url-encoded-resource-uri}
- Documentation: https://opendatacommunities.org/help

## Standards Alignment

This generated record is standards-alignable, not standards-conformant by itself. DCAT-AP conformance needs an RDF export; OpenAPI conformance needs a complete `openapi` document.

- DCAT / DCAT-AP: `dcat:DataService`; export status `data-service-ready`.
- DCAT missing requirements: none recorded
- OpenAPI: `OpenAPI Object`; export status `service-stub-with-gaps`.
- OpenAPI security scheme: `unknown`.
- OpenAPI missing requirements: `components.securitySchemes`
- Crosswalk: [OKF Standards Crosswalk](../../docs/okf-standards-crosswalk.md)

## Credential Requirements

- unknown: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: GOV.UK API Catalogue CSV
- Source URL: https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv
