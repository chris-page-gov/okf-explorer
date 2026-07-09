---
type: "API Product"
title: "Ordnance Survey Places API"
description: "Use this API for looking up and validating addresses, typically before updating patient details in the Personal Demographics Service.You can:- identify UK addresses- verify the address records you are capturing against authoritative data from Ordnance Survey’s AddressBase® Premium and AddressBase® Premium - Islands- make requests using a full or partial address, a postcode, or a Unique Property Reference Number (UPRN)- find addresses closest to a given point- find all the known addresses within a user-defined area, bounding box or circle- verify an address before updating a patient's details in the Personal Demographics ServiceThis API is a third party API recommended for UK government services.## Data update frequencyThe address, geometry and UPRN data is available for the UK and Isle of Man. The address and UPRN data is available for Jersey and Guernsey.This data is updated every 6 weeks.## RequestsThis API has seven types of request in two categories.Capture and verification category:- Find - a free text search for quick use- Postcode - a search based on a property’s postcode- UPRN - a search that takes a UPRN as the search parameterGeoSearch category:- Nearest - finds the clos…"
resource: "https://digital.nhs.uk/developer/api-catalogue/ordnance-survey-places-api"
timestamp: "2024-04-23"
tags: "geospatial, government-services, health-and-care, nhs-digital, planning-and-property, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Ordnance Survey Places API

Use this API for looking up and validating addresses, typically before updating patient details in the Personal Demographics Service.You can:- identify UK addresses- verify the address records you are capturing against authoritative data from Ordnance Survey’s AddressBase® Premium and AddressBase® Premium - Islands- make requests using a full or partial address, a postcode, or a Unique Property Reference Number (UPRN)- find addresses closest to a given point- find all the known addresses within a user-defined area, bounding box or circle- verify an address before updating a patient's details in the Personal Demographics ServiceThis API is a third party API recommended for UK government services.## Data update frequencyThe address, geometry and UPRN data is available for the UK and Isle of Man. The address and UPRN data is available for Jersey and Guernsey.This data is updated every 6 weeks.## RequestsThis API has seven types of request in two categories.Capture and verification category:- Find - a free text search for quick use- Postcode - a search based on a property’s postcode- UPRN - a search that takes a UPRN as the search parameterGeoSearch category:- Nearest - finds the clos…

## Metadata

- Type: API Product
- Provider: [NHS Digital](../organisations/nhs-digital.md)
- Canonical provider: NHS Digital
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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/ordnance-survey-places-api
- Documentation: https://digital.nhs.uk/developer/api-catalogue/ordnance-survey-places-api

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
