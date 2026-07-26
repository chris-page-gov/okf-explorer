# Federated OKF bundles

OKF Explorer v0.5 adds an overview-first federation contract for independently
published OKF bundles. It is additive: it does not change OKF 0.2, the
small-bundle projection, or `okf-explorer-large-corpus.v1`.

The profile and schemas are published at
[`profiles/federation/v1/`](../profiles/federation/v1/).

## Loading boundary

Opening an `okf-explorer-federation.v1` URL fetches and validates one
control-plane descriptor. Explorer does not fetch a child descriptor, search
manifest or data shard.

The Reader searches child metadata across the federation, including title,
role, status, authority, coverage and discovery metadata. `Load child bundle`
is the explicit data-plane boundary. The selected child then uses the existing
small- or large-bundle loader and its static search.

At v0.5, record-level search remains inside the selected child. A federation
must not imply corpus-wide record search until it publishes a governed
federated search index; v1 deliberately has no field that could overstate that
capability.

## Generator-facing descriptor

```json
{
  "schema": "okf-explorer-federation.v1",
  "kind": "okf-federation",
  "okf_version": "0.2",
  "title": "UK Whole-Law OKF",
  "version": "0.3.0",
  "status": "candidate",
  "generated_at": "2026-07-25T12:00:00Z",
  "snapshot": "whole-law-2026-07-25",
  "profile": "https://chris-page-gov.github.io/okf-explorer/profile/federation/v1/",
  "publisher": "https://github.com/chris-page-gov",
  "license": "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
  "discovery": {
    "repository": "https://github.com/chris-page-gov/okf-uk-legislation",
    "documentation": "https://chris-page-gov.github.io/okf-uk-legislation/whole-law/",
    "raw_subpath": "bundle/whole-law",
    "release_archive": "https://github.com/chris-page-gov/okf-uk-legislation/releases",
    "semantic_descriptor": "https://chris-page-gov.github.io/okf-uk-legislation/whole-law/okf-bundle.yamlld",
    "routes": [
      {
        "kind": "published",
        "purpose": "descriptor",
        "priority": 10,
        "url": "https://chris-page-gov.github.io/okf-uk-legislation/whole-law/okf-explorer.json"
      },
      {
        "kind": "raw",
        "purpose": "descriptor",
        "priority": 20,
        "url": "https://raw.githubusercontent.com/chris-page-gov/okf-uk-legislation/main/bundle/whole-law/okf-explorer.json"
      }
    ]
  },
  "counts": {
    "children": 36,
    "available": 1,
    "partial": 0,
    "restricted": 3,
    "unavailable": 2,
    "planned": 30
  },
  "children": [
    {
      "id": "uk-legislation",
      "title": "UK Legislation",
      "role": "legislation",
      "status": "available",
      "descriptor": "https://chris-page-gov.github.io/okf-uk-legislation/okf-explorer.json",
      "authority": {
        "class": "official",
        "source": "https://www.legislation.gov.uk/"
      },
      "coverage": {
        "status": "available",
        "applicable": 365786,
        "represented": 365786,
        "percent": 100,
        "as_of": "2026-07-25"
      },
      "freshness": {
        "state": "current",
        "observed_at": "2026-07-25T11:00:00Z",
        "snapshot": "legislation-2026-07-25",
        "stale_after": "2026-08-01T00:00:00Z"
      },
      "discovery": {
        "repository": "https://github.com/chris-page-gov/okf-uk-legislation",
        "documentation": "https://chris-page-gov.github.io/okf-uk-legislation/",
        "raw_subpath": "bundle",
        "release_archive": "https://github.com/chris-page-gov/okf-uk-legislation/releases",
        "routes": [
          {
            "kind": "published",
            "purpose": "descriptor",
            "url": "https://chris-page-gov.github.io/okf-uk-legislation/okf-explorer.json"
          }
        ]
      }
    }
  ],
  "relationship_summary": {
    "scope": "federated-data-plane",
    "total": 853883,
    "by_predicate": {
      "subject": 365786,
      "type": 365786,
      "entity": 122311
    },
    "by_authority": {
      "official": 0,
      "derived": 731572,
      "model-assisted": 122311
    },
    "by_freshness": {
      "current": 853883,
      "stale": 0,
      "unknown": 0
    },
    "snapshot": "whole-law-2026-07-25"
  }
}
```

`counts.children` must equal the child array length. An `available` or
`partial` child must declare a descriptor or a route whose `purpose` is
`descriptor`. `restricted`, `unavailable` and `planned` children can publish
documentation-only routes, but Explorer will not invent a bundle or bypass
access controls.

An optional `source_families` array can describe researched source classes
that are wider than the currently implemented child set. Explorer presents
their authority class, coverage status, source count and minimum provenance in
a separate expandable inventory. `implemented_bundle` may link a source class
to an existing child publication; its absence is shown as “no child bundle
yet”. A source-family row never becomes a loadable child implicitly.

Large children should publish a complete compact facet index and v2 filter
postings. Opening a facet reads the facet index and never hydrates record
shards merely because the search worker is still starting. Explorer rejects
whole-index hydration above 50,000 advertised records; such bundles remain
usable through their overview, facet, static-search, relationship-summary and
targeted-record planes. Large bundles can declare an
`okf-record-locator-sharded.v1` manifest through
`entrypoints.record_locator` and `indexes.record_locator`; Explorer then loads
only the locator bucket and record shard needed for the selected route.
Corpus-wide relationship hydration is rejected above 100,000 advertised rows,
while hash-sharded route adjacency remains available.

External relationship planes can be added without inflating startup transfer.
`entrypoints.model_enrichment_v3` may point to a SHA-256-bound
`okf-provider-datapack.v1` projection of independently accepted topic, concept
and entity assertions. Its bounded gzip JSON chunks align one-for-one with the
record locator's `record_chunks`; each chunk declares its exact record count,
compressed byte count, media type and digest. Explorer loads only the selected
record's aligned accepted chunk and verifies its governed manifest, counts,
predicate vocabulary, evidence profiles, byte binding, digest and row count.
Title and notes evidence remains an ordered list, including `title-only`,
`notes-only` and `multi-field` support.

Before reporting governed v3 as ready, Explorer fetches the descriptor-declared
public accepted manifest, independent audit and reviewer receipt, verifies each
exact byte count and SHA-256 digest, and cross-checks their audit identity,
review decision, counts, material bindings and chunk inventory. A failed
accepted shard is not retained as a successful base-only route; the route stays
explicitly incomplete and can be retried.

Governed v3 is the sole active model-assisted plane when declared. Explorer
does not load, merge or count an accompanying historical v2 publication, and
does not substitute v2 if advertised v3 material is missing or invalid. A
legacy descriptor that has no v3 declaration may continue to use
`model_enrichment_v2` as a compatibility fallback. New
`model_enrichment_v2_historical` entrypoints are evidence only. Model-assisted
discovery metadata is presented separately from official legal effects and
never upgraded to an official classification. Unsafe paths, snapshot
mismatches, oversized or misaligned chunks, invalid evidence and unreconciled
counts fail closed while the official and deterministic graph remains usable.

An official-effects publication can also declare a bounded reviewed-live
comparison at
`extensions["okf-official-effects.v1"].reconciliation`. The resource must stay
inside the bundle publication. Explorer always presents four separate states:
`agreement`, `live-addition`, `superseded` and `inaccessible`; absent
categories are displayed as explicit zeroes rather than omitted. If an
advertised optional reconciliation cannot be loaded, the overview reports that
failure while leaving the frozen static graph usable.

## Discovery and fallback

Explorer tries the requested URL and then declared descriptor routes in
ascending priority order. It never turns repository, documentation or archive
links into speculative descriptor URLs. If all descriptors fail, the error
lists exactly what was attempted.

The registry can carry the same route list, allowing recovery before any
descriptor content is available. Every federation and child declares:

- canonical repository and documentation URLs;
- repository-relative `raw_subpath`;
- release/archive URL;
- typed alternate routes;
- semantic YAML-LD descriptor when present.

## Relationship assertions

Inline control-plane relationships use
`okf-relationship-assertion.v2`. The same fields can be carried by small- and
large-corpus relationship rows:

```json
{
  "schema": "okf-relationship-assertion.v2",
  "source": "uk-legislation",
  "target": "case-law",
  "predicate": "informs",
  "authority": {
    "class": "derived",
    "label": "Deterministic crosswalk",
    "source": "https://example.gov.uk/methodology"
  },
  "derivation": "deterministic",
  "confidence": 1,
  "observed_at": "2026-07-25T12:00:00Z",
  "stale_after": "2026-08-01T00:00:00Z",
  "freshness": "current",
  "evidence": [
    "https://example.gov.uk/evidence/reconciliation.json"
  ],
  "rights": "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/"
}
```

`official` is source-supplied authoritative evidence. `derived` is a declared
deterministic transformation. `model-assisted` is a candidate generated with
model help, not an official legal classification. `unclassified` stays
visible for compatibility; Explorer never upgrades it by inference.

Every predicate, authority and freshness summary must add exactly to `total`,
or the descriptor fails closed. Summary scope is explicit, so a large
data-plane total is not conflated with a small inline control-plane edge set.

## YAML-LD transport

The loader accepts JSON/JSON-LD and YAML-LD. JSON is recognized by content when
a host sends a generic media type. YAML is parsed only for a YAML extension or
YAML media type, using YAML 1.2, unique string keys, no merge keys, no aliases,
no custom tags and bounded input.

This makes `.yamlld` usable when GitHub Pages sends
`application/octet-stream`. It does not claim transport conformance: the
standards-correct media type remains `application/ld+yaml`, and bundles should
also publish JSON-LD and frozen release representations.

## Acceptance checks

A federation generator must prove:

1. child IDs are unique and `counts.children` is exact;
2. represented coverage never exceeds applicability;
3. inline edges reference declared children;
4. each relationship summary dimension sums to `total`;
5. loadable children have an explicit descriptor route;
6. URLs use HTTP(S) without embedded credentials;
7. `raw_subpath` is repository-relative and has no traversal;
8. unavailable/restricted/planned children are not represented as implemented;
9. the overview build and load do not fetch a child.
