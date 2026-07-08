---
type: "API Product"
title: "Out Of Hours"
description: "Use this message integration to send details of an out of hours (OOH) assessment from an out of hours GP system to the patient's registered GP. It uses MESH to send and receive messages.The message payload is actually not that standard, as explained below."
resource: "https://digital.nhs.uk/developer/api-catalogue/out-of-hours"
timestamp: "2024-04-23"
tags: "health-and-care, mesh, nhs-digital"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Out Of Hours

Use this message integration to send details of an out of hours (OOH) assessment from an out of hours GP system to the patient's registered GP. It uses MESH to send and receive messages.The message payload is actually not that standard, as explained below.

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
- Licence: Not specified (not-specified)
- Licence basis: not-specified
- Licence source: not-specified
- Licence confidence: 0.2
- Quality band: high

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/out-of-hours
- Documentation: https://digital.nhs.uk/developer/api-catalogue/out-of-hours

## Credential Requirements

- approval_required: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: GOV.UK API Catalogue CSV
- Source URL: https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv
