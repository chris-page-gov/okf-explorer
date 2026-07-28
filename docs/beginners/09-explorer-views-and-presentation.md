# Explorer Views And Presentation

The Explorer offers several views because no single picture answers every
question. They are coordinated projections of one active context, not separate
copies of the data.

## Active Context

The **active context** is the current evidence set:

- the whole-pack overview;
- search results;
- a facet reduction;
- a selected graph neighbourhood;
- a chosen place;
- a selected record.

Changing the query or a facet should affect every view consistently. If Reader
shows 40 filtered records while Resources silently summarizes the whole
corpus, the interface creates a false comparison.

The first context is `overview`. It is a generated description of the pack's
shape, not an arbitrary sample and not a search result.

## The Three-Panel Model

On a wide screen the application broadly separates:

- **left** — ways to reduce context, such as search and facets;
- **centre** — a view of the active evidence landscape;
- **right** — details and evidence for the selected item.

On smaller screens these areas may stack or open as panels. Their logical
roles should remain understandable to keyboard and screen-reader users.

## Reader

Reader provides a readable overview or record presentation. At the corpus
level it should explain:

- purpose and scope;
- counts and coverage;
- representative clusters;
- notable gaps or skew;
- suggested routes into the collection;
- provenance and source notices.

At record level it presents normalized fields and body content without making
the reader decode raw JSON.

## Graph

Graph shows nodes and typed relationships.

For a small selected neighbourhood, an automatic compact layout can work.
For a dense focus graph, the Explorer groups relationships by:

- predicate or normalized relationship label;
- direction relative to the focus.

Users can hide, expand and reorder groups. That state affects visibility and
layout only.

At whole-corpus overview, aggregate nodes and counts are more honest than a
random sample of raw records. Selecting an aggregate should lead to the
records it summarizes.

### Labels And Collisions

Node and edge labels compete for limited space. The presentation system:

- keeps the selected focus readable;
- plans non-overlapping label positions;
- uses bounded label layers when every label cannot coexist;
- lets users pause cycling;
- retains every relationship in an inspectable drawer.

A hidden direct label is not a hidden relationship.

### Edge Direction And Metrics

Arrow direction comes from source and target fields, not from where nodes
happen to be drawn.

Line width remains neutral unless a declared count, strength or other
supported metric applies consistently and varies across the visible edges.
Confidence is not silently treated as strength.

## Links

Links presents relationships as readable lists, groups and paths. It is
valuable when a graph would be crowded or inaccessible.

The overview should summarize relationship types and connected groups before
loading the whole relationship universe. For a selected record it can show:

- outgoing links;
- incoming “referenced by” links;
- predicate labels;
- evidence and source/target details.

## Timeline

Timeline turns dates into distributions and events.

A corpus overview may group records by year, month or decade. A selected
record can show events such as publication, update, observation or
transformation.

Date meaning must be named. “2026” is ambiguous if one record uses publication
date and another uses the builder's generation date.

## Type And Facets

This view explains the dimensions available for reducing context. A useful
facet analysis considers:

- coverage;
- number of distinct values;
- dominance of the largest value;
- balance or entropy;
- expected narrowing;
- hierarchy availability;
- user meaning;
- routeability;
- recommended control.

It can recommend:

- chips for a few useful values;
- searchable selection for many values;
- hierarchy controls for governed trees;
- ranges or histograms for dates and numbers;
- suppression when a field adds little narrowing value.

Provider defaults, generated analysis and a user's local preferences are
separate layers.

## Resources

One dataset can have several distributions or access points:

- downloadable files;
- APIs;
- documentation;
- schemas;
- landing pages;
- map services.

Resources groups these into inspectable stacks. An overview can show format,
host, resource type, licence and outlier distributions.

Following a resource is an external action. The Explorer preserves the
record's evidence context and does not assume that a reachable URL is current,
licensed or safe for unrestricted automated use.

## Map

Map uses spatial evidence as another context reducer. It can show:

- source coordinates or geometry;
- declared coverage;
- recognized places;
- geospatial services and files;
- bounded previews requested by the user.

A representative point for “London” is a locator, not a boundary. The Map
must explain the evidence level.

## Narrative

Narrative is a human-readable account of the active context. It can connect
patterns from graph, time, facets and resources, but it should use the same
underlying evidence rather than invent an independent story.

A generated narrative needs its method and source inputs recorded. A curated
narrative should remain distinguishable from generated analysis.

## Presentation Profile

A provider can publish display recommendations such as:

- facet order and labels;
- compact distributions;
- default tabs;
- hierarchy presentation;
- vocabulary for “record,” “resource” or “publisher.”

This optional profile improves usability without changing instance semantics.
A provider recommendation, a generated analysis recommendation and a user's
device-local override have a documented precedence order.

## URL State

Meaningful interface state is addressable. Depending on the view, this
includes:

- bundle URL;
- view;
- query and filters;
- sort;
- selected route;
- graph layout mode;
- hidden and ordered relationship groups;
- Map reduction.

State parsers impose length and count limits. A URL is public input and should
not be allowed to create unbounded work.

## Accessibility Is A Data-Presentation Requirement

Visual encodings require text equivalents:

- colour is not the only status cue;
- graph edges remain in a list;
- counts have readable labels;
- buttons expose pressed and expanded state;
- panels have meaningful headings;
- focus moves predictably;
- keyboard users can perform reorder and visibility actions;
- animation can be paused;
- touch targets and scroll areas remain usable.

An accessible alternative is not a lesser “fallback.” It can also be the
clearest way to audit dense evidence.

## Current Behaviour Versus Roadmap

The current Explorer supports the listed coordinated views, small and large
pack loading, predicate-aware graph grouping, durable retrieval state,
geospatial discovery and legislation detail.

Proposed future semantic views include:

- class hierarchy;
- property hierarchy;
- SKOS concept schemes;
- provenance paths;
- validation results;
- asserted-versus-inferred comparison.

Documentation should label these as candidate or planned until implemented.

## Next

[Geospatial data](10-geospatial-data.md) explains the special terms and limits
behind the Map view.
