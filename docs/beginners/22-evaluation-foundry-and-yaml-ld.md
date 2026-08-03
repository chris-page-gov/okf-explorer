# Evaluation Foundry And YAML-LD

The Publication Foundry asks, “Is this bundle ready to publish as a governed
product?” The Evaluation Foundry asks an earlier and deliberately different
question:

> If we represent these sources faithfully, which OKF Explorer capabilities
> can they demonstrate, which questions can a person answer, and where are the
> source gaps?

This chapter explains the process through the
[Coventry and Warwickshire heritage exemplar](../../evaluation-foundry/fixtures/heritage-warwickshire/profile.md).
It also explains the exemplar’s proposed YAML-LD extension to OKF in plain
language.

## The Three Products Must Stay Separate

The exemplar publishes three bundles because they prove different things.

| Product | Purpose | Real-world claims? | Loaded by default? | Included in faithful counts? |
|---|---|---:|---:|---:|
| [Tiny assurance fixture](../../evaluation/heritage/tiny/index.md) | Prove the producer and real Explorer journey cheaply | Yes, copied from the frozen source | No | No |
| [Source-backed faithful corpus](../../evaluation/heritage/index.md) | Evaluate the complete, explicitly bounded source population | Yes, with visible normalization | Yes | Yes |
| [Synthetic supplement](../../evaluation/heritage/synthetic/index.md) | Demonstrate features the source cannot evidence | No; every item is invented | No | No |

This separation prevents an attractive demonstration from quietly becoming a
false statement about a real person, place or event.

## The Evaluation Process

The process is a derivative of the two-stage
[Foundry authoring workflow](19-foundry-authoring-and-domain-profiles.md). It
retains immutable acquisition, a tiny-fixture gate, real-consumer testing,
plane roots and byte-identical publication, but adds a feature-planning stage.

### E0 — Turn The Conversation Into Testable Outcomes

Write down the questions people want to answer before choosing fields. In this
exemplar they include:

- What protected heritage is near a named place?
- Which Grade I assets are in a selected authority?
- Which records appeared in Heritage at Risk, in what year and condition?
- Which periods, people and alternative names can be found?
- How did annual risk observations change?
- Which associations are source-declared, mechanically normalized or only
  illustrative?

Each question becomes a scored question, an Explorer journey or an explicit
gap. A polished screen is not evidence that the question can be answered.

### E1 — Profile Sources And Their Constraints

For every source record:

- who maintains it;
- the exact URL and access method;
- identifiers, dates, geometry and representation types;
- licence, attribution and automation limits;
- update or snapshot time;
- omissions and known incompleteness.

The exemplar uses Historic England open data and sanctioned annual workbooks,
with exact local-authority geometry from ONS. Historic England rich HTML pages
are linked as official representations, but their narrative is not copied in
bulk.

### E2 — Define “Everything” Before Counting

“Everything in Warwickshire” is ambiguous. It might mean a modern county, a
historic county, records whose address says Warwickshire, or geometries that
cross a boundary.

Here it means one unique current NHLE `ListEntry` whose source geometry
intersects Coventry or one of five Warwickshire district boundaries in the
pinned December 2025 boundary layer. A feature crossing two districts appears
once and retains both memberships. Duplicate NHLE display layers are excluded
by layer identity, not by guesswork.

Heritage at Risk is a separate annual population. Workbook year, sheet and row
are retained because an annual row is evidence about that snapshot, not a live
claim about today.

Its geographic scope is not determined by finding a familiar place name
anywhere in the row. A row qualifies only through an authoritative
local-government field: Local Planning Authority, Local Authority, Unitary
Authority, District/Borough, Council, or an explicit Warwickshire County
value. Locality, parish, town and city fields are not used as authority
evidence. This prevents, for example, a place called Warwick Bridge in Cumbria
from being mistaken for Warwick District.

The workbooks also supply a register **year**, not a publication day. A
normalized HAR observation therefore records `year`, `temporal_coverage` and
`date_precision: year`, while day-precision timestamp fields remain empty. The
Timeline can show the annual snapshot without inventing 1 January.

### E3 — Make Mapping Proposals Reversible

Every source-to-OKF mapping states:

- source field or source relationship;
- Explorer target field or semantic predicate;
- evidence and derivation;
- confidence;
- whether the source value can be recovered;
- which interface features it affects;
- limitations.

The controlling [mapping proposals](../../evaluation-foundry/fixtures/heritage-warwickshire/mapping-proposals.yaml)
are reviewable before the large build. An absent source value remains unknown;
the mapper does not invent one to improve a chart.

Two relationships that look similar in the Graph deliberately have different
evidence:

| Relationship | Evidence | What may be claimed |
|---|---|---|
| NHLE asset → geography | Historic England feature geometry intersected with the pinned ONS boundary | Exact spatial intersection for that snapshot and boundary vintage |
| HAR observation → geography | Exact authority field and value from the annual workbook | Reversible field normalization; **not** a spatial intersection |

Both can use the governed `containedInPlace` predicate for navigation, while
their assertion metadata lets the interface explain how each edge was made.

### E4 — Prove A Tiny Fixture First

The tiny fixture contains exactly three real records selected from the frozen
full snapshot: two NHLE assets and one 2025 Heritage at Risk observation. It is
a quick assurance sample, not the denominator or a miniature claim to
completeness. The full ONS boundaries are used when the records are acquired;
the fixture retains the same identities and canonical geometry digests but
omits the large boundary coordinate arrays. It is still large enough to
exercise:

- exact, alias and misspelling-tolerant search;
- facets over the three records;
- point and polygon geometry;
- an official rich page and machine-readable source resource;
- a relationship with evidence;
- a timeline bucket and data card.

Build it twice with the same timestamp and compare every byte. Then run the
real OKF Explorer against those bytes. Separate negative cases prove that
duplicate IDs, invalid URLs, unsafe paths, bad digests and synthetic leakage
fail closed.

### E5 — Build The Faithful Population

Only after E4 passes does the same mapping process build the full frozen
population. The large bundle uses lazy record chunks, sharded search, exact
facet postings, a route locator, relationship adjacency, bounded GeoJSON and
separate control, data, search, semantic and presentation roots.

The build report reconciles its output with the source denominator. A mismatch
is a failed build or a visible limitation, never a number to explain away.

Geometry is kept equally explicit. Retained NHLE features are requested from
ArcGIS with output spatial reference EPSG:4326 and are labelled EPSG:4326; the
producer does not pretend that these delivered coordinates are EPSG:27700 or
perform an undocumented reprojection. It converts the Esri geometry structure
to GeoJSON while preserving ring topology: holes stay with their containing
outer ring, and separate outer rings become a `MultiPolygon` rather than being
joined into a false single polygon. A bounding-box centre may be supplied as a
clearly labelled representative point for orientation, but it is never a
replacement for the source geometry.

### E6 — Add Synthetic Examples Only In A New Namespace

Some useful graph features may not occur in a permitted source. The exemplar’s
synthetic supplement therefore invents a place, a person and a future event.
It demonstrates an uncertain person attribution and a proposed intervention
without making either claim about a real asset.

Its descriptor has a different identity and base namespace and declares:

```yaml
assertion_scope: synthetic-fixture
default_loaded: false
include_in_counts: false
include_in_search: false
```

### E7 — Run The Conversation Through The Real Explorer

One canonical query-and-facet state must drive all eight Explorer presentation
planes: Reader, Graph, Links, Timeline, Type, Resources, Map and Narrative,
along with the selected-record card. The executable journey searches, applies
the Coventry local-authority facet, changes planes, applies a Map filter,
inspects a relationship and source resource, uses browser Back and Forward,
and reloads the copied URL.

The result count and active filters must remain coherent throughout. This is
stronger evidence than testing each view with a different hand-picked example.

### E8 — Validate Links, Rendering And Accessibility

Validation has several layers:

1. Corpus manifests independently prove that descriptors, chunks, search
   shards and semantic registries stay inside their publication root and match
   their declared digests.
2. The build-time URL contract checks every record and resource URL for a safe
   scheme and identifier binding, and resolves every internal resource
   reference. This is structural validation, not a live request to every
   external page.
3. Every in-scope Markdown document in the bounded public reading closure
   renders to an HTML Site page and its rewritten links still resolve. Files
   outside that closure are not covered by this claim.
4. The assembled Site audit checks the rewritten HTML routes and internal
   references in the reading closure.
5. Representative protected source pages are opened in a real browser.
6. The exact deployed Explorer, report, methodology, profile, tiny and
   synthetic URLs are checked by identity and content—not only HTTP status.
7. Controls are keyboard reachable, status changes are named, focus remains
   usable and reduced-motion preferences are respected.

The current generated contract can have zero failures while recording zero
live external receipts. That means every URL is well formed and bound to the
right record; it does not mean every external server responded. Live source
availability is sampled in the browser, and public success is claimed only
after the exact deployed candidate passes its terminal journey.

The repository keeps ordinary, browser-compatible Markdown as its source of
truth. It uses normal Markdown links rather than editor-specific wikilinks.
During publication, each in-scope `.md` reading page is rendered as an `.html`
page and internal links are rewritten and checked against those HTML routes.
Explorer deep links point to the published `index.html`, identify the bundle,
and carry an encoded record route in the fragment. A copied URL can therefore
reopen the same record in the interface instead of exposing a filesystem path
or relying on a Markdown renderer.

### E9 — Publish The Bytes That Passed

The release candidate records a digest root for each plane. GitHub Pages must
serve the same candidate that passed the checks. If a post-deploy check fails,
rerun only the affected dependency closure, create a new candidate and repeat
the affected gates. Do not rebuild silently and call it the same release.

## From YAML Front Matter To YAML-LD

### Ordinary YAML Front Matter

OKF Markdown already starts with human-readable YAML:

```yaml
---
type: Heritage Asset
title: Coventry Cathedral
resource: https://historicengland.org.uk/example
---
```

This is excellent for authors and enough for a reader that knows what OKF’s
field names mean. However, `type`, `resource` and a link to another record are
local labels until a shared semantic meaning and stable identity are declared.

### The Additive YAML-LD Proposal

The exemplar uses **YAML-LD** as a local name for this suggested extension. It
is not a W3C-defined YAML syntax or media type. The safe path is deliberately
simple:

1. accept only JSON-compatible YAML—string-keyed maps, lists and scalar
   values, UTF-8 text and finite numbers, with no executable tags, cycles or
   duplicate keys;
2. parse that YAML into the ordinary JSON data model; and
3. process the result as JSON-LD using pinned contexts.

JSON-LD keywords beginning with `@` are quoted because not every YAML parser
accepts them unquoted. The resulting front matter looks like this:

```yaml
---
"@context":
  - https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/context.jsonld
  - https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/semantic-context.jsonld
"@id": https://historicengland.org.uk/listing/the-list/list-entry/1342941
"@type": https://schema.org/LandmarksOrHistoricalBuildings
type: Heritage Asset
title: Cathedral Church of St Michael, Coventry
resource: https://historicengland.org.uk/listing/the-list/list-entry/1342941
route: asset/1342941
assertion_status: official
assertion_scope: real-world
"https://schema.org/containedInPlace":
  "@id": https://statistics.data.gov.uk/id/statistical-geography/E08000026
---
```

Existing OKF fields remain present. A legacy reader can use `type`, `title` and
`resource` exactly as before, while ignoring or preserving fields it does not
understand. A semantic reader additionally understands a globally stable
subject, a class and governed relationship predicates. In this example the
last property directly represents the asset-to-Coventry link; its separate
reified assertion carries the evidence and provenance for that link.

The example uses the official NHLE page as the asset identity because it is a
stable, identifier-bound source page. Some records, such as an annual workbook
row, have no equivalent public item page. For those records the exemplar uses
a canonical Explorer deep-link IRI: the published `index.html`, the exact
bundle URL and an encoded record route. The IRI is therefore dereferenceable
through the interface without inventing an official source identity. The
linked workbook resource remains the evidence.

## What YAML-LD Adds Beyond Existing OKF

The proposal adds capabilities; it does not replace Markdown or the permissive
OKF core.

| Existing OKF front matter provides | The YAML-LD extension additionally provides |
|---|---|
| Human-readable display fields | Globally scoped `@id` and `@type` meanings |
| Ordinary record and resource links | Integrity-bound IRI-to-Explorer-route lookup and durable deep links |
| Graph endpoints and labels | Governed predicate, inverse, domain and range definitions |
| Provenance fields on a record | Evidence, derivation, confidence and scope for each relationship |
| Searchable names | Separate preferred names, source aliases and bounded typo variants |

These additions let Search, Graph, Type, Links, Resources, Map, Timeline and
the selected-record card refer to the same entity and explain the same edge.
A consumer that understands only existing OKF fields can continue to render
the Markdown normally.

### Stable Identity Across Files And Views

`@id` says that a Markdown page, search result, graph node, map feature and
source resource concern the same thing. An integrity-bound IRI-to-route
registry tells the Explorer which safe internal route opens that IRI. For an
official NHLE IRI the Explorer can show both its internal route and the source
page; for an annual-row or synthetic IRI the identity itself can be the
canonical Explorer deep link. This avoids guessing routes from URLs.

### Type Plane With Published Meanings

`@type` can point to a published vocabulary term. The Type plane can group
records by a shared meaning while still showing the source-native category and
the ordinary OKF display type.

### Governed Predicates Instead Of Unlabelled Lines

A graph edge can state its predicate IRI, preferred label, inverse label,
domain, range, evidence rule and source vocabulary. The UI can therefore show
“located in” in one direction and “contains” in the other and can explain what
the line means.

### Evidence About A Relationship

RDF reification describes a statement. It does not, by itself, assert that the
statement is true. The exemplar therefore publishes both:

```text
asset ── containedInPlace ──> geography        direct triple
  └── assertion metadata: authority, evidence,
      derivation, date, rights and confidence  reified assertion
```

The validator requires exactly one direct triple and exactly one matching
reified assertion. This gives the Graph and data card useful trust information
without making the semantic dataset ambiguous.

### Search Variants Without Corrupting Names

Alternative names, abbreviations and deterministic spelling variants can be
declared separately from the preferred title. The search index can weight them
and explain a correction while the record card continues to display the
official source name.

### Machine-Checkable Context And Registries

The descriptor pins local copies and SHA-256 digests for its JSON-LD contexts,
IRI-route registry and predicate registry. A changed meaning or route therefore
changes the semantic plane root and invalidates the appropriate checks.

The exemplar publishes its
[YAML-LD graph](../../evaluation/heritage/okf-bundle.yamlld),
[semantic validation report](../../evaluation/heritage/data/semantic/validation-report.json),
[IRI-to-route registry](../../evaluation/heritage/data/semantic/iri-route-registry.json)
and [predicate registry](../../evaluation/heritage/data/semantic/predicate-registry.json)
for direct inspection.

### Better Links In The Interface

With an IRI route registry, a relationship target can become a safe internal
Explorer link when that entity is present. External source references remain
external links. The selected-record card can show both without confusing a
source page with an Explorer route. Reader, Graph, Links and Resources can all
open the registered target, while browser Back, Forward, reload and a copied
deep link preserve the selected record and bundle identity.

## Two Independent Labels: Status And Scope

One label cannot say both “who supports this?” and “is this about reality?”

| `assertion_status` | Meaning |
|---|---|
| `official` | Directly declared by the authoritative source |
| `normalized` | Reversible mechanical projection from source evidence |
| `inferred` | Rule-derived from supporting assertions |
| `model-derived` | Produced with model assistance and governed review metadata |

| `assertion_scope` | Meaning |
|---|---|
| `real-world` | Intended as a claim or projection about a real entity |
| `synthetic-fixture` | Invented solely to test a capability |

An official source field can be mechanically normalized. A model-derived
record can still concern a real entity. A perfectly complete synthetic fixture
is still not a real-world claim. Keeping the axes independent makes those
differences visible.

## What YAML-LD Does Not Provide

YAML-LD does not automatically provide:

- truth or legal authority;
- permission to copy source material;
- an ontology chosen without domain review;
- safe inference;
- completeness;
- an accessible interface;
- working links or successful publication.

Those still require sources, constraints, mappings, validators, consumer
journeys and human review.

## Inspect The Exemplar

- [Faithful corpus landing page](../../evaluation/heritage/index.md)
- [Tiny assurance landing page](../../evaluation/heritage/tiny/index.md)
- [Synthetic supplement landing page](../../evaluation/heritage/synthetic/index.md)
- [Human-readable evaluation profile](../../evaluation-foundry/fixtures/heritage-warwickshire/profile.md)
- [Machine-readable profile](../../evaluation-foundry/fixtures/heritage-warwickshire/evaluation-profile.yaml)
- [Mapping proposals](../../evaluation-foundry/fixtures/heritage-warwickshire/mapping-proposals.yaml)
- [Feature coverage](../../evaluation-foundry/fixtures/heritage-warwickshire/feature-coverage.json)
- [Executable journeys](../../evaluation-foundry/fixtures/heritage-warwickshire/journeys.json)
- [Evaluation report](../heritage-evaluation-report.md)
- [YAML-LD semantic context](../../profiles/bundle-wiki/v1/semantic-context.jsonld)

## Next

Return to [Foundry authoring and domain profiles](19-foundry-authoring-and-domain-profiles.md)
for the general publication process, or continue to
[governed enrichment and release assurance](20-governed-enrichment-and-release-assurance.md)
when a functionality evaluation is being promoted into a governed product.
