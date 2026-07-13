# Static search and filtering design for OKF Explorer

## Product decision

OKF Explorer remains a **static, deterministic, browser-hosted PWA**. This
design does not turn it into an LLM application and does not select Vespa or
any other hosted retrieval platform. The discussion of agents, context
packages and model-facing retrieval below is retained as research background:
it explains why precise retrieval matters, but it is not the implementation
scope for Explorer.

The implementation scope is:

* deterministic lexical candidate generation;
* typed, inspectable filters and dynamic facets;
* explainable, benchmarked ranking;
* durable URL state for searches, filters and sorting;
* backwards-compatible static indexes; and
* retrieval evaluation independent of any language model.

Explicitly out of scope are model invocation, prompt construction, embeddings,
an agent API, a context compiler, a hosted retrieval dependency and a
commitment to Vespa. Future systems may consume exported OKF records, but the
Explorer itself remains useful and complete without them.

## Overall assessment

The article makes an important argument: **many apparent language-model failures are actually failures in constructing the model’s context**. An answer may look hallucinated, confused or incomplete because the decisive evidence was never retrieved, irrelevant material was admitted, or contradictory records were not ranked and resolved before generation. ([The New Stack][1])

This is highly relevant to the OKF Explorer. Its strategic value is not merely that it lets people browse an OKF bundle. It can become a **governed context-construction layer** serving both:

* humans investigating a knowledge domain; and
* agents assembling a precise, traceable evidence package before invoking a language model.

The key architectural insight is that **search, filtering, ranking, exploration and context assembly are different operations**. They should not be collapsed into a single search box or delegated wholesale to the LLM.

---

# 1. What the article is arguing

The New Stack article was published on 10 July 2026, written by Isaac Flath and sponsored by Vespa.ai. That sponsorship matters: its technical argument is credible, but the implied answer naturally favours a unified search and retrieval platform of Vespa’s kind. ([The New Stack][1])

Its central claims are broadly sound.

## 1.1 Retrieval quality becomes more important as models improve

A weak model may fail even when given the correct material. A strong model increasingly fails because it was given:

* the wrong documents;
* an incomplete subset;
* obsolete evidence;
* semantically similar but operationally irrelevant information;
* contradictory sources without provenance or authority signals; or
* too much low-value context.

The article describes retrieval failures masquerading as generation failures. For example, what appears to be hallucination may mean that the authoritative answer source never entered the context window. ([The New Stack][1])

This is consistent with broader RAG research. Irrelevant documents can reduce answer quality, increase computational cost and make results less consistent. MAIN-RAG, for example, reports improvements from dynamically filtering retrieved documents rather than passing the initial result set directly to the generator. ([arXiv][2])

## 1.2 The agent should plan retrieval, not implement retrieval itself

The associated Vespa formulation separates two responsibilities:

1. **The agent plans the investigation**

   * What information is needed?
   * Which sources and object types matter?
   * What constraints should apply?
   * Is further retrieval required?

2. **The retrieval layer executes the plan**

   * searching;
   * filtering;
   * ranking;
   * joining or traversing relationships;
   * enriching records;
   * enforcing access rules;
   * returning evidence.

That separation is valuable. It prevents the LLM from becoming an improvised database engine and allows retrieval behaviour to be deterministic, testable and governed. ([Vespa.ai][3])

## 1.3 Vector similarity is only one retrieval signal

Semantic or vector search is useful for identifying conceptually related material, but it does not reliably answer questions such as:

* Is this record current?
* Is it legally authoritative?
* Does it apply to England rather than Scotland?
* Is this an API, dataset, guidance document or policy?
* Is it accessible under the user’s credentials?
* Does it have the required licence?
* Is it production-ready?
* Is this the canonical version?
* Does the endpoint support the required operation?

Production retrieval therefore normally combines:

* lexical matching;
* semantic similarity;
* structured filtering;
* entity and relationship traversal;
* recency;
* authority and provenance;
* business rules;
* access control;
* deduplication;
* reranking.

Vespa’s description of production RAG explicitly includes lexical retrieval, vectors, metadata filters, freshness, security and domain-specific ranking rather than vector similarity alone. ([Vespa.ai][4])

---

# 2. Search and filtering are not the same thing

The distinction can be expressed quite precisely.

## Search asks: “Which items appear relevant?”

Search is normally **graded**.

Each candidate can receive a relevance score based on signals such as:

[
S(d,q)=w_lL(d,q)+w_sV(d,q)+w_eE(d,q)+w_rR(d)+w_aA(d)
]

where:

* (L) = lexical match;
* (V) = vector or semantic similarity;
* (E) = entity or relationship relevance;
* (R) = recency;
* (A) = authority;
* (w) values control their relative influence.

Search produces candidates and usually orders them.

For example:

> Find records relevant to “property boundary data suitable for automated planning checks”.

The correct results may not contain those exact words. Semantic expansion, synonyms and relationship traversal may therefore be needed.

## Filtering asks: “Which items are admissible?”

Filtering is usually **categorical or Boolean**:

[
F(d)=
(\text{jurisdiction}=\text{England})
\land
(\text{licence permits reuse})
\land
(\text{status}=\text{active})
\land
(\text{access}\neq\text{unavailable})
]

A record either satisfies the constraint or it does not.

For example:

> Include only operational APIs, maintained by public bodies, with machine-readable documentation and a known reuse basis.

A record could be highly semantically relevant but fail those constraints. It should not reach the final context merely because its embedding is close to the query.

## Ranking asks: “In what order should admissible candidates appear?”

Ranking is distinct again. After searching and filtering, the system may prefer:

* canonical records over mirrors;
* primary sources over commentary;
* current specifications over superseded versions;
* direct evidence over inferred metadata;
* complete records over sparse records;
* records with working endpoints over historical descriptions.

## Faceting asks: “What structure exists within the current result space?”

Facets are not simply a row of fixed filter buttons. Proper facets expose the distribution of values **within the candidate set**.

For instance, a search for “address services” might reveal facets such as:

* record type: API, dataset, standard, documentation;
* publisher: Ordnance Survey, HM Land Registry, ONS;
* access: open, account required, commercial;
* geography: GB, UK, England;
* interface: REST, download, OGC API, MCP;
* identifier: UPRN, postcode, TOID.

As the result set changes, useful facets may also change. Research on dynamic faceted search over knowledge graphs describes facets that adapt to the selected content rather than remaining globally fixed. ([arXiv][5])

## Context selection asks: “What should actually enter the model?”

Even the top-ranked records may not all belong in the prompt.

Context selection must account for:

* token budget;
* diversity of evidence;
* duplication;
* contradictions;
* required relationship paths;
* sufficient surrounding context;
* provenance;
* the model’s immediate task.

This produces a **context package**, not merely a list of search results.

---

# 3. A useful pipeline for OKF Explorer

The Explorer should treat retrieval as a staged process:

[
\text{Intent}
\rightarrow
\text{Scope}
\rightarrow
\text{Candidate generation}
\rightarrow
\text{Filtering}
\rightarrow
\text{Relationship expansion}
\rightarrow
\text{Ranking}
\rightarrow
\text{Evidence selection}
\rightarrow
\text{Context package}
\rightarrow
\text{LLM}
]

Each stage answers a different question.

| Stage                  | Question                                         | Likely OKF mechanism                               |
| ---------------------- | ------------------------------------------------ | -------------------------------------------------- |
| Intent interpretation  | What is the user trying to establish or do?      | Query planner, persona and task profile            |
| Scope                  | Which collections and object types are relevant? | Bundle, namespace, record-type selection           |
| Candidate generation   | What might be relevant?                          | Text, semantic and identifier search               |
| Filtering              | What is permitted and applicable?                | Typed OKF properties and policy constraints        |
| Relationship expansion | What connected records are needed?               | OKF links, entities and provenance graph           |
| Ranking                | Which evidence is strongest?                     | Authority, currency, completeness and relevance    |
| Evidence selection     | What should fit in context?                      | Deduplication, diversity and token budgeting       |
| Context packaging      | How should the evidence be represented?          | Structured JSON/YAML/JSON-LD plus concise excerpts |
| Generation or action   | What conclusion or action follows?               | LLM or agent runtime                               |

This is more disciplined than:

[
\text{User question}
\rightarrow
\text{vector search}
\rightarrow
\text{top 10 chunks}
\rightarrow
\text{LLM}
]

---

# 4. Why OKF is particularly well suited to this

A conventional RAG index is often centred on chunks of text. OKF has the potential to preserve much more of the information needed for reliable retrieval.

## 4.1 OKF records can carry typed retrieval signals

An OKF record can expose structured attributes such as:

* title and description;
* record type;
* publisher;
* source tier;
* jurisdiction;
* temporal coverage;
* status;
* licence;
* access model;
* authentication;
* endpoint and documentation hosts;
* standards conformance;
* provenance;
* confidence;
* inferred versus asserted fields;
* relationships to other records.

These fields are not just display metadata. They are **retrieval controls**.

For example, `sourceTier = primary` can be used both:

* as a visible facet for a person; and
* as a hard or weighted constraint in an agent’s retrieval plan.

## 4.2 Relationships can retrieve context that similarity misses

Suppose the initial result is an API record. The model may also need:

* its OpenAPI specification;
* the underlying dataset;
* the publisher;
* licence terms;
* authentication instructions;
* an Arazzo workflow;
* related standards;
* replacement or supersession relationships;
* known limitations;
* example invocations.

A chunk-based similarity search may retrieve several passages describing the API but fail to retrieve the licence or the superseding service.

An OKF relationship graph can make the expansion explicit:

```text
API
 ├─ documentedBy → API documentation
 ├─ describedBy → OpenAPI document
 ├─ exposes → dataset
 ├─ governedBy → terms and licence
 ├─ operatedBy → organisation
 ├─ supersedes → former API
 └─ participatesIn → Arazzo workflow
```

This is the difference between **retrieving things that sound relevant** and **constructing the evidence structure required to answer correctly**.

Recent graph-based retrieval research similarly reports gains from modelling agents, tools and their relationships rather than matching only a single descriptive string. ([arXiv][6])

## 4.3 Provenance and authority can be first-class ranking features

For government information, relevance alone is not enough. A blog explaining an API might be more semantically similar to a user’s wording than the authoritative specification, but the specification should normally receive greater evidential weight.

A possible ranking model for OKF Explorer is:

[
\text{rank} =
0.30(\text{task relevance})+
0.20(\text{source authority})+
0.15(\text{currency})+
0.15(\text{record completeness})+
0.10(\text{relationship support})+
0.10(\text{operational validity})
]

The weights should differ by task. For example:

* discovery may favour recall and semantic relevance;
* compliance assessment should favour authority and applicability;
* endpoint invocation should favour operational status and machine-readable specifications;
* historical research should not automatically penalise age.

---

# 5. The Explorer should distinguish four user interactions

At present, interfaces often use “search” to describe several different behaviours. OKF Explorer would benefit from naming them separately.

## A. Search

Used when the user does not yet know exactly which records matter.

Examples:

* “services related to flood risk”;
* “APIs that could help establish a property’s administrative context”;
* “guidance about safe agent access”.

This should use hybrid candidate generation: identifiers, full text, synonyms, embeddings and possibly graph signals.

## B. Filter

Used when the user knows an admissibility condition.

Examples:

* source tier is primary;
* jurisdiction includes England;
* status is active;
* licence permits reuse;
* documentation is present;
* authentication is OAuth 2.0;
* record type is API.

Filters should be deterministic and inspectable.

## C. Explore

Used when the user is learning the shape of the information space.

Examples:

* What publishers appear?
* Which standards are common?
* What access models are represented?
* Which records have no declared licence?
* What relationships cluster around this API?

This is where dynamic facets, graph navigation and visual groupings matter most.

## D. Assemble context

Used when enough evidence has been found and the user or agent wants to hand a bounded package to an LLM.

Examples:

* “Answer using these selected primary records.”
* “Prepare an invocation plan from this API, specification and workflow.”
* “Compare these services, retaining licence and provenance information.”
* “Build context for an agent but exclude unverified inferred fields.”

This fourth interaction is the crucial extension. It turns OKF Explorer from a catalogue UI into an **agent-first context workbench**.

---

# 6. Human-friendly facets and agent filters should share one semantic layer

A major strength of the AF/HF approach is that human exploration and agent retrieval do not require two unrelated systems.

A person might select:

> APIs → active → open access → primary sources → geospatial

An agent could express the equivalent as:

```yaml
scope:
  record_types:
    - api
constraints:
  status:
    include: [active]
  access_model:
    include: [open]
  source_tier:
    include: [primary]
  domains:
    include: [geospatial]
```

Both should resolve against the same OKF schema and return the same result universe.

This provides:

* explainability;
* reproducibility;
* parity between UI and API;
* easier testing;
* less risk that the agent sees a different data model from the human reviewer.

The user interface can therefore become a **visual query-plan editor**. Each selected facet is not merely a front-end state change; it is a machine-readable retrieval instruction.

---

# 7. Context packages rather than raw result dumps

The Explorer should not pass the complete selected records indiscriminately to the model. It should compile them into an explicit context package.

A useful package might contain:

```yaml
task:
  question: >
    Identify suitable authoritative address APIs for a UK government service.
  intended_action: compare
  audience: government architect

retrieval_plan:
  candidate_methods:
    - lexical
    - semantic
    - relationship_traversal
  hard_filters:
    record_type: api
    status: active
    source_tier: primary
  ranking_profile: authoritative-operational

evidence:
  - record_id: os-places-api
    relevance_score: 0.92
    authority_score: 1.00
    selected_fields:
      - title
      - description
      - access_model
      - licence_basis
      - endpoint
      - documentation
    supporting_relationships:
      - exposes: os-addressbase
      - operated_by: ordnance-survey

excluded:
  - record_id: historical-address-api
    reason: superseded
  - record_id: third-party-blog
    reason: secondary source

uncertainties:
  - record_id: example-api
    field: licence_basis
    state: missing

provenance:
  retrieved_at: ...
  bundle_version: ...
  query_plan_hash: ...
```

The LLM would then receive:

1. the task;
2. selected evidence;
3. relationship paths;
4. explicit exclusions;
5. missing or uncertain facts;
6. provenance.

This is substantially safer than supplying a concatenated set of text chunks.

---

# 8. Filtering must not become premature exclusion

There is an important counterpoint to the article’s emphasis.

Filtering improves precision, but badly chosen filters can silently destroy recall.

For example:

* filtering to `recordType = API` may exclude a dataset whose download endpoint is the actual answer;
* filtering to `licence = Open Government Licence` may exclude records where the licence is merely undeclared;
* filtering to `status = active` may omit a replacement relationship stored only on a deprecated record;
* filtering to “primary source” may exclude a useful technical evaluation needed to identify implementation problems.

The system should therefore distinguish:

### Hard constraints

Records failing these cannot be used.

Examples:

* user lacks permission;
* wrong jurisdiction;
* explicitly incompatible licence;
* revoked or unsafe endpoint.

### Soft preferences

These influence ranking but do not exclude.

Examples:

* prefer primary sources;
* prefer newer records;
* prefer complete metadata;
* prefer machine-readable documentation.

### Investigative facets

These help the user understand the space without implying correctness.

Examples:

* publisher;
* format;
* topic;
* relationship type;
* source tier.

### Unknown-state handling

Missing data must not be treated as false.

These are distinct:

```text
licence = open
licence = restricted
licence = unknown
licence field absent
licence inferred but unverified
```

For OKF, this argues strongly for maintaining the difference between:

* asserted;
* derived;
* inferred;
* missing;
* conflicting;
* not applicable.

---

# 9. Progressive retrieval is more important than “perfect first search”

One especially relevant idea from work on facets and context engineering is that agents do not necessarily need perfect recall in a single operation. They need enough structured knowledge of the result space to refine their investigation intelligently. Faceted retrieval can expose the dimensions along which the next query should be narrowed or expanded. ([jxnl.co][7])

An OKF-oriented agent might proceed as follows:

1. Search broadly for “planning constraint data”.
2. Inspect returned facets:

   * flood risk;
   * heritage;
   * highways;
   * environmental designations;
   * local plans.
3. Select the relevant categories.
4. Traverse from datasets to APIs and standards.
5. Identify gaps in geographic coverage or licence evidence.
6. Run targeted retrieval for those gaps.
7. stop when the evidence sufficiency test is met.

That gives the agent an **investigation loop**, rather than a single RAG call.

```text
PLAN
  ↓
RETRIEVE
  ↓
INSPECT RESULT LANDSCAPE
  ↓
REFINE / EXPAND / FILTER
  ↓
ASSESS EVIDENCE SUFFICIENCY
  ├─ insufficient → repeat
  └─ sufficient → compile context
```

---

# 10. Implications for the OKF Explorer interface

The current three-part design—facets on the left, exploration in the centre and a detailed record card on the right—is already close to the correct architecture. I would extend its meaning.

## Left: query and admissibility controls

The left-hand panel should distinguish visually between:

* **Search terms** — candidate generation;
* **Filters** — hard inclusion and exclusion;
* **Preferences** — ranking weights;
* **Facets** — exploration of the current result set;
* **Agent constraints** — permissions, token budget, evidence requirements.

A user should be able to see why each control exists and whether it narrows, reorders or merely groups results.

## Centre: evidence landscape

The central canvas should support multiple views of the same candidate set:

* ranked list;
* cards;
* table;
* graph;
* map;
* timeline;
* publisher grouping;
* schema or record-type grouping;
* gaps and missing-data view.

This allows users and agents to inspect not just individual records but **the shape and adequacy of the candidate evidence**.

## Right: evidence card

The right-hand card should show more than descriptive metadata:

* why the record matched;
* which filters it passed;
* ranking signals;
* source authority;
* freshness;
* provenance;
* asserted versus inferred fields;
* related records;
* replacement or supersession;
* excerpts selected for model context;
* token cost;
* inclusion or exclusion status.

A useful control would be:

> **Add to context as:** authoritative evidence / supporting evidence / counter-evidence / background / relationship only.

---

# 11. An “agent view” should expose the retrieval reasoning

The Explorer should be able to show a retrieval trace such as:

```text
1. Interpreted “current UK address API” as:
   - domain: addressing
   - geography: United Kingdom
   - record type preference: API
   - currency requirement: current

2. Generated 47 candidates:
   - 21 lexical
   - 31 semantic
   - 8 identifier matches
   - 13 overlapping candidates

3. Applied hard constraints:
   - excluded 6 withdrawn services
   - excluded 4 non-UK records

4. Expanded relationships:
   - added 5 specifications
   - added 3 licence records
   - added 2 replacement services

5. Ranked by:
   - authority
   - operational status
   - task relevance
   - documentation completeness

6. Selected 7 records for context.
```

This is useful for human trust, but it is also an evaluation artefact. When an answer is wrong, developers can determine whether the failure arose from:

* intent interpretation;
* candidate generation;
* filtering;
* graph expansion;
* ranking;
* context selection;
* or generation.

Without this separation, every failure is simply labelled “the AI got it wrong”.

---

# 12. Retrieval evaluation for OKF Explorer

The Explorer should be evaluated independently of the LLM.

## Candidate-generation measures

* Recall@k
* identifier-match success;
* lexical versus semantic contribution;
* coverage of relevant record types.

## Filter measures

* false exclusion rate;
* treatment of unknown values;
* policy-constraint compliance;
* permission leakage.

## Ranking measures

* nDCG;
* Mean Reciprocal Rank;
* primary-source placement;
* current-versus-superseded ordering.

## Context-package measures

* evidence precision;
* evidence coverage;
* duplication rate;
* contradiction coverage;
* provenance completeness;
* token efficiency;
* proportion of unsupported claims in the eventual answer.

## End-to-end measures

* answer correctness;
* citation correctness;
* task completion;
* reproducibility;
* robustness to paraphrased questions;
* performance under incomplete metadata.

The MAIN-RAG result is instructive here: reducing irrelevant material improved both accuracy and consistency. It supports evaluating the **selected context**, not merely whether a nominally relevant item appeared somewhere among the first results. ([arXiv][2])

---

# 13. Recommended architectural direction

OKF Explorer should have three static, browser-compatible layers.

## 1. Knowledge layer

The versioned OKF bundle contains records, typed fields, relationships,
provenance, assertions, uncertainty and source snapshots. Missing, inferred and
asserted values must remain distinguishable wherever the source data supports
that distinction.

## 2. Static retrieval layer

The generated corpus contains a backwards-compatible lexical index and lazy
filter postings. A browser worker performs identifier and text matching,
structured filtering, dynamic facet counting and deterministic ranking. It
returns both results and an explanation of which fields and score components
matched.

The retrieval contract must not depend on a hosted service. A v1 corpus remains
readable through the current search and full-index filtering fallback; a v2
corpus can apply filters before the result limit without hydrating the complete
record index.

## 3. Interaction layer

The human Explorer distinguishes search terms, filters and sort order while
showing a single, consistent result universe across reader, graph, timeline and
other views. Retrieval-affecting state is represented by inspectable query
parameters, while the selected record remains a hash route.

---

# 14. Specific additions to OKF Explorer

The highest-value additions are:

### Durable retrieval state

Represent query text, repeated facet values and sort order as a small typed
state object. Encode it with `q`, repeated `filter.<facet>` parameters and
`sort`; keep the current hash route for record selection. Back and Forward must
restore the same reduction.

### Explicit filter semantics

Use OR between values selected within one facet and AND between different
facets. Missing values receive a stable internal sentinel and the human label
“Not specified (metadata gap)”. Facet counts are calculated against the current
query and all filters except the facet whose values are being counted.

### Explainable deterministic ranking

Compare the current field-weighted score with IDF-adjusted field weighting and
an IDF variant that adds exact title, identifier and phrase boosts. Display
matched fields and understandable reasons rather than an unexplained numeric
score. Relevance, newest, title and metadata-quality sorts remain deterministic.

### Backwards-compatible static index

Extend the static search manifest with optional, lazy filter postings. Apply
filters before the result limit when those postings exist; retain the current
v1 loading and filtering path when they do not.

### Retrieval benchmark

Create representative questions with graded expected records, prohibited or
misleading records and required filters. Measure Recall@20, nDCG@10,
exact-identifier success, filter correctness, warm-query latency and generated
asset size. A ranking change should ship only when it clears the declared
quality and performance gates.

---

# Conclusion

The relevance of the article to OKF Explorer is deeper than “we need better search”, but the product response is deliberately narrower than building a RAG or agent platform.

The important proposition is:

> **People should be able to see and reproduce what was searched, filtered,
> ranked and excluded.**

OKF Explorer already contains many of the right building blocks:

* structured records;
* facets;
* relationships;
* provenance;
* enriched cards;
* multiple navigational views;
* human-readable exploration.

The next step is to treat those capabilities as parts of a formal **static
retrieval system**:

[
\boxed{
\text{OKF Explorer}
===================

\text{Knowledge Explorer}
+
\text{Lexical Retrieval}
+
\text{Structured Filtering}
+
\text{Explainable Ranking}
}
]

That differentiates Explorer from an ordinary catalogue without coupling it to
a language model or hosted search product. The same URL-addressable knowledge
landscape remains available to people and ordinary software clients, with
clear control over what is searched, filtered, ranked and excluded.

[1]: https://thenewstack.io/retrieval-ai-agent-architecture/?utm_source=chatgpt.com "Why retrieval quality is becoming the defining challenge in ..."
[2]: https://arxiv.org/abs/2501.00332?utm_source=chatgpt.com "MAIN-RAG: Multi-Agent Filtering Retrieval-Augmented Generation"
[3]: https://vespa.ai/ai-agents/?utm_source=chatgpt.com "Retrieval for AI Agents | Build Production AI ..."
[4]: https://vespa.ai/retrieval-augmented-generation/?utm_source=chatgpt.com "AI Retrieval for Generative AI | RAG at Scale"
[5]: https://arxiv.org/abs/2107.05738?utm_source=chatgpt.com "Demonstration of Faceted Search on Scholarly Knowledge Graphs"
[6]: https://arxiv.org/abs/2511.18194?utm_source=chatgpt.com "Agent-as-a-Graph: Knowledge Graph-Based Tool and Agent Retrieval for LLM Multi-Agent Systems"
[7]: https://jxnl.co/writing/2025/08/27/facets-context-engineering/?utm_source=chatgpt.com "Beyond Chunks: Why Context Engineering is the Future of ..."
