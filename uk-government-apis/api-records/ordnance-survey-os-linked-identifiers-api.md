---
type: "API Product"
title: "OS Linked Identifiers API"
description: "The OS Linked Identifiers API allows users to access the valuable relationships between properties, streets and OS MasterMap identifiers for free. An identifier is a unique reference assigned to a specific thing, so when you are talking to someone else you can use it to ensure you're talking about the same thing. They are used all the time, such as telephone numbers, postcodes and customer reference numbers. OS is striving to make its identifiers more accessible and useful for its customers. The OS Linked Identifiers API takes this further by enabling the linking together of datasets that are using different identifiers; for example, linking a property address (UPRN - Unique Property Reference Number) to the street that it is on (USRN - Unique Street Reference Number)."
resource: "https://api.os.uk/search/links/v1"
timestamp: "2020-08-24"
tags: "geospatial, ordnance-survey, planning-and-property, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# OS Linked Identifiers API

The OS Linked Identifiers API allows users to access the valuable relationships between properties, streets and OS MasterMap identifiers for free. An identifier is a unique reference assigned to a specific thing, so when you are talking to someone else you can use it to ensure you're talking about the same thing. They are used all the time, such as telephone numbers, postcodes and customer reference numbers. OS is striving to make its identifiers more accessible and useful for its customers. The OS Linked Identifiers API takes this further by enabling the linking together of datasets that are using different identifiers; for example, linking a property address (UPRN - Unique Property Reference Number) to the street that it is on (USRN - Unique Street Reference Number).

## Metadata

- Type: API Product
- Provider: [Ordnance Survey](../organisations/ordnance-survey.md)
- Canonical provider: Ordnance Survey
- Source adapter: api_gov_uk_catalogue
- Source tier: declared_api_catalogue
- Confidence: declared
- Assurance status: declared
- Access model: unknown
- Contract status: documentation-only
- Quality band: medium

- Endpoint: https://api.os.uk/search/links/v1
- Documentation: https://osdatahub.os.uk/docs/linkedIdentifiers/overview

## Credential Requirements

- unknown: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: GOV.UK API Catalogue CSV
- Source URL: https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv
