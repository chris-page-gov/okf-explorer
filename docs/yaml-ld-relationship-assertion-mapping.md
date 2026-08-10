# YAML-LD Relationship Assertion Mapping

Status: implementation guide.

This document records how the evidence-bearing semantic assertion model in the
canonical YAML-LD layer should project into the current Explorer relationship
runtime without changing the meaning of the underlying assertion.

The semantic source is the bundle-wiki semantic assertion contract in
[`profiles/bundle-wiki/v1/semantic-assertion.schema.json`](../profiles/bundle-wiki/v1/semantic-assertion.schema.json)
with term bindings from
[`profiles/bundle-wiki/v1/semantic-context.jsonld`](../profiles/bundle-wiki/v1/semantic-context.jsonld).
The current Explorer runtime row contract is
[`okf-relationship-assertion.v2`](../profiles/federation/v1/relationship-assertion.schema.json)
and the in-app TypeScript shape is
[`OkfRelationship`](../apps/okf-explorer/src/lib/types.ts).

## Design Rules

1. The YAML-LD semantic assertion is the authoritative source.
2. `okf-relationship-assertion.v2` is a generated runtime projection, not a
   competing hand-authored truth source.
3. A governed relationship should exist twice in the semantic layer:
   one direct triple and one evidence-bearing assertion record.
4. The projection must preserve authority, derivation, evidence, rights,
   freshness and review state without collapsing them into one label.
5. Confidence must never upgrade a `model-derived` assertion into `official`
   or `derived`.
6. Context resolution stays pinned and local. The browser must not rely on
   arbitrary remote context retrieval.

## Field Mapping

| Semantic assertion field | Runtime projection | Rule |
| --- | --- | --- |
| `@id` | `id` | Preserve the assertion IRI verbatim as the stable relationship identifier. |
| `@type` | passthrough extension field | Keep the semantic type on the runtime object when present; there is no dedicated `OkfRelationship` field for it. |
| `source` | `source`, `source_iri` | Resolve the semantic IRI through the integrity-bound IRI-to-route registry. Set `source` to the safe local route and `source_iri` to the absolute IRI. An endpoint without a governed route remains semantic-only until the producer authors one; the runtime must not guess or substitute an absolute URL as a local route. |
| `target` | `target`, `target_iri` | Apply the same rule as `source`. |
| `predicate` | `predicate` | Preserve the canonical predicate identifier as the runtime `predicate` string. |
| `kind` | `kind` | Carry the primary human-readable label used by current cards and graph legends. |
| `label` | `label` | Preserve when distinct from `kind`; otherwise repeat the governed `kind` value because the shared runtime contract requires both fields. |
| `inverse_label` | `inverse_label` | Preserve for reverse-direction presentation. |
| `assertion_status` | `assertion_status` | Preserve unchanged. |
| `assertion_scope` | `assertion_scope` | Preserve unchanged. |
| `authority.class` | `authority.class` | Preserve unchanged and validate against `assertion_status` and `assertion_scope`. |
| `authority.label` | `authority.label` | Preserve unchanged. |
| `authority.source` | `authority.source` | Preserve the canonical credential-free HTTP(S) source URL; reject browser-repaired or unsafe forms. |
| `derivation` | `derivation` | Preserve the semantic derivation identifier as a string. |
| `derivation_activity` | `derivation_activity` | Preserve unchanged. |
| `rule` | `rule` | Preserve unchanged. |
| `supporting_assertions` | `supporting_assertions` | Preserve as the set of upstream assertion identifiers that support an inferred assertion. |
| `confidence_score` | `confidence_score` | Preserve as the machine-comparable score. Do not mirror it into `confidence` unless a compatibility surface requires a display alias. |
| `strength` | `strength` | Preserve unchanged. |
| `count` | `count` | Preserve unchanged. |
| `observed_at` | `observed_at` | Preserve unchanged. |
| `stale_after` | `stale_after` | Preserve unchanged. |
| `review_status` | `review_status` | Preserve unchanged. |
| `evidence[]` | `evidence[]` | Preserve structured evidence rows rather than flattening them to URLs when the source declares hashes, locators, or field provenance; validate `url` and optional `resource` as canonical HTTP(S). |
| `rights.source` | `rights.source` | Preserve the canonical credential-free HTTP(S) source URL. |
| `rights.assertion` | `rights.assertion` | Preserve unchanged. |

## Projection Algorithm

1. Expand or normalize the authored YAML-LD against the pinned local context
   set and convert all IRI-valued fields to absolute strings.
2. Emit the direct semantic triple from `source`, `predicate` and `target`.
3. Emit one runtime relationship row carrying the same identifiers plus the
   evidence-bearing assertion metadata.
4. Resolve internal navigation through the integrity-bound IRI-to-route
   registry rather than guessing routes from external identifiers.
5. Validate every semantic assertion against the pinned local shared Draft
   2020-12 schema, then validate the runtime row against the same status, scope
   and authority rules as `okf-relationship-assertion.v2`.
6. Compile relationship summaries only after complete-population row-level
   validation succeeds.

## Status And Authority Compatibility Rules

The generated runtime row must keep the existing invariant:

- `official` plus `real-world` implies `authority.class = official`.
- `normalized` plus `real-world` implies `authority.class = derived`.
- `inferred` plus `real-world` implies `authority.class = derived`.
- `model-derived` plus `real-world` implies `authority.class = model-assisted`.
- `synthetic-fixture` implies `authority.class = synthetic`.

Additional requirements remain unchanged:

- `inferred` requires `rule`, `supporting_assertions`, `confidence_score` and
  `derivation_activity`.
- `model-derived` requires `confidence_score`, `derivation_activity` and
  `review_status`.

## Federation Special Case

Federation inline relationships are a control-plane summary, not a general RDF
instance graph. Their `source` and `target` fields must continue to reference
declared child IDs because the federation loader validates them against the
child list.

When a federation also wants stable global identity:

- keep `source` and `target` as child IDs;
- place the global identifiers in `source_iri` and `target_iri`;
- keep the canonical governed predicate in `predicate`;
- keep authority, derivation, freshness, evidence and rights unchanged.

This preserves the current overview loader contract while allowing the
federation to participate in the semantic layer.

## Small And Large Bundle Guidance

For small bundles and large-corpus relationship rows:

- prefer canonical IRIs in `predicate`;
- preserve `kind` or `label` for human display;
- preserve `source_iri` and `target_iri` even when a route is also known;
- keep structured evidence objects whenever the source declares reversible
  provenance, hashes, or locators.

## Non-Goals

This mapping does not:

- require a full browser reasoner;
- replace route-scoped JSON adjacency for very large corpora;
- permit arbitrary remote contexts in the browser;
- treat presentation-only grouping as a semantic assertion.
