---
type: "API Product"
title: "General Practice Extraction Service - MESH"
description: "Use this integration to send patient data from General Practice (GP) clinical systems to General Practice Extraction Service (GPES). This data can then be used for planning and research. You can:- receive requests for data- send requested dataFor example, the GPES data for pandemic planning and research is used to support the response to the coronavirus (COVID-19) outbreak. This data is used to analyse healthcare information about patients, for the duration of the coronavirus emergency period.This integration is an asynchronous messaging integration which uses MESH to send and receive messages."
resource: "https://digital.nhs.uk/developer/api-catalogue/general-practice-extraction-service-mesh"
timestamp: "2024-04-23"
tags: "government-services, health-and-care, mesh, nhs-digital, planning-and-property"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# General Practice Extraction Service - MESH

Use this integration to send patient data from General Practice (GP) clinical systems to General Practice Extraction Service (GPES). This data can then be used for planning and research. You can:- receive requests for data- send requested dataFor example, the GPES data for pandemic planning and research is used to support the response to the coronavirus (COVID-19) outbreak. This data is used to analyse healthcare information about patients, for the duration of the coronavirus emergency period.This integration is an asynchronous messaging integration which uses MESH to send and receive messages.

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/general-practice-extraction-service-mesh
- Documentation: https://digital.nhs.uk/developer/api-catalogue/general-practice-extraction-service-mesh

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
