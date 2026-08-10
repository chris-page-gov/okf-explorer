# YAML-LD Default Semantic Layer Implementation Plan

Status: local implementation complete across the nine reviewed `okf-*`
repositories on 9 August 2026; commit, release, deployment and public adoption
remain separately governed.

This document stages the move to a YAML-LD semantic layer as the default
authoring and normalization path while preserving the current Explorer JSON
runtime contracts during migration.

The current architecture already states that Markdown YAML-LD frontmatter and
`okf-bundle.yamlld` are the semantic authoring layer, while the Explorer still
consumes JSON during the migration. This plan makes that intent operational
without introducing a flag day or breaking existing bundle URLs.

## Goal

Make the canonical semantic layer the source of truth for bundle identity,
assertions, provenance and governed vocabularies, while continuing to publish
the current Explorer runtime descriptors, manifests and adjacency projections.

## Non-Goals

This plan does not attempt to:

- replace chunked JSON adjacency with one monolithic RDF artifact;
- enable arbitrary remote context retrieval in the browser;
- require OWL reasoning in the static client;
- silently merge stale semantic and runtime releases;
- upgrade model-assisted assertions into official classifications.

## Current State

1. The semantic authoring layer already exists in Markdown YAML-LD frontmatter
   and `okf-bundle.yamlld`.
2. The runtime Explorer still primarily consumes JSON descriptors and runtime
   relationship rows.
3. The fetch layer already accepts JSON, JSON-LD and YAML-LD with bounded,
   non-executable parsing rules.
4. Semantic resources are currently exposed mainly as governed alternates,
   not as the primary runtime loading path.

## Implemented foundation (9 August 2026)

- `okf.semantic.json` and its repository-contract schema now make the semantic
  input, generated outputs, migration state, build/check commands and Reader
  delivery plane explicit in every `okf-*` repository.
- `scripts/reconcile_okf_repositories.py` installs the bounded contract/guidance
  block and audits OKF 0.2 roots, declared semantic surfaces and sampled rich
  relationship rows across the repository family.
- The small-bundle Reader normalizer now accepts a bounded YAML-LD/JSON-LD
  `@graph` of explicit route-bearing entities and reified relationship
  assertions without remote context expansion. It fails closed on missing,
  duplicate, unsafe or inconsistent routes and incomplete governed assertions;
  it never substitutes an absolute IRI for a local route.
- The Explorer's bundled AI-infrastructure corpus now publishes synchronized
  root YAML-LD and JSON-LD graphs. All 579 Markdown links are normalized as
  derived `dcterms:references` assertions with direct triples, reification,
  evidence and rights; no domain predicate is inferred from document layout.
- Existing small- and large-bundle relationship cards already preserve and
  expose direction, semantic identity, predicate, inverse label, authority,
  derivation, evidence, rights and freshness.
- Large corpora can now advertise a SHA-256-bound rich relationship runtime.
  The Reader validates active/default versus historical/rejected lifecycle
  planes, bounded gzip shards, safe route/IRI pairs and per-route, per-plane
  assertion-ID commitments before it presents directed edges.
- Targeted relationship locators operate independently of record locators and
  are selected before whole-plane fallbacks. Rich shards decode sequentially,
  retain only governed fields and enforce aggregate compressed-byte and
  retained-text limits as well as row/chunk ceilings.
- The pinned shared Draft 2020-12 assertion schema itself requires both human
  labels and canonical credential-free HTTP(S) provenance/rights sources; each
  producer validates its complete generated semantic and runtime population
  before writing a conformant receipt.
- All nine reviewed repositories now have locally implemented semantic
  contracts, producers or fixtures and pass their applicable local semantic
  migration checks. The separate release ledger is maintained in
  [OKF 0.2 and YAML-LD semantic authoring](okf-0.2-yaml-ld-semantic-authoring.md#local-implementation-and-release-ledger).

The phases below are retained as the implementation record and maintenance
contract. They do not authorize publication: changed bytes still need each
repository's candidate freeze, review, release, deployment and exact public
journey gates. Descriptor-only YAML-LD and legacy local predicate names remain
non-conformant if they are reintroduced.

## Target State

1. One canonical semantic graph per published snapshot.
2. Generated JSON-LD as an interchange projection of that graph.
3. Generated Explorer runtime JSON as a navigation, search and bounded loading
   projection of that same graph.
4. One documented normalization boundary from semantic assertions into runtime
   relationship rows.
5. Safe internal navigation through a validated IRI-to-route registry rather
   than guessed route derivation.

## Phase 1: Canonical Semantic Build Boundary

Primary files:

- [`scripts/okf_semantic.py`](../scripts/okf_semantic.py)
- bundle builders under
  [`scripts/`](https://github.com/chris-page-gov/okf-explorer/tree/main/scripts)
- semantic profile material under [`profiles/bundle-wiki/v1/`](../profiles/bundle-wiki/v1/)

Work:

1. Treat Markdown YAML-LD frontmatter and `okf-bundle.yamlld` as the primary
   semantic source for authored bundles.
2. Normalize the semantic graph once per snapshot against pinned local
   contexts.
3. Generate `okf-bundle.jsonld` and the runtime JSON descriptors from that
   normalized graph rather than maintaining them as parallel hand-authored
   materials.
4. Record release identity so a runtime descriptor and semantic projection can
   be checked for snapshot and version alignment.

Exit condition:

Every published runtime descriptor is provably a projection of one semantic
source snapshot.

## Phase 2: Shared Semantic-To-Runtime Normalization

Primary files:

- [`apps/okf-explorer/src/lib/types.ts`](../apps/okf-explorer/src/lib/types.ts)
- [`apps/okf-explorer/src/lib/sources/`](https://github.com/chris-page-gov/okf-explorer/tree/main/apps/okf-explorer/src/lib/sources)
- [`docs/yaml-ld-relationship-assertion-mapping.md`](yaml-ld-relationship-assertion-mapping.md)

Work:

1. Introduce one normalization path that converts governed semantic assertions
   into the current runtime relationship shape.
2. Preserve both global semantic identity and local navigation identity by
   carrying route IDs alongside `source_iri` and `target_iri`.
3. Preserve `@id` and `@type` for semantic consumers even where the current UI
   has no dedicated fields for them.
4. Keep authority, derivation, evidence, rights and review fields intact.

Exit condition:

Small bundles, large-corpus relationship rows and federation inline
relationships all derive from one consistent mapping rule set.

## Phase 3: Small Bundle Default Loading

Primary files:

- [`apps/okf-explorer/src/lib/sources/smallBundle.ts`](../apps/okf-explorer/src/lib/sources/smallBundle.ts)
- [`apps/okf-explorer/src/lib/sources/fetch.ts`](../apps/okf-explorer/src/lib/sources/fetch.ts)

Work:

1. Prefer declared semantic descriptors when a small bundle publishes them.
2. Load YAML-LD through the existing safe parser and normalize it into the
   runtime corpus shape.
3. Continue emitting the current JSON bundle projection for compatibility.
4. Fail closed on context mismatches, malformed assertions, or snapshot drift.

Exit condition:

The smallest bundle path can be sourced from YAML-LD without changing the user
facing Reader, Graph, Timeline, Resources or Search contracts.

## Phase 4: Large-Corpus And Federation Adoption

Primary files:

- [`apps/okf-explorer/src/lib/sources/largeCorpus.ts`](../apps/okf-explorer/src/lib/sources/largeCorpus.ts)
- [`apps/okf-explorer/src/lib/sources/federation.ts`](../apps/okf-explorer/src/lib/sources/federation.ts)
- [`profiles/federation/v1/`](../profiles/federation/v1/)

Work:

1. Keep large-corpus runtime shards, manifests and route-scoped adjacency—or
   the digest-bound rich runtime and SHA-256 locator—as the operational
   delivery plane.
2. Treat the semantic layer as the source for identity, predicate governance,
   evidence-bearing assertions and registry material.
3. For federation control-plane rows, keep `source` and `target` as child IDs
   and bind global semantic identity through `source_iri` and `target_iri`.
4. Keep summary validation exact: predicate, authority and freshness totals
   must still add to the declared total.

Exit condition (met locally):

Federations and large corpora retain bounded startup and chunked loading while
their semantics come from the same governed source as small bundles; route
hydration fails closed when its per-plane assertion commitment differs.

## Phase 5: Navigation And Presentation

Primary files:

- [`apps/okf-explorer/src/lib/viewer/relationshipPresentation.ts`](../apps/okf-explorer/src/lib/viewer/relationshipPresentation.ts)
- [`apps/okf-explorer/src/lib/viewer/governedTerms.ts`](../apps/okf-explorer/src/lib/viewer/governedTerms.ts)
- IRI-to-route registry and predicate registry material under
  [`profiles/bundle-wiki/v1/`](../profiles/bundle-wiki/v1/)

Work:

1. Resolve internal navigation through a validated IRI-to-route registry.
2. Prefer governed predicate labels and inverse labels when present.
3. Keep official, derived, model-assisted, synthetic and unclassified
   authority states visibly separate.
4. Continue to present semantic descriptors as downloadable governed
   resources even after they become the build-time default.

Exit condition:

The UI consumes semantically governed labels and safe routes without becoming
dependent on live remote ontology resolution.

## Phase 6: Validation And Test Coverage

Primary files:

- tests under [`apps/okf-explorer/src/lib/sources/`](https://github.com/chris-page-gov/okf-explorer/tree/main/apps/okf-explorer/src/lib/sources)
- UI coverage under [`apps/okf-explorer/tests/ui/`](https://github.com/chris-page-gov/okf-explorer/tree/main/apps/okf-explorer/tests/ui)
- semantic schemas under [`profiles/bundle-wiki/v1/`](../profiles/bundle-wiki/v1/)

Work:

1. Validate semantic assertions against the bundle-wiki semantic assertion
   schema and runtime rows against `okf-relationship-assertion.v2`.
2. Add fixtures that prove identical runtime behavior for equivalent YAML-LD
   and JSON sources.
3. Test federation child-ID validation separately from semantic IRI
   preservation.
4. Test failure modes for context drift, malformed evidence, stale semantic
   alternates and snapshot mismatches.

Exit condition:

The migration has bundle-level, loader-level and UI-level evidence rather than
only architectural intent.

## Recommended Rollout Order

1. Make YAML-LD authoritative at build time first.
2. Centralize the semantic-to-runtime mapping second.
3. Turn on small-bundle semantic loading third.
4. Keep large-corpus JSON shards as the delivery plane while switching their
   identity and governed assertions to semantic source material.
5. Move federation and registry generation to the same semantic default last.

## Decision Log To Keep Explicit

As implementation starts, keep these choices visible:

1. Whether runtime `predicate` becomes mandatory as a canonical IRI for all new
   bundles.
2. Whether `confidence_score` is ever mirrored into `confidence` for legacy
   display compatibility.
3. Whether assertion `@type` is preserved as a first-class runtime property or
   retained only for semantic consumers.
4. How snapshot drift between semantic and runtime projections is surfaced in
   the UI and validation tooling.
