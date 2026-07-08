---
type: "API Product"
title: "Organisation Data Service - ORD API"
description: "Use this API to access details of health and social care organisations in England and Wales, such as trusts or GP practices, using our Organisation Data Service (ODS). This ORD-compatible API contains the full dataset from ODS, including information on succession (history) and relationships.We also have an ODS FHIR API which contains a reduced dataset, most useful for transactions.You can:- search for organisations- get the organisation details for a given ODS code- get a list of recently modified organisations- get metadata for roles, relationships and record classes- get a list of organisations that have been modified since a specific date to synchronise data locallyAn ODS code is a unique identification code for an organisation that interacts with any area of the NHS. For a full list of the organisation types available, see CSV downloads. This API returns the following full dataset for an organisation, when searched with an ODS code:- organisation - ODS code, name, open date, close date, last change date and status if active or inactive- address - house or flat number, line 1, line 2, line 3, town, postcode and country- contacts - email, website, telephone and fax- roles - prim…"
resource: "https://digital.nhs.uk/developer/api-catalogue/organisation-data-service-ord"
timestamp: "2024-04-23"
tags: "fhir, geospatial, government-services, health-and-care, nhs-digital, planning-and-property, population-and-statistics"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Organisation Data Service - ORD API

Use this API to access details of health and social care organisations in England and Wales, such as trusts or GP practices, using our Organisation Data Service (ODS). This ORD-compatible API contains the full dataset from ODS, including information on succession (history) and relationships.We also have an ODS FHIR API which contains a reduced dataset, most useful for transactions.You can:- search for organisations- get the organisation details for a given ODS code- get a list of recently modified organisations- get metadata for roles, relationships and record classes- get a list of organisations that have been modified since a specific date to synchronise data locallyAn ODS code is a unique identification code for an organisation that interacts with any area of the NHS. For a full list of the organisation types available, see CSV downloads. This API returns the following full dataset for an organisation, when searched with an ODS code:- organisation - ODS code, name, open date, close date, last change date and status if active or inactive- address - house or flat number, line 1, line 2, line 3, town, postcode and country- contacts - email, website, telephone and fax- roles - prim…

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
- Quality band: medium

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/organisation-data-service-ord
- Documentation: https://digital.nhs.uk/developer/api-catalogue/organisation-data-service-ord

## Credential Requirements

- unknown: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: GOV.UK API Catalogue CSV
- Source URL: https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv
