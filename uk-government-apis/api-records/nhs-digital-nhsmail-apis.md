---
type: "API Product"
title: "NHSmail APIs"
description: "Use these APIs to connect your local, regional or national applications or services to NHSmail.You can:- work with email messages, calendar, task and contact information - access mailboxes- get client configuration data and endpoint URLs from ExchangeThe Microsoft APIs used are:- Exchange Web Service (EWS) Managed API 2.0 - to work with mailboxes, messages, calendars, tasks and contacts- Exchange Web Service (EWS) API - to work with mailboxes, messages, calendars, tasks and contacts- SOAP Autodiscover - to get client configuration data and endpoint URLsFor compatibility with Office 365, use EWS Managed API 2.0 and not the EWS API."
resource: "https://digital.nhs.uk/developer/api-catalogue/nhsmail"
timestamp: "2024-04-23"
tags: "government-services, health-and-care, nhs-digital, soap-wsdl"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# NHSmail APIs

Use these APIs to connect your local, regional or national applications or services to NHSmail.You can:- work with email messages, calendar, task and contact information - access mailboxes- get client configuration data and endpoint URLs from ExchangeThe Microsoft APIs used are:- Exchange Web Service (EWS) Managed API 2.0 - to work with mailboxes, messages, calendars, tasks and contacts- Exchange Web Service (EWS) API - to work with mailboxes, messages, calendars, tasks and contacts- SOAP Autodiscover - to get client configuration data and endpoint URLsFor compatibility with Office 365, use EWS Managed API 2.0 and not the EWS API.

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/nhsmail
- Documentation: https://digital.nhs.uk/developer/api-catalogue/nhsmail

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
