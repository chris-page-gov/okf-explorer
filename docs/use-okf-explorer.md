# Use The OKF Explorer With Your Own Bundle

This manual shows the fastest path from a folder of Markdown notes to a public
OKF bundle that can be opened in the hosted Svelte OKF Explorer.

For the current role-based documentation set, start with
[docs/index.md](index.md). For UI behaviour with screenshots, use the
[illustrated persona manual](okf-explorer-persona-manual.md). For AI prompting,
use [ai-okf-usage.md](ai-okf-usage.md). For bundle authoring, use
[okf-bundle-authoring.md](okf-bundle-authoring.md).

For geography-led browsing, begin with the
[Map personas and user stories](geospatial-map-personas-and-user-stories.md),
then follow the [illustrated Map manual](geospatial-map-manual.md). The
[Map exploration contract](geospatial-map-exploration.md) explains the
classification and recovery rules behind the interface.

## Try The Large CKAN Example

Open this URL first:

[GOV.UK CKAN OKF bundle in the hosted Svelte Explorer](https://chris-page-gov.github.io/okf-explorer/?bundle=https%3A%2F%2Fchris-page-gov.github.io%2Fai-engineering-lab-hackathon-london-2026%2Fgov-ckan%2Fokf-explorer.json&view=reader#overview)

It loads the Svelte Explorer from this repository and the GOV.UK CKAN
large-corpus descriptor from another repository:

```text
Explorer:
https://chris-page-gov.github.io/okf-explorer/

Bundle descriptor:
https://chris-page-gov.github.io/ai-engineering-lab-hackathon-london-2026/gov-ckan/okf-explorer.json
```

The important idea is that the Explorer and the bundle do not need to live in
the same repository. Any public HTTPS OKF bundle URL can be supplied in the
`bundle=` query parameter.

```mermaid
flowchart LR
  Explorer["Hosted Svelte OKF Explorer<br/>ai-infrastructure-wiki/next/"]
  Descriptor["External bundle descriptor<br/>gov-ckan/okf-explorer.json"]
  Data["Chunked static data<br/>data/overview.json<br/>data/search/*<br/>data/analysis/overview.json"]
  Browser["Your browser"]

  Browser --> Explorer
  Explorer --> Descriptor
  Descriptor --> Data
```

## What You Should See In The CKAN Example

1. Reader opens with a lightweight overview of the GOV.UK CKAN corpus.
2. The left panel contains search and facets such as publisher, controlled
   topic, format, tag, licence, host, resource type, and update year.
3. Searching for `IAPT` reduces the Reader and Graph views to relevant datasets.
4. Graph shows a bounded context, node-type key, zoom controls, and relationship
   labels without loading every relationship first.
5. Links opens relationship summaries first. Selecting a relationship summary
   opens the right-hand data card with direction, source, target, count, and
   JSON detail.
6. Map classifies the current search/facet reduction from declared coverage,
   coordinates, UK place names, ArcGIS/OGC services and spatial file formats.
   Its place/evidence chips add a `geo=` reduction to the public URL.

## Use The Map Canvas

Map works with existing bundles; no AI, geocoder, tile service or new server is
required for browsing.

1. Search or apply ordinary facets first so Map starts from a useful context.
2. Select **Map**. A large corpus loads its ordinary dataset/resource index and
   classifies it locally; a small bundle reuses its in-memory nodes.
3. Select an evidence chip such as **Map or feature service** or a recognised
   UK area such as **Scotland**. The same reduction then applies if you switch
   to Reader, Graph, Timeline or Resources.
4. Select a marker or list row to open the normal Explorer detail card. Solid
   markers are source coordinates; ring markers are labelled representative
   centroids and do not imply a boundary.
5. Use **Open source ↗** for every linked spatial resource. For direct GeoJSON,
   OGC API JSON or an ArcGIS feature service, **Preview on demand** attempts a
   bounded browser-side feature preview. Failure leaves the local metadata and
   source link intact.

The preview does not insert credentials or proxy private services. WMS, WFS,
WMTS, WCS, KML, GML, Shapefile and GeoPackage are discoverable and filterable,
but this prototype links rather than parses those bodies. See
[Geospatial Map exploration](geospatial-map-exploration.md) for the evidence,
CRS, provenance and pack-builder conventions.

## Large-Corpus Enrichment Contract

The GOV.UK CKAN example is not just a raw CKAN dump. The builder generates a
large-corpus OKF model designed for AI agents and human exploration:

- Stable concept identifiers: datasets expose logical paths such as
  `datasets/<publisher>/<package>.md`, publishers expose
  `publishers/<publisher>.md`, and resources expose
  `resources/<package>/<position>-<resource>.md`.
- Canonical licences: variants such as `not specified`, `not-specified`, and
  `notspecified` collapse to `not-specified`; OGL variants such as `uk-ogl`,
  `OGL-UK-3.0`, and `ogl` collapse to `open-government-licence-v3`.
- Licence inference: source-declared licences are preferred. Where an official
  provider has clear site-wide terms, missing source metadata can be filled with
  an inferred licence only when the generated record exposes the inference
  basis, source URL, and lower confidence. The UK Government APIs exemplar uses
  this for ONS records without CKAN licence fields, citing
  [ONS terms and conditions](https://www.ons.gov.uk/help/terms-conditions#using-ons-content).
  It also derives an Ordnance Survey licence-required status for OS
  provider-native API records from
  [OS licensing guidance](https://www.ordnancesurvey.co.uk/licensing), rather
  than treating OS APIs as OGL by default.
- Canonical formats: variants such as `CSV`, `.csv`, and `text/csv` collapse to
  `CSV`; `PDF`, `.pdf`, and `application/pdf` collapse to `PDF`.
- Publisher authority records: one canonical publisher record is generated per
  CKAN organization, and datasets reference that publisher concept.
- Richer relationships: the bundle can expose `published by`, `publisher
  authority`, `download resource`, `API endpoint`, `documentation`, `licence`,
  `maintainer`, `temporal coverage`, `spatial coverage`, `derived from`, and
  `supersedes` relationships where source metadata supports them.
- Controlled topics: raw CKAN tags are supplemented with higher-level topics
  such as Transport, Planning, Environment, Public Health, Education,
  Consultation, Finance, Housing, Geospatial, and Business And Economy.
- Quality signals: each dataset receives deterministic metadata scores for
  completeness, licence confidence, update recency, resource availability, API
  availability, and format confidence. Download success is recorded as
  `not checked` because the static generator does not download resource bodies.
- Provenance: generated concepts record CKAN package ID, CKAN name, source API
  URL, harvest timestamp, generation timestamp, enrichment version, and
  transformation pipeline version.

These fields are visible in the Explorer detail card after opening a dataset,
resource, or publisher. They are also present in the local normalized JSON for
agent use.

## URL Patterns

Small or medium bundles use one generated file:

```text
https://chris-page-gov.github.io/okf-explorer/?bundle=ENCODED_OKF_BUNDLE_URL
```

Large corpora use a descriptor that points at chunked static data:

```text
https://chris-page-gov.github.io/okf-explorer/?bundle=ENCODED_OKF_EXPLORER_DESCRIPTOR_URL
```

For large public bundles hosted on GitHub Pages or another static CDN, keep
chunk files comfortably below the Explorer's 64 MiB response cap and expect the
browser to hydrate records lazily. The Explorer loads full record chunks in
small batches and retries transient CDN/server responses such as HTTP 503, so a
facet click should not create a large parallel request burst against the host.

Example for a small bundle:

```text
Bundle:
https://example.github.io/my-okf/okf-bundle.json

Explorer URL:
https://chris-page-gov.github.io/okf-explorer/?bundle=https%3A%2F%2Fexample.github.io%2Fmy-okf%2Fokf-bundle.json
```

If URL encoding is confusing, open the Explorer without a `bundle=` parameter
and paste the bundle URL into the Bundle URL field:

```text
https://chris-page-gov.github.io/okf-explorer/
```

## Create A Small OKF Bundle From Markdown

Use this path for most wiki-sized projects.

```mermaid
flowchart TD
  Notes["Markdown notes<br/>with YAML frontmatter"]
  Assistant["AI coding assistant<br/>Codex or similar"]
  Builder["scripts/build_okf_bundle.py"]
  Bundle["okf-bundle.json"]
  Pages["GitHub Pages"]
  Explorer["Hosted Svelte OKF Explorer"]

  Notes --> Assistant
  Assistant --> Builder
  Builder --> Bundle
  Bundle --> Pages
  Pages --> Explorer
```

### 1. Start From This Repository

Fork or clone `ai-infrastructure-wiki`.

Keep:

- `scripts/build_okf_bundle.py`
- `scripts/update_viewer.py`
- `scripts/check_okf.py`
- `scripts/build_site.py`
- `okf.config.json`
- `.github/workflows/pages.yml`
- `apps/okf-explorer/`
- `explorer/`

Then add or replace the Markdown corpus with your own notes.

Each OKF Markdown file should have YAML frontmatter like this:

```markdown
---
type: "Concept"
title: "Example concept"
description: "One sentence explaining this node."
tags: [example, okf]
timestamp: 2026-07-06T00:00:00Z
---

# Example concept

This concept links to [another concept](another-concept.md).
```

Keep links as browser-compatible Markdown links. Do not use Obsidian-only
wikilinks.

The Explorer preserves more than the frontmatter summary for these small
bundles:

- generated `edges` and legacy `relationships` both feed Graph and Links;
- Search includes the Markdown `body` text;
- selecting a result renders its Markdown body with raw HTML escaped;
- safe HTTP(S) source and resource links open on demand in a new tab; and
- selected Schema.org/provenance fields appear above a disclosure containing
  the full normalized node JSON.

Relative Markdown and resource links resolve from the public bundle URL.
Credential-like URL query parameters are removed from displayed links. Never
publish a bundle containing a secret, even if the Explorer would redact it.

### 2. Ask A Coding Assistant To Normalize The Bundle

Paste this prompt into Codex or another coding assistant while it is opened in
your repository:

```text
You are working in a repository that should publish an Open Knowledge Format
bundle for the Markdown files in this repo.

Goal:
- Treat Markdown files as the source of truth.
- Build a small OKF bundle at okf-bundle.json that can be loaded by the hosted
  Svelte OKF Explorer.
- Keep browser-compatible Markdown links. Do not introduce Obsidian wikilinks.
- Preserve existing prose unless a frontmatter or link fix is needed.

Tasks:
1. Inspect the Markdown corpus and identify the folders that should be included.
2. Update okf.config.json so it describes this corpus, including siteTitle,
   corpus id, title, subtitle, root file, sourceRoot, markdownUrl, and section
   order.
3. If scripts/update_viewer.py has a fixed list of OKF folders, update that list
   to include the corpus folders and exclude generated or private folders.
4. Ensure every included Markdown file has YAML frontmatter with at least:
   type, title, description, and timestamp.
5. Fix broken relative Markdown links.
6. Run:
   python3 scripts/build_okf_bundle.py
   python3 scripts/update_viewer.py
   python3 scripts/check_okf.py
   python3 scripts/build_site.py
7. Report the generated bundle URL I should use after GitHub Pages is published.

Acceptance:
- okf-bundle.json is generated and committed.
- viewer.html is synchronized if the legacy viewer is retained.
- _site/ is generated locally but not committed.
- The repository can publish with GitHub Pages using GitHub Actions.
```

For a very large dataset, ask the assistant for the large-corpus path instead:

```text
This corpus is too large for one okf-bundle.json file. Build the
okf-explorer-large-corpus.v1 descriptor path instead:
- okf-explorer.json
- data/manifest.json
- data/overview.json
- data/analysis/overview.json
- chunked dataset/resource/relationship files under data/
- static search shards under data/search/

Keep startup overview-only, load search through static shards, and avoid any
runtime server dependency.
```

### 3. Validate Locally

Run the checks before publishing:

```sh
python3 scripts/build_okf_bundle.py --check
python3 scripts/update_viewer.py --check
python3 scripts/check_okf.py
python3 scripts/build_site.py
```

If you are also editing the Svelte Explorer itself:

```sh
cd apps/okf-explorer
pnpm install
pnpm check
pnpm build
```

For a normal bundle-only project, you do not need to build the Svelte Explorer.
You can use the hosted Explorer from this repository.

### 4. Publish With GitHub Pages

1. Push your repository to GitHub.
2. In repository settings, enable GitHub Pages with **GitHub Actions** as the
   source.
3. Push to `main` and wait for the Pages workflow to deploy.
4. Confirm that your bundle is public:

```text
https://YOUR-GITHUB-USER.github.io/YOUR-REPO/okf-bundle.json
```

For a large corpus, confirm the descriptor is public:

```text
https://YOUR-GITHUB-USER.github.io/YOUR-REPO/okf-explorer.json
```

### 5. Open Your Bundle In The Hosted Explorer

Paste the public bundle URL into:

```text
https://chris-page-gov.github.io/okf-explorer/
```

Or build a direct link:

```text
https://chris-page-gov.github.io/okf-explorer/?bundle=ENCODED_PUBLIC_BUNDLE_URL
```

You can encode a URL in a browser console:

```js
encodeURIComponent('https://YOUR-GITHUB-USER.github.io/YOUR-REPO/okf-bundle.json')
```

## Add Your Bundle To The Registry

To make the Explorer suggest your bundle while people type in the Bundle URL
field, add an entry to `okf-registry.json`:

```json
{
  "id": "my-okf",
  "label": "My OKF bundle",
  "url": "https://YOUR-GITHUB-USER.github.io/YOUR-REPO/okf-bundle.json",
  "kind": "external-bundle",
  "description": "Short description of the bundle."
}
```

For a large corpus, use the descriptor URL and a `kind` such as
`large-corpus`.

## Troubleshooting

- If the Explorer says it cannot load the bundle, check that the URL is public
  HTTPS and opens directly in a browser.
- If a file picker works but a URL does not, the bundle is probably not
  published to GitHub Pages yet.
- If graph or link views are slow, the bundle may need the large-corpus
  descriptor path rather than one monolithic JSON file.
- If Graph and Links are empty for a hand-built small bundle, emit either a
  top-level `edges` array (the generator form) or `relationships` array. Do not
  split relationships between both names.
- If search works locally but not after publishing, confirm that all generated
  `data/search/*` files are included in the deployed site.
- If browser navigation loses the bundle, copy the route again from the
  Explorer after the bundle has loaded.
