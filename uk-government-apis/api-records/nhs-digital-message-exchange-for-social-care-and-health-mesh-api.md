---
type: "API Product"
title: "Message Exchange for Social Care and Health (MESH) API"
description: "You interact with MESH by making calls to this API from your application. With the API, you can: - check the number of messages in your inbox- send a message, or a larger message as series of chunks- download a message, or a larger message which was sent to you as a series of chunks- acknowledge the successful download of a message, which removes it from your inbox- get the identifiers of messages in your inbox that are ready for download- track the status of messages that you sent from your outbox- look up the mailbox of an organisation you want to send data to- validate your mailbox every 24 hours to let Spine know it's still active"
resource: "https://digital.nhs.uk/developer/api-catalogue/message-exchange-for-social-care-and-health-api"
timestamp: "2024-04-23"
tags: "health-and-care, mesh, nhs-digital"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Message Exchange for Social Care and Health (MESH) API

You interact with MESH by making calls to this API from your application. With the API, you can: - check the number of messages in your inbox- send a message, or a larger message as series of chunks- download a message, or a larger message which was sent to you as a series of chunks- acknowledge the successful download of a message, which removes it from your inbox- get the identifiers of messages in your inbox that are ready for download- track the status of messages that you sent from your outbox- look up the mailbox of an organisation you want to send data to- validate your mailbox every 24 hours to let Spine know it's still active

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/message-exchange-for-social-care-and-health-api
- Documentation: https://digital.nhs.uk/developer/api-catalogue/message-exchange-for-social-care-and-health-api

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
