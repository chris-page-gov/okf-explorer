# Research A: bounded evidence packages — prior art, contract and evaluation

## Task

Produce a rigorous, balanced research report on bounded evidence packages (BEPs): their predecessors, semantic contract, representations, production and consumption, and experimentally justified optimisation. Produce the completed report and requested research artefacts, not just a proposed plan. Recommendations must be testable and must distinguish authority, integrity, structural coverage and substantive correctness.

Research date baseline: 19 September 2026. Use British English. Verify live claims against current primary sources. Cite original papers, standards, project specifications and inspected source code. Treat supplier documentation as primary evidence of a supplier's design or claims, not independent validation of comparative performance.

## Project context

The intended path is:

`OKF bundle → Ask OKF → bounded evidence package → remote MCP → compatible model/voice client`

Human inspection remains available through OKF Explorer. Search, deterministic evidence assembly and model reasoning are distinct. The context compiler must not silently introduce model-generated evidence, fetch unrestricted external sources or treat an inferred relationship as an official assertion.

Repository: https://github.com/chris-page-gov/okf-explorer

Pinned starting revision: `905e680f6d3ad385de9b8effc351566eba0ab2b3`.

Inspect these paths at that revision:

- `docs/adr-ask-okf-context-assembly.md`
- `docs/ask-okf-gap-analysis-2026-09-16.md`
- `docs/ask-okf-ui-verification.md`
- `apps/okf-explorer/src/lib/context/types.ts`
- `apps/okf-explorer/src/lib/context/index.ts`
- `apps/okf-explorer/src/lib/context/context.test.ts`
- `apps/okf-explorer/src/lib/context/webmcp.ts`

Compare newer commits separately rather than silently substituting them. Local unpushed work is unknown unless actually supplied.

The existing package is `okf-governed-context.v1`, produced by `okf-context-assembly.v1` from `okf-context-index.v1`. It includes source/index binding, question, scope, resolved concepts, ambiguities, selected records with reasons and directed paths, relationships, producer-authored requirements, missing evidence, conflicts, limits and byte/node/relationship/depth budgets. `ai_answer` is null. Whole evidence records are retained or omitted. Official/normalised/inferred/model-derived status is explicit. Source publication, capture and execution dates must not be conflated.

The accepted ADR limits sufficiency to declared requirements and scope. Dependency closure is not a legal decision, a guarantee of currentness, or proof that every relevant real-world exception was modelled. An earlier DWP demonstration exposed a producer semantic-modelling gap; do not assume every failure is a retrieval failure.

## Questions to answer

### 1. Prior art and novelty

Search conceptually as well as for the literal phrase “bounded evidence package”. Develop a dated, reproducible search log with query families and inclusion/exclusion criteria. Explain coverage limits rather than claiming absence of prior art from a failed exact-phrase search.

Compare at least:

- Provenance-aware database answers; why-, where- and how-provenance; provenance semirings and implementations such as ProvSQL.
- Nanopublications, PROV bundles, Trusty URIs and content-addressed scientific artefacts.
- Research Objects and RO-Crate; archive packaging versus online inference payloads.
- Claim/evidence/argument structures and proof-carrying results, carefully distinguishing informal evidence from formally checked derivations.
- RAG and GraphRAG context construction, sufficient-context classification, evidence-set retrieval, multi-hop support paths, selective prediction and abstention.
- Extractive and abstractive context compression, source citation/attribution and consumption evaluation.
- Practical evidence packages for incident analysis, governance or other domains.

A directly relevant published reference is Oracle's August 2026 incident-assistant example, which uses the phrase “bounded evidence package”. It is an example, not evidence of an interoperable BEP standard or equivalent semantic guarantees. Assess its actual limits and what its code establishes.

For every predecessor, record: problem, authors/date/venue, implementation status, representation, bounds, provenance, determinism, sufficiency semantics, treatment of omissions/conflict, consumer interface, evidence of deployment/evaluation and limitations. Distinguish existing features, adaptation, integration and genuinely untested research contributions. Do not manufacture novelty for this project.

### 2. Define the semantic contract

Offer a defensible definition of BEP and distinguish it from search results, prompts, answers, archives and proofs. Define “bounded” across task/scope, authority, time, access, size and computational work.

Propose a minimal interoperable core plus versioned domain/consumer profiles. Assess requirements for prose, structured statistical observations, legal/guidance passages and API capability records; do not assume prose-only evidence covers them all. For numeric observations preserve units, denominators, dimensions, source release and any transformation formula.

Address request interpretation: original question/transcript, resolved concepts, negation, temporal scope, jurisdiction, ambiguity, unstated premises and contextual follow-ups. Specify the boundary at which determinism begins. A speech recogniser or an LLM producing a query plan may be non-deterministic; its accepted output must be made an explicit input rather than concealed inside the compiler.

Keep source assertion status separate from relationship derivation status. A graph path explaining why a record was selected is not automatically a logical proof. Require traceable source locators and hash binding, without claiming that an authentic source is necessarily correct, current or sufficient.

Design coverage semantics for mandatory supporting evidence, definitions, qualifications, exceptions, counter-evidence, conflicts and alternative valid support sets. Investigate AND/OR dependencies, cycles, duplicate assertions and requirements with narrower scope than the question. Treat producer-authored requirements as fallible artefacts with their own version, provenance and review status.

Separate schema/integrity validity, declared requirement coverage and evidential status. Evaluate whether the current top-level `sufficient` status needs a safer scoped projection, while respecting compatibility.

Represent omissions with meaningful distinctions: absent source, not modelled, ambiguous, unsupported, out of scope, budget omitted, inaccessible and operational failure. Do not expose the existence or identity of restricted records through public diagnostics. Specify bounded diagnostic output too.

### 3. Determinism and identity

Define semantic, selection, byte-level and replay reproducibility separately. Define which inputs are part of the guarantee: bundle/index digests, explicit request, engine and resolver versions, policy/requirement versions, access-view binding, budgets, effective time and serialisation profile.

Separate the request/cache key from the content hash. Consider an immutable evidence core, deterministic consumer projections with their own identifiers, and per-execution receipts outside the core. Avoid self-referential hashes: specify the exact hash preimage and domain/version separation. Distinguish mutable resource locations from immutable content identities.

Evaluate RFC 8785 JSON canonicalisation and, when relevant, RDF graph canonicalisation. They are not interchangeable. Specify array order, total tie-breaking, Unicode handling, numeric encoding, null/missing fields, duplicate keys, locale/collation and runtime-version dependencies. Preserve source literal bytes separately from any normalised matching representation. Pin JSON-LD contexts and prohibit unbounded runtime context dereferencing.

Distinguish caching a stochastic model result from reproducing its generation. Different questions are not equivalent merely because their embeddings are similar. Shared evidence-slice caching is acceptable only when all semantics and access constraints needed for equivalence are preserved.

A timeout must not turn a race-dependent partial traversal into an allegedly canonical package. Distinguish deterministic work-budget exhaustion from non-deterministic infrastructure failure.

### 4. Representation and bounded selection

Compare canonical structured JSON, JSON-LD projections, structured metadata plus verbatim evidence, and deterministically rendered human-readable views. Assess source deduplication, dictionary/reference tables, parse overhead, model comprehension and wire overhead. Do not assume JSON, XML or Markdown is universally best.

Count complete response bytes, not just evidence text. Measure token counts under named/pinned tokenisers separately; bytes are not tokens. Account for MCP envelopes, backwards-compatible text duplication, diagnostics and references. A linked resource is not necessarily retrieved or seen by the model.

Evaluate atomic evidence groups: a supporting rule may be unusable without its condition, exception and provenance. Formulate selection under budgets, comparing simple baselines, dependency-aware greedy approaches and exact optimisation on small test cases. Distinguish an unsatisfiable evidence budget from a low-quality selection algorithm. Avoid trimming away a qualification to save space.

Study lossless compression, extractive selection and abstractive summarisation separately. Model-generated summaries must not silently replace the canonical evidence or inherit official authority. A summary is a derived artefact with its own provenance and evaluation.

### 5. Evaluation design

Specify independently authored gold cases rather than using the compiler's own requirement declarations as the only oracle. Include alternative acceptable evidence sets, forbidden conclusions, source-version constraints and unanswerable questions. Use held-out domains, bundle versions, question families and paraphrases to reduce benchmark leakage and memorisation.

Separate producer coverage, concept resolution, retrieval, traversal, assembly, provenance, consumer reasoning and spoken delivery. Include oracle-evidence and oracle-request conditions to localise failures.

Use a controlled comparison with the same frozen corpus, request set, consumer model/version, generation settings and payload budget: lexical top-k; graph-plus-text without declared closure; current Ask OKF; dependency-aware packing; and compatible cached/materialised variants. For representation experiments, hold the actual evidence set constant. For storage experiments, require identical canonical outputs.

Measure critical-evidence/exception recall, unsupported-sufficiency rate, false abstention, correct treatment of conflicts, citation correctness/completeness, unsupported claims, scope/temporal conflation, exact replay identity, payload cost and per-stage latency. Report confidence intervals, sample sizes and critical failure categories. Do not let an always-abstaining system win by avoiding every risky answer. Automatic judges need calibration and independently sampled human review; specialised domains need domain reviewers.

Test deletion of required evidence, contradictory additions, reversed edges, aliases with multiple meanings, identical text from different authorities, revoked/expired evidence, Unicode, malicious source instructions, excessive graph degree, cycles, budget boundaries and reordered inputs. Document which monotonicity properties are promised: larger budgets do not automatically produce nested selections for every optimiser.

For voice, test accepted transcripts separately from speech-recognition errors. Evaluate whether the answer preserves qualifications and unresolved questions, not whether it reads every citation aloud. Retain an inspectable text/evidence view. Record which exact projection was supplied; a server response alone does not prove the model used or understood it.

## Required outputs

Deliver an executive synthesis and full cited report; a prior-art/novelty matrix; a proposed versioned BEP profile and JSON Schema; valid and invalid examples; canonicalisation test vectors; an independent evaluation specification and sample corpus; a threat model; a compatibility/migration note; and a ranked hypothesis ledger with falsification criteria.

Label proposed schemas and thresholds as proposals. Validate generated examples against the schema when execution is available. Report what was and was not executed. Do not modify the production repository or claim a newly implemented service.

## Primary starting sources

- Project ADR: https://github.com/chris-page-gov/okf-explorer/blob/905e680f6d3ad385de9b8effc351566eba0ab2b3/docs/adr-ask-okf-context-assembly.md
- Nanopublications: https://nanopub.net/
- PROV-DM: https://www.w3.org/TR/prov-dm/
- RO-Crate: https://www.researchobject.org/ro-crate/specification/1.2/
- Trusty URIs: https://arxiv.org/abs/1401.5775
- ProvSQL: https://provsql.org/
- Sufficient Context: https://arxiv.org/abs/2411.06037
- Attribution/AIS: https://arxiv.org/abs/2112.12870
- ALCE: https://arxiv.org/abs/2305.14627
- GraphRAG local search: https://microsoft.github.io/graphrag/query/local_search/
- Lost in the Middle: https://arxiv.org/abs/2307.03172
- RECOMP: https://arxiv.org/abs/2310.04408
- Oracle evidence-package example: https://blogs.oracle.com/cloud-infrastructure/oke-incident-postmortem-autopilot-openclaw-genai
- JSON Canonicalisation: https://www.rfc-editor.org/rfc/rfc8785
- MCP tools: https://modelcontextprotocol.io/specification/2026-07-28/server/tools

Expand beyond these seeds. A source list is a starting point, not a conclusion.
