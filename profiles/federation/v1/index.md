# OKF Explorer Federation Profile v1

`okf-explorer-federation.v1` is an additive Explorer control-plane contract.
It does not replace OKF 0.2, a child bundle descriptor, or a large-corpus data
manifest. A federation descriptor lists independently published children and
the evidence needed to decide whether to open them.

The normative JSON Schema is
[`descriptor.schema.json`](descriptor.schema.json). Inline relationship rows
use [`okf-relationship-assertion.v2`](relationship-assertion.schema.json).

## Loading contract

Explorer fetches and validates the federation descriptor first. It does not
fetch any child descriptor, search index or data shard during this overview
load. An `available` or `partial` child therefore has to declare a descriptor
or a route whose `purpose` is `descriptor`.

Fallbacks are explicit. Explorer tries the requested descriptor followed by
declared descriptor-purpose routes in ascending `priority` order. Repository,
documentation and archive URLs are displayed for recovery but are never
guessed or parsed as descriptors.

Every federation and child publishes:

- repository and documentation URLs;
- the repository-relative `raw_subpath`;
- a release/archive URL;
- typed alternate routes;
- authority, coverage and freshness state.

## Relationship authority

Relationship assertions distinguish:

- `official`: supplied by an authoritative source;
- `derived`: produced by a declared deterministic transformation;
- `model-assisted`: a candidate produced with model assistance;
- `unclassified`: retained for compatibility when authority is absent.

The relationship summary declares exact totals by predicate, authority and
freshness. Every dimension must sum to `total`; Explorer fails closed when it
does not. Summary scope is explicit because the data-plane total need not equal
the small set of federation-control-plane edges carried inline.

## YAML-LD transport

The loader accepts JSON, JSON-LD, and YAML-LD. JSON is content-sniffed when a
static host uses a generic media type. YAML is parsed only for a `.yamlld`,
`.yaml`, or `.yml` URL or an explicit YAML media type, using YAML 1.2 core
schema, unique keys, no merge keys, no aliases, and no executable/custom tags.
This supports GitHub Pages serving `.yamlld` as
`application/octet-stream` without representing that transport as correctly
typed `application/ld+yaml`.
