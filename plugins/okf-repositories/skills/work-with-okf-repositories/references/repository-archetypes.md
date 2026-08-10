# OKF repository archetypes

Use this map to choose the correct read order and avoid transferring one
domain's rules into another. Treat repository state and counts as discoverable
facts; do not freeze them from this reference.

## Product shapes

| Archetype | First files | Main risk |
|---|---|---|
| Consumer/profile implementation | `AGENTS.md`, product README, profile docs, schemas, fixtures | treating consumer extensions as OKF core |
| Small Markdown bundle | root `index.md`, `okf.config.json`, `okf-bundle.json`, concept Markdown | editing a generated projection or losing permissive core compatibility |
| Governed Foundry producer | domain profile, consumer lock, dependency graph, source inventory, release evidence | confusing a planned or locally passing gate with approval or release |
| Large-corpus producer | `okf-explorer.json`, data manifest, overview, search, locator, adjacency or bounded whole-plane chunks | hydrating an unbounded corpus or combining distinct assertion planes |
| Federation | federation descriptor, child registry, authority/coverage ledgers | presenting planned, stale, unavailable, or independently governed children as one corpus |
| Enriched publication | base corpus, enrichment input evidence, accepted manifest, audit | promoting derived/model output into official classification |

Many repositories combine archetypes. Select every applicable contract.

## Current repository family

### `okf-explorer`

Use as the canonical consumer, compatibility, profile, Foundry, evaluation,
and authoring-tool source. It best explains the boundary between permissive OKF
v0.2 Markdown and optional Explorer/semantic/large-corpus/federation profiles.
Do not treat its bundled AI-infrastructure corpus or application-specific UI
extensions as universal OKF requirements.

### `okf-ai-infrastructure`

Use as the clearest compact Markdown/YAML-LD bundle example. It demonstrates a
human-readable authored tree, structured frontmatter, generated semantic and
Explorer projections, and a short validation loop.

### `okf-uk-government-apis`

Use as a compact large-corpus API/data catalogue example. It demonstrates
source tier, adapter, confidence, licence, protocol, standards mapping, search,
adjacency, and generated publication separation.

### `okf-ons`

Use for metadata-evidence and bounded enrichment discipline. It is strongest
on distinguishing evidence presence from statistical quality, source-native
versions and geography, applicability denominators, external caches, immutable
replacement cohorts, and byte-bounded Explorer hydration.

### `okf-govuk-content`

Use for high-assurance acquisition and large content-pipeline controls. It is
strongest on requirements/traceability lockstep, immutable attempts,
content-addressed artifacts, resumability, source-body boundaries,
model-assisted artifact ledgers, complete-corpus reconciliation, and release
questions.

### `okf-uk-legislation`

Use for very large corpora, independently governed relationship planes,
federation, legal authority boundaries, immutable acquisition evidence,
model-assisted audit, restart recovery, cost disclosure, and ordered release
reproduction. Never generalize legal-domain constraints into other domains,
but retain its evidence-state separation.

### `okf-LandRegistry`

Use as the strongest bounded Foundry and exact-digest release-assurance
example. It demonstrates a reviewed domain profile, consumer lock, explicit
artifact dependency graph, two-stage fixtures, source/publication plane
digests, change-impact closure, independent release roles, and exact deployed
journeys.

### `okf-uk-living`

Use as the strongest application and educational ontology exemplar. It
demonstrates a citizen-centred life-course spine, 24 domains, a named
service-family denominator, vertical slices before population expansion,
jurisdiction variants, public/private dependencies, authority and redress,
typed link-only sources, synthetic journeys, competency questions, governed
predicates, specialist-review status, frozen population assurance, and a
publication preview that remains explicitly below release grade.

It is the best single example for explaining what an ontology does in an
everyday domain and for showing how scope, evidence, semantics, journeys, and
publication fit together. It is not the sole normative template: combine it
with `okf-explorer` for format/consumer rules and `okf-LandRegistry` for the
most general release-assurance pattern.

### `okf-testing`

Treat the populated non-Git workspace as an executable conformance-fixture
corpus, not as a publication repository. Its digest-bound expectations include
positive rich semantics, precise negative cases and one explicitly scoped
sparse Reader-compatibility case. An empty or uninitialized directory would
still be no implementation evidence; confirm `fixtures/expectations.json` and
the declared checks rather than inferring a test contract from the name.

## Read-order decisions

### To answer from a bundle

1. Read the public or local descriptor.
2. Confirm identity, status, snapshot, counts, schema, limitations, and entry
   points.
3. Use overview and search before records.
4. Load route-scoped record and adjacency shards.
5. Follow source and provenance links.

### To change a bundle

1. Read agent guidance and current status.
2. Find authored inputs and generator ownership.
3. Find the relevant domain profile, denominator, rights policy, predicate
   registry, and evaluation contract.
4. Find exact environment setup, build/check commands and consumer lock.
5. Trace the dependency graph before editing.

### To review an implementation

1. Check OKF core separately from every claimed profile.
2. Review source/generated and acquisition/publication boundaries.
3. Trace a sample assertion from source evidence through authored control,
   generated relationship, consumer display, evaluation, and release receipt.
4. Test ordinary, exception, missing-evidence, stale, and unsupported cases.
5. Compare status claims with machine-readable candidate and publication
   artifacts.
