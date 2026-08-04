---
"@context": https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/context.jsonld
"@id": https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/synthetic/methodology.html
type: Methodology
title: Synthetic Heritage Capability Supplement methodology
description: Scope, acquisition, normalization, link and completeness rules for the exemplar.
resource: https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/synthetic/data/source-provenance.json
generated:
  by: process:heritage-evaluation-builder
  at: "2026-08-03T10:29:12Z"
assertion_status: normalized
assertion_scope: synthetic-fixture
---

# Synthetic Heritage Capability Supplement methodology

## Synthetic scope

This corpus is a hand-authored interface fixture. It does not query Historic
England, assert a designation, name a real person, or describe a real proposal.
Its invented place, person and future event demonstrate typed nodes, qualified
uncertainty and proposed-event relationships that are sparse or absent in the
faithful source.

## Isolation

The descriptor declares `assertion_scope: synthetic-fixture` and sets
`default_loaded`, `include_in_counts` and `include_in_search` to `false`.
Its namespace, routes, search index and plane digests are separate from the
faithful corpus.

## Rights and link validation

The invented fixture is dedicated under CC0. Its links resolve only to its own
published warning and documentation; it never constructs fictitious Historic
England List-entry URLs.

## Relationship projection rules

Relationships use the record IRIs registered by the YAML-LD semantic layer.
Official annual HAR-to-NHLE links come only from a source List entry field;
boundary links are deterministic projections of the recorded intersection.
Derivation and rule links return to this published explanation rather than to
an unserved identifier path. Annual HAR rows retain year precision and never
invent a day or month.

## Frozen source

**Snapshot:** `heritage-warwickshire-synthetic-capability-v1`

**Observed:** `2026-08-02T00:00:00Z`
