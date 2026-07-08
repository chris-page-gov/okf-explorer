---
type: "API Product"
title: "FHIR Converter API"
description: "Use this API to convert resource types MedicationRequest and MedicationStatements from STU3 to FHIR R4 and vice versa. You can: - post either a MedicationRequest or MedicationStatementYou cannot: - convert between any other resource typesTo use this API: - Send your source payload to this API.This API converts your source payload to the target version.You receive the converted payload in the response."
resource: "https://digital.nhs.uk/developer/api-catalogue/fhir-converter"
timestamp: "2024-04-23"
tags: "fhir, health-and-care, nhs-digital"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# FHIR Converter API

Use this API to convert resource types MedicationRequest and MedicationStatements from STU3 to FHIR R4 and vice versa. You can: - post either a MedicationRequest or MedicationStatementYou cannot: - convert between any other resource typesTo use this API: - Send your source payload to this API.This API converts your source payload to the target version.You receive the converted payload in the response.

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/fhir-converter
- Documentation: https://digital.nhs.uk/developer/api-catalogue/fhir-converter

## Credential Requirements

- unknown: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: GOV.UK API Catalogue CSV
- Source URL: https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv
