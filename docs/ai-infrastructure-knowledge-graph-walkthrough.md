# Walk through the AI Infrastructure knowledge graph

Status: beginner walkthrough of the immutable AI Infrastructure OKF v0.6.0
release, checked 18 August 2026.

You do not need to download anything or know how to write code to start. The
same publication has three useful ways in:

| What you want to do | Where to start | Download needed? |
| --- | --- | ---: |
| Read the pages and follow links | [GitHub bundle index][github-index] | No |
| Search and explore relationships visually | [Published bundle][published-bundle] | No |
| Keep the files as a personal linked notebook | [Obsidian route](#open-the-bundle-in-obsidian) | Yes |

GitHub and the published Explorer work in an ordinary web browser. Obsidian
works with a folder on your computer, so that route starts by downloading one
frozen release. You do not need Git, a terminal or a GitHub account.

## What this example contains

The [AI Infrastructure OKF v0.6.0 release][release] contains:

- 142 subject-matter concepts;
- 13 index and navigation records; and
- 579 evidence-bearing directed relationship assertions.

The subject covers AI infrastructure, standards, federated systems, research
and UK public-sector implications. It is large enough to demonstrate a real
knowledge graph, but small enough to follow as a linked collection of pages.

The files deliberately serve different purposes:

| File or folder | What it is for |
| --- | --- |
| `index.md` | Human starting point and explanation of the linking method |
| `standards/`, `frameworks/`, `glossary/` and other folders | Small Markdown pages about individual concepts |
| `okf-bundle.yamlld` | Complete generated YAML-LD semantic graph |
| `okf-bundle.jsonld` | The same graph in JSON-LD for linked-data tools |
| `okf-bundle.json` | Search, reading and relationship projection used by OKF Explorer |
| `relationships.json` | Flattened rich relationship rows used by consumers |
| `semantic-validation.json` | Receipt recording what semantic material was validated |
| `checksums.json` | File inventory, sizes and digests for the published bundle |

Markdown with YAML-LD front matter is the reviewed source. The large YAML-LD,
JSON-LD and Explorer files are generated from it. They are different views of
one publication, not separate versions that a person must keep in step by
hand.

## Route 1: read it online in GitHub

This is the simplest route for a reader who wants to understand the files.

1. Open the [bundle index on GitHub][github-index].
2. Under **Contents**, open **Standards**.
3. Open **Model Context Protocol (MCP)**.
4. Read the metadata table at the top, then the ordinary prose below it.
5. Follow **Anthropic**, **Context Hub** or **Consent** to another Markdown
   page.
6. Use your browser's Back button to return.

GitHub turns the YAML front matter into a readable table. On the
[MCP concept page][github-mcp], the most important fields are:

- `@context`: the vocabulary used to interpret compact semantic names;
- `@id`: the concept's stable, global Internationalized Resource Identifier
  (IRI);
- `@type`: its semantic class;
- `type`, `title` and `description`: human-facing classification and labels;
- `sources`: where the information came from and the recorded source date;
  and
- ordinary Markdown links: connections that a person can follow in GitHub or
  Obsidian.

Select GitHub's **Code** view when you want to see the front matter as YAML
rather than as a table. The **Preview** view is better for normal reading.

You can also open the [complete YAML-LD graph][yaml-ld-graph] in GitHub. It is
a generated technical file of about 1.6 MB, so it is better for searching or
sampling than for reading from beginning to end.

## Route 2: explore it online without reading source files

Use this route to see how the same knowledge appears in an application.

1. Open the [published bundle landing page][published-bundle].
2. Select **Open in OKF Explorer**.
3. Enter `Model Context Protocol` in **Search nodes**.
4. Select **Model Context Protocol (MCP)**.
5. Read its description and source information in the details panel.
6. Select **Links** to see incoming and outgoing relationships.
7. Select a relationship to inspect its direction and evidence.
8. Try **Graph** to see the selected neighbourhood visually.
9. Use **Inspect** when you want the underlying record metadata.

The Explorer is not another source of truth. It is a consumer that makes the
published records and relationships easier to search, filter and inspect.

## Open the bundle in Obsidian

Obsidian is optional. Use it when you want a local notebook, backlinks, local
search and its graph view.

### Download the frozen release

1. Open the [v0.6.0 release page][release].
2. Find **Assets** at the bottom of the release.
3. Select **Source code (zip)**.
4. When the download finishes, double-click the ZIP file to unpack it.

The result is a normal folder. Downloading the ZIP does not install or run any
program from the repository.

### Open the right folder

1. Open Obsidian.
2. Choose **Open folder as vault**.
3. Find the unpacked release folder.
4. Select the `bundle` folder inside it, not the release folder itself.
5. Open `index.md` in the Obsidian file list.

The repository contains both its working source and a frozen publication copy.
Opening only `bundle` prevents both copies from appearing as duplicate notes.

Existing links work without changing any settings because the bundle uses
standard Markdown links. If you plan to add your own notes, open **Settings →
Files and links** and turn off **Use [[Wikilinks]]**. Obsidian will then create
portable Markdown links that also work in GitHub. Obsidian's
[internal-links guidance](https://help.obsidian.md/links) describes both link
formats and recommends Markdown links when interoperability matters.

Obsidian shows simple front-matter values as properties. Its properties editor
does not fully present nested structures such as `sources`, `authority`,
`evidence` and `rights`. To inspect the complete YAML, open **Settings → Editor
→ Properties in document** and choose **Source**. The official
[properties guidance](https://help.obsidian.md/properties) records the same
nested-property limitation.

Obsidian is a Markdown knowledge-base tool, not a YAML-LD or RDF processor. Use
its file list, search, backlinks and graph view for the Markdown layer. Inspect
`okf-bundle.yamlld` in GitHub or a text editor when you need the complete
semantic assertion graph.

## Follow one relationship from page to graph

The MCP page provides a useful worked example.

### 1. Start with the human page

The Markdown says that MCP was introduced by Anthropic and links to the
Anthropic page. A reader can follow that link without understanding RDF,
YAML-LD or OKF.

### 2. Identify the two things

The front matter gives each concept a global identity:

```text
MCP       https://chris-page-gov.github.io/okf-ai-infrastructure/id/standards/mcp
Anthropic https://chris-page-gov.github.io/okf-ai-infrastructure/id/organisations/anthropic
```

Those IRIs identify the things being discussed. Paths such as
`standards/mcp.md` are local routes used to open their pages. The project keeps
identity and navigation separate so a file can move without silently changing
what the concept means.

### 3. Project the Markdown link conservatively

The compiler turns the authored local link into the direct statement:

```text
MCP -- dcterms:references --> Anthropic
```

It does not guess a stronger predicate such as `createdBy` from the surrounding
sentence. A human-readable link establishes that one page references another;
it does not, by itself, prove a domain-specific relationship.

### 4. Record why the statement exists

The graph also contains an `okf:RelationshipAssertion` for the same statement.
That assertion records:

- a stable assertion IRI;
- source, predicate and target IRIs;
- the source and target routes;
- preferred and inverse labels;
- `normalized` assertion status and `real-world` scope;
- derived authority;
- the deterministic derivation rule and activity;
- observation time and freshness;
- a hash of the source Markdown evidence; and
- rights information.

The direct triple is convenient for linked-data tools. The reified assertion
explains why the publication contains that triple and what level of authority
it claims.

### 5. Notice the deliberate limitation

All 579 relationships in this release are conservative
`dcterms:references` projections with `normalized` status and derived
authority. The release is rich in identity, provenance, evidence and
governance, but it is not a domain ontology containing 579 different expert
claims.

The example assertion in `index.md` shows how a future source-backed domain
predicate can be authored explicitly. It must provide its own predicate,
authority, evidence, derivation, time, rights and matching local route. The
build rejects a partial or inconsistent assertion.

## What the other tools do

No single tool is expected to do every job.

| Tool or format | Its role | What it does not establish |
| --- | --- | --- |
| GitHub | Online reading, version history, review and frozen releases | That a semantic claim is true |
| Obsidian | Local Markdown reading, writing, search, backlinks and a note graph | RDF expansion, inference or schema validation |
| OKF Explorer | Human search, filtering, Reader, Links, Graph and evidence inspection | New semantic authority |
| YAML-LD | Human-readable linked-data representation and semantic publication | A friendly interface by itself |
| JSON-LD and RDF tools | Interchange, expansion, querying and graph processing | The project's local navigation experience |
| JSON Schema checks | Structural validation of every generated assertion | Truth, usefulness or good ontology design |
| Checksums and release receipts | Evidence that reviewed and published bytes match | That an external source remains current forever |
| MCP retrieval | Bounded machine access to selected records and evidence | Permission for an AI to invent or strengthen claims |

This separation is intentional. GitHub and Obsidian make the knowledge durable
and approachable. YAML-LD and JSON-LD make identities and relationships
explicit. Explorer makes them usable for people. Validation and release tools
show which exact material passed the declared checks. MCP can expose a bounded
part of that material to an AI without loading the whole bundle.

## A 10-minute guided review

If you are showing the work to somebody else, use this order:

1. **Two minutes:** open the [GitHub index][github-index] and explain that the
   bundle is a folder of linked Markdown pages.
2. **Two minutes:** open the [MCP page][github-mcp] and point out `@id`,
   `@type`, sources and ordinary links.
3. **Three minutes:** open the [published bundle][published-bundle], enter the
   Explorer, search for MCP and switch to **Links**.
4. **Two minutes:** open one generated assertion in the
   [YAML-LD graph][yaml-ld-graph] and identify its triple, evidence, authority
   and rights.
5. **One minute:** open the [validation receipt][validation-receipt] and explain
   that structural validation and publication integrity are evidence about the
   build, not proof that every statement is true.

The intended conclusion is not “Markdown has secretly become RDF”. It is:

> People can read and link small Markdown pages, while a deterministic build
> gives those pages stable semantic identity and publishes inspectable,
> evidence-bearing graph assertions for other tools.

[github-index]: https://github.com/chris-page-gov/okf-ai-infrastructure/blob/v0.6.0/bundle/index.md
[github-mcp]: https://github.com/chris-page-gov/okf-ai-infrastructure/blob/v0.6.0/bundle/standards/mcp.md
[published-bundle]: https://chris-page-gov.github.io/okf-ai-infrastructure/
[release]: https://github.com/chris-page-gov/okf-ai-infrastructure/releases/tag/v0.6.0
[validation-receipt]: https://github.com/chris-page-gov/okf-ai-infrastructure/blob/v0.6.0/bundle/semantic-validation.json
[yaml-ld-graph]: https://github.com/chris-page-gov/okf-ai-infrastructure/blob/v0.6.0/bundle/okf-bundle.yamlld
