# Federated OKF Bundle Wiki Architecture

Decision date: 11 July 2026. Status: implemented in v0.4.0.

Production OKF bundles are independently versioned and independently published
units. The Explorer owns the generic application, profile/context, conformance
tooling, small fixtures and curated registry; registry entries point to bundle
descriptors rather than copying production corpora into the product repository.

Repository-per-bundle is the default when ownership, sources or release cadence
differ. A monorepo remains valid if every bundle builds and publishes through an
independent descriptor, manifest, release and stable URL.

## Semantic And Runtime Layers

Markdown YAML-LD frontmatter and `okf-bundle.yamlld` are the semantic authoring
layer. Builds publish an equivalent `okf-bundle.jsonld` and compile the current
Explorer JSON descriptor, manifests, search shards and adjacency indexes.

Large-corpus descriptors carry stable identity, version, publication status,
publisher, licence, profile and semantic-descriptor links. Relationship indexes
use deterministic UTF-8 FNV-1a hash buckets so selection hydrates one route's
adjacency without loading the corpus-wide edge table. Full relationship chunks
remain available for explicit corpus-wide analysis, subject to the Explorer's
documented memory cap.

The large-corpus descriptor may also advertise an optional integrity-bound
same-origin range-pack data plane. This is a transport extension, not a new
bundle shape: manifests, search references, record paths, relationship routes,
query parameters and hash deep links stay unchanged. The central Explorer and
its search worker resolve a logical shard through the validated v1 range index,
perform a bounded HTTP 206 read from the bundle's Pages origin, verify packed
and logical SHA-256 digests, then reverse transport and source compression.
The release index itself must carry a descriptor-bound SHA-256. Search startup
also validates the snapshot, exact versioned partition contracts, bounded
manifest cardinalities, canonical shard-metadata hash and every shard's
snapshot/hash/pack membership; adjacency loading rejects a mixed snapshot.
Bundles that publish ordinary files continue down the original direct-fetch
path. Registry projections remain descriptor registries and do not duplicate
or specialize a bundle's distribution metadata.

The Explorer continues to consume JSON during the migration. Arbitrary remote
context retrieval is not enabled in the browser. Contexts are allowlisted,
pinned locally and expanded during deterministic builds.

## Standard Public Contract

- `/` human landing page;
- `/okf-bundle.yamlld` canonical YAML-LD descriptor;
- `/okf-bundle.jsonld` JSON-LD equivalent;
- `/okf-explorer.json` Explorer runtime descriptor;
- `/data/manifest.json` counts, indexes and chunks;
- `/context/okf-bundle-v1.jsonld` pinned context;
- `/checksums.json` generated artifact integrity metadata.

Large bundles may keep curated Markdown documentation while source records live
in generated chunks and virtual routes. A standard bundle wiki does not require
one committed Markdown file per source record.

## Implemented Migration

1. Landed the profile, semantic parser, registry generator and constraints ledger.
2. Extended the Explorer identity and relationship contracts.
3. Extracted UK Legislation, UK Government APIs and AI Infrastructure into
   independent repositories and Pages publications.
4. Renamed this product repository to `okf-explorer`; the lightweight
   `ai-infrastructure-wiki` compatibility publication preserves former human
   routes and serves `okf-moved` descriptors for former machine entry points.
   Explorer v0.4.0 follows their `moved_to` targets transparently.
5. Added full-corpus structural relationships, official legal-effects expansion,
   governed subject/citation/entity enrichment and optional trusted registries.

An `okf-moved` document has this minimal contract:

```json
{
  "schema": "okf-moved.v1",
  "kind": "okf-moved",
  "moved_to": "https://canonical.example/okf-explorer.json"
}
```

The target may be relative to the compatibility document. Self-references and
missing targets are rejected.

The detailed implementation decision and the legislation review that motivated
it are retained in the local Legislation OKF workspace review artifacts.
