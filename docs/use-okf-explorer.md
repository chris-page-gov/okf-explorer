# Use Explorer

Current interaction guide, checked against the shared Explorer behaviour on
6 September 2026. Domain screenshots and dated design reports may show older
controls; this page is the maintained guide for both small and indexed bundles.

## Open a collection

Start from the [example catalogue](onboarding/examples.md), or open
[Explorer](../explore/) and paste an authorised bundle/descriptor URL into
**Bundle or descriptor URL**, then choose **Load**. The bare site root is the
learning hub. **File** loads a local generated JSON bundle; it does not upload
that file to a publishing service.

For a first local example, use the [fictional study club](onboarding/first-bundle.md).
For hosting, authoring and release gates, use the
[development guide](development.md) and [bundle authoring guide](okf-bundle-authoring.md).

## A short exploration

1. Search for a title or known alias. Read why it matched where available.
2. Click a facet value once to highlight its set; click it again to deselect.
3. Inspect a result's Overview and Evidence, including the source and date.
4. Use **Keep highlighted** only when you want to narrow the current scope.
5. Use **Undo keep** or **Reset view** to recover. Check URL contents before sharing.

Reader presents records. Graph and Links show explicit relationships. Timeline,
Type, Resources, Map and Narrative give other views of the available material;
the bundle's coverage and capabilities constrain what each can show.

## Inspect the evidence

Use the record's source links, observation dates, rights and assertion context.
A displayed date may be a catalogue date rather than the latest source update.
An incoming link uses an inverse label when available; inspect the relationship
to see its source, target and evidence. A graph connection is not proof of
identity, official endorsement or an inferred domain fact.

For AI use, follow [the access guide](ai-okf-usage.md). Copying an Explorer route
does not guarantee that your AI can retrieve the bundle or its linked content.

## Explore by highlighting and keeping sets

Both compact OKF bundles and indexed large corpora use the same facet controls.
A single value click highlights its matching records and brings them to the top
of the Reader. It does not remove other records. Clicking a selected value again removes it. Clicking an unselected value
replaces the selection in that facet. Hold **Command on macOS** or **Ctrl on
Windows/Linux**, or enable **Select multiple values**, to add or remove values.
Values in one facet combine with **or**; selections in different facets combine
with **and**. Opening another facet folds the previous one unless it is pinned.
Its selected values and distribution remain visible in the compact summary.

Double-click a value to **Keep highlighted**. **Keep unhighlighted** keeps the
complement of the complete selection. Both operations narrow the current search
scope and can be reversed with **Undo keep**. With a keyboard, Enter highlights
and Alt+Enter keeps. A zero-match highlight remains a valid selection; keeping
it produces an empty result with recovery controls. **Reset view** clears the
query, reductions, highlights, map restriction and presentation folds.

**Fold highlighted** and **Fold unhighlighted** hide those records in the Reader
without removing their membership from facet counts. The compact folded summary
shows the current highlighted split and can be unfolded. Fold membership is a
snapshot for the current loaded bundle and is reset when another bundle opens.
Its counts change with subsequent highlights and searches. Folding is available
only when complete membership can be retained within the 50,000-record local
limit. Counts from capped search candidates are labelled partial; unavailable
counts are not presented as zero. Search, highlights and keep history are in the
URL; presentation folds remain local to the open session.

For indexed corpora, highlighting and keep/remove predicates run before the
result display and document-loading limits. Those limits still apply to the
cards shown. A 200-card page therefore does not define the complement of a
329-record search. Query uncertainty and resource-loading limits remain visible.

Bundles without a static search worker use simple local text search over loaded
record fields. Every search word must match those fields; this is labelled in the
results. Map-constrained indexed counts describe only known matching records
when the indexed result window is incomplete. Folding is disabled until complete
membership is available, rather than saving records outside the visible scope.

Each newly opened bundle starts with every facet folded, including saved pinned
facets. Opening a pinned facet keeps it open during that bundle session. Title is
the default browsing sort; typed searches default to relevance. Explicit sorting
in a shared URL is preserved. Clicking a colour toggles that value and leaves the facet folded. Colour controls
have keyboard access, value names and counts; the expanded list provides larger
touch targets. Colours separate neighbouring values; the separate
black-on-white track shows highlighted membership. Labels, ticks and counts carry
the meaning without requiring colour perception. Unknown membership is shown as
unknown rather than an empty highlight track.

## Move between panels

Below 600 pixels, Explorer shows one independently scrollable panel at a time. Use the fixed **Search & facets**, **Results** and **Details**
footer buttons, or swipe horizontally across ordinary panel content. Graphs,
maps, form controls and selected text keep their own gestures. Selecting a
record opens Details; choosing a view returns to Results. Keyboard focus moves
with a record opened from a panel. Switching panels preserves scroll positions.

Between 600 and 1099 pixels, **Search & details** places the two side panels next
to each other. **Results** switches to the full-width results view. Selection
actions stay available in both modes. In the paired layout, **Actions** opens
the keep, undo and fold controls while the count stays visible. Footer icons and
labels share one compact line. View buttons, side-panel tabs and footer controls
use the same 36-pixel height. Detail headings use a smaller, consistent scale. The left panel uses **Facets** and **Results** tabs for both bundle sizes,
so the results list does not duplicate the centre while browsing facets.

On wider screens, collapse either side to a narrow rail with vertical context
text. Drag a splitter, or focus it and use the arrow keys, to resize a panel.
Home and End select its minimum and maximum widths. Facet pins keep selected
facets open. Small-bundle record details have Overview, Evidence and Data tabs;
**Pin section** keeps a section visible while switching tabs.

Reader cards and lists use the same selected record for detail, Copy route and
Pin. Inspecting a graph neighbour leaves the graph's explicit focus unchanged.
Pins retain the source bundle and complete route, so identical record IDs from
different bundles remain distinct. The saved-pin shelf supports removal,
copying JSON and downloading JSON. Older unqualified pins are left in their
original storage rather than assigned to an unknown bundle.

Copied Explorer URLs and exported pins include the source URL, search query,
selected facet values and record route. Check those details before sharing.
Pins are stored in this browser; they are not automatically sent to a service.

Record relationship summaries identify incoming or outgoing direction and show
the explicit source and target. Incoming links use an inverse label when one is
declared. **Inspect relationship** opens assertion evidence; the separate record
button opens the neighbouring record.

## Earlier guide sections

These headings retain existing links; each points to its maintained instructions.

## Try The Large CKAN Example

Open the CKAN entry in the [example catalogue](onboarding/examples.md#govuk-ckan).
Use its [personas and journeys](gov-ckan-personas-and-user-journeys.md) to choose a task.

## What You Should See In The CKAN Example

The [search manual](static-search-filtering-manual.md) explains indexed results,
limits and gaps, alongside dated CKAN screenshots. Use the interaction rules above.

## Use The Map Canvas

Follow the [Map manual](geospatial-map-manual.md) for coordinates, geometry,
area context and its source limits.

## Large-Corpus Enrichment Contract

See [bundle authoring](okf-bundle-authoring.md) and
[governed enrichment](beginners/20-governed-enrichment-and-release-assurance.md)
for producer requirements and assurance gates.

## URL Patterns

Use [search and URL restoration](static-search-filtering-manual.md#5-share-and-restore-retrieval-state)
and the opening instructions above. Explorer lives at `/explore/`.

## Create A Small OKF Bundle From Markdown

Follow the [complete first-bundle exercise](onboarding/first-bundle.md).

### 3. Validate Locally

The [first-bundle guide](onboarding/first-bundle.md) provides its exact checks.
For Explorer itself, use the [development guide](development.md).

## Add Your Bundle To The Registry

The learner catalogue does not admit new bundles. Propose an entry in the authored
[`registry/okf-registry.yamlld`](../registry/okf-registry.yamlld), following its
existing entry shape and the [bundle authoring requirements](okf-bundle-authoring.md).
Use a stable identity, title, description, kind, version, descriptor URL and home
URL, with source and rights evidence. Do not add a URL until the exact deployment
and a record journey have passed the repository's browser gate.

Then update the editorial [learning catalogue](../registry/learning-catalogue.json)
to include the admitted bundle ID and a useful task. Generate and check all
projections with `uv run --locked python scripts/build_okf_registry.py` and the
same command with `--check`. Generated JSON, TypeScript and catalogue Markdown
must not be edited by hand. Admission and publication remain separately reviewed.

## Troubleshooting

Use [AI access and troubleshooting](ai-okf-usage.md) for retrieval limitations,
the [first-bundle checks](onboarding/first-bundle.md) for teaching-file errors,
and the [development guide](development.md) for repository build failures.
