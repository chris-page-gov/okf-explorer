# Heritage 0.3 migration

Implementation date: 24 November 2026. The upstream 0.3 announcement was on
18 November 2026; the Explorer/OKF+ implementation began on 23 November 2026.
Use the [central standards register](https://github.com/chris-page-gov/okf-explorer/blob/main/docs/okf-standards.md) for current and historical
specification pins.

Three independent logical bundles retain their own snapshots, namespaces,
scope, questions, negative controls and Reader journeys:

| Bundle | Metadata records and assertions | Worked question |
| --- | --- | --- |
| Full source snapshot | 7,640 records; 9,566 assertions | Distinguish the listed building, park and garden and scheduled-monument records for Warwick Castle, then identify the subject of the 2025 risk assessment |
| Tiny assurance subset | Three records; four assertions | Link the risk row to Church of St Peter without transferring it to the cathedral or claiming geographical completeness |
| Synthetic supplement | Three invented records; two assertions | Preserve a proposed intervention and an uncertain attribution, including scope and confidence |

Each generated directory includes its own `walkthrough.html`, readable diagram,
`walkthrough-data.json`, `walkthrough.explorer-journeys.json`, `ai-context.md`
and `llms.txt`. A separate `walkthrough.explorer-057-journeys.json` retains
the legacy Reader's panel selector with the same source assertions.
The evidence contains complete selected record/assertion
objects, a deterministic source-snapshot identity, the authored case hash and
links to the complete graph and source manifests. These question-specific
extracts do not replace whole-bundle reconciliation and access checks.

## Core and profile boundary

The root index declares core 0.3. Indexes and plain-text date-grouped logs are
navigation; they are not concepts. Each generated corpus has one typed
methodology concept. The full publication also includes its typed evaluation
report and profile: its assembled core therefore has three concepts and two
directed Markdown references. The tiny and synthetic publications each retain
one core concept and no local core references. Structured record counts belong
to the separately governed Evaluation Foundry profile; they are not Markdown
concept counts. Existing YAML-LD context and schema identifiers retain their
versioned meaning.

The three retained source snapshots are unchanged. Source observations retain
their August 2026 capture dates and annual risk rows retain year precision.
The migration introduces no new source acquisition, inferred current
condition, named human review, synthetic contribution to faithful counts,
permission or legal conclusion. Upstream names, schema/API identifiers and
quoted source values retain their original spelling; generated explanatory
prose uses British English.

The prior independent publication omitted human labels from its semantic
assertions. The current export restores each label from the unchanged runtime
relationship. Every other assertion field, identity and direction is retained;
the graph digests consequently change. All record, search and runtime
relationship files remain byte-identical. The full source snapshot has the
same JSON content despite a different compressed representation.

Evaluation Foundry profile 2.1.0 pins Explorer 0.9.0 at `cce6e68` and retains
0.5.7 at `0b5d748` for local backward compatibility. Both consumers must pass
the bundle-specific record journeys. The public deep-link gate applies to
the current Reader; the historical runtime is not a separate public service.
The two pre-migration 2.0.0 profile representations remain byte-for-byte
preserved in compressed files under the fixture's `history/2.0.0/` directory.

The publication unit carries the reviewed Python project and lockfile under
`toolchain/`. Its CI and Pages checks use uv 0.13.4 with CPython 3.12.11.
Candidate, terminal and promotion workflows use the same locked environment
from the exact Explorer assurance commit. This keeps installation separate
from candidate contents and retains every existing release and browser gate.

## Publication boundary and remaining gates

Explorer owns the frozen source snapshots, generator and evaluation profile.
The independent Heritage publication repository owns the exact `site/`
candidate and its candidate/promotion release controls. Observations and
browser receipts stay outside that immutable candidate.

Source compilation and local core checks are separate from complete semantic
reconciliation, real Reader journeys, complete asset access, live public
walkthrough checks and release closure. The Heritage release policy requires
its attested immutable candidate and separate promotion release; this document
does not claim that either has been completed for 0.3.

Official rich-page narrative is linked rather than copied. A protected page or
HTTP 403 must remain explicit; metadata completeness does not verify an
unavailable narrative or establish a site's current condition.
