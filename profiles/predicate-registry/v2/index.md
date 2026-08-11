# Predicate Registry v2

Predicate Registry v2 is an additive OKF profile extension for declaring every
relationship-predicate capability that a producer is authorised to publish. It
adds an evidence-derived implementation state to the governed predicate
material from the frozen [Bundle Wiki v1
profile](../../bundle-wiki/v1/index.md).

The extension does not alter OKF 0.2 or any Bundle Wiki v1 file. Existing v1
registries, builders and validators remain supported. A Bundle Wiki v1
`semantic_model.predicate_registry` can refer to a v2 registry as an external
resource with `path`, `sha256` and `media_type`; the frozen v1 semantic-model
schema already permits that form. It cannot contain a v2 registry inline.

The normative contract is the [published JSON
Schema](https://chris-page-gov.github.io/okf-explorer/profile/predicate-registry/v2/predicate-registry.schema.json).
Its local bytes are recorded by the [adjacent integrity lock](../v2.lock.json).

## Implementation states

Every `predicates` entry has one mandatory `implementation` object:

- `active-emitted` means the complete governed relationship set contains at
  least one assertion with that exact predicate IRI. `assertions_emitted` is
  the exact number of those assertions.
- `authorised-zero-evidence` means the producer is authorised to implement the
  predicate, but the complete governed relationship set contains no qualifying
  assertion for it. `assertions_emitted` is exactly zero.

`authorised-zero-evidence` is a capability declaration, not an assertion. It
does not create a relationship, establish that two resources are unrelated, or
permit inference. A deprecated predicate remains visible for compatibility,
but must use the zero-evidence state and identify its replacement.

## Producer contract

A conforming producer:

1. supplies its complete, authorised predicate-capability list to
   `build_predicate_registry_v2`;
2. supplies the complete set of relationship rows for the same snapshot;
3. lets the builder derive each state and count rather than authoring them by
   hand;
4. rejects every emitted predicate absent from the capability list;
5. validates the registry against the schema and reconciles every per-predicate
   count against the relationship rows; and
6. publishes the canonical JSON bytes and places their SHA-256 digest in the
   Bundle Wiki v1 external resource reference.

The registry `root_sha256` is the SHA-256 digest of the canonical JSON material
for the complete registry except `root_sha256` itself. It therefore binds the
schema and profile identifiers, snapshot, generation time, every capability,
every implementation state, every per-predicate assertion count and all four
aggregate counts. A digest calculated from `predicates` alone is non-conformant.

The aggregate `counts` object records the number of predicates in each state
and the total emitted assertion count. Predicates are ordered lexically by
their absolute IRI. Duplicate capability IRIs, inconsistent counts, altered
roots and undeclared emissions fail validation.

## Reader safety limits

The v2 contract is deliberately finite. A registry is limited to 16 MiB of
UTF-8 JSON, 4,096 predicates, 256 entries in any domain, range,
super-property or characteristic IRI array, 64 evidence-policy fields and
100,000,000 emitted assertions. General strings and IRIs are limited to 4,096
Unicode code points; snapshots to 256, generation timestamps to 64 and
evidence-field names to 256.

Readers should apply the 16 MiB byte ceiling before decoding or parsing. The
`load_predicate_registry_v2_bytes` helper performs that pre-parse check,
rejects non-UTF-8 JSON and duplicate object keys, validates every structural
limit and then checks the complete integrity root. These generous ceilings
bound memory and traversal work without encouraging a browser to process an
unbounded registry.

## Minimal integration example

```python
from pathlib import Path

from okf_semantic import (
    build_predicate_registry_v2,
    canonical_json_bytes,
    sha256_hex,
)

registry = build_predicate_registry_v2(
    authorised_capabilities,
    complete_relationship_rows,
    snapshot="2026-08-11",
    generated_at_value="2026-08-11T12:00:00Z",
)
registry_bytes = canonical_json_bytes(registry)
Path("generated/predicate-registry.v2.json").write_bytes(registry_bytes)

semantic_model_predicate_reference = {
    "path": "generated/predicate-registry.v2.json",
    "sha256": sha256_hex(registry_bytes),
    "media_type": "application/json",
}
```

Consumers which understand only Bundle Wiki v1 may retain the external
resource reference as an integrity-bound extension artefact. Consumers which
understand Predicate Registry v2 can validate and display both implemented and
authorised-but-not-evidenced capabilities without manufacturing semantic
relationships.
