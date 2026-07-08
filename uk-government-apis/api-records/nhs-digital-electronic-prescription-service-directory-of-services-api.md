---
type: "API Product"
title: "Electronic Prescription Service Directory of Services API"
description: "Use this API to access information about dispensing services, including searching for dispensers who can provide services for a patient with a given location and urgency.You can:- search for a dispenser by its location and opening hours- search for a specific dispenser that the patient might have namedThe API combines data from both the Directory of Services (DoS) and Electronic Transmission of Prescriptions (ETP) web services (formerly known as NHS Choices).It uses DoS for user authentication.Do not use this API if you are building GP software - instead use Electronic Transmission of Prescriptions (ETP) web services directly, as it provides access to information you'll need, for example, information such as dispensing appliance contractors."
resource: "https://digital.nhs.uk/developer/api-catalogue/electronic-prescription-service-directory-of-services"
timestamp: "2024-04-23"
tags: "government-services, health-and-care, nhs-digital, planning-and-property, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Electronic Prescription Service Directory of Services API

Use this API to access information about dispensing services, including searching for dispensers who can provide services for a patient with a given location and urgency.You can:- search for a dispenser by its location and opening hours- search for a specific dispenser that the patient might have namedThe API combines data from both the Directory of Services (DoS) and Electronic Transmission of Prescriptions (ETP) web services (formerly known as NHS Choices).It uses DoS for user authentication.Do not use this API if you are building GP software - instead use Electronic Transmission of Prescriptions (ETP) web services directly, as it provides access to information you'll need, for example, information such as dispensing appliance contractors.

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/electronic-prescription-service-directory-of-services
- Documentation: https://digital.nhs.uk/developer/api-catalogue/electronic-prescription-service-directory-of-services

## Credential Requirements

- unknown: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: GOV.UK API Catalogue CSV
- Source URL: https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv
