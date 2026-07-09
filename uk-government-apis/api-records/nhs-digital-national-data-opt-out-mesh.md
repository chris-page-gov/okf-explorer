---
type: "API Product"
title: "National Data Opt-out - MESH"
description: "As a GP system, use this integration to:- submit a list of NHS numbers to the National Data Opt-outs Service- receive a list back with the NHS numbers removed for those patients who have opted out of their data being usedYou can use the Check for National Data Opt-outs Service to get existing National Data Opt-out preferences for one or more patients. If your use case is not met by the National Data Opt-outs Service, contact us.This integration uses MESH to send and receive messages."
resource: "https://digital.nhs.uk/developer/api-catalogue/national-data-opt-out-service-mesh"
timestamp: "2024-04-23"
tags: "government-services, health-and-care, mesh, nhs-digital"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# National Data Opt-out - MESH

As a GP system, use this integration to:- submit a list of NHS numbers to the National Data Opt-outs Service- receive a list back with the NHS numbers removed for those patients who have opted out of their data being usedYou can use the Check for National Data Opt-outs Service to get existing National Data Opt-out preferences for one or more patients. If your use case is not met by the National Data Opt-outs Service, contact us.This integration uses MESH to send and receive messages.

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/national-data-opt-out-service-mesh
- Documentation: https://digital.nhs.uk/developer/api-catalogue/national-data-opt-out-service-mesh

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
