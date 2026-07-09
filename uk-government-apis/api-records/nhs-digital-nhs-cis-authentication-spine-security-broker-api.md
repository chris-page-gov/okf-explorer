---
type: "API Product"
title: "NHS CIS Authentication (Spine Security Broker) API"
description: "Use this API to verify the identity of healthcare workers in England, such as NHS staff. It provides a single sign-on capability across local and national digital services using physical and virtual smartcards.This API is also known as the Spine Security Broker (SSB), and is part of the NHS Care Identity Service (CIS).You can:- access the Identity Server which serves up SSO Tokens and manages the sessions for users who have been successfully authenticated- access the Identity Agent on the end user's workstation, which mediates the authentication transaction and serves subsequent user information on demand as part of the application's authorisation process- access the Client Signing Interface, which provides client-side digital signing functions for the purposes of Content Commitment. This interface primarily uses cryptographic functions that execute on a user’s smart card.Users can only be authenticated if they are formally registered on the Spine. This includes creating a user profile, stored in the Spine Directory Service (SDS), containing the user’s roles and other information that the Registration Authority or Service deems necessary to make appropriate data access decisions.T…"
resource: "https://digital.nhs.uk/developer/api-catalogue/nhs-cis-authentication-spine-security-broker"
timestamp: "2024-04-23"
tags: "government-services, health-and-care, nhs-digital, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# NHS CIS Authentication (Spine Security Broker) API

Use this API to verify the identity of healthcare workers in England, such as NHS staff. It provides a single sign-on capability across local and national digital services using physical and virtual smartcards.This API is also known as the Spine Security Broker (SSB), and is part of the NHS Care Identity Service (CIS).You can:- access the Identity Server which serves up SSO Tokens and manages the sessions for users who have been successfully authenticated- access the Identity Agent on the end user's workstation, which mediates the authentication transaction and serves subsequent user information on demand as part of the application's authorisation process- access the Client Signing Interface, which provides client-side digital signing functions for the purposes of Content Commitment. This interface primarily uses cryptographic functions that execute on a user’s smart card.Users can only be authenticated if they are formally registered on the Spine. This includes creating a user profile, stored in the Spine Directory Service (SDS), containing the user’s roles and other information that the Registration Authority or Service deems necessary to make appropriate data access decisions.T…

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/nhs-cis-authentication-spine-security-broker
- Documentation: https://digital.nhs.uk/developer/api-catalogue/nhs-cis-authentication-spine-security-broker

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
