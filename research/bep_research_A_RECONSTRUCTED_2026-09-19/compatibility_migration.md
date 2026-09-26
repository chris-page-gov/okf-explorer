# Compatibility and migration note

The existing project contract is `okf-governed-context.v1`. The replacement proposal is
`bep-core.v0.1-reconstructed.1`; neither its identity nor its hash domain may be substituted
for the original. The lost schema's exact shape is unknown, so this is not a compatible
reconstruction at the byte or schema level.

Keep the current TypeScript compiler and its frozen evaluator as the baseline. Do not
create independent semantic engines in Explorer, HTTP and MCP adapters. Any adoption
requires explicit version negotiation and a documented mapping that preserves original
identity, authority, assertion status, literal digests, directed paths, requirements,
limitations and omissions. Retain `normalized` in existing machine enums for compatibility.

An adapter must not infer missing provenance or invent a covered requirement to satisfy a
new schema. Where the existing contract cannot express a proposed field, preserve an explicit
unsupported state or require a new producer profile. Record mappings as transformations,
not proof that one compiler produced another compiler's package.

Before publication: freeze representative old fixtures; implement a versioned additive
adapter; test expected failures and round trips; assess whether information is lost; run
real engine tests at the pinned commit; evaluate downstream consumers; then release
alongside, not over, the old contract. A rollback returns to the original versioned artefact.
No such adapter or migration was implemented or deployed in this reconstruction.

RO-Crate 1.3 is a verified packaging comparator. It is not imposed as the online BEP wire
format, and this ZIP is not claimed to be a conformant RO-Crate.
