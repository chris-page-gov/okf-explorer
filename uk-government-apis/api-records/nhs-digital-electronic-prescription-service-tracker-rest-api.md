---
type: "API Product"
title: "Electronic Prescription Service Tracker - REST API"
description: "Use this API to track a patient’s prescriptions within the Electronic Prescription Service (EPS) using our Electronic Prescription Service Tracker.You can search for a list of prescriptions that meet your query parameters by providing: - patient's NHS number (mandatory)- format (mandatory)- prescription date range (optional)- prescription status (optional)- prescription version (optional)Once you find the prescription, or if you already know its details, you can retrieve it by providing:- prescription ID (mandatory)- format (mandatory)- issue number (optional)For more details, see Introduction to Spine EPS Tracker.This API is only for use when the end user is a healthcare worker, not a patient. You can vote to make it available to patients on our interactive backlog."
resource: "https://digital.nhs.uk/developer/api-catalogue/spine-electronic-prescription-service-tracker-rest"
timestamp: "2024-04-23"
tags: "government-services, health-and-care, nhs-digital, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Electronic Prescription Service Tracker - REST API

Use this API to track a patient’s prescriptions within the Electronic Prescription Service (EPS) using our Electronic Prescription Service Tracker.You can search for a list of prescriptions that meet your query parameters by providing: - patient's NHS number (mandatory)- format (mandatory)- prescription date range (optional)- prescription status (optional)- prescription version (optional)Once you find the prescription, or if you already know its details, you can retrieve it by providing:- prescription ID (mandatory)- format (mandatory)- issue number (optional)For more details, see Introduction to Spine EPS Tracker.This API is only for use when the end user is a healthcare worker, not a patient. You can vote to make it available to patients on our interactive backlog.

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/spine-electronic-prescription-service-tracker-rest
- Documentation: https://digital.nhs.uk/developer/api-catalogue/spine-electronic-prescription-service-tracker-rest

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
