# OKF Explorer architecture and implementation plan

Assessment date: 23 October 2026. Implementation baseline:
`460f7245352e5d1e407d37e9d40a9b2b6b55ee0a`.

Status: maintained architecture and prioritised delivery plan. The capability
inventory below records the implementation at that baseline. Planned acceptance
criteria are future gates, not results already obtained. Update the baseline,
evidence and decisions together when capabilities change.

Explorer has a working foundation for governed knowledge, evidence assembly
and human inspection. The next milestone is a dependable journey from a
question to inspected evidence and a separately assessed explanation. Prioritise
that journey before expanding the feature set.

This plan coordinates current priorities. The [semantic contract](../okf.semantic.json),
[publication contract](../okf.publication.json) and versioned profiles remain
the implementation contracts. Dated architecture documents and experiment
receipts retain their original scope; this plan does not revise their results.

## Product purpose and architecture

Help a person and their AI find, inspect and reuse knowledge while retaining
source identity, meaning, authority, rights, dates and visible gaps. An OKF
bundle can support discovery and explanation within its declared scope.
Professional decisions and operational actions require their own authority.

Keep the small OKF 0.2 core separate from the additive Bundle Wiki and domain
profiles. In this plan, OKF+ refers to the richer experimental knowledge and
evidence practices around those profiles; it does not introduce a new universal
OKF core requirement.

| Layer | Responsibility | Implementation boundary |
| --- | --- | --- |
| Sources and domain authoring | Select sources, retain originals, declare coverage, rights, date roles, concepts, assertions and dependencies | Producer-owned Markdown, YAML-LD and governed source artefacts; domain review remains explicit |
| Build and federation | Validate authored meaning and generate descriptors, JSON/JSON-LD, shards, search indexes and registries | Deterministic projections; independently versioned publication units |
| Evidence assembly | Resolve declared concepts, follow directed assertions and retain whole evidence within explicit budgets | Shared transport-independent context engine; source and engine versions bind each package |
| Human inspection | Search, filter, navigate, read sources, inspect provenance and gaps, and propose corrections | Explorer Reader, reading help and Evidence workbench; a proposal requires separate producer adoption |
| Tool delivery | Expose bounded operations and exact evidence reads | Optional page tools and remote MCP; each has its own source admission, deployment and client observations |
| AI-assisted work | Help author, explain, review and create outputs from admitted evidence | Codex, ChatGPT or another compatible client; model responses remain interpretations with their own assessment |

Assurance spans all layers: source constraints, semantic validation, A–H context
evaluation, failure controls, browser journeys and exact-candidate publication.
Search ranking, graph layout and model confidence must not upgrade authority or
turn missing evidence into a negative fact. Preserve asserted, normalised,
inferred, model-derived, synthetic and historical material as distinct planes.

The [federated architecture](okf-bundle-wiki-architecture-2026-07-11.md),
[context decision](adr-ask-okf-context-assembly.md) and
[Evidence workbench](evidence-workbench.md) describe these existing seams.
The [ontology design](ontology-and-semantic-graph-architecture-2026-07-24.md)
also contains future inference and validation proposals; its presence is not
evidence that every proposed standards capability is implemented.

## Capability inventory

These labels describe implementation maturity, separately from a bundle's
semantic `status`, publication authority or live service health:

- **Implemented:** code and contracts exist for the stated scope. Acceptance
  evidence and deployment claims remain limited to their recorded revisions.
- **Experimental:** an isolated prototype or bounded integration has evidence,
  with adoption or compatibility questions still open.
- **Proposed:** delivery or an acceptance programme remains to be completed.

An implemented transport can have experimental client compatibility. Record
those separately instead of assigning one readiness label to the whole system.

| Capability | State | Evidence and remaining boundary |
| --- | --- | --- |
| OKF 0.2, additive semantic profiles and deterministic projections | Implemented | [Semantic contract](../okf.semantic.json); producer conformance does not establish source truth or completeness |
| Independent bundles, registries and bounded rich-graph loading | Implemented | [Federated architecture](okf-bundle-wiki-architecture-2026-07-11.md); individual source populations and editions require their own coverage evidence |
| Reader search, facets, relationship inspection and shared interaction state | Implemented | [Interaction implementation](explorer-interaction-implementation.md); general learnability and assistive-technology acceptance remain separate |
| Source-bound reading help and passage review | Implemented | [Reading help](reading-help.md), [workbench](evidence-workbench.md); explanations retain review status and unresolved references |
| Foundry authoring profiles, facet validation and evaluation fixtures | Implemented | [Facet policy and gates](foundry-facets.md), [evaluation harness](okf-explorer-evaluation.md); a valid profile does not prove a producer's actual output or Reader passed |
| Project Studio learning pathway | Implemented documentation | [Eight-stage pathway](project-studio/index.md); an integrated guided authoring application is proposed |
| Bounded context assembly and independent A–H controls | Implemented | [Engine](../apps/okf-explorer/src/lib/context/index.ts), [evaluation](context-assembly-evaluation.md); sufficiency is limited to adequately declared requirements and scope |
| Compact remote MCP delivery, versioned replay and exact reads | Implemented transport | [Service](../services/ask-okf-mcp/README.md); recorded hosting, delivery, model-visible context and Voice compatibility have separate evidence |
| Page tools and host-assisted evidence exploration | Implemented tools; experimental client compatibility | [Context interface boundary](context-assembly.md#interface-and-host-boundary), [workbench routes](workbench-page-tools.md); registration alone does not prove invocation |
| Portable repository-authoring agent package | Implemented package | [Repository guidance review](okf-agent-guidance-review-2026-08-09.md), [manifest](../plugins/okf-repositories/plugin.json); this is distinct from a validated consumer evidence workflow |
| Controlled-language rendering | Experimental, isolated research prototype | [Findings](controlled-language-experiment.md); three offline illustrative fixtures, no independent model trial or human comprehension study |
| Consumer workflow packaging and current cross-client acceptance matrix | Proposed | P1-C below; retain existing package contracts and reuse the repository package where applicable |
| Independently accepted domain answers and broadly usable authoring workflow | Proposed acceptance work | P1-B and P2 below; current technical checks do not discharge these gates |
| Research BEP schema migration, alternative storage and restricted-data service assurance | Proposed, conditional | [BEP status](bep-implementation-status.md); require a separate decision and evidence before adoption |

The October baseline includes the merged latest-Ubuntu/CPython 3.12.11 repair,
dependency updates, reading-help changes and isolated rendering prototype.
An Explorer merge does not update a separately hosted MCP service. Use its
[publication record](remote-mcp-publication.md) for dated deployment evidence.

## Lessons carried into acceptance

1. **Retrieve dependencies as well as relevant passages.** The retained DWP
   scenario omitted a controlling provision in its earlier retrieval. The
   source-guided rendering fixture does not repair that retrieval result.
   Evaluate source, semantics, retrieval, traversal, assembly, provenance,
   boundaries and answerability separately using the [A–H method](context-assembly-evaluation.md).
2. **Declare the denominator and relationship meaning.** GIS and other OKF+
   experiments motivate explicit population, jurisdiction, edition, direction,
   method and cardinality checks. A count of records or links is not coverage;
   an association does not establish access rights, routing or operational
   permission. This plan makes no new GIS coverage or entitlement claim.
3. **Preserve qualifications through explanation.** The controlled negative
   fixture retained citations and had zero language-checker findings while
   losing conditions. Semantic fidelity and human comprehension need separate
   assessors. Keep original wording available beside any explanation.
4. **Observe every delivery boundary.** Assembly, response paging, complete
   reconstruction, model-visible content and actual client use are different
   checks. SDK success cannot stand in for an observed browser or Voice journey.
5. **Design for the reader's task.** Meaningful facets, exact source help and
   progressive disclosure require actual-consumer checks and formative user
   testing. Generic metadata and large graph views cannot establish usefulness.

## Priorities and delivery order

The [P0 review](p0-implementation-review-2026-10-23.md) has completed its source
review and implemented six corrections; exact-candidate assurance and
publication use required CI and deployment gates. B–F remain **proposed**.
Owner roles below are responsibilities to assign, not named appointments.
P1 establishes one dependable domain and client journey. P2
tests reuse and authoring usability. P3 retains bounded research options.

| Item | Priority | Accountable role | Depends on | Completion evidence |
| --- | --- | --- | --- | --- |
| A. Integration and code review baseline | P0 | Explorer maintainer and independent reviewer | Current frozen implementation | Review coverage map, findings and disposition, targeted verification |
| B. One domain evidence-to-explanation pilot | P1 | Domain producer and independent domain assessor | A; blocking findings resolved | Frozen held-back cases, A–H results, specialist assessment and retained responses |
| C. Consumer workflow and client acceptance | P1 | Integration maintainer | A; B's frozen pilot packages | Reproducible workflow package and per-client observations |
| D. Reader and authoring usability | P2 | Product owner and accessibility reviewer | A; B/C baseline | Formative task results, actual Reader evidence and adopted corrections |
| E. Second-domain portability and scale | P2 | Second producer and Explorer maintainer | B and C | Independent producer, shared-engine results and resource measurements |
| F. Optional model rendering and research decisions | P3 | Research lead and independent assessor | B/C; approved protocol and resources | Comparative trial, failure analysis and explicit adoption/defer decision |

### A. Review the whole implementation through its boundaries

**Source review completed:** see the [findings, corrections and limits](p0-implementation-review-2026-10-23.md).
The following scope and gates govern the baseline review. Review the whole first-party
implementation in bounded workstreams, then test the interfaces between them.
Recent PR reviews and green checks are useful inputs; they do not replace a
current integration review. Keep reported coverage and exclusions visible.

Start with a frozen commit and an inventory covering application routes,
workers and persistence, context assembly, source loaders, workbench and reading
help, page tools, remote MCP, generators, profile validators, evaluation
runners, CI and publication. Review vendored dependencies through provenance,
lockfiles, advisories and exposure; record exclusions explicitly.

| Workstream | Review questions and required controls |
| --- | --- |
| Source and semantic contracts | Trace authored inputs to generated assertions; check identity, direction, scope, date roles, rights, schema enforcement and compatibility |
| Fetching, parsing and rendering | Trace untrusted descriptors, URLs, source text, archives and proposals; check path/origin/redirect policy, bounded decompression, digests, safe rendering and inert source instructions |
| Assembly and delivery | Check dependency closure, ambiguity, conflict, truncation, canonical package identity, exact continuations, cancellation and resource ceilings |
| Human and tool interfaces | Compare UI, page-tool and remote-service semantics; check focus/navigation state, source explanations, proposal/export boundaries and actual client visibility |
| Build and publication | Check generated-file authority, dependency routing, reproducibility, permissions, locked environments and promotion of the exact assured candidate |
| Evaluation quality | Check assessor independence, negative controls, fixture representativeness, stale receipts, skipped coverage and gaps hidden by aggregate scores |

Acceptance criteria:

- Every inventoried first-party component has a reviewer, risk level, reviewed
  revision, linked findings and explicit coverage or exclusion. Include the
  seams between components, not only individual modules.
- Each finding records severity, trigger, affected invariant, reproduction or
  supporting evidence, corrective action and an appropriate regression check.
  Every workstream receives independent review; authors do not solely approve
  their own fixes.
- All critical and high findings are resolved and verified before broadening
  the pilot. Other findings have a recorded disposition, owner and target
  milestone; unresolved scope is visible in the completion report.
- Negative controls cover changed trust boundaries: corrupt or mixed snapshots,
  unsafe URLs, oversized/expanded inputs, missing dependencies, reversed edges,
  incomplete continuations and source text containing instructions.
- Equivalent frozen inputs yield the expected package identities across
  supported surfaces. Compare a remote service only with its declared paired
  engine; a historical pin is not the current Reader engine by implication.
- The review report separates code/security correctness, domain evidence,
  accessibility, hosting and client acceptance. Any specialist security review
  has a stated scope; no blanket certification follows from this review.

Deliver a dated review report and findings register in `docs/`, with bounded
fixes and their affected-plane checks. Use existing assurance tooling before
adding a new framework. Complete this baseline once, then review subsequent
changes through their dependency impact.

### B. Close one domain journey

Use the DWP effective-date research question as a candidate pilot because its
failure is retained. The domain owner must approve its scope and assessment
protocol before treating it as an answerable case. A narrower independently
reviewable question is acceptable if the legal dependency closure remains open.

Acceptance criteria:

- Freeze the source snapshot, question scope, date/jurisdiction roles, rights,
  engine and independent assessor requirements before the candidate run.
- Predeclare at least ten held-back cases, including answerable, ambiguous,
  insufficient, conflicting and budget-limited cases. Keep assessor requirements
  out of retrieval hints; report each case and its limitations.
- For cases expected to be answerable, retain every declared mandatory source,
  qualification and directed dependency. Insufficient cases stay insufficient.
  An unresolved controlling source blocks that case's answerability acceptance.
- Bind any observed model response to the exact evidence package, model/version,
  settings and prompt. An independent specialist assesses every pilot response
  for support, contradictions, omissions, temporal applicability and uncertainty.
- Accept no critical unsupported claim, lost controlling qualification or false
  claim of sufficiency. Record all other errors and the rationale for the pilot
  decision. The small pilot does not establish general domain accuracy.

### C. Package and test the consumer workflow

Current OpenAI documentation supports [plugins combining skills and MCP](https://developers.openai.com/plugins/build/plugins),
[page-scoped Site tools](https://learn.chatgpt.com/docs/webmcp) and
[multi-step Work tasks](https://learn.chatgpt.com/docs/enterprise/chatgpt-work-overview).
These are integration opportunities reviewed on 23 October 2026, not promises
of availability in every account, model, browser or execution environment.

Reuse Explorer's existing logic through small adapters. Extend the existing
repository-authoring package where appropriate; separately define the consumer
workflow for finding evidence, reading it, inspecting gaps and producing a
source-linked output. Keep browser page tools, remote MCP and file-based use
explicitly distinguishable.

Acceptance criteria:

- A capability preflight records the actual client/version, model where
  observable, execution location, admitted source, engine, available tools and
  limits. Unsupported routes receive an explicit result and a usable human path.
- Test the ordinary human browser route, one actual Codex route and one actual
  ChatGPT route. Name the transport for each. Claim automatic Site-tools support
  only after a genuine invocation in that exact supported host.
- Preserve source, engine, budget and context identity through catalogue reads,
  continuations and outputs. Verify complete reconstruction and compare it with
  the reference package. Instrument clipping where possible; otherwise record
  model-visible completeness as unverified and restrict the compatibility claim.
- Fail closed on changed identities, malformed input, incomplete mandatory reads
  and unavailable evidence. Test recovery and cancellation without silent retries
  or substitution of another source/engine.
- Keep evidence operations read-only. Any proposed correction remains a local
  preview/export until separately reviewed and adopted by the producer.
- Record latency, bytes, tool calls, retries and available usage observations.
  Freeze task-specific resource ceilings before testing. Distinguish estimates
  from billed charges; use included allowance and a zero paid-credit budget
  unless the owner explicitly approves a different amount and scope.

Voice gets its own later gate: actual microphone recognition, spoken source and
uncertainty handling, correction, interruption and end-call behaviour. Typed
input with audio output establishes only that tested mode.

### D. Make the journey usable and authorable

Acceptance criteria:

- Test a source-to-bundle-to-Reader workflow on actual producer output. Required
  facets have useful distinctions, explicit missing values and exact single,
  OR, AND and empty-result membership; validate both emitted data and the Reader.
- A new author can follow the documented pathway, resume a saved checkpoint,
  inspect a failure and export a correction without editing generated files.
- Run a formative study with at least five representative participants. At
  least four complete each core discovery/inspection task without intervention;
  all can locate the source and the stated evidence limitation. Record failures
  and retest material corrections. This is a formative gate, not population proof.
- Verify keyboard navigation, visible focus, Escape/focus return, zoom and narrow
  layouts on the affected journey, plus a human assistive-technology review.
  Report automated accessibility results separately.

### E. Demonstrate portability and bounded scale

Acceptance criteria:

- Add one independently authored second-domain pilot, such as an authorised GIS
  identifier journey. Declare its population, edition, jurisdiction, rights and
  unresolved coverage before interpreting results.
- Run the shared engine without domain-specific branching. Retain relationship
  direction, method, cardinality and date roles; do not infer identity, legal
  access or routing from association alone.
- Exercise small and sharded/indexed inputs, mixed snapshots, absent shards and
  minimum/maximum supported budgets. Record cancellation, peak memory where
  observable, bytes and latency against predeclared ceilings.
- Require measured evidence before choosing a storage replacement, new schema
  or architectural extraction. Prove migration/round-trip preservation and
  historical replay before changing any accepted identity contract.

### F. Retain optional rendering as research

Acceptance criteria:

- Keep the current controlled-language prototype isolated and retain its original
  evidence. Freeze an independent corpus and questions before any new comparison.
- Give each rendering condition the same complete evidence. Record actual
  generation, exact inputs/outputs, model/settings and any bounded feedback.
- Independently assess source fidelity and human comprehension. Retain negative
  controls that lose meaning despite passing language measurements or retaining
  citation labels. Report insufficient evidence independently of wording quality.
- Adopt a rendering policy only after a documented comparison and review.
  Formal STE compliance, pre-extraction rewriting, restricted-data processing
  and BEP schema/storage changes require their own decisions and evidence.

## Delivery and maintenance gates

Keep one traceable record for every item: accountable owner, state, dependencies,
candidate/source/engine identities, acceptance results, findings, unrun checks
and next action. Update this inventory and `CHANGELOG.md` when a capability moves
state. A historical pass cannot approve changed bytes or a new client version.

For each implementation change, use the publication dependency graph to select
affected authored sources, generated projections, documentation, tests, browser
journeys and release gates. Preserve historical receipts. Promote only the exact
candidate that passed required checks; verify deployed identity and the intended
journey in a real browser before describing a public experience as verified.

The plan itself is a documentation change: update its entry points and changelog,
check generated projections for drift, run documentation/language and Site link
checks, and inspect the rendered page. It does not authorise model trials,
provider acquisition, private-data transmission or service deployment. Those
activities need the item-specific scope, resources and acceptance protocol first.
