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
For a release-facing build, it also identifies every real downstream consumer,
pins those consumers in a checksummed lock and records the dependency/impact
graph that joins producers, digest planes, consumers and public routes.

### Stage 2: Build And Assurance

The builder consumes an approved, hash-locked profile and:

1. acquires immutable source material;
2. builds a tiny producer fixture twice;
3. executes the actual locked consumers against those fixture bytes;
4. implements the smallest justified publication;
5. validates data, semantics and per-plane digest roots;
6. tests user tasks, both compatibility directions and failure cases;
7. freezes one release candidate;
8. checks exact public deep links in the locked consumer; and
9. promotes the identical bytes after assurance.

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
- a pinned consumer inventory and checksummed consumer lock;
- a producer-to-plane-to-consumer dependency and impact graph;
- per-plane digest roots and invalidation rules;
- producer/consumer compatibility in both directions;
- post-deploy deep links and their expected restored state;
- validation and evaluation;
- unresolved owner decisions;
- traceability from outcomes to artefacts and checks.

It is a control artefact. It is not:

- the knowledge graph;
- an ontology;
- a licence decision by itself;
- proof that the eventual release passed.

## Consumers Are Part Of The Contract

A bundle is not complete merely because its files match a schema. The actual
reader, validator, search worker, generator, finaliser or archive reader may
still reject those files or interpret them differently.

The profile therefore inventories every release-relevant consumer and pins an
exact release, commit, binary, container or dependency digest. The lock is
checksummed and reviewed with the profile. Avoid moving labels such as
`latest`: they make a passing result impossible to reproduce.

The accompanying dependency graph makes change impact explicit:

```text
source/producer → generated plane → consumer/finaliser → public route
```

Every edge records its contract, affected planes and validations. When an
input, schema, route or consumer changes, this graph determines the transitive
set of work that must rerun.

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
- conformance artefact;
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

## Identity Is Not A Display Name

A graph needs stable identifiers so that a machine can tell two things apart.
A person needs concise names so that they can understand those things. These
are separate requirements.

Every entity that can appear in Graph, Links, Facets or another Explorer view
therefore needs:

- a stable identifier or IRI;
- a preferred human label and language;
- the source or derivation of that label; and
- an optional description for further context.

For a large bundle, a compact label index makes those names available before
the complete entity record is downloaded. A generated hash may be useful in
Inspect, but it is a quality defect when it appears as the ordinary name of an
organisation, source, activity or rights statement.

## Useful Semantic Linking

The aim is not to draw the largest possible graph. Every link should answer a
recorded user question and have enough evidence for its claimed strength.

For each kind of external link, the profile records which entities are
eligible, how many are linked, which remain unresolved or conflicting and
which were excluded. This makes “90 per cent of eligible public bodies have an
official identifier” meaningful. A raw total of 10,000 relationships does not
say whether any of them help a citizen.

That denominator is not just a number. The profile lists each eligible stable
ID, says how the deterministic rule derived it from the frozen source snapshot,
cites evidence and records a digest of the canonical list. It then assigns
every ID exactly once to linked, unresolved, excluded or conflicting. An
exclusion names its exact candidates, rule and evidence. The validator also
distinguishes linked candidates from link assertions, because one candidate
may have several justified links, and matches each stable assertion ID to one
bounded dereference result. Approved v1 profiles fail closed when a required
digest is unknown or this evidence becomes stale.

The computer can prove that this **declared list** balances exactly. It cannot
know whether the author accidentally left a genuinely eligible entity out of
the rule. Before approval, a domain reviewer or owner must compare that rule
with the frozen source evidence and record their judgement. This is why the
method does not call the percentage universal “semantic completeness”.

The profile also prevents apparently cautious wording from hiding a stronger
machine claim. A SKOS mapping label must use its matching SKOS predicate, while
`owl:sameAs` requires independently verified identity evidence. Every target
must sit inside the stated web namespace, including after percent-encoded path
delimiters are rejected, and the same candidate-to-target link cannot be
counted twice. `coverage_result_sha256` commits the complete result as
canonical UTF-8 JSON while retaining the order of its ledger arrays. For an
approved profile, one approval-grade evidence item must carry both that exact
digest and the result's exact observation time; two unrelated receipts cannot
be combined to satisfy the rule. A machine-readable HTTP or failure result
determines whether dereferencing succeeded.

Concepts can use qualified SKOS mappings such as exact, close, broader,
narrower or related. `owl:sameAs` is much stronger: it says that two IRIs name
the same individual, so matching words alone are never enough.

## Explore OKF Before A Release Candidate

After the tiny producer and consumer fixtures pass, a project may publish a
small **Explore OKF** snapshot for learning. It shows the real Explorer
functionality and preliminary semantic links, but every view carries a clear
**Exploratory** banner and route-preserving feedback link.

The banner says that the view is incomplete research, not an authoritative
service or released data product, and directs readers to the cited official
sources. The snapshot records its exact identity, limitations and indexing
decision. It can be replaced by a new exploration, but it cannot be promoted
to a release merely by changing its label.

Explorer v0.7.0 implements this through the strict
[Explore OKF profile](../../profiles/explore-okf/v1/index.md). It checks that
the exploratory metadata matches the loaded snapshot and plane roots before
trusting the publisher wording or feedback link. Every view retains the
banner; malformed exploratory intent produces a visible warning and
`noindex`. The same version consumes the compact label index, showing
**Missing label** instead of an opaque generated name while keeping technical
identity available through Inspect. A producer must still emit the contracts
and pass actual-consumer journeys before its own snapshot can claim
conformance. See the
[methodology review](../okf-authoring-methodology-review-2026-08-12.md) for the
full decision and acceptance rules.

## Two-Stage Tiny Fixture First

Before processing the full source, Stage 1 builds a small producer fixture
twice, covering:

- valid positive data;
- missing optional data;
- invalid or conflicting data;
- stale material;
- unavailable sources;
- unsafe paths or URLs;
- rights restrictions;
- digest mismatch.

The clean builds must be byte-identical and must produce the expected digest
roots.

Stage 2 then executes every required, locked consumer against those exact
bytes through its real entrypoint. A mock, schema-only validator or hand-written
parser is not a substitute. The stage records the consumer version, command,
loaded bundle identity, requested state and terminal outcome.

Together the two stages prove that both the producer contract and real consumer
behaviour work before a large harvest makes mistakes expensive.

## Plane Roots And Selective Reruns

Control, data, search, semantic, presentation and release content change for
different reasons. Give every applicable plane its own ordered manifest,
digest root, invalidation triggers, consumers and validation receipt.

Selective reruns are safe only when the dependency graph proves that a changed
input cannot affect a reused plane or consumer. Follow the graph's transitive
impact closure and compare roots. A timestamp, unchanged filename or intuition
is not reuse evidence.

## Compatibility Runs Both Ways

Retain fixtures that define the supported compatibility window and test:

1. current producer output with every supported locked consumer; and
2. every retained supported producer fixture with the current consumer.

Each case declares whether it should be accepted, degrade explicitly or fail
closed. Testing only the first direction can miss a consumer regression;
testing only the second can miss a producer break.

## Post-Deploy Deep Links

After deployment, open exact overview, record, query, filter and other
task-critical links in the locked public consumer. Verify the bundle identity,
snapshot, restored view/state, expected content and applicable plane roots.

HTTP status 200 proves only that a server returned something. It does not prove
that the consumer loaded the intended bundle or restored the requested state.

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

The approved domain profile, evidence register and consumer lock are hashed.
The build records the exact digests it consumed.

If semantic scope or standards decisions change, the profile receives a new
version or recorded override. This makes it possible to explain why two builds
that used similar source data produced different models.

## Frozen Candidate Promotion

Build and assure one release candidate. Promotion publishes those exact bytes
rather than rebuilding from nominally the same source.

This prevents a successful test from referring to one artefact while the
public release contains another.

## Use It With Any AI

This workflow does not require a particular AI product.

1. Use an AI that can read the supplied collection and create files. For the
   build stage it must also be able to work in the repository and run the
   validators. A chat-only AI may produce the research handoff, but cannot
   truthfully claim to have built or published the bundle.
2. Open the [formatted domain warm-up prompt](../prompts/okf-domain-warm-up.md),
   copy it with the page's **Copy full prompt** button, fill every placeholder
   and run it read-only.
3. Validate the resulting JSON/YAML domain profile and evidence, resolve only
   decisions marked `blocking_for_build: true`, then record the approved
   profile and consumer-lock digests. Review the consumer inventory and
   dependency/impact graph rather than accepting placeholders.
4. Open the [formatted build prompt](../prompts/okf-bundle-build.md), copy it,
   supply those exact digests and run the build as one outcome workflow.
5. Accept success only when both tiny-fixture stages, per-plane roots, both
   compatibility directions, source and rights receipts, standards checks,
   user-task evaluation, accessibility and frozen-candidate assurance pass—or
   when an owner has explicitly accepted and published the remaining
   exception.
6. Verify the final human pages, machine descriptors and task-critical deep
   links by content, restored state and digest, not merely by receiving HTTP
   status 200.

The [prompt kit checklist](../okf-authoring-prompt-kit.md#success-checklist)
gives the complete, copy-ready acceptance procedure.

## Continue

Use the [OKF Foundry prompt kit](../okf-authoring-prompt-kit.md) and
[authoring profile](../../profiles/authoring/v1/index.md) for the copy-ready
workflow and schema.

## Next

[Governed enrichment and release assurance](20-governed-enrichment-and-release-assurance.md)
explains how derived assertions and the final browser build earn publishable
evidence.
