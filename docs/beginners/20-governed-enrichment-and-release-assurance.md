# Governed Enrichment And Release Assurance

Derived metadata can make a collection easier to explore, but it also creates
new claims. Release assurance must prove which derived materials were accepted
and which exact application bytes were tested.

## Governed Terms

A governed term registry explains the metadata and predicates used by a pack:

- stable identifier;
- preferred label and definition;
- domain and expected value;
- authority and source;
- lifecycle;
- replacement or deprecation;
- validation rules.

The Explorer can present searchable bundle-wide and record-scoped definitions.
Help text can point to the same governed term rather than embedding unrelated
explanations in the interface.

## Closed-World Term Validation

A validation report checks the published pack against its declared term
contract:

- required term exists;
- value has the expected form;
- controlled value belongs to the declared scheme;
- provenance is present;
- referenced term or predicate is known.

The report is closed-world publication evidence. It remains separate from OWL
inference and from whether the source claim is true.

## Model-Assisted Enrichment

A model can propose topics, entities or relationships that source metadata did
not state explicitly.

The safe pipeline distinguishes:

1. candidate generation;
2. evidence capture;
3. deterministic validation;
4. independent review;
5. accepted assertion publication;
6. route-scoped loading;
7. visible model-assisted presentation.

A proposal does not become official because it passed a numeric confidence
threshold.

## Evidence Profiles

An accepted assertion can record ordered evidence such as:

- title-only support;
- notes-only support;
- support across several fields;
- exact source passages;
- rule or model version;
- reviewer decision.

The evidence profile tells a user what the classification relied on. It does
not hide a weak source behind an aggregate score.

## Accepted Manifest, Audit And Reviewer Receipt

Before reporting governed enrichment as ready, the Explorer cross-checks:

- the public accepted-assertion manifest;
- an independent audit;
- a reviewer receipt;
- byte counts and SHA-256 hashes;
- audit identity and decision;
- snapshot and material bindings;
- predicate and evidence vocabularies;
- chunk inventory and counts.

The three artefacts serve different roles. Self-declaration by the generated
assertion file is not independent acceptance evidence.

## Aligned Route Shards

Large enrichment data is aligned with the record locator and full-record
chunks. Selecting one record loads only its accepted enrichment shard.

The loader checks:

- safe paths;
- exact snapshot;
- compressed and uncompressed bounds;
- digest;
- record and row counts;
- route identity;
- predicate vocabulary;
- evidence structure.

If an accepted shard fails, the route remains explicitly incomplete and
retryable. The official and deterministic base graph stays usable.

## No Silent Fallback

When governed v3 enrichment is declared, an older v2 publication can remain as
historical evidence but is not silently substituted.

Otherwise a failure in the governed path could be hidden by loading a less
assured dataset. Explicit failure is safer than an apparently complete mixed
state.

## Authority Presentation

Graph and detail views keep distinct:

- official source relationships;
- deterministic derived relationships;
- model-assisted relationships;
- unclassified legacy relationships.

Users can inspect and filter these classes. A selected model-assisted line
shows its evidence rather than borrowing the style or status of an official
effect.

## Official-Effects Reconciliation

A frozen official-effects graph can publish a bounded reviewed comparison with
a live official source.

The interface shows four states separately:

- agreement;
- live addition;
- superseded;
- inaccessible.

Even a zero count is displayed. Omitting a category could make “not checked”
look like “none found.”

If live comparison cannot load, the frozen graph remains available and the
failure is visible.

## Deterministic Application Build

The production application is built twice from clean generated state. Every
material path and digest must match.

This proves that the current toolchain and configuration produce identical
application bytes from identical inputs. It does not prove the application is
correct; runtime and accessibility tests answer other questions.

## Build Manifest

The assembled app publishes a canonical manifest containing:

- safe build-root-relative paths;
- byte counts;
- SHA-256 digests;
- a deterministic tree digest;
- file count and algorithm.

The final Pages assembly rehashes every declared material and rejects:

- missing files;
- extra files;
- unsafe or duplicate paths;
- symbolic or linked files;
- tampered bytes.

The manifest excludes itself to avoid recursive hashing.

## SBOM

A Software Bill of Materials, or **SBOM**, inventories software components and
dependencies in a machine-readable form.

It supports:

- dependency review;
- vulnerability response;
- licence analysis;
- release traceability.

An SBOM describes included components. It is not proof that none of them has a
vulnerability.

## Runtime Acceptance

The legislation release gate exercises the production build and real generated
publication, not only a small fixture.

It tests in Chrome, Firefox and WebKit:

- federation overview and child loading;
- bounded compressed startup;
- cold and warm search;
- facets and responsive layout;
- official-effects reconciliation;
- graph authority styles and keyboard operation;
- selected-record governed enrichment;
- WCAG 2.2 AA checks;
- declared performance and memory limits.

Browser-specific measurements that are unavailable are recorded as
unavailable rather than reported as passes.

## Self-Contained Receipt

A release-bound acceptance run stages:

- exact runner bytes;
- descriptors;
- canonical build manifest;
- every build material;
- current screenshots;
- measurements and gate decisions.

Each material has a safe relative path, positive byte count and SHA-256 digest.
The receipt can therefore be rehashed independently.

Publication uses write-once behaviour. A divergent existing artefact causes
failure rather than being overwritten.

## Evidence Chain

The complete chain is:

```text
approved domain profile
→ immutable source bytes
→ deterministic generated pack
→ governed accepted assertions
→ deterministic app build
→ assembled-site integrity check
→ multi-browser runtime receipt
→ promotion of identical bytes
```

Every arrow needs an explicit material or validation binding. A green test on
unbound local files is not release evidence for different public bytes.

## Continue

Read [UK Legislation runtime acceptance](../legislation-runtime-acceptance.md),
[Federated OKF bundles](../federated-bundles.md) and the release-assurance
artefacts for the exact gates.

## Next

[Release gates, evidence and owner review](21-release-gates-evidence-and-owner-review.md)
explains the gate vocabulary, Foundry G0–G9 sequence, evidence roles and owner
decisions from first principles.

Return to [A contributor's repository tour](15-contributor-repository-tour.md)
before changing these contracts.
