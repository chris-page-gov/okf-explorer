---
type: "API Product"
title: "Data Registers Service - REST API"
description: "Use this API to access a wide range of live lists of reference data with our Data Registers Service which includes historic data. Each register is managed by a custodian across a range of organisations. In each case, they represent the approved version of that data. Examples of these data registers include:- organisation codes- postcodes- diagnosis codesYou can see what data registers are available using our data registers tool.If you're looking for richer functionality from a data source, such as being able to test data validity, extract a subset or map data across different schemas then take a look at our Terminology Server - FHIR API - the terminology server provides a richer view of the SNOMED data set only. This also conforms to the international FHIR standards for its APIs.If your use case requires historical, point-in-time snapshots of reference data, they are available either from this API or the TRUD API."
resource: "https://digital.nhs.uk/developer/api-catalogue/data-registers-service-rest"
timestamp: "2024-04-23"
tags: "fhir, geospatial, government-services, health-and-care, nhs-digital, planning-and-property"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Data Registers Service - REST API

Use this API to access a wide range of live lists of reference data with our Data Registers Service which includes historic data. Each register is managed by a custodian across a range of organisations. In each case, they represent the approved version of that data. Examples of these data registers include:- organisation codes- postcodes- diagnosis codesYou can see what data registers are available using our data registers tool.If you're looking for richer functionality from a data source, such as being able to test data validity, extract a subset or map data across different schemas then take a look at our Terminology Server - FHIR API - the terminology server provides a richer view of the SNOMED data set only. This also conforms to the international FHIR standards for its APIs.If your use case requires historical, point-in-time snapshots of reference data, they are available either from this API or the TRUD API.

## Metadata

- Type: API Product
- Provider: [NHS Digital](../organisations/nhs-digital.md)
- Canonical provider: NHS Digital
- Source adapter: api_gov_uk_catalogue
- Source tier: declared_api_catalogue
- Confidence: declared
- Assurance status: declared
- Access model: approval-required
- Contract status: documentation-only
- Licence: Not specified (not-specified)
- Licence basis: not-specified
- Licence source: not-specified
- Licence confidence: 0.2
- Quality band: high
- DCAT term: `dcat:DataService`
- OpenAPI term: `OpenAPI Object`

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/data-registers-service-rest
- Documentation: https://digital.nhs.uk/developer/api-catalogue/data-registers-service-rest

## Standards Alignment

This generated record is standards-alignable, not standards-conformant by itself. DCAT-AP conformance needs an RDF export; OpenAPI conformance needs a complete `openapi` document.

- DCAT / DCAT-AP: `dcat:DataService`; export status `data-service-with-gaps`.
- DCAT missing requirements: `dcterms:license`
- OpenAPI: `OpenAPI Object`; export status `service-stub-with-gaps`.
- OpenAPI security scheme: `metadata-only`.
- OpenAPI missing requirements: `info.license`
- Crosswalk: [OKF Standards Crosswalk](../../docs/okf-standards-crosswalk.md)

## Credential Requirements

- approval_required: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: GOV.UK API Catalogue CSV
- Source URL: https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv
