# Viewer Capability Parity

Status: adopted compatibility and conflict record
Reviewed: 2026-07-24
Canonical implementation: `apps/okf-explorer/`

## Purpose

OKF Explorer has inherited ideas from several LLM-Wiki and OKF viewers. Those
ideas have sometimes been copied between single-file viewers without a durable
record of which behavior was canonical. That made later product work vulnerable
to regression.

This document inventories the independent viewer lineages available in the
local repositories, compares their user-facing and architectural capabilities,
and defines the parity contract for the canonical Svelte Explorer. Generated
`_site/` copies and compatibility aliases are publication outputs, not separate
designs.

The governing rule is:

> A useful capability must be retained, represented by an equivalent Svelte
> behavior, or recorded as an explicit conflict. It must not disappear merely
> because the implementation moved between viewer lineages.

## Viewer Inventory

| Lineage | Representative source | Primary strengths |
|---|---|---|
| Canonical Svelte OKF Explorer | `okf-explorer/apps/okf-explorer/` | Arbitrary bundles, large lazy corpora, static search, facets, durable retrieval URLs, evidence inspection, eight views, range packs and provider datapacks |
| Classic OKF canvas viewer | `api-mcp-wiki/viewer.html`, `okf-explorer/viewer.html`, `ai-infrastructure-wiki-compat/viewer.html` | Force layout, node dragging, four graph layouts, hover inspection, complete cycling label layers and label dwell control |
| Modern LLM-Wiki SVG viewer | `ai-engineering-lab-hackathon-london-2026/viewer.html`, `govuk-casa/viewer.html` | Three independently scrolling panels, folded context rails, rich Markdown, Mermaid, conversation Narrative and Timeline views, reciprocal edge labels and URL-addressable wiki routes |
| CFTE discourse viewer | `cfte-discourse-corpus/viewer.html` | Map, Sections and Reading modes, deterministic labels, graph fit, canvas panning and node dragging |
| OKFR harness viewer | `Awesome-Code-as-Agent-Harness-Papers/viewer.html` | Claim-oriented Narrative cards, typed relationship inspection and Force, Timeline, Type and Narrative layouts |
| Original GOV.UK CKAN viewer | `ai-engineering-lab-hackathon-london-2026/gov-ckan/viewer.html` | Overview-first loading, search and facets, Publisher-by-Format and resource-stack views, pins, dark theme and dense-corpus spotlighting |

The public LLM-Wiki reference reviewed for this audit was:

`https://chris-page-gov.github.io/ai-engineering-lab-hackathon-london-2026/?corpus=postmortem#architecture`

The public Svelte reference reviewed for this audit was:

`https://chris-page-gov.github.io/okf-explorer/?bundle=https%3A%2F%2Fchris-page-gov.github.io%2Fokf-ons%2Fokf-explorer.json&q=Average+house+price#dataset/ons-explore-local-statistics-indicator-average-house-price`

## Status Vocabulary

- **Retained**: present in the Svelte Explorer before this audit and protected.
- **Ported**: added or corrected in the Svelte Explorer by this audit.
- **Equivalent**: the Svelte Explorer meets the need through a different,
  intentionally named interaction.
- **Conflict**: literal parity would damage scale, determinism, security,
  accessibility or the OKF data contract; the resolution is recorded below.
- **Gap**: compatible and potentially useful, but not implemented. A gap is
  visible debt and must not be described as parity.
- **N/A**: specific to a corpus or publication workflow, not a generic viewer
  capability.

## Capability Matrix

### Loading, Publication And State

| Capability | Classic OKF | LLM-Wiki | Specialist viewers | Svelte status | Resolution |
|---|---:|---:|---:|---|---|
| Self-contained static publication | Yes | Yes | Yes | Retained | Static Svelte build plus legacy compatibility publication |
| Load an arbitrary public HTTPS bundle | No | No | Limited | Retained | Bundle URL field and registry remain canonical |
| Load a local bundle file | No | No | Limited | Retained | File picker remains available |
| Small embedded OKF bundle | Yes | Yes | Yes | Retained | Normalized small-bundle path |
| Large lazy corpus | No | No | CKAN only | Retained | Descriptor, worker search, chunk and adjacency loading |
| Byte-range corpus packs | No | No | No | Retained | Integrity-bound range-pack delivery |
| Provider evidence datapacks | No | No | No | Retained | Governed snapshot/reference distinction |
| Durable route in URL hash | Partial | Yes | Partial | Retained | Record or analysis route remains in the hash |
| Durable bundle, view and retrieval state | No | Corpus only | Partial | Retained | `bundle`, `view`, query, filter, sort and Map state remain in the query |
| Browser Back and Forward | Internal stack | Browser history | Mixed | Retained | Native history with explicit controls |
| Copy current route | No | URL is shareable | Mixed | Retained | Copy route action |
| Recent bundles and registry suggestions | No | Corpus tabs | No | Retained | Registry plus local bundle history |
| Launch a local server from GitHub Pages | No | Link only | No | Conflict | Static pages cannot start a process on the reader's machine |

### Retrieval And Corpus Navigation

| Capability | Classic OKF | LLM-Wiki | Specialist viewers | Svelte status | Resolution |
|---|---:|---:|---:|---|---|
| Title, identifier and alias search | Yes | Yes | Yes | Retained | Small and worker-backed large search |
| Search Markdown body text | Partial | Yes | Partial | Retained | Small-bundle body search |
| Field-weighted ranked search | No | No | CKAN | Retained | Static-search worker contract |
| Type filtering | Yes | Corpus groups | Yes | Retained | Small types and large facets |
| Multi-value facets and counts | No | No | CKAN | Retained | Complete-data facets where the pack supports them |
| Hierarchical facet browsing | No | No | Partial | Retained | Presentation profile and hierarchy tabs |
| Sort controls | No | No | CKAN | Retained | Relevance, date, title and metadata quality |
| Pins and pin export | No | No | CKAN | Retained | Persistent pins, spread and export |
| Overview before full hydration | No | No | CKAN | Retained | Large-corpus overview contract |
| Source inspector and bounded JSON tree | No | GitHub links | Partial | Retained | Inspector plus raw source action |
| Credential redaction in displayed URLs | No | Partial | No | Retained | Sensitive query parameters are removed |

### Views And Reading Models

| User need | Earlier expression | Svelte status | Resolution |
|---|---|---|---|
| Read records and Markdown | Reader or right detail panel | Retained and Ported | Reader/detail remain canonical; safe tables and Mermaid-lite were added |
| Explore relationships | Force/Graph/Map | Retained and Ported | Deterministic Graph with focus, direction, types and inspection |
| Read relationship lists | Links | Retained | Incoming/outgoing typed lists |
| Understand chronology | Timeline | Retained and Ported | Corpus timeline remains; exchanges receive a response-level timeline |
| Compare knowledge types | Type | Retained | Type grouping is not renamed to avoid breaking public URLs |
| Inspect files and endpoints | Resource stack/Resources | Retained | Resources view and source actions |
| Explore geography | Map | Retained | Deterministic evidence-level Map with bounded previews |
| Read an explanatory sequence | Narrative/Reading | Retained and Ported | Generic Narrative remains; exchanges receive question/answer composition |
| Browse document sections | Sections | Equivalent | Reader headings, search and route-addressable records cover generic use; a corpus may add a section facet |
| Publisher-by-Format comparison | CKAN matrix | Equivalent | Publisher and format facets, Type and Resources preserve the analytical route without a CKAN-only global matrix |
| Claim cards | OKFR Narrative | Equivalent | Narrative renders record summaries; claim-specific cards remain a bundle presentation concern |

The public view identifiers remain:

`reader`, `graph`, `links`, `timeline`, `type`, `resources`, `map`,
`narrative`.

New corpus-specific rendering must be selected inside those stable views. It
must not replace or silently rename them.

### Markdown And Evidence

| Capability | Classic OKF | LLM-Wiki | Svelte status | Resolution |
|---|---:|---:|---|---|
| Headings, paragraphs, lists and fenced code | Partial | Yes | Retained | Safe renderer |
| Pipe tables | No | Yes | Ported | Semantic HTML table with scroll containment |
| Mermaid flow diagrams | No | Yes | Ported | Safe, self-contained flowchart subset |
| Images | Partial | Yes | Retained | Safe URL resolution |
| Relative Markdown links | Partial | Yes | Retained | Resolved against bundle URL |
| GitHub commit and path links | No | Yes | Retained when authored | Viewer preserves valid external permalinks; bundle authors supply commit identity |
| External-source overview beyond title | No | Added in wiki | Data-contract requirement | Bundle description, summary, provenance and analysis fields remain the source of truth |
| Raw HTML execution | Sometimes | Library-dependent | Conflict | HTML stays escaped; active content is prohibited |
| Full Mermaid grammar and plugins | No | External runtime | Conflict | Unsupported directives stay code; no remote script or unsafe Mermaid HTML |

The Mermaid-lite renderer is intentionally bounded to simple
`flowchart`/`graph` declarations and directed nodes. It preserves offline
publication and the Explorer's no-active-content rule. Full Mermaid parity
would require a separately reviewed, pinned renderer and a larger security and
accessibility test surface.

### Conversation Presentation

| Capability | LLM-Wiki behavior | Svelte status |
|---|---|---|
| Detect a published exchange note | `Exchange` Markdown structure | Ported |
| Put the user prompt on the left | Narrative question card | Ported |
| Put the final answer on the right | Narrative answer card | Ported |
| Show commentary below in time order | Commentary cards | Ported |
| Show prompt and every response chronologically | Exchange Timeline | Ported |
| Open a direct exchange route in Narrative | Automatic route subtype | Ported |
| Preserve generic Narrative and Timeline | Other pages keep original semantics | Retained |
| Publish raw private transcripts | Excluded by postmortem policy | N/A |

The parser recognizes the published LLM-Wiki headings `User Prompt`, `Codex
Response`, and `Response N (kind)`. It does not infer private transcript
structure from arbitrary prose.

### Graph Presentation And Interaction

| Capability | Classic OKF | LLM-Wiki | Svelte before audit | Target status |
|---|---:|---:|---:|---|
| Directed arrowheads | Yes | Yes | Yes | Retained |
| Typed relationships | Inferred | Yes | Yes | Retained |
| Select an edge and inspect details | Hover/tip | Click/detail | Drawer | Retained |
| Separate reciprocal arrows | Partial | Yes | No | Ported |
| One label for equal reciprocal types | No | Yes | No | Ported |
| Different reciprocal labels near each source | No | Yes | No | Ported |
| Label sparse graphs directly | Yes | Yes | Partial | Ported |
| Partition every eligible node and relationship label into non-overlapping sets | Partial | Yes | No | Ported |
| Cycle combined node and relationship label sets | Configurable dwell | Two seconds | Timer existed but node labels were discarded and relationship labels were excluded | Ported at two seconds |
| Keep selected label visible | Yes | Yes | Partial | Ported |
| Pause label motion | Dwell control | No | No | Ported |
| Honor reduced-motion preference | No | No | Partial | Ported |
| Pan from empty canvas | Yes | Yes | Yes | Retained |
| Pan when drag starts over a node or edge | Mixed | Corrected | No | Ported |
| Prevent browser drag ghosts | Mixed | Corrected | No | Ported |
| Wheel and button zoom | Yes | Yes | Yes | Retained |
| Reset or fit view | Fit | Reset | Reset | Equivalent |
| Browser pinch zoom remains available | Mixed | Mixed | Yes | Retained |
| Drag individual nodes | Yes | No | No | Conflict |
| Force simulation | Yes | No | No | Conflict |
| Deterministic positions | No | Yes | Yes | Retained |
| Dense-graph edge labels | Hover | Bounded | Bounded | Combined cycling through 36 relationships; selected edge and drawer above that bound |
| Large-corpus grouped nodes/stacks | No | No | Yes | Retained |

The label-layer invariant is now stronger than the earlier implementations:

1. Every supplied node label and every relationship label within the focus
   graph density bound belongs to exactly one display layer, except selected
   context which is persistent.
2. Labels in one layer do not overlap each other.
3. Node and relationship labels are planned together, so relationship text
   cannot overlap node text in the active layer.
4. Labels are not silently discarded because another node occupies their first
   candidate position.
5. Layers advance every two seconds and can be paused.
6. Reduced-motion users start with cycling paused.

For focus graphs with up to 36 relationships, node and relationship labels
share the complete cycling plan. Above that bound, every relationship remains
selectable and typed in the edge drawer, while only selected relationship text
is persistent on the graph. Rendering an unbounded number of edge labels would
make one full cycle take too long to be useful.

### Panels, Responsive Use And Accessibility

| Capability | LLM-Wiki | Svelte status | Resolution |
|---|---:|---|---|
| Three-panel workspace | Yes | Retained | Search/navigation, workspace and evidence detail |
| Independent panel scrolling | Yes | Retained | Each panel owns its overflow |
| Fold left and right panels | Yes | Retained and Ported | Collapsed rails now retain the current context label |
| Vertical collapsed-page label | Yes | No | Ported |
| Resizable relationship drawer | No | Retained | Svelte-specific capability |
| Android detail scrolling | Corrected | Partial | Ported with vertical touch action, bounded panel height and momentum scroll |
| Keyboard-selectable nodes and edges | Partial | Retained | Buttons/roles and activation handlers |
| Accessible graph descriptions | Partial | Retained | SVG role, labels and title text |
| Reduced animation | No | Partial | Ported for label cycling |
| Dark theme | Yes | Gap | Requires a complete contrast and screenshot review, not a partial color inversion |

## Conflict Register

### C1. Force Layout And Node Dragging Versus Deterministic Large Graphs

The classic viewer allows force simulation and direct node movement. Those
positions are transient, differ between runs and require the whole graph in
memory. The Svelte Explorer supports corpora with thousands of lazy records,
grouped graph nodes and route-scoped adjacency.

Decision: preserve deterministic layouts, canvas panning, zooming, focus graphs
and group expansion. Do not add free node dragging or force simulation to the
canonical large-corpus graph. A future small-bundle-only force mode would need
its own public view identifier, URL state and browser tests.

### C2. Full Embedded Corpus Versus Progressive Loading

Single-file viewers can assume every node and relationship is already in the
page. That model is useful for small wikis but cannot be the large-corpus
contract.

Decision: keep both normalized small bundles and lazy descriptors. Parity is a
user-level interaction contract, not a requirement to embed the large corpus.

### C3. Existing View Meanings Versus Imported Names

`Timeline`, `Type` and `Narrative` already have public Svelte routes. Earlier
viewers use those names for slightly different layouts.

Decision: retain route names and generic behavior. Add exchange-level Timeline
and Narrative as subtype presentation. Represent Sections and
Publisher-by-Format through existing Reader, facets, Type and Resources unless
a generic need justifies a new stable route.

### C4. Browser Pinch Zoom Versus Graph Gesture Capture

Capturing multi-touch pinch inside the graph prevents browser/page zoom and can
create an accessibility regression.

Decision: retain browser pinch zoom. Provide explicit graph zoom buttons,
wheel zoom, reset and one-pointer graph panning.

### C5. Complete Edge Labels Versus Legibility

All edge labels are useful in a sparse focus graph and unreadable in a broad
dense graph.

Decision: plan node and relationship labels together for focus graphs with up
to 36 relationships, apply reciprocal-edge rules, and cycle complete
non-overlapping sets every two seconds. A selected relationship remains
persistent. Above the bound, keep every edge selectable through the edge drawer
and Links view while showing selected relationship text on the graph.

### C6. Full Mermaid Versus Static Safety

A remote Mermaid runtime or permissive HTML configuration adds active content,
network dependency, CSP complexity and a larger parser attack surface.

Decision: provide a constrained local Mermaid-lite renderer for the diagrams
used by published wiki architecture pages. Escape unsupported syntax as code.

### C7. Local Workbench Launch Versus Static Hosting

A GitHub Pages application cannot start SeeLinks or another local process.

Decision: the Explorer may follow an explicitly authored local-workbench link,
but it must not pretend to launch a server. Bundle loading, file loading and
source links remain the portable workflow.

### C8. Fixed Label Cadence Versus User Dwell Controls

The classic viewer exposes a dwell-speed setting; the modern wiki established
the requested two-second cadence.

Decision: standardize on two seconds, add Pause/Resume and honor reduced
motion. Do not add another numeric control until user testing shows that speed
selection is more useful than the simpler pause action.

### C9. Dark Theme Versus An Unreviewed Partial Port

The LLM-Wiki and original CKAN viewer include dark presentation. The canonical
Explorer uses a broader component set, maps, charts, evidence states and
semantic status colors.

Decision: record dark theme as a compatible gap. It may be added only with
WCAG contrast checks and desktop/mobile visual regression coverage for every
view. A partial CSS inversion is not parity.

### C10. Legacy Single-File Viewer Versus Canonical Product Source

The compatibility viewer still exists for old links and low-dependency use,
but maintaining two equal product implementations causes drift.

Decision: Svelte is canonical. Compatibility files preserve their published
contract; new reusable behavior and regression tests belong in
`apps/okf-explorer/`.

## Implemented In This Audit

- Added a shared complete node-and-relationship graph-label layer planner for
  small and large graphs.
- Changed the cycle interval to two seconds, added Pause/Resume and respected
  reduced motion.
- Added reciprocal edge geometry and labeling rules.
- Allowed graph panning to begin over nodes and relationships while preserving
  click selection.
- Prevented native drag-ghost behavior.
- Added safe pipe tables and Mermaid-lite flowcharts to small-bundle Markdown.
- Added exchange-aware Narrative and Timeline presentations.
- Added context text to collapsed panel rails.
- Hardened mobile panel scrolling and touch behavior.

Implementation and regression evidence:

- `apps/okf-explorer/src/lib/viewer/graphPresentation.ts`
- `apps/okf-explorer/src/lib/viewer/graphPresentation.test.ts`
- `apps/okf-explorer/src/lib/viewer/conversationPresentation.ts`
- `apps/okf-explorer/src/lib/viewer/conversationPresentation.test.ts`
- `apps/okf-explorer/src/lib/viewer/smallNodePresentation.ts`
- `apps/okf-explorer/src/lib/viewer/smallNodePresentation.test.ts`
- `apps/okf-explorer/tests/ui/small-bundle-content.spec.ts`

## Regression Contract

Any future viewer change must preserve the following:

1. A public URL can identify the bundle, view, selected route and applicable
   retrieval state.
2. Native Back and Forward restore that state.
3. Both small bundles and lazy large descriptors remain supported.
4. Every graph node label and every eligible relationship label is reachable
   through a complete non-overlapping layer plan; selected context stays
   visible.
5. Sparse reciprocal relationships remain distinct and correctly labeled.
6. Every relationship remains inspectable even when density suppresses direct
   labels.
7. Markdown remains inert while supporting the documented readable subset.
8. Exchange notes retain question, answer, commentary and chronological forms.
9. Both side panels remain independently usable on desktop and touch devices.
10. Existing Svelte-only capabilities, including facets, pins, source
    inspection, Map, provider evidence and range packs, remain covered.

At minimum, changes to graph, Markdown, routing or panel behavior must run:

```sh
cd apps/okf-explorer
pnpm check
pnpm test
pnpm exec playwright test tests/ui/small-bundle-content.spec.ts
```

Publication still requires the repository checks in `AGENTS.md`.

## Remaining Compatible Gap

Dark theme is the only user-facing capability found in the reviewed lineages
that is compatible with the canonical architecture but intentionally not
claimed as complete in this audit. It should be implemented as a separate,
fully tested theme change. All other non-literal differences in the matrix have
an equivalent behavior or an explicit architectural, safety or accessibility
conflict.
