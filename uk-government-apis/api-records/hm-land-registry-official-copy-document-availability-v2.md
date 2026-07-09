---
type: "API Product"
title: "Official Copy Document Availability V2"
description: "Check which register referred documents are available for immediate download. Use a title number to find out the Official Copy Document Availability status via a RESTful API. When you know what is available, you can order using the Official Copy Title Known service (https://landregistry.github.io/bgtechdoc/services/official_copy_title_known/). Test URL: https://bgtest.landregistry.gov.uk/bg2test/api/v2/titles/[title_number]/official-copies/availability Where [title_number] is replaced by the title number you need to use."
resource: "https://businessgateway.landregistry.gov.uk/bg2/api/v2/titles/{title_number}/official-copies/availability"
timestamp: "2026-03-31"
tags: "government-services, hm-land-registry, planning-and-property, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Official Copy Document Availability V2

Check which register referred documents are available for immediate download. Use a title number to find out the Official Copy Document Availability status via a RESTful API. When you know what is available, you can order using the Official Copy Title Known service (https://landregistry.github.io/bgtechdoc/services/official_copy_title_known/). Test URL: https://bgtest.landregistry.gov.uk/bg2test/api/v2/titles/[title_number]/official-copies/availability Where [title_number] is replaced by the title number you need to use.

## Metadata

- Type: API Product
- Provider: [HM Land Registry](../organisations/hm-land-registry.md)
- Canonical provider: HM Land Registry
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

- Endpoint: https://businessgateway.landregistry.gov.uk/bg2/api/v2/titles/{title_number}/official-copies/availability
- Documentation: https://landregistry.github.io/bgtechdoc/services/official_copy_document_availability_v2/#official-copy-document-availability-v2

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
