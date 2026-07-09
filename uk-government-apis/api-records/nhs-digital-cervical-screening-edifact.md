---
type: "API Product"
title: "Cervical Screening - EDIFACT"
description: "Use this messaging integration to send cervical screening test results from screening laboratories and receive them at the patient's registered GP practice and NHAIS systems. You can:- send and receive cytology test results- send and receive human papillomavirus (HPV) immunisation dataWe also use this integration to send and receive a patient's test results history between NHAIS systems, including between England and Wales: This integration uses MESH to send and receive UN/EDIFACT based messages."
resource: "https://digital.nhs.uk/developer/api-catalogue/cervical-screening-edifact"
timestamp: "2024-04-23"
tags: "edifact, health-and-care, mesh, nhs-digital"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Cervical Screening - EDIFACT

Use this messaging integration to send cervical screening test results from screening laboratories and receive them at the patient's registered GP practice and NHAIS systems. You can:- send and receive cytology test results- send and receive human papillomavirus (HPV) immunisation dataWe also use this integration to send and receive a patient's test results history between NHAIS systems, including between England and Wales: This integration uses MESH to send and receive UN/EDIFACT based messages.

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/cervical-screening-edifact
- Documentation: https://digital.nhs.uk/developer/api-catalogue/cervical-screening-edifact

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
