---
type: "API Product"
title: "Immunisation History - FHIR API"
description: "Use this API to access a patient’s immunisation history. You can: - get a patient's coronavirus (COVID-19) immunisation history, based on their NHS number You cannot currently use this API to: - get details of other types of immunisationYou get the following data: - immunisation event details- patient demographic details, as captured at the point of immunisationThe patient demographic details might differ from those held in the Personal Demographics Service (PDS).To get demographic details from PDS, use the Personal Demographics Service FHIR API. Data availability, timing and quality All immunisation records are verified to ensure the NHS number is correct before making them available via the API. In most cases this is automatic, and the record is available within 48 hours of the immunisation event, sometimes sooner. Where automated NHS number verification fails, we verify the NHS number manually, which can take longer. In a very small number of cases, we are unable to verify the NHS number, and we do not make the immunisation record available at all."
resource: "https://digital.nhs.uk/developer/api-catalogue/immunisation-history-fhir"
timestamp: "2024-04-23"
tags: "fhir, government-services, health-and-care, nhs-digital"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Immunisation History - FHIR API

Use this API to access a patient’s immunisation history. You can: - get a patient's coronavirus (COVID-19) immunisation history, based on their NHS number You cannot currently use this API to: - get details of other types of immunisationYou get the following data: - immunisation event details- patient demographic details, as captured at the point of immunisationThe patient demographic details might differ from those held in the Personal Demographics Service (PDS).To get demographic details from PDS, use the Personal Demographics Service FHIR API. Data availability, timing and quality All immunisation records are verified to ensure the NHS number is correct before making them available via the API. In most cases this is automatic, and the record is available within 48 hours of the immunisation event, sometimes sooner. Where automated NHS number verification fails, we verify the NHS number manually, which can take longer. In a very small number of cases, we are unable to verify the NHS number, and we do not make the immunisation record available at all.

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
- Quality band: medium

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/immunisation-history-fhir
- Documentation: https://digital.nhs.uk/developer/api-catalogue/immunisation-history-fhir

## Credential Requirements

- unknown: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: GOV.UK API Catalogue CSV
- Source URL: https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv
