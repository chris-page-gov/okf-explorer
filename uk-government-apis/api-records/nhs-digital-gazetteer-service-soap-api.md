---
type: "API Product"
title: "Gazetteer Service - SOAP API"
description: "Use this API to validate and retrieve UK-based postal addresses, for example before updating a patient's details in the Personal Demographics Service. Also known as the Address Finder, it can validate and transform the address to the Postcode Address File (PAF) standard, as well as search for and return an address list based on your search criteria.You can:- get a single search result based on the house number or name and its postcode- get multiple search results based on partial address inputs or wild card searches- do fuzzy searches based on the phonetics of words entered in lines of an address- do intelligent postcode parsing to validate the underlying structure- get the PAF address key for each delivery pointYou cannot use this API to update anyone's address.## Data update frequencyAt the moment, we only update the data in Gazetteer annually. We are working on updating it more frequently. If this is an issue for you, contact us.## LicensingThis API uses Royal Mail's Postcode Address File (PAF), which is a licensed product. The licence applies to the end user organisation, not to the software developer.If the end user organisation is a public sector organisation, such as a GP p…"
resource: "https://digital.nhs.uk/developer/api-catalogue/gazetteer-service-soap"
timestamp: "2024-04-23"
tags: "business-and-economy, geospatial, government-services, health-and-care, nhs-digital, planning-and-property, soap-wsdl"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Gazetteer Service - SOAP API

Use this API to validate and retrieve UK-based postal addresses, for example before updating a patient's details in the Personal Demographics Service. Also known as the Address Finder, it can validate and transform the address to the Postcode Address File (PAF) standard, as well as search for and return an address list based on your search criteria.You can:- get a single search result based on the house number or name and its postcode- get multiple search results based on partial address inputs or wild card searches- do fuzzy searches based on the phonetics of words entered in lines of an address- do intelligent postcode parsing to validate the underlying structure- get the PAF address key for each delivery pointYou cannot use this API to update anyone's address.## Data update frequencyAt the moment, we only update the data in Gazetteer annually. We are working on updating it more frequently. If this is an issue for you, contact us.## LicensingThis API uses Royal Mail's Postcode Address File (PAF), which is a licensed product. The licence applies to the end user organisation, not to the software developer.If the end user organisation is a public sector organisation, such as a GP p…

## Metadata

- Type: API Product
- Provider: [NHS Digital](../organisations/nhs-digital.md)
- Canonical provider: NHS Digital
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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/gazetteer-service-soap
- Documentation: https://digital.nhs.uk/developer/api-catalogue/gazetteer-service-soap

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
