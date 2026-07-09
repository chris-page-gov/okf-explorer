---
type: "API Product"
title: "CIS Deductions (MTD)"
description: "Under the Construction Industry Scheme (CIS), contractors deduct money from a subcontractor’s payments and pass it to HM Revenue and Customs (HMRC). The deductions count as advance payments towards the subcontractor’s tax and National Insurance. Contractors must register for the scheme. Subcontractors don’t have to register, but deductions are taken from their payments at a higher rate if they’re not registered. Here a developer can: - create CIS deductions where they have not previously registered with HMRC - amend CIS deductions which have been previously populated when creating their record - retrieve a list of CIS deductions for a subcontractor that has been previously populated - remove CIS deductions that have been previously populated The sandbox endpoint is `https://test-api.service.hmrc.gov.uk`."
resource: "https://api.service.hmrc.gov.uk"
timestamp: "2020-09-02"
tags: "government-services, hm-revenue-customs, planning-and-property, rest-http, tax-and-customs"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# CIS Deductions (MTD)

Under the Construction Industry Scheme (CIS), contractors deduct money from a subcontractor’s payments and pass it to HM Revenue and Customs (HMRC). The deductions count as advance payments towards the subcontractor’s tax and National Insurance. Contractors must register for the scheme. Subcontractors don’t have to register, but deductions are taken from their payments at a higher rate if they’re not registered. Here a developer can: - create CIS deductions where they have not previously registered with HMRC - amend CIS deductions which have been previously populated when creating their record - retrieve a list of CIS deductions for a subcontractor that has been previously populated - remove CIS deductions that have been previously populated The sandbox endpoint is `https://test-api.service.hmrc.gov.uk`.

## Metadata

- Type: API Product
- Provider: [HM Revenue Customs](../organisations/hm-revenue-customs.md)
- Canonical provider: HM Revenue Customs
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

- Endpoint: https://api.service.hmrc.gov.uk
- Documentation: https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/cis-deductions-api

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
