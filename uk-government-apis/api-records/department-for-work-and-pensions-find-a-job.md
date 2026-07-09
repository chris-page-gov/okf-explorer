---
type: "API Product"
title: "Find a Job"
description: "This API is implementing a simple method to automatically retrieve information about job ads meeting a custom set of criteria.It is aimed to be a replacement of the existing Universal Jobmatch API. The API can be used by cross government departments to integrate with their jobs portal or us within their website.Examples:- School teacher jobs within 5 miles of London E1W, from 30k — `upwards/search?w=E1W&d=5&sf=30000&q=school+teacher`- C++ jobs in London - `/search?w=London&q=C%2B%2B`- All jobs in Scotland - `/search?w=Scotlandor/search?loc=86442`- All jobs in Scotland with description in HTML format - `/search?w=Scotland&html_description=1`"
resource: "https://findajob.dwp.gov.uk"
timestamp: "2026-06-24"
tags: "department-for-work-and-pensions, education-and-skills, government-services, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Find a Job

This API is implementing a simple method to automatically retrieve information about job ads meeting a custom set of criteria.It is aimed to be a replacement of the existing Universal Jobmatch API. The API can be used by cross government departments to integrate with their jobs portal or us within their website.Examples:- School teacher jobs within 5 miles of London E1W, from 30k — `upwards/search?w=E1W&d=5&sf=30000&q=school+teacher`- C++ jobs in London - `/search?w=London&q=C%2B%2B`- All jobs in Scotland - `/search?w=Scotlandor/search?loc=86442`- All jobs in Scotland with description in HTML format - `/search?w=Scotland&html_description=1`

## Metadata

- Type: API Product
- Provider: [Department for Work And Pensions](../organisations/department-for-work-and-pensions.md)
- Canonical provider: Department for Work And Pensions
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

- Endpoint: https://findajob.dwp.gov.uk
- Documentation: https://wiki.office.uc.dwpcloud.uk/spaces/Too/pages/336364645/Find+a+Job+API?preview=/336364645/336365676/FJ%20-%20Search%20API.pdf

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
