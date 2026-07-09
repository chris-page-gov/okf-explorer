---
type: "API Product"
title: "Organisation Data Service - FHIR API"
description: "Use this API to access a reduced dataset of health and social care organisations in England and Wales, such as trusts or GP practices, using the Organisation Data Service (ODS).This FHIR API contains a reduced dataset, most useful for transactions. To access the full ODS dataset, including data about succession (history) or relationships, use the ODS ORD API.You can search for information about an organisation using one or more of their:- ODS code- last updated date- name- active or inactive status- postcode or city- organisation's role or primary role, such as trusts or GP practicesYou can also limit the number of results returned, or just request a count of the number of search results.You cannot:- access the full dataset from ODS, specifically no information about succession (history) or relationships- search for an organisation using an addressAn ODS code is a unique identification code for an organisation that interacts with any area of the NHS. For a full list of the organisation types available, see CSV downloads.This API returns the following reduced dataset of an organisation, when searched with an ODS code:- organisation - ODS code, name, open date, close date, last chan…"
resource: "https://digital.nhs.uk/developer/api-catalogue/organisation-data-service-fhir"
timestamp: "2024-04-23"
tags: "fhir, geospatial, government-services, health-and-care, nhs-digital, planning-and-property, population-and-statistics"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Organisation Data Service - FHIR API

Use this API to access a reduced dataset of health and social care organisations in England and Wales, such as trusts or GP practices, using the Organisation Data Service (ODS).This FHIR API contains a reduced dataset, most useful for transactions. To access the full ODS dataset, including data about succession (history) or relationships, use the ODS ORD API.You can search for information about an organisation using one or more of their:- ODS code- last updated date- name- active or inactive status- postcode or city- organisation's role or primary role, such as trusts or GP practicesYou can also limit the number of results returned, or just request a count of the number of search results.You cannot:- access the full dataset from ODS, specifically no information about succession (history) or relationships- search for an organisation using an addressAn ODS code is a unique identification code for an organisation that interacts with any area of the NHS. For a full list of the organisation types available, see CSV downloads.This API returns the following reduced dataset of an organisation, when searched with an ODS code:- organisation - ODS code, name, open date, close date, last chan…

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/organisation-data-service-fhir
- Documentation: https://digital.nhs.uk/developer/api-catalogue/organisation-data-service-fhir

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
