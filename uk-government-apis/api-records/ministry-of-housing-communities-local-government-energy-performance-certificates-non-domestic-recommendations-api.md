---
type: "API Product"
title: "Energy Performance Certificates - Non-domestic Recommendations API"
description: "Retrieves full details of recommendations made for a particular Energy Performance Certificate. If the property has no recommendations a `HTTP 404 not found` status code will be returned. Note that this API route does not recognise the `application/zip` mime type. Recommendations are keyed on the certificate's lmk-key, which can be obtained from the certificate's `lmk-key` field."
resource: "https://epc.opendatacommunities.org/api/v1/non-domestic/recommendations/:lmk-key"
timestamp: "2020-11-05"
tags: "ministry-of-housing-communities-local-government, planning-and-property, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Energy Performance Certificates - Non-domestic Recommendations API

Retrieves full details of recommendations made for a particular Energy Performance Certificate. If the property has no recommendations a `HTTP 404 not found` status code will be returned. Note that this API route does not recognise the `application/zip` mime type. Recommendations are keyed on the certificate's lmk-key, which can be obtained from the certificate's `lmk-key` field.

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

- Endpoint: https://epc.opendatacommunities.org/api/v1/non-domestic/recommendations/:lmk-key
- Documentation: https://epc.opendatacommunities.org/docs/api/non-domestic#non-domestic-recommendations

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
