---
type: "API Product"
title: "Booking and Referral - FHIR API"
description: "This API forms part of the Booking and Referral Standard (BaRS). This API specification should be used in conjunction with the BaRS implementation guide for your use case.Use this API to send booking and referral information between NHS service providers. You can: - get a specific booking- get bookings for a patient- process a message, either a booking or a referral- get message definition- get capability statement- get a specific referral- get referrals for a patient- get slotsThe following describes the end-to-end process: - Send a request from your sender application to this API, along with a service identifier header.- This API redirects the request to the service associated with the service identifier header.- The target backend handles the request and sends a response back to this API.- This API returns the response to your sender application.In some Applications the target may send a follow up request to indicate the outcome of a request.For a non-technical overview of how to build software that deals with referrals and bookings, see Building healthcare software - referrals and bookings."
resource: "https://digital.nhs.uk/developer/api-catalogue/booking-and-referral-fhir"
timestamp: "2024-04-23"
tags: "fhir, government-services, health-and-care, nhs-digital, planning-and-property"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Booking and Referral - FHIR API

This API forms part of the Booking and Referral Standard (BaRS). This API specification should be used in conjunction with the BaRS implementation guide for your use case.Use this API to send booking and referral information between NHS service providers. You can: - get a specific booking- get bookings for a patient- process a message, either a booking or a referral- get message definition- get capability statement- get a specific referral- get referrals for a patient- get slotsThe following describes the end-to-end process: - Send a request from your sender application to this API, along with a service identifier header.- This API redirects the request to the service associated with the service identifier header.- The target backend handles the request and sends a response back to this API.- This API returns the response to your sender application.In some Applications the target may send a follow up request to indicate the outcome of a request.For a non-technical overview of how to build software that deals with referrals and bookings, see Building healthcare software - referrals and bookings.

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/booking-and-referral-fhir
- Documentation: https://digital.nhs.uk/developer/api-catalogue/booking-and-referral-fhir

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
