# Building, Testing And Publishing

This repository publishes a static application and several kinds of data
artifact. A reliable change follows the source-of-truth boundary and runs the
checks for the layer it touched.

## Source Files And Generated Files

A **source file** is edited directly to express intended content or behaviour.
A **generated file** is rebuilt from source by a repeatable program.

Examples:

| Source of truth | Generated publication |
|---|---|
| Markdown corpus | `okf-bundle.json` |
| Markdown corpus and viewer template | `viewer.html` |
| Registry YAML-LD | JSON and JSON-LD registry projections |
| Approved domain profile and immutable sources | Generated OKF publication |
| UK API source fixtures and builder | large-corpus descriptors, records and indexes |
| Official legislation feeds and builder | work chunks, facets and search indexes |
| Svelte and TypeScript source | static browser application |
| Production application build | canonical build manifest and SBOM |
| Frozen candidate and browser run | self-contained runtime acceptance receipt |
| All public inputs | GitHub Pages `_site/` tree |

Editing a generated file directly creates drift. The next build can overwrite
the edit.

## Build

A build transforms source into runnable or publishable artifacts.

The local small-bundle build:

1. parses configured Markdown;
2. resolves links;
3. creates normalized records and relationships;
4. writes deterministic JSON.

The Svelte build:

1. checks and compiles components and TypeScript;
2. bundles browser JavaScript and CSS;
3. creates static application files.

The site build:

1. assembles the canonical app;
2. copies public pack artifacts and Markdown;
3. publishes compatibility surfaces;
4. adds redirects and service-worker retirement behaviour;
5. rejects forbidden temporary files;
6. writes `_site/`.

`_site/` is build output, not committed source.

## Check Mode

Several generators accept `--check`. They calculate the expected output and
compare it with the checked-in artifact without rewriting it.

Check mode answers:

> Are source and generated publication synchronized?

It is useful in automated checks and before a commit.

## Unit Tests

A unit test exercises one module or rule with controlled inputs.

Examples in the Explorer cover:

- small-bundle normalization;
- search request and response contracts;
- retrieval URL state;
- graph and facet presentation;
- source inspection;
- geospatial classification and preview geometry;
- legislation XML structure parsing;
- release data-plane range loading.

Vitest runs the TypeScript unit tests. A failing unit test points to a smaller
logic boundary than a full browser journey.

## Type And Component Checks

The Svelte checker validates:

- TypeScript types;
- component properties;
- template expressions;
- framework-specific accessibility warnings;
- application configuration.

Type checking does not replace runtime input validation, but it catches many
internal contract mismatches before publication.

## Browser Tests

Playwright drives the built or development application like a user:

- enter a search;
- select a facet;
- use Back and Forward;
- open a record;
- inspect graph relationships;
- use Map controls;
- load a bounded preview;
- recover from failure;
- interact at responsive sizes.

Browser tests reveal integration problems that unit tests cannot, such as
focus, scrolling, URL history and component coordination.

## Evaluation Harness

The Explorer evaluation harness contains question suites for real information
needs.

It measures more than whether the page loaded:

- evidence retrieval;
- filter and display clarity;
- explainability;
- source access;
- accessibility;
- task completion;
- visual-regression evidence.

Separate suites cover UK Government APIs, GOV.UK CKAN and UK legislation. A
design can pass its unit tests yet reduce real retrieval quality, so both forms
of evidence matter.

## Data Invariants

Large packs need cross-file checks such as:

- descriptor and manifest schemas match;
- counts equal the records in chunks;
- shard paths exist;
- hashes match bytes;
- snapshot identifiers agree;
- every route maps to the expected relationship bucket;
- every result position maps to a record;
- official source counts are reconciled;
- required document families are represented.

These are publication invariants rather than individual function tests.

## The Required Publication Checks

When OKF Markdown changes, regenerate:

```sh
python3 scripts/build_okf_bundle.py
python3 scripts/update_viewer.py
```

Before committing publication changes, run:

```sh
python3 scripts/build_okf_bundle.py --check
python3 scripts/update_viewer.py --check
python3 scripts/check_okf.py
python3 scripts/build_site.py
```

The repository guide lists additional checks for registries, source
constraints, documentation lockstep, UK Government APIs and legislation.

If the Svelte application changed, run from `apps/okf-explorer/`:

```sh
pnpm check
pnpm test
pnpm build
```

Release-affecting application work also uses deterministic two-build and
assembled-site checks. The legislation release gate exercises the production
build across Chrome, Firefox and WebKit and emits a hash-bound receipt. See
[Governed enrichment and release assurance](20-governed-enrichment-and-release-assurance.md).

Run the focused Playwright suite when the interaction surface or relevant
fixtures changed:

```sh
pnpm test:e2e
```

## Determinism

A deterministic builder:

- orders output consistently;
- avoids volatile timestamps where no source changed;
- uses explicit normalization rules;
- records source and pipeline versions;
- produces the same hash from the same inputs.

The production application build additionally publishes a canonical manifest
of every build material. Final site assembly rehashes the complete declared
set and rejects missing, extra, linked or changed files.

Determinism makes review meaningful. If thousands of lines change because of
unstable ordering, a reviewer can miss the actual data change.

Some live-source builds necessarily observe a new snapshot. The observation
time should then be explicit and coherent across its artifacts.

## Caching And Fixtures

Live public services can be slow, unavailable or changed during testing.

- a **cache** preserves fetched source responses for a build;
- a **fixture** is controlled test input committed for repeatable tests.

A fixture demonstrates behaviour but does not prove the current live source
still behaves the same. A live refresh is a separate, deliberate operation
subject to source constraints.

## GitHub Pages

GitHub Pages serves the assembled static tree.

The product publication includes:

- the canonical Svelte Explorer;
- the dependency-free legacy compatibility Explorer;
- single-file compatibility viewers;
- Markdown;
- descriptors and selected local pack data;
- registry files and redirects.

The Explorer can also load independent packs from other HTTPS origins when
those hosts permit browser access.

## GitHub Releases

A release can freeze:

- Explorer assets;
- corpus Markdown;
- descriptor and data artifacts;
- legacy viewer;
- integrity metadata.
- a software bill of materials;
- a multi-browser runtime acceptance receipt.

An immutable release supports later reproduction. A mutable Pages URL supports
easy discovery. The descriptor and release data-plane design connects the two.

## Failure During Publication

Do not hide a failing check by editing the expected output.

Classify the failure:

- source error;
- stale generated artifact;
- invalid schema;
- code regression;
- outdated test expectation;
- live-source drift;
- access or network limitation;
- toolchain mismatch.

Then fix the correct layer and record any intentional contract change.

## Documentation Lockstep

User-visible behaviour and controlled implementation areas require matching
documentation changes. The lockstep check prevents significant code or pack
changes from landing without explaining their effect.

This beginner set is part of that explanation layer; the advanced documents
remain the normative design and operating details.

## Release Assurance

A green unit-test run and a passing local page are necessary but not
sufficient evidence for a public release. Release assurance binds:

- the approved domain profile;
- immutable source bytes;
- generated pack artifacts;
- governed accepted enrichment;
- deterministic application bytes;
- the assembled site;
- browser, accessibility and performance results;
- the exact promoted candidate.

The final release promotes identical tested bytes rather than rebuilding after
acceptance.

## Next

[A contributor's repository tour](15-contributor-repository-tour.md) maps each
kind of change to files and checks.
