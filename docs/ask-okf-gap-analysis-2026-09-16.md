# Ask OKF: inspection and gap analysis

Inspection baseline: Explorer `ab2e863b`, DWP `75936d5f`, 16 September 2026.
This analysis was recorded before implementation.

## What exists

* Static lexical search, organisation aliases, explicit query policies and bounded
  browser workers. There is no general domain concept resolver or vector search.
* Rich directed assertions, provenance, route lookup and incident adjacency
  indexes. Large bundles hydrate individual records without downloading the corpus.
* A local Python MCP retrieval prototype. Its `context_pack` ranks lexical hits
  and trims bodies/relationships to fit bytes; it does not close dependencies or
  establish answerability. Its evaluation measures record hits, not answers.
* Evaluation Foundry separates frozen candidates from observations and binds
  results to consumer identities. DWP has source locators and exposed research
  trials, but these are not context-engine evaluations.
* No registered browser WebMCP context tools. Page tool registration and client
  connectivity must be verified separately.

## Why the demonstration failed

A multi-part question is not a lexical search query. Search's meaningful-token
policy cannot perform the missing concept resolution and dependency traversal.
The DWP bundle also lacks the necessary semantic chain: the imprisonment
payability concept has six incident assertions, connecting custody/remand and
three source pages, rather than all benefit-specific destinations. Its adjacency
buckets match the complete relationship shards in both directions and endpoint
labels exist. This is evidence of a modelling omission, not dropped incoming
edges. View filters and graph caps remain separate display constraints.

The frozen corpus contains Chapters 12, 24, 41, 42, 53, 54 and 78. However,
12003's payment/entitlement distinction is scoped to the benefits listed in
12002. Paragraph 12015 routes the requested benefits elsewhere. Chapter 24
expressly discusses no entitlement; ESA has further qualifications in Chapters
41 and 42. The acceptance expectation must preserve these qualifications.

The frozen memo history records the withdrawal of Memo 07/20 after its
regulations ceased effect on 31 August 2021. Some chapter annotations still
refer to it. Paragraph 12016's ADM M1 reference also needs a stale-route warning:
the current ADM catalogue lists M1 as spare. ADM bodies are outside this snapshot.

## Required additions

1. An independent deterministic context library, an additive producer index and
   a versioned package contract, leaving Search and the MCP v1 baseline intact.
2. Explicit concept aliases, source passages, directed references and mandatory
   dependencies authored by the bundle. Dependencies retain exceptions and scope.
3. A separate Ask OKF interface and read-only tools over the same library.
4. A–H evaluations of source, semantics, retrieval, traversal, assembly,
   provenance, boundaries and answerability, plus non-DWP and negative controls.
5. Explicit limits: evidence closure within a declared research scope is not an
   individual entitlement decision, current-law verification or specialist review.

See the [architecture decision](adr-ask-okf-context-assembly.md).
