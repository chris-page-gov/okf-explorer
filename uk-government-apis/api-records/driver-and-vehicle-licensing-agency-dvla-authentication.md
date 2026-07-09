---
type: "API Product"
title: "DVLA Authentication"
description: "The DVLA Authentication API provides authentication, change password, new password and change API key services for users of DVLA secure APIs."
resource: "https://driver-vehicle-licensing.api.gov.uk/thirdparty-access"
timestamp: "2020-08-24"
tags: "driver-and-vehicle-licensing-agency, rest-http, transport"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# DVLA Authentication

The DVLA Authentication API provides authentication, change password, new password and change API key services for users of DVLA secure APIs.

## Metadata

- Type: API Product
- Provider: [Driver And Vehicle Licensing Agency](../organisations/driver-and-vehicle-licensing-agency.md)
- Canonical provider: Driver And Vehicle Licensing Agency
- Source adapter: api_gov_uk_catalogue
- Source tier: declared_api_catalogue
- Confidence: declared
- Assurance status: declared
- Access model: api-key
- Contract status: documentation-only
- Licence: Not specified (not-specified)
- Licence basis: not-specified
- Licence source: not-specified
- Licence confidence: 0.2
- Quality band: high
- DCAT term: `dcat:DataService`
- OpenAPI term: `OpenAPI Object`

- Endpoint: https://driver-vehicle-licensing.api.gov.uk/thirdparty-access
- Documentation: https://developer-portal.driver-vehicle-licensing.api.gov.uk/apis/authentication-api/authentication-api-description.html

## Standards Alignment

This generated record is standards-alignable, not standards-conformant by itself. DCAT-AP conformance needs an RDF export; OpenAPI conformance needs a complete `openapi` document.

- DCAT / DCAT-AP: `dcat:DataService`; export status `data-service-with-gaps`.
- DCAT missing requirements: `dcterms:license`
- OpenAPI: `OpenAPI Object`; export status `service-stub-with-gaps`.
- OpenAPI security scheme: `apiKey`.
- OpenAPI missing requirements: `info.license`
- Crosswalk: [OKF Standards Crosswalk](../../docs/okf-standards-crosswalk.md)

## Credential Requirements

- api_key: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: GOV.UK API Catalogue CSV
- Source URL: https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv
