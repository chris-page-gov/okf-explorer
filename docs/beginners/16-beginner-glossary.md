# Beginner Glossary

This glossary gives short meanings in the context of OKF Explorer. Follow the
linked chapters for the important qualifications.

## A–C

**Accessibility**
Design and implementation that allow people with different access needs and
assistive technologies to perceive and operate the product.

**Active context**
The current overview, search reduction or selected neighbourhood shared across
Explorer views.

**Adjacency index**
An index that locates relationships next to a selected graph node without
loading the whole edge collection.

**Agent**
A model combined with instructions, tools, state and an execution loop.

**API**
An Application Programming Interface: a machine-oriented contract for one
software system to use another.

**Artifact**
A produced file or data object, such as a manifest, search shard or validation
report.

**Approval**
An authorized decision to proceed after reviewing applicable evidence,
limitations and residual risk. Approval does not make an unrun check pass.

**Assertion**
A statement represented in the data, ideally with status and evidence.

**Attestation**
Evidence from a declared process that a computation or material satisfied a
contract. A declaration is not itself a passing verdict.

**Bundle or pack**
A published OKF collection and its supporting metadata and indexes.

**Cache**
Stored data reused to avoid repeating a fetch or calculation.

**Candidate**
One proposed set of source, generated and release bytes being tested and
reviewed. It is not yet a final release.

**Cardinality**
In facets, the number of distinct values. In validation, the permitted number
of values for a property.

**Chunk**
A bounded group of records stored as one artifact.

**Class**
A category of things in a graph vocabulary.

**CLML**
Crown Legislation Markup Language, the structured XML used by
legislation.gov.uk.

**Closed-world validation**
Checking a particular publication as complete under declared rules.

**Compression**
Encoding bytes more compactly for storage or transfer.

**Concept scheme**
A governed collection of concepts and their labels and relationships, often
represented with SKOS.

**Conformance**
Meeting the requirements of a named standard or profile.

**Context, JSON-LD**
A mapping from short JSON terms to semantic identifiers.

**Control plane**
Descriptor and manifest information that tells the application what data
artifacts exist and how to access them.

**Corpus**
The collection of records under study.

**CORS**
Browser rules and response headers that control whether one web origin may
read resources from another.

**CRS**
Coordinate Reference System: the frame that gives coordinate numbers spatial
meaning.

## D–H

**Data plane**
The substantial record, relationship, resource and search artifacts described
by the control plane.

**DCAT**
An RDF vocabulary for catalogues, datasets, data services and distributions.

**DCAT-AP**
A European application profile that states community requirements for DCAT
metadata.

**Descriptor**
The small entry-point document for a large OKF corpus.

**Deterministic**
Producing the same ordered result from the same inputs and declared rules.

**Domain profile**
A bounded, validated handoff recording domain research decisions for a later
OKF build.

**Distribution**
In DCAT, an accessible representation of a dataset, such as a file or API.

**DQV**
Data Quality Vocabulary, used to describe quality metrics and annotations.

**Edge**
A graph relationship with a source and target.

**Entailment**
A statement that follows logically from declared semantic statements and
rules.

**Entity**
An identified thing. In PROV, an item that participates in provenance.

**Facet**
A dimension and its value counts used to explore and filter a result set.

**Federation**
An overview-first discovery publication describing independent child bundles
and the explicit routes by which they can be loaded.

**Fixture**
Controlled input stored for repeatable tests.

**Focus node**
The selected graph node around which a bounded context is displayed.

**Frontmatter**
Structured metadata at the beginning of a Markdown file.

**GeoJSON**
A JSON format for geographic features and geometries.

**Gate**
A named release question with declared evidence and a pass criterion. A gate
number has meaning only within its named gate catalogue.

**Gate catalogue**
The versioned list that defines gate identifiers, titles, required evidence,
pass criteria and responsible roles.

**Graph**
Nodes connected by edges.

**Hash**
A fixed-length fingerprint calculated from bytes, used for integrity checks.

**Hard failure**
A condition the release contract says must block publication. It cannot be
turned into a pass by owner acceptance.

**Hydration**
Loading fuller data for a compact result or selected record.

## I–P

**IDF**
Inverse document frequency, a search weighting that values uncommon terms more
than terms appearing in most documents.

**Index**
Precomputed data that makes a question such as term lookup or adjacency faster.

**Independent reviewer**
A reviewer sufficiently separate from the implementation or expectations under
review to reduce self-confirmation. The receipt records the actual role and
limitations of that independence.

**Inference**
Deriving additional statements from declared rules.

**Instance**
A particular member of a class.

**Integrity**
Assurance that fetched bytes match an expected hash or signed publication.

**IRI**
Internationalized Resource Identifier, used to identify semantic resources
and properties.

**JSON**
A strict text format for objects, arrays and primitive values.

**JSON-LD**
JSON for Linked Data, using contexts and identifiers to express an RDF graph.

**JSON Schema**
A language for validating the structure of JSON values.

**Knowledge graph**
Identified entities and meaningfully typed relationships represented as a
graph.

**Lazy loading**
Deferring an artifact fetch until it is needed.

**Literal**
A value such as a string, number or date in an RDF statement.

**Manifest**
An inventory of publication artifacts and their locations or integrity data.

**Markdown**
A plain-text authoring format with headings, links and lightweight notation.

**Materialization**
Calculating inferred statements in advance and publishing them as derived
data.

**Material, release**
A file or byte artifact whose identity and digest form part of build or
acceptance evidence.

**Metadata**
Structured information describing a record, artifact or publication.

**Monolithic bundle**
A bundle containing all records and relationships in one file.

**Node**
A thing represented in a graph.

**Normalization**
Mapping source variation into a documented common representation while
preserving provenance.

**Ontology**
A formal model of classes, properties and semantic relationships that may
support inference.

**OpenAPI**
A machine-readable description of HTTP API operations, inputs, responses and
security schemes.

**Open-world assumption**
The rule that a statement missing from a graph is generally unknown, not
false.

**Owner, project or release**
The person or organization authorized to decide scope, public claims,
exceptions, residual-risk acceptance and release promotion.

**OWL**
Web Ontology Language, used for expressive class and property semantics.

**Posting**
An entry connecting a search term or filter value to a document position.

**Predicate**
The identified property or relationship in an RDF triple.

**Presentation**
How data is arranged and encoded for a user; it does not change semantic
meaning.

**Profile**
A named set of rules and choices that applies general standards to a
publication community.

**Progressive loading**
Loading overview, result and full-detail artifacts in useful stages.

**Projection**
A task-oriented view derived from a larger graph or corpus.

**Provenance**
Evidence about the entities, activities and agents that produced something.

**PWA**
Progressive Web App, a web application with installable or offline-oriented
browser capabilities.

## Q–Z

**RDF**
Resource Description Framework, a graph model built from subject–predicate–
object triples.

**RDFS**
RDF Schema, which defines basic vocabulary structures such as classes,
properties, domain, range and hierarchies.

**Record**
One described item and its fields in an OKF corpus.

**Receipt**
A durable record connecting a check or review, its evidence and result to
exact inputs, tools, candidate bytes and reviewer roles.

**Registry**
A discoverable list of bundle entry points.

**Release candidate, RC**
The proposed final release bytes deployed for last-mile public validation.
Final promotion should reuse these exact bytes.

**Release root**
A digest calculated from an ordered inventory of governed release materials,
used to identify the exact candidate covered by evidence and approval.

**Relationship**
A directed connection between records or concepts.

**Residual risk**
Risk remaining after controls and checks. An authorized owner may accept it
without claiming that missing evidence or an absent audit exists.

**Resource**
Depending on context, an identified semantic thing or an access/download item
attached to a catalogue record.

**Retrieval**
Selecting evidence relevant to a task through search, filters, relationships
and context assembly.

**Route**
A stable application path identifying a record or view state.

**Schema**
A formal description of allowed data structure.

**SBOM**
Software Bill of Materials, a machine-readable inventory of components and
dependencies included in a software release.

**Semantic web**
Standards for publishing identified, machine-interpretable linked data.

**Serialization**
A file syntax used to write an abstract data model, such as JSON-LD or Turtle
for RDF.

**Shard**
A deterministic partition of an index or corpus selected from a key.

**SHACL**
Shapes Constraint Language, used to validate RDF graphs.

**SKOS**
Simple Knowledge Organization System, used for governed concepts, labels and
broader/narrower relationships.

**Snapshot**
A coherent publication state captured at a stated version or time.

**Source of truth**
The authoritative editable input from which generated artifacts are rebuilt.

**Source family**
A researched class of sources in a federation, which may or may not yet have
an implemented child bundle.

**Static application**
A browser application served as prebuilt files without a custom application
server handling each interaction.

**Svelte**
The component framework used by the canonical Explorer.

**Taxonomy**
A classification, commonly organized as a hierarchy.

**Token, search**
A normalized unit of text used by a search index.

**Token, security**
A credential representing authority. This is a different meaning from a
search token or model token.

**Triple**
An RDF statement with subject, predicate and object.

**Truncation**
A declared limit that prevented retrieval or preview from processing every
possible result.

**Turtle**
A compact text serialization for RDF graphs.

**TypeScript**
JavaScript with development-time types, used by the canonical Explorer.

**Validation**
Checking data against declared rules.

**Waiver**
An authorized, recorded exception to a non-hard requirement. A waiver does not
apply to a declared hard failure unless the governing contract itself is
changed and re-reviewed.

**Vocabulary**
A governed set of identified terms and descriptions.

**Web Worker**
A browser background execution context used to keep large search work off the
interface thread.

**YAML**
A human-oriented structured data notation used in frontmatter and semantic
source files.

**YAML-LD**
YAML-authored linked data that is parsed under constrained rules and projected
to JSON-LD in this repository.

## Continue Learning

Return to the [learning-path index](index.md) or use the repository's more
specialized [AI infrastructure glossary](../../glossary/index.md).
