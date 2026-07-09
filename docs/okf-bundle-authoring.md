# Create OKF Bundles That Use The Explorer Well

The Explorer rewards packs that make discovery dimensions explicit. A usable
OKF bundle is not only a list of records; it is a static knowledge product with
search, facets, routes, relationships, provenance, quality signals and a clear
overview.

## Choose The Bundle Shape

| Use this | When | Output |
|----------|------|--------|
| Small Markdown bundle | Tens or hundreds of concept pages | One `okf-bundle.json` |
| Large-corpus descriptor | Thousands of records, resources or relationships | `okf-explorer.json` plus chunked `data/` files |

Small bundles should start from Markdown and `scripts/build_okf_bundle.py`.
Large bundles should follow the UK Government APIs exemplar and emit a descriptor
plus lazy shards.

## Minimum Record Contract

See [okf-standards-crosswalk.md](okf-standards-crosswalk.md) for how each of
these fields lines up with DCAT-AP (`dcat:DataService`) and OpenAPI, so new
field names stay federatable with external API/data catalogues instead of
drifting into a repo-only vocabulary.

Every record should have:

- stable `id` and route-safe `route`;
- `title`, `description` or `notes`;
- `record_type` or `type`;
- source URL and source adapter/tier;
- `confidence` such as `observed`, `declared` or `assured`;
- provider/publisher where known;
- licence and access fields, with explicit `not-specified` when missing;
- protocol/format/host fields when applicable;
- standards alignment fields for API/data bundles: `dcat_type`,
  `openapi_type`, export status and missing standard requirements;
- tags/topics for user discovery;
- timestamps or a clear "not recorded in source metadata" state.

## Explorer Features To Feed

| Explorer feature | Bundle fields that make it useful |
|------------------|-----------------------------------|
| Reader overview | counts, overview cards, notes, warnings, top entry points |
| Search | search shards with title, provider, notes, tags, host, protocol and route |
| Facets | facet definitions, value counts, selected-value routes and facet help text |
| Graph | typed relationships, relationship counts, node types, groupable fields |
| Links | relationship kind, source, target, evidence type, confidence and counts |
| Timeline | machine-readable dates plus update-year/quarter/month buckets |
| Type view | record-type counts and representative records |
| Resources view | resources, endpoints, formats, hosts and documentation links |
| Narrative view | pack summary, methodology, warnings and source limitations |
| Detail card | provenance, licence basis, access model, contract status, quality signals |

## Facets To Prefer

For API/data packs, include these dimensions whenever possible:

- record type;
- source and source tier;
- provider/publisher and organisational family;
- domain/topic;
- protocol/format;
- endpoint host and documentation host;
- licence and licence basis;
- access model;
- contract status;
- lifecycle/update year;
- confidence and assurance status;
- quality band and relationship density.

High-cardinality facets should be searchable and paged. Do not rely on the top
20 values by count to make a known provider discoverable.

## Relationships

Emit relationships as first-class records or rows with:

- source route;
- target route;
- kind/label;
- evidence type;
- confidence;
- observed timestamp;
- match key or source basis where the relationship was inferred;
- count when a graph stack collapses repeated edges.

Relationship labels should be readable in a graph: `published by`, `licensed
as`, `has format`, `classified as`, `described by`, `has operation`, `provided
by`, `documented at`.

## Metadata Repair Rules

It is acceptable to infer or normalize metadata, but never hide the basis:

- Preserve source-declared values when available.
- Canonicalise obvious variants such as OGL licence spellings and CSV/PDF
  format spellings.
- Use provider-terms inheritance only when the provider's public terms are
  explicit and the generated record carries `license_basis`,
  `license_source_id`, `license_confidence` and explanatory notes.
- Treat missing dates, licences, contracts or access models as source metadata
  gaps, not as proof of absence.
- Redact credential-like query parameters before persisting URLs and count the
  redactions in warnings.

## Standards Alignment For API Bundles

API-related bundles should use [okf-standards-crosswalk.md](okf-standards-crosswalk.md)
as the naming authority for DCAT/DCAT-AP and OpenAPI terms. Prefer standards
names where they are exact, such as `dcat:DataService`, `dcat:Dataset`,
`dcat:endpointURL`, `dcterms:license`, `OpenAPI Object`, `Operation Object` and
`components.securitySchemes`. Keep OKF-native fields where the standards do not
fit cleanly, such as `confidence`, `licence_basis`, `source_adapter` and
`relationship_density`, and explain the standards gap.

Each API/data record should expose enough metadata for a future exporter to
decide whether it can emit:

- a DCAT/DCAT-AP RDF `dcat:DataService` or `dcat:Dataset`;
- an OpenAPI service stub;
- an OpenAPI operation fragment;
- no artefact because required fields are missing.

Never claim DCAT-AP or OpenAPI conformance from an OKF record alone. Conformance
requires an emitted standards artefact and a validation step against that
standard.

## Quality Signals

Quality percentages in this repository are metadata-quality signals, not an API
assurance score. If your pack emits them, include metric explanations so the UI
can show info bubbles:

- discoverability;
- documentation;
- access clarity;
- contract signal;
- interoperability signal;
- lifecycle metadata;
- licence confidence.

## Large-Corpus Static Layout

Use this shape for static hosting:

```text
okf-explorer.json
data/manifest.json
data/overview.json
data/analysis/overview.json
data/apis-0.json
data/resources-0.json
data/relationships-0.json
data/search/manifest.json
data/search/results-0.json
```

Keep chunks comfortably below the Explorer fetch cap. The Explorer loads chunks
in small batches and retries transient server errors, but a pack should still be
polite to static hosts.

## Acceptance Checklist

- The hosted Explorer opens the pack in overview-only mode quickly.
- Search finds known providers, hosts, products and place names.
- Facets are searchable, paged and explain their terms.
- A record detail card exposes provenance, licence/access/contract metadata and
  quality-signal explanations.
- Graph view is readable for dense contexts because the pack emits grouping
  dimensions.
- Timeline is ordered and useful for latest/year/quarter/month browsing.
- Relationship rows carry evidence and confidence.
- No secrets, tokens, API keys, passwords or live credentials are stored.
- The pack has a 100-question evaluation suite or a documented smaller
  acceptance suite for its first release.
