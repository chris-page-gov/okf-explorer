# OKF 0.2 and YAML-LD semantic authoring

Status: implemented interoperability contract, 9 August 2026.

This document is the common authoring, generation and Reader contract for the
`okf-*` repositories. It explains the two layers that must remain distinct:

1. **OKF 0.2 core** is the deliberately small, forward-compatible Markdown
   format. A concept needs parseable YAML frontmatter and a non-empty `type`;
   a bundle root can declare `okf_version: "0.2"`.
2. **The OKF Bundle Wiki semantic profile v1** is an additive application
   profile. It supplies stable semantic identity, YAML-LD/JSON-LD,
   evidence-bearing directed assertions, governed predicates, safe Explorer
   routes and deterministic runtime projections.

Semantic requirements in this document are profile requirements, not claims
about the upstream OKF core specification. The upstream specification allows
unknown fields and deliberately defers a general semantic-layer template.

## The one-source model

```mermaid
flowchart LR
  A["Authored Markdown YAML-LD, source registers and domain assertions"] --> B["Pinned-context semantic normalization"]
  B --> C["Canonical YAML-LD graph"]
  B --> D["Deterministic JSON-LD projection"]
  B --> E["Explorer nodes and relationship rows"]
  E --> F["Small bundle JSON"]
  E --> G["Large-corpus route adjacency"]
  E --> J["Digest-bound rich relationship runtime"]
  C --> H["Explorer safe YAML-LD reader"]
  F --> I["Reader, graph and relationship card"]
  G --> I
  J --> I
  H --> I
```

YAML-LD or Markdown YAML-LD is the semantic authoring boundary. JSON-LD is an
interchange projection. Explorer JSON and adjacency shards are delivery
projections. A repository must not maintain all three as independent truths.

Large collections still use manifests, locators and hash-sharded adjacency so
the browser can start with a bounded overview. Semantic authority does not
require the browser to download an entire RDF graph.

## A rich directed relationship

A relationship is not just two routes and a label. It has three identities:

- the source entity IRI;
- the predicate IRI; and
- the target entity IRI.

It also has an assertion identity and evidence about why this repository is
entitled to make or project that statement. The canonical authored pattern is
a direct triple plus one reified `okf:RelationshipAssertion`:

```yaml
---
"@context":
  - https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/context.jsonld
  - https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/semantic-context.jsonld
  - life: https://example.org/uk-life#
    provided_by:
      "@id": life:providedBy
      "@type": "@id"
"@id": https://example.org/services/register-a-birth
"@type": life:PublicService
route: service/register-a-birth
type: Public service
title: Register a birth
description: Educational service example; follow the current authority for a real case.
generated: {by: process:life-course-build, at: "2026-08-09T00:00:00Z"}
provided_by:
  "@id": https://example.org/organisations/register-office
  "@type": life:PublicBody
  route: organisation/register-office
  type: Public body
  title: Register office
assertions:
  - "@id": https://example.org/assertions/register-a-birth-provided-by
    "@type": [rdf:Statement, okf:RelationshipAssertion]
    source: https://example.org/services/register-a-birth
    predicate: life:providedBy
    target: https://example.org/organisations/register-office
    kind: provided by
    label: is provided by
    inverse_label: provides
    assertion_status: normalized
    assertion_scope: real-world
    authority:
      class: derived
      label: Deterministic projection of the reviewed service register
      source: https://example.org/source/service-register
    derivation: https://example.org/rules/provider-field-v1
    observed_at: "2026-08-09T00:00:00Z"
    evidence:
      - "@id": https://example.org/evidence/register-a-birth-provider
        type: source-metadata
        url: https://example.org/source/service-register
        source_field: provider
        source_value_sha256: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
        retrieved_at: "2026-08-09T00:00:00Z"
    rights:
      source: https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/
      assertion: source-derived-metadata
---
```

The direct triple makes the graph useful to ordinary RDF tooling. The
assertion node carries provenance, authority, freshness, review and rights.
The build fails when only one side exists, when two assertions reify the same
triple in one assertion plane, or when the IRI-to-route registry cannot map an
internal endpoint safely.

## Identity and routes

Semantic identity and browser navigation are intentionally separate:

| Concern | Required representation |
| --- | --- |
| Entity identity | Absolute `@id` IRI |
| Predicate identity | Absolute IRI, normally compacted through a pinned context |
| Assertion identity | Absolute `@id` IRI |
| Explorer navigation | Relative, validated `route` without query, fragment, dot segment or Markdown suffix |
| Runtime endpoint | Local `source`/`target` route plus preserved `source_iri`/`target_iri` |

Never manufacture an absolute semantic IRI by pretending an Explorer route is
already global. Never guess a local route from an external IRI in the browser.
The generator owns the integrity-bound IRI-to-route registry.

## Status, scope and authority

These axes are independent:

| Axis | Governed values |
| --- | --- |
| Assertion status | `official`, `normalized`, `inferred`, `model-derived` |
| Assertion scope | `real-world`, `synthetic-fixture` |
| Authority class | `official`, `derived`, `model-assisted`, `synthetic`, `unclassified` |

For real-world assertions, `official` maps to official authority;
`normalized` and `inferred` map to derived authority; and `model-derived` maps
to model-assisted authority. A synthetic fixture always has synthetic
authority. Editorial examples belong in a separately labelled synthetic
fixture or narrative plane; they must not be smuggled into a real-world
assertion by inventing another authority level.

Confidence, strength and count are also different. Confidence estimates an
assertion; strength is a domain-defined magnitude; count is multiplicity. None
of them changes authority.

Authority, evidence/resource and rights source links are canonical,
credential-free HTTP(S) URLs. Producers percent-encode query values and reject
literal whitespace, quotes, invalid escapes, credentials and non-web schemes;
the Reader never turns an unsafe provenance string into a clickable link.

## What the generator must produce

For a governed semantic bundle the normal build order is:

1. parse UTF-8 YAML 1.2 without executable tags, duplicate keys, cyclic
   aliases, non-string mapping keys or non-finite numbers;
2. resolve only the pinned, reviewed local context set;
3. validate OKF 0.2 concept metadata and profile requirements separately;
4. expand/normalize semantic identity and reconcile direct triples with
   assertion nodes;
5. validate evidence, authority/status compatibility and predicate policy;
6. build the IRI-to-route and predicate registries;
7. emit deterministic YAML-LD and JSON-LD from the same normalized graph;
8. compile `okf-relationship-assertion.v2` rows with local routes and retained
   IRIs;
9. produce small-bundle JSON or large-corpus adjacency, search and locator
   artifacts; and
10. bind the release snapshot, counts and output digests before publication.

The schema gate covers the complete generated assertion population before a
producer writes a conformant receipt. The family-wide reconciler samples
shards as a fast regression check; it deliberately does not replace exhaustive
producer validation.

The reusable implementation is in
[`scripts/okf_semantic.py`](../scripts/okf_semantic.py). The profile schemas are
under [`profiles/bundle-wiki/v1/`](../profiles/bundle-wiki/v1/). Repository
builders may use domain-specific generators, but their
[`okf.semantic.json`](../okf.semantic.json) contract must make the same
boundaries and commands discoverable.

## What the Reader understands

The Reader supports five bounded delivery paths:

- generated small-bundle JSON;
- a large-corpus relationship plane split into bounded chunks whose declared
  total remains below the whole-plane hard cap;
- large-corpus JSON descriptors plus route-scoped adjacency;
- a digest-bound large-corpus rich relationship runtime with active/default
planes, gzip chunks and a SHA-256 route locator whose per-plane assertion-ID
commitments prove the selected route was hydrated completely; and
- an explicit YAML-LD/JSON-LD `@graph` containing route-bearing entity nodes
and reified `RelationshipAssertion` nodes.

Relationship adjacency and rich-runtime locators are valid targeted entry
points independently of a record locator. The Reader chooses them before any
whole-plane relationship fallback, including for aggregate/topic routes that
are not dataset records.

For a direct YAML-LD graph, the Reader parses the representation safely but
does not fetch remote contexts, run OWL inference or guess RDF meaning. Each
internal entity therefore needs an explicit `route`, and each relationship
needs the complete governed assertion fields: stable identity, explicit
source/predicate/target IRIs, kind, preferred/inverse labels, status, scope,
authority, derivation, observation time, evidence and rights. A missing,
duplicate, unsafe or inconsistent identity/route/assertion makes the explicit
graph fail closed. The build remains responsible for semantic expansion,
direct-triple reconciliation and exhaustive producer validation.

The rich runtime is intentionally not an instruction to download an arbitrary
hub. If a route's committed incident set would exceed the aggregate chunk or
row ceiling—or its selected chunks exceed the 64 MiB compressed fan-out
budget—the Reader reports the exact fan-out and fails before fetching
relationship shards. Rich chunks decode sequentially under the 64 MiB
per-resource cap, discard undeclared row properties, limit evidence/support
arrays and enforce 32 Ki UTF-16 text units per retained row plus 32 Mi text
units per hydration/cache. The assertion population remains represented in
the digest-bound semantic/runtime planes; high-degree aggregate topics require
a separate paginated or analytical query surface rather than an unbounded
graph render.

The graph keeps arrow direction. The relationship card exposes source,
relationship and target separately and preserves assertion ID, predicate,
inverse label, semantic IRIs, status, scope, authority, derivation, supporting
assertions, confidence, observation/freshness, evidence and rights. Reverse
navigation uses the inverse label only for presentation; it does not create a
second asserted triple.

## Repository-local contract

Every `okf-*` repository has one `okf.semantic.json`, validated by
[`repository-contract.schema.json`](../profiles/bundle-wiki/v1/repository-contract.schema.json).
It records:

- the root OKF 0.2 index and repository role;
- authoritative semantic inputs and generated outputs;
- current semantic migration state and limitations;
- assertion, identity, predicate and context policy;
- exact build and check commands; and
- the Reader delivery path and preserved fields.

Run the cross-repository audit with:

```sh
python3 scripts/reconcile_okf_repositories.py
```

Use `--strict` when selecting a release candidate. The default mode separates
hard contract/core errors from explicit migration warnings so legacy local
predicate names or descriptor-only YAML-LD remain visible rather than being
silently treated as complete.

## Local implementation and release ledger

**Completed locally** means the authored controls, generators, generated
working-tree artifacts and stated deterministic checks implement the migration.
It does **not** mean the changes are committed, tagged, released, deployed or
verified at a public URL. Those are deliberately separate columns and gates.

| Repository | Local implementation state | Semantic/runtime result | Remaining non-migration gate |
| --- | --- | --- | --- |
| `okf-explorer` | Completed locally | 155 entities and 579 conservative `dcterms:references` assertions in synchronized YAML-LD, JSON-LD and compatibility runtime projections; bounded small-graph and rich-sharded Reader paths | Commit/review, release construction, deployment and exact public-browser verification |
| `okf-ai-infrastructure` | Completed locally | 155 entities, including 142 production concepts, and 579 direct/reified/runtime relationships validated exhaustively against the exact shared schema; a deterministic receipt binds schema, identity, payload and triple digests, and the reproducible Python 3.12 environment is lock-file governed | Existing preview review and release gates |
| `okf-LandRegistry` | Completed locally | 2,203 records with one governed Welsh-to-English `schema:translationOfWork` assertion in exact direct/reified/runtime parity; both assertion projections pass the exact shared schema and the generated receipt binds their identity and triple digests | Freeze a new candidate and replace the intentionally unchanged prior-release receipt |
| `okf-govuk-content` | Completed locally | 1,106 nodes and 392 direct/reified/runtime relationships exhaustively validated against the exact shared schema in digest-bound compressed shards | Full-corpus hydration, closing reconciliation and release promotion beyond the governed demonstrator |
| `okf-ons` | Completed locally | 5,097 entities and 19,735 exact-schema-valid assertions: 19,452 inferred discovery relationships and 283 normalized cross-source representations, delivered through compact roots and digest-bound deterministic-gzip shards | Review and deploy the new r6 candidate; no statistical equivalence or certification is implied |
| `okf-uk-government-apis` | Completed locally | 81,181 route-bearing entities and 277,449 exact-schema-valid assertions across 73 semantic shards; unsafe provenance URLs were canonicalized while legacy protocol labels remain only as aliases of 18 canonical routes | Assign a fresh candidate version/time, run the existing release gates and deploy exact bytes |
| `okf-uk-legislation` | Completed locally | 929,053 exact-schema-valid rich assertions across separately governed active and historical lifecycle planes; 906,754 are active and 22,299 historical, with direct/reified/runtime parity. Ordinary record routes hydrate through committed bounded shards; aggregate hubs that exceed the browser ceiling fail closed and remain available to offline/paginated query tooling | Freeze and assure a new candidate; the immutable published v0.3.0 predates this projection |
| `okf-uk-living` | Completed locally | 9,757 life-course concepts and 15,810 rich directed assertions in YAML-LD, JSON-LD and Explorer runtime projections; all semantic and runtime assertions pass the pinned shared schema exhaustively | Specialist review, release authorization, deployment and public journey verification |
| `okf-testing` | Completed locally | Eleven digest-bound expectations: a rich semantic/runtime parity pair, one explicitly scoped sparse-OKF Reader compatibility case, and eight isolated negative cases; its dependency-free validator executes every keyword used by the exact shared schema | No publication target; extend fixtures when the shared contract gains a new governed feature |

## Standards status

The current YAML-LD 1.0 document is a W3C Working Draft, not a Recommendation.
The profile uses its YAML-to-JSON-LD data-model approach while pinning the
processor inputs needed for deterministic static publication. YAML comments,
mapping order and anchor names never carry semantic meaning.
