---
type: "API Product"
title: "Query Accredited System Information - SOAP API"
description: "Use this API to search for details about accredited systems and the processes they support, known as interactions, which are held in the Spine Directory Service (SDS) repository. This API provides reference information on these accredited systems, along with details of how to interact with these systems. For example, use this API to retrieve the details of the API endpoint to which a PDS update message can be sent.Use this API to:- search for and obtain information on accredited systems such as their accredited system identifier (ASID) and associated messaging endpoint information.- verify whether a specific accredited system is able to handle a specified interaction.For more details, see the Spine External Interface Specification (EIS) Part 5 - Spine Directory Services (SDS)."
resource: "https://digital.nhs.uk/developer/api-catalogue/query-accredited-system-information-soap"
timestamp: "2024-04-23"
tags: "government-services, health-and-care, nhs-digital, soap-wsdl"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Query Accredited System Information - SOAP API

Use this API to search for details about accredited systems and the processes they support, known as interactions, which are held in the Spine Directory Service (SDS) repository. This API provides reference information on these accredited systems, along with details of how to interact with these systems. For example, use this API to retrieve the details of the API endpoint to which a PDS update message can be sent.Use this API to:- search for and obtain information on accredited systems such as their accredited system identifier (ASID) and associated messaging endpoint information.- verify whether a specific accredited system is able to handle a specified interaction.For more details, see the Spine External Interface Specification (EIS) Part 5 - Spine Directory Services (SDS).

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/query-accredited-system-information-soap
- Documentation: https://digital.nhs.uk/developer/api-catalogue/query-accredited-system-information-soap

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
