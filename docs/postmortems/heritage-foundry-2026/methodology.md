---
"@context":
  - https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/context.jsonld
  - https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/semantic-context.jsonld
"@id": https://chris-page-gov.github.io/okf-explorer/docs/postmortems/heritage-foundry-2026/methodology.html
"@type": https://schema.org/Report
type: Report
title: "Postmortem methodology and metric definitions"
description: "Scope, extraction, evidence, measurement and limitation rules for the heritage Foundry postmortem."
generated:
  by: process:heritage-foundry-postmortem-builder
  at: "2026-08-04T05:00:00Z"
assertion_status: normalized
assertion_scope: real-world
tags:
  - postmortem
  - methodology
  - evidence
---
# Postmortem Methodology And Metric Definitions

## Decision And Audience

The report is for maintainers and technically interested reviewers deciding how
to change the Evaluation Foundry so late errors invalidate only their dependency
cone. It is not an assessment of Historic England, GitHub or the end user's
browsing behaviour.

## Evidence Scope

The collection boundary is the task from `2026-08-02T21:46:49Z` through the
recommendation-implementation handoff, plus repository/GitHub evidence for PRs
#67–#69. The private
plane contains raw GitHub logs, structured PR/run metadata, release assets, Git
outputs and three deployment archives. The public plane contains hashes,
normalized registers, bounded excerpts and this analysis.

The primary performance reconstruction ends at the terminal 3 August release.
The 4 August postmortem publication is reported separately as a controlled
documentation-only invalidation exercise; it is not added to the three historical
PR totals or six GitHub workflow totals. Current PR #70 and the replacement
external publication are recorded through the normalized
[publication-evidence register](data/current-publication-evidence.json); pending
records do not change historical timing metrics or imply success.

The prior
[hackathon postmortem pattern](https://github.com/chris-page-gov/ai-engineering-lab-hackathon-london-2026/tree/8418bce78496e36598b10d4562b1fb275ad610bb/postmortem-public)
was reused: one exchange begins with a visible user prompt and contains every
visible assistant commentary/final message until the next prompt. System and
developer instructions, private reasoning, tool arguments and tool outputs are
not part of a prompt-response trace. Publication-evidence records are never
converted into conversation messages, so the same rollout bytes always produce
the same full trace regardless of rollout milestone status.

## Metric Definitions

- **Workflow wall time** is `updatedAt - startedAt` for a GitHub Actions run.
  Times across runs are additive resource/queue observations, not elapsed
  delivery latency when work overlaps.
- **CI job time** is job completion minus job start. A step duration is computed
  from its GitHub job timestamps.
- **File touch** is one path reported by `git diff --name-only` for one PR phase.
  A path changed in two PRs counts twice in the total `4,280`.
- **Generated amplification** is generated output touched because an upstream
  change invalidated broad output, compared with the number/type of substantive
  source changes. It is descriptive; no CPU cost per file is inferred.
- **Late finding** is a defect, inconsistency or release risk first reported after
  full-corpus generation or during Site/browser/publication assurance.
- **Dependency cone** is the changed input plus every transitively dependent
  producer plane, consumer test, Site component and promotion check.
- **Outcome fingerprint** is a stable projection of semantic results with run
  timestamps and observation-only metadata removed.
- **Reused gate** is a previously passed result whose declared inputs/roots are
  unchanged by the reviewed change class. The fresh Site-shell receipt names
  every reused and rerun gate; reuse is not inferred from a green final build.

## Conversation Extraction

The curated source has SHA-256 `db415b12079338b37583e12b719b5e08bab9abd982bd53df6bf98f900785b29b` and contained
`53,611,624` bytes at extraction. The public trace contains
`8` user exchanges and
`262` visible Codex messages at extraction.
Local paths and token-shaped strings are redacted. The public lint rejects local
user paths, Codex rollout paths, private evidence paths and common token forms.

## Command Evidence

The task runtime aggregates several nested commands into one orchestrator call.
Therefore command **invocation counts** are exact for recognized executable
command strings, while local per-command duration is unavailable when commands
shared an outer call. GitHub job and step durations remain exact to the reported
timestamp resolution. Raw command output stays private.

## Limitations And Uncertainty

- This is one complex exemplar and three PRs, not a benchmark across projects.
- The trace cannot expose hidden model reasoning and does not claim to do so.
- Local tool calls made by subagents are represented through their visible
  summaries and repository results, not merged into the parent prompt trace.
- GitHub does not report billable cost here, so the report uses wall time and
  file/byte amplification rather than money.
- The release is digest-bound and frozen by policy, but GitHub reports
  `isImmutable: false`; this statement describes the historical 3 August
  release. The replacement annotated-tag/attestation/immutable-release policy is
  implemented locally but is not counted as terminally passed before a new
  external release is independently verified.
- The current final response is included through the handoff capture mechanism;
  rerunning after the task completes can verify it against the finalized rollout.
