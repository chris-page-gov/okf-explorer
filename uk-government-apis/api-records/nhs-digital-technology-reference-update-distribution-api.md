---
type: "API Product"
title: "Technology Reference Update Distribution API"
description: "Use this API to automate the download of Technology Reference Update Distribution (TRUD) release files.These include:- classification products, including NHS Information Standards ICD and OPCS-4 in the UK, as well as other products to support the implementation of these clinical classifications and derivative products- the NHS Data Model and Dictionary, which provides a reference point for approved Information Standards and Collections (including Extractions) (ISCEs) to support health care activities within the NHS in England- terminology products such as SNOMED CT, the Read Codes and other products to support the implementation of terminology, including tools and derivative productsYou can:- request release information for an item- request a release file once you have its release informationYou must have a TRUD account before you can use this API."
resource: "https://digital.nhs.uk/developer/api-catalogue/technology-reference-update-distribution-api"
timestamp: "2024-04-23"
tags: "health-and-care, nhs-digital, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Technology Reference Update Distribution API

Use this API to automate the download of Technology Reference Update Distribution (TRUD) release files.These include:- classification products, including NHS Information Standards ICD and OPCS-4 in the UK, as well as other products to support the implementation of these clinical classifications and derivative products- the NHS Data Model and Dictionary, which provides a reference point for approved Information Standards and Collections (including Extractions) (ISCEs) to support health care activities within the NHS in England- terminology products such as SNOMED CT, the Read Codes and other products to support the implementation of terminology, including tools and derivative productsYou can:- request release information for an item- request a release file once you have its release informationYou must have a TRUD account before you can use this API.

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/technology-reference-update-distribution-api
- Documentation: https://digital.nhs.uk/developer/api-catalogue/technology-reference-update-distribution-api

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
