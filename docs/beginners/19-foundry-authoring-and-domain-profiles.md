# Foundry Authoring And Domain Profiles

The OKF Foundry workflow separates domain research from bundle construction.
The handoff is a bounded, validated profile rather than a giant prompt or an
unreviewed transcript.

## Why A Warm-Up Comes First

A technically neat graph can still be wrong for its domain.

Before choosing fields or ontologies, a research stage establishes:

- purpose and users;
- source families and authority;
- document and representation types;
- identifiers and versions;
- rights, privacy and access;
- completeness denominator;
- material claims and evidence;
- task failures;
- applicable standards;
- unresolved decisions.

The build stage then consumes those decisions. It does not silently rediscover
or reinterpret the domain.

## Two-Stage Workflow

### Stage 1: Domain And Standards Warm-Up

The warm-up is read-only with respect to the production bundle. It studies
sources, formats, identifiers, user tasks, standards and risks.

Its product is an `okf-domain-profile.v1` document and evidence register.

### Stage 2: Build And Assurance

The builder consumes an approved, hash-locked profile and:

1. acquires immutable source material;
2. creates a tiny representative fixture;
3. implements the smallest justified publication;
4. validates data and semantics;
5. tests user tasks and failure cases;
6. freezes one release candidate;
7. promotes the identical bytes after assurance.

This keeps research decisions reviewable and prevents implementation drift.

## Domain Profile

The profile records:

- scope and exclusions;
- collection and source characteristics;
- claims and evidence;
- users, tasks and hard failures;
- native concepts, identifiers, versions and relationships;
- standards decisions;
- target OKF and Explorer architecture;
- validation and evaluation;
- unresolved owner decisions;
- traceability from outcomes to artifacts and checks.

It is a control artifact. It is not:

- the knowledge graph;
- an ontology;
- a licence decision by itself;
- proof that the eventual release passed.

## Evidence Has Several Axes

One `status` field or confidence score cannot safely carry every judgment.
Record independently:

- assertion authority;
- derivation method;
- OKF verification trust;
- research-claim state;
- confidence and calibration;
- freshness;
- availability;
- coverage;
- concept lifecycle;
- release lifecycle.

For example, a high-confidence model classification remains model-assisted.
A source can be official but stale. A complete harvest can be unverified.

## Standards Applicability

Every considered standard receives an explicit decision:

| Decision | Meaning |
|---|---|
| Normative | The publication claims and tests conformance |
| Projection | A generated representation maps to the standard |
| Source-native | The source already uses it and it is preserved |
| Conditional | It applies only under a recorded condition |
| Reference-only | It informs design without a conformance claim |
| Not applicable | It was assessed and deliberately excluded |

A normative decision names:

- exact version;
- conformance artifact;
- validator or test;
- scope of the claim.

“Uses similar fields” is not conformance.

## Smallest Useful Product

The warm-up should not assume every bundle needs:

- a new ontology;
- model enrichment;
- federation;
- geospatial preview;
- a large-corpus data plane;
- live provider comparison.

Choose the smallest architecture that answers the recorded user tasks while
preserving evidence and future extension points.

A small Markdown bundle can be the right production result.

## Tiny Fixture First

Before processing the full source, build a small fixture covering:

- valid positive data;
- missing optional data;
- invalid or conflicting data;
- stale material;
- unavailable sources;
- unsafe paths or URLs;
- rights restrictions;
- digest mismatch.

The fixture proves that the contract and failure behaviour work before a large
harvest makes mistakes expensive.

## Rights And Access

The profile records separately:

- source access method;
- authentication;
- terms and licence;
- privacy and sensitivity;
- automation limits;
- redistribution rights;
- evidence for each decision.

A builder does not treat successful download as permission to republish.
Unresolved rights issues become visible constraints or blocking decisions.

## Immutable Acquisition

A reproducible build records:

- exact source URL or release;
- retrieved bytes;
- byte count and hash;
- retrieval time;
- cache or archive identity;
- parser and transformation versions.

Content-addressed reuse avoids fetching or processing identical bytes again.
Live sources can change, so the release must state which observation it froze.

## Blocking And Non-Blocking Gaps

Only decisions explicitly marked as blocking stop the smallest viable build.

Other uncertainty becomes:

- a visible gap;
- an unknown value;
- a source constraint;
- a later enhancement;
- an evaluation limitation.

The builder must not fill a non-blocking gap with an invented semantic claim.

## Hash-Locked Handoff

The approved domain profile and evidence register are hashed. The build records
the exact digest it consumed.

If semantic scope or standards decisions change, the profile receives a new
version or recorded override. This makes it possible to explain why two builds
that used similar source data produced different models.

## Frozen Candidate Promotion

Build and assure one release candidate. Promotion publishes those exact bytes
rather than rebuilding from nominally the same source.

This prevents a successful test from referring to one artifact while the
public release contains another.

## Continue

Use the [OKF Foundry prompt kit](../okf-authoring-prompt-kit.md) and
[authoring profile](../../profiles/authoring/v1/index.md) for the copy-ready
workflow and schema.

## Next

[Governed enrichment and release assurance](20-governed-enrichment-and-release-assurance.md)
explains how derived assertions and the final browser build earn publishable
evidence.
