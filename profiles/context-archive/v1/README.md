# Retained context archive v1

This optional delivery profile publishes explicitly approved, fixed evidence
examples. It is separate from the OKF Markdown core, semantic authoring and live
context assembly. An archive is neither an AI answer nor a new assertion graph.

## Inputs

[registry.schema.json](registry.schema.json) describes the reviewed publication
selection. Each case names an exact local package and observation receipt by
path, byte length and SHA-256. Packages may be canonical JSON or gzip-compressed
canonical JSON. Both compressed and uncompressed identities are retained.
`approved_publication` must be true. The exporter does not accept a question,
contact a server or find inputs by scanning directories.

`source_version`, `engine_id`, `original_engine_id`, `observation_kind` and the
publication note are declarations made by the registry's reviewer. Export
checks package and receipt bytes; it does not interpret every possible receipt
schema or independently prove these declarations. Keep an unknown original
engine null, even if a compatible assembler reproduced the same package.
Publication approval does not imply specialist acceptance of the evidence.

## Outputs and integrity

- `index.json`: `okf-context-archive-index.v1`; a small list of case IDs, titles,
  package hashes, descriptor paths and descriptor `{bytes, sha256}` references.
- `<package-sha256>/descriptor.json`: [archive.schema.json](archive.schema.json).
  Carries source and engine declarations, package identity, counts, budget,
  status and hash-linked catalogue, record-index and section references.
- `<package-sha256>/data/<sha256>.json`: a canonical JSON resource. Its opaque
  filename is the SHA-256 of its exact bytes. References contain only `bytes`
  and `sha256`; the client derives this fixed local path.
- Catalogue resources preserve `okf-context-manifest.v1` from the generic
  delivery helper. Record-index resources are arrays of `{id, text, metadata}`;
  `text` and `metadata` are ordered arrays of resource references.
- Section resources preserve `okf-context-read.v1`. Each stream is a complete
  ordered sequence for one section and, when applicable, one selected record.
  Validate offsets in UTF-16 code units and the final complete-content digest.
- `<package-sha256>/package.json`: the original canonical package, unchanged.
- `index.html`, `reader.mjs`, `shared.mjs`, `reader.css`: the static reader.
- `artifact-manifest.json`: `okf-context-archive-artifacts.v1`, binding every
  output except itself through `files: [{path, bytes, sha256}]`; also binds the
  registry and exact exporter/profile source files through `exporter_files`.

The HTML anchors its root index hash. A reviewed publication must independently
bind the HTML, scripts and artifact manifest, normally through its immutable
source commit and publication receipt. Hash checking detects changed bytes;
it does not authenticate a publisher that replaces the entire trust anchor.

## Bounds

At most 20 explicitly listed cases; at most 512 KiB, 200 selected records and
1,000 selected relationships per package. Each case has at most 1,024 files and
8 MiB of exported bytes. Catalogues and record-index pages have a 16 KiB limit;
descriptors and evidence resources have a 64 KiB limit. The root index is at
most 16 KiB and the outer artifact manifest at most 4 MiB. An adopting publisher
may set smaller case or aggregate bounds.

The reader performs sequential, on-demand requests, with a 15-second request
deadline, a 1,024-request limit and an 8 MiB transferred-byte ceiling per opened
example. It caches verified resources for that example only. It never follows
source URLs automatically. Source links are credential-free HTTP(S) links for
the user to open. Every selected value is fully reconstructed and hash-checked
before display; failure clears that value rather than presenting a partial
passage as complete evidence. Changing examples cancels the previous request.

No anonymous question is stored. No write-capable or model tool is introduced.
No missing evidence, authority or current applicability is inferred by export.

The current exporter also admits optional logical-unit metadata. Its explicit
15-file input inventory includes the unit validator and local evidence-unit
schema. It checks exact fragment integrity before writing an archive, and
preserves source spans in the complete record metadata. Earlier 13-file exporter
observations keep their original bytes and declared identities. Neither export
nor fragment validation independently verifies inclusion in the original PDF;
that remains the producer's source check.
