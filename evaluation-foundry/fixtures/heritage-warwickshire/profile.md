---
"@context": https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/context.jsonld
"@id": https://chris-page-gov.github.io/okf-explorer/evaluation-foundry/fixtures/heritage-warwickshire/profile.html
type: Evaluation Profile
title: Coventry and Warwickshire heritage evaluation profile
description: Beginner-readable entry point to the source scope, mappings, fixtures, questions, journeys and publication boundary.
generated:
  by: process:heritage-evaluation-profile-authoring
  at: "2026-08-03T10:29:12Z"
evaluated:
  status: passed
  at: "2026-08-03T12:29:08.274Z"
  deployment_commit: c8e8fac3ef2beddae7bdc99988ae9c5aac2431f2
  pages_run: 30813485357
  descriptor_sha256: 2b06dc70e8d1943e18617d4edcb09bd5041ff8f7b7611828d1c9d24070b37149
  release_root_sha256: aa8f3367b7fb0e5de46a5c33ac4ef1906507defae114317e7bec88ee72fa7aeb
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

This profile is **evaluated**, and public verification passed for the exact
candidate observed at **2026-08-03 12:29:08.274 UTC**. A clean local site build
rendered 239 reading pages, resolved 4,135 internal page references and passed
the 1 GB GitHub Pages published-site limit with more than 12 MB of headroom.
The local faithful journey also exercised all eight Explorer presentation
views while preserving one query and facet state.

The terminal `journey-publication` then passed against
[Pages run 30813485357](https://github.com/chris-page-gov/okf-explorer/actions/runs/30813485357)
at commit
[`c8e8fac3ef2beddae7bdc99988ae9c5aac2431f2`](https://github.com/chris-page-gov/okf-explorer/commit/c8e8fac3ef2beddae7bdc99988ae9c5aac2431f2):
**1/1 journey, 27/27 actions and 2/2 assertions** passed. The observed
descriptor SHA-256 was
`2b06dc70e8d1943e18617d4edcb09bd5041ff8f7b7611828d1c9d24070b37149`,
the release root was
`aa8f3367b7fb0e5de46a5c33ac4ef1906507defae114317e7bec88ee72fa7aeb`,
and the journey-result SHA-256 was
`36bcc3f2e31a7dcc73c793d4a44a12492a717d321f30926685341e45ea3ee1f4`.
Publication is therefore **demonstrated for that exact observation**.

The publication-evidence home is the immutable
[heritage-coventry-warwickshire-20260803 release](https://github.com/chris-page-gov/okf-explorer/releases/tag/heritage-coventry-warwickshire-20260803).
The promoted journey validates that release page as action 28; its exact
terminal results are attached to the tagged commit without changing the
verified Site bytes.

## Controlling Evidence

- [Machine-readable evaluation profile](evaluation-profile.yaml)
- [Reversible mapping proposals](mapping-proposals.yaml)
- [Feature coverage](feature-coverage.json)
- [Executable Explorer journeys](journeys.json)
- [Evaluation questions](questions.json)
- [Fixture-family notes](README.md)
- [Observed Pages workflow run](https://github.com/chris-page-gov/okf-explorer/actions/runs/30813485357)
- [Immutable release evidence](https://github.com/chris-page-gov/okf-explorer/releases/tag/heritage-coventry-warwickshire-20260803)
- [Beginner process and YAML-LD explanation](../../../docs/beginners/22-evaluation-foundry-and-yaml-ld.md)
- [Full evaluation report](../../../docs/heritage-evaluation-report.md)

## Publication Boundary

Official source status, mechanical normalization and successful interface
testing do not turn this evaluation into an assured heritage register.
Historic England remains authoritative for designation and Heritage at Risk
information. The public pass binds only the recorded commit, Pages run,
candidate digests and observation time; mutable Pages and external source URLs
can subsequently change. Any synthetic record or relationship is visibly
invented and isolated.
