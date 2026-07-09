---
type: "API Product"
title: "GP Connect Access Record: HTML - FHIR API"
description: "Use this API to view a patient's registered GP practice record, with read-only access.You can:- view a patient’s primary care record by requesting sections or headings- define a date range to filter larger sections- incorporate these views directly into Electronic Patient Record systemsFor example:- GP practices can view all of the patient’s primary care records even when they are held on a different GP system- care settings such as NHS111, ambulance and emergency care, primary care networks (PCNs), secondary care, pharmacy, care homes, community and dentistry can view the records held by the patient’s GP practice to better inform any care decisions they make for a patientFor more details, see the GP Connect specifications for developers. Start your development work within 6 months of use case approval. If you miss this date, a review or new submission of the use case will be required. Changes or additional development will also require a review or new use case submission."
resource: "https://digital.nhs.uk/developer/api-catalogue/gp-connect-access-record-html-fhir"
timestamp: "2024-04-23"
tags: "fhir, health-and-care, nhs-digital"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# GP Connect Access Record: HTML - FHIR API

Use this API to view a patient's registered GP practice record, with read-only access.You can:- view a patient’s primary care record by requesting sections or headings- define a date range to filter larger sections- incorporate these views directly into Electronic Patient Record systemsFor example:- GP practices can view all of the patient’s primary care records even when they are held on a different GP system- care settings such as NHS111, ambulance and emergency care, primary care networks (PCNs), secondary care, pharmacy, care homes, community and dentistry can view the records held by the patient’s GP practice to better inform any care decisions they make for a patientFor more details, see the GP Connect specifications for developers. Start your development work within 6 months of use case approval. If you miss this date, a review or new submission of the use case will be required. Changes or additional development will also require a review or new use case submission.

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/gp-connect-access-record-html-fhir
- Documentation: https://digital.nhs.uk/developer/api-catalogue/gp-connect-access-record-html-fhir

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
