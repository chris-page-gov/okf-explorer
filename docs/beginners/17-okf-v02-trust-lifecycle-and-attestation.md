# OKF v0.2 Trust, Lifecycle And Attestation

OKF Explorer now targets the permissive OKF v0.2 core while retaining
compatibility with older v0.1 bundles. The core and the richer Explorer profile
must not be confused.

## Core Versus Profile

The **OKF core** is the smallest interoperable Markdown contract. It allows a
wide range of collections and tools to participate without implementing every
Explorer feature.

The **Explorer bundle-wiki profile** adds optional production capabilities:

- structured semantic projections;
- large-corpus descriptors and indexes;
- federation;
- governed terms;
- facets and presentation;
- integrity and release evidence.

A profile can require more from its own publications without claiming that
every requirement belongs to OKF core.

## The v0.2 Markdown Shape

In the canonical hand-authored corpus:

- the root `index.md` declares `okf_version: "0.2"`;
- ordinary concepts are UTF-8 Markdown with YAML frontmatter and a non-empty
  `type`;
- nested `index.md` files use ordinary headings and links without frontmatter;
- `log.md` has newest-first dated headings and no frontmatter;
- unknown types and metadata keys survive generated projections.

This is deliberately permissive. A core consumer should not reject a concept
merely because it lacks Explorer-specific title, description or semantic
metadata.

## Structured Generation

Older documents used one `timestamp` for several meanings. v0.2 can record
generation explicitly:

```yaml
generated:
  by: "human:chris-page"
  at: "2026-07-09T12:00:00Z"
```

The two fields answer:

- who or what produced this concept representation;
- when that production event occurred.

They do not automatically establish:

- when the source was first published;
- when its subject matter was valid;
- when a reviewer verified its claims.

Those dates belong in source, domain or verification metadata.

## Structured Sources

Source metadata can record more than a body-level citation:

- stable source identifier or URL;
- title and publisher;
- observation or retrieval time;
- rights and usage limits;
- credibility or authority signals;
- applicable temporal window.

When a `sources` field is present, it takes precedence over the older
compatibility projection from a Markdown `# Citations` section. The legacy
list remains visible but must not be upgraded into evidence it did not contain.

## Verification Events And Trust Tiers

A verification event names an actor and time. The Explorer derives a display
tier conservatively:

- no complete verification event — **unverified**;
- only non-human actors — **machine confirmed**;
- at least one human actor — **human reviewed**.

A malformed actor or date cannot raise the trust tier.

Generation and verification are different. A Git author record can show who
committed a file; it does not prove that the author checked every claim against
the cited sources.

Trust tiers describe recorded verification evidence, not universal truth.

## Actor Identifiers

An actor identifier makes the kind and identity of the participant explicit,
for example a human, organisation or software process.

The identifier should be:

- stable within its declared system;
- unambiguous about actor kind;
- linked to supporting identity information where appropriate;
- used consistently across generation and verification events.

A display name alone can collide or change.

## Lifecycle

Lifecycle metadata answers where a concept or release is in its managed
process. Examples include draft, candidate, stable, deprecated or superseded.

Freshness is a separate axis. A stable concept can become stale, and a current
observation can still be a draft.

Relevant fields can include:

- `status`;
- `stale_after`;
- source observation windows;
- replacement or supersession identifiers;
- release version and snapshot.

The Explorer should not turn missing lifecycle metadata into an invented
positive state beyond a documented compatibility default.

## Attested Computation

An Attested Computation declaration describes a computation and the evidence
that an authorised runtime could use to evaluate it:

- computation identity;
- executor and attester;
- inputs and expected materials;
- receipt or verdict contract;
- integrity and policy requirements.

The Explorer presents this as passive discovery metadata.

Opening a bundle never:

- executes the computation;
- contacts the executor;
- asks an attester for a verdict;
- treats a declared contract as a passing receipt.

Execution requires an explicit, separately authorised runtime. The Explorer
can display missing contract fields without claiming an attestation result.

## Compatibility With v0.1

For older bundles:

- `generated.at` wins when present; otherwise the UI can use `timestamp`;
- structured `sources` win when present; otherwise bounded citations can be
  projected;
- a single verification mapping and a list normalise to one internal form;
- missing trust and lifecycle data do not reject the concept.

Fallbacks are labelled. Compatibility must not invent a generator, verifier,
source credibility or human review.

## Validation Layers

The repository reports separately:

- permissive OKF core problems;
- stricter Explorer authoring-profile problems;
- semantic profile validation;
- generated bundle and runtime invariants.

A concept can be core-conformant and still fail the project's stricter
publication quality requirements.

## Continue

Read [OKF conformance](../okf-conformance.md) for the precise current boundary.
Use the [canonical semantic-authoring and rollout ledger](../okf-0.2-yaml-ld-semantic-authoring.md#local-implementation-and-release-ledger)
for the live distinction between local implementation, review, release,
deployment and public verification.

## Next

[Federated bundles](18-federated-bundles.md) explains how independently
published OKF collections are discovered without loading all of them.
