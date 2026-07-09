---
type: "API Product"
title: "Bathing Water"
description: "The Environment Agency collects water quality data each year from May to September, to ensure that designated bathing water sites on the coast and inland are safe and clean for swimming and other activities. We make this data reusable and accessible to developers and to members of the public, by publishing it as linked data. Please visit the [Defra Data Services Platform Support](https://environment.data.gov.uk/support) to let us know about any issues or to ask questions."
resource: "https://environment.data.gov.uk/bwq/index.html"
timestamp: "2020-08-26"
tags: "environment, environment-agency, government-services, sparql"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Bathing Water

The Environment Agency collects water quality data each year from May to September, to ensure that designated bathing water sites on the coast and inland are safe and clean for swimming and other activities. We make this data reusable and accessible to developers and to members of the public, by publishing it as linked data. Please visit the [Defra Data Services Platform Support](https://environment.data.gov.uk/support) to let us know about any issues or to ask questions.

## Metadata

- Type: API Product
- Provider: [Environment Agency](../organisations/environment-agency.md)
- Canonical provider: Environment Agency
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

- Endpoint: https://environment.data.gov.uk/bwq/index.html
- Documentation: https://environment.data.gov.uk/bwq/doc/api-reference-v0.6.html

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
