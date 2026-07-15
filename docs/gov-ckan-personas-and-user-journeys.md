# GOV.UK CKAN Personas And User Journeys

The GOV.UK CKAN example is a broad catalogue snapshot. Its personas and user
stories therefore differ from the API-product and legislation examples even
though all three use the same Explorer controls.

The executable source of truth is
[`evaluation/gov-ckan/journeys.json`](../evaluation/gov-ckan/journeys.json).
That manifest maps every one of the 100 CKAN questions to at least one story and
defines browser journeys for the interactions that query scoring cannot cover.

## Personas

| Persona | Primary need | Main risk |
|---|---|---|
| Catalogue researcher | Find records by publisher, place or subject and understand the corpus boundary. | Treating a harvested catalogue result as a complete view of the web. |
| Department data lead | Find records attributed to a department using canonical names or abbreviations. | Common words such as “home” or “office” dominating organisation intent. |
| Data engineer | Inspect formats, resources, hosts, APIs and downloads before reuse. | Mistaking a catalogue landing page or stale resource for an operational service. |
| Service assessor | Verify deterministic retrieval, accessibility and durable interaction state. | Passing keyword checks while facets, history, graph or panels are broken. |
| Provenance auditor | Compare CKAN discovery metadata with the publisher-operated source. | Presenting catalogue modification dates as dataset release dates. |
| Demonstrator | Show a stable large-corpus journey with clear counts and recoverable links. | A demo depending on hidden state, raw JSON replacing Explorer or unrepeatable clicks. |

## User stories and question traceability

| Story | User need | Question coverage |
|---|---|---|
| CKAN-S01 — organisation discovery | Search canonical organisation names and abbreviations with publisher-aware ranking. | Q001–Q010, Q099–Q100 |
| CKAN-S02 — subject and place discovery | Find related records and use facets without overstating the corpus. | Q011–Q020, Q041–Q098 |
| CKAN-S03 — technical reuse | Inspect formats, API indicators, capability documents and access routes. | Q021–Q030, Q035–Q039 |
| CKAN-S04 — trust and source inspection | Interpret licence, access, quality, dates and provenance; inspect source JSON without leaving Explorer. | Q031–Q040, Q099 |
| CKAN-S05 — relationships | Select a graph relationship and resize its row drawer without losing the target. | Q006, Q099 |
| CKAN-S06 — durable state | Apply filters and sorting, share URL parameters, and restore the state with Back and Forward. | Q042, Q100 |

The ranges above are a reader-friendly summary. The manifest contains explicit
question IDs, so validation fails if a question is renamed, removed or left
without a persona/story path.

## Executable journeys

### CKAN-J01 — filter, sort and restore state

Search Land Registry, select the CSV format facet, sort by title, then exercise
a browser Back/Forward round trip. Assertions cover the visible query and sort
controls plus `q`, `filter.format` and `sort` URL parameters.

### CKAN-J02 — graph relationship and drawer

Open Characteristics of Home Workers, switch to Graph, select an edge and drag
the relationship-drawer handle. Assertions require both the relationship card
and graph-row highlight, and a material change in drawer height.

### CKAN-J03 — full record and source data

Open the Land Registry INSPIRE example, load its full record, check that the
first detail section is open and subsequent sections are folded, toggle a
section twice, and open the CKAN response in Source Inspector. The raw JSON link
must create a separate tab while the Explorer route remains in place.

## Interpreting CKAN dates

“Catalogue metadata created” and “Catalogue metadata modified” describe the
data.gov.uk record. They do not establish when the dataset was first published,
its latest release, its update frequency or whether it remains actively
maintained. A publisher-operated resource host may contain newer operational
information, but it must be presented as separately sourced enrichment with the
original CKAN record retained as provenance.

This distinction is particularly important for Land Registry datasets whose
catalogue metadata may be old while the publisher's service continues to issue
monthly extracts.

## Run

Validate the manifest without a browser:

```sh
node scripts/evaluate_okf_explorer.mjs \
  --no-browser \
  --journeys-only \
  --journeys evaluation/gov-ckan/journeys.json
```

Run the interactions against a local Explorer build:

```sh
node scripts/evaluate_okf_explorer.mjs \
  --base-url http://127.0.0.1:8002/next/ \
  --journeys-only \
  --journeys evaluation/gov-ckan/journeys.json
```

The CKAN visual-regression manifest remains empty until repository-backed
screenshots with reproducible capture context are available. Temporary images
are evidence for review, but not a durable baseline.
