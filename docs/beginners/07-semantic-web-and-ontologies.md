# The Semantic Web And Ontologies

This chapter introduces RDF, JSON-LD, RDFS, SKOS and OWL from one small
example. These technologies overlap, but they do different jobs.

## The Goal

Ordinary JSON can carry a field named `publisher`:

```json
{
  "title": "Monthly House Prices",
  "publisher": "Example Statistics Office"
}
```

Another system might use `owner`, `publishingBody` or `organisation`. A person
can infer that the fields may be related, but software needs shared
identifiers and declared mappings.

The semantic web approach gives things and properties global identifiers, then
represents statements as a graph.

## RDF: The Graph Model

Resource Description Framework, or **RDF**, represents a statement as a
triple:

```text
subject          predicate       object
dataset/house    dcterms:title   "Monthly House Prices"
```

The three positions mean:

- **subject** — the thing being described;
- **predicate** — the property or relationship;
- **object** — another identified thing or a literal value.

An object can be:

- an IRI identifying another resource;
- a string, number, date or other typed literal;
- a language-tagged string.

Several triples sharing subjects and objects form a graph.

## Literals And Resources

These statements are different:

```text
dataset/house --publisher name--> "Example Statistics Office"
dataset/house --publisher-------> publisher/example-office
```

The first ends in text. The second ends in a resource that can have its own
identifier, names, homepage and relationships.

Use a literal for a value. Use an identified resource when identity and further
description matter.

## Serialisation

RDF is an abstract graph model, not one file syntax. It can be written as
Turtle, JSON-LD and other serialisations.

### Turtle

Turtle is compact and readable for semantic definitions:

```turtle
@prefix dcterms: <http://purl.org/dc/terms/> .

<https://example.org/dataset/house>
  dcterms:title "Monthly House Prices" ;
  dcterms:publisher <https://example.org/publisher/example-office> .
```

### JSON-LD

JSON-LD adds linked-data meaning to JSON:

```json
{
  "@context": {
    "title": "http://purl.org/dc/terms/title",
    "publisher": {
      "@id": "http://purl.org/dc/terms/publisher",
      "@type": "@id"
    }
  },
  "@id": "https://example.org/dataset/house",
  "title": "Monthly House Prices",
  "publisher": "https://example.org/publisher/example-office"
}
```

The `@context` maps short JSON keys to IRIs and states that `publisher` points
to another identifier.

JSON-LD can be:

- **expanded**, using full semantic identifiers;
- **compacted**, using context terms;
- **flattened** or **framed** for particular JSON arrangements.

These can describe the same RDF graph. The visible JSON shape alone is not the
complete semantics.

## Pinned Contexts

A remote JSON-LD context can change or become unavailable. It can also cause a
parser to make unexpected network requests.

The semantic builder uses pinned, reviewed contexts for deterministic and safe
processing. A published context version is part of the data contract.

## RDFS: Basic Vocabulary Structure

RDF Schema, or **RDFS**, supplies terms for describing classes and properties.
Important terms include:

- `rdfs:Class`;
- `rdf:Property`;
- `rdfs:subClassOf`;
- `rdfs:subPropertyOf`;
- `rdfs:domain`;
- `rdfs:range`;
- `rdfs:label`;
- `rdfs:comment`.

Suppose:

```text
PublicDataset subClassOf Dataset
publishedBy subPropertyOf contributor
```

If an item is a `PublicDataset`, RDFS reasoning can also treat it as a
`Dataset`. If an edge uses `publishedBy`, it can also satisfy a query for
`contributor`.

### Domain And Range Are Not Form Validation

If `publishedBy` has domain `Dataset` and range `Agent`, using that property
can entail types for its subject and object.

It does not mean “reject any input whose type field is missing.” Validation is
a different layer.

## SKOS: Concept Schemes

Simple Knowledge Organization System, or **SKOS**, is intended for thesauri,
taxonomies and controlled concept schemes.

Useful terms include:

- preferred, alternative and hidden labels;
- broader and narrower concepts;
- related concepts;
- membership in a concept scheme;
- exact, close, broad and narrow mappings between schemes.

SKOS is a good fit for:

- topics;
- licence families;
- format families;
- geography classifications;
- organisational classifications.

Example:

```text
concept/london
  preferred label "London"
  broader concept concept/england
  in scheme geography/uk
```

A source tag remains a keyword until it is mapped to a governed concept.
Similar spelling does not automatically create `skos:exactMatch`.

## OWL: More Expressive Semantics

Web Ontology Language, or **OWL**, can express richer class and property
semantics.

Examples include:

- equivalent classes or properties;
- inverse properties;
- transitive or symmetric properties;
- restrictions on class membership;
- property chains;
- identity with `owl:sameAs`.

These declarations support **inference**: deriving statements that were not
written explicitly but follow from the rules.

### Example Inference

Suppose:

```text
publishedBy inverseOf publishes
houseDataset publishedBy exampleOffice
```

A reasoner can entail:

```text
exampleOffice publishes houseDataset
```

The entailed statement should carry its derivation rule and source assertions
if it is materialised into an OKF publication.

## OWL Profiles And Bounded Reasoning

Full ontology reasoning can be expensive and difficult to explain. OWL defines
profiles suited to different needs. The architecture proposes a deliberately
bounded, OWL 2 RL-style rule set.

The builder can **materialise** selected entailments: calculate them once,
publish them as derived edges and record how they were produced. The browser
then filters and displays those edges without running an unrestricted
description-logic reasoner.

This supports static reliability and auditability.

## Open-World Assumption

RDF, RDFS and OWL usually use the **open-world assumption**:

> Not knowing a statement does not make the statement false.

If a dataset has no published licence triple, the graph says the licence is
unknown in this graph. It does not prove there is no licence.

This differs from many forms and database applications, where a missing
required field is an error under a closed publication contract.

Both views are useful:

- semantic reasoning remains open to additional facts;
- validation checks whether this particular publication supplied required
  information.

## No Unique-Name Assumption

Two different IRIs are not automatically known to describe different things.
Conversely, they are not automatically the same.

Identity needs an explicit, justified statement. `owl:sameAs` is powerful
because every fact about one identity can apply to the other. It must not be
inferred from a matching label, shared URL string or model confidence.

## Inconsistency Versus Validation Failure

An ontology can contain logical statements that cannot all be true together.
That is an **ontology inconsistency**.

A record can fail a rule such as “exactly one title must be published.” That
is a **validation failure**.

The two are not interchangeable. A SHACL failure does not automatically prove
the OWL ontology inconsistent.

## The Five Layers Revisited

| Layer | Example question | Main technology |
|---|---|---|
| Instance graph | What datasets and publishers are stated? | RDF and JSON-LD |
| Vocabulary | What do `Dataset` and `publisher` mean? | RDFS and SKOS |
| Inference | What extra statements follow from declared rules? | Bounded OWL rules |
| Validation | Did this publication supply required fields and evidence? | SHACL and JSON Schema |
| Presentation | How should the current graph be arranged? | Explorer presentation profile |

PROV describes how statements and artefacts were produced. DCAT supplies
domain terms for data catalogues. They are introduced in the next chapter.

## What The Explorer Implements Now

The current Svelte Explorer implements predicate-aware focus graph
presentation and compatibility with label-only relationships. It does not
claim that every loaded bundle is an ontology, and it does not perform
unbounded OWL inference in the browser.

The advanced semantic extension, vocabulary registry, validation views and
materialised inference have separate implementation states. Governed term
definitions and semantic assertions are present; class/property/inference views
remain named future capabilities. Consult the [implementation ledger](../okf-0.2-yaml-ld-semantic-authoring.md)
and its observation dates rather than treating every extension as future work. Beginner documentation must not
turn proposals into current behaviour.

## Next

[Validation, provenance and catalogue standards](08-validation-provenance-and-catalogue-standards.md)
explains how a publication is checked and how evidence survives
transformation.
