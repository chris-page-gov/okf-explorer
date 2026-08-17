---
type: "Research"
title: "Current OKF bundle best practice"
description: "The current evidence-led authoring, semantic, retrieval, assurance and publication method for OKF bundle wikis."
tags: [okf, best-practice, authoring, assurance]
language: en-GB
generated: { by: "process:okf-evolution-review", at: "2026-08-17T00:00:00Z" }
status: stable
---

# Current OKF bundle best practice

## Start with the user and evidence

1. State the people, questions, decisions and explicit non-goals.
2. Inventory sources, licences, access conditions, freshness and gaps before
   designing fields.
3. Preserve source-native identity and immutable snapshots where permitted.
4. Write competency questions for every material relationship family.
5. Build a tiny representative fixture, then a bounded Explore OKF slice for
   owner and user feedback before freezing a release candidate.

## Keep layers separate

- Markdown is the human-reviewable source of truth.
- OKF 0.2 is the deliberately small exchange core.
- Bundle Wiki YAML-LD is a named additive semantic profile.
- Domain standards remain authoritative for domain execution and validation.
- Explorer JSON, shards, indexes, adjacency, legacy viewers and sites are
  deterministic projections and are never hand-edited.

Every graph-reachable entity has a stable machine IRI and a useful human label.
Every material directed assertion has a stable assertion ID, source and target,
absolute predicate, labels in both directions, authority, derivation, evidence,
time, rights, scope and review status. Confidence never upgrades authority.

## Build for progressive disclosure

Keep overview and index pages small. Split concepts at stable routes, publish
search metadata and explicit relationships, and use shards for large corpora.
Context packs have hard byte, row and retained-text ceilings. A user or agent
can always inspect the source identity, evidence and omitted material.

## Validate in dependency order

1. parse and schema-check every authored item and assertion;
2. check identities, aliases, routes, URLs, labels and relationship endpoints;
3. build semantic and Explorer projections deterministically;
4. compare generated artefacts with source and fail on drift;
5. run accessibility, browser journeys and adversarial retrieval cases;
6. freeze one candidate and promote the same bytes; and
7. verify the exact public URL in a real browser before calling it published.

Tests are selective by affected plane during development, then complete at
candidate freeze. A consumer sample is useful regression evidence but never a
substitute for producer validation.

## Reproducible environment in this repository

The project pins CPython 3.12.11 and dependencies in `uv.lock`. Contributors
run `uv sync --locked` and execute Python only as `uv run --locked python`.
The semantic contract in `okf.semantic.json` names authored inputs, generated
outputs and exact build/check commands. Profile mirrors use a vendor lock;
builders resolve only pinned local contexts. The Svelte application is built
into `_site/`, while GitHub source, Pages and Releases have distinct roles.

## Do not use OKF for

- live transactions, writes or workflow state;
- enforcing source-system permissions;
- arbitrary remote-code or tool execution;
- high-frequency telemetry or large numerical arrays;
- replacing SQL, GIS, graph databases, search engines or domain APIs;
- automatic legal, medical, financial or professional judgement; or
- claiming truth where source authority, observation time or uncertainty is
  absent.

Link those capabilities through an authorised tool or API and record their
contracts, provenance and results at the appropriate boundary.
