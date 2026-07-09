---
type: "API Product"
title: "Personal Demographics Service Notifications - FHIR"
description: "Use this integration to receive notifications about changes to a patient's demographic details, including:- birth notifications - although another option is PDS HL7 V3 API- death notifications- change of address- change of GP- any record change (beta) - to notify subscribers to synchronise their local PDS patient databaseWe share information about these events with healthcare workers in other organisations such as GPs, Emergency Departments and Local Authorities.This integration uses a publish-subscribe model - the sending system publishes events to National Events Management Service (NEMS), and NEMS forwards the events to all subscribed systems via Message Exchange for Social Care and Health (MESH).For example, when we update Personal Demographics Service (PDS) with a birth, PDS sends a birth notification event containing information about the birth to NEMS. NEMS then sends the event to all healthcare workers who have subscribed to receive birth notifications."
resource: "https://digital.nhs.uk/developer/api-catalogue/personal-demographics-service-notifications-fhir"
timestamp: "2024-04-23"
tags: "fhir, geospatial, government-services, health-and-care, hl7-v3, mesh, nhs-digital, planning-and-property, streaming"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Personal Demographics Service Notifications - FHIR

Use this integration to receive notifications about changes to a patient's demographic details, including:- birth notifications - although another option is PDS HL7 V3 API- death notifications- change of address- change of GP- any record change (beta) - to notify subscribers to synchronise their local PDS patient databaseWe share information about these events with healthcare workers in other organisations such as GPs, Emergency Departments and Local Authorities.This integration uses a publish-subscribe model - the sending system publishes events to National Events Management Service (NEMS), and NEMS forwards the events to all subscribed systems via Message Exchange for Social Care and Health (MESH).For example, when we update Personal Demographics Service (PDS) with a birth, PDS sends a birth notification event containing information about the birth to NEMS. NEMS then sends the event to all healthcare workers who have subscribed to receive birth notifications.

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/personal-demographics-service-notifications-fhir
- Documentation: https://digital.nhs.uk/developer/api-catalogue/personal-demographics-service-notifications-fhir

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
