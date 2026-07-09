---
type: "API Product"
title: "Companies House Streaming"
description: "The Companies House streaming API gives you access to realtime data changes of the information held at Companies House. This delivers the same information that is available through the on-demand REST API GET requests, but instead pushes data to your client as it changes, through a long-running connection that you first establish. Streams include: - company information - filing history - insolvency cases - charges"
resource: "https://stream.companieshouse.gov.uk/"
timestamp: "2020-08-24"
tags: "business-and-economy, companies-house, streaming"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Companies House Streaming

The Companies House streaming API gives you access to realtime data changes of the information held at Companies House. This delivers the same information that is available through the on-demand REST API GET requests, but instead pushes data to your client as it changes, through a long-running connection that you first establish. Streams include: - company information - filing history - insolvency cases - charges

## Metadata

- Type: API Product
- Provider: [Companies House](../organisations/companies-house.md)
- Canonical provider: Companies House
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

- Endpoint: https://stream.companieshouse.gov.uk/
- Documentation: https://developer-specs.companieshouse.gov.uk/streaming-api/guides/overview

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
