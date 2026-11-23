---
type: "Research"
title: "OKF evolution review evidence method"
description: "Scope, evidence rules and reproduction instructions for the OKF evolution review."
tags: [okf, evidence, methodology]
language: en-GB
generated: { by: "process:okf-evolution-review", at: "2026-08-17T00:00:00Z" }
status: stable
---

# OKF evolution review

Status: review bundle, 17 August 2026.

This research area supports the review of the journey from LLM-Wiki through
Open Knowledge Format (OKF) 0.1 and 0.2 to the repository's additive YAML-LD
and Bundle Wiki profiles.

The reader-facing report, review bundle, interface and MCP prototype are
generated or documented from the evidence recorded here. Start with the
[review index](index.md). Discovery evidence does not by itself establish
conformance, completeness, publication or authorship.

## Evidence rules

- Prefer authored repository files, immutable Git commits, releases and
  published standards over retrospective recollection.
- Keep author time, commit time, publication time and later observation time
  distinct.
- Treat generated artefacts as projections unless their contract says they are
  authoritative inputs.
- Record failed, abandoned and unresolved work as well as successful work.
- Distinguish a real bundle from documentation, a viewer copy, a fixture or a
  repository that merely mentions OKF.
- Do not publish private conversation text. Use bounded summaries and stable
  task identifiers where conversation history materially explains a decision.

## Reproduction

Run the local repository scan from the repository root:

```sh
uv run --locked python scripts/build_okf_evolution_evidence.py
```

The result is written to
`research/okf-evolution-review/evidence/repository-scan.json`.
