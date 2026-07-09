---
type: "API Product"
title: "Water Quality"
description: "The Water Quality Archive provides data on water quality measurements carried out by the Environment Agency. Samples are taken from sampling points round the country and then analysed by laboratories to measure aspects of the water quality or the environment at the sampling point. The archive provides data on these measurements and samples dating from 2000 to present day. It contains 58 million measurements on nearly 4 million samples from 58 thousand sampling points. The archive provides an API to allow selective access to the data, together with the ability to download the data split into either pre-defined or customizable subsets. The data is made available in CSV, JSON and RDF formats. Please visit the [Defra Data Services Platform Support](https://environment.data.gov.uk/support) to let us know about any issues or to ask questions."
resource: "https://environment.data.gov.uk/water-quality/view/landing"
timestamp: "2020-08-26"
tags: "environment, environment-agency, government-services, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Water Quality

The Water Quality Archive provides data on water quality measurements carried out by the Environment Agency. Samples are taken from sampling points round the country and then analysed by laboratories to measure aspects of the water quality or the environment at the sampling point. The archive provides data on these measurements and samples dating from 2000 to present day. It contains 58 million measurements on nearly 4 million samples from 58 thousand sampling points. The archive provides an API to allow selective access to the data, together with the ability to download the data split into either pre-defined or customizable subsets. The data is made available in CSV, JSON and RDF formats. Please visit the [Defra Data Services Platform Support](https://environment.data.gov.uk/support) to let us know about any issues or to ask questions.

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

- Endpoint: https://environment.data.gov.uk/water-quality/view/landing
- Documentation: https://environment.data.gov.uk/water-quality/view/doc/reference

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
