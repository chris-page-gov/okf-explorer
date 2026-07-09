---
type: "API Product"
title: "Vaccination Adverse Reactions COVID-19"
description: "Use this integration to provide information to us at NHS Digital on adverse reactions.You can send us information on adverse reactions relating to: - coronavirus (COVID-19) vaccinations.This integration specifies the flow of information relating to vaccination-related adverse reactions from any healthcare setting including:- hospital hubs - NHS providers vaccinating on site - local vaccine services – community or primary care led services which could include primary care facilities, retail, community facilities, temporary structures or roving teams - vaccination centres – large sites such as sports and conference venues set up for high volumes of people This integration uses MESH to send pipe-delimited files to us.For FHIR standards relating to the flow of information directly back to the patient's GP, see Digital Medicine - FHIR.Regulatory reportingThis information flow captures any adverse reactions which occur within the first fifteen minutes after administration of the coronavirus (COVID-19) vaccination. At NHS Digital, we must share this information with the Medicines and Healthcare products Regulatory Agency (MHRA) Yellow Card scheme. This scheme is the UK system for collect…"
resource: "https://digital.nhs.uk/developer/api-catalogue/vaccination-adverse-reactions-covid-19"
timestamp: "2024-04-23"
tags: "fhir, health-and-care, mesh, nhs-digital"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Vaccination Adverse Reactions COVID-19

Use this integration to provide information to us at NHS Digital on adverse reactions.You can send us information on adverse reactions relating to: - coronavirus (COVID-19) vaccinations.This integration specifies the flow of information relating to vaccination-related adverse reactions from any healthcare setting including:- hospital hubs - NHS providers vaccinating on site - local vaccine services – community or primary care led services which could include primary care facilities, retail, community facilities, temporary structures or roving teams - vaccination centres – large sites such as sports and conference venues set up for high volumes of people This integration uses MESH to send pipe-delimited files to us.For FHIR standards relating to the flow of information directly back to the patient's GP, see Digital Medicine - FHIR.Regulatory reportingThis information flow captures any adverse reactions which occur within the first fifteen minutes after administration of the coronavirus (COVID-19) vaccination. At NHS Digital, we must share this information with the Medicines and Healthcare products Regulatory Agency (MHRA) Yellow Card scheme. This scheme is the UK system for collect…

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/vaccination-adverse-reactions-covid-19
- Documentation: https://digital.nhs.uk/developer/api-catalogue/vaccination-adverse-reactions-covid-19

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
