---
type: "API Product"
title: "Vaccination"
description: "Use these integrations to provide vaccination information to us at NHS Digital.You can send us information relating to:- coronavirus (COVID-19) vaccinations- COVID-19 extended data attributes- COVID-19 hourly vaccination aggregate data for the NHS Foundry- seasonal flu vaccinations- measles, mumps and rubella (MMR) vaccinationsThese integrations specify the flow of vaccination-related information from healthcare settings including:- hospital hubs - NHS providers vaccinating on site - local vaccine services – community or primary care led services which could include primary care facilities, retail, community facilities, temporary structures or roving teams - vaccination centres – large sites such as sports and conference venues set up for high volumes of people These integrations use MESH to send and receive pipe-delimited (|) and not-sign-delimited (¬) files.For more details on how to interact with end users to collect COVID-19 information safely, see the functional specifications under 'Additional guidance'.For FHIR standards relating to the flow of information directly back to the patient's GP, see Digital Medicine - FHIR.For FHIR standards relating to the flow of information t…"
resource: "https://digital.nhs.uk/developer/api-catalogue/vaccination"
timestamp: "2024-04-23"
tags: "fhir, health-and-care, mesh, nhs-digital"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Vaccination

Use these integrations to provide vaccination information to us at NHS Digital.You can send us information relating to:- coronavirus (COVID-19) vaccinations- COVID-19 extended data attributes- COVID-19 hourly vaccination aggregate data for the NHS Foundry- seasonal flu vaccinations- measles, mumps and rubella (MMR) vaccinationsThese integrations specify the flow of vaccination-related information from healthcare settings including:- hospital hubs - NHS providers vaccinating on site - local vaccine services – community or primary care led services which could include primary care facilities, retail, community facilities, temporary structures or roving teams - vaccination centres – large sites such as sports and conference venues set up for high volumes of people These integrations use MESH to send and receive pipe-delimited (|) and not-sign-delimited (¬) files.For more details on how to interact with end users to collect COVID-19 information safely, see the functional specifications under 'Additional guidance'.For FHIR standards relating to the flow of information directly back to the patient's GP, see Digital Medicine - FHIR.For FHIR standards relating to the flow of information t…

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/vaccination
- Documentation: https://digital.nhs.uk/developer/api-catalogue/vaccination

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
