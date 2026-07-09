---
type: "API Product"
title: "Digital Child Health - FHIR"
description: "Use this integration to share information about a child's health between healthcare workers.This information is recorded throughout a child's clinical pathway or patient journey about:- health events- clinical contacts These events or contacts happen either as part of:- a planned Healthy Child Programme- unplanned GP or Emergency Department visitsExamples of such events include creating, updating or deleting a record of a:- blood spot test outcome- newborn hearing test- Newborn and Infant Physical Examination (NIPE) outcomeThis integration uses a publish-subscribe model - the sending system publishes events to National Events Management Service (NEMS), and NEMS forwards the events to all subscribed systems via MESH.Subscribed systems might be GPs, emergency departments, local authorities or some other care provider. Potentially, patients and carers could also share this information.For more information see Digital Child Health specification versions.Before you begin any development work using this integration, contact us to discuss your best options."
resource: "https://digital.nhs.uk/developer/api-catalogue/digital-child-health-fhir"
timestamp: "2024-04-23"
tags: "fhir, government-services, health-and-care, mesh, nhs-digital, transport"
confidence: "declared"
source_adapter: "api_gov_uk_catalogue"
---

# Digital Child Health - FHIR

Use this integration to share information about a child's health between healthcare workers.This information is recorded throughout a child's clinical pathway or patient journey about:- health events- clinical contacts These events or contacts happen either as part of:- a planned Healthy Child Programme- unplanned GP or Emergency Department visitsExamples of such events include creating, updating or deleting a record of a:- blood spot test outcome- newborn hearing test- Newborn and Infant Physical Examination (NIPE) outcomeThis integration uses a publish-subscribe model - the sending system publishes events to National Events Management Service (NEMS), and NEMS forwards the events to all subscribed systems via MESH.Subscribed systems might be GPs, emergency departments, local authorities or some other care provider. Potentially, patients and carers could also share this information.For more information see Digital Child Health specification versions.Before you begin any development work using this integration, contact us to discuss your best options.

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

- Endpoint: https://digital.nhs.uk/developer/api-catalogue/digital-child-health-fhir
- Documentation: https://digital.nhs.uk/developer/api-catalogue/digital-child-health-fhir

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
