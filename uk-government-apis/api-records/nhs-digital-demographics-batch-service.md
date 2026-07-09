---
type: "API Product"
title: "Demographics Batch Service"
description: "Use this batch message integration to submit a file of patient information to the Spine for tracing against the Personal Demographics Service (PDS) for direct care purposes.The service is provided for organisations that do not want to write their own software - typically NHS trusts or local authorities.It returns a limited set of PDS data items, as for PDS SMSP.It requires PDS access approval before you can use it.You can:- Install a DBS client in a secure location, for example in a server room not a desktop PC- download and complete the DBS End Point Registration form (see interactions below) and submit it to the DBS Implementation Team at [email protected]. You should receive endpoint information within 7 days.- submit a test file to DBS to confirm connectivity over Secure FTP- use the DBS client to submit batch trace requests and receive batch responses to themDBS requires a secure network connection. It is an offline service so does not require smartcards."
resource: "https://digital.nhs.uk/developer/api-catalogue/demographics-batch-service"
timestamp: "2024-04-23"
tags: "government-services, health-and-care, nhs-digital, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Demographics Batch Service

Use this batch message integration to submit a file of patient information to the Spine for tracing against the Personal Demographics Service (PDS) for direct care purposes.The service is provided for organisations that do not want to write their own software - typically NHS trusts or local authorities.It returns a limited set of PDS data items, as for PDS SMSP.It requires PDS access approval before you can use it.You can:- Install a DBS client in a secure location, for example in a server room not a desktop PC- download and complete the DBS End Point Registration form (see interactions below) and submit it to the DBS Implementation Team at [email protected]. You should receive endpoint information within 7 days.- submit a test file to DBS to confirm connectivity over Secure FTP- use the DBS client to submit batch trace requests and receive batch responses to themDBS requires a secure network connection. It is an offline service so does not require smartcards.

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
- DCAT term: `dcat:DataService`
- OpenAPI term: `OpenAPI Object`

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/demographics-batch-service
- Documentation: https://digital.nhs.uk/developer/api-catalogue/demographics-batch-service

## Standards Alignment

This generated record is standards-alignable, not standards-conformant by itself. DCAT-AP conformance needs an RDF export; OpenAPI conformance needs a complete `openapi` document.

- DCAT / DCAT-AP: `dcat:DataService`; export status `data-service-with-gaps`.
- DCAT missing requirements: `dcterms:license`
- OpenAPI: `OpenAPI Object`; export status `service-stub-with-gaps`.
- OpenAPI security scheme: `metadata-only`.
- OpenAPI missing requirements: `info.license`
- Crosswalk: [OKF Standards Crosswalk](../../docs/okf-standards-crosswalk.md)

## Credential Requirements

- approval_required: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: GOV.UK API Catalogue CSV
- Source URL: https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv
