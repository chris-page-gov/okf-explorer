# OKF Bundle Wiki Profile v1

Status: experimental implementation profile, updated 9 August 2026.

This profile defines a federated publication contract for independently hosted
Open Knowledge Format bundle wikis. It uses YAML-LD Basic profile semantics for
authoring and publishes JSON-LD plus Explorer-compatible JSON projections.
It is additive to the Markdown, provenance, trust, lifecycle and computation
rules in OKF v0.2; a producer can conform to OKF core without adopting this
profile.

The profile URI is:

`https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/`

## Required bundle surfaces

- `okf-bundle.yamlld` — canonical semantic descriptor.
- `okf-bundle.jsonld` — deterministic JSON-LD projection.
- `okf-explorer.json` — current Explorer runtime descriptor.
- `data/manifest.json` — counts, indexes, chunks and performance contract.
- `context/okf-bundle-v1.jsonld` — pinned context copy.
- `checksums.json` — generated artefact integrity metadata.

When a complete semantic graph would make either root representation exceed a
host or review boundary, the root YAML-LD and JSON-LD files are compact control
documents. They point to a generated semantic manifest and bounded gzip
JSON-LD shards. The manifest records the partition rule, counts, media types,
compressed and expanded digests, and the assertion-set identity. Entity shards
carry direct triples; assertion shards carry the matching evidence-bearing
reification. A whole-manifest check must reconcile both sets exactly. The
repository contract declares these surfaces with the `semantic-manifest`,
`semantic-json-ld-shards`, `semantic-context`, and `relationship-schema` roles.
The Reader may continue to use bounded runtime adjacency without making that
delivery projection an independent semantic authority.

A very large evidence-bearing relationship graph may additionally publish a
SHA-256-bound `entrypoints.relationship_runtime` control manifest. Its
`default_planes` must exactly equal the active authority planes; historical or
rejected planes remain explicit but are never loaded by default. Each gzip
runtime shard carries safe local `source`/`target` routes together with
absolute `source_iri`/`target_iri`, predicate, assertion identity, evidence,
rights and plane membership. A SHA-256 route locator maps one local route to a
bounded set of shard paths and commits, per plane, to the exact count and
digest of sorted incident assertion IDs. The Reader verifies the manifest,
locator, shard bytes, row contract and route commitment before presenting the
edges. It also enforces aggregate compressed-byte and retained-text budgets,
decodes one rich shard at a time and retains only governed Reader fields so a
bounded row/chunk count cannot become an unbounded browser-memory claim.
Repository contracts declare these surfaces with the
`relationship-runtime-manifest`, `relationship-route-locator`,
`relationship-runtime-schema` and `relationship-runtime` roles.

Every repository adopting or migrating towards this profile should also keep a
root `okf.semantic.json` control file conforming to
[`repository-contract.schema.json`](repository-contract.schema.json). This is
an authoring/build contract, not a generated semantic serialisation. It makes
the source boundary, current migration state, optional environment setup,
exact build/check tooling and Reader delivery plane discoverable without
pretending that descriptor-only YAML-LD is already a complete assertion graph.
All contract paths and globs are repository-relative and must remain contained
after symlink resolution. Tooling strings are untrusted declarations, not shell
instructions: an agent or operator inspects and cross-checks them against
trusted repository guidance or a reviewed preset before executing an approved
command exactly. Cross-repository artefact inspection applies explicit on-disk
and decoded-byte ceilings and reports malformed or unreadable sampled artefacts
as errors rather than treating them as empty data.

An optional `okf-explorer-presentation.v1` profile supplies provider-authored
display defaults without changing OKF meaning or generated facet counts. A
large descriptor may embed it in `extensions` or point to a
`data/presentation.json` entrypoint. The profile schema is
[`presentation.schema.json`](presentation.schema.json).

Presentation is deliberately bundle-level and explicitly referenced. Explorer
does not probe for implicit sidecars beside every `index.md`, because nested
inheritance would otherwise be ambiguous and expensive. Route-scoped overrides
are deferred until the matching and inheritance rules are specified.

An optional snapshot-bound provider datapack can distinguish the governed
metadata in a bundle from a named, bounded review of an external provider
reference. The manifest and pack schemas are
[`provider-datapack-manifest.schema.json`](provider-datapack-manifest.schema.json)
and [`provider-datapack.schema.json`](provider-datapack.schema.json). These
documents do not assert that an external reference is current live data; see
the [provider datapack contract](../../../docs/provider-datapacks.md).

An optional governed-term datapack makes the metadata vocabulary inspectable
and testable. Its
[`governed-terms.schema.json`](governed-terms.schema.json) registry records each
compact identifier, full IRI, term kind, authoritative specification
provenance, reader-facing definition, bounded application and emitted usage.
The companion
[`governed-term-validation.schema.json`](governed-term-validation.schema.json)
report records the deterministic checks and their limitations. Large-corpus
descriptors advertise these resources as `terms` and `term_validation`
entrypoints. Explorer rejects namespace, provenance, identifier, snapshot or
conformance contradictions before presenting the registry.

## Authoring rules

- Use UTF-8 and YAML 1.2 Core Schema.
- Follow OKF v0.2 reserved-file structure and declare `okf_version: "0.2"` at
  the bundle-root index.
- Use `generated`, `sources`, `verified`, `status` and `stale_after` with their
  v0.2 meanings. `timestamp` is accepted only as a v0.1 compatibility field.
- Use one YAML-LD document in each Markdown frontmatter block.
- Give every production concept an absolute `@id`.
- Use IRI-valued `@type` values; retain human labels separately.
- Quote dates and timestamps even though conforming YAML-LD processors treat
  Core Schema date-looking values as strings.
- Treat Markdown links as navigation or `dcterms:references`; domain predicates
  require explicit evidence.
- Do not use comments, key order or YAML anchor names to carry meaning.
- Give every material directed relationship a stable assertion IRI, absolute
  source, predicate and target IRIs, governed relationship kind, preferred and
  inverse labels, status, scope, authority, derivation, observation time,
  evidence and rights.
- Require canonical credential-free HTTP(S) authority, evidence/resource and
  rights sources: no missing host, literal whitespace, quotes, malformed
  escapes, credentials, unsafe delimiters or out-of-range port.
- Keep a safe local Explorer route separate from the absolute semantic IRI and
  compile both into runtime relationship rows.
- Publish each governed relationship as a direct semantic triple and one
  evidence-bearing `okf:RelationshipAssertion`, or generate both
  deterministically from one assertion source.

## Authority classes

Every generated or inferred statement must be distinguishable as one of:

- official — directly published by the authoritative source;
- normalized — deterministic projection/canonicalisation of official data;
- inferred — rule-derived and accompanied by evidence/confidence;
- model-derived — produced with model assistance and accompanied by passage
  evidence, model/method version, confidence and evaluation status.

## Compatibility

`okf-explorer-bundle.v0` and `okf-explorer-large-corpus.v1` remain supported
runtime projections. They are generated artefacts rather than the semantic
authority.

An Attested Computation contract is metadata. Neither the profile nor Explorer
authorises or automatically invokes computation, executor or attester
resources.

## Validation

Release checks cover Markdown, YAML-LD representation constraints, JSON Schema,
JSON-LD expansion using pinned contexts, compiled artefact reconciliation,
search/adjacency integrity and live publication headers/deep links.

The complete authoring and Reader explanation is
[OKF 0.2 and YAML-LD semantic authoring](../../../docs/okf-0.2-yaml-ld-semantic-authoring.md).

The normative upstream serialisation work is the
[YAML-LD 1.0 Working Draft](https://www.w3.org/TR/yaml-ld-10/). This profile is
an OKF application profile, not a claim that YAML-LD is already a W3C
Recommendation.
