---
type: "API Product"
title: "OS Places API"
description: "Our secure, scalable, and resilient address look-up web service, OS Places API lets you search the UK's most comprehensive online address database. With OS Places API, managing customer data is a breeze. Lightning-quick postcode and address search means your records are accurate and customer deliveries should always get to the right front door. When an incident happens, control room staff need to know which properties are closest. OS Places' geosearch tool gives instant answers. This helps create the common operating picture that's vital for the emergency services. Important note: OS Places API will be migrating to the OS Data Hub in January 2021 and at that time the base URLs will migrate to the common OS Data Hub API pattern."
resource: "https://api.os.uk/search/places/v1"
timestamp: "2020-08-24"
tags: "geospatial, government-services, ordnance-survey, planning-and-property, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# OS Places API

Our secure, scalable, and resilient address look-up web service, OS Places API lets you search the UK's most comprehensive online address database. With OS Places API, managing customer data is a breeze. Lightning-quick postcode and address search means your records are accurate and customer deliveries should always get to the right front door. When an incident happens, control room staff need to know which properties are closest. OS Places' geosearch tool gives instant answers. This helps create the common operating picture that's vital for the emergency services. Important note: OS Places API will be migrating to the OS Data Hub in January 2021 and at that time the base URLs will migrate to the common OS Data Hub API pattern.

## Metadata

- Type: API Product
- Provider: [Ordnance Survey](../organisations/ordnance-survey.md)
- Canonical provider: Ordnance Survey
- Source adapter: api_gov_uk_catalogue
- Source tier: declared_api_catalogue
- Confidence: declared
- Assurance status: declared
- Access model: unknown
- Contract status: documentation-only
- Licence: osdatahub.os.uk (osdatahub-os-uk)
- Licence basis: source-declared
- Licence source: https://osdatahub.os.uk/legal/termsConditions
- Licence confidence: 0.9
- Quality band: medium
- DCAT term: `dcat:DataService`
- OpenAPI term: `OpenAPI Object`

- Endpoint: https://api.os.uk/search/places/v1
- Documentation: https://osdatahub.os.uk/docs/places/overview

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
