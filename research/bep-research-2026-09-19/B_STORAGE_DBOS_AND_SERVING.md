# Research B: storage, compilation and efficient deterministic BEP serving

## Task

Produce a rigorous research report and experimentally actionable architecture comparison for serving bounded evidence packages (BEPs) efficiently and deterministically. Explain the relevant database domain, assess Mike Stonebraker's arguments and the DBOS research/product landscape, and recommend the simplest architecture justified by evidence. Complete the report rather than returning another plan. Do not assume DBOS or a graph database must be adopted.

Use British English. Date baseline: 19 September 2026. Cite primary papers, official specifications, product documentation and inspected source. Separate vendor claims from independent evidence and proposed hypotheses from measured results. Do not extrapolate synthetic benchmark throughput to BEP workloads.

## Project and immutable baseline

The desired path is:

`OKF bundle → Ask OKF → bounded evidence package → remote MCP → compatible conversational/voice client`

Repository: https://github.com/chris-page-gov/okf-explorer

Starting revision: `905e680f6d3ad385de9b8effc351566eba0ab2b3`.

Inspect `docs/adr-ask-okf-context-assembly.md`, `docs/ask-okf-gap-analysis-2026-09-16.md`, `docs/ask-okf-ui-verification.md`, and `apps/okf-explorer/src/lib/context/{types.ts,index.ts,context.test.ts,webmcp.ts}`. Pin actual dependencies/runtime when benchmarking. Newer commits and unseen local Codex work must be distinguished from this baseline.

The current compiler is a transport-independent TypeScript library with declared-phrase concept resolution, governed directed traversal, producer-authored requirements, whole evidence records, explicit gaps and budgets, and no model call or automatic external retrieval. Output schema: `okf-governed-context.v1`; index: `okf-context-index.v1`; engine: `okf-context-assembly.v1`. It must remain compatible with existing browser use and distinct from the older Python retrieval prototype.

For this research, a BEP is a bounded, version-bound evidence artefact, not an answer. Semantic requirements include source/provenance fidelity, dependency and qualification preservation, explicit omissions/conflicts, scope and time binding, and repeatable immutable content. Structural closure alone is not proof of domain correctness. Where the companion semantics research is unavailable, state these as provisional requirements and make physical-design decisions conditional.

## 1. Explain the database design space

Give the reader a useful mental model separating logical data model, physical layout, indexes, query planning/execution, caching/materialisation, consistency/transactions, durable workflow coordination, and end-to-end application semantics.

Explain point lookup versus range/search versus graph expansion versus analytical scan; row and column layouts; locality and batching; indexes versus full scans; WAL/write amplification; MVCC snapshots; connection and network costs; and why a graph-shaped logical model does not by itself select a graph database. Relate each mechanism to a concrete BEP operation rather than writing a generic database survey.

Analyse the Stonebraker interview using the publisher's transcript, preserving timestamps and distinguishing opinion, historical result and current product fact:

https://www.developing.dev/p/turing-award-winner-postgres-disagreeing

User video: https://youtu.be/YPObBOwIrHk

Relevant sections include 9:07, 15:55, 21:37, 28:12, 30:58 and 42:02. Treat arguments about specialisation, graph storage and consistency as hypotheses to assess, not authority that ends debate. Test whether a simple general-purpose system is sufficient at the actual workload size before proposing specialist infrastructure.

Read the original database research needed to support or qualify the interview, especially the 2025 communication-bottleneck paper. Consider boundary-crossing and security-isolation costs, not only CPU time inside a database kernel. Do not remove authorisation or isolation to obtain an attractive benchmark.

## 2. Investigate DBOS precisely

Separate the academic DBOS project at https://github.com/DBOS-project and https://dbos-project.github.io/ from the commercial/open-source product ecosystem at https://www.dbos.dev/ and https://github.com/dbos-inc . Inspect the current TypeScript library at https://github.com/dbos-inc/dbos-transact-ts because the existing compiler is TypeScript. Pin the release/commit used in any experiment; do not port languages without a reason.

Explain workflow state, durable steps, checkpoint storage, queues, replay, compatible workflow-code versions, retention, recovery coordination and Conductor's role. Distinguish the required orchestration data store from databases holding application evidence and from object storage holding large immutable artefacts. Verify current configuration and language-specific differences rather than projecting Python features onto TypeScript.

Create a guarantee matrix for:

- Repeatable selection/byte-identical BEP production.
- Replay of already recorded workflow outcomes.
- Retrying an uncheckpointed step.
- Exactly-once database effects within a supported transactional integration.
- Idempotency and uncertain outcomes at external HTTP/object-storage boundaries.
- Workflow atomicity, transaction isolation, compensation, currentness and semantic correctness.

Do not describe all of these as “exactly once”. A checkpointed result may be replayable although its original generation was stochastic. A completed local checkpoint does not make an arbitrary external side effect transactionally atomic.

Read *Consistency and Correctness in Data-Oriented Workflow Systems* (CIDR 2026). Distinguish its prototype and advocated guarantees from current released DBOS capabilities. Discuss implications for publication and access changes, not only read-only retrieval.

Audit the published DBOS/Postgres benchmark. Its April 2026 headline reports 43K no-op workflows per second with no steps on a 96-vCPU, 384-GB-RAM RDS instance and 120K provisioned IOPS. Treat this as a supplier experiment in workflow overhead, not BEP capacity. Inspect hardware, workload, step sizes, durability, queueing, concurrency and bottlenecks. Review newer relevant benchmarks separately; do not silently merge results across versions or workloads.

Analyse logical checkpoint writes per workflow and step, plus queue, evidence-store and audit writes. Do not store the full evidence package repeatedly as every step result when references suffice. Measure the effect of returning small content-addressed references versus large JSON values.

## 3. Formalise the deterministic serving boundary

Define the pure compilation function from frozen bundle/index digests, explicit typed request, scope/effective time, versioned policies/requirements/access view, budgets and engine/resolver/serialisation versions to an immutable evidence core.

Separate request identity, immutable content identity, consumer projection identity and execution receipt. Define hash preimages and avoid including changing timestamps or the hash field itself. Preserve source/capture dates as evidence metadata. Choose a canonicalisation profile and total order for arrays and ties; test cross-process and cross-runtime behaviour.

A `latest` alias must resolve once to a publication manifest; all downstream references must be pinned. For mutable relational reads, assess the required transaction snapshot rather than assuming separate default reads see one consistent dataset. Immutably addressed artefacts may permit a simpler design.

Cover index rebuilds, approximate nearest-neighbour retrieval, floating point scores, collation/Unicode versions, parallel traversal ordering and wall-clock cut-offs. Non-deterministic discovery is only compatible with strict reproducibility when its accepted result becomes a pinned explicit input. Operational timeouts must not masquerade as a canonical partial answer.

For future restricted deployments, identify the authorisation enforcement point and safe cache partitioning, including revocation, resource existence leakage, sensitive query text, policy updates and information-flow through composed evidence. Content addressing is not authorisation or anonymisation. Public-only current behaviour must not be described as an implemented multi-tenant access-control system.

## 4. Compare physical architectures

Establish at least these candidates, with identical semantics and canonical output:

A. The existing static/browser-compatible compiler with validated immutable indexes, plus a minimal server adapter.

B. Compiled local in-memory or SQLite-backed indexes and bounded content-addressed cache.

C. PostgreSQL for aliases, evidence/relationship/requirement indexes, versioned manifests and query execution; immutable payloads may remain in object storage.

D. The same data/serving design with DBOS only around recoverable ingestion, compilation, validation and publication.

E. The same design with DBOS on request-time cache misses or all requests, to quantify when durability justifies additional writes and latency.

Include a native graph database or specialised engine only where its workload advantage can be tested. Consider analytical columnar formats/engines for corpus inspection, evaluation and bulk transformations separately from latency-sensitive serving. Consider provenance-aware relational tools such as ProvSQL as candidates, not mandatory dependencies.

Specify a candidate physical schema with immutable evidence atoms, directed assertions, requirement profiles, source manifests, alias lookup, artefact references and cache entries. Identify indexes, partition keys, memory layout, query plans, fetch batching and byte accounting. Keep transport and logical contracts independent from backend selection.

Assess build-time versus request-time work. Compile stable aliases and adjacency once; investigate materialisation of frequently reused requirement closures, dependency groups and popular request/profile combinations. Do not propose precomputing every possible question, budget and access combination. Report storage growth, refresh cost and invalidation dependencies.

For publication, analyse writing immutable objects first, verifying them, and then atomically publishing a manifest reference. Address crash-created orphan objects, garbage collection, mixed-version prevention and safe retries. Do not assume an object store and PostgreSQL participate in one atomic transaction.

Consider no-op cache hits, cold loading, frequent bundle changes, skewed popularity, very high-degree nodes, concurrent publication and multiple tenants. Keep denial/revocation decisions current even when a historical public/evidence artefact is immutable.

## 5. Build a reproducible performance experiment

Specify representative corpus sizes, graph degree/depth, aliases, evidence lengths, metadata volume, budget sizes, query families, publication frequency, cache-hit distribution and concurrency. Include actual permitted OKF bundles plus synthetic stress fixtures. Record licences and all corpus/model/runtime/hardware revisions. Use baseline measurements to choose meaningful load ranges rather than inventing a national-scale capacity claim.

Measure per-stage latency and p50/p95/p99 under warm and cold conditions, throughput at specified error and latency limits, CPU, memory, bytes/rows/edges examined, storage reads/writes, WAL volume, checkpoint size, connection/network round trips, cache hits and resource cost. Separate in-process assembly, HTTP/MCP transport, model processing and speech latency. Compare equivalent durability and authorisation settings.

Require byte-identical canonical output for equivalent requests across backends and repeated executions. Run failures during source ingestion, index creation, object upload, publication, cache fill and response transmission. Test duplicate requests, worker restarts, database connection loss, version rollout, revoked access, missing objects and timeouts. Assess recoverability and audit completeness, not just throughput.

Use a durable external request identifier for workflows and deduplication where appropriate, but keep it distinct from content identity. Specify tenant scoping and normalisation so an idempotency key cannot accidentally retrieve another user's result.

Give an explicit protocol, commands/pseudocode, dataset generator design, run manifest, raw-result schema and statistical analysis plan. Label all SLOs and cost assumptions as proposed until measured. If execution is unavailable, do not simulate observations or claim the benchmark ran.

## 6. Consumer and deployment boundary

Use a thin read-only MCP adapter over the same compiler. Verify the protocol version and output-schema support. Account for structured results and compatibility text duplication. Do not assume linked resources are consumed, nor that a server receipt proves successful model grounding.

Verify the chosen ChatGPT/voice host independently of MCP server conformance. The current OpenAI Voice documentation distinguishes Live, Advanced, Standard and desktop experiences; it says Live does not initially support connected apps/plugins, while general app documentation makes voice support conditional. Consult current official documentation and test actual invocation. A custom voice API client is a separate deployment/cost/security option, not evidence that the consumer product already supports the path.

## Required outputs

Deliver a domain explanation, cited interview-to-evidence map, DBOS guarantee matrix, alternatives/decision matrix, provisional schema/index design, system/data-flow diagrams, deterministic compilation and publication contracts, reproducible benchmark specification, failure/recovery test plan, cost model and compatibility-conscious implementation backlog.

End with conditional recommendations: what to build first, what evidence would justify DBOS or another backend, and what would falsify each recommendation. Do not deploy, migrate or modify the production repository during research.

## Primary starting sources

- Interview transcript: https://www.developing.dev/p/turing-award-winner-postgres-disagreeing
- DBOS academic programme: https://dbos-project.github.io/
- DBOS architecture: https://docs.dbos.dev/architecture
- DBOS steps: https://docs.dbos.dev/python/tutorials/step-tutorial
- DBOS datasource transactions: https://docs.dbos.dev/python/tutorials/transaction-tutorial
- DBOS throughput benchmark: https://www.dbos.dev/blog/benchmarking-workflow-execution-scalability-on-postgres
- Workflow correctness, CIDR 2026: https://www.vldb.org/cidrdb/papers/2026/p9-stonebraker.pdf
- Communication bottlenecks, CIDR 2025: https://vldb.org/cidrdb/papers/2025/p17-zhou.pdf
- PostgreSQL ordering: https://www.postgresql.org/docs/current/queries-order.html
- PostgreSQL isolation: https://www.postgresql.org/docs/current/transaction-iso.html
- PostgreSQL materialised views: https://www.postgresql.org/docs/current/rules-materializedviews.html
- SQLite appropriate uses: https://www.sqlite.org/whentouse.html
- ProvSQL: https://provsql.org/
- MCP tools: https://modelcontextprotocol.io/specification/2026-07-28/server/tools
- OpenAI Voice: https://help.openai.com/en/articles/20001274
- OpenAI connected apps: https://help.openai.com/en/articles/11487775-connectors-in-chatgpt

Follow product-specific links to current TypeScript documentation before implementation. The Python sources above establish important concepts, not cross-language API equivalence.
