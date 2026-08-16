# Large-record narrative and source-access contract

Large-corpus producers can give an individual record an authored Narrative view
and can explicitly control how Explorer presents an external source. Both
contracts are additive to `okf-explorer-large-corpus.v1`.

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

- `link`: Explorer does not fetch the response and offers **Open official
  source**;
- `json`: Explorer requests JSON, parses it and offers summary, tree and raw
  views;
- `xml`: Explorer requests XML and displays the response as inert text; or
- `text`: Explorer requests text and displays the response as inert text.

Explorer never executes source markup and applies a 10 MB display limit. A
failed browser fetch leaves the official source link available. Source
responses are held only in page memory: Explorer does not snapshot, persist or
redistribute them.

The record-level `source_api_url` field remains supported as legacy JSON-only
behaviour. It cannot opt an XML, text or HTML response into the inline viewer;
producers must publish a typed resource instead.

This contract describes presentation, not authority. Producers remain
responsible for source identity, assertion provenance, jurisdiction, rights,
freshness and limitations.

## Further format-specific work

The current contract gives one resource one bounded display mode. Future work
tracked under [issue #76](https://github.com/chris-page-gov/okf-explorer/issues/76)
should retain, rather than replace, that safe baseline:

- allow a record to describe several representations of the same source with
  stable resource IDs, roles, media types and optional format profiles;
- select a renderer from the declared media type and profile, then validate the
  returned `Content-Type`, using a file extension only as a conservative
  compatibility fallback;
- distinguish an unavailable representation (`406`), missing resource (`404`),
  browser cross-origin restriction, invalid declared-format response and size
  limit in user-facing errors; and
- add regressions proving that CLML/XML is never sent through JSON parsing,
  point-in-time URLs keep their date, malformed XML fails safely, source markup
  remains inert and legacy JSON inspection still behaves as documented.

A specialist legislation view may reuse a typed XML representation, but its
provision tree, legal status and point-in-time interpretation remain a separate
domain contract rather than a generic consequence of `display_mode: xml`.
