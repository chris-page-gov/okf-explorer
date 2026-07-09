---
type: "API Product"
title: "Personal Demographics Service MESH"
description: "Use this message integration to search the Personal Demographics Service (PDS) for patient details, using the MESH UI.The PDS MESH service - formerly known as Master Patient Trace (MPT) - is provided for organisations that do not want to write their own software - typically NHS trusts or local authorities.It is not intended for software integration - use the PDS FHIR API instead.It is a batch message integration. It does not expect an immediate response from PDS.It requires PDS access approval and a MESH mailbox set up before you can use it.You can:- create a file containing a trace request- send the trace request to PDS- check for replies and download the responseFor how to use PDS MESH, see Using the PDS MESH service with the MESH user interface."
resource: "https://digital.nhs.uk/developer/api-catalogue/personal-demographic-service-mesh"
timestamp: "2024-04-23"
tags: "fhir, government-services, health-and-care, mesh, nhs-digital"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Personal Demographics Service MESH

Use this message integration to search the Personal Demographics Service (PDS) for patient details, using the MESH UI.The PDS MESH service - formerly known as Master Patient Trace (MPT) - is provided for organisations that do not want to write their own software - typically NHS trusts or local authorities.It is not intended for software integration - use the PDS FHIR API instead.It is a batch message integration. It does not expect an immediate response from PDS.It requires PDS access approval and a MESH mailbox set up before you can use it.You can:- create a file containing a trace request- send the trace request to PDS- check for replies and download the responseFor how to use PDS MESH, see Using the PDS MESH service with the MESH user interface.

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/personal-demographic-service-mesh
- Documentation: https://digital.nhs.uk/developer/api-catalogue/personal-demographic-service-mesh

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
