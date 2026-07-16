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

### Small-Bundle Content And Relationship Compatibility

The current Markdown generator writes relationships to the top-level `edges`
array. The Explorer accepts that generated form as well as the legacy
`relationships` name, including either name inside a corpus object. Authors
should emit one name rather than duplicate the same relationships under both.

Preserve the Markdown content of each record in `body`. Small-bundle search
indexes this text alongside the title, aliases, description, summary and tags,
and the detail card renders a safe Markdown subset. Raw HTML is displayed as
text rather than executed. Markdown links may be relative to the bundle URL;
only HTTP and HTTPS targets are made clickable.

Use `source`, `source_url`, `resource`, `resources`, `url`, `landing_page`,
`documentation_url` or `schema:url` for source and resource recovery links.
Do not place credentials in those URLs. The Explorer removes common credential
query parameters before presenting links, but redaction is a final display
safeguard rather than a way to distribute secrets.

Selected Schema.org and provenance fields are promoted into the detail card.
The complete normalized node remains available in the **Node JSON and
provenance** disclosure, so additional metadata can be inspected without
requiring every field to have a dedicated UI component.

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
- declared organisation aliases and standard abbreviations where known;
- licence and access fields, with explicit `not-specified` when missing;
- protocol/format/host fields when applicable;
- standards alignment fields for API/data bundles: `dcat_type`,
  `openapi_type`, export status and missing standard requirements;
- tags/topics for user discovery;
- timestamps or a clear "not recorded in source metadata" state.

For data published as a recurring series, also provide:

- a stable `series_id` when the source supplies one;
- `series` or `series_title` for the source-declared human label;
- `temporal_coverage` or `coverage_years` for the period represented by the
  data, kept separate from catalogue `metadata_created` and
  `metadata_modified` timestamps; and
- year-bearing resource names only when those names come from the source.

Explorer treats an explicit identifier as the strongest series link. A
source-declared series label is accepted within the same publisher. Similar
titles alone are not enough to claim that two records belong to one series.
Legacy CKAN records can retain source series metadata under `extras.series`.

Catalogue dates must remain distinct from dataset currency. Map CKAN
`metadata_created` and `metadata_modified` as catalogue-record dates; do not
present them as the first publication or latest data release unless the source
explicitly says so.

## Explorer Features To Feed

| Explorer feature | Bundle fields that make it useful |
|------------------|-----------------------------------|
| Reader overview | counts, overview cards, notes, warnings, top entry points |
| Search | search shards with title, provider, notes, tags, host, protocol and route; optional entity identities and aliases |
| Facets | facet definitions, value counts, selected-value routes and facet help text |
| Graph | typed relationships, relationship counts, node types, groupable fields |
| Links | relationship kind, source, target, evidence type, confidence and counts |
| Timeline | machine-readable dates plus update-year/quarter/month buckets |
| Type view | record-type counts and representative records |
| Resources view | resources, endpoints, formats, hosts and documentation links |
| Map view | source-declared coverage, WGS84 coordinates/bounds, geography codes, CRS/vintage/derivation metadata and spatial resource links |
| Narrative view | pack summary, methodology, warnings and source limitations |
| Detail card | provenance, licence basis, access model, contract status, quality signals, source update date, temporal coverage and stable series identity |

## Source API Links

Use `source_api_url` for a machine-readable endpoint that returns the source
record behind the normalized OKF record. Explorer treats **View source data**
as the primary action and keeps **Open raw JSON ↗** as a new-tab fallback.

For the in-app Source Inspector to work well, the endpoint should:

- use `https` and return JSON with an appropriate media type;
- permit browser `GET` requests with CORS from a static Pages origin;
- require no secret embedded in the bundle URL;
- return a single record comfortably below the 10 MB display cap; and
- expose stable identifiers, publisher/provenance and update dates where the
  source has them.

Do not copy the source response wholesale into normalized OKF fields. Preserve
the source link, map governed fields into the bundle with explicit provenance,
and let the inspector show the unaltered remote response on demand. Explorer
renders response values as text and does not execute source HTML.

## Geospatial Metadata And Map Recovery

The Map canvas can classify legacy fields and resource formats, but builders
should make spatial claims explicit so Explorer does not have to rely on prose.
Prefer a `spatial` object on the record:

```yaml
spatial:
  geographies:
    - code: E12000007
      name: London
      level: region
      source: ONS
      vintage: "2025"
  bbox: [-0.5103, 51.2868, 0.3340, 51.6919]
  crs: EPSG:4326
  derivation: source-declared
```

Existing `area_served`, `areaServed`, `spatial_coverage`, `spatialCoverage`,
`geography`, `location` and `jurisdiction` fields remain useful. Resource URLs
and formats should identify ArcGIS REST, OGC API Features, WMS, WFS, WMTS, WCS,
GeoJSON, KML, GML, Shapefile or GeoPackage rather than using a generic `data`
label.

For UK geographies preserve stable GSS codes where available. Keep the source,
release/vintage, code family, exact/best-fit derivation, boundary variant and
CRS with the value. Use `EPSG:4326` for web-map coordinates and retain
`EPSG:27700` separately when British National Grid is the analysis CRS. Do not
turn a place name into an invented polygon: a pack without geometry can still
be filtered by area and displayed at a visibly representative centroid.

For very large packs, a future `okf-geospatial-index.v1` sidecar can provide
route-level spatial summaries before full-record hydration. Until that contract
is finalized, keep these fields additive and backward-compatible. See
[Geospatial Map exploration](geospatial-map-exploration.md) for the current
evidence and progressive-recovery rules.

## Operational Metadata From Canonical Sources

Discovery catalogues such as CKAN can be older than the publisher service they
link to. Enrich this at bundle-build time with `operational_metadata`; do not
make the static Explorer crawl arbitrary resource hosts in the browser.

Large corpora may keep this information in a small optional sidecar rather than
rewriting dataset chunks. Set `entrypoints.operational_metadata` on the
descriptor, or `indexes.operational_metadata` on the data manifest, to an
`okf-operational-metadata.v1` document keyed by stable dataset route:

```yaml
schema: okf-operational-metadata.v1
generated_at: 2026-07-13T00:00:00Z
records:
  dataset/overseas-companies-that-own-property-in-england-and-wales:
    update_frequency: Monthly
```

Explorer loads and merges the sidecar with the normalized dataset index. This
keeps enrichment independently refreshable without changing lexical search or
facet postings, while undeclared sidecars remain fully backward compatible.

```yaml
operational_metadata:
  authoritative_source:
    name: HM Land Registry
    url: https://www.gov.uk/government/organisations/land-registry
  canonical_source:
    label: Use land and property data
    url: https://use-land-property-data.service.gov.uk/datasets/ocod
    host: use-land-property-data.service.gov.uk
  update_frequency: Monthly
  latest_release:
    dynamic: true
    label: Check the canonical source for the current monthly release
  maintenance_status: Active
  distributions:
    - label: Complete monthly extract
      kind: full
    - label: Change-only monthly extract
      kind: delta
  api:
    available: true
    access: Account, licence agreement and API key required
    url: https://use-land-property-data.service.gov.uk/api-documentation
  technical_specification_url: https://use-land-property-data.service.gov.uk/datasets/ocod/tech-spec
  verified_at: 2026-07-13
  provenance:
    source_url: https://use-land-property-data.service.gov.uk/datasets/ocod
    observed_at: 2026-07-13
    method: deterministic publisher-page adapter
```

The generator may use the resource host as a discovery lead, but host identity
alone is not evidence that a page is canonical, current or authoritative.
Promote values only when a source-specific adapter records its evidence URL,
observation date and method. Keep update frequency aligned with DCAT
`dct:accrualPeriodicity` during export, and model full/delta/API access as
distributions rather than flattening them into the catalogue modified date.

## Optional Same-Origin Range Packs

Large publications that cannot place every virtual shard directly in a Pages
artifact may advertise `govuk-okf-github-release-pack-index.v1` through the
descriptor's optional `entrypoints.release_data_plane` reference. Registry
entries do not change: they still point to the stable `okf-explorer.json`, and
the descriptor selects the transport.

```json
{
  "entrypoints": {
    "data_manifest": "data/manifest.json",
    "search_manifest": "data/search/manifest.json",
    "relationship_adjacency": "data/adjacency/manifest.json",
    "release_data_plane": "release-data-plane.json"
  },
  "entrypoint_integrity": {
    "release_data_plane": {
      "path": "release-data-plane.json",
      "sha256": "<sha256-of-the-index-bytes>"
    }
  },
  "distribution": {
    "control_plane": "github-pages",
    "data_plane": "github-pages-same-origin-range-packs",
    "release_mirror": "immutable-github-release-assets",
    "browser_release_asset_fetch": false
  }
}
```

Entrypoints remain string paths for generic-client compatibility; integrity
metadata for the range index lives in the matching `entrypoint_integrity`
object. The v1 range index preserves every logical shard path. Each row binds that path
to a contiguous member in a same-origin `.pack.gz` file, with the member byte
range, packed and logical lengths, packed and logical SHA-256 digests, source
compression and transport compression. The Explorer validates the complete
index before use, then requires an exact HTTP 206 response and `Content-Range`,
rejects `Content-Encoding`, bounds both network and decompressed bytes, and
verifies both hashes before parsing JSON. Search workers independently validate
the same index. A range-packed search manifest must also bind its snapshot,
bounded partitioning contract and canonical shard-metadata hash; every search
shard row must bind the same snapshot and a valid SHA-256, and every advertised
search shard must occur in the pack index. Query token and result-chunk fan-out
remain bounded. Route-adjacency manifests must bind
the loaded bundle snapshot as well. Record chunks, search shards and FNV-1a
route-adjacency shards therefore keep their existing paths and route/deep-link
behavior.

All pack paths and logical references must be safe descriptor-relative paths.
Absolute paths, cross-origin references, traversal (including percent-encoded
traversal), query strings and fragments fail closed. Packs remain on the bundle
Pages origin; an immutable GitHub Release can mirror identical bytes for
preservation, but browser code does not fetch Release assets. Direct and gzip
static bundles without `release_data_plane` remain fully supported.

For example, HM Land Registry’s current
[Overseas companies dataset](https://use-land-property-data.service.gov.uk/datasets/ocod)
and [technical specification](https://use-land-property-data.service.gov.uk/datasets/ocod/tech-spec)
state the monthly release schedule, full/change-only delivery and API access;
the older CKAN record remains useful discovery provenance but is not the source
for current operational status.

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
data/search/entities.json
data/search/results-0.json
```

Keep chunks comfortably below the Explorer fetch cap. The Explorer loads chunks
in small batches and retries transient server errors, but a pack should still be
polite to static hosts.

## Acceptance Checklist

- The hosted Explorer opens the pack in overview-only mode quickly.
- Search finds known providers, their declared abbreviations, hosts, products
  and place names. Publish authoritative organisation aliases in the optional
  search-entity index instead of hard-coding corpus-specific names in Explorer.
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
