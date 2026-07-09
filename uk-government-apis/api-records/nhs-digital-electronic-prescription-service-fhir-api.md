---
type: "API Product"
title: "Electronic Prescription Service - FHIR API"
description: "Use this API to access the Electronic Prescription Service (EPS). EPS is the national service used to send electronic prescription messages between prescribers and community dispensers. Prescribers in primary and secondary care can: - create a prescription- encode data so the prescription is ready to sign- cancel a prescriptionCreating and cancelling a prescription are both done by the prescriber. Encoding data so the prescription is ready to sign is done by the prescribing system. Dispensers can: - download an individual prescription from EPS- download a batch of prescriptions from EPS- return a prescription to EPS- submit a dispense notification to EPS- withdraw a dispense notification from EPS- submit a dispense claimYou cannot currently use this API to: - view a prescription's detailed dispense history"
resource: "https://digital.nhs.uk/developer/api-catalogue/electronic-prescription-service-fhir"
timestamp: "2024-04-23"
tags: "fhir, government-services, health-and-care, nhs-digital, streaming"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Electronic Prescription Service - FHIR API

Use this API to access the Electronic Prescription Service (EPS). EPS is the national service used to send electronic prescription messages between prescribers and community dispensers. Prescribers in primary and secondary care can: - create a prescription- encode data so the prescription is ready to sign- cancel a prescriptionCreating and cancelling a prescription are both done by the prescriber. Encoding data so the prescription is ready to sign is done by the prescribing system. Dispensers can: - download an individual prescription from EPS- download a batch of prescriptions from EPS- return a prescription to EPS- submit a dispense notification to EPS- withdraw a dispense notification from EPS- submit a dispense claimYou cannot currently use this API to: - view a prescription's detailed dispense history

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/electronic-prescription-service-fhir
- Documentation: https://digital.nhs.uk/developer/api-catalogue/electronic-prescription-service-fhir

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
