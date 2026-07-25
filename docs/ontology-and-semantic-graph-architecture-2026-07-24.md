# Ontology And Semantic Graph Architecture

Status: design baseline, 24 July 2026.

This document defines how OKF bundles and the OKF Explorer should grow from
typed navigation graphs into evidence-bearing semantic knowledge graphs. It
also records the boundary between semantic meaning, validation, inference and
graph presentation.

The immediate UI change groups a focus graph by relationship predicate and
direction. It does not make a bundle an ontology and it does not infer facts.
It establishes the interaction surface on which richer RDFS, SKOS, OWL, SHACL,
DCAT and PROV metadata can later operate.

## Design Goals

1. Make a selected record and its relationships readable before exposing the
   whole graph.
2. Give every class and property a stable identifier where the source supports
   one.
3. Keep asserted, normalized, inferred and model-derived statements visibly
   distinguishable.
4. Validate closed-world publication requirements without confusing them with
   open-world semantic reasoning.
5. Keep ontology semantics independent from Explorer layout preferences.
6. Preserve evidence and provenance for every generated or inferred edge.
7. Let older label-only OKF bundles continue to work.
8. Avoid requiring a full description-logic reasoner in a static browser.

## The Five Separate Layers

The implementation must not collapse these layers into one object.

| Layer | Question answered | Initial standards |
|---|---|---|
| Instance graph | What entities and assertions are in this bundle? | RDF/JSON-LD, OKF routes |
| Vocabulary | What do the classes and properties mean and how are they related? | RDFS, SKOS |
| Inference | What additional statements follow from declared semantics? | Selected OWL 2 RL rules |
| Validation | Does this publication satisfy its declared data contract? | SHACL 1.0, JSON Schema |
| Presentation | How should a user explore this graph now? | `okf-explorer-presentation.v1` |

PROV-O spans the instance, inference and validation layers because it records
who or what produced a statement and from which evidence. DCAT 3 supplies
domain terms for catalogues, datasets, data services and distributions.

### Why This Separation Matters

RDF, RDFS and OWL use an open-world model. A missing statement is generally
unknown, not false. SHACL and JSON Schema can apply closed-world publication
requirements such as "every published dataset record must have one title".
Explorer layout is neither: putting a property group on the left side of the
canvas has no semantic consequence.

The following conclusions are therefore invalid:

- a missing `dcterms:license` proves that no licence exists;
- a SHACL validation failure proves an OWL ontology is inconsistent;
- an Explorer group order declares an RDF property hierarchy;
- a high confidence value is automatically a relationship strength;
- two records shown close together are semantically equivalent.

## Standards Baseline

### RDF And JSON-LD

The bundle-wiki profile already publishes JSON-LD and uses stable absolute
identifiers. RDF remains the common graph model. JSON-LD remains the practical
web serialization and compatibility bridge for the current Explorer.

RDF 1.2 work is active, but the current OKF profile should not claim RDF 1.2
conformance while the relevant documents remain Candidate Recommendation or
Working Draft. The profile can track RDF 1.2 changes without making them a
runtime dependency.

### RDFS

Use RDFS for lightweight, explainable vocabulary structure:

- `rdfs:Class`;
- `rdf:Property`;
- `rdfs:subClassOf`;
- `rdfs:subPropertyOf`;
- `rdfs:domain`;
- `rdfs:range`;
- `rdfs:label` and `rdfs:comment`.

Domain and range statements are inference rules, not input-form validation.
For example, an edge using `dcterms:publisher` can entail a type for its subject
or object. It does not by itself reject an input row.

### SKOS

Use SKOS for controlled concepts that are not naturally OWL classes:

- topics;
- tags promoted into governed concept schemes;
- licence families;
- format families;
- geography and organisational classifications;
- preferred, alternative and hidden labels;
- broader, narrower and related concept navigation.

Do not turn every source tag into an OWL class. A raw tag can remain a literal
keyword until a governed concept mapping exists.

For Explorer facets, publish governed concepts in the canonical YAML-LD with
`skos:inScheme` and `skos:broader`/`skos:narrower`, then compile a bounded
`analysis.hierarchies` navigation projection into the runtime descriptor.
Display-only grouping heuristics may improve a legacy bundle's preview, but
must never be serialized back as semantic assertions without review.

### OWL 2

Start with an explicitly bounded OWL 2 RL-style inference profile. Candidate
features include:

- equivalent and inverse properties;
- equivalent classes;
- transitive or symmetric properties where the domain definition justifies
  them;
- property and class hierarchy closure;
- carefully reviewed property chains;
- identity only when a strong mapping supports it.

Do not infer `owl:sameAs` from similar labels, shared URLs or model confidence.
Prefer weaker mapping predicates such as SKOS exact/close match when identity
has not been established.

Browser execution should consume precomputed, bounded entailments. The bundle
builder should record the rule set, ontology versions and source assertions
used to produce each materialized edge.

### SHACL

SHACL 1.0 is the stable W3C Recommendation baseline for graph validation.
SHACL 1.2 Core is a Working Draft dated 23 July 2026 and can be evaluated in an
experimental profile, but must not yet be presented as the stable publication
contract.

Use SHACL to validate:

- required bundle and concept metadata;
- expected node kinds and cardinalities;
- datatype and controlled-value constraints;
- evidence requirements for inferred statements;
- consistency between descriptor, manifest and semantic projections;
- presentation references to real predicates and facets.

Validation results should be publishable as data and link back to the exact
shape, focus node, path, severity and source artifact.

### DCAT And PROV

Use DCAT 3 where records describe catalogues, datasets, data services,
distributions and catalogue records. Keep the existing OKF standards
crosswalk where the source cannot support a complete DCAT assertion.

Use PROV-O to distinguish:

- source entities;
- harvesting, normalization, mapping and inference activities;
- responsible agents;
- primary sources and derivations;
- generation timestamps;
- qualified attribution and influence where a simple edge is insufficient.

## Proposed Semantic Extension

The following is a design proposal, not a stable schema:

```json
{
  "extensions": {
    "okf-semantic-model.v1": {
      "status": "experimental",
      "contexts": ["context/okf-bundle-v1.jsonld"],
      "vocabularies": [
        {
          "id": "https://example.org/vocabulary/catalogue",
          "version": "2026-07-24",
          "entrypoint": "semantic/vocabulary.ttl",
          "integrity": "sha256-..."
        }
      ],
      "ontologies": [],
      "shapes": [
        {
          "id": "https://example.org/shapes/publication",
          "conforms_to": "https://www.w3.org/TR/shacl/",
          "entrypoint": "semantic/shapes.ttl"
        }
      ],
      "inference": {
        "profile": "owl2-rl-bounded",
        "materialized_entrypoint": "semantic/entailed-relationships.json",
        "rule_manifest": "semantic/inference-manifest.json"
      },
      "relationship_types": [
        {
          "predicate": "http://purl.org/dc/terms/publisher",
          "label": "published by",
          "inverse_label": "publishes",
          "domain": "http://www.w3.org/ns/dcat#Dataset",
          "range": "http://xmlns.com/foaf/0.1/Agent"
        }
      ],
      "validation_report": "semantic/validation-report.ttl"
    }
  }
}
```

This extension should be descriptor-level and integrity-bound. Large artifacts
remain external entrypoints so startup does not require loading an ontology or
all entailments.

## Relationship Record Contract

The current Explorer accepts a human `kind` or `label`. Semantic bundles should
also provide a predicate identifier:

```json
{
  "id": "relationship:dataset-1-publisher",
  "source": "dataset/dataset-1",
  "target": "publisher/ons",
  "kind": "published by",
  "predicate": "http://purl.org/dc/terms/publisher",
  "assertion_status": "normalized",
  "evidence_type": "source-metadata",
  "evidence": ["source/catalogue-row-1"],
  "confidence_score": 1.0,
  "observed_at": "2026-07-24T00:00:00Z"
}
```

Recommended fields:

| Field | Purpose |
|---|---|
| `id` | Stable relationship identity where evidence or annotations address the edge |
| `source`, `target` | Explorer routes or absolute semantic identifiers |
| `predicate` | Stable property IRI; preferred grouping key |
| `kind` or `label` | Human-readable compatibility label |
| `assertion_status` | `official`, `normalized`, `inferred` or `model-derived` |
| `evidence_type` | How the assertion was obtained |
| `evidence` | Stable source, passage, row or activity identifiers |
| `confidence_score` | Calibrated confidence, with its method documented |
| `strength` | Optional domain-defined relationship magnitude |
| `count` | Number of relationships represented by an aggregate edge |
| `observed_at` | Time at which the assertion or source evidence was observed |

`confidence_score`, `strength` and `count` are not interchangeable:

- confidence estimates whether an assertion is correct;
- strength measures a domain-defined magnitude;
- count records multiplicity in an aggregate.

The Explorer renders line width only when one explicit numeric count, strength,
weight or evidence-count metric covers every displayed edge and has a
non-constant range. It must name that metric and range. Confidence, missing
values and constant values do not change line width automatically.

## Relationship-Type Registry

Each governed predicate should have one registry entry containing:

- canonical IRI;
- preferred and inverse labels;
- description;
- RDFS super-properties;
- expected domain and range;
- OWL characteristics, if any;
- assertion/evidence policy;
- supported weight metric and unit, if meaningful;
- source vocabulary and version;
- deprecation and replacement metadata.

The registry lets the Explorer group relationships by semantic property even
when two bundles use different display labels. Legacy bundles without a
predicate continue to group by normalized label and direction.

## Explorer Graph Contract

### Auto Mode

Auto mode retains the existing deterministic compact graph for small focus
graphs. A dense focus graph switches to semantic relationship regions when it
has at least twelve visible relationships and at least two relationship groups.

### Relationship Mode

Relationship mode groups by predicate and direction relative to the focus:

- outgoing;
- incoming;
- lateral context.

The ordered groups occupy deterministic regions:

1. left list;
2. top staircase;
3. bottom staircase;
4. right list;
5. additional inner lanes in a stable sequence.

When the complete left list fits without collisions, it reserves persistent
above-left node labels. This keeps its text column away from relationships
converging on the focus node. Larger or conflicting lists and labels in the
other regions still use the shared collision planner and cycle when required.

Users can:

- show or hide a relationship group;
- expand a group and show or hide individual members;
- reorder groups by drag and drop;
- reorder with explicit earlier/later buttons;
- switch between Auto and By relationship;
- reset the relationship workspace.

The order and visibility state use repeatable URL parameters:

```text
graph.layout=relationships
graph.group=outgoing%3Ahttp%3A%2F%2Fpurl.org%2Fdc%2Fterms%2Fpublisher
graph.hide=incoming%3Ahttp%3A%2F%2Fwww.w3.org%2Fns%2Fdcat%23record
graph.hideEdge=dataset%2F1%3Epublisher%2Fons%3Apublished+by
```

The URL parameters are presentation state. They do not alter bundle semantics.

### Labels And Inspection

- The node-type key lists only types in the currently displayed graph.
- Node and eligible edge labels share non-overlapping display layers.
- Persistent focus labels are placed with lookahead so they do not consume the
  only viable position for a boundary node.
- Label layers cycle every two seconds and can be paused.
- Every relationship remains available in the relationship drawer even when
  direct graph labels are bounded.

## Ontology-Oriented Views

The relationship layout is the first semantic control, not the final ontology
UI. Candidate future coordinated views are:

| View | Purpose |
|---|---|
| Instance focus | Current record and typed neighbouring assertions |
| Class hierarchy | RDFS/OWL class and superclass navigation |
| Property hierarchy | Predicate and sub-property navigation |
| Concept scheme | SKOS broader/narrower collections and mappings |
| Provenance | Assertion, activity, agent and evidence paths |
| Validation | SHACL results grouped by severity, shape and focus node |
| Inference | Asserted versus entailed edges with rule/evidence inspection |

Each view should reduce the same active context and preserve addressable URL
state. No view should require loading the complete corpus before the first
useful screen.

## Research-Informed Layout Decisions

The graph controls combine several established directions rather than relying
on an unconstrained force graph:

- Semantic substrates place nodes into meaningful, non-overlapping regions and
  let users control which links are visible.
- Focus-plus-context exploration starts from a selected item, keeps useful
  context and expands on demand.
- Layered graph drawing is appropriate for class, property and dependency
  hierarchies.
- Ontology visualization research supports coordinated tree, graph, indented
  list, treemap and focus views because no single projection answers every
  ontology task.

Auto layout remains useful for small graphs. Semantic regions become preferable
when the node-link diagram's labels and crossings stop supporting comparison.

## Conflicts And Decisions

### Meaning Versus Layout

Conflict: authors may want ontology terms to control visual placement.

Decision: ontology metadata may identify relationship groups and hierarchies,
but region order belongs to the presentation profile or user URL state.

### Open World Versus Publication Completeness

Conflict: OWL/RDFS permit unknown values while public data contracts need
required fields.

Decision: use SHACL/JSON Schema for publication validation and OWL/RDFS for
meaning and entailment. Report the two outcomes separately.

### Browser Reasoning Versus Static Reliability

Conflict: client-side reasoning can be interactive but expensive,
non-deterministic across engines and difficult to audit.

Decision: materialize bounded entailments during the build, publish the rule
and provenance manifests, and use the browser for filtering and inspection.

### Confidence Versus Relationship Strength

Conflict: both are numeric and can be tempting inputs to line width.

Decision: require a declared metric. Never interpret categorical confidence or
an undocumented score as strength.

### `owl:sameAs` Versus Approximate Matching

Conflict: deduplication benefits from identity links, but false identity
propagates assertions in both directions.

Decision: reserve `owl:sameAs` for established identity. Use SKOS mapping terms
or an OKF candidate-match assertion with provenance for weaker mappings.

### Inferred Edges Versus Source Evidence

Conflict: materialized entailments can look indistinguishable from source
assertions.

Decision: carry `assertion_status`, derivation activity and source evidence.
A future Explorer pass should give asserted and inferred edges distinct,
accessible visual encodings.

## Delivery Roadmap

### Phase 1: Predicate-Aware Exploration

- Group focus graphs by predicate and direction.
- Filter the key to visible types.
- Add group/member visibility, ordering and URL persistence.
- Use explicit varying edge metrics only.
- Retain label-only compatibility.

This phase is implemented in the Svelte Explorer.

### Phase 2: Governed Vocabulary

- Publish the semantic extension schema.
- Add a predicate registry and integrity-bound vocabulary entrypoints.
- Require stable predicate IRIs for new exemplar packs.
- Add SKOS concept schemes for governed topics, formats and licences.

### Phase 3: Validation

- Expand the current SHACL shapes.
- Publish machine-readable validation reports.
- Add a Validation view and source-linked remediation paths.
- Keep SHACL 1.2 experiments separate until the specification is stable.

### Phase 4: Bounded Inference

- Define an OWL 2 RL-style rule manifest.
- Materialize entailments in the builder.
- Record PROV-O derivations.
- Let the Explorer filter asserted, normalized, inferred and model-derived
  statements.

### Phase 5: Ontology Navigation

- Add class, property and concept-scheme views.
- Add hierarchy-aware search and facet reduction.
- Compare ontologies and mappings without asserting equivalence.
- Evaluate the UI against ontology-engineering and data-discovery user tasks.

## Acceptance Criteria

1. A bundle without semantic extensions renders exactly as a compatible
   label-only bundle.
2. A bundle with predicates groups equivalent properties independently of
   display label.
3. Graph presentation state round-trips through the URL.
4. The key contains only node types present after graph filtering.
5. A group and any one member can be hidden without mutating source data.
6. Reordering changes layout only.
7. Edge width is neutral when no varying metric is supplied.
8. Every entailed edge identifies its rule and source assertions.
9. SHACL failures do not masquerade as ontology inconsistency.
10. Asserted and inferred statements can be distinguished by users and
    downstream agents.

## References

Standards:

- [RDF 1.2 Concepts and Abstract Syntax](https://www.w3.org/TR/rdf12-concepts/)
- [RDF 1.2 Schema](https://www.w3.org/TR/rdf-schema/all/)
- [OWL 2 Web Ontology Language Profiles](https://www.w3.org/TR/owl2-profiles/)
- [SHACL 1.0 Recommendation](https://www.w3.org/TR/shacl/)
- [SHACL 1.2 Core Working Draft](https://www.w3.org/TR/shacl12-core/)
- [SKOS Simple Knowledge Organization System Reference](https://www.w3.org/TR/skos-reference)
- [PROV-O: The PROV Ontology](https://www.w3.org/TR/prov-o/)
- [Data Catalog Vocabulary (DCAT) 3](https://www.w3.org/TR/vocab-dcat-3/)

Graph and ontology visualization:

- Shneiderman and Aris, [Network Visualization by Semantic Substrates](https://www.cs.umd.edu/~ben/papers/Shneiderman2006Network.pdf), IEEE TVCG, 2006.
- van Ham and Perer, [Search, Show Context, Expand on Demand](https://perer.org/papers/adamPerer-DOIGraphs-InfoVis2009.pdf), IEEE TVCG, 2009.
- Katifori et al., [Ontology Visualization Methods - A Survey](https://users.uop.gr/~egian/pubs/onto-vis-survey-final.pdf), ACM Computing Surveys, 2007.
- Sugiyama, Tagawa and Toda, [Methods for Visual Understanding of Hierarchical System Structures](https://doi.org/10.1109/TSMC.1981.4308636), IEEE Transactions on Systems, Man, and Cybernetics, 1981.
