# Large-record narrative and source-access contract

Large-corpus producers can give an individual record an authored Narrative view
and can explicitly control how Explorer presents an external source. Both
contracts are additive to `okf-explorer-large-corpus.v1`.

## Record type label

The detail badge uses the first nonblank string in `record_type`, then `type`.
It preserves the producer's wording and case. If neither field supplies a usable
label, Explorer uses the collection's singular record label as before. This
applies both to a search summary and to the full record after loading.

For example, a mixed collection can show “Research Protocol” and “Dataset” on
individual records. Explorer does not infer a type from a URL or source family,
and a type label does not confer authority or review status. Labels are rendered
as text, so source markup cannot become executable interface content.

## Record narrative

A hydrated record may publish `narrative`:

```json
{
  "narrative": {
    "title": "Apply within the enclosing process",
    "body": "Repository-authored **Markdown** explaining context and boundaries.",
    "process": { "route": "process/example", "label": "Example process" },
    "previous": [{ "route": "episode/before", "label": "Before" }],
    "next": [{ "route": "episode/after", "label": "After" }],
    "variants": [{ "route": "variant/scotland", "label": "Scotland" }],
    "related": [{ "route": "dataset/related", "label": "Related route" }]
  }
}
```

`body` is required when `narrative` is present. Explorer passes it through its
safe Markdown renderer. Route links are optional and use the same governed
routes as graph, search and record-locator indexes. When a selected record has
this contract, Narrative shows it before any corpus-level reduction summary.

## Typed source access

A resource may publish one `source_access` object:

```json
{
  "source_access": {
    "url": "https://publisher.example/service.xml",
    "label": "Official service response",
    "media_type": "application/xml",
    "display_mode": "xml"
  }
}
```

All four fields are required. `display_mode` is one of:

- `link`: Explorer does not fetch the response. The open-link label uses the
  producer's supplied source label and does not add an official-source claim;
- `json`: Explorer requests JSON, parses it and offers summary, tree and raw
  views;
- `xml`: Explorer requests XML and displays the response as inert text; or
- `text`: Explorer requests text and displays the response as inert text.

Explorer never executes source markup and applies a 10 MB display limit. A
failed browser fetch leaves the official source link available. Source
responses are held only in page memory: Explorer does not snapshot, persist or
redistribute them.

For older bundles, the record-level `source_api_url` field still accepts JSON
APIs. Recognised file extensions use a conservative fallback. XML and CLML
open as inert XML, CSV and TSV open as inert text, and PDF, RDF and HTML give a
source link. A legislation work with the same official CLML URL in both the
structure field or CLML manifestation and the legacy field uses **Explore
official text** and **Open official XML**. For a dated, enacted or made
manifestation, the official version and provision links retain that version.
New producers should declare a typed resource.

Legislation works can carry up to 16 inline `source_representations` using
the existing resource fields and `source_access`. Give each resource a stable
`id`, its parent `dataset` and a human-readable title. The official CLML
representation uses `resource_type: authoritative-structure`,
`content_profile: https://www.legislation.gov.uk/schema/legislation`,
`media_type: application/xml` and `display_mode: xml`. Put the profile
and optional `representation_version` and `retrieval_mode` inside
`source_access`. Preserve the provenance and exact official expression.
The legislation viewer checks the work, the requested version and language,
and the returned media type before opening the provision tree.
If the record URL is itself a dated expression, the viewer labels its link
**Open this official version** and retains the separate official identifier.

## Bounded references for a selected record

Large bundles may declare an optional `record_resources` entry point in both
the descriptor and data-manifest indexes. Both declarations must bind the same
relative JSON path, exact byte length and SHA-256 digest. This is independent
of the corpus-wide resource chunks and requires the existing record locator.
Older bundles retain their existing resource-index behaviour.

The entry point identifies an `okf-record-resource-index.v1` object with the
bundle's exact `snapshot`, `algorithm: fnv1a32-prefix-2`, and at most 256 `buckets`.
Each bucket has its own byte and digest binding. Its JSON maps an exact record
route to an entry such as:

```json
{
  "dataset": "example/one.md",
  "count": 1,
  "chunks": [{
    "path": "references/shared.json",
    "bytes": 512,
    "sha256": "<64 lower-case hexadecimal characters>",
    "rows": [0]
  }]
}
```

The bucket key is the first byte of the unsigned FNV-1a 32-bit hash of the
UTF-8 record route, written as two lower-case hexadecimal characters. Shared
chunks contain JSON resource arrays; `rows` selects only this record's entries.
The chunk's complete hash and length are checked before those rows are used.
Selected IDs must be unique local identifiers using letters, digits, `.`, `_`,
`~` or `-`; each resource must name the resolved record's exact `dataset` name.
A resource's optional route must equal `resource/<id>`. If the loaded record
advertises `resource_count`, it must match the selected count. Omitting a record
with a positive advertised count is an error, not evidence of zero references.

For one record, Explorer accepts at most 16 chunks, 256 selected resources and
2 MiB of shared chunk bytes. A shared chunk may contain at most 1,024 rows.
The index is limited to 256 KiB and a bucket to 1 MiB. These files must be
uncompressed JSON. Route and shared-chunk caches are finite, and failed loads
can be retried without retaining the failed promise.
Release-pack transport gzip remains supported for identity JSON members. The
logical length must equal the reference's declared length; transport may add
at most 64 KiB, and decompression stops at the declared logical length.

Reader and selected-record Resources views load these references without
hydrating the whole corpus. Hydrated titles also label native record routes
whose kind is not `dataset`, subject to any declared endpoint-label registry.
Reader hash navigation and browser history use the same bounded record and
reference loading as the first page load.
When this contract is declared, an empty or failed
reference load does not activate the legacy `source_api_url` fallback.
Link-only references may state `media_type: not-established` when no response
media type has been evidenced. This is not a downloadable-data or access-rights
claim, and Explorer does not fetch those source URLs.

This contract describes presentation, not authority. Producers remain
responsible for source identity, assertion provenance, jurisdiction, rights,
freshness and limitations.

## Format selection and failure messages

The current contract gives one resource one bounded display mode. Inline
inspection and the official legislation viewer check the response's media type
before parsing. They accept a missing type or plain text for older servers
and name the expected and returned types when they disagree. Declared CSV and
TSV previews check that the server returns the corresponding text format.
The preview explains unavailable formats (HTTP 406), missing versions (HTTP
404), timeouts and invalid responses. A browser request failure can have
several causes, including the connection or the publisher's cross-origin
policy. The original source link remains available.

Legislation records can declare several representations with stable resource
identifiers. The specialist legislation view checks the authoritative role,
CLML profile and exact official version before offering its provision tree.
General XML previews show inert source text. CSV and TSV previews show
bounded text, and the local table inspector checks a user-selected package.
PDF and other link-only representations retain their labelled publisher
links. The legislation producer tracks its typed Reader release and
point-in-time verification in
[issue #76](https://github.com/chris-page-gov/okf-explorer/issues/76).
