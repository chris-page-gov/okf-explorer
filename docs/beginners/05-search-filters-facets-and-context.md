# Search, Filters, Facets And Context

Search is not a single operation. The Explorer separates several questions so
results remain understandable and reproducible.

## Five Different Questions

Suppose a corpus contains 100,000 public-data records.

### Search

“Which records appear relevant to the words `housing need`?”

Search creates candidates from text and known entities.

### Filter

“Of those records, which have publisher `Example Office` and format `CSV`?”

A filter is an admissibility rule. A matching record stays; a non-matching
record does not.

### Ranking

“In what order should the matching records appear?”

Ranking assigns or compares scores. It does not change which hard filters a
record passed.

### Faceting

“Among the current results, which publishers, formats or topics occur, and how
often?”

Facets reveal structure and provide filter controls.

### Context Selection

“Which full records, relationships and passages should a person or AI inspect
to answer the actual question?”

This final step is narrower than dumping every result into a prompt or screen.

Collapsing these questions into one opaque “AI relevance” score makes mistakes
difficult to diagnose.

## From Text To Tokens

A search index first turns text into normalized **tokens**. A simple example:

```text
"Housing prices in London" → ["housing", "prices", "london"]
```

Normalization can include lowercasing, punctuation handling and removal of
common words. The exact rules form part of the index contract. A builder and
query worker must agree on them.

Search does not understand every human meaning merely because it has tokens.
“Home values” may need explicit aliases, domain vocabulary or semantic
expansion to find “house prices.”

## Inverted Index And Postings

Reading every full record for every keystroke would be slow. An **inverted
index** starts with a term and lists documents containing it:

```text
housing → record 2, record 18, record 940
prices  → record 2, record 7, record 940
```

Each list is a **postings list**. A posting can also record:

- which field matched;
- how often the term occurred;
- a compact field mask;
- enough data to calculate a score.

Numeric document positions keep postings small. A document map connects those
positions back to stable record IDs.

Large postings and lexicons are sharded so the browser fetches only relevant
parts.

## Prefixes And Suggestions

A prefix index can suggest terms while a user types. Suggestions may come from:

- indexed lexical terms;
- governed entities and their aliases;
- known publisher, organisation or concept labels.

A suggestion is not proof that the user's intended meaning has been resolved.
The interface should show when a phrase was interpreted as a known entity and
what filter that interpretation applies.

## Field Weights

A term in a title is usually more informative than the same term in a long
description. The search manifest can declare weights for fields such as:

- title;
- description;
- publisher;
- topics;
- format;
- identifiers.

A weighted score is deterministic when the inputs and formula are published.
It is still a product choice, not an objective measure of truth.

## IDF And Exact Matching

Inverse document frequency, or **IDF**, gives more weight to uncommon terms.
A word appearing in nearly every record is less useful for distinguishing
results than a rare specialist term.

An exact phrase or title match can receive an additional boost. The Explorer
supports declared ranking strategies so evaluation can compare them rather
than silently changing the order.

In broad terms:

```text
score =
  weighted field matches
  + rarity contribution
  + exact-match contribution
  + declared entity contribution
```

The actual response can expose score components and matched fields as a match
explanation.

## Filters As Set Operations

Each filter value can be represented as a set of matching document positions.

If a user selects two values within one facet, the intended meaning must be
defined. A common pattern is:

- values within a facet use OR: `CSV` or `JSON`;
- different facets use AND: the selected format and selected publisher.

In set notation:

```text
(CSV ∪ JSON) ∩ ExampleOffice
```

Unknown values deserve care. A missing licence does not mean “closed
licence,” and a missing place does not mean “not spatial.” A facet can retain
an explicit unknown state rather than turning absence into a false claim.

## Facets

A facet definition needs more than a key and a label. Useful metadata includes:

- value type: nominal, ordered, number or date;
- display label;
- value order;
- whether counts update with the current result set;
- aliases and controlled concepts;
- hierarchy information;
- treatment of missing values;
- whether a value is safe as a hard filter.

### Nominal And Ordinal

A **nominal** value such as publisher name has categories without an inherent
order.

An **ordinal** value such as low, medium and high has a meaningful order.
Alphabetical sorting would be wrong without a declared order.

### Hierarchical Facets

Topics or places can form a hierarchy:

```text
United Kingdom
└── England
    └── London
```

Selecting a parent may include descendants, but only if the pack defines that
behaviour. Indented display by itself must not create semantic broader/narrower
claims.

## Sorting

Sorting by title or newest date is different from relevance ranking.

The product supports stable sort choices such as:

- relevance;
- newest;
- title;
- metadata quality.

A deterministic tie-breaker prevents records with equal primary values from
jumping between refreshes.

Metadata quality is not source truth. It measures declared completeness or
quality criteria and must name those criteria.

## Exact Totals And Truncation

Large static indexes operate within budgets. A response distinguishes:

- `eq` — the total is exact;
- `gte` — at least this many match;
- `unknown` — the available candidates do not establish a total.

It also reports why work was truncated, such as a result limit, capped
postings or a result-chunk budget.

Showing “100 results” without saying it is a lower bound can mislead users
about the corpus.

## Durable Retrieval State

A useful retrieval URL records:

- query text;
- selected filters;
- ranking or sort choice;
- active bundle;
- selected record or view where appropriate.

The parser constrains query length, filter key syntax, value length and value
count. This prevents an accidental or hostile URL from creating unbounded
state.

Back and Forward should restore a meaningful search, not merely repaint the
same screen.

## Search In A Worker

The large-corpus search worker:

1. receives a normalized request;
2. loads only required lexicon, posting, filter and result shards;
3. recognizes declared entities and aliases;
4. generates candidate document positions;
5. applies hard filters;
6. scores or sorts candidates;
7. calculates requested facet distributions;
8. hydrates a bounded set of compact result records;
9. returns explanations, totals, limits and elapsed time.

Caches avoid fetching the same immutable shard repeatedly. Snapshot and
integrity checks prevent incompatible files from being mixed.

## Retrieval For An AI

An AI should not receive a raw dump of the corpus. A safer context package
contains:

- the user's question and interpreted constraints;
- a bounded list of selected records;
- stable record and source identifiers;
- relevant passages or fields;
- authority and provenance signals;
- uncertainty and missing metadata;
- the retrieval explanation and any truncation.

The AI can then cite evidence and request another retrieval step rather than
pretending the first search was exhaustive.

## Evaluation

Search quality needs several measures:

- **recall** — how many relevant records were found;
- **precision** — how many found records were relevant;
- **ranking quality** — whether the most useful records appeared early;
- **filter correctness** — whether admissibility rules were exact;
- **facet correctness** — whether counts matched the current set;
- **context sufficiency** — whether selected evidence supported an answer;
- **latency** — whether results arrived within the product budget;
- **explainability** — whether a user could understand the match.

One score cannot diagnose all of these.

## Next

[Knowledge graphs and stable identifiers](06-knowledge-graphs-and-identifiers.md)
explains the structure used after a record has been found.
