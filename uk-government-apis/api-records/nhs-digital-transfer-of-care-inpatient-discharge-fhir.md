---
type: "API Product"
title: "Transfer of Care Inpatient Discharge - FHIR"
description: "Use this integration to create and transmit documents containing Transfer of Care information supporting an inpatient and day case discharge.An Inpatient and Day Case Discharge Summary Document (also known as an ITK3 eDischarge) is an ITK3 FHIR document containing Transfer of Care information supporting inpatient and day case discharges typically between an acute hospital and a GP practice.For example, a patient attends hospital for elective hip replacement surgery and is discharged by her consultant after a couple of days. The consultant completes and sends an eDischarge document to her GP.This integration uses MESH to send and receive messages. It is part of a suite of Transfer of Care FHIR message specifications.Before you begin any development work using this integration, contact us to discuss your best options."
resource: "https://digital.nhs.uk/developer/api-catalogue/transfer-of-care-inpatient-discharge-fhir"
timestamp: "2024-04-23"
tags: "fhir, health-and-care, mesh, nhs-digital"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Transfer of Care Inpatient Discharge - FHIR

Use this integration to create and transmit documents containing Transfer of Care information supporting an inpatient and day case discharge.An Inpatient and Day Case Discharge Summary Document (also known as an ITK3 eDischarge) is an ITK3 FHIR document containing Transfer of Care information supporting inpatient and day case discharges typically between an acute hospital and a GP practice.For example, a patient attends hospital for elective hip replacement surgery and is discharged by her consultant after a couple of days. The consultant completes and sends an eDischarge document to her GP.This integration uses MESH to send and receive messages. It is part of a suite of Transfer of Care FHIR message specifications.Before you begin any development work using this integration, contact us to discuss your best options.

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/transfer-of-care-inpatient-discharge-fhir
- Documentation: https://digital.nhs.uk/developer/api-catalogue/transfer-of-care-inpatient-discharge-fhir

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
