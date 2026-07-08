---
type: "API Product"
title: "OS OAuth 2 API"
description: "OAuth 2 is an authentication mechanism for APIs that allows applications to use time limited tokens for access to resources. A common use case for the OAuth 2 API is when implementing a web application that uses the OS Data Hub APIs."
resource: "https://api.os.uk/oauth2/token/v1"
timestamp: "2020-08-24"
tags: "geospatial, ordnance-survey, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# OS OAuth 2 API

OAuth 2 is an authentication mechanism for APIs that allows applications to use time limited tokens for access to resources. A common use case for the OAuth 2 API is when implementing a web application that uses the OS Data Hub APIs.

## Metadata

- Type: API Product
- Provider: [Ordnance Survey](../organisations/ordnance-survey.md)
- Canonical provider: Ordnance Survey
- Source adapter: api_gov_uk_catalogue
- Source tier: declared_api_catalogue
- Confidence: declared
- Assurance status: declared
- Access model: oauth2
- Contract status: documentation-only
- Quality band: high

- Endpoint: https://api.os.uk/oauth2/token/v1
- Documentation: https://osdatahub.os.uk/docs/oauth2/overview

## Credential Requirements

- oauth2: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: GOV.UK API Catalogue CSV
- Source URL: https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv
