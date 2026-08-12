# Explore OKF profile v1

Explore OKF is a governed, pre-candidate learning publication. It lets an
author share a bounded semantic model early enough to review citizen
readability, useful links and model gaps without presenting the result as an
authoritative service or released data product.

This additive profile defines two independent machine contracts:

- the [endpoint label index](endpoint-label-index.schema.json), which gives
  every graph-reachable route a governed human label and type without
  full-record hydration; and
- the [exploratory publication block](exploratory-publication.schema.json),
  which binds a persistent warning, feedback route, limitations and promotion
  rule to an immutable snapshot and its applicable plane roots.

It does not change OKF 0.2 core or the frozen Bundle Wiki v1 profile. A bundle
which does not advertise either extension retains its existing behaviour.

## Compact endpoint labels

A large-corpus descriptor and its data manifest advertise the same
`endpoint_labels` resource:

```json
{
  "entrypoints": {
    "endpoint_labels": {
      "path": "data/labels/index.json",
      "bytes": 1234,
      "sha256": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    }
  },
  "entrypoint_integrity": {
    "endpoint_labels": {
      "path": "data/labels/index.json",
      "bytes": 1234,
      "sha256": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    }
  }
}
```

The data manifest repeats that exact resource binding as
`indexes.endpoint_labels`. Path, byte count and SHA-256 must agree. The index
uses schema `okf-explorer-endpoint-label-index.v1`; its `snapshot` must equal
the descriptor and data-manifest snapshot.

Producers can build and validate these documents with the isolated
`scripts.okf_explore` importable helper:

```python
from scripts.okf_explore import (
    build_endpoint_label_index,
    build_exploratory_publication,
    encode_endpoint_route_segment,
    metadata_endpoint_route,
    validate_endpoint_label_index,
    validate_exploratory_publication,
)
```

`build_endpoint_label_index` requires the explicit complete
`graph_reachable_routes` set as well as the relationship rows, label entries,
snapshot and generated time. The two validators return a list of errors;
builders raise `SemanticError` rather than emitting a partial contract. This
module deliberately does not alter the shared semantic module whose exact
bytes remain bound into earlier released producer evidence.

Route identity uses one cross-language algorithm: each route is
`lowercase-kind/canonical-segment`. Producers UTF-8 encode the source value,
then apply RFC 3986 percent encoding with only letters, digits, `-`, `.`, `_`
and `~` left unescaped. Hexadecimal escapes are uppercase. Thus `ArcGIS REST`
becomes `format/ArcGIS%20REST`, `Business & economy` becomes
`topic/Business%20%26%20economy`, a literal `%` becomes `%25`, `Caf\u00e9`
becomes `Caf%C3%A9`, and a slash inside a value becomes `%2F`. Use
`metadata_endpoint_route(kind, value)` rather than assembling routes by hand.
The producer gate also enforces the Explorer's 100,000-entry, 48 MiB retained
UTF-16 text and 64 MiB compact UTF-8 JSON ceilings. A producer must not publish
an index that validates structurally but cannot be retained by the browser.

Every graph-reachable route has exactly one entry containing:

- its safe local Explorer route;
- its required stable absolute semantic IRI;
- a concise preferred label and language;
- a human entity-type label; and
- label authority class and evidence source.

The index is a presentation projection, not a second source of semantic
identity. Duplicate routes, conflicting labels, unsupported authority classes,
unsafe patterns, count drift, snapshot drift or resource-integrity drift fail
closed. Producers must derive it from the same normalised graph as the
relationship runtime and pass the complete explicit `graph_reachable_routes`
denominator to the builder. That denominator includes metadata-projected
Explorer nodes such as datasets, resources, publishers, formats, topics, tags
and licences, not only source and target values already present in rich
relationship rows.

`opaque_identifier_patterns` contains bounded literal prefixes or exact
values; only one terminal `*` is permitted as a wildcard. It is not arbitrary
regular-expression input. A configured opaque label is displayed as the
accessible quality defect **Missing label**. Its raw route and IRI remain
available through inspection, but a hash-like machine key is never silently
promoted to an ordinary citizen-facing name.

See the [small valid index](examples/endpoint-label-index.json).

## Exploratory publication

A large-corpus descriptor may contain a root `exploratory_publication` object
conforming to `okf-exploratory-publication.v1`. Its `snapshot_id` must equal
the descriptor snapshot. Each named `applicable_plane_roots` digest must equal
the corresponding root-level `plane_roots` value. The established
`data_plane_manifest_root_sha256` field is also accepted as the exact binding
for the `data_plane_manifest` plane.

A conforming block records:

- publisher identity and whether its authority is independent research,
  official-source or unverified;
- the persistent banner label, complete warning and credential-free HTTP(S)
  feedback URL;
- an explicit indexing policy, normally `noindex`;
- limitations and permitted and prohibited claims; and
- the rule that owner review creates a fresh candidate rather than relabelling
  exploratory bytes.

Explorer keeps the banner visible while switching among Reader, Graph, Links,
Timeline, Type, Resources, Map and Narrative. The feedback URL receives the
exact bundle, view, query, filters, record/hash route and canonical review URL
so a report identifies what the reviewer saw. Valid `noindex` policy emits a
robots `noindex, nofollow` directive for the loaded view.

An unsupported or malformed block, mismatched snapshot or mismatched plane
root does not fall back to a reassuring ordinary view. Explorer displays an
explicit invalid-contract warning, suppresses the custom feedback link and
forces `noindex`. Absence of the optional block means only that this particular
extension was not declared; it is not evidence of release approval.

See the [small valid exploratory block](examples/exploratory-publication.json).

## Producer build gate

Before sharing an Explore OKF URL, a producer must:

1. freeze a bounded snapshot identity and applicable plane roots;
2. validate both documents against the published schemas;
3. reconcile label-index routes against the complete graph-reachable endpoint
   set and require 100 per cent label coverage;
4. bind the exact label-index bytes in both descriptor and data manifest;
5. load the exact descriptor in the actual Explorer and exercise every
   relevant view at ordinary and narrow viewports;
6. prove that opaque identifiers appear only in Inspect, the banner persists,
   copied routes restore state and feedback preserves that state; and
7. retain the reviewed exploratory bytes as evidence when a fresh iteration or
   release candidate is built.

The reusable authoring rationale is in the [OKF authoring methodology
review](../../../docs/okf-authoring-methodology-review-2026-08-12.md).
