---
"@context":
  - https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/context.jsonld
  - https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/semantic-context.jsonld
"@id": https://example.test/heritage/references/method.html
"@type": https://example.test/vocabulary/heritage#Method
type: Method
route: heritage/method/example
title: Example source method
description: Target page for the legacy Markdown-link semantic projection fixture.
generated: { by: process:fixture-build, at: "2026-08-01T12:00:00Z" }
verified: { by: human:fixture-reviewer, at: "2026-08-01T13:00:00Z" }
status: stable
stale_after: "2027-08-01"
sources:
  - id: fixture-source
    resource: https://example.test/source/example
    title: Fixture source
---

# Example source method

This page intentionally has no authored relationship assertion. A conventional
Markdown link to it is projected as `dcterms:references` when another semantic
page links here.
