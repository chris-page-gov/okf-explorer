# Bounded Evidence Packages: research programme

Prepared for Chris Page · 19 September 2026

## Purpose and status

Investigate the semantics, evaluation and efficient deterministic serving of bounded evidence packages (BEPs) for:

`OKF bundle → Ask OKF → BEP → remote MCP → a compatible conversational/voice client`

This package contains two self-contained **research instructions**, a checked starting baseline, and a source register. It is not a completed implementation, a published BEP standard, a benchmark result, or confirmation that an MCP tool works in a particular voice client. The accompanying chat contains the initial research findings and recommendations.

No repository was changed. No local, unpushed Codex work was inspected. The shared ChatGPT conversation could not be retrieved through the web reader; repository observations were taken from the pinned public source and the user's stated design.

## Checked implementation baseline

Repository: https://github.com/chris-page-gov/okf-explorer

Inspected main revision: `905e680f6d3ad385de9b8effc351566eba0ab2b3`.

The accepted architecture decision describes a transport-independent TypeScript context-assembly library. It resolves declared concept phrases, follows governed directed assertions, tests producer-authored evidence requirements, preserves whole evidence items, and exposes missing evidence and limits. It has no model dependency or automatic external evidence retrieval. Sufficiency is explicitly limited to declared requirements and scope, not a guarantee that an arbitrary question is fully answered. [S01]

The current package is `okf-governed-context.v1`; the index is `okf-context-index.v1`; the engine identifier is `okf-context-assembly.v1`. The package includes the question, bundle snapshot, index binding, concepts, ambiguities, selected records and paths, relationships, requirements, missing evidence, conflicts, limits, and budgets. `ai_answer` is `null`. Records distinguish official, normalised, inferred and model-derived assertions, alongside authority, scope, source provenance, rights and access labels. The JSON enum uses the spelling `normalized`; preserve literal identifiers. [S02]

The inspected implementation sets `max_bytes` to 524,288 by default, alongside limits on nodes, relationships and depth. The code includes a custom canonical JSON function and source-validation limits. These are implementation facts, not evidence that the default budget is optimal or that canonicalisation is independently standards-conformant. [S03]

The repository's UI verification document reports local tests and explicitly distinguishes those from production deployment, native WebMCP/AI-host invocation and specialist domain acceptance. It names the optional page tools `okf_build_context` and `okf_explain_context`. Its existing Python MCP retrieval prototype is a separate baseline, not the same context compiler. [S04]

The pre-implementation gap analysis attributes the earlier DWP demonstration's missing relationships to omissions in the authored semantic graph, rather than dropped display edges. This is a reason to evaluate source coverage and semantic authoring separately from retrieval and assembly. Do not turn historical DWP observations into current benefits advice. [S05]

## Working definition — proposed, not a standard

A BEP is a bounded, version-bound evidence artefact for an explicitly represented request. It preserves the selected source evidence, its provenance and qualifications, the declared dependencies required to use it, and an account of ambiguity, conflict and omission. Its immutable content can be rebuilt deterministically from identified inputs. It is not itself a model answer or a proof that the world's relevant evidence has been exhausted.

Use this definition as a hypothesis to refine, not an axiom that excludes useful prior art.

## How to run the research

Run `A_BEP_SEMANTICS_AND_EVALUATION.md` and `B_STORAGE_DBOS_AND_SERVING.md` as separate research tasks. Each repeats the essential context and authoritative source links; `SOURCES.md` supplies the wider source register. The tasks can proceed independently, but the final physical-design recommendation in B must respect the semantic contract developed in A.

Suggested instruction to accompany either attached brief:

> Read the attached research brief and source register in full. Execute the research, using the pinned repository baseline and checking current primary sources. Deliver the completed cited report and the requested research artefacts, not another plan. Distinguish inspected implementation, published evidence, vendor claims, hypotheses and measurements. Do not modify or deploy the production repository. Where execution or access is unavailable, state the exact limitation and still complete the analysis and executable experimental specification.

The word “research” here is a task description, not a claim that a particular interface has invoked a special Deep Research product mode.

## Initial hypotheses to test

H1. Dependency-aware selection of complete evidence groups reduces false sufficiency and omitted exceptions compared with relevance-ranked top-k retrieval at the same payload budget.

H2. Moving stable alias/index preparation and reusable evidence-group construction to bundle publication reduces online assembly work without changing package bytes or evidence semantics.

H3. A canonical machine-readable core plus deterministic consumer projections improves interoperability without requiring every model to consume archive-sized metadata.

H4. Content-addressed immutable data enables safe reuse; request, policy and access-view identity determine when reuse is legitimate. A hash is neither authorisation nor anonymisation.

H5. DBOS is more valuable initially for recoverable ingestion, validation and publication than for every successful read-only cache hit. This must be tested against a simple non-DBOS baseline.

H6. For voice, preservation of qualifications and correct handling of missing information matters more than reducing package bytes alone. Source selection, model response and spoken delivery must be evaluated separately.

None of these hypotheses has been demonstrated by a BEP benchmark in this research session.

## Integration and handover gates

The integrated result should yield a compatibility-conscious BEP profile, a conformance corpus, an independently authored semantic benchmark, a performance benchmark with reproducible environment manifests, and an architecture decision comparing alternatives.

A later implementation task must begin by comparing its actual local/remote revision with the pinned baseline. Keep one shared compiler, not separate semantic implementations for browser, HTTP and remote MCP. Do not replace existing contracts silently; specify adapters, profile additions or a versioned migration.

Verify the exact host and mode in an end-to-end test. On 19 September 2026, OpenAI's Voice documentation says Live does not initially support connected apps or plugins; the connected-apps documentation says voice support varies by app and available features. Desktop voice is described separately. These statements do not establish that this particular Ask OKF server is callable in Chris's intended voice experience. [S22, S23]

## Main decision to make

What is the lowest-cost production and serving architecture that preserves the agreed evidence semantics, reproducibility, access boundaries and user-visible qualifications under realistic load and failure?

Do not select a database merely because the logical representation is a graph, and do not select durable orchestration merely because the output must be deterministic.
