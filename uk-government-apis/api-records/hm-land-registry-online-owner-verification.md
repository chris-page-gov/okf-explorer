---
type: "API Product"
title: "Online Owner Verification"
description: "Use this service to verify property ownership data against HM Land Registry property titles in real time. Get information on: - historical name matching (from 2005 onwards) - partial matching to increase the chances of a match - the option to highlight if there are other legal owners on the title - the option to search by title number to make sure a registered address is available For test environment endpoint, replace https://businessgateway.landregistry.gov.uk/b2b/EOOV_SoapEngine with https://bgtest.landregistry.gov.uk/b2b/EOOV_StubService"
resource: "https://businessgateway.landregistry.gov.uk/b2b/EOOV_SoapEngine/OnlineOwnershipVerificationV1_0WebService?wsdl"
timestamp: "2025-01-06"
tags: "environment, geospatial, government-services, hm-land-registry, planning-and-property, soap-wsdl"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Online Owner Verification

Use this service to verify property ownership data against HM Land Registry property titles in real time. Get information on: - historical name matching (from 2005 onwards) - partial matching to increase the chances of a match - the option to highlight if there are other legal owners on the title - the option to search by title number to make sure a registered address is available For test environment endpoint, replace https://businessgateway.landregistry.gov.uk/b2b/EOOV_SoapEngine with https://bgtest.landregistry.gov.uk/b2b/EOOV_StubService

## Metadata

- Type: API Product
- Provider: [HM Land Registry](../organisations/hm-land-registry.md)
- Canonical provider: HM Land Registry
- Source adapter: api_gov_uk_catalogue
- Source tier: declared_api_catalogue
- Confidence: declared
- Assurance status: declared
- Access model: approval-required
- Contract status: wsdl-indicated
- Licence: Not specified (not-specified)
- Licence basis: not-specified
- Licence source: not-specified
- Licence confidence: 0.2
- Quality band: high
- DCAT term: `dcat:DataService`
- OpenAPI term: `OpenAPI Object`

- Endpoint: https://businessgateway.landregistry.gov.uk/b2b/EOOV_SoapEngine/OnlineOwnershipVerificationV1_0WebService?wsdl
- Documentation: https://landregistry.github.io/bgtechdoc/services/online_owner_verification/

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
