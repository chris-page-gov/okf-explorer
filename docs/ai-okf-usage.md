# Use An AI With An OKF Pack

An OKF pack is useful to an AI because it separates source material, generated
records, relationships, provenance and UI analysis. The instruction to the AI
should be explicit: answer from the pack, cite the route/source/provenance, and
do not treat inferred metadata as assurance.

## What To Give The AI

For a small bundle, give the AI:

- the public `okf-bundle.json` URL;
- the repository URL if Markdown source is needed;
- the question;
- any required output format.

For a large corpus, give the AI:

- the `okf-explorer.json` descriptor URL;
- permission to read the descriptor, `data/manifest.json`, `data/overview.json`,
  `data/analysis/overview.json`, search shards and only the record chunks
  needed for the question;
- a requirement to cite record `route`, `source_adapter`, `source_tier`,
  `confidence`, `license_basis`, standards-alignment fields and source URLs
  where available.

## Large JSON Graphs Are Still Semantic Data

A large OKF publication does not need one giant Turtle or JSON-LD document for
an AI to traverse it. The public descriptor and vocabulary define the semantic
contract; chunked JSON carries the operational records and assertions with
stable source and target routes, predicates, authority, derivation and
evidence.

This separation is deliberate:

- RDF/YAML-LD/JSON-LD describes the governed semantic contract and the parts
  explicitly published as RDF;
- the large-corpus manifests, static search postings and adjacency shards make
  hundreds of thousands of records practical to query;
- an AI or browser follows declared entry points and loads only the relevant
  shards;
- absence from the RDF descriptor does not mean that a compact JSON assertion
  is absent or meaningless.

Do not claim that every corpus record is RDF-materialized when only the
descriptor graph is. Equally, do not describe the operational JSON graph as
inaccessible to AI merely because it is not duplicated into one monolithic RDF
file.

## Prompt Template

```text
You are answering from an Open Knowledge Format pack.

Pack descriptor:
PASTE_DESCRIPTOR_OR_BUNDLE_URL

Rules:
- Read the descriptor or bundle first.
- For a large corpus, use overview and search shards before loading full record
  chunks.
- Answer only from records and relationships in the pack unless I explicitly
  ask for external research.
- Distinguish declared, observed, inferred and missing metadata.
- Cite record routes and source URLs.
- If the pack records a licence/access/contract gap, say it is a metadata gap,
  not proof that the API is unusable.
- If the question asks about DCAT/OpenAPI export, use `dcat_type`,
  `openapi_type`, `dcat_export_status`, `openapi_export_status` and
  `standards_alignment.*.required_missing`. Do not call a record conformant
  unless the pack includes a generated and validated standards artefact.
- Do not expose or invent credentials. Do not call live APIs unless I ask and
  credentials are provided outside the OKF pack.

Question:
PASTE_QUESTION
```

## Efficient Large-Corpus Read Order

1. Read `okf-explorer.json` for schema, title, counts and entry points.
2. Read `data/overview.json` for overview cards, generated warnings, top
   concepts and the analysis entry point.
3. Read `data/analysis/overview.json` for facet vocabulary, quality hints,
   source tiers, standards-alignment summaries and pack warnings.
4. Use `data/search/manifest.json` and relevant search shards for term lookup.
5. Load only the `apis-*.json`, `resources-*.json` or `relationships-*.json`
   chunks containing selected records or relationships.
6. Use `concept_id` to link back to generated Markdown records when a concise
   human-readable concept page exists.

## Copy-Ready UK Legislation Demonstration

Give a code-capable AI this prompt:

```text
Use the UK Legislation OKF as a progressively loaded machine-readable pack.

Descriptor:
https://chris-page-gov.github.io/okf-uk-legislation/okf-explorer.json

Task:
1. Read the descriptor first and follow only its declared entry points.
2. Report the operational bundle release, snapshot and relationship counts
   from that descriptor. If a linked semantic representation declares a
   different bundle version, report the publication inconsistency and identify
   that representation as stale rather than treating both as valid or silently
   combining them.
3. Use the static jurisdiction filter posting to find works indexed with the
   Scotland territorial publication context. Do not describe that context as
   provision-level legal extent or applicability.
4. Select one returned legal-work route.
5. Load that route's core assertions from the declared
   `relationship_adjacency` manifest and its hash-selected adjacency shard.
6. Resolve the same route through the declared `record_locator`. If the
   descriptor declares governed `model_enrichment_v3`, use the route's record
   chunk index to load the same-index accepted v3 chunk and retain rows whose
   source or target is the selected route. Do not substitute historical
   enrichment or load the whole record or relationship corpus.
7. List each returned source → predicate → target assertion and distinguish
   official, deterministic-derived and model-assisted authority.
8. Cite every public URL and route used. State any relationship layer that is
   not route-indexed rather than implying it was checked.
```

The corresponding Explorer journey is:

1. open the descriptor in Explorer;
2. filter **Jurisdiction** to **Scotland**;
3. open the Scotland card to see the exact match total and bounded loaded
   preview;
4. choose **Graph related records** or **View related legal works**;
5. select one legal work to load its core adjacency shard and the aligned,
   accepted model-enrichment chunk when that governed layer is declared.

Facet membership and legal-work assertions are different things. The Scotland
card uses an exact snapshot-bound filter posting and labels the link as derived
navigation metadata. A legal-work card uses the route-scoped relationship
adjacency. The browser never needs to hydrate all corpus relationships.

The two bounded relationship paths are separate. Core assertions use the
descriptor's `relationship_adjacency` entry point and a hash-selected shard.
Governed model-assisted v3 assertions use the `record_locator` result to select
the same-index accepted relationship chunk from the descriptor's
`model_enrichment_v3` datapack, then filter it to the selected route.

Current publication limitation: official effect assertions are published in
their release-wide datapack and reconciliation evidence, but that effects
plane does not yet have a source-and-target route index. An agent must report
that limitation instead of calling a selected work's route view the complete
combined graph.

## Example Questions

```text
Which UK Government API records relate to Ordnance Survey, and which are
provider-native rather than data.gov.uk-derived? Return a table with title,
record type, source tier, access model, licence basis, endpoint host, docs host
and route.
```

```text
Find APIs or data access endpoints that could provide geospatial boundary data.
Group the answer by provider, protocol and licence basis. Flag any records where
licence or contract status is inferred or missing.
```

```text
What does the UK Government APIs OKF pack say about HMPPS Auth? Include the
source, relationship context, access model, API evidence count and any gaps that
would need manual assurance.
```

## How To Judge The Answer

A good answer:

- names the selected records and gives their routes;
- says whether each fact is declared, observed, inferred or missing;
- distinguishes API products, data access endpoints, data products, contracts,
  schemas and operations;
- reports licence/access metadata with basis and confidence;
- links to source URLs when the pack exposes them;
- avoids claiming that a catalogue signal is operational assurance.

A weak answer:

- collapses data endpoints into formal API products;
- treats missing source metadata as fact;
- quotes only the record title without provenance;
- loads or summarizes the whole corpus when a search shard would answer the
  question;
- invents credentials, live availability, security posture or legal status.

## If The Question Is About Standards, Not Records

If the AI is asked how a record's fields relate to external standards (for
example "is this DCAT-AP compliant?" or "what OpenAPI security scheme does
this access model map to?"), point it at
[okf-standards-crosswalk.md](okf-standards-crosswalk.md) instead of letting it
improvise a mapping. That page is the canonical field-by-field crosswalk to
DCAT/DCAT-AP and OpenAPI, and it states plainly where this repository is
standards-alignable rather than conformant.

For the UK Government APIs large-corpus pack, prefer the generated fields in the
record JSON first:

- `dcat_type`;
- `openapi_type`;
- `dcat_export_status`;
- `openapi_export_status`;
- `openapi_security_scheme`;
- `standards_alignment.dcat.required_missing`;
- `standards_alignment.openapi.required_missing`.

Then use the crosswalk for interpretation. That prevents a model from replacing
the repo's deliberately cautious "export-ready stub" language with a false
DCAT-AP/OpenAPI conformance claim.
