# OKF Bundle Wiki Profile v1

Status: experimental implementation profile, 11 July 2026.

This profile defines a federated publication contract for independently hosted
Open Knowledge Format bundle wikis. It uses YAML-LD Basic profile semantics for
authoring and publishes JSON-LD plus Explorer-compatible JSON projections.

The profile URI is:

`https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/`

## Required bundle surfaces

- `okf-bundle.yamlld` — canonical semantic descriptor.
- `okf-bundle.jsonld` — deterministic JSON-LD projection.
- `okf-explorer.json` — current Explorer runtime descriptor.
- `data/manifest.json` — counts, indexes, chunks and performance contract.
- `context/okf-bundle-v1.jsonld` — pinned context copy.
- `checksums.json` — generated artifact integrity metadata.

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

## Authoring rules

- Use UTF-8 and YAML 1.2 Core Schema.
- Use one YAML-LD document in each Markdown frontmatter block.
- Give every production concept an absolute `@id`.
- Use IRI-valued `@type` values; retain human labels separately.
- Quote dates and timestamps even though conforming YAML-LD processors treat
  Core Schema date-looking values as strings.
- Treat Markdown links as navigation or `dcterms:references`; domain predicates
  require explicit evidence.
- Do not use comments, key order or YAML anchor names to carry meaning.

## Authority classes

Every generated or inferred statement must be distinguishable as one of:

- official — directly published by the authoritative source;
- normalized — deterministic projection/canonicalization of official data;
- inferred — rule-derived and accompanied by evidence/confidence;
- model-derived — produced with model assistance and accompanied by passage
  evidence, model/method version, confidence and evaluation status.

## Compatibility

`okf-explorer-bundle.v0` and `okf-explorer-large-corpus.v1` remain supported
runtime projections. They are generated artifacts rather than the semantic
authority.

## Validation

Release checks cover Markdown, YAML-LD representation constraints, JSON Schema,
JSON-LD expansion using pinned contexts, compiled artifact reconciliation,
search/adjacency integrity and live publication headers/deep links.

The normative upstream serialization work is the
[YAML-LD 1.0 Working Draft](https://www.w3.org/TR/yaml-ld-10/). This profile is
an OKF application profile, not a claim that YAML-LD is already a W3C
Recommendation.
