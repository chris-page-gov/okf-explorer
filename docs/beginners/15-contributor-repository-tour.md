# A Contributor's Repository Tour

This chapter connects the concepts in the learning path to the actual
repository. It assumes you can edit text files and run commands, but not that
you already know Svelte, RDF or the pack generators.

## Read Before Editing

Start with:

1. the repository `AGENTS.md` for working and publication rules;
2. [Repository guide](../repository-guide.md) for the maintained architecture;
3. the advanced document for the area you are changing;
4. nearby tests that state current behaviour.

The worktree may contain another person's unfinished changes. Inspect it and
avoid overwriting unrelated edits.

## Top-Level Map

| Path | What lives there |
|---|---|
| `apps/okf-explorer/` | Canonical Svelte and TypeScript Explorer |
| `explorer/` | Dependency-free compatibility PWA |
| `docs/` | Manuals, architecture, evaluation and this learning path |
| `scripts/` | Builders, validators, benchmarks and evaluation tools |
| `profiles/bundle-wiki/v1/` | Context, schemas, SHACL shapes and profile docs |
| `profiles/authoring/v1/` | Domain warm-up and build-handoff schema |
| `profiles/federation/v1/` | Overview-first federation and relationship contracts |
| `registry/` | Semantic source for public bundle registry projections |
| `constraints/` | Machine-readable source constraint ledger |
| `release-assurance/` | Hash-bound runtime acceptance and release evidence |
| `legislation/` | Generated UK Legislation pack and maintained ontology pages |
| `uk-government-apis/` | Generated multi-source API/data pack |
| `evaluation/` | Question suites, journeys, rubrics and evidence |
| `stack/`, `standards/`, `federated/`, `frameworks/`, `research/` | Original Markdown research corpus |
| `glossary/`, `organisations/`, `uk-government/`, `document/` | Supporting corpus records and indexes |
| `okf.config.json` | Small-corpus configuration |
| `okf-bundle.json` | Generated small bundle |
| `viewer.html`, `view.html` | Generated or compatibility single-file viewers |

## Canonical Explorer Code

Within `apps/okf-explorer/src/`:

- `routes/+page.svelte` coordinates the main application state and views;
- `lib/types.ts` defines shared runtime data shapes;
- `lib/sources/` loads, normalizes and verifies small and large packs;
- `lib/okfV02.ts` presents structured v0.2 trust and lifecycle metadata;
- `lib/sources/federation.ts` validates overview-first federations;
- `lib/search/` defines search clients, static search and retrieval URL state;
- `workers/largeSearch.worker.ts` queries sharded indexes off the main thread;
- `lib/viewer/` contains display and inspection logic;
- governed-term, relationship-authority, model-enrichment and reconciliation
  modules live under `lib/viewer/` and `lib/sources/`;
- `lib/geospatial/` classifies spatial evidence and builds bounded previews;
- `lib/legislation/` parses official search and CLML structure;
- colocated `.test.ts` files define unit behaviour;
- `tests/ui/` contains Playwright journeys.

The main page is large because it coordinates many views. Prefer placing
testable rules in focused modules rather than adding every rule directly to
the component.

## Small-Bundle Path

The source path is:

```text
Markdown → update_viewer parser → graph
Markdown → build_okf_bundle → okf-bundle.json
okf-bundle.json → smallBundle loader → normalized corpus → views
```

If you edit corpus Markdown:

1. preserve frontmatter and browser-compatible links;
2. regenerate the bundle;
3. regenerate the legacy viewer;
4. inspect warnings for unresolved links;
5. run the publication checks.

Do not hand-edit the generated bundle to repair source content.

## Large-Corpus Path

The browser path is:

```text
descriptor
→ large-corpus loader
→ data/search manifests
→ overview
→ worker-backed retrieval
→ compact result
→ selected full record/resources/relationships
```

The UK API and legislation builders produce related but domain-specific
artifacts. Before changing a manifest field:

1. find its TypeScript type;
2. find the builder output;
3. find schema or documented contract;
4. find loader and worker use;
5. find tests and fixtures;
6. preserve old compatible forms where required.

A field rename can cross Python, JSON, TypeScript, worker messages and tests.

## Federation Path

The federation browser path is:

```text
federation descriptor
→ child/source-family overview
→ explicit Load child bundle action
→ declared child descriptor route
→ ordinary small- or large-bundle loader
```

Do not fetch children during federation overview or imply cross-child record
search without a governed federated search index.

## Semantic Profile

The bundle-wiki profile contains:

- a JSON-LD context mapping short terms to IRIs;
- JSON Schemas for JSON representations;
- SHACL shapes for graph validation;
- profile documentation.

The semantic helper:

- parses constrained YAML-LD;
- rejects unsafe or ambiguous representations;
- loads pinned contexts;
- validates schemas;
- expands and compacts JSON-LD.

When a semantic term changes, ask separately:

- Did the human meaning change?
- Did the JSON key change?
- Did its IRI change?
- Did the schema change?
- Did the SHACL shape change?
- Is migration or deprecation metadata needed?

Avoid changing a stable IRI merely to improve a display label.

## Authoring And Release Profiles

The authoring profile freezes domain research decisions before implementation.
The federation profile defines cross-publication discovery. Release-assurance
artifacts bind the tested browser build and corpus bytes.

When changing one of these contracts:

1. update the machine schema;
2. update its template and human profile;
3. update validators and positive/negative fixtures;
4. update TypeScript consumer types where applicable;
5. test backward compatibility;
6. update runtime or release receipts that consume the contract;
7. document whether the change affects OKF core or only an additive profile.

## Change Recipe: A Documentation Correction

1. Edit the authoritative Markdown.
2. Check links and terminology against nearby documents.
3. If the file belongs to the OKF corpus, rebuild bundle and viewer.
4. Run the four required publication checks.
5. Inspect generated differences for unrelated churn.

## Change Recipe: A New Record Field

1. Define the user question the field answers.
2. Name source authority and missing-value behaviour.
3. Decide whether it is canonical record data, generated analysis or
   presentation.
4. Add builder output.
5. Add schema/type support.
6. Add loader normalization.
7. Add display only where it helps a user task.
8. Add unit and browser coverage.
9. Document standards mapping and provenance.
10. Rebuild and validate affected packs.

## Change Recipe: A Search Feature

1. Decide whether it is candidate search, a hard filter, ranking, faceting or
   context assembly.
2. Update the manifest contract if new index data is needed.
3. Build deterministic shards and integrity metadata.
4. update request and response types;
5. implement worker logic within bounded budgets;
6. expose match and truncation explanations;
7. round-trip meaningful state through the URL;
8. add unit, benchmark and browser tests;
9. evaluate against real questions.

Do not hide a hard filter inside a ranking score.

## Change Recipe: A New Graph Relationship

1. Identify source and target with stable IDs.
2. Define direction and a human label.
3. Prefer a canonical predicate IRI where governed.
4. record assertion status, evidence and observation time;
5. distinguish count, strength and confidence;
6. update builder and relationship indexes;
7. verify incoming and outgoing inspection;
8. verify grouping by predicate and compatibility label;
9. document any inference rule.

Screen placement is not part of the semantic definition.

## Change Recipe: A New External Preview

1. Require a deliberate user action.
2. define supported schemes, formats and CORS expectations;
3. sanitize credential-like URL fields;
4. cap response bytes and parsed complexity;
5. avoid automatic proxying or private-network probing;
6. preserve the original source and local metadata;
7. design error and recovery states;
8. test success, failure, keyboard and responsive interaction;
9. record source terms and licence constraints.

## Finding The Relevant Code

Use fast text search for:

- a UI label;
- a schema name such as `okf-static-search.v2`;
- a JSON field;
- a type name;
- the error message shown to the user.

Then inspect both production use and tests. Similar terms can occur in the
canonical app, the compatibility PWA and generated single-file viewer; confirm
which surface owns the behaviour.

## Testing In Proportion To Risk

| Change | Minimum useful evidence |
|---|---|
| Prose only | Link review and publication checks |
| Small-bundle parsing | Python checks plus loader/unit tests |
| Component display | Svelte check and focused unit test |
| User interaction or URL state | Unit plus Playwright journey |
| Search index contract | Builder check, worker tests, benchmark and question evaluation |
| External fetch | Unit bounds, failure states and browser test |
| Semantic profile | JSON Schema, JSON-LD and SHACL validation |
| Federation contract | Schema, fallback, bounds and explicit-load browser tests |
| Authoring profile | Domain-profile schema, cross-reference and equivalence tests |
| Release assurance | Determinism, build-manifest, SBOM and runtime-receipt checks |
| Legislation generator | Corpus completeness and domain evaluation |

Run broader checks when a shared contract changes.

## Generated Output Review

After regeneration, inspect:

- file count;
- unexpectedly large changes;
- counts and snapshot identifiers;
- order stability;
- missing or new warnings;
- hash and manifest changes;
- forbidden temporary files.

A successful command is not enough if it generated the wrong scope.

## First Contribution Ideas

Good learning tasks have a small evidence boundary:

- clarify an advanced paragraph and link it from the beginner glossary;
- add a focused test for a documented edge case;
- improve a user-facing error without changing the data contract;
- add provenance to a value whose source is already known;
- document a fixture and the live behaviour it represents.

Avoid making a first change that simultaneously redesigns the semantic profile,
large search contract and main page state.

## Last Check

Before handing off a change, be able to say:

- what source of truth changed;
- which generated artifacts were refreshed;
- what compatibility boundary was preserved;
- which checks passed;
- what remains uncertain or intentionally out of scope.

## Next

Use the [Beginner glossary](16-beginner-glossary.md) as a quick reference, read
chapters 17 through 20 for the current v0.2, federation, Foundry and assurance
contracts, then continue with the advanced document for your contribution area.
