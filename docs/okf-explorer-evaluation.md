# OKF Explorer Evaluation Harness

This repository now carries repeatable browser evaluation suites for the UK
Government APIs OKF pack, the hosted GOV.UK CKAN OKF pack, and future large OKF
bundles.

The suite evaluates three publication goals:

- Can a person browse efficiently, find an API or data source, and evaluate it?
- Does the display convey record, provenance, licence, access and quality
  information clearly?
- Are terms such as confidence, licence basis, API evidence and metadata quality
  defined in the UI instead of being unexplained percentages?

The rubric is aligned with GOV.UK service-quality guidance: user needs, simple
task completion, accessibility, open standards, security/privacy, measurable
performance and reliable operation. Accessibility expectations use WCAG 2.2 AA
as the public-service baseline and combine automated checks with manual visual
review.

## Assets

- `evaluation/okf-explorer/questions.json` contains 100 UK Government API
  retrieval and inspection tasks.
- `evaluation/okf-explorer/journeys.json` maps seven Explorer personas and
  nineteen broad and geospatial stories to those questions, defines browser
  interaction journeys and records the focused `GEO-E2E-*` Playwright tests
  attached to each Map story.
- `apps/okf-explorer/tests/ui/geospatial-map.spec.ts` contains 18 deterministic
  browser scenarios covering every Map control and visible state across small
  and large bundle paths.
- `evaluation/gov-ckan/questions.json` contains 100 GOV.UK CKAN retrieval and
  inspection tasks using the same rubric.
- `evaluation/gov-ckan/journeys.json` defines CKAN-specific personas and user
  stories, maps every CKAN question to at least one story, and covers durable
  retrieval state, graph interaction and source inspection.
- `evaluation/legislation/journeys.json` maps the six legislation personas and
  critical journeys to all 100 legal-answer questions. It records the curator
  refresh story as an explicit evaluation gap because that operation is covered
  by generator and documentation-lockstep tests rather than legal questions.
- `evaluation/okf-explorer/visual-regressions.json` records known visual
  clarity issues that must not be lost during redesign.
- `evaluation/gov-ckan/visual-regressions.json` intentionally remains empty
  until a CKAN screenshot is copied into the repository with its provenance;
  temporary or conversational screenshots are not silently turned into a
  committed visual baseline.
- `evaluation/okf-explorer/evidence/graph-layering-overlap-2026-07-08.png`
  captures the current graph readability problem:

![Graph layering and overlapping labels](../evaluation/okf-explorer/evidence/graph-layering-overlap-2026-07-08.png)

The review note for that image is retained verbatim in the manifest:
"See how messy this display is due to layering and overlapping white boxes and
the arrow location (should be up to the start of the icon)".

Additional evidence now captures the OS Data Hub graph failures:

- `graph-osdatahub-search-context-2026-07-08.png`: search context was not
  preserved clearly when moving from search results to Graph.
- `graph-osdatahub-cluster-overlap-2026-07-08.png`: zoom did not make a dense
  OS Data Hub cluster readable.
- `facet-record-type-graph-context-2026-07-08.png`: record-type counts looked
  like a false graph breakdown when the active reduction was not explicit.

## Interaction Checks

The browser harness and static lockstep tests should treat these behaviours as
publication requirements for large OKF packs:

- Closed facet sections must not render or scan their full value lists. Opening
  a facet should show a facet-local search box, loading state if hydration is
  needed, and paged values.
- Facet search must normalise hyphenated, underscored and spaced terms the same
  way for the query and the candidate value.
- A plain click on a facet value replaces the previous value for that facet;
  Ctrl-click, Cmd-click or Shift-click opts into multi-select.
- A plain click on a graph node inspects it in the data card. A double-click is
  the graph navigation/reduction gesture.
- Dense graph stack expansion should re-group by a visible semantic dimension
  when expanding every record would make labels, arrows or cards unreadable.
- The graph legend must show the actual node-shape vocabulary, including stack
  and opened-stack group states.
- The relationship drawer must be independently scrollable and resizable
  without covering the primary graph target.
- Timeline views must be ordered by time, provide a Latest view, and offer
  grouped year, quarter and month buckets where dated metadata exists.
- Browser Back and Forward must preserve inspect/reduce context or expose a
  disabled state when no in-app forward target exists.

The interaction manifests make these requirements executable. Their action
vocabulary covers search, facet opening and selection, sorting, a browser
Back/Forward round trip, graph-edge selection, pointer-drag resizing of the
relationship drawer, full-record loading, disclosure folding, in-Explorer
Source Inspector loading, Map reduction/record selection and opening the raw
source in a separate tab. Their
assertions check URL parameters, restored control values, edge selection,
drawer size, disclosure states, Source Inspector presence and preservation of
the Explorer tab.

The 100 retrieval questions remain backward compatible. Journey execution is
opt-in with `--journeys`; a normal suite invocation still runs the same 100
query records and uses the same 100-point rubric.

## Rubric

The score is additive and totals 100 points:

- Retrieval, 35 points: result visibility, expected terms/routes, result count,
  stale-context reset, and core metadata discoverability.
- Display, 25 points: detail card title/summary/route, licence/access/contract
  visibility, clean metadata-gap wording, follow-on exploration controls,
  loading/search clarity, and graph readability.
- Accessibility, 20 points: accessible names, live status regions, keyboard
  focus targets, landmarks, and absence of obvious overlap at the tested
  viewport.
- GOV.UK-aligned publication quality, 20 points: plain language, provenance,
  licence/access clarity, predictable service-style actions, metadata-quality
  explanations, and no displayed secrets.

This is not an assurance score for the source APIs. It scores how well the OKF
Explorer helps a reader inspect the available public metadata.

## Running Locally

Run the focused Map UI suite directly from the Explorer application:

```sh
cd apps/okf-explorer
pnpm test:e2e
```

Playwright starts the local Vite server and intercepts deterministic public-
origin fixtures. Geometry bodies are not requested before the preview action,
and no live ArcGIS/OGC service is required. CI runs this suite after the Svelte
unit tests and production build. Failure screenshots, traces and reports stay
under ignored application output folders.

Journey validation cross-checks every `playwright_test_ids` value against the
spec and fails if an implemented `GEO-E2E-*` scenario has no persona/story, or
if documentation refers to a test that does not exist.

Build the static site first:

```sh
python3 scripts/build_site.py
```

Serve the repository root:

```sh
python3 -m http.server 8002 --bind 127.0.0.1
```

Run the full 100-question browser suite:

```sh
node scripts/evaluate_okf_explorer.mjs \
  --base-url http://127.0.0.1:8002/next/ \
  --bundle /uk-government-apis/okf-explorer.json \
  --limit 100 \
  --out evaluation/okf-explorer/results/latest
```

If Playwright is installed outside the repo, point the script at that module:

```sh
PLAYWRIGHT_PACKAGE=/Users/crpage/tmp/okf-playwright/node_modules/playwright \
  node scripts/evaluate_okf_explorer.mjs \
  --base-url http://127.0.0.1:8002/next/ \
  --bundle ../uk-government-apis/okf-explorer.json \
  --limit 100
```

Generated reports are written to `evaluation/okf-explorer/results/`, which is
ignored by Git. The committed suite, rubric, screenshot evidence and harness
are the source of truth.

For CI or a quick lockstep check, use `--no-browser`. That mode validates the
100-question suite and writes one validation-only record per question, but it
does not assign retrieval/display/accessibility/GOV.UK scores because no browser
observations have been collected.

Validate persona/story/question traceability and the interaction schema without
launching a browser:

```sh
node scripts/evaluate_okf_explorer.mjs \
  --no-browser \
  --journeys-only \
  --journeys evaluation/okf-explorer/journeys.json
```

Run only the UK Government APIs interaction journeys:

```sh
node scripts/evaluate_okf_explorer.mjs \
  --base-url http://127.0.0.1:8002/next/ \
  --journeys-only \
  --journeys evaluation/okf-explorer/journeys.json
```

Run the GOV.UK CKAN parity suite against the hosted CKAN descriptor:

```sh
node scripts/evaluate_okf_explorer.mjs \
  --base-url http://127.0.0.1:8002/next/ \
  --suite evaluation/gov-ckan/questions.json \
  --limit 100
```

The CKAN suite declares its `target_bundle`; the harness also picks up the
sibling `visual-regressions.json`, so `--bundle` and `--visual` are optional for
that run. Reports are written to `evaluation/gov-ckan/results/` unless `--out`
is specified.

Run the three CKAN interaction journeys, including the source-data/new-tab
check:

```sh
node scripts/evaluate_okf_explorer.mjs \
  --base-url http://127.0.0.1:8002/next/ \
  --journeys-only \
  --journeys evaluation/gov-ckan/journeys.json
```

The legislation journey manifest can be validated or run the same way by
substituting `evaluation/legislation/journeys.json`. Its legal-answer questions
continue to be scored by `scripts/evaluate_legislation_answers.py`; the browser
journeys test the Explorer discovery stage, not legal correctness.

## Corpus Boundary Note

Question `Q071` checks the user's Rugby search concern. In the current UK
Government APIs OKF bundle, Rugby has one indexed match:
`Scarborough Borough Council New Local Plan Former Rugby Club Site`. If future
harvests add more Rugby records, the expected minimum can be raised without
changing the harness.

The CKAN suite includes its own Rugby and planning questions so the broader
CKAN fixture can be evaluated without assuming the same corpus boundary as the
UK Government APIs pack.
