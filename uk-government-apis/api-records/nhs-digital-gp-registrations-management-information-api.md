---
type: "API Product"
title: "GP Registrations Management Information API"
description: "Use this API to send real-time GP registrations metrics to NHS for service monitoring of patient EHR transfers between GP Practices. This API replaces the weekly submission of GP2GP information sent to us via a MESH mailbox, as required by GP2GP V2.2b. You can send us Management Information for registrations regardless of the transfer protocol used (GP2GP or GP Connect). Using the API, you can send us information about the following: - when a requesting practice completes a registration- the compatibility of that registration with an electronic transfer- when the requesting practice requests an EHR- when the sending practice sends an EHR- when the requesting practice received attachments/documents- when the requesting practice is ready for the user to integrate the transfer- when the requesting practice has integrated the EHR received- when an error, or negative acknowledgement occurs- degradesYou cannot: - read any management information data submitted to us"
resource: "https://digital.nhs.uk/developer/api-catalogue/gp-registrations-management-information"
timestamp: "2024-04-23"
tags: "government-services, health-and-care, mesh, nhs-digital"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# GP Registrations Management Information API

Use this API to send real-time GP registrations metrics to NHS for service monitoring of patient EHR transfers between GP Practices. This API replaces the weekly submission of GP2GP information sent to us via a MESH mailbox, as required by GP2GP V2.2b. You can send us Management Information for registrations regardless of the transfer protocol used (GP2GP or GP Connect). Using the API, you can send us information about the following: - when a requesting practice completes a registration- the compatibility of that registration with an electronic transfer- when the requesting practice requests an EHR- when the sending practice sends an EHR- when the requesting practice received attachments/documents- when the requesting practice is ready for the user to integrate the transfer- when the requesting practice has integrated the EHR received- when an error, or negative acknowledgement occurs- degradesYou cannot: - read any management information data submitted to us

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/gp-registrations-management-information
- Documentation: https://digital.nhs.uk/developer/api-catalogue/gp-registrations-management-information

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
