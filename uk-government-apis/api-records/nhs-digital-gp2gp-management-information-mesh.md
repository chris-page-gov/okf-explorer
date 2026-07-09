---
type: "API Product"
title: "GP2GP Management Information MESH"
description: "Use this integration to provide information to us at NHS Digital on the progress of the patient migration process between GP practices (GP2GP). This involves recording patient registration activity in the GP systems at specific stages in the patient migration process.This integration uses MESH to send and receive messages.For details, see NPFIT-PC-BLD-0173.01 GP2GP UC 2 Harvest and Prepare Management Information which describes the high level use case for reporting capability required by GP2GP 2.2b."
resource: "https://digital.nhs.uk/developer/api-catalogue/gp2gp-management-information-mesh"
timestamp: "2024-04-23"
tags: "health-and-care, mesh, nhs-digital"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# GP2GP Management Information MESH

Use this integration to provide information to us at NHS Digital on the progress of the patient migration process between GP practices (GP2GP). This involves recording patient registration activity in the GP systems at specific stages in the patient migration process.This integration uses MESH to send and receive messages.For details, see NPFIT-PC-BLD-0173.01 GP2GP UC 2 Harvest and Prepare Management Information which describes the high level use case for reporting capability required by GP2GP 2.2b.

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/gp2gp-management-information-mesh
- Documentation: https://digital.nhs.uk/developer/api-catalogue/gp2gp-management-information-mesh

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
