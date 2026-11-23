# OKF Bundle Wiki profile v2

Status: experimental implementation profile, 23 November 2026.

This profile applies the existing evidence-bearing Bundle Wiki publication
structures to [OKF core 0.3](https://github.com/open-knowledge-format/open-knowledge-format/blob/527e81aff55992be21507e97004286789126f88c/SPEC.md).
Its URI is `https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v2/`.
It is an OKF+ implementation profile, not part of the upstream core standard.

## Inherited structures

The frozen [v1 profile](../v1/) and its 16 byte-identical schema and context
files remain structural dependencies. Keep their original identifiers and
vendor lock. The assertion, direct-triple, identity, evidence, rights, runtime
sharding and integrity requirements continue to apply. Do not rewrite v1
schemas or contexts under their existing identifiers.

Use [repository semantic contract v2](repository-contract.schema.json) to
declare core 0.3. Contract v1 remains specific to core 0.2. A producer must not
change a v1 contract's core declaration and still claim that it validates
against the unchanged v1 schema.

## Core 0.3 differences

- Declare `okf_version: "0.3"` in the bundle-root index and generated descriptors.
- Resolve non-rooted path fields from their containing document. Preserve
  identifiers and evidence when repairing a former bundle-root fallback.
- Calculate trust from verification events at or after the last meaningful
  generation event. Preserve earlier events as history.
- Keep `index.md` and `log.md` outside the concept graph at every depth. A rich
  publication may retain explicitly typed `Index` and `Log` navigation records
  and derived navigation relationships, preserving old routes and assertion
  identities. Mark their runtime `core_role` as `navigation`; concept records
  use `concept`. Navigation is an extension, not an OKF concept or domain fact.
- A rich graph may also contain source-backed metadata entities from JSON,
  tables or other assets. Use `core_role: extension` where the entity has no
  actual typed Markdown concept document. Keep its real source-record identity,
  snapshot and digest; a virtual Reader route does not create a Markdown file.
  Map `core_role` to the local profile predicate `okf:coreRole`, using
  `https://chris-page-gov.github.io/okf-explorer/ns#`. Report core Markdown
  concept coverage and extension-entity coverage separately.
- Preserve complete authored metadata, including unknown keys. State any
  selected-field semantic projection limits and provide the source documents.
- Apply core 0.3 timestamp, empty-value, scalar-list, lifecycle and computation
  rules. Profile-specific checks must be identified separately from core syntax
  conformance. No computation or attester is automatically executed.

## Acceptance

Validate all generated assertions and direct/reified agreement. Bind source,
runtime, graph and dependency digests to one exact revision. Run the producer's
declared checks, real Explorer journeys and AI graph/source traversal. Provide
a source-linked complex-question visual walkthrough for that bundle, including
limitations and a negative control. Follow the [estate acceptance contract](../../../docs/okf-0.3-estate-acceptance.md).

Linking to this profile does not establish conformance, reviewed factual
accuracy, specialist acceptance, access to an external service or release
authority. Historical releases and deliberately invalid fixtures retain their
original identities and separate compatibility or expected-rejection evidence.
