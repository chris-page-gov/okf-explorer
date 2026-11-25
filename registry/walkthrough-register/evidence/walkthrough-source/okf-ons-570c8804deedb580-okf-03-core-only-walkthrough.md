# OKF 0.3 core-only walkthrough: scope, freshness and conformance

## Question

> Does OKF 0.3 conformance mean this ONS catalogue is complete, current, or
> statistically verified?

The answer is no. The portable core describes a bounded metadata snapshot
across four source lanes, not every ONS dataset, and it contains no statistical
observation values. The snapshot concept defines no governed `stale_after`
date; current-value and live-execution claims require provider revalidation.
The governance concept says deterministic checks establish structural
conformance and frozen-input integrity, not statistical truth. The standards
concept separates OKF 0.3 structural conformance from statistical accuracy,
legal compliance and certification. The conclusion about completeness,
currentness and accuracy is an inference from those stated limits.

This is a separate question from the metadata-backed
[population-by-age walkthrough](okf-03-complex-question-walkthrough.md). It
uses no dataset record, observation value, metadata extension entity, semantic
assertion or MCP plan.

## Sources and diagram

The build generates the public
[core-only HTML guide](../bundle/core-walkthrough.html), desktop and mobile
diagrams, and a machine-readable source trail. The evidence document binds the
question to the exact `okf-core-explorer.json` identity and descriptor digest,
plus the source hashes for `concepts/catalogue.md`, `concepts/snapshot.md`,
`concepts/governance.md` and `concepts/standards.md`. Those are four of the 12
typed Markdown concepts in the portable projection.

The dotted reading sequence in the diagram is a navigation aid, not a
relationship graph. The core projection carries zero directed concept edges.
The separate profile graph contains 5,097 metadata extension entities and is
outside this answer's source scope.

## Negative controls

- The 5,097 figure describes metadata records in the bounded snapshot; it is
  not a count of observations or proof of complete ONS coverage.
- No freshness interval is inferred from the absence of a `stale_after` date.
- Structural conformance is not statistical accuracy, legal compliance,
  certification or human verification.
- Zero core edges does not mean the separate metadata graph has no
  relationships.
- No named dataset, source-record field, observation value or live query is
  used in this answer.

The separate
[core Reader journey manifest](../evaluation/okf-03/ons-core-walkthrough-explorer-journeys.json)
opens the exact core descriptor and checks the snapshot and standards concepts
in the independent Explorer Reader. The local and protected workflow acceptance
must pass before the built bundle can be promoted.
