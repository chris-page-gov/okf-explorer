---
type: "API Product"
title: "Statistics.gov.scot"
description: "statistics.gov.scot provides public access to the data behind Scotland's official statistics in linked open data format. The SPARQL endpoint allows flexible querying of the datastore using the SPARQL 1.1 language. This API can be used to extract data, automate report-writing, publish data visualisations, or make interactive tools for exploring the data. The site is managed by the Scottish Government on behalf of all producers of Scottish official statistics including Scottish Government, National Records of Scotland, NHS Information Services Division, Visit Scotland and others. The API is provided under the Open Government Licence with no requirement for registration. For queries or comments, please contact [statistics.opendata@gov.scot](mailto:statistics.opendata@gov.scot)."
resource: "https://statistics.gov.scot/sparql"
timestamp: "2020-08-26"
tags: "health-and-care, population-and-statistics, scottish-government, sparql"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Statistics.gov.scot

statistics.gov.scot provides public access to the data behind Scotland's official statistics in linked open data format. The SPARQL endpoint allows flexible querying of the datastore using the SPARQL 1.1 language. This API can be used to extract data, automate report-writing, publish data visualisations, or make interactive tools for exploring the data. The site is managed by the Scottish Government on behalf of all producers of Scottish official statistics including Scottish Government, National Records of Scotland, NHS Information Services Division, Visit Scotland and others. The API is provided under the Open Government Licence with no requirement for registration. For queries or comments, please contact [statistics.opendata@gov.scot](mailto:statistics.opendata@gov.scot).

## Metadata

- Type: API Product
- Provider: [Scottish Government](../organisations/scottish-government.md)
- Canonical provider: Scottish Government
- Source adapter: api_gov_uk_catalogue
- Source tier: declared_api_catalogue
- Confidence: declared
- Assurance status: declared
- Access model: anonymous
- Contract status: documentation-only
- Licence: Not specified (not-specified)
- Licence basis: not-specified
- Licence source: not-specified
- Licence confidence: 0.2
- Quality band: high
- DCAT term: `dcat:DataService`
- OpenAPI term: `OpenAPI Object`

- Endpoint: https://statistics.gov.scot/sparql
- Documentation: https://guides.statistics.gov.scot/category/37-api

## Standards Alignment

This generated record is standards-alignable, not standards-conformant by itself. DCAT-AP conformance needs an RDF export; OpenAPI conformance needs a complete `openapi` document.

- DCAT / DCAT-AP: `dcat:DataService`; export status `data-service-with-gaps`.
- DCAT missing requirements: `dcterms:license`
- OpenAPI: `OpenAPI Object`; export status `service-stub-with-gaps`.
- OpenAPI security scheme: `none`.
- OpenAPI missing requirements: `info.license`
- Crosswalk: [OKF Standards Crosswalk](../../docs/okf-standards-crosswalk.md)

## Credential Requirements

- none: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: GOV.UK API Catalogue CSV
- Source URL: https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv
