# OKF Authoring Profile v1

Status: experimental production profile, 29 July 2026.

This profile defines the bounded handoff between domain research and an OKF
bundle build. It exists so a builder can reuse domain decisions without
receiving an enormous research transcript or silently inventing missing
semantics.

The profile URI is:

`https://chris-page-gov.github.io/okf-explorer/profile/authoring/v1/`

Its machine contract is
[`domain-profile.schema.json`](domain-profile.schema.json). A complete,
schema-valid example is
[`domain-profile.template.yaml`](domain-profile.template.yaml).

## What This Profile Is

An `okf-domain-profile.v1` document is a research and control artefact. It
freezes:

- purpose, scope, exclusions and any completeness denominator;
- source, semantic, operational and decision authority;
- the collection's document families, representations, formats, languages,
  extraction constraints and sensitivity findings;
- material research claims with separate claim, workflow, derivation,
  authority, confidence and evidence fields;
- source access, rights, privacy, freshness and acquisition evidence;
- user roles, tasks, evidence needs and hard failures;
- source-native terminology, entities, identifiers, versions and
  relationships;
- the exact standards selected for the domain and how each will be tested;
- the smallest justified OKF/Explorer publication architecture;
- the exact downstream consumers, their version/digest lock and the
  producer-to-plane-to-consumer impact graph;
- a two-stage tiny-fixture protocol that validates producer bytes first and
  then executes the actual locked consumers;
- per-plane digest roots, invalidation triggers and selective-rerun closure;
- backward and forward producer/consumer compatibility expectations;
- post-deploy deep links whose bundle identity and restored state must be
  checked;
- validation, evaluation, unresolved gaps and owner decisions; and
- traceability from intended outcomes to planned artefacts and checks.

It is not the knowledge graph, an ontology, a licence decision, or evidence
that the eventual bundle passed its release gates.

## Fixed Interoperability Floor

All builds retain the permissive [OKF v0.2 core][okf-spec]. The Foundry
production profile normally adds stable identity, provenance, rights/access,
coverage, lifecycle, freshness, traceability, deterministic generation and
evaluation, but these additions must not be described as requirements of OKF
core.

When semantic publication is justified, use:

- YAML 1.2.2 and the exact dated [YAML-LD 1.0 Working Draft][yaml-ld] selected
  during warm-up;
- JSON-LD 1.1, its API and framing specifications where applicable;
- RDF 1.1 and RDF Dataset Canonicalization 1.0 for semantic digests;
- pinned, allowlisted contexts;
- JSON Schema 2020-12 for control and projection documents; and
- SHACL for closed-world RDF publication checks.

YAML-LD is a Working Draft, not a W3C Recommendation. A build must record the
exact official publication it tested. It must not copy a prompt's old
"latest" date.

## Standards Applicability

Every candidate standard receives exactly one applicability decision:

| Decision | Meaning |
|---|---|
| `normative` | The selected publication claims and tests conformance. |
| `projection` | A generated representation maps to the standard without replacing source meaning. |
| `source-native` | The source already uses it and the bundle preserves that form. |
| `conditional` | It applies only when a recorded condition is met. |
| `reference-only` | It informs analysis but creates no production assertion or conformance claim. |
| `not-applicable` | It was assessed and deliberately excluded, with a reason. |

Similar field names are not conformance. A standard marked `normative` must
name the exact version, conformance artefact and validator/test suite.

## Orthogonal Evidence Axes

Do not overload one `status` or one score. Record independently:

- source/assertion authority;
- derivation (`source-native`, `normalized`, `rule-derived`,
  `model-assisted`, or `expert-asserted`);
- OKF verification trust;
- research-claim status;
- freshness;
- source availability;
- coverage against a named denominator;
- concept lifecycle; and
- release lifecycle.

Confidence cannot upgrade authority. A numeric confidence value is meaningful
only when a calibration method and evidence are declared.

## Change And Build Rules

- Hash-lock an approved domain profile and its evidence register.
- Pin every release-relevant consumer to an exact release, commit, binary,
  container or dependency-lock digest in one checksummed consumer lock.
- Maintain an explicit dependency graph from producer and input through each
  digest plane, consumer and public route. Every edge names its change impact
  and validation closure.
- A builder consumes that exact profile; it does not rewrite it.
- Only unresolved decisions explicitly marked `blocking_for_build: true`
  prevent the smallest viable build.
- A semantic scope or standards change requires a new profile version or a
  recorded decision override.
- Non-blocking uncertainty becomes a visible gap or constraint, not an
  invented value.
- Begin every implementation with a two-stage tiny fixture. Stage 1 builds and
  validates positive, negative, stale, unavailable, conflicting, unsafe and
  digest-mismatch cases twice. Stage 2 executes every required locked consumer
  against those exact bytes; schema-only or mocked substitutes do not close
  the consumer gate.
- Give control, data, search, semantic, presentation and release planes their
  own applicable digest roots. Rerun only the transitive impacted planes and
  consumers proven by the graph; a timestamp or an assertion that a change is
  harmless is not reuse evidence.
- Test compatibility in both directions: new producer output with every
  supported consumer, and retained supported producer fixtures with the new
  consumer.
- Freeze and assure one release candidate, then promote identical bytes.
- After deployment, open the exact public overview, record, search/filter and
  other selected deep links in the actual consumer. Verify bundle identity,
  snapshot, restored view/state, expected content and applicable plane roots;
  HTTP 200 alone is insufficient.

## Additive Consumer Contract

The schema exposes an optional `consumer_contract` so profiles created before
this clarification remain valid `v1` documents. New or materially revised
Foundry profiles should populate it from the public template. It contains:

- `inventory` and `lock`;
- `dependency_graph`;
- `fixture_protocol.producer_stage` and `consumer_stage`;
- independently rooted `planes`;
- two-direction `compatibility` cases; and
- `post_deploy_deep_links`.

An approved profile that uses this contract must have a real consumer-lock
SHA-256. The semantic validator also checks lock/inventory equivalence,
consumer and plane references, required-consumer execution, both compatibility
directions and deep-link coverage.

The copy-ready prompts and complete workflow are in the
[OKF Foundry prompt kit](../../../docs/okf-authoring-prompt-kit.md).

[okf-spec]: https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/3fcbb9f828c2f23d109c855ee403c3a4c81f3a96/okf/SPEC.md
[yaml-ld]: https://www.w3.org/TR/yaml-ld-10/
