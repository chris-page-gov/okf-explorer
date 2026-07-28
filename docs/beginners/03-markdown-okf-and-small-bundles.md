# Markdown, OKF And Small Bundles

The repository's original research corpus starts as Markdown. This keeps the
material reviewable by people while allowing a builder to create a graph and a
machine-readable bundle.

## Markdown

Markdown is plain text with lightweight notation:

```markdown
# Monthly House Prices

Published by the [Example Statistics Office](../organisations/example.md).

## Terms

- [Provenance](../glossary/provenance.md)
```

The file is readable without special software. Headings structure the
document, and ordinary browser-compatible links connect it to other files.

The project deliberately avoids editor-specific wiki link syntax so the links
also work on GitHub and the published website.

## Frontmatter

Many corpus files begin with YAML-like metadata between `---` lines:

```yaml
---
type: "Dataset"
title: "Monthly House Prices"
description: "A monthly index of residential property prices."
tags: [housing, prices]
status: "stable"
generated:
  by: "human:example-curator"
  at: "2026-07-01T00:00:00Z"
sources:
  - id: "https://example.org/catalogue/monthly-house-prices"
---
```

This is called **frontmatter**. It gives the builder structured values without
hiding the human explanation in a database.

Typical fields include:

- `type` — the kind of record;
- `title` — its human name;
- `description` — a short summary;
- `tags` — discovery terms;
- `generated` — who or what produced this representation and when;
- `sources` — structured source and provenance information;
- `status` — lifecycle state.

A field being present does not by itself make it correct. Its meaning,
authority and validation rules still need documentation.

The root `index.md` declares OKF v0.2 for the canonical corpus. Nested index
files and `log.md` have reserved, lightweight Markdown structures. The
Explorer still accepts v0.1 `timestamp`, body citation and verification forms,
but labels those as compatibility fallbacks.

## Records, Nodes And Relationships

The same item has several names depending on the task:

- **document** emphasizes the Markdown page;
- **record** emphasizes the described item and its fields;
- **node** emphasizes its position in a graph.

A Markdown link from one known corpus file to another becomes a directed
relationship. If page A links to page B, the graph records A as the source and
B as the target. The Explorer can calculate “referenced by” links in the
opposite direction without changing the original files.

Direction matters. “A references B” is not automatically the same claim as “B
references A.”

## Stable IDs And Routes

Every node needs an identifier so links, search results and saved URLs can
refer to the same thing.

For the small corpus, a normalized file path is a practical starting point:

```text
standards/openapi.md
```

The builder also creates route aliases where compatibility requires them.
Renaming a source file can therefore be a data migration, not merely tidying
the folder.

An identifier should be:

- unique within its stated scope;
- stable for as long as others may refer to it;
- independent of the label where labels can change;
- safe to use in a URL.

## The Small-Bundle Shape

A simplified small bundle looks like this:

```json
{
  "okf_version": "0.2",
  "nodes": {
    "standards/openapi.md": {
      "title": "OpenAPI",
      "type": "Standard",
      "body": "..."
    }
  },
  "relationships": [
    {
      "source": "stack/contracts-and-interfaces.md",
      "target": "standards/openapi.md",
      "kind": "references"
    }
  ]
}
```

The real bundle includes corpus metadata, normalized sections, aliases and
other compatibility fields. The important point is that all records and
relationships can be loaded together.

The generated JSON is an Explorer projection. The Markdown tree is the OKF
core publication and remains the source of truth.

## From Source To Bundle

The small-bundle builder:

1. reads `okf.config.json`;
2. follows the configured corpus root and sections;
3. parses frontmatter and Markdown;
4. normalizes record fields;
5. resolves links to known files;
6. creates directed relationships;
7. writes deterministic JSON.

“Deterministic” means the same valid source state should produce the same
ordered content rather than changing arbitrarily between builds. Stable output
is easier to review, cache and verify.

The generated `okf-bundle.json` is a publication artifact. The Markdown
remains the source of truth, so a correction belongs in Markdown and is then
regenerated.

## Compatibility Normalization

Older bundles may use different names:

- `relationships` or `edges`;
- records inside a named corpus or at the top level;
- `kind`, `type` or `label` for a relationship's display text.
- v0.1 `timestamp` instead of structured `generated.at`;
- body citations instead of structured `sources`.

The small-bundle loader normalizes compatible variants into one internal
corpus shape. Compatibility is useful, but it has limits: normalization
should not guess semantic identity that the pack did not state.

Chapter 17 explains the v0.2 trust, lifecycle and passive attestation fields
in detail.

## Markdown Is Content, Not Permission

Markdown can contain links, images, tables and code-like text. A remote bundle
is untrusted input from the browser's point of view.

The Explorer must:

- escape or safely render HTML-like content;
- limit expensive input;
- avoid treating text as executable code;
- make external destinations visible;
- preserve readable fallback text when a richer presentation is unavailable.

The presence of a Mermaid-like diagram or Markdown table does not authorize
arbitrary scripts.

## JSON, YAML And YAML-LD

These related formats serve different jobs:

- Markdown is the main human-authored narrative;
- frontmatter uses a YAML-compatible notation for metadata;
- JSON is the browser-friendly generated runtime form;
- YAML-LD is used for selected semantic source documents that are converted to
  JSON-LD.

YAML permits features and implicit conversions that can surprise readers.
The semantic tooling therefore uses a defined parser and rejects unsupported
representations. A file extension does not remove the need for a precise data
contract.

## When One File Stops Being Enough

A monolithic bundle is attractive because it is easy to inspect and move. It
becomes a problem when:

- the initial download is too large;
- search needs only a tiny portion of each record;
- one selected record has large resources;
- relationships form a much larger graph than the visible focus;
- data updates would invalidate one enormous cached file.

The answer is not to abandon static publication. It is to publish a descriptor
and several bounded artifacts, which is the subject of
[Large corpora and progressive loading](04-large-corpora-and-progressive-loading.md).

## Try It Mentally

For any Markdown page, ask:

1. What real-world or conceptual thing does this record describe?
2. Which metadata is directly asserted in the file?
3. Which links become outgoing relationships?
4. What stable identifier will survive a title edit?
5. Which generated files must change if the source changes?

Those questions separate authoring convenience from the durable data model.
