# Federated OKF Bundle Wiki Architecture

Decision date: 11 July 2026. Status: implementation in progress.

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

## Current Migration

1. Land the profile, semantic parser, registry generator and constraints ledger.
2. Extend the Explorer identity and relationship contracts.
3. Extract UK Legislation, UK Government APIs and AI Infrastructure into
   independent repositories and Pages publications.
4. Rename this product repository to `okf-explorer` while preserving current
   URLs for a deprecation cycle.
5. Add full-corpus structural relationships, official legal-effects expansion,
   governed subject/citation/entity enrichment and optional trusted registries.

The detailed implementation decision and the legislation review that motivated
it are retained in the local Legislation OKF workspace review artifacts.
