---
type: "Specification"
title: "OpenAPI"
description: "HTTP API contracts: ops, schemas, security metadata; machine- and human-readable."
resource: "https://spec.openapis.org/oas/v3.2.0.html"
tags: [openapi, standard, contracts]
timestamp: 2026-07-09T00:00:00Z
verified: "yes"
---

Standard, language-agnostic description of HTTP APIs — request/response schemas and security metadata. Strong for discovery, codegen, validation, linting and tool-calling over REST; [GDS](../uk-government/gds-api-standards.md) recommends producing an OpenAPI document *first*. Weak for event choreography and end-to-end workflow without add-ons such as [Arazzo](arazzo.md).

For API-related OKF bundles, OpenAPI is the executable contract target. OKF records can carry enough metadata to generate service stubs or operation fragments, but a record is not OpenAPI-conformant unless an `openapi` document with servers, paths, methods, parameters, responses, schemas and security metadata is emitted and validated.
