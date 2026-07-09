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
