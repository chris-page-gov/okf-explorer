---
type: "API Product"
title: "Signing Service API"
description: "Use this API to digitally sign one or more prescriptions from an application that cannot communicate directly with an NHS smartcard reader. You cannot currently use this API to: - produce signatures using an algorithm other than RS1 (RSASSA-PKCS1-v1_5 with SHA-1)End users of this API must be authenticated with an NHS smartcard or modern alternative."
resource: "https://digital.nhs.uk/developer/api-catalogue/signing-service"
timestamp: "2024-04-23"
tags: "government-services, health-and-care, nhs-digital, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Signing Service API

Use this API to digitally sign one or more prescriptions from an application that cannot communicate directly with an NHS smartcard reader. You cannot currently use this API to: - produce signatures using an algorithm other than RS1 (RSASSA-PKCS1-v1_5 with SHA-1)End users of this API must be authenticated with an NHS smartcard or modern alternative.

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/signing-service
- Documentation: https://digital.nhs.uk/developer/api-catalogue/signing-service

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
