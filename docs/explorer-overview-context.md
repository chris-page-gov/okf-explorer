# OKF Explorer Overview Context

## Status

Design specification. This document captures the expected behaviour for the
definitive OKF Explorer and the generated data needed to support it.

## Problem

The Explorer must work for both small Markdown OKF bundles and very large
static corpora such as the GOV.UK CKAN bundle. Large corpora cannot hydrate all
datasets, resources, and relationships before rendering a first useful screen.

The current large-corpus path loads a lightweight `data/overview.json`, but that
overview is mostly counts, top facet previews, and a small record sample. This
means the first Reader, Graph, Links, Timeline, Type, and Resources views do not
share a meaningful context:

- Reader shows a broad dataset/resource sample.
- Graph renders a sampled raw graph rather than a bundle-level graph overview.
- Links can fall back to the global relationship universe.
- Timeline lists records rather than explaining temporal distribution.
- Type exposes raw facets without ranking, hierarchy, or display strategy.
- Resources shows stacks without a higher-level resource landscape.

The Explorer therefore needs a generated overview context that every display can
render before full-record hydration.

## Principle

The first context for every bundle is `overview`.

The `overview` context is not a search result and not an arbitrary sample. It is
a generated summary of the shape of the bundle. It should set expectations for
what the bundle contains and offer useful routes into narrower contexts.

All view tabs render the active context:

- `Reader` renders a readable corpus overview and representative entry points.
- `Graph` renders an aggregate graph overview before showing raw nodes.
- `Links` renders relationship-type and path summaries before loading all links.
- `Timeline` renders a time distribution before listing records.
- `Type` renders analysed dimensions and facets, ordered by usefulness.
- `Resources` renders resource distributions and stack summaries.
- `Narrative` renders a curated or generated explanation of the active context.

Changing search, a facet, a hierarchy node, or a graph overview node changes the
active context. The same reduced context must then apply consistently to every
view.

## Left Panel

The left panel is a global context reducer. It is not merely a local filter for
the currently visible tab.

For the GOV.UK CKAN large corpus, the current left-panel inputs represent:

- `search`: static search over generated search artifacts.
- `publisher`: CKAN organization slug.
- `topic`: generated controlled topic.
- `format`: resource format values.
- `tag`: CKAN tags.
- `license`: normalized licence values.
- `host`: hostnames extracted from landing and resource URLs.
- `resource_type`: normalized resource kind such as `file`, `api`,
  `documentation`, or `unknown`.
- `update_year`: derived temporal grouping.
- `govuk_linked`: whether GOV.UK content enrichment is present.
- `publisher_family`: generated publisher grouping.
- `publisher_state`: CKAN organization state.

These dimensions should not be rendered as equal raw lists. The builder should
analyse each dimension and recommend an appropriate control:

- `hierarchy`: section trees, publisher family to publisher, topic cluster to
  tag, format family to format, year to month.
- `searchable-select`: high-cardinality dimensions such as publisher, tag, and
  host.
- `chips`: low-cardinality dimensions with useful top values such as licence or
  resource type.
- `histogram` or `range`: numeric and date dimensions such as year, month, page
  number, or size.
- `value-input`: sparse identifier-like dimensions where listing values is not
  useful.
- `suppressed`: dimensions with poor narrowing value, such as a field where
  nearly every record has the same value.

## Generated Analysis Artifact

Large static corpora should expose an additive analysis artifact, for example:

```json
{
  "schema": "okf-explorer-analysis.v1",
  "generated_at": "2026-07-06T00:00:00Z",
  "source_bundle": "okf-explorer.json",
  "contexts": {
    "overview": {
      "label": "Overview",
      "description": "Bundle-level generated overview context",
      "record_count": 58461,
      "resource_count": 268241,
      "relationship_count": 1178122
    }
  },
  "views": {
    "reader": {},
    "graph": {},
    "links": {},
    "timeline": {},
    "type": {},
    "resources": {},
    "narrative": {}
  }
}
```

The expected path for large corpora is:

```text
data/analysis/overview.json
```

## Generated Concept Enrichment

Large-corpus builders should emit deterministic concept semantics before the
Explorer tries to render a graph:

- `concept_id`: stable logical OKF path for every generated concept. For CKAN
  datasets this should be publisher-scoped, for example
  `datasets/city-of-york-council/brownfield-land-register.md`.
- `publisher` concepts: one authority record per publisher under logical paths
  such as `publishers/city-of-york-council.md`.
- Canonical `license_id`: collapse source variants such as `not specified`,
  `not-specified`, and `notspecified`; map OGL variants such as `uk-ogl`,
  `OGL-UK-3.0`, and `ogl` to one controlled value.
- Licence provenance: preserve source-declared licences as highest confidence.
  If an official provider publishes clear site-wide terms for data/API content,
  builders may infer a licence for records with missing source metadata, but
  must record `license_basis`, `license_source_id`, `license_confidence`, and a
  warning counter for inferred records. For the UK Government APIs exemplar,
  missing ONS CKAN licences infer OGL v3.0 from ONS terms and remain lower
  confidence than source-declared licences. Ordnance Survey provider-native API
  records infer `ordnance-survey-licence-required` from OS licensing guidance,
  because the public OS API portal does not make every API product OGL.
- Canonical `format`: collapse source variants such as `CSV`, `.csv`, and
  `text/csv`; preserve source values separately so no evidence is lost.
- `topics`: generated controlled topics in addition to raw source tags.
- `quality`: deterministic metadata-quality metrics suitable for ranking and
  triage. Resource download success must be explicit: either checked with
  recorded evidence or marked not checked.
- `provenance`: source IDs, source URLs, harvest/generation timestamps,
  enrichment version, and transformation pipeline version.

Relationship output should prefer explicit verbs over generic links. Builders
should emit relationships such as `download resource`, `API endpoint`,
`documentation`, `licence`, `maintainer`, `spatial coverage`,
`temporal coverage`, `derived from`, and `supersedes` where metadata supports
them, while keeping compatibility relationships such as `published by` and
`has resource` when existing viewers depend on them.

The large-corpus descriptor should advertise it:

```json
{
  "entrypoints": {
    "data_manifest": "data/manifest.json",
    "overview_index": "data/overview.json",
    "analysis_overview": "data/analysis/overview.json",
    "search_manifest": "data/search/manifest.json"
  }
}
```

This artifact must stay small enough to load before full dataset, resource, or
relationship hydration.

## View Contexts

### Reader

The Reader overview should contain:

- corpus purpose and provenance;
- total counts;
- representative clusters;
- notable outliers;
- suggested starting points;
- warnings about missing, sparse, or skewed metadata.

### Graph

The Graph overview should contain aggregate nodes and weighted edges, not sampled
raw records.

Example node categories:

- publisher families;
- top publishers;
- topic clusters;
- resource format families;
- resource types;
- licence families;
- time bands;
- geography or jurisdiction where available.

Example edge categories:

- publisher family to publisher;
- publisher to topic cluster;
- dataset cluster to format family;
- dataset cluster to resource type;
- topic cluster to ontology concept;
- time band to publisher family.

Each aggregate node should include counts, sample routes, and a drill-down query
or context expression.

### Links

The Links overview should show relationship-type counts, top connected entity
groups, and representative paths. It should not load the full relationship
universe until a reduced context or selected node makes that necessary.

### Timeline

The Timeline overview should show the distribution of records over time. It
should support buckets such as year, month, decade, or custom date bands, with
counts and representative records for each bucket.

### Type And Facets

The Type view should become a facet and dimension analysis view. It should order
facets by usefulness rather than by hard-coded key order.

Facet analysis should include:

- `coverage`: proportion of records with a value;
- `cardinality`: number of distinct values;
- `top_share`: dominance of the most common value;
- `entropy`: distribution balance;
- `expected_reduction`: expected narrowing after selecting a value;
- `hierarchy_available`: whether the facet can be grouped;
- `semantic_quality`: whether the field has a clear user meaning;
- `routeable`: whether selecting values creates stable Explorer routes;
- `recommended_control`: display strategy;
- `recommendation`: `primary`, `secondary`, `advanced`, or `suppressed`.

### Resources

The Resources overview should describe the resource landscape:

- resource count distribution by dataset;
- high-resource datasets and stack summaries;
- format, host, resource type, and licence distributions;
- API versus file versus documentation split;
- outlier stacks;
- representative resource groups.

### Narrative

Narrative should be restored as a first-class view. It should provide a readable
explanation of the active context and link to the same graph, timeline, links,
and resource evidence used by the other views.

## Hierarchies

Generated hierarchy support is central to making the overview useful.

Candidate hierarchies include:

- corpus section to document;
- publisher family to publisher;
- topic cluster to tag;
- format family to format;
- licence family to licence;
- year to month to day;
- host domain to host;
- geography to place, where spatial metadata exists;
- ontology class to matched node or facet value.

Hierarchy definitions should include stable route expressions so selecting a
hierarchy node reduces all views consistently.

## Ontology Analysis

Ontology alignment is optional enrichment, not an OKF core requirement.

The builder may inspect local or configured ontology packs, such as schema.org
or SeeLinks data packs, and produce `ontology_candidates` in the analysis
artifact.

Each candidate should record:

- ontology id and version;
- matched classes and properties;
- matching method;
- confidence;
- field coverage;
- term coverage;
- relationship coverage;
- useful derived facets or hierarchies;
- limitations and false-positive risks.

For CKAN-like data, schema.org may contribute concepts such as `Dataset`,
`DataCatalog`, `DataDownload`, `Organization`, `CreativeWork`, `Place`,
`keywords`, `license`, `distribution`, `encodingFormat`,
`spatialCoverage`, and `temporalCoverage`.

The Explorer should show ontology fit only when it explains or improves
navigation. It should not display ontology labels as decoration.

## Capturing Analysis In OKF Bundles

There are two related needs:

1. keep the OKF bundle self-describing;
2. avoid putting large generated indexes into a monolithic bundle.

The recommended model is a hybrid extension model.

### Small Bundles

Small `okf-bundle.json` files can embed the generated overview analysis inline:

```json
{
  "schema": "okf-explorer-bundle.v0",
  "kind": "okf-bundle",
  "extensions": {
    "okf-explorer-analysis.v1": {
      "mode": "inline",
      "analysis": {
        "contexts": {},
        "views": {},
        "facet_analysis": [],
        "hierarchies": [],
        "ontology_candidates": []
      }
    }
  }
}
```

This keeps drag-and-drop or file-picker usage simple for small wikis.

### Large Bundles

Large descriptor-based corpora should reference generated analysis artifacts:

```json
{
  "schema": "okf-explorer-large-corpus.v1",
  "kind": "okf-large-corpus",
  "entrypoints": {
    "analysis_overview": "data/analysis/overview.json"
  },
  "extensions": {
    "okf-explorer-analysis.v1": {
      "mode": "external",
      "entrypoint": "analysis_overview"
    }
  }
}
```

This keeps startup small and lets browsers cache analysis, search, record, and
relationship artifacts independently.

### Node And Edge Annotations

Generated OKF nodes and edges can also carry analysis hints when they are small,
stable, and route-relevant:

```json
{
  "id": "document/themes/discovery-to-governance.md",
  "title": "The discovery-to-governance lifecycle",
  "x_okf_explorer": {
    "facet_values": {
      "section": ["document", "themes"],
      "topic_cluster": ["governance"]
    },
    "ontology_matches": [
      {
        "ontology": "schema.org",
        "class": "CreativeWork",
        "confidence": 0.72
      }
    ]
  }
}
```

Use `x_okf_explorer` for generated Explorer hints rather than changing the core
OKF node semantics. The same pattern can be used on edges for aggregate
relationship labels, relationship confidence, or evidence counts.

## Builder Responsibilities

The bundle builder should:

1. generate core OKF nodes and edges;
2. generate or reference `okf-explorer-analysis.v1`;
3. score and order facets;
4. identify useful hierarchies;
5. produce aggregate graph, timeline, link, and resource overview contexts;
6. optionally evaluate ontology candidates;
7. record provenance for generated classifications and suppress low-confidence
   enrichment by default.

The Explorer should:

1. load the descriptor, manifest, and overview analysis first;
2. render `overview` for every view without full hydration;
3. update one shared active context from left-panel selections and graph clicks;
4. hydrate full records, resources, or relationships only when the active
   context requires them;
5. keep all routes addressable with query and hash state.

## Open Decisions

- Whether the extension key should be `extensions.okf-explorer-analysis.v1`,
  `meta.explorer.analysis`, or both for compatibility.
- Whether `data/overview.json` should be replaced by
  `data/analysis/overview.json` or retained as the minimal startup summary.
- How much generated narrative should live in the analysis artifact versus the
  Markdown source corpus.
- Which ontology registries are bundled, configured, or discovered locally.
- How strict the facet-quality thresholds should be before a facet is hidden.
