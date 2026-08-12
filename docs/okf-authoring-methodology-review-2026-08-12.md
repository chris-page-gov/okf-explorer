# Review Of The OKF Authoring Methodology

Status: reviewed and implemented in OKF Explorer v0.7.0, 12 August 2026.

This review uses the completed
[HM Land Registry v0.3.0 delivery retrospective](postmortems/land-registry-v0.3.0-delivery-retrospective.md)
and its public Explorer presentation as evidence. It does **not** reopen, alter
or rebuild the Land Registry pack. Its purpose is to improve the reusable OKF
authoring method before reviewing `okf-uk-living`.

## Decision In Brief

The previous Foundry method was strong at identity, provenance, deterministic
generation, evidence and release assurance. It was not strong enough at three
earlier questions:

1. Can a citizen understand every entity and relationship that a view exposes?
2. Does each semantic link answer an evidenced question, and are all eligible
   external links measured against a declared denominator?
3. Can a small, explicitly exploratory result be shared early enough to find
   those failures before a release candidate is expensive to change?

The revised method therefore adds a citizen-first **Explore OKF** stage between
domain warm-up and release-candidate construction. It separates stable machine
identity from human labels, treats useful link coverage as a governed measure,
and makes an exploratory banner and feedback route part of the publication
contract.

## What The Land Registry Evidence Shows

The public probate graph exposed internal identifiers such as
`publisher-6b13…`, `source-3b1…`, `activity-242…` and `rights-760…` as visible
names. Those identifiers are legitimate machine keys. They are poor labels for
a person trying to understand who publishes a service, where evidence came
from or what a rights statement means.

This is not one isolated drawing problem:

- opaque identifiers appeared in graph nodes, relationship rows and publisher
  facets;
- readable titles existed for several referenced entities, but were not
  guaranteed to be available to every lazy-loaded presentation path;
- at least one activity entity had an identifier and time but no useful human
  name;
- structural and provenance relationships were plentiful, but the public view
  did not first establish which relationships helped a citizen complete a
  task; and
- the release process found presentation defects after semantic generation
  and candidate assurance had already become expensive.

The retrospective records the broader process pattern: governance review,
real-consumer tests and release-platform constraints were allowed to arrive
after candidate generation. The label failure has the same shape. A builder
and schema can agree that an endpoint exists while the real reader still has
no usable name for it.

## Allocation Of Responsibility

The correction must not be assigned wholly to either a producer or the
Explorer.

| Layer | Responsibility | Required correction |
| --- | --- | --- |
| Domain research | Decide what a citizen calls an entity and which distinctions matter | Record preferred labels, alternatives, language, authority and task relevance |
| Semantic authoring | Preserve stable identity and publish justified links | Give every graph-reachable entity an IRI, type and label; measure eligible external links |
| Projection/build | Make labels available without expensive hydration | Emit a snapshot-bound compact label index and carry endpoint labels into relationship projections |
| Explorer | Present labels by default and identifiers as inspectable detail | Never use an opaque identifier as an ordinary visible label; report missing-label defects clearly |
| Acceptance | Exercise what a person actually sees | Detect identifier-shaped labels, unclear predicates, duplicate projections and broken feedback/deep-link state |

A producer must not assume that a later UI can invent a label. The Explorer
must not assume that a raw identifier is an acceptable label merely because a
producer omitted one.

## Assessment Of The Current Method

### What Should Be Retained

- source-native identifiers remain unchanged and distinct from local routes;
- absolute semantic IRIs and Explorer routes remain separate identities;
- relationship predicates, direction, evidence, authority and derivation stay
  explicit;
- YAML-LD is the authored semantic boundary and generated JSON-LD/RDF/Explorer
  forms must remain equivalent;
- standards applicability, source rights, privacy, freshness and completeness
  denominators remain independent decisions;
- the actual pinned consumer is tested, not merely a resembling schema; and
- one frozen candidate is promoted byte-for-byte after assurance.

### What Was Under-Specified

The profile required labels for entity *types* and relationship *types*, but
did not require a readable label for every graph-reachable **entity instance**.
It did not say whether labels had to be available before full record
hydration, which allowed a lazy reader to fall back to identifiers.

The method encouraged stable predicate IRIs and standards reuse, but did not
define semantic-link eligibility or coverage. “More relationships” could
therefore reward internal processing and provenance edges without proving
that public, dereferenceable links helped a recorded citizen task.

The method went from tiny fixture to full deterministic build and release
assurance without a named, shareable learning stage. A tiny fixture tested
contracts, but it was not framed as a public, route-preserving artefact for
owner and user feedback.

### What Must Not Become The New Mistake

“Maximise semantic linking” must not mean maximising the raw number of triples.
An unjustified `owl:sameAs`, a relationship inferred from similar wording or
ten duplicated provenance projections can make a graph larger and less true.

The target is **maximum evidenced, useful link coverage**:

> For every eligible entity and competency question, publish the strongest
> justified stable link, state its mapping strength and authority, and count
> every eligible but unresolved case.

The denominator is therefore essential. A pack should be able to say, for
example, that all 12 eligible local-authority entities have an official ONS
code/IRI, while two of 18 service concepts still lack an evidenced mapping.

## Revised Authoring Principles

### 1. Separate Identity, Label And Description

Every graph-reachable entity has three different properties:

- a stable IRI or source identifier for machines;
- a concise preferred label for ordinary presentation; and
- an optional description that explains the entity in context.

Changing a label must not change the identifier. An identifier may appear in
Inspect or debugging views, but it is not a normal display fallback. Labels
use `en-GB` unless a source or user need requires another language; source
labels and editorial display labels remain distinguishable.

Recommended display priority:

1. reviewed source-native preferred label;
2. reviewed domain-profile preferred label;
3. deterministic, explicitly labelled editorial display label;
4. a visible **Missing label** defect with the identifier available in Inspect.

The fourth outcome is deliberately conspicuous. Silently rendering a hash
would hide a quality failure.

### 2. Make Labels Available At The Same Granularity As Links

Every relationship endpoint in a shard carries, or can resolve through a
compact snapshot-bound index to:

- route and absolute IRI;
- preferred label and language;
- entity type label;
- label authority/derivation; and
- the same snapshot and integrity root as the relationship.

The reader must not need to download an entire publisher, source, rights or
activity corpus merely to name a visible node. The build fails when a
graph-reachable route has no label-index entry.

### 3. Start From Citizen Competency Questions

Before adding a relationship, name the question it answers. For example:

- Which public body provides this service?
- Which life event may lead someone to need it?
- What place does it cover?
- What eligibility rule or legal basis applies?
- Which official dataset supplies this fact?
- What can a person do next?

System provenance remains important, but it should be a separately selectable
evidence layer rather than the main citizen story.

### 4. Use A Linkability Ladder

Each eligible entity is assessed against the following ladder:

| Level | Evidence-bearing result |
| --- | --- |
| 0 | Source text or URL only; no governed identity |
| 1 | Stable local IRI and route |
| 2 | Human label, type and source provenance |
| 3 | Governed predicate links that answer competency questions |
| 4 | Mapped official or widely governed external identifier/IRI, with mapping strength |
| 5 | Dereferenceable human and machine representations, validated in the published consumer |

Higher is not always possible. An unresolved Level 3 entity is safer than a
false Level 4 identity assertion.

### 5. Reuse Vocabulary Terms And Other People's IRIs Carefully

Follow [W3C Data on the Web Best Practices](https://www.w3.org/TR/dwbp/): use
stable URIs, reuse standard vocabularies and other publishers' identifiers
where appropriate, assess coverage and provide human as well as machine
presentations.

Use [SKOS](https://www.w3.org/TR/skos-reference/) mappings for concepts:
`exactMatch`, `closeMatch`, `broadMatch`, `narrowMatch` or `relatedMatch` as
evidence permits. `owl:sameAs` is reserved for identity of individuals and
must never be inferred from a matching label or URL.

For citizen-facing public services, assess the current
[Core Public Service Vocabulary Application Profile](https://semiceu.github.io/CPSV-AP/)
as a projection. Editorial life stages are navigation concepts, not public
services merely because they link to one.

### 6. Measure Coverage By Entity Class And Link Purpose

Record for each link set:

- eligible entity rule, exact candidate-ID inventory, frozen source snapshot,
  canonical inventory digest and evidence;
- linked-candidate, link-assertion, unresolved, excluded and conflicting
  counts;
- target namespace and authority;
- relationship or mapping predicate;
- minimum evidence;
- public dereference successes and failures;
- task/competency references; and
- observed date, freshness policy and calculated freshness status.

Treat those four candidate outcomes as an identity-bound partition: their
exact ID sets are disjoint and their union must equal the eligible inventory.
The inventory itself is derived by the declared deterministic eligibility rule,
bound to the frozen input snapshot and evidence, and protected by a canonical
sorted-list digest; approved profiles fail when any of those bindings is
unknown. Calculate achieved
coverage as linked divided by eligible minus evidenced exclusions, and retain
every category beside the percentage. Do not allow exclusions to inflate the
score anonymously: each exclusion result must cite a named rule and evidence,
list the stable unique identifiers of the exact excluded candidates, equal its
declared count and remain disjoint from every other exclusion result. Every
excluded ID must belong to the denominator's exact unique candidate-ID list,
whose length must equal the eligible count. Count link assertions separately
when a candidate has more than one. Record stable assertion IDs, require the
assertion ledger to cover every linked candidate and bind exactly one
success-or-failure dereference result to each assertion. Reconcile all counts
from these identity-bearing ledgers, bind the observation to
evidence and calculate freshness against the profile's declared clock. The v1
contract fails closed when an approved profile's result is stale. Never
publish one unexplained “semantic completeness” score.

The validator's completeness claim stops at the declared inventory. It proves
that the frozen candidate IDs, digest, four outcomes, assertion ledger and
evidence reconcile; it cannot prove that the author's eligibility rule found
every entity that should exist in the domain. Approval therefore includes a
recorded owner or domain-review judgement that compares the deterministic rule
with the frozen source snapshot and its support-checked, digest-bound evidence.

Make the predicate agree with the mapping strength: use the corresponding
SKOS predicate for each SKOS mapping, and use `owl:sameAs` only for identity
backed by independently verified, digest-bound assertion evidence. A domain
relationship cannot use an identity or SKOS mapping predicate. Validate every
assertion target against its governed HTTP namespace using URI origin and
path/hash semantics without decoding an encoded slash into a false child path,
reject duplicate candidate-target assertions, and bind all semantic ledger
evidence at approval grade. Canonically hash the complete coverage result,
retaining ledger order, and require one approval-grade receipt to carry both
that exact digest and `observed_at`. Derive dereference success or failure from the
machine-readable terminal result rather than human prose.

### 7. Test Readability As A Contract

The two-stage fixture and full-corpus acceptance must check:

- no visible default label matches configured opaque-ID patterns;
- every endpoint is named in Graph, Links, Facets, Type, Timeline, Resources,
  Map and Narrative wherever it appears;
- labels remain meaningful at ordinary viewport sizes and zoom levels;
- relationship labels read naturally in both directions;
- semantic and metadata projections do not create unexplained duplicate edges;
- the identifier, IRI, evidence and derivation remain available through
  inspection; and
- a novice can answer the selected citizen questions without interpreting
  internal repository vocabulary.

Counts alone do not pass this gate.

## The Explore OKF Stage

Explore OKF is an intermediate learning publication. It is not an OKF release
status and does not imply that the source, model, completeness or service has
been approved.

```text
domain warm-up → tiny fixture → Explore OKF → reviewed candidate → assured RC → publication
```

### Entry Criteria

- a bounded source snapshot or synthetic fixture is identified;
- rights, privacy and security permit the selected material to be shared;
- the actual Explorer loads the selected functionality;
- preliminary entity, label and link registers validate;
- known gaps and unreviewed mappings are explicit; and
- a stable feedback route is available.

### Required Banner

Every Explorer view displays a banner such as:

> **Exploratory** — This is an incomplete research view, not an authoritative
> service or released data product. Content and links may change. Check the
> cited official source before making a decision. [Give feedback](#).

The banner follows the usability intent of the
[GOV.UK phase banner](https://design-system.service.gov.uk/components/phase-banner/)
but does not claim that the independent OKF project is a government service.
It remains visible on every view, preserves the current route in the feedback
link and is exposed in the machine descriptor.

If a producer publishes a companion human landing page for the same
exploratory snapshot, that producer must show the equivalent warning there as
well. Explorer v0.7.0 enforces the banner inside Explorer; it cannot inject UI
into independently hosted producer pages.

### Machine Contract

The exploratory descriptor records:

- `publication_state: exploratory`;
- snapshot ID, generated time and applicable plane roots;
- owner/publisher and authority status;
- banner label, message and feedback URL;
- explicit limitations and incomplete denominators;
- indexing decision, normally `noindex` until owner review;
- permitted and prohibited claims; and
- the rule for promotion to a fresh candidate.

Shared exploratory snapshots are immutable enough to discuss: a link must keep
identifying the bytes and state that a reviewer saw. A new iteration receives
a new snapshot identity. It may reuse unaffected planes through the dependency
graph, but it does not overwrite the evidence for an earlier review.

### Exit Criteria

Exploration ends when the owner either:

- approves a versioned domain-profile change and authorises a fresh candidate;
- requests another bounded exploration iteration; or
- closes the experiment with findings and no publication.

Exploratory bytes are never silently relabelled as a release candidate.

## Acceptance Before `okf-uk-living`

Before the `okf-uk-living` review begins, the methodology should demonstrate:

1. a tiny cross-source citizen journey with no opaque visible labels;
2. link coverage denominators for people-facing services, organisations,
   places and concepts;
3. evidence-backed CPSV-AP and SKOS projections without false identity;
4. a compact label index that works under lazy loading;
5. an exploratory descriptor and route-preserving feedback banner;
6. actual-Explorer tests across all relevant views; and
7. a review decision that can change the model without starting a release
   rebuild.

The recommended data and pilot are in
[Open data for the Explore OKF pilot](../research/explore-okf-open-data-test-candidates.md).

## Implemented Boundary

The review now has matching producer and consumer contracts. The normative
[Explore OKF profile](../profiles/explore-okf/v1/index.md) defines the compact
endpoint-label index and exploratory-publication descriptor; the Python
tooling builds and validates both against the bundle snapshot and integrity
envelope.

OKF Explorer v0.7.0 consumes those contracts. Graph, Links, Facets and other
route-based labels use the governed compact index without hydrating the full
record, display **Missing label** instead of leaking an opaque generated
identifier, and retain the route, IRI, type and label authority in Inspect.
Every view also retains a validated exploratory banner and route-preserving
feedback link. A malformed, unsupported or mismatched exploratory contract is
shown as an explicit warning and is forced to `noindex`; it is never silently
treated as a conforming exploratory publication.

This implementation closes
[issue #94](https://github.com/chris-page-gov/okf-explorer/issues/94) and
[issue #95](https://github.com/chris-page-gov/okf-explorer/issues/95). It does
not make an existing producer conform automatically: each producer must emit
the two snapshot-bound documents, pass actual-consumer journeys and preserve
the exploratory limitations in its public descriptor.
