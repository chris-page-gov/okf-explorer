# Large Corpora And Progressive Loading

A person opening a collection of hundreds of thousands of records should not
have to download every full record before the first useful screen appears.
The large-corpus design keeps static publication while making loading
progressive.

## The Restaurant-Menu Analogy

A menu does not bring every dish to the table. It gives enough information to
choose, then the kitchen prepares what was selected.

A large OKF descriptor plays the role of the menu. It states what the
collection is, which artifacts exist and where to find them. Search indexes
and compact result records help the user choose. Full records and relationship
neighbourhoods load only when needed.

Unlike a restaurant, the artifacts are built in advance; the static host is
not running custom queries.

## Descriptor

The public entry point is commonly named `okf-explorer.json`. A simplified
descriptor looks like this:

```json
{
  "schema": "okf-explorer-large-corpus.v1",
  "kind": "okf-large-corpus",
  "title": "Example Data Catalogue",
  "snapshot": "2026-07-01",
  "entrypoints": {
    "data_manifest": "data/manifest.json",
    "analysis_overview": "data/analysis.json",
    "search_manifest": "data/search/manifest.json"
  },
  "counts": {
    "records": 120000
  }
}
```

The descriptor is small enough to inspect and fetch quickly. It describes the
publication but does not contain every record.

## Manifest

A **manifest** inventories artifacts in a publication. The data manifest can
point to:

- overview and analysis files;
- search indexes;
- facets;
- full-record chunks;
- resource and publisher chunks;
- relationship indexes and adjacency buckets;
- provider datapacks;
- integrity metadata.

The descriptor is the stable front door; manifests describe the files behind
it.

## Control Plane And Data Plane

These terms are borrowed from distributed systems.

The **control plane** tells the application what exists and how to access it:
descriptor, manifest, version, snapshot, counts, schemas and entrypoints.

The **data plane** carries the substantial content: records, search postings,
relationships, resources and compressed packs.

Keeping them separate lets the Explorer make a plan from a small trusted
description before transferring larger data.

This is unrelated to the AI-infrastructure corpus's “discovery-to-governance
control plane,” which describes governed agent execution. The same phrase is
used at two different architectural levels.

## Chunks And Shards

Both split a large artifact, but the reason for the split differs.

A **chunk** is a bounded group of records, often chosen by numeric position:

```text
data/records-000.json
data/records-001.json
```

A **shard** is a partition selected by a deterministic key. Search terms might
be divided by their first characters, while relationships can be divided by a
hash of the selected route.

The Explorer must use the same partitioning algorithm as the builder.
Published test vectors protect details such as non-ASCII identifiers from
producing different buckets in Python and JavaScript.

## Indexes

An index is extra data built to answer a particular question quickly.

Examples include:

- a search lexicon mapping terms to postings;
- a facet index mapping a value to matching record numbers;
- a document map translating record IDs to numeric positions;
- a relationship adjacency index locating the edges near one route;
- sort values aligned to record positions.

Indexes duplicate selected information intentionally. The canonical record is
still distinct from its search or display projection.

A facet value such as `Scotland` may therefore have an exact posting list
without being a materialized relationship node. Explorer can show a bounded
membership preview and graph from that posting, clearly labelled as
index-derived. Selecting one real record then loads that record's adjacency
shard. Asking a facet card to load every corpus relationship is both unnecessary
and semantically wrong.

## Progressive Loading

The normal large-corpus sequence is:

1. fetch the descriptor;
2. fetch the data and search manifests;
3. render overview counts and notices;
4. load only the search shards required for a query;
5. load compact result-document chunks;
6. load a full record after selection;
7. load its resources or relationship neighbourhood on demand;
8. fetch external source material only after a deliberate user action.

This is also called **lazy loading**: defer work until it can provide value.

Progressive loading is not an excuse for hidden incompleteness. The interface
must say when a total is exact, a lower bound or unknown, and when a result was
truncated by a budget.

## Compression

Repeated text in JSON compresses well. Large artifacts may be published with
gzip compression to reduce transfer size.

Compression introduces two sizes:

- compressed bytes transferred over the network;
- uncompressed bytes parsed in memory.

A small compressed file can expand greatly, so the Explorer limits the
uncompressed result as well as the response. Browsers may transparently
decompress HTTP content; files can also explicitly carry a `.gz` form.

## Integrity And Snapshots

A **cryptographic hash** such as SHA-256 is a short fingerprint calculated
from bytes. If the bytes change, the expected hash no longer matches.

Integrity metadata helps answer:

- Did the fetched artifact match the manifest?
- Did artifacts from two different snapshots get mixed?
- Can a frozen release be verified later?

It does not prove the content was correct at the source. It proves that the
bytes match the stated publication.

A **snapshot** is a coherent version of a pack. Mutable live URLs are
convenient, while immutable release assets are better for reproducibility.
The publication model can provide both.

## Byte-Range Release Packs

Static hosts and release systems can impose limits on file count or request
patterns. Several immutable artifacts can be concatenated into a larger pack.
An index records each artifact's offset and length.

An HTTP **Range** request asks for only those bytes. The Explorer verifies the
selected slice before parsing it. This keeps a static, immutable release usable
without downloading the entire pack for one record.

Range packs are an optimization and mirror. The logical artifact paths remain
the data contract.

## Registries

A registry is a discoverable list of bundle descriptors. It can provide
examples and labels, but it is not a central database through which every pack
must pass.

The Explorer can also remember recently entered bundle URLs in browser
storage. Registry entries and personal history help discovery; the bundle URL
remains the actual source selection.

## Provider Datapacks

A provider datapack attaches a governed snapshot or a bounded, reviewed
reference to records selected by declared rules.

It distinguishes:

- content included in the pack's snapshot;
- information reviewed from an external provider;
- known drift between those states;
- an action that deliberately opens or contacts the provider.

The Explorer must not silently present live external data as though it were
part of the governed snapshot.

## Failure Is Part Of The Contract

The interface needs useful states for:

- missing or invalid descriptors;
- unsupported schema versions;
- a missing shard;
- integrity mismatch;
- timeouts or CORS failure;
- decompression or parsing limits;
- stale snapshots;
- a source that has moved to a new descriptor.

Recovery should preserve enough context for the user to retry, inspect the
source or move to a documented target.

## Small Versus Large

| Concern | Small bundle | Large corpus |
|---|---|---|
| Entry point | Monolithic bundle JSON | Descriptor JSON |
| Initial content | All nodes and edges | Overview and pointers |
| Search | In-memory over loaded nodes | Prebuilt sharded index in a worker |
| Full record | Already present | Loaded after selection |
| Relationships | Loaded together | Whole-corpus chunks plus adjacency lookup |
| Best fit | Compact linked corpus | National catalogue or other large pack |

Neither is “more OKF.” They are publication shapes for different scales.

## Next

[Search, filters, facets and context](05-search-filters-facets-and-context.md)
explains the most important indexes and how their results should be
interpreted.
