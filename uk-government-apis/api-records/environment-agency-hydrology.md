---
type: "API Product"
title: "Hydrology"
description: "The Hydrology API provides access to historic water flow information. It complements the near real-time data provided under `/flood-monitoring` in that it provides access to a long term archive of quality checked and qualified data. The API and data model for the `/hydrology` API differs slightly from that under `/flood-monitoring` due to intrinsic differences (for example presence of quality flags on each reading for qualified data), modelling changes (for example adding links to [SOSA/SSN](https://www.w3.org/TR/vocab-ssn/) terms) and technology differences. In addition Environment Agency are moving to using new identifiers for monitoring stations based on GUIDs and the station URIs provided by this API use these new standards. For convenience, the stations shown here provide annotations showing the old `stationReference` notations (as well as the River Levels on the Internet and WISKI notations) and provide `sameAs` links to the equivalent `/flood-monitoring` stations. Please visit the [Defra Data Services Platform Support](https://environment.data.gov.uk/support) to let us know about any issues or to ask questions."
resource: "https://environment.data.gov.uk/hydrology/landing"
timestamp: "2020-08-26"
tags: "environment, environment-agency, government-services, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Hydrology

The Hydrology API provides access to historic water flow information. It complements the near real-time data provided under `/flood-monitoring` in that it provides access to a long term archive of quality checked and qualified data. The API and data model for the `/hydrology` API differs slightly from that under `/flood-monitoring` due to intrinsic differences (for example presence of quality flags on each reading for qualified data), modelling changes (for example adding links to [SOSA/SSN](https://www.w3.org/TR/vocab-ssn/) terms) and technology differences. In addition Environment Agency are moving to using new identifiers for monitoring stations based on GUIDs and the station URIs provided by this API use these new standards. For convenience, the stations shown here provide annotations showing the old `stationReference` notations (as well as the River Levels on the Internet and WISKI notations) and provide `sameAs` links to the equivalent `/flood-monitoring` stations. Please visit the [Defra Data Services Platform Support](https://environment.data.gov.uk/support) to let us know about any issues or to ask questions.

## Metadata

- Type: API Product
- Provider: [Environment Agency](../organisations/environment-agency.md)
- Canonical provider: Environment Agency
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

- Endpoint: https://environment.data.gov.uk/hydrology/landing
- Documentation: https://environment.data.gov.uk/hydrology/doc/reference

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
