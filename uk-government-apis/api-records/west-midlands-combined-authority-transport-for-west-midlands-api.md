---
type: "API Product"
title: "Transport for West Midlands API"
description: "The Transport for West Midlands API provides information about bus and tram services in the West Midlands. This includes station locations, timetables, routes and real-time predicted departures."
resource: "http://api.tfwm.org.uk/"
timestamp: "2020-10-05"
tags: "rest-http, transport, west-midlands-combined-authority"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Transport for West Midlands API

The Transport for West Midlands API provides information about bus and tram services in the West Midlands. This includes station locations, timetables, routes and real-time predicted departures.

## Metadata

- Type: API Product
- Provider: [West Midlands Combined Authority](../organisations/west-midlands-combined-authority.md)
- Canonical provider: West Midlands Combined Authority
- Source adapter: api_gov_uk_catalogue
- Source tier: declared_api_catalogue
- Confidence: declared
- Assurance status: declared
- Access model: unknown
- Contract status: documentation-only
- Licence: Not specified (not-specified)
- Licence basis: not-specified
- Licence source: not-specified
- Licence confidence: 0.2
- Quality band: medium
- DCAT term: `dcat:DataService`
- OpenAPI term: `OpenAPI Object`

- Endpoint: http://api.tfwm.org.uk/
- Documentation: https://api-portal.tfwm.org.uk/docs#/

## Standards Alignment

This generated record is standards-alignable, not standards-conformant by itself. DCAT-AP conformance needs an RDF export; OpenAPI conformance needs a complete `openapi` document.

- DCAT / DCAT-AP: `dcat:DataService`; export status `data-service-with-gaps`.
- DCAT missing requirements: `dcterms:license`
- OpenAPI: `OpenAPI Object`; export status `service-stub-with-gaps`.
- OpenAPI security scheme: `unknown`.
- OpenAPI missing requirements: `components.securitySchemes`, `info.license`
- Crosswalk: [OKF Standards Crosswalk](../../docs/okf-standards-crosswalk.md)

## Credential Requirements

- unknown: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: GOV.UK API Catalogue CSV
- Source URL: https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv
