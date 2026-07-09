---
type: "API Product"
title: "e-Referral Service - FHIR API"
description: "Use this API to create paperless referrals from primary to secondary care with the e-Referral Service (e-RS). As a primary care referrer, you can: - create a new e-referral- search for relevant patient services to create a shortlist- access existing e-referrals- create a triage request for the Referral Assessment Service (RAS)- upload and manage a patient letter or attachments, linking them to a referral- retrieve appointment slots and book appointments- defer a booking to a provider if an appointment slot is unavailableAs a secondary care provider, you can: - access referrals as a worklist- retrieve non-clinical information (meta-data) about the referral- retrieve attachments which are linked to a referral or triage (RAS) request- retrieve clinical information which has been provided by a referrer- accept or reject a referral request- retrieve Advice & Guidance (A&G) conversations and send responses- convert Advice & Guidance (A&G) conversations into a referralYou cannot use this API to: - get patient details – instead, use the Personal Demographic Service (PDS)You can access the following data: - referral attachments- referral letters- appointment slots- worklists for referral r…"
resource: "https://digital.nhs.uk/developer/api-catalogue/e-referral-service-fhir"
timestamp: "2024-04-23"
tags: "fhir, government-services, health-and-care, nhs-digital"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# e-Referral Service - FHIR API

Use this API to create paperless referrals from primary to secondary care with the e-Referral Service (e-RS). As a primary care referrer, you can: - create a new e-referral- search for relevant patient services to create a shortlist- access existing e-referrals- create a triage request for the Referral Assessment Service (RAS)- upload and manage a patient letter or attachments, linking them to a referral- retrieve appointment slots and book appointments- defer a booking to a provider if an appointment slot is unavailableAs a secondary care provider, you can: - access referrals as a worklist- retrieve non-clinical information (meta-data) about the referral- retrieve attachments which are linked to a referral or triage (RAS) request- retrieve clinical information which has been provided by a referrer- accept or reject a referral request- retrieve Advice & Guidance (A&G) conversations and send responses- convert Advice & Guidance (A&G) conversations into a referralYou cannot use this API to: - get patient details – instead, use the Personal Demographic Service (PDS)You can access the following data: - referral attachments- referral letters- appointment slots- worklists for referral r…

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/e-referral-service-fhir
- Documentation: https://digital.nhs.uk/developer/api-catalogue/e-referral-service-fhir

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
