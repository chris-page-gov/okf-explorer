---
type: "API Product"
title: "Cefas Data Portal APIs"
description: "A suite of APIs which allow external interaction with all metadata and data published via our data portal (https://data.cefas.co.uk/), the portal covers many marine science themes including fisheries, biodiversity, environmental monitoring and aquaculture. Our metadata follow the MEDIN standard (https://medin.org.uk/medin-discovery-metadata-standard) which is compatible with UK GEMINI and INSPIRE. Our datasets do not currently follow one particular data standard. We are currently undertaking a pilot project which will implement the OGC EDR standard (https://ogcapi.ogc.org/edr/) to a subset of our data."
resource: "https://data-api.cefas.co.uk/"
timestamp: "2022-01-31"
tags: "cefas, geospatial, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Cefas Data Portal APIs

A suite of APIs which allow external interaction with all metadata and data published via our data portal (https://data.cefas.co.uk/), the portal covers many marine science themes including fisheries, biodiversity, environmental monitoring and aquaculture. Our metadata follow the MEDIN standard (https://medin.org.uk/medin-discovery-metadata-standard) which is compatible with UK GEMINI and INSPIRE. Our datasets do not currently follow one particular data standard. We are currently undertaking a pilot project which will implement the OGC EDR standard (https://ogcapi.ogc.org/edr/) to a subset of our data.

## Metadata

- Type: API Product
- Provider: [Cefas](../organisations/cefas.md)
- Canonical provider: Cefas
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

- Endpoint: https://data-api.cefas.co.uk/
- Documentation: https://www.cefas.co.uk/data-and-publications/cefas-data-hub-apis/

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
