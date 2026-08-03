# OKF Explorer Evaluation Foundry

The Evaluation Foundry is the capability-evaluation sibling of the governed
[Publication Foundry](../docs/beginners/19-foundry-authoring-and-domain-profiles.md).
It answers a narrower beginner question:

> What could my information do in OKF Explorer, and what would still need a
> human decision before publication?

The workflow keeps one result-set identity across Search, Types, Resources,
Graph, Timeline, Map and the selected-record card:

```text
source snapshot -> transparent profile -> reversible mappings
                -> faithful evaluation bundle -> real Explorer journeys
                -> feature report and publication boundary
```

It does not turn automated profiling into semantic or legal authority. Every
claim is labelled as source-declared, mechanically normalized, inferred or
synthetic. A synthetic supplement, when useful, is a separate default-off
bundle and never contributes to source counts or conclusions.

## Control Artifacts

- [Evaluation profile schema](schemas/okf-evaluation-profile.v1.schema.json)
- [Mapping proposal schema](schemas/mapping-proposal.v1.schema.json)
- [Feature coverage schema](schemas/feature-coverage.v1.schema.json)
- [Coventry and Warwickshire heritage exemplar](fixtures/heritage-warwickshire/README.md)
- [Beginner process](../docs/beginners/22-evaluation-foundry-and-yaml-ld.md)
- [Exemplar report](../docs/heritage-evaluation-report.md)

The exemplar publishes a [faithful source-backed descriptor](../evaluation/heritage/okf-explorer.json),
a [tiny assurance descriptor](../evaluation/heritage/tiny/okf-explorer.json)
and a deliberately separate, default-off
[synthetic capability descriptor](../evaluation/heritage/synthetic/okf-explorer.json).

## Required Stages

1. Freeze source bytes, source terms, scope codes and a completeness
   denominator.
2. Profile the source without changing its meaning.
3. Record each proposed mapping, its evidence, confidence, reversibility and
   effect on Explorer features.
4. Build a separate tiny fixture twice and compare bytes.
5. Run the real Explorer against those exact fixture bytes.
6. Build the faithful full corpus; publish unsupported features as gaps.
7. Build an optional synthetic supplement in a separate namespace.
8. Validate schemas, semantic projections, local links, source links,
   accessibility, durable state and selected-record journeys.
9. Freeze and publish the tested bytes; verify the exact deployed URLs in a
   real browser.

## Publication Boundary

An Evaluation Foundry output is a functionality evaluation, even when its
source facts are authoritative. It must not be represented as a replacement
for the source register or as a governed OKF publication unless it separately
passes the full Publication Foundry and owner approval.
