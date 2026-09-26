# Bounded evidence packages: implementation status

Assessment date: 26 September 2026. Code baseline: Explorer `c80c2c696aa554a4879a6c85fc2ffcfa0c5112b7`; DWP `5d2f083202e60edac5ec395dc27fc6e7af285e5b`.

**The useful core is implemented; the complete research proposal is not.**
A bounded evidence package (BEP) is a limited collection of evidence, reasons for
selection, source identities and visible gaps. It is not an AI answer. Publishing
the [BEP research](bep-research.md) does not adopt its proposed schema or make its
experiments production acceptance tests.

## What is implemented

| Capability | Repository evidence | Limit |
| --- | --- | --- |
| Shared, deterministic context assembly | [Context engine](../apps/okf-explorer/src/lib/context/index.ts) and [types](../apps/okf-explorer/src/lib/context/types.ts) | Uses `okf-governed-context.v1`, not the reconstructed research envelope. |
| Provenance, authority, directed paths, declared requirements and explicit gaps | [Context types](../apps/okf-explorer/src/lib/context/types.ts), [A–H evaluation method](context-assembly-evaluation.md) | Missing evidence stays missing. A requirement can only be checked when a producer has declared it adequately. |
| Bounded selection and evidence status after trimming | [Context engine](../apps/okf-explorer/src/lib/context/index.ts), [regression tests](../apps/okf-explorer/src/lib/context/context.test.ts) | Retrieval and assembly limits are separate; either can prevent a complete result. |
| Read-only remote access using the same engine | [MCP service](../services/ask-okf-mcp/src/service.ts) | Client support and observed deployment are separate from the existence of code. |
| Compact catalogue, exact evidence slices and browser replay link | `ask_okf_manifest` and `read_okf_evidence` in the [service](../services/ask-okf-mcp/src/service.ts) | Follow continuations with the same source, engine, budget and context identity. Verify the digest; a partial slice may omit qualifications. A replay link is not a stored audit log or an answer. |
| Human inspection and source-linked reading help | [Evidence workbench](evidence-workbench.md), [reading help](reading-help.md) | Displaying source evidence does not establish legal answerability. Reading help is a separate producer capability. |

These are code and contract findings. Tests cited above are evidence of intended
coverage, not a new whole-corpus or live-client trial. For dated deployment and
client receipts use the [service publication record](remote-mcp-publication.md)
and its shared DWP reference. Do not replace that receipt-backed record with an
unqualified claim that a service is currently deployed or callable in every host.

## What has not been adopted or demonstrated

- **Research schema migration:** the reconstructed
  `bep-core.v0.1-reconstructed.1` profile and its `package_id` are a separate,
  explicitly incompatible proposal. Production uses `context_id`. No reviewed,
  versioned adapter or information-preserving migration is recorded. See the
  [migration proposal](../research/bep_research_A_RECONSTRUCTED_2026-09-19/compatibility_migration.md).
- **Cross-runtime canonicalisation:** production has deterministic serialisation
  for its current identity domain. That is not proof of conformance to a new
  canonical JSON standard or proof that independent implementations generate
  the same identity. Research test vectors do not supply that production proof.
- **Alternative storage architecture:** the research discusses database and
  workflow options, including PostgreSQL and DBOS. Comparative storage and
  serving benchmarks remain proposed. Adopting those products is conditional,
  not a missing prerequisite for today’s file-backed service.
- **Restricted-data assurance:** this exemplar is designed for public evidence.
  It does not establish a reviewed access-control or retention system for
  confidential claimant data.
- **Complete domain evidence and answer quality:** source capture, package
  reconstruction and transport success do not discharge unresolved legal or
  question-scope obligations. The [dated DWP source-led results](https://github.com/chris-page-gov/okf-dwp/blob/5d2f083202e60edac5ec395dc27fc6e7af285e5b/docs/source-led-results.md)
  still record insufficient packages and open obligations. Those historical
  results are not silently upgraded by later reader improvements.

## What to do next

For broader DMG and ADM reading help, improve source-bound passages, local
reference linking and scoped explanations first; a wholesale BEP rewrite is not
required. Use the existing governed context and delivery contracts while testing
new producer annotations independently.

If the research profile is worth adopting, first write a small contract-mapping
matrix and freeze migration fixtures. Add an adapter alongside the old contract,
prove that provenance and limitations survive round trips, then evaluate clients
at fixed evidence and equal budgets. Do not rename the current format and claim
research conformance. Keep storage experiments and legal acceptance as separate
work items. Jev-Mem is deferred until after the presentation.
