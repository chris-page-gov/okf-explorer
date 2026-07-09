---
type: "API Product"
title: "UK Tidal API - Discovery"
description: "The ADMIRALTY UK Tidal API provides authoritative source of tidal height predictions for Standard and Secondary tidal level stations around the United Kingdom. Discovery provides a free 1-year subscription to access the current plus 6 days’ worth of tidal events for 607 tidal stations around the United Kingdom."
resource: "https://developer.admiralty.co.uk/product#product=uk-tidal-api"
timestamp: "2021-02-09"
tags: "public-administration, rest-http, uk-hydrographic-office"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# UK Tidal API - Discovery

The ADMIRALTY UK Tidal API provides authoritative source of tidal height predictions for Standard and Secondary tidal level stations around the United Kingdom. Discovery provides a free 1-year subscription to access the current plus 6 days’ worth of tidal events for 607 tidal stations around the United Kingdom.

## Metadata

- Type: API Product
- Provider: [UK Hydrographic Office](../organisations/uk-hydrographic-office.md)
- Canonical provider: UK Hydrographic Office
- Source adapter: api_gov_uk_catalogue
- Source tier: declared_api_catalogue
- Confidence: declared
- Assurance status: declared
- Access model: unknown
- Contract status: documentation-only
- Licence: subscription required (subscription-required)
- Licence basis: source-declared
- Licence source: subscription required
- Licence confidence: 0.9
- Quality band: medium
- DCAT term: `dcat:DataService`
- OpenAPI term: `OpenAPI Object`

- Endpoint: https://developer.admiralty.co.uk/product#product=uk-tidal-api
- Documentation: https://developer.admiralty.co.uk/api-details#api=uk-tidal-api&operation=Stations_GetStation

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
