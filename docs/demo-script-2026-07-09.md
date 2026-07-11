# 20 Minute Demo Script: OKF Explorer And UK Government APIs

Audience assumption: people understand government data/API discovery pain, but
have not seen OKF Explorer.

Demo URL:

```text
https://chris-page-gov.github.io/okf-explorer/?bundle=https%3A%2F%2Fchris-page-gov.github.io%2Fai-infrastructure-wiki%2Fuk-government-apis%2Fokf-explorer.json&view=reader#overview
```

Backup local URL:

```text
http://127.0.0.1:8002/next/?bundle=/uk-government-apis/okf-explorer.json&view=reader#overview
```

## 0:00-2:00 — Opening

Say:

"This is an Open Knowledge Format bundle in a static Explorer. The important
point is not that we have another catalogue page. The point is that the source
material, generated records, provenance, relationships, quality signals and UI
behaviour are all packaged so a person or an AI can inspect the same evidence."

Show Reader overview.

Point out:

- 257 API products.
- 34,327 data endpoints.
- 7,827 data products.
- Counts are separate, so data endpoints are not inflated into formal API
  products.
- The pack is a static descriptor and shard set, not a live database.

## 2:00-5:00 — Why This Exists

Say:

"The discovery problem is that government APIs and data access endpoints are
spread across GOV.UK API Catalogue, data.gov.uk, provider portals such as
Ordnance Survey, and domain APIs such as ONS. OKF gives us a repeatable
publication format: the same pack can be browsed, scored and queried by an AI."

Show the right panel and the generated overview/caveat.

Point out:

- source tier;
- confidence;
- licence/access fields;
- warnings and missing metadata;
- "observed public catalogue view, not assurance register" framing.

## 5:00-8:00 — Browse Like A User

Click Provider.

Say:

"High-cardinality facets are one of the things that broke early. The current
behaviour is deliberate: closed facets are cheap, opening a facet shows a local
search and paged values, and plain click is single-select. Multi-select is an
explicit modifier-key action."

Search `Ordnance Survey`.

Point out:

- search status;
- result cards;
- provider-native vs catalogue/API-product results;
- not every matching record has the same status or licence basis.

## 8:00-11:00 — Inspect A Record

Click `Welcome to Ordnance Survey's APIs`.

Say:

"The right card is where a reader can decide what they are looking at. The
card tells us this is a Provider API Portal, declared from the OS API source,
with API-key access and an Ordnance Survey licence-required status inferred
from provider terms. That is not legal assurance; it is transparent metadata
repair."

Point out:

- endpoint URL;
- documentation URL;
- access model;
- licence basis;
- metadata quality info icon;
- route/copy route;
- clickable chips.

## 11:00-14:00 — Graph And Relationships

Click Graph.

Say:

"Graph is for context, not decoration. Single-click inspects. Double-click
navigates or reduces context. Dense areas are stacked and labelled with counts.
The important learning from review was that zoom alone does not solve dense
government catalogue graphs; the bundle needs grouping dimensions such as
record type, provider, host, licence and protocol."

Show legend and relationship drawer.

Point out:

- node type key;
- arrows and labels;
- stack counts;
- relationship drawer;
- remaining graph readability issues captured in the evaluation evidence.

## 14:00-16:00 — Time, Type And Resources

Click Timeline.

Say:

"Timeline now defaults to Latest, with Year, Quarter and Month grouping. This
prevents people getting stranded on old records and makes missing dates a
metadata-quality issue rather than a mystery."

Click Type.

Say:

"Type view protects the core data model. API Product, Data Access API Endpoint,
Data Product, Operation, Contract and Schema are separate concepts."

Click Resources if time.

Say:

"Resources view is where integration-oriented users look for hosts, formats and
documentation paths."

## 16:00-18:00 — How An AI Uses It

Open or mention [ai-okf-usage.md](ai-okf-usage.md).

Say:

"To point an AI at this, do not say 'go search the web for APIs'. Give it the
descriptor URL and rules: read the descriptor first, use overview and search
shards, load only relevant chunks, cite route and source URL, and distinguish
declared, observed, inferred and missing metadata."

Use this sample prompt:

```text
Answer from this OKF descriptor:
https://chris-page-gov.github.io/okf-uk-government-apis/okf-explorer.json

Find Ordnance Survey API/data records. Return title, record type, source tier,
access model, licence basis, endpoint host, documentation host and route. Cite
source URLs and say which fields are inferred or missing.
```

## 18:00-20:00 — How To Build Your Own

Open or mention [okf-bundle-authoring.md](okf-bundle-authoring.md).

Say:

"For a small wiki, Markdown is the source of truth and `build_okf_bundle.py`
creates `okf-bundle.json`. For a large corpus, you emit the descriptor,
overview, analysis, data chunks and static search shards. The Explorer works
best when the bundle gives it facets, typed relationships, provenance,
licence/access metadata, quality explanations and graph grouping dimensions."

Close:

"The aim is publication quality: a person can browse it, an AI can answer from
it, and the evaluation harness can score whether retrieval, display clarity,
accessibility and GOV.UK-style publication quality are actually improving."

## Backup Plan

If the hosted link is slow:

1. Use the local URL.
2. Show screenshots from [okf-explorer-persona-manual.md](okf-explorer-persona-manual.md).
3. Explain that the pack is static and the recent shard-hydration fix reduced
   concurrent chunk fetches and retries transient CDN errors.

If search is slow:

1. Type `Ordnance Survey`.
2. Pause and explain the static search/index status.
3. Use the already selected screenshot/manual page as evidence.

If graph is messy:

1. Treat it as a product-learning moment.
2. Point to the evaluation harness and visual-regression evidence.
3. Explain the current fix direction: semantic grouping, one opened stack at a
   time, shape legend, and relationship drawer.
