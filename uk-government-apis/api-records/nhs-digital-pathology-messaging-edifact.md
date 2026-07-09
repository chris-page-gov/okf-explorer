---
type: "API Product"
title: "Pathology Messaging - EDIFACT"
description: "Use this integration to receive structured pathology test results in GP practices from pathology laboratories.This integration uses MESH to send and receive UN/EDIFACT based messages. For more details, see the Pathology EDIFACT v1.003 Standard.If you are building a system to receive pathology test results, you can use our Lab Results adaptor to receive these EDIFACT results via an easy-to-use FHIR-compliant format. Before you begin any development work using this integration, contact us to discuss your best options."
resource: "https://digital.nhs.uk/developer/api-catalogue/pathology-messaging-edifact"
timestamp: "2024-04-23"
tags: "edifact, fhir, health-and-care, mesh, nhs-digital, planning-and-property"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Pathology Messaging - EDIFACT

Use this integration to receive structured pathology test results in GP practices from pathology laboratories.This integration uses MESH to send and receive UN/EDIFACT based messages. For more details, see the Pathology EDIFACT v1.003 Standard.If you are building a system to receive pathology test results, you can use our Lab Results adaptor to receive these EDIFACT results via an easy-to-use FHIR-compliant format. Before you begin any development work using this integration, contact us to discuss your best options.

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/pathology-messaging-edifact
- Documentation: https://digital.nhs.uk/developer/api-catalogue/pathology-messaging-edifact

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
