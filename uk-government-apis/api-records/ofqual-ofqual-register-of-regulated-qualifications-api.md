---
type: "API Product"
title: "Ofqual Register of Regulated Qualifications API"
description: "The Ofqual Register of Regulated Qualifications API allows users to programmatically access details of qualifications and awarding organisations regulated by Ofqual and CCEA Regulation."
resource: "https://register-api.ofqual.gov.uk"
timestamp: "2024-06-11"
tags: "education-and-skills, government-services, ofqual, planning-and-property, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Ofqual Register of Regulated Qualifications API

The Ofqual Register of Regulated Qualifications API allows users to programmatically access details of qualifications and awarding organisations regulated by Ofqual and CCEA Regulation.

## Metadata

- Type: API Product
- Provider: [Ofqual](../organisations/ofqual.md)
- Canonical provider: Ofqual
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

- Endpoint: https://register-api.ofqual.gov.uk
- Documentation: https://github.com/OfqualGovUK/ofqual-register-api

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
