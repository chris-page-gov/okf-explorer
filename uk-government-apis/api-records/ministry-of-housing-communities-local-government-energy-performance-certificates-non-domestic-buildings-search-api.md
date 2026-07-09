---
type: "API Product"
title: "Energy Performance Certificates - Non-domestic Buildings Search API"
description: "Allows searching and filtering of our property-level open data on Energy Performance of buildings by one or any combination of the following attributes: - address - postcode - local authority - parliamentary consistency - type of property - energy band - date that the EPC was lodged on the register"
resource: "https://epc.opendatacommunities.org/api/v1/non-domestic/search"
timestamp: "2020-11-05"
tags: "geospatial, government-services, ministry-of-housing-communities-local-government, planning-and-property, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Energy Performance Certificates - Non-domestic Buildings Search API

Allows searching and filtering of our property-level open data on Energy Performance of buildings by one or any combination of the following attributes: - address - postcode - local authority - parliamentary consistency - type of property - energy band - date that the EPC was lodged on the register

## Metadata

- Type: API Product
- Provider: [Ministry of Housing Communities Local Government](../organisations/ministry-of-housing-communities-local-government.md)
- Canonical provider: Ministry of Housing Communities Local Government
- Source adapter: api_gov_uk_catalogue
- Source tier: declared_api_catalogue
- Confidence: declared
- Assurance status: declared
- Access model: approval-required
- Contract status: documentation-only
- Licence: epc.opendatacommunities.org (epc-opendatacommunities-org)
- Licence basis: source-declared
- Licence source: https://epc.opendatacommunities.org/docs/copyright
- Licence confidence: 0.9
- Quality band: high
- DCAT term: `dcat:DataService`
- OpenAPI term: `OpenAPI Object`

- Endpoint: https://epc.opendatacommunities.org/api/v1/non-domestic/search
- Documentation: https://epc.opendatacommunities.org/docs/api/non-domestic#non-domestic-search

## Standards Alignment

This generated record is standards-alignable, not standards-conformant by itself. DCAT-AP conformance needs an RDF export; OpenAPI conformance needs a complete `openapi` document.

- DCAT / DCAT-AP: `dcat:DataService`; export status `data-service-ready`.
- DCAT missing requirements: none recorded
- OpenAPI: `OpenAPI Object`; export status `service-stub-ready`.
- OpenAPI security scheme: `metadata-only`.
- OpenAPI missing requirements: none recorded
- Crosswalk: [OKF Standards Crosswalk](../../docs/okf-standards-crosswalk.md)

## Credential Requirements

- approval_required: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: GOV.UK API Catalogue CSV
- Source URL: https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv
