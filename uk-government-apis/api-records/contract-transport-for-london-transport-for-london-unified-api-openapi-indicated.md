---
type: "Contract"
title: "Transport for London Unified API contract"
description: "Machine-readable or service-description contract inferred for Transport for London Unified API from public metadata."
resource: "https://api.tfl.gov.uk/"
timestamp: "2020-10-28"
tags: "government-services, planning-and-property, rest-http, transport, transport-for-london"
confidence: "observed"
source_adapter: "contract_discovery"
---

# Transport for London Unified API contract

Machine-readable or service-description contract inferred for Transport for London Unified API from public metadata.

## Metadata

- Type: Contract
- Provider: [Transport For London](../organisations/transport-for-london.md)
- Canonical provider: Transport For London
- Source adapter: contract_discovery
- Source tier: contract_discovery
- Confidence: observed
- Assurance status: observed
- Access model: approval-required
- Contract status: openapi-indicated
- Licence: Not specified (not-specified)
- Licence basis: not-specified
- Licence source: not-specified
- Licence confidence: 0.2
- Quality band: high
- DCAT term: `dcterms:Standard`
- OpenAPI term: `OpenAPI Description or external contract`

- Endpoint: https://api.tfl.gov.uk/
- Documentation: https://api.tfl.gov.uk/

## Standards Alignment

This generated record is standards-alignable, not standards-conformant by itself. DCAT-AP conformance needs an RDF export; OpenAPI conformance needs a complete `openapi` document.

- DCAT / DCAT-AP: `dcterms:Standard`; export status `contract-reference`.
- DCAT missing requirements: `dcterms:license`
- OpenAPI: `OpenAPI Description or external contract`; export status `contract-reference`.
- OpenAPI security scheme: `metadata-only`.
- OpenAPI missing requirements: `info.license`
- Crosswalk: [OKF Standards Crosswalk](../../docs/okf-standards-crosswalk.md)

## Credential Requirements

- approval_required: secret value stored in OKF = False

## Provenance

- Source: Contract discovery from harvested API metadata
- Source URL: https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv
