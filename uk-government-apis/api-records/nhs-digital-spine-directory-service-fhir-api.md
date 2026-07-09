---
type: "API Product"
title: "Spine Directory Service - FHIR API"
description: "Use this API to access details of systems registered in the Spine Directory Service (SDS). You can: - get accredited system detailsYou cannot currently use this API to: - search for organisations- search for peopleAccredited system records Every system that connects to the Spine has one or more “Accredited System” (AS) records in SDS, identified by an Accredited System Identifier (ASID).This ASID is unique to a system deployed in a specific organisation, so the same application deployed into three NHS organisations would typically be represented as three unique ASIDs. MHS records and endpoints Every GP Connect system also has one or more “MHS” records (or message handling server record), identified by Party Key and Interaction ID.MHS records of GP Connect provider systems contain the endpoint of the target practice, as defined by the FHIR service root URL.Please see System topologies for more details on the allocation of ASIDs and Party Keys. For all intermediary messaging endpoint lookups, this API returns the NHS Digital Spine MHS endpoint address."
resource: "https://digital.nhs.uk/developer/api-catalogue/spine-directory-service-fhir"
timestamp: "2024-04-23"
tags: "fhir, geospatial, government-services, health-and-care, nhs-digital, planning-and-property"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Spine Directory Service - FHIR API

Use this API to access details of systems registered in the Spine Directory Service (SDS). You can: - get accredited system detailsYou cannot currently use this API to: - search for organisations- search for peopleAccredited system records Every system that connects to the Spine has one or more “Accredited System” (AS) records in SDS, identified by an Accredited System Identifier (ASID).This ASID is unique to a system deployed in a specific organisation, so the same application deployed into three NHS organisations would typically be represented as three unique ASIDs. MHS records and endpoints Every GP Connect system also has one or more “MHS” records (or message handling server record), identified by Party Key and Interaction ID.MHS records of GP Connect provider systems contain the endpoint of the target practice, as defined by the FHIR service root URL.Please see System topologies for more details on the allocation of ASIDs and Party Keys. For all intermediary messaging endpoint lookups, this API returns the NHS Digital Spine MHS endpoint address.

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/spine-directory-service-fhir
- Documentation: https://digital.nhs.uk/developer/api-catalogue/spine-directory-service-fhir

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
