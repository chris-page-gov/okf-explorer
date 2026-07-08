---
type: "API Product"
title: "GOV.UK Notify"
description: "GOV.UK Notify allows government departments to send emails, text messages and letters to their users. The API contains: - the public-facing REST API for GOV.UK Notify, which teams can integrate with using our clients - an internal-only REST API built using Flask to manage services, users, templates, etc (this is what the admin app talks to) - asynchronous workers built using Celery to put things on queues and read them off to be processed, sent to providers, updated, etc."
resource: "https://api.notifications.service.gov.uk/"
timestamp: "2020-08-24"
tags: "government-digital-service, government-services, streaming"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# GOV.UK Notify

GOV.UK Notify allows government departments to send emails, text messages and letters to their users. The API contains: - the public-facing REST API for GOV.UK Notify, which teams can integrate with using our clients - an internal-only REST API built using Flask to manage services, users, templates, etc (this is what the admin app talks to) - asynchronous workers built using Celery to put things on queues and read them off to be processed, sent to providers, updated, etc.

## Metadata

- Type: API Product
- Provider: [Government Digital Service](../organisations/government-digital-service.md)
- Canonical provider: Government Digital Service
- Source adapter: api_gov_uk_catalogue
- Source tier: declared_api_catalogue
- Confidence: declared
- Assurance status: declared
- Access model: unknown
- Contract status: documentation-only
- Quality band: medium

- Endpoint: https://api.notifications.service.gov.uk/
- Documentation: https://www.notifications.service.gov.uk/documentation

## Credential Requirements

- unknown: secret value stored in OKF = False

## Sample Policy

- Mode: static-placeholder
- Live calls enabled: False

## Provenance

- Source: GOV.UK API Catalogue CSV
- Source URL: https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv
