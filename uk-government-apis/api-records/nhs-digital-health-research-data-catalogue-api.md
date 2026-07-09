---
type: "API Product"
title: "Health Research Data Catalogue API"
description: "Use this API to retrieve metadata information suitable for publication in a health research data catalogue. You can: - get a list of data sets- get data set detailsYou cannot currently use this API to: - retrieve data sets as a bulk transfer- retrieve data set feedsYou can get the following metadata information for each data set: - overarching characteristics such as: publisher, keywords, coverage, provenance, access, format, standards, summary observations and data utilityThe API conforms to the HDR UK Dataset Metadata Schema Standard v2.0.2 created to enable sharing of information with the UK-wide 'federated' health research data catalogue. API scope Current scope is limited to metadata information about national health-related data sets (such as description, size of the population contained within that data set and the legal basis for access) that can help researchers and innovators decide whether a data set could be useful to their research and help them to make further health discoveries."
resource: "https://digital.nhs.uk/developer/api-catalogue/health-research-data-catalogue"
timestamp: "2024-04-23"
tags: "health-and-care, nhs-digital, population-and-statistics, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Health Research Data Catalogue API

Use this API to retrieve metadata information suitable for publication in a health research data catalogue. You can: - get a list of data sets- get data set detailsYou cannot currently use this API to: - retrieve data sets as a bulk transfer- retrieve data set feedsYou can get the following metadata information for each data set: - overarching characteristics such as: publisher, keywords, coverage, provenance, access, format, standards, summary observations and data utilityThe API conforms to the HDR UK Dataset Metadata Schema Standard v2.0.2 created to enable sharing of information with the UK-wide 'federated' health research data catalogue. API scope Current scope is limited to metadata information about national health-related data sets (such as description, size of the population contained within that data set and the legal basis for access) that can help researchers and innovators decide whether a data set could be useful to their research and help them to make further health discoveries.

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/health-research-data-catalogue
- Documentation: https://digital.nhs.uk/developer/api-catalogue/health-research-data-catalogue

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
