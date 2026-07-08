---
type: "API Product"
title: "National Event Management Service - FHIR API"
description: "Use this API to publish and subscribe to patient-centric healthcare event messages with the National Events Management Service (NEMS). This national service is implemented on the NHS Spine.As a sending system, you can:- publish an event messageAs a subscribing system, you can:- create a subscription- read a subscription - delete a subscriptionThis API uses a publish-subscribe model - the sending system publishes specific range of healthcare event messages to National Events Management Service (NEMS), and NEMS forwards the events to all subscribed systems via MESH.NEMS authorises a specific list of system suppliers and health and social care organisations to publish information as events.For more details, see the Introduction to the National Events Management Service."
resource: "https://digital.nhs.uk/developer/api-catalogue/national-events-management-service-fhir"
timestamp: "2024-04-23"
tags: "fhir, government-services, health-and-care, mesh, nhs-digital"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# National Event Management Service - FHIR API

Use this API to publish and subscribe to patient-centric healthcare event messages with the National Events Management Service (NEMS). This national service is implemented on the NHS Spine.As a sending system, you can:- publish an event messageAs a subscribing system, you can:- create a subscription- read a subscription - delete a subscriptionThis API uses a publish-subscribe model - the sending system publishes specific range of healthcare event messages to National Events Management Service (NEMS), and NEMS forwards the events to all subscribed systems via MESH.NEMS authorises a specific list of system suppliers and health and social care organisations to publish information as events.For more details, see the Introduction to the National Events Management Service.

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/national-events-management-service-fhir
- Documentation: https://digital.nhs.uk/developer/api-catalogue/national-events-management-service-fhir

## Credential Requirements

- unknown: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: GOV.UK API Catalogue CSV
- Source URL: https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv
