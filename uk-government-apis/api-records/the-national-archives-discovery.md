---
type: "API Product"
title: "Discovery"
description: "Our Discovery application programming interface (API) is designed to maximise access to the information held in The National Archives' Discovery service. Discovery holds more than 35 million descriptions of records held by The National Archives and more than 2,500 archives and institutions across the United Kingdom, as well as a smaller number of archives around the world. The information in Discovery is made up of record descriptions provided by or derived from the catalogues of the different archives. Discovery also contains significant information on hundreds of thousands of record creators from anonymous diarists to the world renowned. The API is open and a [sandbox](https://discovery.nationalarchives.gov.uk/API/sandbox/index#!/) and documentation are provided."
resource: "https://discovery.nationalarchives.gov.uk/API"
timestamp: "2020-10-05"
tags: "government-services, rest-http, the-national-archives"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Discovery

Our Discovery application programming interface (API) is designed to maximise access to the information held in The National Archives' Discovery service. Discovery holds more than 35 million descriptions of records held by The National Archives and more than 2,500 archives and institutions across the United Kingdom, as well as a smaller number of archives around the world. The information in Discovery is made up of record descriptions provided by or derived from the catalogues of the different archives. Discovery also contains significant information on hundreds of thousands of record creators from anonymous diarists to the world renowned. The API is open and a [sandbox](https://discovery.nationalarchives.gov.uk/API/sandbox/index#!/) and documentation are provided.

## Metadata

- Type: API Product
- Provider: [The National Archives](../organisations/the-national-archives.md)
- Canonical provider: The National Archives
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

- Endpoint: https://discovery.nationalarchives.gov.uk/API
- Documentation: http://www.nationalarchives.gov.uk/help/discovery-for-developers-about-the-application-programming-interface-api/

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
