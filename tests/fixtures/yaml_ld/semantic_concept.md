---
"@context":
  - https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/context.jsonld
  - https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/semantic-context.jsonld
  - heritage: https://example.test/vocabulary/heritage#
    has_designation:
      "@id": heritage:hasDesignation
      "@type": "@id"
"@id": https://example.test/heritage/records/example.html#asset
"@type":
  - heritage:HeritageAsset
type: Heritage asset
route: heritage/asset/example
title: Example heritage asset
description: Semantic relationship fixture with a direct triple and evidence-bearing assertion.
generated: { by: process:fixture-build, at: "2026-08-01T12:00:00Z" }
verified: { by: human:fixture-reviewer, at: "2026-08-01T13:00:00Z" }
status: stable
stale_after: "2027-08-01"
sources:
  - id: fixture-source
    resource: https://example.test/source/example
    title: Fixture source
has_designation:
  "@id": https://example.test/heritage/records/example.html#designation
  "@type": heritage:Designation
  type: Heritage designation
  route: heritage/designation/example
  title: Example designation
assertions:
  - "@id": https://example.test/heritage/assertions/asset-has-designation
    "@type":
      - rdf:Statement
      - okf:RelationshipAssertion
    source: https://example.test/heritage/records/example.html#asset
    predicate: heritage:hasDesignation
    target: https://example.test/heritage/records/example.html#designation
    kind: has designation
    inverse_label: designation of
    assertion_status: normalized
    assertion_scope: real-world
    authority:
      class: derived
      label: Deterministic fixture projection
      source: https://example.test/source/example
    derivation: https://example.test/rules/source-field-copy-v1
    derivation_activity: https://example.test/activities/fixture-build-1
    confidence_score: 1.0
    observed_at: "2026-08-01T12:00:00Z"
    stale_after: "2027-08-01T00:00:00Z"
    evidence:
      - "@id": https://example.test/evidence/example-designation
        type: source-metadata
        url: https://example.test/source/example
        source_artifact: source/example.json
        source_sha256: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
        source_field: designation
        field_provenance: source-native
        source_value: designated
        source_value_sha256: bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
        source_value_hash_canonicalization: utf8-nfc
        locator: /designation
        retrieved_at: "2026-08-01T12:00:00Z"
    rights:
      source: https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/
      assertion: source-derived-metadata
---

# Example heritage asset

The relationship is present once as a direct semantic fact and once as an
evidence-bearing assertion about that fact.

The ordinary Markdown navigation remains compatible with the semantic graph:
[read the source method](semantic_reference.md).
