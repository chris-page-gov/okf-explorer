---
type: "API Product"
title: "Ambulance Data Submission - FHIR API"
description: "Use this API to submit ambulance data to our Data Processing Service (DPS) so that it can be made available for analysis and review by NHS England and ambulance trusts. Ambulance data is information relating to emergency calls (999, 111 and others), received at an Emergency Operations Centre (EOC) and processed into a Computer Aided Despatch (CAD) system, including: - call details- response details - including response times and episode outcome times patient- contact details - including patient demographics, patient response details, patient information, injury information, patient assessment, medication, observations, diagnoses, conveying outcome, safeguarding and public health informationYou can: - post ambulance data individually or in batchesYou cannot: - read any of the records stored in DPSThe API is asynchronous - when you submit data, it acknowledges receipt without validating or processing the data first. To receive error notifications, you need to use MESH. The following diagram illustrates the end-to-end process: The following describes the end-to-end process: - The ambulance trust system sends the ambulance data to the Ambulance Data Submission API.- The Ambulance Data…"
resource: "https://digital.nhs.uk/developer/api-catalogue/ambulance-data-submission-fhir"
timestamp: "2024-04-23"
tags: "fhir, government-services, health-and-care, mesh, nhs-digital, streaming"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Ambulance Data Submission - FHIR API

Use this API to submit ambulance data to our Data Processing Service (DPS) so that it can be made available for analysis and review by NHS England and ambulance trusts. Ambulance data is information relating to emergency calls (999, 111 and others), received at an Emergency Operations Centre (EOC) and processed into a Computer Aided Despatch (CAD) system, including: - call details- response details - including response times and episode outcome times patient- contact details - including patient demographics, patient response details, patient information, injury information, patient assessment, medication, observations, diagnoses, conveying outcome, safeguarding and public health informationYou can: - post ambulance data individually or in batchesYou cannot: - read any of the records stored in DPSThe API is asynchronous - when you submit data, it acknowledges receipt without validating or processing the data first. To receive error notifications, you need to use MESH. The following diagram illustrates the end-to-end process: The following describes the end-to-end process: - The ambulance trust system sends the ambulance data to the Ambulance Data Submission API.- The Ambulance Data…

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/ambulance-data-submission-fhir
- Documentation: https://digital.nhs.uk/developer/api-catalogue/ambulance-data-submission-fhir

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
