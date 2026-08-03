---
"@context": https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/context.jsonld
"@id": https://chris-page-gov.github.io/okf-explorer/evaluation-foundry/fixtures/heritage-warwickshire/profile
type: Evaluation Profile
title: Coventry and Warwickshire heritage evaluation profile
description: Beginner-readable entry point to the source scope, mappings, fixtures, questions, journeys and publication boundary.
generated:
  by: process:heritage-evaluation-profile-authoring
  at: "2026-08-03T00:00:00Z"
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

## Current Assurance Status

This profile is **provisional**. A clean local site build rendered 239 reading
pages, resolved 4,134 internal page references and passed the 1 GB GitHub Pages
published-site limit with more than 12 MB of headroom.
The local faithful journey also exercised all eight Explorer presentation
views while preserving one query and facet state.

Those are local checks, not evidence that GitHub Pages is available or serving
the same candidate. Publication therefore remains **not demonstrated** until
the exact deployed Explorer and HTML page URLs pass the separate terminal
publication journey.

## Controlling Evidence

- [Machine-readable evaluation profile](evaluation-profile.yaml)
- [Reversible mapping proposals](mapping-proposals.yaml)
- [Feature coverage](feature-coverage.json)
- [Executable Explorer journeys](journeys.json)
- [Evaluation questions](questions.json)
- [Fixture-family notes](README.md)
- [Beginner process and YAML-LD explanation](../../../docs/beginners/22-evaluation-foundry-and-yaml-ld.md)
- [Full evaluation report](../../../docs/heritage-evaluation-report.md)

## Publication Boundary

Official source status, mechanical normalization and successful interface
testing do not turn this evaluation into an assured heritage register or prove
public deployment. Historic England remains authoritative for designation and
Heritage at Risk information. Any synthetic record or relationship is visibly
invented and isolated.
