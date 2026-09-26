# Source register

Checked on 19 September 2026. These are starting sources for the two research tasks, not an exhaustive bibliography. Mutable documentation should be version-pinned again when experiments are run. Source content has not been bundled or redistributed.

## S01 — Ask OKF architecture decision

**Type:** Pinned project architecture

**Source:** https://github.com/chris-page-gov/okf-explorer/blob/905e680f6d3ad385de9b8effc351566eba0ab2b3/docs/adr-ask-okf-context-assembly.md

Scope and boundaries of deterministic context assembly.

## S02 — Ask OKF context types

**Type:** Pinned implementation

**Source:** https://github.com/chris-page-gov/okf-explorer/blob/905e680f6d3ad385de9b8effc351566eba0ab2b3/apps/okf-explorer/src/lib/context/types.ts

The existing package, record, assertion and requirement types.

## S03 — Ask OKF context engine

**Type:** Pinned implementation

**Source:** https://github.com/chris-page-gov/okf-explorer/blob/905e680f6d3ad385de9b8effc351566eba0ab2b3/apps/okf-explorer/src/lib/context/index.ts

Inspected definitions include budgets, validation, canonicalisation and phrase resolution; not a completed code audit.

## S04 — Ask OKF interface and page-tool verification

**Type:** Project test receipt

**Source:** https://github.com/chris-page-gov/okf-explorer/blob/905e680f6d3ad385de9b8effc351566eba0ab2b3/docs/ask-okf-ui-verification.md

Reports local verification; explicitly separates deployment and actual AI-host invocation.

## S05 — Ask OKF pre-implementation gap analysis

**Type:** Historical project analysis

**Source:** https://github.com/chris-page-gov/okf-explorer/blob/905e680f6d3ad385de9b8effc351566eba0ab2b3/docs/ask-okf-gap-analysis-2026-09-16.md

The recorded producer-modelling gap must not be mistaken for a present-day benefits ruling.

## S06 — Mike Stonebraker interview — publisher transcript

**Type:** Primary interview transcript

**Source:** https://www.developing.dev/p/turing-award-winner-postgres-disagreeing

Published 20 April 2026. Interview opinions require evaluation, not automatic adoption.

## S07 — DBOS academic project

**Type:** Research programme

**Source:** https://dbos-project.github.io/

Academic publications and code, distinct from the product ecosystem.

## S08 — DBOS architecture

**Type:** Current supplier documentation

**Source:** https://docs.dbos.dev/architecture

Workflow architecture, recovery, versioning and storage considerations.

## S09 — DBOS steps

**Type:** Current supplier documentation

**Source:** https://docs.dbos.dev/python/tutorials/step-tutorial

Python step behaviour. Verify TypeScript equivalents before implementation.

## S10 — DBOS datasource transactions

**Type:** Current supplier documentation

**Source:** https://docs.dbos.dev/python/tutorials/transaction-tutorial

Atomic recording of supported database transactions; not arbitrary external effects.

## S11 — Benchmarking How Workflow Execution Scales on Postgres

**Type:** Supplier benchmark

**Source:** https://www.dbos.dev/blog/benchmarking-workflow-execution-scalability-on-postgres

No-op workflow and queue experiments, not BEP assembly or service-capacity measurements.

## S12 — Consistency and Correctness in Data-Oriented Workflow Systems

**Type:** CIDR 2026 research paper

**Source:** https://www.vldb.org/cidrdb/papers/2026/p9-stonebraker.pdf

Workflow guarantees and a prototype. Not a blanket statement of released product functionality.

## S13 — OLTP Through the Looking Glass 16 Years Later: Communication is the New Bottleneck

**Type:** CIDR 2025 research paper

**Source:** https://vldb.org/cidrdb/papers/2025/p17-zhou.pdf

End-to-end communication and isolation overheads in studied transaction workloads.

## S14 — Nanopublications

**Type:** Project specification overview

**Source:** https://nanopub.net/

Atomic assertions with provenance and publication metadata.

## S15 — PROV-DM: The PROV Data Model

**Type:** W3C Recommendation

**Source:** https://www.w3.org/TR/prov-dm/

Interoperable provenance modelling.

## S16 — Trusty URIs: Verifiable, Immutable, and Permanent Digital Artifacts for Linked Data

**Type:** Research paper

**Source:** https://arxiv.org/abs/1401.5775

Hash-bound linked artefacts; integrity and identity are not truth.

## S17 — RO-Crate 1.2

**Type:** Community specification

**Source:** https://www.researchobject.org/ro-crate/specification/1.2/

Research-object packaging and linked metadata.

## S18 — ProvSQL

**Type:** Primary project documentation

**Source:** https://provsql.org/

Database query lineage; not automatic semantic validation of source assertions.

## S19 — Sufficient Context: A New Lens on Retrieval Augmented Generation Systems

**Type:** Research paper; version 3, April 2025

**Source:** https://arxiv.org/abs/2411.06037

Separates insufficient evidence from failures to use available context.

## S20 — Measuring Attribution in Natural Language Generation Models

**Type:** Research paper

**Source:** https://arxiv.org/abs/2112.12870

Attributable to Identified Sources (AIS), including human-evaluation guidance.

## S21 — Enabling Large Language Models to Generate Text with Citations

**Type:** Research paper

**Source:** https://arxiv.org/abs/2305.14627

ALCE citation and generation evaluation.

## S22 — ChatGPT Voice

**Type:** Current OpenAI product documentation

**Source:** https://help.openai.com/en/articles/20001274

Distinguishes voice experiences and their capabilities; no Ask OKF invocation was tested.

## S23 — Connected apps in ChatGPT

**Type:** Current OpenAI product documentation

**Source:** https://help.openai.com/en/articles/11487775-connectors-in-chatgpt

Voice support depends on the app and available features.

## S24 — GraphRAG local search

**Type:** Primary project documentation

**Source:** https://microsoft.github.io/graphrag/query/local_search/

Combines graph and text context; not equivalent to the proposed BEP guarantees.

## S25 — Lost in the Middle: How Language Models Use Long Contexts

**Type:** Research paper

**Source:** https://arxiv.org/abs/2307.03172

A reason to test evidence order and length on the actual consumer model.

## S26 — RECOMP: Improving Retrieval-Augmented LMs with Compression and Selective Augmentation

**Type:** Research paper

**Source:** https://arxiv.org/abs/2310.04408

Context compression and selective use as experimental comparators.

## S27 — From OKE Alerts to RCA Drafts: Building a Guardrailed OpenClaw Incident Assistant on OCI

**Type:** Supplier reference implementation

**Source:** https://blogs.oracle.com/cloud-infrastructure/oke-incident-postmortem-autopilot-openclaw-genai

An explicit use of bounded evidence packages; not an interoperability standard.

## S28 — RFC 8785: JSON Canonicalization Scheme

**Type:** IETF-stream informational RFC

**Source:** https://www.rfc-editor.org/rfc/rfc8785

Canonical JSON representation; application-level array semantics still need definition.

## S29 — MCP Tools specification, 2026-07-28

**Type:** Protocol specification

**Source:** https://modelcontextprotocol.io/specification/2026-07-28/server/tools

Structured results and output schemas; client support remains a separate question.

## S30 — PostgreSQL: Sorting Rows

**Type:** PostgreSQL official documentation

**Source:** https://www.postgresql.org/docs/current/queries-order.html

Explicit ordering is required where result order matters.

## S31 — PostgreSQL: Transaction Isolation

**Type:** PostgreSQL official documentation

**Source:** https://www.postgresql.org/docs/current/transaction-iso.html

Read consistency and snapshot semantics.

## S32 — PostgreSQL: Materialized Views

**Type:** PostgreSQL official documentation

**Source:** https://www.postgresql.org/docs/current/rules-materializedviews.html

Stored query results and refresh behaviour.

## S33 — Appropriate Uses For SQLite

**Type:** SQLite official documentation

**Source:** https://www.sqlite.org/whentouse.html

Embedded storage and deployment trade-offs.

## S34 — DBOS TypeScript library

**Type:** Product source repository

**Source:** https://github.com/dbos-inc/dbos-transact-ts

Repository metadata inspected; no library benchmark or comprehensive code audit performed.
