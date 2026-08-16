# Create OKF Bundles That Use The Explorer Well

The Explorer rewards packs that make discovery dimensions explicit. A usable
OKF bundle is not only a list of records; it is a static knowledge product with
search, facets, routes, relationships, provenance, quality signals and a clear
overview.

If the collection's terminology, identity, authority, standards or rights have
not yet been decided, begin with the
[OKF Foundry prompt kit](okf-authoring-prompt-kit.md). Its read-only domain
warm-up produces a validated, checksummed profile; the separate build prompt
then applies the concrete authoring rules below without replaying the research
transcript.

## Choose The Bundle Shape

| Use this | When | Output |
|----------|------|--------|
| Small Markdown bundle | Tens or hundreds of concept pages | One `okf-bundle.json` |
| Large-corpus descriptor | Thousands of records, resources or relationships | `okf-explorer.json` plus chunked `data/` files |

Small bundles should start from Markdown and `scripts/build_okf_bundle.py`.
Large bundles should follow the UK Government APIs exemplar and emit a descriptor
plus lazy shards.

## Start With The OKF v0.2 Core

The portable layer is always the Markdown bundle. At the root, use:

```yaml
---
okf_version: "0.2"
---
```

Nested `index.md` files have no frontmatter. `log.md` uses newest-first
`## YYYY-MM-DD` headings. Every other concept needs only a non-empty `type` for
core conformance, but an Explorer-ready concept should normally add:

```yaml
---
type: Dataset
title: Example dataset
description: One sentence describing the governed concept.
resource: https://example.gov/datasets/example
tags: [example, public-data]
generated: { by: process:catalogue-build, at: 2026-07-25T09:00:00Z }
verified: { by: human:reviewer-id, at: 2026-07-25T10:00:00Z }
status: stable
stale_after: 2026-10-25
sources:
  - id: catalogue-record
    resource: https://example.gov/catalogue/example
    title: Authoritative catalogue record
    author: process:data-owner-catalogue
    last_modified: 2026-07-24
---
```

Use `<producer>/<version>`, `process:<id>` and `human:<id>` actor identifiers.
Do not write a subjective trust score: Explorer derives unverified,
machine-confirmed or human-reviewed from `verified`. Unknown fields and types
are retained, so domain semantics and the YAML-LD, federation, datapack, facet,
integrity and presentation extensions can remain alongside the core.

Explorer continues to consume v0.1 `timestamp` and body `# Citations` as
labelled fallbacks. New producers should emit `generated` and `sources`; when
both generations are present, v0.2 fields take precedence.

An `Attested Computation` declares `runtime`, typed `parameters`, a computation
file or inline `# Computation` fence, `executor.resource` plus receipt fields,
and deterministic `attester.resource`. Publishing that contract does not grant
execution authority. Explorer displays it but never runs bundle-supplied code
on load.

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
The complete normalised node remains available in the **Node JSON and
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
- structured `generated` metadata for concept authorship/change time, with
  source catalogue/release dates kept in their own fields;
- `sources` provenance and `verified`, `status` or `stale_after` when the
  producer can support those claims.

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
For those legacy records Explorer may group clearly release-labelled title
variants for presentation, but labels that inferred group as a display aid.
The inferred group does not create an RDF identity assertion and must not be
serialised back into the bundle as fact.

Catalogue dates must remain distinct from dataset currency. Map CKAN
`metadata_created` and `metadata_modified` as catalogue-record dates; do not
present them as the first publication or latest data release unless the source
explicitly says so.

When the source or a reviewed augmentation identifies substitutes, emit
structured `alternatives` rather than a prose comparison sentence:

```yaml
alternatives:
  - record_id: onsud-open-geography-dataset
    title: ONS UPRN Directory
    route: dataset/onsud-open-geography-dataset
    relationship_type: cross-source-alternative
    differences:
      - field: coverage
        selected: UPRN lookup
        alternative: UPRN directory
```

Use another release of the same `series_id` for temporal navigation, not as an
alternative. `relationship_type`, provenance and the recorded differences
must describe reviewed evidence; similarity alone is not enough to claim that
two datasets are substitutes.

## Explorer Features To Feed

| Explorer feature | Bundle fields that make it useful |
|------------------|-----------------------------------|
| Reader overview | counts, overview cards, notes, warnings, top entry points |
| Search | search shards with title, provider, notes, tags, host, protocol and route; optional entity identities and aliases |
| Facets | facet definitions, value counts, selected-value routes and facet help text |
| Graph | typed relationships, relationship counts, node types, groupable fields |
| Links | relationship kind, source, target, evidence type, confidence and counts |
| Timeline | temporal coverage/release periods, stable series identity and explicitly separate catalogue timestamps |
| Type view | record-type counts and representative records |
| Resources view | resources, endpoints, formats, hosts and documentation links |
| Map view | source-declared coverage, WGS84 coordinates/bounds, geography codes, CRS/vintage/derivation metadata and spatial resource links |
| Narrative view | pack summary, methodology, warnings and source limitations |
| Detail card | provenance, licence basis, access model, contract status, quality signals, source update date, temporal coverage and stable series identity |

## Encode Facet Hierarchies In YAML-LD

YAML-LD can carry governed hierarchy semantics. Use SKOS for ordinary facet
values such as topics, formats, years and geographies. Use `rdfs:subClassOf`
only when the values are genuinely classes, and use `rdfs:subPropertyOf` for
predicate hierarchies. Visual grouping or graph position is presentation
metadata, not an RDF hierarchy.

The canonical `okf-bundle.yamlld` or Markdown YAML-LD frontmatter should define
the concept scheme and concepts. For example:

```yaml
"@context":
  - https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/context.jsonld
"@graph":
  - "@id": https://example.gov/okf/concept-scheme/topic
    "@type": skos:ConceptScheme
    skos:prefLabel: Topic
  - "@id": https://example.gov/okf/topic/year
    "@type": skos:Concept
    skos:prefLabel: Year
    skos:inScheme:
      "@id": https://example.gov/okf/concept-scheme/topic
  - "@id": https://example.gov/okf/topic/year/2018
    "@type": skos:Concept
    skos:prefLabel: "2018"
    skos:broader:
      "@id": https://example.gov/okf/topic/year
```

Bundle builders should compile these semantic assertions into the Explorer's
bounded `analysis.hierarchies` projection:

```yaml
hierarchies:
  - id: topic
    label: Topic
    facet: topic
    levels: [family, value]
    values:
      - id: https://example.gov/okf/topic/year
        label: Year
        count: 4
        children:
          - id: "2018"
            label: "2018"
            count: 7
            route: facet/topic/2018
```

The SKOS graph is the semantic authority. `analysis.hierarchies` is a generated,
snapshot-bound navigation projection and must not introduce broader/narrower
claims absent from the source semantics. When a legacy bundle has no declared
hierarchy, the Explorer may group obvious years, formats and regions for a
diverse display preview; that fallback does not create RDF assertions.

## Source API Links

Use `source_api_url` for a machine-readable endpoint that returns the source
record behind the normalised OKF record. Explorer treats **View source data**
as the primary action and keeps **Open raw JSON ↗** as a new-tab fallback.

For the in-app Source Inspector to work well, the endpoint should:

- use `https` and return JSON with an appropriate media type;
- permit browser `GET` requests with CORS from a static Pages origin;
- require no secret embedded in the bundle URL;
- return a single record comfortably below the 10 MB display cap; and
- expose stable identifiers, publisher/provenance and update dates where the
  source has them.

Do not copy the source response wholesale into normalised OKF fields. Preserve
the source link, map governed fields into the bundle with explicit provenance,
and let the inspector show the unaltered remote response on demand. Explorer
renders response values as text and does not execute source HTML.

For XML, plain-text or link-only resources, declare typed `source_access`
instead of using the JSON-only `source_api_url` compatibility field. The
[large-record narrative and source-access contract](large-record-narrative-source-contract.md)
defines the bounded `link`, `json`, `xml` and `text` display modes. A typed
access declaration tells Explorer how to inspect a resource safely; it does
not, by itself, establish the resource's authority, freshness, provenance or
rights.

## Provider Datapacks For Snapshot And Reviewed-Live Context

Use an optional
[`okf-explorer-provider-datapack.v1`](provider-datapacks.md) when a governed
metadata snapshot links to an external provider service that can change
independently. The provider datapack keeps four claims separate:

- what the static bundle snapshot contains;
- which named upstream revision was reviewed and when;
- which bounded differences were actually observed; and
- which external action lets the reader check the provider at the time of use.

Advertise `provider_datapacks` from the descriptor entrypoints and bind that
entrypoint's bytes through `entrypoint_integrity`. A data-manifest index may
mirror the same path and digest for discovery, but it is not the trust root.
Bind the manifest and every referenced pack to the same top-level `snapshot` as
the bundle. Provider pack paths are bundle-relative, while rendered external
actions are HTTPS-only. Validate authored documents against the
[`provider-datapack-manifest.schema.json`](../profiles/bundle-wiki/v1/provider-datapack-manifest.schema.json)
and
[`provider-datapack.schema.json`](../profiles/bundle-wiki/v1/provider-datapack.schema.json)
profiles; Explorer then checks the cross-document bindings at load time.
Publish the descriptor's provider-manifest entrypoint together with a matching
`entrypoint_integrity` `{path, sha256}` object, and put the exact published
pack-byte digest in every manifest row. Snapshot equality prevents
cross-snapshot mixing; byte digests bind refreshed review evidence even when
the governed corpus snapshot remains unchanged.

The v1 comparison is deliberately non-exhaustive:

```json
{
  "comparison": {
    "status": "known-drift",
    "evidenceScope": "reviewed-record-examples",
    "exhaustive": false,
    "executionRequiresLiveValidation": true
  }
}
```

Use a selector over a stable normalised field such as `source_surface`.
Reviewed examples should bind to stable `record_id` values. Search result
documents should preserve the selector field, `record_id` and `native_id` so
Explorer can show the status and resolve a safe provider hand-off before full
record hydration. Resources inherit their parent record's provider status.
When a matching record appears in both reviewed arrays without a difference,
label it **Aligned in reviewed fields** without making an exhaustive
live-alignment claim. A matching record absent from the reviewed examples is
**Record alignment not reviewed**. Neither state inherits a provider-wide
known-difference summary. Builders must emit an exact `comparison.differences`
row and field/value transition whenever paired record rows differ in title,
`timeCoverage.end`, `metadataModified` or `dataModified`; Explorer rejects an
incomplete comparison rather than displaying a false aligned state.

Keep `sourceCommitAsOf` distinct from `lastChecked`: the former dates the named
upstream revision, while the latter dates the review. Neither makes the
reference a live-validation result.

Do not put snapshot/live claims in `okf-explorer-presentation.v1`, replace the
frozen resource URL with a live URL, call a reviewed revision "current", or
interpret a representative difference as a complete live comparison.

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

Explorer loads and merges the sidecar with the normalised dataset index. This
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
artefact may advertise `govuk-okf-github-release-pack-index.v1` through the
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
behaviour.

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

Presentation defaults belong in the optional
[`okf-explorer-presentation.v1` profile](facet-presentation-experiment.md), not
in the generated count rows. Give each authored facet a clear description,
value type, deliberate order and representative examples. Prefer a compact
distribution for a manageable categorical domain, value order for numbers and
dates, and search for identifier-like or high-cardinality domains.

Do not publish thousands of labels as a closed-facet preview. A facet with tens
of thousands of values needs a prefix-sharded vocabulary index so Explorer can
show examples and search without first downloading the complete value set.

## Relationships

Emit relationships as first-class records or rows with:

- source route;
- target route;
- kind/label;
- stable predicate IRI when a governed vocabulary defines the property;
- evidence type;
- confidence;
- assertion status such as `official`, `normalized`, `inferred` or
  `model-derived`;
- observed timestamp;
- match key or source basis where the relationship was inferred;
- an explicit strength metric and unit only when the domain defines one;
- count when a graph stack collapses repeated edges.

Relationship labels should be readable in a graph: `published by`, `licensed
as`, `has format`, `classified as`, `described by`, `has operation`, `provided
by`, `documented at`.

Stable identifiers are not display labels. Every graph-reachable source,
target, publisher, rights statement, activity, concept and other entity must
have a concise human label, language and label authority. For a large corpus,
emit those values in a compact, snapshot-bound and integrity-bound label index
so Graph, Links and Facets can name an endpoint without hydrating its full
record. A raw hash, route key or generated identifier is available through
Inspect, but must not become the ordinary visible fallback. Prefer a visible
`Missing label` quality defect to a plausible-looking internal identifier.

Do not maximise the raw number of relationships. Maximise **evidenced, useful
link coverage** against declared eligible-entity denominators. Every link set
must identify the competency question or task it serves, target namespace,
predicate or qualified mapping, authority, minimum evidence, eligible count,
linked-candidate and link-assertion counts, unresolved count, exclusions and
conflicts. Bind the denominator's exact canonical candidate-ID inventory and
digest to the frozen input snapshot, deterministic eligibility rule and
evidence; approved profiles cannot use unknown digests. Record exact candidate
IDs for all four outcomes and require their disjoint union to equal the
denominator. Each exclusion must identify the exact stable candidate IDs, named
rule and evidence; the validator reconciles the unique, disjoint IDs with the
excluded count and the denominator. Record stable assertion IDs and one
identity-bound dereference result for each; the validator derives the
candidate, assertion, attempt, success and failure counts. Approved v1
profiles fail closed on stale results. Duplicated delivery projections do not
increase semantic coverage.

That is a closed guarantee over the **author-declared** candidate inventory,
not proof that the eligibility rule found every real-world eligible entity.
The validator binds the rule, frozen snapshot, exact IDs, digest and evidence;
an owner or domain reviewer must separately judge and evidence the rule's
source-bound completeness before approval.

Keep mapping relation and predicate compatible. Each SKOS mapping uses its
corresponding SKOS predicate; `owl:sameAs` is limited to identity with
independently verified, digest-bound assertion evidence; and ordinary domain
relationships cannot use identity or SKOS mapping predicates. Require every
target IRI to belong to its governed HTTP namespace under URI-aware origin and
path/hash rules, rejecting encoded path delimiters rather than decoding them
into false namespace membership. Reject duplicate candidate-target assertions.
For an approved profile, every semantic ledger evidence reference is
approval-grade and digest-bound, and one receipt matches both the canonical
complete-result digest and its observation time. Dereference
outcome is derived from a machine-readable terminal kind and HTTP status.

Use SKOS mapping properties for concept mappings at the evidenced strength.
Reserve `owl:sameAs` for independently evidenced identity; matching labels,
URLs, hierarchy, proximity or model similarity never establish it. Prefer
stable official IRIs and reused governed vocabulary terms where applicable,
following [W3C Data on the Web Best Practices](https://www.w3.org/TR/dwbp/).

The Explorer groups a focus graph by predicate and direction, falling back to
the human label for older bundles. Keep confidence, relationship strength and
aggregate count separate: confidence estimates correctness, strength is a
domain-defined magnitude and count records multiplicity. Line width is used
only when the same declared count, strength, weight or evidence-count metric
covers every displayed edge and varies across them. See
[Ontology and semantic graph architecture](ontology-and-semantic-graph-architecture-2026-07-24.md)
for the proposed vocabulary, inference, validation and provenance layers.

The complete citizen-readability, link-coverage and exploratory-publication
method is in
[Review of the OKF authoring methodology](okf-authoring-methodology-review-2026-08-12.md).

## Exploratory Publication

An early semantic model may be shared as an **Explore OKF** snapshot after the
tiny fixture and before candidate freeze. It remains an incomplete research
view, not an authoritative service or released data product.

The profile and descriptor must carry `publication_state: exploratory`, an
immutable snapshot identity, limitations, applicable plane roots, an indexing
decision and a route-preserving feedback URL. Every Explorer view must show a
persistent **Exploratory** banner. A producer that publishes a companion human
page for the same snapshot must show the equivalent warning on that page;
Explorer cannot inject UI into an independently hosted producer page. Rights,
privacy, security, actual-consumer loading and basic link/label validation
still gate sharing.

An exploratory snapshot is review evidence. It may be superseded by another
snapshot, but it is never silently relabelled or promoted as a release
candidate. Explorer v0.7.0 implements the strict
[Explore OKF contract](../profiles/explore-okf/v1/index.md): it validates the
descriptor before showing the persistent banner, preserves the current route
and filters in the feedback URL, and forces malformed exploratory intent to an
explicit warning with `noindex`.

Large-corpus producers may publish the companion compact endpoint-label index
through matching `entrypoints.endpoint_labels` and `indexes.endpoint_labels`
references. Its snapshot and SHA-256 must match the descriptor and data-plane
manifest. Explorer uses reviewed labels from that index in route-based views,
shows **Missing label** for an opaque unlabelled endpoint and keeps the raw
route, IRI, type and label authority in Inspect.

## Metadata Repair Rules

It is acceptable to infer or normalise metadata, but never hide the basis:

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

### Govern every serialised term

A bundle can optionally advertise `terms` and `term_validation` entrypoints in
its large-corpus descriptor and data manifest. Use
`okf-explorer-governed-terms.v1` to record, for every emitted compact term:

- the compact identifier and expanded IRI;
- whether it is a class, property, specification object or Explorer UI term;
- the vocabulary namespace, prefix, version and primary specification;
- a paraphrased definition and the precise, bounded way the bundle applies it;
- separate recognition, meaning and bounded-application review status, method,
  reviewer/process and time; and
- artefact occurrence counts and sample JSON paths.

Use `okf-explorer-governed-term-validation.v1` to record the deterministic
checks for unique IDs, namespace expansion, authoritative provenance, declared
kind, bounded-application review and generated-artefact coverage. A conformant
report must have no unregistered terms, pending application reviews, unused
standards terms or failed checks.

This is a closed-world publication check. It catches misspelled, invented,
unregistered and structurally contradictory terms, but cannot by itself prove
that a reviewer understood the standard correctly. Record whether a live
vocabulary lookup or human review occurred and state the limitation. Explorer
shows those boundaries beside the terms and can use governed `ui-term`
definitions for its `(i)` help text.

The registry is an additive Explorer profile resource. The normative Markdown
concept layer remains the OKF v0.2 core, so a producer can be fully core
conformant without publishing the registry. Conversely, publishing a registry
does not excuse an incorrect semantic mapping.

Hydra and DCAT terms occupy different fields. `hydra:Operation` is a Hydra
class and must not be placed in `dcat_type`. Where an operation record needs
both projections, use `hydra_type: hydra:Operation`, an OpenAPI Operation
Object mapping, and a DCAT relationship to its parent `dcat:DataService`.
Likewise, do not use `hydra:expects` for a URI template or
`hydra:supportedOperation` directly on a service instance when Hydra's domain
conditions are not met; prefer an explicitly governed OKF property and record
the standards gap.

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
