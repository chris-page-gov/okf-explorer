---
type: "API Product"
title: "Energy Performance Certificates - Display (public buildings) Certificates API"
description: "Retrieves full details for a particular Energy Performance Certificate, where `:lmk-key` is the LMK key of a certificate from a search result or download. For example we can request the certificate with an LMK key of `27649711032019053114460431000094` by making a request to the API at the URL: `https://epc.opendatacommunities.org/api/v1/display/certificate/27649711032019053114460431000094`."
resource: "https://epc.opendatacommunities.org/api/v1/display/certificate/:lmk-key"
timestamp: "2020-11-05"
tags: "government-services, ministry-of-housing-communities-local-government, planning-and-property, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Energy Performance Certificates - Display (public buildings) Certificates API

Retrieves full details for a particular Energy Performance Certificate, where `:lmk-key` is the LMK key of a certificate from a search result or download. For example we can request the certificate with an LMK key of `27649711032019053114460431000094` by making a request to the API at the URL: `https://epc.opendatacommunities.org/api/v1/display/certificate/27649711032019053114460431000094`.

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
- Licence: epc.opendatacommunities.org (epc-opendatacommunities-org)
- Licence basis: source-declared
- Licence source: https://epc.opendatacommunities.org/docs/copyright
- Licence confidence: 0.9
- Quality band: medium
- DCAT term: `dcat:DataService`
- OpenAPI term: `OpenAPI Object`

- Endpoint: https://epc.opendatacommunities.org/api/v1/display/certificate/:lmk-key
- Documentation: https://epc.opendatacommunities.org/docs/api/display#display-cert

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
