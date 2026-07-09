---
type: "API Product"
title: "Food Alerts"
description: "The FSA Food Alerts API provides access to current and recent Food Alerts: Allergy Alerts (AA), Product Recall Information Notices (PRIN) and Food Alerts for Action (FAFA). It provides applications with the facility to list alerts matching some filter criterion, and to retrieve a description of an alert."
resource: "https://data.food.gov.uk/food-alerts"
timestamp: "2024-04-23"
tags: "food-standards-agency, public-administration, rest-http"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Food Alerts

The FSA Food Alerts API provides access to current and recent Food Alerts: Allergy Alerts (AA), Product Recall Information Notices (PRIN) and Food Alerts for Action (FAFA). It provides applications with the facility to list alerts matching some filter criterion, and to retrieve a description of an alert.

## Metadata

- Type: API Product
- Provider: [Food Standards Agency](../organisations/food-standards-agency.md)
- Canonical provider: Food Standards Agency
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

- Endpoint: https://data.food.gov.uk/food-alerts
- Documentation: https://data.food.gov.uk/food-alerts/ui/reference

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
