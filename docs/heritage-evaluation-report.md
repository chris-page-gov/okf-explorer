---
"@context":
  - https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/context.jsonld
  - https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/semantic-context.jsonld
"@id": https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/docs/heritage-evaluation-report.html
"@type": https://schema.org/Report
type: Evaluation Report
title: Coventry and Warwickshire heritage functionality evaluation
description: A beginner-readable, evidence-bounded report on the Heritage Evaluation Foundry exemplar, its source coverage, Explorer capabilities and additive YAML-LD proposal.
assertion_status: normalized
assertion_scope: real-world
tags:
  - evaluation-foundry
  - historic-england
  - coventry
  - warwickshire
  - yaml-ld
---

# Coventry And Warwickshire Heritage Functionality Evaluation

## Report Purpose And Headline

This is an exemplar evaluation of what OKF Explorer can do with a complete,
explicitly bounded set of heritage sources. It is not a legal register, a
condition survey or a replacement for Historic England.

This report describes stable candidate content and the gates required to
promote it. It deliberately does not carry a current deployment status,
workflow run identifier or observation timestamp. Those time-sensitive facts
belong in an independently signed promotion envelope, so observing a candidate
does not change the candidate that was observed.

The source-defined NHLE denominator is **6,556 unique current List entries**:
every record in the supported, non-duplicate National Heritage List for
England layers whose source geometry intersects Coventry or one of the five
Warwickshire local-authority boundaries. The separate Heritage at Risk
population covers **1,084 time-specific observations** from sanctioned annual
workbooks for 2013 through 2025. That total comes from the frozen workbook
ledger because column names, identifiers and available fields change between
years.

The profile is designed to demonstrate Search and Facets across all eight
Explorer presentation planes: Reader, Graph, Links, Timeline, Type, Resources,
Map and Narrative. It also covers the selected-record data card, provenance,
durable URL state, accessibility and publication, and shows how an additive
YAML-LD extension can give existing OKF front matter stable identity and
governed graph meaning without breaking ordinary Markdown consumers.

The controlling artifacts are the
[human-readable profile](../evaluation-foundry/fixtures/heritage-warwickshire/profile.md),
[machine-readable profile](../evaluation-foundry/fixtures/heritage-warwickshire/evaluation-profile.yaml),
[mapping proposals](../evaluation-foundry/fixtures/heritage-warwickshire/mapping-proposals.yaml),
[feature-coverage contract](../evaluation-foundry/fixtures/heritage-warwickshire/feature-coverage.json),
[100 evaluation questions](../evaluation-foundry/fixtures/heritage-warwickshire/questions.json)
and [executable journeys](../evaluation-foundry/fixtures/heritage-warwickshire/journeys.json).
The [beginner chapter](beginners/22-evaluation-foundry-and-yaml-ld.md) explains
the process before this report applies it.

## Public Entry Points

These are the canonical targets exercised by the publication journey:

- [Open the external faithful corpus in OKF Explorer](https://chris-page-gov.github.io/okf-explorer/?bundle=https%3A%2F%2Fchris-page-gov.github.io%2Fokf-heritage-coventry-warwickshire%2Fokf-explorer.json)
- [Read this report as HTML](https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/docs/heritage-evaluation-report.html)
- [Open the faithful corpus landing page](https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/index.html)
- [Open the tiny assurance fixture](https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/tiny/index.html)
- [Open the isolated synthetic supplement](https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/synthetic/index.html)
- [Inspect the planned immutable release](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/releases/tag/heritage-coventry-warwickshire-20260804)

## What Was Evaluated

The Evaluation Foundry asks a narrower question than publication assurance:

> If these permitted sources are represented faithfully, which Explorer
> capabilities and user questions can they support, and where does the source
> evidence stop?

It produces three deliberately separate products.

| Product | What it proves | Real-world claims | Default | Effect on faithful totals |
|---|---|---:|---:|---:|
| [Tiny assurance fixture](https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/tiny/index.html) | The producer, validator and real Explorer can complete the critical path cheaply | Source-backed only | Not the main corpus | None |
| [Faithful corpus](https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/index.html) | The defined Historic England and ONS source population can support the evaluation | Yes, with visible normalization | Loaded for the exemplar | Included |
| [Synthetic supplement](https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/synthetic/index.html) | Sparse graph and event capabilities can be illustrated safely | No; every item is invented | Off | Excluded from counts and search |

An attractive demonstration is not allowed to fill a missing source field.
Unknown remains unknown. An association remembered from prior knowledge is a
question to test or a reason to follow an official link, not permission to add
an unsupported edge.

## Scope: What “Everything” Means

“Everything in Coventry and Warwickshire” can refer to historic counties,
postal addresses, ceremonial geography or modern administration. This
evaluation uses a reproducible spatial definition instead:

1. Pin the full-resolution December 2025 ONS Local Authority District boundary
   layer.
2. Select Coventry (`E08000026`) and all five Warwickshire districts:
   North Warwickshire (`E07000218`), Nuneaton and Bedworth (`E07000219`),
   Rugby (`E07000220`), Stratford-on-Avon (`E07000221`) and Warwick
   (`E07000222`).
3. Query each supported NHLE source layer with its source geometry and the
   ArcGIS `intersects` spatial relation.
4. Retain every matching geography before deduplicating by the source
   `ListEntry` identifier. A feature crossing a boundary is one asset with two
   memberships, not two assets.
5. Record the boundary vintage, source-layer identity, request and observation
   time so the result can be repeated or challenged.

Annual HAR rows use a different, explicitly labelled rule because the annual
workbook—not the optional mapped layer—is their denominator. A row is retained
only when a Local Planning Authority, Local Authority, Unitary Authority,
District/Borough or County Council field names Coventry or the relevant
Warwickshire authority. An explicit Warwickshire county value can be retained
at county level without inventing a district. Locality, parish, town and city
fields are not authority evidence: in particular, “Warwick Bridge” in Cumbria
must not match Warwick District.
Applying that fail-closed rule removed 25 false-positive observations for two
Cumbria assets from the earlier candidate. Every retained HAR geography edge
records the exact workbook field and value and says plainly that it is a
reversible text normalization, not a spatial intersection.

The authoritative inputs are the Historic England
[NHLE FeatureServer](https://services-eu1.arcgis.com/ZOdPfBS3aqqDYPUQ/arcgis/rest/services/National_Heritage_List_for_England_NHLE_v02_VIEW/FeatureServer)
and the ONS
[December 2025 LAD boundary layer](https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Local_Authority_Districts_DEC_2025_Boundaries_UK_BFC/FeatureServer/0).
The boundary test uses geometry, not the presence of the word “Warwickshire”
in an address.

### NHLE Denominator

The pinned source query gives the following denominator. Layers 3, 4 and 5 are
alternate polygon-display layers for categories already represented by layers
0, 1 and 2, so they are excluded by identity rather than deduplicated after
accidental double ingestion.

| Supported source layer | Unique List entries |
|---|---:|
| Listed Buildings (layer 0) | 6,320 |
| Building Preservation Notices (layer 1) | 0 |
| Certificates of Immunity (layer 2) | 11 |
| Scheduled Monuments (layer 6) | 188 |
| Registered Parks and Gardens (layer 7) | 36 |
| Registered Battlefields (layer 8) | 1 |
| Protected Wreck Sites (layer 9) | 0 |
| World Heritage Sites (layer 10) | 0 |
| **Unique current NHLE denominator** | **6,556** |

Zero is a useful result. It lets the Explorer show a bounded empty state for a
World Heritage Site or protected-wreck question rather than implying that the
category was forgotten.

Completeness is relative to the pinned source response and boundary vintage.
A later Historic England edit or a later ONS boundary release can correctly
change the denominator.

### Geometry Fidelity And Coordinate Reference System

The acquisition uses the ONS boundary service in its declared British National
Grid reference system for the intersection request, but asks ArcGIS to deliver
every retained NHLE and mapped HAR feature with `outSR=4326`. The response
spatial reference is checked before the feature is accepted. The resulting
record geometry is therefore WGS 84 longitude/latitude (`EPSG:4326`), and the
producer performs no hidden coordinate transformation after delivery.

Esri polygons are encoded as rings rather than ready-made GeoJSON polygons.
The producer classifies exterior rings and holes by orientation and
containment, assigns each hole to its containing exterior, and emits a
`MultiPolygon` when one source feature has disjoint exterior parts. This
preserves the source topology instead of flattening several islands into one
invalid polygon. The current faithful corpus contains 6,331 `MultiPoint`, 510
`Polygon` and 77 `MultiPolygon` records; 722 annual observations have no
source geometry and remain explicitly unavailable.

A representative point is only a map-navigation aid. A supplied source point
takes precedence; otherwise a polygon can use a clearly labelled bounding-box
centre. Neither replaces the retained source geometry or proves that the point
lies on every part of a complex polygon.

## Heritage At Risk: Annual Evidence, Not A Timeless Label

The Heritage at Risk input is the Historic England page of
[annual Registers and maps](https://historicengland.org.uk/listing/heritage-at-risk/search-register/annual-heritage-at-risk-registers-and-maps/)
and its sanctioned workbooks for 2013–2025. The evaluation uses the annual
entries, additions and positive-removals sheets. It does not scrape the
interactive register.

Each retained row becomes a time-specific observation or event with:

- workbook year, source URL and file digest;
- source sheet, row number and original field values;
- event kind such as entry, addition or positive removal;
- available condition, vulnerability, trend, ownership, priority and
  methodology values;
- an exact link to an NHLE asset only when the row supplies a matching List
  entry number.

The workbooks drift over thirteen editions. A column can be renamed, added,
removed or left blank; a category can change terminology; an early row may
lack the modern identifier or geometry. The adapter therefore has a
year-aware alias table and retains the original header and row address. It
does not treat a missing value as “good”, “unchanged” or “not applicable”, and
it does not guess identifier joins from similar titles.

The workbook supplies a register **year**, not a publication day. The
normalized record therefore carries `register_year`, `year`,
`temporal_coverage` and `date_precision: year`; it deliberately leaves
day-precision catalogue timestamps empty. The Timeline can group the declared
year without displaying an invented “1 January” date.

The mapped HAR layer is useful for presentation but is not the completeness
denominator: spatial coverage, particularly for conservation areas, is not
complete enough to stand in for the annual workbooks. The report consequently
requires a per-year reconciliation from workbook input rows to included rows,
unmatched rows and exact identifier joins.

The frozen source-provenance ledger records this in-scope annual reconciliation:

| Workbook year | Entries | Additions | Positive removals | Total observations |
|---:|---:|---:|---:|---:|
| 2013 | 78 | 4 | 6 | 88 |
| 2014 | 76 | 9 | 10 | 95 |
| 2015 | 85 | 11 | 2 | 98 |
| 2016 | 78 | 4 | 9 | 91 |
| 2017 | 76 | 3 | 5 | 84 |
| 2018 | 81 | 7 | 2 | 90 |
| 2019 | 80 | 1 | 2 | 83 |
| 2020 | 79 | 1 | 1 | 81 |
| 2021 | 72 | 0 | 7 | 79 |
| 2022 | 72 | 1 | 1 | 74 |
| 2023 | 71 | 0 | 1 | 72 |
| 2024 | 70 | 2 | 3 | 75 |
| 2025 | 72 | 2 | 0 | 74 |
| **Total** | **990** | **45** | **49** | **1,084** |

These rows are observations from particular annual sheets, not 1,084 unique
sites and not a claim about current condition. The inspectable ledger is the
[source-provenance receipt](../evaluation/heritage/data/source-provenance.json).
Its `semantic_sheets[].scope_rows` values are explicitly labelled as the broad
acquisition prefilter: 1,109 rows. The structured `scope_reconciliation` then
records the 25 locality-only false positives removed by the authoritative
geography rule, leaving the 1,084 emitted observations above.

## Candidate Results Handoff

The table contains properties of the candidate itself. Deterministic execution,
deployment observations, live-link freshness and promotion decisions are
separate receipts; they do not become front matter or feature status inside the
candidate.

| Result | Value | Authoritative evidence |
|---|---:|---|
| Faithful records | **7,640** | [overview](../evaluation/heritage/data/overview.json) → `counts.records` |
| NHLE heritage assets emitted | **6,556** | overview → `counts.heritage_assets` |
| Annual HAR observations emitted, 2013–2025 | **1,084** | overview → `counts.risk_records` |
| Distinct source resources | **22,200** | overview → `counts.resources` |
| Qualified graph relationships | **9,566** | overview → `counts.relationships` |
| Search documents | **7,640** | [manifest](../evaluation/heritage/data/manifest.json) → `search.documents` |
| Search vocabulary | **22,040 tokens; 626,287 postings** | manifest and search-shard metadata |
| Typo tolerance | **At most one edit per corrected token** | manifest → `search.typo_tolerance.max_edit_distance` |
| Registered semantic IRIs | **7,646** | [semantic validation](../evaluation/heritage/data/semantic/validation-report.json) → `counts.registered_iris` |
| Governed predicates | **3** | semantic validation → `counts.predicates` |
| Semantic assertions | **9,566; valid with 0 errors** | semantic validation → `counts.assertions`, `valid`, `errors` |
| Identifier-bound official-link occurrences | **15,280** NHLE direct pages or HAR exact register searches across record-primary and resource representations | [link validation](../evaluation/heritage/data/link-validation.json) → `counts.identifier_bound_rich_links` (retained field name) |
| Relationship-panel links checked | **65,878** | link validation → `counts.relationship_ui_links` |
| Build-time link-contract failures | **0** | [link validation](../evaluation/heritage/data/link-validation.json) → `counts.failures` |

Source and transformation evidence is in the
[source-provenance receipt](../evaluation/heritage/data/source-provenance.json);
the [plane-root receipt](../evaluation/heritage/assurance/plane-roots.json)
binds the control, data, search, semantic and presentation planes separately.

The earlier
[Pages run 30813485357](https://github.com/chris-page-gov/okf-explorer/actions/runs/30813485357)
and
[`heritage-coventry-warwickshire-20260803` release](https://github.com/chris-page-gov/okf-explorer/releases/tag/heritage-coventry-warwickshire-20260803)
remain historical observations of the first implementation. They are not
current promotion metadata. The old release was mutable at the GitHub platform
level and used a lightweight tag, so it is not described as immutable. The new
external publication gate requires an annotated tag, GitHub immutable releases
and a separately signed envelope.

## Capability Findings

The [feature-coverage contract](../evaluation-foundry/fixtures/heritage-warwickshire/feature-coverage.json)
records the expected evidence. “Strong source support” means the source has
suitable fields; it is not a substitute for the release checks in the previous
table.

| Capability | What the faithful source can demonstrate | Important boundary |
|---|---|---|
| Search | Preferred names, source identifiers, geography names/codes, grades, categories, annual risk fields, aliases and explained one-edit corrections | A correction is a retrieval aid, not a renamed record or semantic assertion |
| Facets | Exact postings for category, grade, local authority, date, geometry, risk fields, source adapter and assertion labels | Not every field applies to every category or workbook year |
| Type | Source designation categories, heritage assets and annual observation/event records | Display type, source category and semantic type remain distinguishable |
| Resources | NHLE rich pages, HAR register searches bound to `q=ListEntry`, exact FeatureServer queries, annual workbooks and frozen GeoJSON | Linked rich narrative is not copied or relicensed; an annual HAR row does not invent Historic England's opaque live-register item ID |
| Graph | Exact NHLE boundary intersections, exact HAR-to-NHLE identifier joins, and reversible HAR authority-field normalizations with their source field and value | A HAR geography normalization is not described as a spatial intersection; no person, period or authorship edge is inferred from prior knowledge |
| Links | Internal entity routes, external official representations and evidence-bearing relationship targets | An internal route is allowed only through the integrity-bound IRI registry |
| Timeline | Designation/amendment dates and annual register years | Different designation categories have different statutory date meanings |
| Map | Source point, `MultiPoint`, `Polygon` and `MultiPolygon` geometry, every NHLE-intersected geography and a labelled representative point | A representative point is for orientation, not authoritative geometry; HAR workbook geography comes from authority fields rather than this spatial test |
| Narrative | The readable corpus explanation and selected source-backed record context | Linked rich-page narrative is not silently imported into the faithful corpus |
| Data card | Source identity, raw and normalized fields, geometry, quality notes, rights, links and provenance | Metadata presence is not a score of heritage importance or source truth |
| Provenance | Snapshot, request/layer or workbook/sheet/row, derivation, evidence, authority and assertion scope | Provenance makes a claim inspectable; it does not independently prove it |
| Durable state | One query and facet state across Reader, Graph, Links, Timeline, Type, Resources, Map and Narrative, plus Back/Forward/reload | Every plane must show the same reduction, not a separate hand-picked example |
| Accessibility | Named keyboard controls, perceivable statuses, usable focus and reduced-motion behavior | Automated checks complement, not replace, testing by assistive-technology users |
| Publication | Frozen input, deterministic output, plane roots, rendered Markdown and exact deployed journeys | A URL is not declared verified until its deployed identity and journey pass |

## The One-Hundred-Question Evaluation

The [question suite](../evaluation-foundry/fixtures/heritage-warwickshire/questions.json)
turns the original conversation into 100 reviewable questions. It scores
retrieval (35 points), display (25), accessibility (20) and plain,
evidence-aware publication quality (20). A score measures Explorer behavior;
it is not an assurance score for Historic England data.

### Questions The Source Should Answer Directly

- **Place and discovery (HQ001–HQ020):** find source records for Coventry,
  Warwick, Rugby, Nuneaton, Bedworth, Stratford-on-Avon and familiar named
  assets.
- **Designation and grade (HQ021–HQ035):** combine category, grade and exact
  boundary facets; distinguish Grade II from Grade II*; explain supported
  zero-result categories.
- **Annual risk evidence (HQ036–HQ055):** find what appeared in a particular
  workbook year, separate entries/additions/removals, show available condition
  fields and trace a result to its source row.
- **Source-backed graph questions (HQ071–HQ079):** distinguish exact NHLE
  boundary intersections, exact HAR-to-NHLE identifier joins and reversible
  HAR authority-field normalizations, then show the authority/evidence attached
  to each edge.
- **Search and identifiers (HQ081–HQ095):** recover declared alternatives and
  bounded misspellings, search List entry numbers and geography codes, and
  inspect publisher, geometry, licence and observation evidence.
- **Semantics and publication (HQ096–HQ100):** explain YAML-LD, distinguish
  assertion status from assertion scope, prove synthetic isolation and state
  the publication boundary.

### Questions That Need A Qualified Answer

Period and person questions (HQ056–HQ070) deliberately probe prior knowledge:
medieval Coventry, Roman Alcester, Shakespeare, Anne Hathaway, Lady Godiva,
Basil Spence, Capability Brown, George Eliot and Frank Whittle. The NHLE open
layers used here contain names, designation fields and geometry, not the full
rich-page narrative or a complete person/period authority file.

The correct responses are therefore one of:

1. return records where the searched words occur in a source title or declared
   alias;
2. link to the official rich page for fuller evidence;
3. show a bounded empty state; or
4. state that this source cannot support the relationship.

The Explorer must not turn “this building is in Coventry” plus “this person is
associated with Coventry” into a person-to-building edge. A future governed
source could add that evidence; the isolated synthetic supplement can show how
the interface would present it without claiming it is true.

Two representative identifier-bound NHLE rich pages are Historic England’s
[Cathedral Church of St Michael, Coventry](https://historicengland.org.uk/listing/the-list/list-entry/1342941)
and [Warwick Castle](https://historicengland.org.uk/listing/the-list/list-entry/1364805).
They are representations to inspect, not text ingested into the corpus.
For a HAR annual row, the safe live counterpart is instead Historic England's
[register search for its source List Entry Number](https://historicengland.org.uk/listing/heritage-at-risk/search-register/results?q=1184627).
The register's per-result item ID is opaque and is not derivable from the NHLE
number, so the producer must not fabricate a `/list-entry/{NHLE}` path.

## Search: Alternatives And Misspellings Without Corrupting Evidence

The index gives each record one official display title and a separate bounded
set of search aliases. Aliases can include:

- List entry number forms such as `1342941`, `NHLE 1342941` and
  `List Entry 1342941`;
- source category and grade forms such as `Grade I`, `Grade 1` and
  `Grade One`, or `Grade II*`, `Grade II star` and `Grade 2 star`;
- authority names and official geography names/codes;
- reversible punctuation and wording variants such as `St`/`Saint`,
  `and`/`&`, and `Stratford-on-Avon`/`Stratford upon Avon`;
- source-provided or reviewed familiar names where evidence exists.

Search ordering is deliberate: declared aliases and exact matches win before
prefix matches, and typo candidates are considered only after those stronger
matches. The static index uses deterministic, bounded one-edit
Damerau–Levenshtein correction, covering one insertion, deletion, substitution
or adjacent transposition. This is why queries such as `Coventtry Cathedral`,
`Warick Castle`, `Kennilworth Castle` and `Shakespear Birthplace` can be tested
without enabling unbounded fuzzy matching.

For a corrected query the interface shows which token changed and why the
result matched. It continues to display the source title. Candidate counts,
corrected query tokens and index shards are capped so a typo cannot turn into
an uncontrolled browser workload. Search variants improve recall; they do not
declare that two people, places or concepts are equivalent.

Reviewed discovery names have their own provenance. They do not replace the
statutory display title or identifier:

| NHLE record | Search-only discovery names | Relationship to the record | Evidence |
|---|---|---|---|
| [1342941](https://historicengland.org.uk/listing/the-list/list-entry/1342941) | New Coventry Cathedral; Modern Coventry Cathedral; Basil Spence Cathedral | `reviewed-descriptive-name` | Official NHLE entry describing the new cathedral |
| [1116402](https://historicengland.org.uk/listing/the-list/list-entry/1116402) | St Mary’s Guildhall; St Mary’s Guildhall, Coventry; Saint Mary’s Guildhall | `familiar-name` | [Historic England Archive item](https://historicengland.org.uk/images-books/photos/item/AA42/00537) |
| [1035500](https://historicengland.org.uk/listing/the-list/list-entry/1035500) | Collegiate Church of St Mary; Collegiate Church of St Mary, Warwick; Collegiate Church of Saint Mary; St Mary’s Church, Warwick | `familiar-name` | [Historic England grant visit](https://historicengland.org.uk/advice/grants/visit/collegiate-church-of-st-mary-old-square-cv34-4ra/) |
| [1000498](https://historicengland.org.uk/listing/the-list/list-entry/1000498) | Jephson Gardens | `component-name` | Official NHLE entry naming Jephson Gardens within Spa Gardens |

The last example is deliberately not treated as a statutory alternative title
for the whole Spa Gardens registration. Each evidence page is also retained as
a separately labelled resource, so a reviewer can inspect why the discovery
name was admitted.

## Beginner’s Guide: What YAML-LD Adds To OKF

OKF Markdown already combines a readable page with YAML front matter:

```yaml
---
type: Heritage Asset
title: Cathedral Church of St Michael, Coventry
resource: https://historicengland.org.uk/listing/the-list/list-entry/1342941
---
```

That is useful and remains valid. A person can read it and an existing OKF
consumer can display `type`, `title` and `resource`. The limitation is that a
field name such as `type`, and a line joining two local record keys, have only
the meaning their application happens to assign.

The suggested extension adds a semantic layer; it does not replace OKF or
Markdown. For a beginner, the practical difference is:

| Existing OKF front matter provides | Additive YAML-LD provides in addition |
|---|---|
| Human-readable metadata fields | A stable `@id` shared by the page, graph node, search result and interface route |
| A local value such as `type: Heritage Asset` | A governed `@type` IRI whose meaning can be reused by another tool |
| Application-specific links between record keys | Published predicate IRIs, inverse labels and domain/range rules |
| A visible relationship | The same direct relationship plus inspectable evidence, derivation, authority, rights and scope |
| A resource URL | An integrity-bound distinction between a safe internal route, frozen evidence and an external official page |
| A Markdown page an ordinary renderer can display | Machine-checkable semantic registries that also drive Graph, Type, Links, Map and the selected-record card |

This means a conventional OKF reader can continue to render the original
fields, while a semantic-aware reader can connect the same identified thing
across interface areas and explain why a graph edge exists. No reader has to
understand RDF merely to display the Markdown.

The exemplar uses **YAML-LD** as a local name for an additive extension; it is
not a W3C-defined YAML syntax or media type. YAML-LD is the canonical authoring
form. A safe YAML parser first accepts a JSON-compatible subset—string-keyed
maps, lists and scalar values, UTF-8 text and finite numbers, with no executable
tags, cycles or duplicate keys. That is converted to the JSON data model and
processed against pinned JSON-LD contexts. The normalized graph and its
semantic plane root define semantic identity. In this large generated corpus,
the builder first emits deterministic YAML, reparses those exact bytes through
the safe YAML 1.2 loader, and derives the semantic shards and JSON-LD from that
parsed document. The graph is normalized as URDNA2015 canonical N-Quads, so
comments, indentation, key order and scalar quoting do not alter its semantic
digest. A separate artifact root continues to bind exact bytes. JSON-LD is then
generated as an interchange materialization whenever that semantic plane
changes and again for a release; it is not a second hand-edited source. JSON-LD keywords
beginning with `@` are quoted because plain YAML does not accept them as
unquoted keys in every parser.

The ordinary fields stay in place, while semantic consumers can additionally
read `@context`, `@id`, `@type` and governed relationship assertions:

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

An older reader can ignore or preserve unknown extension fields and continue
to render `type`, `title` and `resource`. A semantic reader compiles the final
property into the direct statement “this asset is contained in Coventry”; the
separate reified assertion supplies its boundary-intersection evidence,
authority, derivation and rights.

### 1. Stable Identity

`@id` states that the Markdown page, search row, map feature, graph node and
source representation concern the same entity. It avoids identity based only
on a mutable title or a local file name.

### 2. Governed Types And Predicates

`@type` and predicate IRIs point to published meanings. A predicate registry
can give each relationship a preferred label, inverse label, domain, range,
source vocabulary and evidence rule. The Graph can therefore show “located
in” from asset to geography and “contains” in the other direction while the
data card explains the same edge.

### 3. An Integrity-Bound IRI-To-Route Registry

An IRI is a global identifier; an Explorer route is a local navigation target.
The extension publishes a registry that maps one to the other and binds it by
SHA-256 digest. The UI opens a safe internal route only when the entity is in
the registry. It does not guess a path by stripping text from an external URL.
External evidence remains an external link.

### 4. A Direct Assertion Plus Its Evidence Record

RDF reification describes a statement but does not itself make the underlying
statement true. The exemplar therefore emits both:

```text
asset ── containedInPlace ──> geography       direct assertion
  └── authority, evidence, derivation,
      date, rights, confidence and scope      reified assertion metadata
```

Validation requires one direct triple and one matching reified
`rdf:Statement`/`okf:RelationshipAssertion`. Legacy graph consumers still see
the direct edge; semantic consumers can inspect why it exists.

### 5. Authority And Reality Stay Separate

Two labels answer two different questions:

| Label | Values | Question answered |
|---|---|---|
| `assertion_status` | `official`, `normalized`, `inferred`, `model-derived` | How was this assertion produced and who supports it? |
| `assertion_scope` | `real-world`, `synthetic-fixture` | Is it intended to describe reality or only an invented test? |

An exact NHLE boundary membership is a normalized real-world assertion:
Historic England supplies the asset geometry, ONS supplies the boundary and
the evaluation performs the declared intersection. A HAR geography
relationship has a different, deliberately reversible basis: it records the
accepted local-government workbook field and original value, then applies the
published authority-name mapping. It is also normalized real-world evidence,
but it is not called a spatial intersection. A HAR-to-NHLE relationship is
made only when the workbook gives the exact List entry identifier. A
hand-authored fictional person edge can be carefully modelled but remains
`synthetic-fixture`.

### 6. Linked Interface Experiences

The semantic identity is useful across the interface, not only in an exported
graph:

- Search can open the registered record route while retaining the official
  source IRI.
- The Type plane can group a published semantic class without hiding
  source-native categories.
- Graph edge selection can show predicate meaning, inverse wording, authority,
  derivation, evidence and assertion scope.
- The map and timeline can project the same identified records as the current
  query and facets.
- Resources can distinguish an internal entity route, frozen machine-readable
  evidence, an NHLE rich page and an exact HAR register search.
- The selected-record card can show both human-readable fields and semantic
  identifiers without asking a beginner to read raw RDF.

### 7. Machine-Checkable Meaning

Local copies of the contexts, predicate registry and IRI-route registry are
pinned by digest. A change to a term or route changes the URDNA2015 normalized
graph digest and semantic plane root, then reruns only the checks that depend on
it. Formatting-only YAML-LD changes leave that semantic root stable while the
exact-byte artifact root changes. This separates semantic drift from editorial
diffs without hiding either one.

The generated [YAML-LD graph](https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/okf-bundle.yamlld),
[JSON-LD interchange](https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/okf-bundle.jsonld),
[semantic validation report](https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/data/semantic/validation-report.json),
[IRI-to-route registry](https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/data/semantic/iri-route-registry.json)
and [predicate registry](https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/data/semantic/predicate-registry.json)
make those claims inspectable rather than leaving the proposal only in prose.

YAML-LD does **not** make a claim true, choose the right ontology, grant rights
to copy a rich page, prove completeness or make an interface accessible.
Sources, mappings, validation, domain review and consumer testing still do
that work. The proposal is compatible with the
[JSON-LD 1.1 model](https://www.w3.org/TR/json-ld11/) and the explanation of
[RDF statements and reification](https://www.w3.org/TR/rdf12-concepts/), but it
is presented as a suggested extension beyond the current permissive OKF core.

## Rich Pages, Resources And Link Validation

The open-data record and the rich HTML page serve different purposes. The
FeatureServer supports systematic acquisition of identifiers, category,
grade, dates and geometry. The rich page is the official place for fuller
description and legal context. The evaluation links to it but does not bulk
copy it.

For every NHLE record the producer:

1. accepts only an HTTP(S) URL without embedded credentials;
2. permits the Historic England origin for the primary rich page;
3. requires the final `/list-entry/{number}` segment to match that record’s
   `ListEntry`;
4. constructs the canonical identifier-bound URL when a declared source link
   is absent or unsuitable;
5. records the exact machine-readable query and frozen evidence separately.

For every annual HAR record, the frozen workbook row remains the time-specific
authority. Where it supplies a numeric List Entry Number, the producer links
to the current official results endpoint with exactly `q={number}`. Historic
England's old `/search-register/list-entry/{NHLE}` pattern returns a 404 and
the current result's opaque item ID cannot be inferred safely. Deprecated
fixture URLs are therefore normalized to the exact search; credentials,
extra query parameters, fragments and lookalike origins fail closed.

Link assurance has five distinct gates:

| Gate | What it checks |
|---|---|
| Corpus manifest and digest integrity | Descriptor, chunk, shard, registry and context paths stay within their publication root and match their declared digests |
| Build-time URL contract | All 7,640 record links and 22,200 resource links have safe schemes and no credentials; 15,280 official-link occurrences across record-primary and resource representations bind either an NHLE direct-page identifier or an exact HAR `q=ListEntry` search; all 22,200 internal resource references resolve; and 65,878 relationship-panel link occurrences pass the same route/origin policy. Stable intents are sharded by `SHA-256(canonical URL)`, so one correction invalidates only its shard and dependants |
| Repository Markdown check | Relative links in the bounded public reading closure resolve and each in-scope Markdown document can be rendered; this is not a claim about every Markdown file in the repository |
| Assembled Site audit | Component manifests assemble only changed shell, docs, app or data closures, then verify every emitted file, rewritten HTML route, internal reference and the Pages size limit |
| Real-browser deployment journey | The reusable Explorer runtime loads the exact external descriptor; faithful, tiny and synthetic pages show their expected identities; protected-source observations are supplied as freshness receipts outside the candidate; and the release page is checked only after GitHub reports it immutable |

A live URL can change after the observation time. Cloudflare can also make a
generic unattended HTTP client a poor proxy for a user browser. Identifier
binding is therefore exhaustive, while external availability is refreshed on
its own schedule. Historic England pages that challenge fresh automated
contexts are opened in a genuine interactive browser. The resulting receipt
records requested and final URLs, HTTP status, title, bounded identity text and
observation time **outside the candidate**. Its digest can be included in a
signed promotion envelope. A challenge page, HTTP 403, unexpected redirect or
missing identity remains a failed **genuine-browser** observation.

The bulk channel deduplicates the generated occurrences into canonical URL
intents and refreshes them on a bounded hash-shard schedule. Terminal assurance
uses the publication manifest to read every rendered HTML page, extracts every
external anchor, then unions those URLs with the independently verified
faithful, tiny and synthetic link-intent manifests. The receipt binds the
publication-manifest digest, all three intent-manifest digests and roots, the
rendered-anchor root, the protected journey and the final canonical-URL root.
At promotion the checker reconstructs that same union from R1 bytes: an omitted
anchor, omitted fixture universe, extra receipt URL or changed source root fails
closed. In beginner terms, there is no hand-written list that can quietly fall
behind the Site; the list to check is derived from everything actually
published.

The present closure is below a reviewed 14,000-URL ceiling. Forty-eight bounded
workers, a six-second request timeout and at most two attempts per URL give a
nominal worst-case network budget below 59 minutes. A 75-minute outer timeout
leaves 105 minutes of the 180-minute job for genuine Chrome and the
three-engine journey. Crossing the URL ceiling or either timeout fails the
terminal gate and requires an explicit policy review; it cannot silently
publish partial evidence. Historic England returns HTTP 403 for
many identifier-bound official record and resource URLs even when their exact
host and identifier contracts have already passed. The versioned policy may
classify only that exact combination—host `historicengland.org.uk`, risk
`official-record` or `official-resource`, and status 403—as
`protected-origin`, with the named validation basis
`candidate-identifier-binding-plus-protected-origin-http-403`. This records an
origin-protection outcome, not live page availability or identity. A different
host, subdomain, risk, status, missing basis, or unexpected final host still
fails, as do unpublished Site resources returning 404. Representative rich
pages continue through the genuine-browser gate above. Because intents are
hash-sharded, an expired or changed URL refreshes its observation and affected
shard without rebuilding unrelated data, search, semantic or presentation
planes.
A successful link check does not expand the page’s licence or authorize copying
its text. The machine-readable data attribution remains subject to the source
terms and the
[Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/).

## Deterministic Assurance

The [tiny fixture](https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/tiny/index.html) is exactly three
source-backed records selected from the frozen full snapshot: two NHLE assets
and one 2025 HAR observation. It is a fast gate for the same producer, never
the denominator or main population. Boundary geometry was used during source
acquisition; the fixture retains record identities and canonical geometry
digests but omits the large local-authority boundary coordinate arrays. It
still exercises exact, alias and misspelled search, facets, point and polygon
asset geometry, rich and machine-readable resources, qualified relationships,
a timeline bucket and the selected-record card.

For a fixed snapshot and generation timestamp, assurance requires:

1. schema and source-contract validation before mapping;
2. two independent builds with byte-identical files;
3. unique record, resource, route and assertion identities;
4. every manifest path confined to its publication root;
5. content digests for chunks, search shards, contexts and registries;
6. separate roots for control, data, search, semantic and presentation planes,
   with a fail-closed impact plan selecting the affected closure;
7. exact denominator reconciliation;
8. negative fixtures that reject duplicate IDs, unsafe paths or URLs, bad
   digests, unmatched semantic assertions and synthetic leakage;
9. execution in the real Explorer, not only producer-unit tests.

The full journey starts with a familiar title, repeats with a formal name and
a one-edit misspelling, applies the Coventry local-authority facet, and carries
that same state through Reader, Graph, Links, Timeline, Type, Resources, Map
and Narrative. It applies a Map filter, selects an edge and map record, hydrates
a full record, opens an official link in a new tab, then proves Back, Forward
and reload preserve the intended state.

The publication journey separately checks the generated index, methodology,
profile, beginner chapter and this report as HTML pages. Before it starts, the
evaluator compares both the deployed descriptor SHA-256 and deployed plane-root
digest with the candidate receipt; a stable descriptor cannot disguise an
older executable closure. A failed deployed URL is reported as unverified. It
is not silently converted into a rebuild with the same release identity, and a
success is written to the signed envelope rather than back into the candidate.

## Synthetic Capability Supplement

The [synthetic supplement](https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/synthetic/index.html) contains
an invented place, person and proposed future event so the interface can show
typed people, uncertainty and proposed relationships that the faithful source
cannot establish. Its descriptor and front matter declare:

```yaml
assertion_scope: synthetic-fixture
default_loaded: false
include_in_counts: false
include_in_search: false
```

It has its own base namespace, routes, index, graph and plane roots. The
faithful descriptor does not import it. The isolation journey loads it only by
its explicit descriptor and checks the visible synthetic warning. A synthetic
example can demonstrate an interface possibility, but it cannot improve a
faithful coverage score or answer a real-world question.

## Honest Gaps And Limits

- **This is a snapshot.** Current designation and risk status must still be
  checked with Historic England.
- **The boundary is a chosen modern definition.** It does not claim to model
  the historic or ceremonial county of Warwickshire.
- **NHLE intersection is not containment.** A crossing feature retains every
  intersected geography; the UI wording must not imply that its whole geometry
  lies inside one district.
- **HAR geography has a different evidence rule.** It is a reversible mapping
  from an accepted authority field and value, not a geometric intersection;
  locality, parish, town and city text is not sufficient scope evidence.
- **Geometry delivery is WGS 84.** Accepted ArcGIS feature responses declare
  `EPSG:4326`; the producer normalizes Esri ring structure, including holes and
  disjoint `MultiPolygon` exteriors, but does not transform the coordinates.
- **Representative points are schematic.** Full source geometry remains the
  evidence for polygon shape and location.
- **NHLE open fields are not the whole List entry.** Detailed periods, people,
  descriptions and legal text may exist only on a linked rich page.
- **HAR is annual and schema-changing.** A missing field is unknown, an old
  observation is not automatically current, and a workbook year is not an
  invented day-precision publication date.
- **Exact identifier joins are intentionally conservative.** Unmatched HAR
  rows remain unmatched instead of being joined by title similarity.
- **Search tolerance is bounded.** It catches declared alternatives and a
  single edit; it is not a semantic search engine and may correctly leave a
  broader prior-knowledge query unanswered.
- **Provenance is not independent audit.** It shows who said what, when, and
  how a normalization was made.
- **Link availability and rights differ.** A working page can later move, and
  open machine-readable data terms do not automatically apply to all rich-page
  text or imagery.
- **Automated accessibility is incomplete.** Keyboard and programmatic checks
  require complementary review with assistive-technology users.
- **Evaluation is not certification.** Passing the profile demonstrates
  functionality over its stated inputs; it does not create a new assured
  heritage register.

## Promotion Decision Gate

A candidate is eligible for promotion only when all of these conditions are
met for its exact digests:

- the emitted NHLE asset count reconciles exactly to 6,556;
- the 2013–2025 HAR ledger reports every workbook/sheet input, in-scope output,
  unknown and unmatched identifier without hidden loss;
- every candidate-results value above is evidence-backed and every required
  observation receipt exists outside the candidate;
- the tiny, faithful and synthetic descriptors validate and remain isolated;
- all deterministic, schema, semantic, search, geospatial and component Site
  checks pass for the impact-plan closure;
- all 100 questions have a result, a bounded empty state or an explicit source
  gap rather than an invented answer;
- the real Explorer journey passes with one coherent query/facet state; and
- the exact external GitHub Pages HTML and bundle URLs pass real-browser
  identity, rendering and link checks;
- the annotated release tag resolves to the intended commit and GitHub reports
  the release immutable; and
- a signed promotion envelope binds the candidate, observations, deployment
  and release identity without modifying any candidate byte.

Only the signed envelope may state the resulting promotion status. This report
does not pre-announce that decision. Even a successful promotion does not turn
the evaluation into a legal register, condition survey or certification.
Historic England remains the authority for the
[National Heritage List for England](https://historicengland.org.uk/listing/the-list/)
and [Heritage at Risk](https://historicengland.org.uk/advice/heritage-at-risk/).
