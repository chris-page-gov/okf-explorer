---
type: "API Product"
title: "Digital Medicine - FHIR"
description: "Use this integration to notify a patient's registered GP practice about care services delivered at a pharmacy.You can send notifications about:- an immunisation given- an emergency medication dispensed without a prescription- a minor illness referral consultationThis integration uses MESH to send and receive messages.The following use cases are now retired and you cannot use them:- a medication review- an appliance use review- a New Medicine Service (NMS) appointmentFor more details, see status."
resource: "https://digital.nhs.uk/developer/api-catalogue/digital-medicine-fhir"
timestamp: "2024-04-23"
tags: "fhir, government-services, health-and-care, mesh, nhs-digital, streaming"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Digital Medicine - FHIR

Use this integration to notify a patient's registered GP practice about care services delivered at a pharmacy.You can send notifications about:- an immunisation given- an emergency medication dispensed without a prescription- a minor illness referral consultationThis integration uses MESH to send and receive messages.The following use cases are now retired and you cannot use them:- a medication review- an appliance use review- a New Medicine Service (NMS) appointmentFor more details, see status.

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
- Quality band: high

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/digital-medicine-fhir
- Documentation: https://digital.nhs.uk/developer/api-catalogue/digital-medicine-fhir

## Credential Requirements

- approval_required: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: GOV.UK API Catalogue CSV
- Source URL: https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv
