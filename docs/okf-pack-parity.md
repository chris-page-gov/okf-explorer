# OKF Pack Parity

This repository now treats the UK Government APIs OKF pack and the GOV.UK CKAN
large-corpus pack as paired exemplars. They have different source boundaries,
but the Explorer should evaluate them with the same reader goals, vocabulary,
and UI behaviours.

## Parity Contract

Each large OKF pack should expose:

- an `okf-explorer-large-corpus.v1` descriptor;
- generated overview, analysis, search, facet and relationship entry points;
- pack counts that distinguish records, resources, providers, relationships,
  contracts, operations and schemas where those concepts exist;
- source, source tier, provenance, confidence, licence, access model, contract
  status and record type metadata on every record where the source supports it;
- standards-alignment metadata where the pack refers to APIs or API-like data
  services, including DCAT/DCAT-AP terms, OpenAPI terms, export-readiness
  status and missing requirements;
- generated facet definitions and quality hints that match the UI vocabulary;
- a 100-question evaluation suite using the shared additive rubric.

The UK Government APIs pack is the richer multi-source API/data-access exemplar.
The GOV.UK CKAN pack remains the broad data-catalogue exemplar. Parity does not
mean identical counts or facets; it means a user can perform the same discovery,
inspection, provenance, licence/access and graph-reading tasks with comparable
support.

## UI Learnings

Dense graph clusters need semantic grouping, not just zoom. If many records
connect to the same provider, host, licence or topic, the graph should group
them by a visible dimension such as record type. Clicking one group expands that
group while re-stacking the previous group.

Opened stacks should not blindly expand every record. When a stack contains too
many records for a readable graph, the Explorer should choose a bounded grouping
dimension such as format, topic, licence, access model, contract status, source
adapter or update year, then show that grouping explicitly in the graph caption.

Search-result context must survive view changes. If a reader searches for a
host or provider and selects a result, Graph should centre on that selected or
highlighted route instead of falling back to an adjacent provider fan-in.

Metadata graph nodes should reduce context when they correspond to a real facet.
Double-clicking a host, provider, format, topic, tag or licence should make that
facet value the active reduction so the left-panel counts describe the same
context the graph is showing.

Graph interaction has two separate intents. Single-click should inspect a node
and populate the data card; double-click should navigate, re-centre or reduce
the graph. This keeps exploratory inspection reversible and avoids surprising
graph jumps.

Facet counts and graph grouping must be explained in the UI. A record-type facet
can look like a false breakdown when it describes the wider search reduction
while the graph has moved to a selected metadata node. The Explorer should show
the active grouping and expanded group in the graph caption.

High-cardinality facets need their own search and paging. Provider-like facets
should not force the reader to depend on the first few values by count; if the
reader knows the provider name, typing within the open facet should reduce the
value list immediately. Single-click should replace the current value, while
Ctrl-click, Cmd-click or Shift-click should opt into multi-select.

Closed facets should be cheap. The Explorer should compute and render the full
value list only for the active facet body, otherwise high-cardinality facets can
make every sidebar update feel broken.

Facet search should apply the same token normalisation to the query and facet
values. Hyphens, underscores and spaces should not make known organisations,
hosts or protocols undiscoverable.

Graph labels and arrows are publication-quality requirements. Labels must not
hide selected nodes, and arrowheads should terminate at icon/card boundaries
rather than passing through the visual centre of a node.

Timeline views must be chronological and task-oriented. A Latest view helps
readers recover from historic records, while year, quarter and month buckets
provide progressively finer date filtering for packs that carry dated metadata.

The bundle URL control should behave like a normal combobox: suggestions should
close when the reader clicks elsewhere, so accidental focus does not leave a
floating panel over graph or card content.

## Bundle-Building Learnings

Bundle builders should emit explicit dimensions that can be used for grouping:
record type, source adapter, source tier, protocol, provider, host, licence,
topic and confidence. These are not only facets; they are graph layout inputs.

Relationship records should carry evidence and counts where available. A graph
stack is defensible only when the stack label states the relationship and count
being collapsed.

Licence and access fields must distinguish source-declared, inherited and
provider-terms-inferred values. This prevents metadata repair from pretending to
be legal or operational assurance.

Generated analysis should identify high-risk display contexts: high fan-in
providers, high fan-out hosts, dominant missing metadata values, and dense
record-type mixtures. Those contexts should become evaluation questions and
visual-regression evidence.

## CKAN Parity Evaluation

The shared harness supports both packs:

```sh
node scripts/evaluate_okf_explorer.mjs \
  --suite evaluation/okf-explorer/questions.json \
  --visual evaluation/okf-explorer/visual-regressions.json \
  --base-url http://127.0.0.1:8002/next/
```

```sh
node scripts/evaluate_okf_explorer.mjs \
  --suite evaluation/gov-ckan/questions.json \
  --base-url http://127.0.0.1:8002/next/
```

The CKAN suite declares its hosted descriptor as `target_bundle`, so the second
command evaluates the GOV.UK CKAN pack unless `--bundle` is supplied explicitly.
The harness also uses the suite's sibling visual-regression manifest unless
`--visual` is supplied.

The CKAN hosting repository should keep its existing documentation-lockstep
policy. The practical parity rule is: changes to either pack's descriptor,
generated analysis, search/facet model, evaluation suite or docs should update
the matching parity documentation and changelog in the same PR.

## Standards Parity

The UK Government APIs pack should be the richer API standards exemplar because
it has declared API products, provider-native API roots, operations, contracts
and schemas. The GOV.UK CKAN pack should still align any API-like resources to
the same vocabulary when it exposes WMS, WFS, OGC API, ArcGIS REST, SPARQL or
other data service endpoints.

Parity expectation:

- API-like services map to `dcat:DataService`.
- Dataset records map to `dcat:Dataset`.
- Licences map to `dcterms:license`.
- Provider/publisher metadata maps to `dcterms:publisher`.
- Endpoint URLs map to `dcat:endpointURL`.
- Documentation or capability documents map to `dcat:endpointDescription` or
  `dcterms:conformsTo`.
- OpenAPI terms are only used where the pack has enough HTTP API metadata to
  emit a useful service stub or operation fragment.

Both packs should describe themselves as standards-alignable until they emit and
validate the actual DCAT-AP RDF or OpenAPI artefacts.
