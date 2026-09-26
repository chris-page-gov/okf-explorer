# Research A — bounded evidence packages
## Recovered analysis with reconstructed supporting artefacts

**Delivery correction dated 19 September 2026.** This is not the missing original ZIP.
The analytical sections below are recovered from the saved final report. Its source
associations were translated using saved citation metadata. No complete fresh literature
review or claim-by-claim source audit has been performed. Source-specific current checking
in this reconstruction is recorded in `sources-expanded.json` and `search_log.csv`.

The earlier table of “Produced”, “validated” and “rescanned” statuses is withdrawn as an
accepted delivery record: the linked original artefacts and execution receipts were not
recovered. New files and new tests are documented in [DELIVERY_AUDIT.md](DELIVERY_AUDIT.md)
and [verification.json](verification.json). These do not prove the earlier claimed runs occurred.

The RO-Crate version/date statement was rechecked: version 1.3, Recommendation,
22 June 2026. [S36] Draft 2020-12 and RFC 8785 were also consulted for the replacement
schema and bounded canonicalisation tests. [S43, S28]

### Executive synthesis

A BEP should be treated as a version-bound evidence contract, not a generated answer.
The recovered research proposes explicit request interpretation, dependency and qualification
preservation, bounded work and payload, visible omissions and conflicts, and reproducible
identity. These compose substantial prior art rather than establish novelty merely by naming
a package. Evaluate source modelling, assembly and consumer use separately.

The supplied replacement profile is deliberately labelled `bep-core.v0.1-reconstructed.1`.
It is an experimental proposal, not the original missing schema, not an OKF standard and
not a change to the existing Ask OKF contract. The fixtures are fictional and the validator
checks shape and selected integrity/coverage invariants; it cannot certify truth, permission,
complete domain modelling, successful retrieval or useful model answers.

## BEP research findings and proposed semantic contract

### Prior art and novelty

The research supports a **composition/integration claim**, not a “nothing like this existed before” claim.

Database provenance established long ago that the derivation and origin of an answer can be modelled separately from the answer itself; W3C PROV subsequently standardised a general model of entities, activities, agents and provenance relationships. Nanopublication and Trusty URI work add small attributable assertions and content-verifiable linked artefacts. RO-Crate packages aggregated research objects and metadata; the current RO-Crate recommendation is **1.3, published 22 June 2026**, so the brief's 1.2 reference should be retained as historical input rather than silently treated as current. [S36]

RAG research supplies another part of the picture: GraphRAG performs graph-plus-text context construction; “Sufficient Context” separates retrieval/context insufficiency from a model's failure to use adequate context; AIS and ALCE study attribution/citation quality; “Lost in the Middle” demonstrates that supplying relevant material does not guarantee effective use; and RECOMP experiments with selective and compressed contexts. These address neighbouring problems, but do not collectively amount to the proposed deterministic, provenance-bound BEP contract. [S24, S19, S20, S21, S25, S26]

Proof-carrying code is also a useful negative comparison: it demonstrates what “proof-carrying” genuinely means—a consumer checks a formal safety proof against a policy. A BEP traversal path explaining why evidence was selected is **not** thereby a logical proof of a legal, factual or statistical conclusion. [S37]

A reconstructed prior-art matrix derived from this analysis is:

**[Download `prior_art_matrix.csv`](prior_art_matrix.csv)**

The resulting novelty position is:

> A BEP is not novel because it contains evidence, provenance, hashes, graphs or bounded context. The research proposition is the integration of those techniques into a request-bound, deterministic, omission-aware evidence contract that can be inspected by humans and delivered unchanged to heterogeneous AI consumers.

That proposition remains to be experimentally validated.

### Proposed definition — retained research proposal

The proposed definition is:

> **A bounded evidence package is a version-bound, access-bound and resource-bounded machine-readable artefact for an explicitly represented request. It preserves selected evidence, its source/provenance/authority metadata, declared dependencies and qualifications, and explicit ambiguity, conflict and omission states. Its immutable core can be deterministically rebuilt from identified inputs. It is not itself a model answer, an exhaustive archive or a formal proof.**

“Bounded” must cover more than byte size:

| Boundary | Required meaning |
|---|---|
| Task and scope | What request, domain, jurisdiction and represented interpretation the package addresses |
| Authority | Which classes of source are admissible and how their authority is represented |
| Time | Source publication/release, capture date, effective/as-of date and bundle snapshot |
| Access | The caller's permitted evidence view, without leaking restricted records |
| Payload | Bytes, records, relationships and consumer projection |
| Computational work | Deterministic traversal/selection limits, separately from infrastructure timeout |

### Deterministic request boundary

End-to-end voice interaction need not be deterministic. Speech recognition, conversational reference resolution and an LLM-generated plan may vary.

The defensible boundary is:

```text
spoken utterance
    ↓  potentially non-deterministic
accepted transcript / request interpretation
    ↓
explicit immutable compiler input
    ↓  deterministic boundary begins
resolve → traverse → requirements → select → package
```

The accepted request should therefore capture, where relevant, concepts, negation, temporal scope, jurisdiction, unresolved ambiguity and preceding conversational context.

### Coverage rather than an unqualified “sufficient”

Three distinct claims need separate fields:

| Claim | Question it answers |
|---|---|
| Schema/integrity validity | Is the object well formed and are its content/hash bindings intact? |
| Declared-requirement coverage | Are the applicable producer-authored support and qualification requirements represented? |
| Evidential status | Given those declared requirements and scope, is evidence sufficient, insufficient, conflicting or unknown? |

The pinned implementation's semantics already limit sufficiency to declared producer requirements. The proposed projection makes that explicit as:

```json
{
  "coverage": {
    "schema_valid": true,
    "integrity_valid": "valid",
    "declared_requirements": "complete",
    "evidential_status": "sufficient-within-declared-scope"
  }
}
```

That does **not** assert that all facts or exceptions in the world have been modelled.

Producer requirements themselves need provenance and review status. They should permit AND/OR structures because valid evidence can involve either alternative support sets or mandatory combinations such as:

```text
rule
AND condition
AND qualification
AND applicable exception
```

Omission also requires types rather than one undifferentiated “missing” state:

```text
absent_source
not_modelled
ambiguous
unsupported
out_of_scope
budget_omitted
inaccessible
operational_failure
```

An access-controlled system must be able to report “not available in this access view” without revealing a restricted record's identity or even existence where policy forbids that disclosure.

### Identity and canonicalisation

Four different guarantees should be named:

**semantic reproducibility** → same represented meaning and coverage;

**selection reproducibility** → same selected evidence and relations;

**byte reproducibility** → same canonical immutable bytes and hash;

**replay reproducibility** → ability to rerun execution, although timing/telemetry can change.

A request/cache key and package content hash serve different purposes and should remain separate.

For canonical JSON, RFC 8785 JCS is a reasonable candidate profile because it defines invariant serialization using the I-JSON subset and deterministic property sorting. It prohibits duplicate member names and requires Unicode strings to be preserved as supplied rather than Unicode-normalised during canonicalisation. [S38, S39]

The proposed content-hash preimage is domain-separated:

```text
UTF8("BEP\0core\0v0.1\0")
    ||
JCS(immutable_core_without_package_id_or_execution_receipt)
```

followed by SHA-256.

This avoids self-referential hashing and prevents a hash used for another object type/version from silently becoming a BEP identity.

The pinned Ask OKF engine's custom `canonicalJson()` recursively sorts object keys and uses JavaScript serialization. That is an **inspected implementation fact**, but the research did not find evidence that the function has passed the RFC 8785 conformance corpus. It therefore should not be labelled “JCS” without further tests.

JSON canonicalisation and RDF canonicalisation are separate matters. W3C's RDFC-1.0 is a 2024 Recommendation for canonicalising RDF datasets and warns explicitly that adversarial graph structures can make canonicalisation computationally expensive, so implementations need resource-exhaustion defences. [S40] A JSON-LD/RDF projection should consequently have its own profile and identifier rather than sharing the JSON core's byte identity.

The following are newly reconstructed replacements, not recovered original artefacts:

**[Download the proposed BEP JSON Schema](bep-core-v0.1-reconstructed.schema.json)**  
**[Download the valid minimal example](examples/valid-minimal.json)**  
**[Download the valid numeric-observation example](examples/valid-numeric-observation.json)**  
**[Download the deliberately invalid example](examples/invalid-missing-provenance.json)**  
**[Download the canonicalisation test vectors](canonicalisation-vectors.json)**

The schema is explicitly labelled **`bep-core.v0.1-reconstructed.1`**. It is research output, not a published standard.

### Heterogeneous evidence

BEP evidence should not assume that every source is prose.

A statistical observation needs at least its value, unit, denominator where applicable, dimensions, source release and any transformation formula. A legal or guidance passage needs exact authority, locator, scope and effective/version information. An API-capability record needs protocol/schema version, relevant access assumptions and observation time. A model-generated summary remains a **derived artefact** and must not silently inherit the source's “official” assertion status.

This is particularly relevant to MCP. The July 2026 MCP revision expanded tool schemas to full JSON Schema 2020-12 and widened structured tool results, strengthening the case for a genuine machine-readable BEP rather than a large Markdown string. [S41, S42] A transport envelope, however, is not evidence that the downstream model actually read or understood every supplied field.

## Reproducible experiment, evaluation and threat model

### Safe rerun without touching production

The reconstructed execution procedure is in [EXECUTION.md](EXECUTION.md). Local schema,
semantic-integrity and canonicalisation tests are distinct from tests of the real Ask OKF
engine. Docker, production deployment, model consumption and voice interoperability have
not been executed in this reconstruction. The earlier Docker fragment is not retained as
an allegedly tested implementation.

### Independent evaluation

The reconstructed specification and synthetic starter corpus are:

**[Download `evaluation_spec.json`](evaluation_spec.json)**  
**[Download `sample_corpus.jsonl`](sample_corpus.jsonl)**

The benchmark deliberately does **not** use the compiler's own producer requirements as its sole answer key. Gold cases independently describe acceptable evidence sets, required qualifications, forbidden conclusions, source/version constraints and unanswerable cases.

The controlled system comparison is:

| System | Purpose |
|---|---|
| Lexical top-k | Basic relevance baseline |
| Graph + text, no declared closure | Separates graph retrieval from requirement closure |
| Pinned Ask OKF | Existing implementation baseline |
| Dependency-aware greedy packing | Main selection hypothesis |
| Exact optimisation on small cases | Selection-quality oracle rather than production design |

The corpus then varies four diagnostic conditions:

```text
ordinary request + ordinary evidence
oracle request interpretation
oracle evidence
oracle request + oracle evidence
```

This localises whether a failure occurred in interpretation, retrieval/traversal, assembly or downstream reasoning.

Primary metrics include critical-evidence recall, exception recall, unsupported-sufficiency rate, false abstention, conflict handling, citation correctness/completeness, unsupported claims, temporal/scope conflation, exact canonical replay, complete wire bytes, named-tokeniser counts and per-stage latency.

An always-abstaining system must not “win” merely because it makes no unsupported assertions: report both correctness **and coverage**, or a predeclared utility measure. Sufficient-context research supports separating context adequacy from model-use failure, while attribution work likewise shows that answer correctness and source support are different dimensions. [S19, S20, S21]

For voice, the primary BEP comparison starts from an accepted transcript. ASR errors are a separate condition. The crucial voice metrics are whether mandatory qualifications and unresolved uncertainty survive into spoken output—not simply whether the response is shorter. Position-sensitive long-context behaviour is itself a reason to test exact consumer projections rather than assume that putting more evidence into the context always helps. [S25]

### Threat model

**[Download `threat_model.csv`](threat_model.csv)**

The highest-priority threats are:

| Threat | Principal control |
|---|---|
| Prompt injection embedded in evidence | Evidence remains inert/untrusted data; no source instructions executed |
| Forged authority | Authority registry/binding plus provenance; never trust a textual label alone |
| Stale or revoked source | Explicit source/effective/capture dates and version constraints |
| Restricted-evidence leakage | Access-view-bound packages and non-disclosing diagnostics |
| Cache/access confusion | Cache key includes access view, policy, time, request and source/index versions |
| Canonicalisation ambiguity | Versioned canonicalisation profile and conformance vectors |
| Mutable JSON-LD context | Pin context content/version; no unrestricted run-time dereference |
| Graph/canonicalisation denial of service | Deterministic work bounds and abort semantics; RDFC-1.0 itself warns about adversarial datasets [S40] |
| Omission laundering | Distinguish missing source, not modelled, inaccessible and budget omitted |
| Runtime citation-token leakage | Stable source references plus post-conversion scanner and release gate |
| MCP structured/text drift | Derive duplicate projections from one canonical source |
| Model summary inheriting official authority | Keep summaries explicitly derived/model-generated |

### Hypothesis ledger

**[Download `hypothesis_ledger.csv`](hypothesis_ledger.csv)**

The highest-priority falsifiable hypothesis remains:

> At equal payload budget, dependency-aware selection of atomic evidence groups will reduce critical-evidence/exception omission and unsupported “sufficient” outcomes relative to relevance-only top-k retrieval.

It is falsified if held-out evaluation shows no material and statistically credible improvement under controlled payload and consumer conditions.

The next most important hypothesis for your intended voice use is that **qualification retention predicts useful/safe spoken answers better than byte reduction alone**. That, too, is empirical rather than an architectural assumption.


## Source register

The full status of each source is recorded in [sources-expanded.json](sources-expanded.json).

**S01.** [Ask OKF architecture decision](https://github.com/chris-page-gov/okf-explorer/blob/905e680f6d3ad385de9b8effc351566eba0ab2b3/docs/adr-ask-okf-context-assembly.md) — recovered seed not rechecked in reconstruction.

**S02.** [Ask OKF context types](https://github.com/chris-page-gov/okf-explorer/blob/905e680f6d3ad385de9b8effc351566eba0ab2b3/apps/okf-explorer/src/lib/context/types.ts) — recovered seed not rechecked in reconstruction.

**S03.** [Ask OKF context engine](https://github.com/chris-page-gov/okf-explorer/blob/905e680f6d3ad385de9b8effc351566eba0ab2b3/apps/okf-explorer/src/lib/context/index.ts) — recovered seed not rechecked in reconstruction.

**S04.** [Ask OKF interface and page-tool verification](https://github.com/chris-page-gov/okf-explorer/blob/905e680f6d3ad385de9b8effc351566eba0ab2b3/docs/ask-okf-ui-verification.md) — recovered seed not rechecked in reconstruction.

**S05.** [Ask OKF pre-implementation gap analysis](https://github.com/chris-page-gov/okf-explorer/blob/905e680f6d3ad385de9b8effc351566eba0ab2b3/docs/ask-okf-gap-analysis-2026-09-16.md) — recovered seed not rechecked in reconstruction.

**S06.** [Mike Stonebraker interview — publisher transcript](https://www.developing.dev/p/turing-award-winner-postgres-disagreeing) — recovered seed not rechecked in reconstruction.

**S07.** [DBOS academic project](https://dbos-project.github.io/) — recovered seed not rechecked in reconstruction.

**S08.** [DBOS architecture](https://docs.dbos.dev/architecture) — recovered seed not rechecked in reconstruction.

**S09.** [DBOS steps](https://docs.dbos.dev/python/tutorials/step-tutorial) — recovered seed not rechecked in reconstruction.

**S10.** [DBOS datasource transactions](https://docs.dbos.dev/python/tutorials/transaction-tutorial) — recovered seed not rechecked in reconstruction.

**S11.** [Benchmarking How Workflow Execution Scales on Postgres](https://www.dbos.dev/blog/benchmarking-workflow-execution-scalability-on-postgres) — recovered seed not rechecked in reconstruction.

**S12.** [Consistency and Correctness in Data-Oriented Workflow Systems](https://www.vldb.org/cidrdb/papers/2026/p9-stonebraker.pdf) — recovered seed not rechecked in reconstruction.

**S13.** [OLTP Through the Looking Glass 16 Years Later: Communication is the New Bottleneck](https://vldb.org/cidrdb/papers/2025/p17-zhou.pdf) — recovered seed not rechecked in reconstruction.

**S14.** [Nanopublications](https://nanopub.net/) — recovered seed not rechecked in reconstruction.

**S15.** [PROV-DM: The PROV Data Model](https://www.w3.org/TR/prov-dm/) — recovered seed not rechecked in reconstruction.

**S16.** [Trusty URIs: Verifiable, Immutable, and Permanent Digital Artifacts for Linked Data](https://arxiv.org/abs/1401.5775) — recovered seed not rechecked in reconstruction.

**S17.** [RO-Crate 1.2](https://www.researchobject.org/ro-crate/specification/1.2/) — recovered seed not rechecked in reconstruction.

**S18.** [ProvSQL](https://provsql.org/) — recovered seed not rechecked in reconstruction.

**S19.** [Sufficient Context: A New Lens on Retrieval Augmented Generation Systems](https://arxiv.org/abs/2411.06037) — recovered seed not rechecked in reconstruction.

**S20.** [Measuring Attribution in Natural Language Generation Models](https://arxiv.org/abs/2112.12870) — recovered seed not rechecked in reconstruction.

**S21.** [Enabling Large Language Models to Generate Text with Citations](https://arxiv.org/abs/2305.14627) — recovered seed not rechecked in reconstruction.

**S22.** [ChatGPT Voice](https://help.openai.com/en/articles/20001274) — recovered seed not rechecked in reconstruction.

**S23.** [Connected apps in ChatGPT](https://help.openai.com/en/articles/11487775-connectors-in-chatgpt) — recovered seed not rechecked in reconstruction.

**S24.** [GraphRAG local search](https://microsoft.github.io/graphrag/query/local_search/) — recovered seed not rechecked in reconstruction.

**S25.** [Lost in the Middle: How Language Models Use Long Contexts](https://arxiv.org/abs/2307.03172) — recovered seed not rechecked in reconstruction.

**S26.** [RECOMP: Improving Retrieval-Augmented LMs with Compression and Selective Augmentation](https://arxiv.org/abs/2310.04408) — recovered seed not rechecked in reconstruction.

**S27.** [From OKE Alerts to RCA Drafts: Building a Guardrailed OpenClaw Incident Assistant on OCI](https://blogs.oracle.com/cloud-infrastructure/oke-incident-postmortem-autopilot-openclaw-genai) — recovered seed not rechecked in reconstruction.

**S28.** [RFC 8785: JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785) — primary page read during reconstruction.

**S29.** [MCP Tools specification, 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/server/tools) — recovered seed not rechecked in reconstruction.

**S30.** [PostgreSQL: Sorting Rows](https://www.postgresql.org/docs/current/queries-order.html) — recovered seed not rechecked in reconstruction.

**S31.** [PostgreSQL: Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html) — recovered seed not rechecked in reconstruction.

**S32.** [PostgreSQL: Materialized Views](https://www.postgresql.org/docs/current/rules-materializedviews.html) — recovered seed not rechecked in reconstruction.

**S33.** [Appropriate Uses For SQLite](https://www.sqlite.org/whentouse.html) — recovered seed not rechecked in reconstruction.

**S34.** [DBOS TypeScript library](https://github.com/dbos-inc/dbos-transact-ts) — recovered seed not rechecked in reconstruction.

**S35.** [Malalimang pananaliksik sa ChatGPT | OpenAI Help Center](https://help.openai.com/fil-ph/articles/10500283-deep-research) — recovered reference not rechecked.

**S36.** [RO-Crate 1.3 | Research Object Crate (RO-Crate)](https://www.researchobject.org/ro-crate/specification/1.3/index.html) — primary page read during reconstruction.

**S37.** [https://doi.org/10.1145/263699.263712](https://doi.org/10.1145/263699.263712) — recovered reference not rechecked.

**S38.** [RFC 8785: JSON Canonicalization Scheme (JCS) | RFC Editor](https://www.rfc-editor.org/info/rfc8785/) — recovered reference not rechecked.

**S39.** [RFC 8785: JSON Canonicalization Scheme (JCS)](https://www.rfc-editor.org/rfc/rfc8785.html) — recovered reference not rechecked.

**S40.** [RDF Dataset Canonicalization](https://www.w3.org/TR/rdf-canon/) — recovered reference not rechecked.

**S41.** [The 2026-07-28 MCP Specification Release Candidate | Model Context Protocol Blog](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/) — recovered reference not rechecked.

**S42.** [The 2026-07-28 Specification | Model Context Protocol Blog](https://blog.modelcontextprotocol.io/posts/2026-07-28/) — recovered reference not rechecked.

**S43.** [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12) — primary page read during reconstruction.
