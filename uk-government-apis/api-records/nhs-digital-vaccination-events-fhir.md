---
type: "API Product"
title: "Vaccination Events - FHIR"
description: "Use this integration to publish or receive messages about changes to a patient's vaccination details, including:- new vaccinations- updated vaccination details- deleted vaccination detailsThis service currently covers childhood vaccinations up to the age of 19, and for direct care purposes only, in the context of Digital Child Health. If you'd like to use this API to publish or consume other vaccination types across all age groups, contact [email protected].Using a publish-subscribe model, we share information about these events with healthcare workers in other organisations such as GPs, Emergency Departments and Local Authorities.This integration uses a publish-subscribe model - the sending system publishes events to National Events Management Service (NEMS), and NEMS forwards the events to all subscribed systems via MESH.For example, when a GP system records a vaccination, it sends an event message containing the vaccination details to NEMS. NEMS then sends the message to all healthcare workers who have subscribed to receive vaccination event messages."
resource: "https://digital.nhs.uk/developer/api-catalogue/vaccination-events-fhir"
timestamp: "2024-04-23"
tags: "fhir, government-services, health-and-care, mesh, nhs-digital"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Vaccination Events - FHIR

Use this integration to publish or receive messages about changes to a patient's vaccination details, including:- new vaccinations- updated vaccination details- deleted vaccination detailsThis service currently covers childhood vaccinations up to the age of 19, and for direct care purposes only, in the context of Digital Child Health. If you'd like to use this API to publish or consume other vaccination types across all age groups, contact [email protected].Using a publish-subscribe model, we share information about these events with healthcare workers in other organisations such as GPs, Emergency Departments and Local Authorities.This integration uses a publish-subscribe model - the sending system publishes events to National Events Management Service (NEMS), and NEMS forwards the events to all subscribed systems via MESH.For example, when a GP system records a vaccination, it sends an event message containing the vaccination details to NEMS. NEMS then sends the message to all healthcare workers who have subscribed to receive vaccination event messages.

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/vaccination-events-fhir
- Documentation: https://digital.nhs.uk/developer/api-catalogue/vaccination-events-fhir

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
