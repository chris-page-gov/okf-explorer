# Facet Presentation Experiment

## Status

Experimental Explorer interaction and provider-profile contract, 21 July 2026.

## Decision

Do not introduce **DataPack** as a new name for display metadata. In SeeLinks a
datapack is the corpus payload, while OKF already uses packs and range packs for
content and transport. Reusing the term for a UI sidecar would make it unclear
whether a file contains records, indexes or presentation hints.

Use the optional `okf-explorer-presentation.v1` profile instead:

- generated counts, coverage, cardinality, entropy and expected reduction stay
  in `okf-explorer-analysis.v1`;
- the provider profile supplies labels, descriptions, order, initial visibility,
  control hints, value order and examples;
- user choices override provider defaults and remain local to one bundle;
- Explorer heuristics fill any gaps; and
- none of these display hints change the semantic meaning of an OKF concept.

The merge order is:

1. device-local user preferences for this bundle;
2. provider presentation profile;
3. generated facet analysis;
4. Explorer fallback behaviour.

## Publication Forms

Large-corpus descriptors may embed the profile when it is small:

```json
{
  "kind": "okf-large-corpus",
  "extensions": {
    "okf-explorer-presentation.v1": {
      "mode": "inline",
      "profile": {
        "schema": "okf-explorer-presentation.v1",
        "status": "experimental",
        "facets": []
      }
    }
  }
}
```

Large corpora may reference a cacheable sidecar from the existing root
`okf-explorer.json` descriptor:

```json
{
  "entrypoints": {
    "presentation": "data/presentation.json"
  },
  "extensions": {
    "okf-explorer-presentation.v1": {
      "mode": "external",
      "entrypoint": "presentation"
    }
  }
}
```

The schema is
[`profiles/bundle-wiki/v1/presentation.schema.json`](../profiles/bundle-wiki/v1/presentation.schema.json).
Explorer does not scan for a sidecar beside every `index.md`. Per-directory
discovery would add network requests and create unresolved inheritance rules.
Route-scoped overrides are deferred until matching and inheritance semantics can
be specified and tested; the v1 experiment is deliberately bundle-level.

## Provider Example

```json
{
  "schema": "okf-explorer-presentation.v1",
  "status": "experimental",
  "defaults": {
    "facet_mode": "suggested",
    "search_threshold": 48,
    "distribution_segment_limit": 10
  },
  "facets": [
    {
      "key": "publisher",
      "label": "Provider",
      "description": "Organisation responsible for publishing the record.",
      "value_type": "nominal",
      "order": 10,
      "default_state": "pinned",
      "open_control": "search",
      "value_order": "count-desc",
      "examples": ["Ordnance Survey", "Office for National Statistics"]
    },
    {
      "key": "creation_year",
      "label": "Year",
      "value_type": "date",
      "order": 20,
      "default_state": "shown",
      "open_control": "histogram",
      "value_order": "value-desc"
    }
  ],
  "panels": {
    "left": {"tabs": ["facets", "browse", "results"], "default_tab": "facets"},
    "right": {"tabs": ["overview", "evidence", "data"], "default_tab": "overview"}
  }
}
```

Providers cannot supply JavaScript, CSS, HTML, arbitrary images or custom menu
commands. Pin, hide, reorder, reset and action-menu behaviour remain controlled
by Explorer.

## Facet Utility

A useful facet normally has:

- high coverage, so it describes most of the current records;
- enough distinct values to divide the domain, without becoming a second search
  index;
- a balanced distribution, rather than one value containing nearly everything;
- a clear reader-facing meaning;
- stable routeable values; and
- a control that matches its type: categories, hierarchy, ordered number/date or
  identifier-like text.

Cardinality alone is not quality. Two values can be useful when they divide the
domain well; 20 values can be poor when one contains 99% of records; 20,000
identifiers are usually search terms rather than a browsable facet.

Expected reduction estimates how much of the record set a typical value choice
would exclude. For multi-valued facets, the typical choice is weighted by value
assignments while the remaining share is measured against records; this keeps
overlapping categories meaningful and the score within zero to one.

The **Guidance** control in the left panel exposes the provider definition,
recommendation, coverage, cardinality and expected reduction. **Suggested**
hides advanced or suppressed facets unless they are pinned or active. **All**
keeps every available dimension recoverable.

## Compact Distribution

For a manageable categorical facet, Explorer renders a short stacked strip:

- strip width is the available panel width;
- every segment has the same height;
- segment width, and therefore area, is proportional to the current count when
  a dynamic facet response is available, otherwise to the pack's whole-corpus
  lightweight overview preview; the caption names which scope is shown;
- a bounded number of segments is shown, followed by an explicit remainder;
- a remainder count is labelled as combined assignments because values can
  overlap on multi-valued facets;
- hover or keyboard focus changes a persistent text caption to `value · count`;
- a single click previews a segment, a double-click or Enter applies it as a
  filter, and the remainder opens the facet so its values can be searched;
- categorical segments use alternating, distinguishable hues while ordered
  number and date facets use a sequential scale; and
- the strip has a complete accessible text summary, so colour and hover are not
  the only ways to read it.

Explorer draws a proportional strip only when the available vocabulary preview
is complete. A truncated top-values preview is labelled as such and shown in a
search-shaped field; Explorer never implies that missing tail values or counts
are represented by the strip. Numeric and date facets may use an equal-width,
count-height histogram while preserving their declared value order.

This is a one-dimensional treemap. Varying both width and height would make
neighbouring values harder to compare in a narrow panel. Numeric and date
facets use declared value order; nominal facets default to count order.

## High Cardinality

When cardinality exceeds the profile threshold, or the provider recommends a
search control, the closed distribution is replaced by a search-shaped preview
with examples. Opening the facet gives a labelled input and paged matching
values. Explicit provider examples take precedence over automatically selected
high-frequency examples.

For a large corpus, Explorer fetches the lightweight facet vocabulary separately
from record hydration. It then asks the static-search worker for exact low-cardinality
distributions without returning or hydrating result documents. This makes the
closed strips available on first load. High-cardinality facets remain search-first
by design; their missing strip is not a loading failure.

The current static-search format still loads one postings object for a facet.
That is acceptable for the current examples, whose largest facets contain
hundreds rather than tens of thousands of values. A genuine 20,000-value facet
needs an optional prefix-sharded facet vocabulary before this can be called
scalable. That future index should provide:

- prefix to shard routing;
- label, canonical value and count;
- provider examples plus minimum/maximum for ordered values;
- a bounded result limit; and
- snapshot and checksum binding to the corpus descriptor.

Explorer must not download 20,000 labels merely to draw a closed facet or invent
examples from an incomplete top-count preview.

## Panel Experiment

The left panel now separates peer tasks with tabs:

- **Facets** — compact global context reduction;
- **Browse** — provider-defined hierarchies using familiar foldable rows and type
  indicators; and
- **Results** — sorted records in the current reduction.

Search remains above the tabs because it changes all three contexts. Hierarchy
groups are no longer silently truncated into a few static rows.

The selected-record panel uses **Overview**, **Evidence** and **Data** tabs, with
disclosures inside each tab. Dates, series and maintenance remain in Overview
until packs consistently model enough peer temporal concepts to justify a true
**Epochs** tab. A tab should represent a stable peer view, not merely hide one
small field group.

## User Control

Every facet has a visible pin control, a drag handle and an actions button.
Pinned facets remain open while another facet is explored. Dragging a handle
reorders a facet within its pinned or unpinned group; the menu provides an
accessible Move earlier/Move later fallback. Right-click and `Shift+F10` on the
facet header open that same action menu as a convenience. The obsolete SeeLinks
**Adjust** command is deliberately not present, and right-clicking a value has
no selection meaning. The menu supports:

- pin or unpin;
- move earlier or later;
- show in or hide from Suggested;
- clear the active values; and
- explain the facet.

Preference deltas are versioned, stored under the canonical bundle URL and
excluded from shared filter URLs. User pin, hide, order, visibility-mode and
guidance choices override the corresponding provider defaults. An explicit
"shown in Suggested" override is stored separately from pinning, so unpinning
does not silently discard that choice. Semantic labels, control definitions and
panel structure remain provider-owned. **Reset** removes
the local deltas and restores the current provider defaults. New facets append
safely when a bundle evolves, and an active facet remains visible even if its
normal recommendation would hide it.

A facet value follows the SeeLinks preview/commit distinction: click previews it
in the detail panel without changing the shared filter URL; Ctrl-click or
Cmd-click builds a highlighted set; double-click, Enter or **Filter to
highlighted** commits that set. This prevents exploratory clicks from repeatedly
rebuilding the reduction while retaining a direct keyboard path.

Arbitrary provider icons, a full ARIA tree and per-directory sidecars remain
deferred until this interaction has been tested with more real packs.

## Executable UI Contract

The Playwright suite uses a deterministic ONS-shaped 420-record corpus, including
382 records with `geography_metadata.levels = ["region"]`. Its browser journeys
document and exercise:

- the bundle controls, view switcher, panel collapse controls, search, left-panel
  tabs and Suggested/All/Guidance/Reset toolbar;
- provider order, labels, defaults, hidden facets, low-cardinality strips,
  high-cardinality search previews, palette variation and accessible counts;
- header open/close, direct pin/unpin, persistent multi-open state, drag reorder,
  keyboard/menu reorder and preference reset;
- strip and value click preview, modifier highlighting, double-click/Enter commit,
  aggregate-remainder opening, search, paging and filter clearing;
- actions-menu commands, with no legacy **Adjust** action and no value
  right-click selection gesture;
- Reader/Graph hydration parity, canonical reduction totals, result limits,
  metric cards and the route detail panel; and
- Browse and Results tabs plus the right-panel Overview/Evidence/Data tabs.

The 382-record assertion is intentionally repeated before and after Graph forces
full hydration. It prevents the nested ONS geography projection from silently
regressing to a flat-field lookup and displaying zero.
