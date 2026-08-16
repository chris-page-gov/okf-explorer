# Knowledge Graphs And Stable Identifiers

A list tells you what records exist. A graph also tells you how they are
connected.

## Graph Basics

A graph has:

- **nodes** — things;
- **edges** — relationships between things.

For example:

```text
[Monthly House Prices] --published by--> [Example Statistics Office]
```

The dataset and publisher are nodes. “Published by” is a directed edge.

A node can represent a physical thing, organisation, dataset, document,
concept, event or software service. Good modelling states what kind of thing
the node is.

## Directed And Typed Relationships

An arrow has a source and target:

```text
dataset → publisher
```

Reversing it changes the natural wording:

```text
publisher → dataset
```

The underlying relationship may support an inverse label such as “publishes,”
but that should be declared rather than guessed from screen position.

A typed relationship identifies its meaning. The display label “published by”
is useful to a person; a stable predicate identifier is useful across packs
and languages.

## Focus And Context

A whole-corpus graph can be too dense to read. The Explorer starts with a
selected **focus node** and a bounded neighbourhood:

- outgoing relationships;
- incoming relationships;
- selected related context.

This is focus-plus-context exploration. A user can inspect one meaningful
area, then expand or change focus.

Graph lines are not automatically evidence of causation, identity or
importance. Their meaning comes from the declared relationship.

## Labels Are Not Identifiers

The label “ONS” is convenient but can be ambiguous or change. A stable
identifier separates identity from display:

```text
publisher/office-for-national-statistics
```

Within linked data, an absolute IRI can provide global scope:

```text
https://example.org/publisher/office-for-national-statistics
```

An identifier should not be reconstructed from the current label whenever a
source already provides a durable identifier.

## URI, URL And IRI

These terms overlap:

- a **URI** identifies a resource using a standard character syntax;
- a **URL** is a URI that also gives a web location or access method;
- an **IRI** extends the identifier idea to a wider set of international
  characters.

Semantic web standards commonly say IRI. In practice, many identifiers are
HTTPS URLs because they are globally unique and can also lead to
documentation.

“Resource” here means anything being identified, not only a downloadable file.

## Namespaces And Compact Names

Long IRIs are precise but repetitive. A namespace prefix shortens a vocabulary
in examples:

```text
dcterms:publisher
```

This expands to:

```text
http://purl.org/dc/terms/publisher
```

The prefix has no meaning without its declared mapping. Two files could use
different prefixes for the same namespace, so expanded identifiers—not prefix
spelling—establish identity.

## Classes, Instances And Properties

A **class** describes a category, such as `Dataset`.

An **instance** is a particular member, such as “Monthly House Prices.”

A **property** expresses an attribute or relationship, such as `publisher`.

In diagram form:

```text
Monthly House Prices --type--> Dataset
Monthly House Prices --publisher--> Example Statistics Office
```

Not every tag should become a class. A raw keyword can remain a string until a
governed vocabulary defines its identity and relationships.

## Vocabulary And Ontology

A **vocabulary** provides identified terms and their descriptions.

An **ontology** additionally expresses formal relationships and constraints on
meaning that software may use for inference.

The boundary is not perfectly sharp in everyday speech. In this project:

- RDFS provides lightweight class and property structure;
- SKOS organises governed concepts;
- selected OWL rules can support bounded inference;
- SHACL and JSON Schema validate publication contracts.

Calling a JSON object an “ontology” does not make it one.

## Instance Graph And Vocabulary Graph

These are different graphs.

The **instance graph** says:

```text
Monthly House Prices --publisher--> Example Statistics Office
```

The **vocabulary graph** says:

```text
publisher --subproperty of--> contributor
publisher --expected range--> Agent
```

The first describes the collection. The second describes terms used to make
statements about the collection.

The ontology architecture deliberately keeps instance data, vocabulary,
inference, validation and presentation as separate layers.

## Assertion Status

Two visually similar edges can have different origins:

- **official** — stated by an authoritative source;
- **`normalized`** — mapped into a common field or identifier by a builder;
- **inferred** — derived from declared semantic rules;
- **model-derived** — proposed or classified by a statistical or generative
  model.

The edge should preserve its status, evidence and observation time. A
model-derived topic with 0.9 confidence is not the same kind of claim as an
official publisher field.

## Confidence, Strength And Count

These numbers answer different questions:

- **confidence** — how likely the assertion is to be correct under a documented
  method;
- **strength** — a domain-defined magnitude of the relationship;
- **count** — how many relationships an aggregate represents.

The Explorer must not make a line thicker from any convenient numeric field.
It uses line width only when an explicit varying metric is meaningful for all
displayed edges.

## Identity And Similarity

Two records with the same label may be different. Two records with different
labels may describe the same real-world thing.

Identity requires evidence:

- a shared authoritative identifier;
- a reviewed mapping;
- an explicit source assertion.

Text similarity is useful for proposing candidates, not proving identity.
This becomes especially important with `owl:sameAs`, whose semantics allow
statements about either identity to propagate to the other.

Weaker mappings such as “exact concept match,” “close concept match” or
“candidate match” are safer when equivalence has not been established.

## Aggregation And Projection

The whole knowledge graph can contain more detail than a screen can show.
A **projection** is a derived view suited to a task:

- a focus neighbourhood;
- a class hierarchy;
- a topic tree;
- a provenance path;
- a timeline;
- a facet count.

Projection is not fabrication when its transformation is defined. It should
remain traceable to the underlying nodes and edges.

An aggregate edge may summarise many underlying edges and must say so with a
count and inspection path.

## A Relationship Registry

A governed predicate registry can record:

- canonical IRI;
- preferred and inverse labels;
- description;
- broader properties;
- expected subject and object classes;
- semantic characteristics;
- evidence policy;
- supported magnitude and unit;
- vocabulary version;
- deprecation and replacement.

This lets two packs group the same property even when their display labels
differ.

## Graph Meaning Versus Graph Layout

Putting a publisher node on the left of the selected dataset does not make
“left of” part of the data.

The Explorer may:

- group edges by predicate and direction;
- reorder relationship groups;
- hide a group;
- cycle labels to avoid collisions;
- keep selected layout state in a URL.

These are presentation decisions. They must not be serialised back into the
semantic graph as claims about the world.

## Next

[The semantic web and ontologies](07-semantic-web-and-ontologies.md) introduces
the standards used to give graph statements shared, machine-readable meaning.
