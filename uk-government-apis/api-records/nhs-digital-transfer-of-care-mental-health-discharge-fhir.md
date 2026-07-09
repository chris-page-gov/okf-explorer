---
type: "API Product"
title: "Transfer of Care Mental Health Discharge - FHIR"
description: "Use this integration to create and transmit documents containing Transfer of Care information supporting a mental health discharge.An Inpatient and Day Case Discharge Summary (Mental Health) Document (also known as an ITK3 Mental Health Discharge) is an ITK3 FHIR document containing Transfer of Care information supporting a mental health adult discharge summary to a GP practice.For example, following an apparent overdose, a patient is admitted to a psychiatric ward for evaluation and treatment which is successful. He is discharged and the consultant sends a copy of the Mental Health Discharge to his GP.This API is a messaging API which uses MESH to send and receive messages. It is part of a suite of Transfer of Care FHIR message specifications.Before you begin any development work using this integration, contact us to discuss your best options."
resource: "https://digital.nhs.uk/developer/api-catalogue/transfer-of-care-mental-health-discharge-fhir"
timestamp: "2024-04-23"
tags: "fhir, health-and-care, mesh, nhs-digital"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Transfer of Care Mental Health Discharge - FHIR

Use this integration to create and transmit documents containing Transfer of Care information supporting a mental health discharge.An Inpatient and Day Case Discharge Summary (Mental Health) Document (also known as an ITK3 Mental Health Discharge) is an ITK3 FHIR document containing Transfer of Care information supporting a mental health adult discharge summary to a GP practice.For example, following an apparent overdose, a patient is admitted to a psychiatric ward for evaluation and treatment which is successful. He is discharged and the consultant sends a copy of the Mental Health Discharge to his GP.This API is a messaging API which uses MESH to send and receive messages. It is part of a suite of Transfer of Care FHIR message specifications.Before you begin any development work using this integration, contact us to discuss your best options.

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/transfer-of-care-mental-health-discharge-fhir
- Documentation: https://digital.nhs.uk/developer/api-catalogue/transfer-of-care-mental-health-discharge-fhir

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
