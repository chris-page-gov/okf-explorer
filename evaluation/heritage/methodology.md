---
"@context": https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/context.jsonld
"@id": https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/methodology.html
type: Methodology
title: Coventry and Warwickshire Heritage Evaluation methodology
description: Scope, acquisition, normalization, link and completeness rules for the exemplar.
resource: https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/data/source-provenance.json
generated:
  by: process:heritage-evaluation-builder
  at: "2026-08-03T10:29:12Z"
assertion_status: normalized
assertion_scope: real-world
---

# Coventry and Warwickshire Heritage Evaluation methodology

## Scope

Inclusion is an intersection with Coventry (`E08000026`) or one of the five
Warwickshire local-authority boundaries in the pinned ONS December 2025 BFC
layer. A record intersecting several boundaries is emitted once and retains
every intersection.

## Source layers

- The National Heritage List for England FeatureServer supplies identifiers,
  names, categories, grades, dates, National Grid references and geometry.
- Sanctioned annual Heritage at Risk spreadsheets supply annual entries,
  additions and positive removals. Missing historical columns remain unknown.
- Historic England's NHLE rich HTML pages and HAR register searches remain
  linked official resources; their narrative is not bulk-copied into this
  repository, and an opaque HAR item route is never inferred.

## Geometry

ArcGIS delivered retained source geometry in WGS 84 (`EPSG:4326`) because the
acquisition requested `outSR=4326`. The builder validates that declaration and
normalizes only the Esri geometry structure; it does not transform coordinates.
Source points remain explicit points. Polygon and multipoint records use a
clearly labelled bounding-box centre only for schematic orientation; source
geometry is retained in bounded GeoJSON shards.

## Link validation

Every NHLE rich page and HAR register search is bound to its source identifier
and allowed origin. Local Markdown-to-HTML links and fragments are checked by
the assembled-site audit. The publication gate additionally opens
representative source pages and every task-critical deployed route in a real
browser.

## Relationship projection rules

Relationships use the record IRIs registered by the YAML-LD semantic layer.
Official annual HAR-to-NHLE links come only from a source List entry field;
boundary links are deterministic projections of the recorded intersection.
Derivation and rule links return to this published explanation rather than to
an unserved identifier path. Annual HAR rows retain year precision and never
invent a day or month.

## Frozen source

**Snapshot:** `heritage-coventry-warwickshire-20260803-v2`

**Observed:** `2026-08-03T00:00:00Z`
