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
                -> impact plan -> affected candidate planes
                -> real Explorer journeys -> signed promotion envelope
```

It does not turn automated profiling into semantic or legal authority. Every
claim is labelled as source-declared, mechanically normalized, inferred or
synthetic. A synthetic supplement, when useful, is a separate default-off
bundle and never contributes to source counts or conclusions.

## Control Artifacts

- [Evaluation profile schema](schemas/okf-evaluation-profile.v1.schema.json)
- [Evaluation profile v2 schema](schemas/okf-evaluation-profile.v2.schema.json)
- [Mapping proposal schema](schemas/mapping-proposal.v1.schema.json)
- [Feature coverage schema](schemas/feature-coverage.v1.schema.json)
- [Coventry and Warwickshire heritage exemplar](fixtures/heritage-warwickshire/README.md)
- [Beginner process](../docs/beginners/22-evaluation-foundry-and-yaml-ld.md)
- [Exemplar report](../docs/heritage-evaluation-report.md)

The exemplar's external publication unit owns the
[faithful source-backed descriptor](https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/okf-explorer.json),
[tiny assurance descriptor](https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/tiny/okf-explorer.json)
and deliberately separate, default-off
[synthetic capability descriptor](https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/synthetic/okf-explorer.json).
[OKF Explorer](https://chris-page-gov.github.io/okf-explorer/) remains the
reusable runtime rather than becoming the owner of this large corpus.

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
8. Use the impact planner and plane roots to validate the smallest fail-closed
   dependency closure: schemas, semantic projections, local links, source-link
   intents, accessibility, durable state and selected-record journeys.
9. Freeze and publish the tested bytes; verify the exact deployed URLs in a
   real browser, then record the decision in a signed promotion envelope.

## Candidate Bytes And Observations Are Different Things

A candidate contains only stable, content-addressed material: source-backed
records, mappings, generated indexes, graph materializations, journeys and
plane roots. It must not contain a current deployment status, workflow run ID,
observation timestamp, live-link result or promotion decision. Otherwise the
act of testing a candidate changes the candidate that was tested.

Time-sensitive results are separate evidence. A link-freshness job consumes the
candidate's canonical-URL intent shards and emits timestamped receipts outside
the candidate. A signed promotion envelope then binds an exact candidate digest
to those receipts, the deployed descriptor, browser results and release
identity. Expiring or refreshing an observation does not rebuild the corpus.

## YAML-LD, Semantic Identity And JSON-LD

YAML-LD is the canonical authoring representation because it keeps ordinary
Markdown and readable YAML front matter as the source of truth. For this large
exemplar, the normalized source rows drive an explicit deterministic YAML-LD
authoring stage: the builder writes YAML, immediately reparses it with the safe
YAML 1.2 loader, and uses only that parsed document for semantic shards and
JSON-LD. The graph is normalized as URDNA2015 canonical N-Quads; its SHA-256
digest defines semantic identity independently of whitespace, key order or
scalar quoting. JSON-LD is a deterministic interchange materialization, not a
second hand-edited source. Plane receipts retain a separate exact-byte artifact
root so a formatting change is still visible without being called a graph
change.

Link intents follow the same modular rule. Their stable shards are selected by
`SHA-256(canonical URL)`, so a corrected URL invalidates its shard and dependent
checks without forcing unrelated data, search or presentation planes to be
rebuilt. Live availability has a separate freshness schedule.

## Publication Boundary

An Evaluation Foundry output is a functionality evaluation, even when its
source facts are authoritative. It must not be represented as a replacement
for the source register or as a governed OKF publication unless it separately
passes the full Publication Foundry and owner approval.
