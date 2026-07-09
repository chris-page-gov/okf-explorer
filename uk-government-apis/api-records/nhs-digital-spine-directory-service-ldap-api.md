---
type: "API Product"
title: "Spine Directory Service - LDAP API"
description: "Use this API to access details from the Spine Directory Service (SDS) relating to:- organisations - NHS organisations, their sites and departments- people - healthcare workers who are Spine users, including their organisation and role- systems registered with Spine"
resource: "https://digital.nhs.uk/developer/api-catalogue/spine-directory-service-ldap"
timestamp: "2024-04-23"
tags: "government-services, health-and-care, nhs-digital, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Spine Directory Service - LDAP API

Use this API to access details from the Spine Directory Service (SDS) relating to:- organisations - NHS organisations, their sites and departments- people - healthcare workers who are Spine users, including their organisation and role- systems registered with Spine

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/spine-directory-service-ldap
- Documentation: https://digital.nhs.uk/developer/api-catalogue/spine-directory-service-ldap

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
