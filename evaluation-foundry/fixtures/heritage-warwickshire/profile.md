---
"@context": https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/context.jsonld
"@id": https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/evaluation-foundry/fixtures/heritage-warwickshire/profile.html
type: Evaluation Profile
title: Coventry and Warwickshire heritage evaluation profile
description: Beginner-readable entry point to the source scope, mappings, fixtures, questions, journeys and publication boundary.
assertion_status: normalized
assertion_scope: real-world
tags:
  - evaluation-foundry
  - historic-england
  - yaml-ld
---

# Coventry And Warwickshire Heritage Evaluation Profile

This profile controls a functionality evaluation of OKF Explorer. It asks what
Historic England and ONS source material can demonstrate across the eight
Reader, Graph, Links, Timeline, Type, Resources, Map and Narrative views,
together with shared search, facets and selected-record evidence. It is not a
legal register or a replacement for Historic England.

## Scope In One Sentence

The faithful corpus contains every unique current record from supported,
non-duplicate NHLE open-data layers whose source geometry intersects Coventry
or one of the five Warwickshire district boundaries in the pinned December
2025 ONS layer. It also contains sanctioned 2013–2025 Heritage at Risk rows
whose authoritative local-government field normalizes to one of those six
authorities. The latter is a reversible source-field test, not a spatial
intersection claim; locality-only matches are excluded.

## Why There Are Three Bundles

- The **tiny assurance fixture** is a small source-backed sample used for fast,
  deterministic producer and real-consumer checks.
- The **faithful corpus** is the complete defined source population used for
  conclusions and counts.
- The **synthetic supplement** is an invented, default-off demonstration of
  sparse capabilities. It has its own namespace and never enters faithful
  counts or search.

## Assurance Without Changing The Candidate

This file describes what a candidate must contain; it does not contain a live
deployment status. That distinction matters because the candidate should keep
the same digest when a later browser run succeeds, an external link becomes
stale or a reviewer makes a promotion decision.

The stable candidate contains the source-backed records, reversible mappings,
executable journeys, canonical-URL link-intent shards and separate roots for
the control, data, search, semantic and presentation planes. Time-sensitive
evidence belongs outside it:

- a candidate receipt records the bytes that passed local checks;
- a link-freshness receipt records which external URLs were seen and when; and
- a signed promotion envelope binds those receipts to the deployed descriptor,
  plane roots, browser journey and release identity.

The planned public corpus lives at
[the external Coventry and Warwickshire publication unit](https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/).
[OKF Explorer](https://chris-page-gov.github.io/okf-explorer/) remains the
reusable browser runtime and loads the external descriptor. The publication
journey must pass against those exact URLs before a signed envelope can call a
candidate promoted.

### Earlier Observation Is Historical, Not Promotion Metadata

The earlier
[Pages run 30813485357](https://github.com/chris-page-gov/okf-explorer/actions/runs/30813485357)
and
[`heritage-coventry-warwickshire-20260803` release](https://github.com/chris-page-gov/okf-explorer/releases/tag/heritage-coventry-warwickshire-20260803)
remain useful historical observations of the first implementation. They are
not embedded as current status in this candidate. That release was mutable at
the GitHub platform level and used a lightweight tag, so it must not be called
an immutable release. The replacement release gate uses the external
publication unit, an annotated tag and GitHub immutable releases.

## Controlling Evidence

- [Machine-readable evaluation profile](evaluation-profile.yaml)
- [Reversible mapping proposals](mapping-proposals.yaml)
- [Feature coverage](feature-coverage.json)
- [Executable Explorer journeys](journeys.json)
- [Evaluation questions](questions.json)
- [Fixture-family notes](README.md)
- [External publication unit](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire)
- [Planned immutable release](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/releases/tag/heritage-coventry-warwickshire-20260804)
- [Beginner process and YAML-LD explanation](../../../docs/beginners/22-evaluation-foundry-and-yaml-ld.md)
- [Full evaluation report](../../../docs/heritage-evaluation-report.md)

## Publication Boundary

Official source status, mechanical normalization and successful interface
testing do not turn this evaluation into an assured heritage register.
Historic England remains authoritative for designation and Heritage at Risk
information. A signed promotion envelope can bind an exact commit, candidate
digest, deployed URL and observation time, but Pages and external source URLs
can subsequently change. Any synthetic record or relationship is visibly
invented and isolated.
