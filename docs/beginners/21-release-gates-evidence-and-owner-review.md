# Release Gates, Evidence And Owner Review

Release assurance can sound like a private language:

- “G6 passed.”
- “The receipt binds the candidate root.”
- “The owner accepted the residual risk.”
- “Promote the RC without rebuilding.”

This chapter starts before that language. It explains what each idea is for,
who is allowed to decide it and what a beginner should ask to see.

## The Five Ideas First

Everything in this chapter builds from five ideas:

1. A **gate** is a question that must be answered before work moves forward.
2. A **check** is the test or review used to answer part of that question.
3. **Evidence** is the material that shows what actually happened.
4. A **receipt** is the durable record that connects the evidence to exact
   inputs and outputs.
5. **Approval** is a person's decision to proceed after reading the relevant
   evidence and accepting the remaining risk.

These are related, but they are not interchangeable.

For example:

> Gate question: Can the real Explorer load this bundle safely?
>
> Check: Run the pinned Explorer against positive, negative and malformed
> fixtures.
>
> Evidence: Browser requests, console messages, restored URL state and the
> final outcome.
>
> Receipt: A JSON document naming the Explorer commit, bundle digest, test
> command and evidence hashes.
>
> Approval: The owner later decides whether all passing evidence and disclosed
> limitations are sufficient for publication.

## A Gate Is Not A Physical Barrier

Think of a gate as a question on a checklist, not a door operated by a single
person.

Some questions are answered entirely by deterministic tools:

- Do all checksums match?
- Does the JSON match its schema?
- Do two clean builds produce identical bytes?

Other questions require informed review:

- Are these the right authoritative sources?
- Are the expected search results safe and appropriate?
- Is an unresolved coverage gap acceptable for this proof of concept?

A gate can combine both kinds of answer. It passes only when its declared pass
criterion is met.

## Gate Numbers Need A Named Catalogue

`G5` means only “the item numbered 5 in some gate catalogue.” The number is not
universal.

The generic Foundry build workflow has one G0–G9 sequence. A particular bundle
repository may define a second, project-specific release-evidence sequence.
Those sequences can use the same numbers for different questions.

For example:

| Reference | Meaning |
|---|---|
| **Foundry G5** | Optional model-assisted enrichment assurance |
| **Foundry G6** | Independent user-task evaluation |
| **Example project G5** | The project's locally numbered evaluation gate |

All three references can be valid. Bare `G5` is ambiguous.

Use one of these forms:

- `Foundry G6 — Evaluation`;
- `Land Registry release G5 — Evaluation`;
- `project release gate G5`, followed by a link to that project's gate table.

Every project that introduces a local gate catalogue should publish:

1. the catalogue's name and version;
2. every gate number and descriptive title;
3. its required evidence and pass criterion;
4. the role responsible for review or decision;
5. its relationship to the Foundry gates; and
6. the location of actual receipts.

If a document says only “G5 passed,” ask: **“G5 in which gate catalogue?”**

## The Generic Foundry G0–G9 Sequence

The Foundry build prompt uses these gates. These are workflow milestones, not
requirements of the permissive OKF core specification.

| Foundry gate | Plain-language question |
|---|---|
| G0 — Domain contract | Have we agreed what is being built, from which sources, under which rules, for which users? |
| G1 — Tiny fixture | Can the producer and every real pinned consumer handle small positive, negative and degraded examples correctly? |
| G2 — Acquisition | Did every expected source item receive one recorded outcome without silent skipping? |
| G3 — Core and semantic integrity | Do the OKF, schema, semantic, link, count, provenance and rights contracts pass? |
| G4 — Explorer and federation | Can the locked Explorer load the intended planes, search, facets, routes and federation safely? |
| G5 — Optional enrichment | If model enrichment is used, was every proposed assertion calibrated, reviewed, costed and either accepted or rejected? |
| G6 — Evaluation | Do independent task, citation, caveat, safety and held-out evaluations pass? |
| G7 — Frozen candidate | Does one exact candidate reproduce, with security, accessibility and performance evidence? |
| G8 — RC and public validation | Do the actual public release-candidate routes contain the intended identities, bytes and restored consumer state? |
| G9 — Promotion | Are the final files byte-identical to the verified RC, with complete release and recovery receipts? |

The complete normative workflow remains in the
[Foundry build prompt](../prompts/okf-bundle-build.md). This chapter explains
how to read it; it does not replace it.

## Foundry G0 — Agree The Contract

### The beginner question

Do we know what “success” means before collecting and transforming thousands
of records?

### What should exist

- purpose and intended users;
- included and excluded source families;
- authority rules;
- rights, privacy and access constraints;
- coverage denominator or an honest bounded-partial statement;
- material user tasks and hard failures;
- applicable standards;
- target publication architecture;
- exact downstream consumer inventory and lock;
- dependency graph;
- unresolved decisions and named owners; and
- a hash-locked domain profile.

### Who is involved

Researchers and technical contributors prepare the material. The project owner
or delegated domain reviewer accepts the scope and decisions.

### What an owner asks

- Is this the product I intended?
- Are dangerous or private sources excluded?
- Are the authority and rights rules credible?
- Are gaps visible rather than guessed away?
- Does the smallest proposed product answer the recorded tasks?

### What does not count

- “The code is already written.”
- A profile that still contains placeholders.
- An AI-generated summary with no evidence register.
- A checksum without a review decision.

## Foundry G1 — Prove The Small Example

### The beginner question

Before paying the cost of a full corpus, can a tiny example expose bad
assumptions cheaply?

### What happens

The producer builds a small fixture twice. It includes expected and dangerous
cases. The real locked consumers then execute against those exact bytes.

Examples include:

- a valid record;
- missing optional data;
- an unsafe path;
- a bad checksum;
- a restricted source;
- a stale record;
- a malformed descriptor; and
- a retained old producer fixture that should degrade or fail explicitly.

### Who is involved

Builders author fixtures. Deterministic validators and actual consumer
programs supply the evidence. An owner normally does not manually approve the
individual test cases, but should understand the declared compatibility
window.

### What does not count

- A schema check standing in for the actual Explorer.
- A mocked consumer standing in for the production entrypoint.
- One clean build when byte-identical reproduction is required.
- A page shell appearing before the bundle has hydrated.

## Foundry G2 — Freeze And Reconcile Sources

### The beginner question

Can we account for every expected acquisition attempt?

### Terminal outcomes

Each expected item ends in one explicit state, such as:

- acquired;
- excluded under a documented rule;
- unavailable;
- restricted;
- invalid;
- failed; or
- unresolved.

“Not present in the output” is not an outcome.

### Who is involved

Acquisition tooling records immutable envelopes and hashes. Source or rights
reviewers investigate exceptional states. The owner becomes involved if an
omission materially changes the product claim.

### What does not count

- Fetching until the output looks large enough.
- Ignoring failed pages.
- Calling a sample complete without a denominator.
- Refetching mutable sources during an offline rebuild.

## Foundry G3 — Validate Meaning And Integrity

### The beginner question

Are the produced files structurally valid, internally connected and honest
about their meaning and origin?

Possible checks include:

- OKF Markdown conformance;
- JSON Schema;
- JSON-LD/RDF expansion;
- SHACL, when selected;
- identifiers and reference closure;
- counts and manifests;
- rights and access states;
- provenance;
- path and URL safety; and
- control, data and semantic plane roots.

### Who is involved

Validators supply most evidence. Domain, semantic or rights reviewers handle
findings that cannot be decided structurally.

### What does not count

- A file parsing successfully.
- Vocabulary prefixes being declared but never used.
- A public URL being treated as evidence of an open licence.
- A test looking only for a substring instead of running the real validator.

## Foundry G4 — Test The Explorer And Federation

### The beginner question

Can people and software actually use the publication through the selected
consumer?

The locked Explorer should prove:

- descriptor and snapshot identity;
- bounded loading;
- search and filters;
- stable record routes;
- selected-record resources;
- relationships and authority labels;
- restored deep-link state;
- explicit degraded and fail-closed behaviour; and
- no unexpected requests or console errors.

For a federation, it also checks child identity, declared authority, counts,
coverage and fallback routes.

### Who is involved

The consumer harness produces evidence. A user-facing reviewer inspects
behaviour that tools cannot judge by structure alone.

### What does not count

- HTTP status 200.
- A visible application header with no bundle loaded.
- A different cached bundle appearing successfully.
- Testing a local parser instead of the pinned Explorer.

## Foundry G5 — Govern Optional Enrichment

### The beginner question

Did a model or rule add claims that the source did not directly state?

If no enrichment is used, Foundry G5 can be recorded as **not applicable** with
a reason. It should not be reported as a mysterious pass.

If enrichment is used, every proposal needs:

- source evidence;
- model or rule identity;
- confidence and calibration where meaningful;
- one terminal decision;
- independent review;
- publication proof;
- cache/reproduction evidence; and
- honest usage and cost accounting.

### Who is involved

The enrichment producer creates candidates. A separate reviewer decides which
assertions are accepted. The owner decides whether any remaining limitation is
acceptable for the product.

### What does not count

- A high model confidence score.
- The model reviewing its own answers.
- Publishing only successful proposals and losing rejected outcomes.
- Inventing a monetary cost from an unevidenced token total.

## Foundry G6 — Evaluate User Tasks And Safety

### The beginner question

Does the publication help with the intended tasks without producing the
dangerous failures identified in the profile?

Evaluation can include:

- expected authoritative targets;
- citations and source resolution;
- required caveats;
- near misses;
- forbidden retrieval targets;
- hard-failure categories;
- held-out challenges;
- accessibility journeys; and
- unanswerable or unsafe requests.

### Independence

An independent reviewer did not author the behaviour or expectations they are
reviewing, or has a clearly separated role and held-out material.

Independence reduces self-confirmation. It does not magically create a human
legal, domain or accessibility audit.

### Who is involved

Evaluation tooling measures declared metrics. An independent reviewer verifies
expected propositions, caveats, near misses and held-out cases. The owner
reviews any proposed exception.

### What does not count

- A calibration score produced from developer-owned expectations.
- An average score hiding a hard failure.
- Reusing a review bound to another candidate digest.
- Weakening the expected result after seeing a failure without independent
  justification.

## Foundry G7 — Freeze One Candidate

### The beginner question

Do we have one exact set of bytes that reproduces and has the required
security, accessibility and performance evidence?

Freezing means:

- the source snapshot is fixed;
- build code and dependencies are fixed;
- configuration is fixed;
- generated bytes have manifests and roots;
- two clean builds agree;
- tests refer to the frozen candidate; and
- later evidence names that identity.

### Who is involved

Build and validation systems provide receipts. Security and accessibility
reviewers provide their scoped findings. The owner reviews exceptions and
limitations, not every byte.

### What does not count

- “It should rebuild the same.”
- A dirty worktree with unexplained generated changes.
- A release archive built from a later commit.
- Silently editing generated output after tests pass.

## Foundry G8 — Check The Real Public RC

### The beginner question

Did the release candidate arrive at the public routes intact, and can the real
consumer complete its journeys there?

The verification should inspect:

- the exact deployed URL;
- version, bundle ID and snapshot;
- checksum and plane roots;
- descriptors and manifests;
- overview, record and query deep links;
- repeated filters and restored state;
- requested resources;
- console and page errors; and
- terminal journey outcome.

Give a requested URL check a short, tool-first budget. If it fails, report the
failure and label the link unverified. Do not disguise a failed public check
as permission for an undeclared rebuild.

### Who is involved

A real-browser harness supplies identity and journey evidence. A release
reviewer determines whether an observed limitation is a deployment problem,
an evidence gap or a product failure.

### What does not count

- HTTP status 200.
- A screenshot with no identity evidence.
- Opening a local file instead of the deployed route.
- Checking one route while publishing several representations.

## Foundry G9 — Promote Identical Bytes

### The beginner question

Are the final public artefacts exactly the RC bytes that passed Foundry G8?

Promotion should not rebuild the release. Compare:

- archive SHA-256;
- file inventory;
- bundle and plane roots;
- descriptor and manifest digests;
- release notes and limitations; and
- public verification receipt.

### Who is involved

The release system proves byte identity. The project owner or delegated
release owner authorises promotion and accepts the disclosed residual risk.

### What does not count

- Rebuilding from “the same source.”
- Retagging a different commit without comparison.
- Assuming the deployment succeeded because CI is green.
- Publishing before the exact public URL passes its checks.

## Roles: Who Does What?

| Role | Main responsibility | Cannot honestly do alone |
|---|---|---|
| Researcher | Sources, authority, scope, evidence and gaps | Approve their own unsupported claim |
| Builder | Deterministic transformation and generated artefacts | Declare the generated result independently reviewed |
| Validator | Apply declared machine-checkable rules | Decide an undeclared domain policy |
| Independent reviewer | Review expectations, evidence or user-facing behaviour separately | Accept risk for the project owner unless also formally appointed owner |
| Project owner | Decide scope, claims, exceptions and residual-risk acceptance | Turn missing evidence or a hard failure into a pass |
| Deployment system | Copy verified bytes to a public host | Decide whether publication is authorised or correct |

One person can hold several roles in a small proof of concept. The receipt
must still say which role they performed, and limitations in independence must
remain visible.

## Status Words

Use status words precisely:

| Status | Meaning |
|---|---|
| `pass` | The declared pass criterion was met for the named candidate |
| `fail` | The criterion was evaluated and not met |
| `not_run` | No result exists yet |
| `not_applicable` | The gate does not apply, with a recorded reason |
| `blocked` | An external condition prevents completion |
| `deferred` | The owner deliberately moved bounded work to a later release |
| `candidate` | Evidence or an assertion is proposed but not accepted |
| `accepted exception` | A non-hard limitation was explicitly accepted by an authorised owner |

`Implemented`, `looks good`, `green` and `HTTP 200` are not gate results.

## Hard Failure, Warning And Residual Risk

### Hard failure

A hard failure is a condition the contract says must block release. Examples
can include:

- personal data in public output;
- a credential or signed URL;
- unsafe path traversal;
- an incorrect legal or rights claim;
- a checksum mismatch; or
- a critical accessibility or security failure.

An owner cannot convert a hard failure into a pass by saying “I accept it.”
The contract must be fixed or the release must stop.

### Warning

A warning requires attention but is not automatically a release blocker. It
needs an explanation and disposition.

### Residual risk

Residual risk is what remains after controls have been applied. For example,
automated accessibility checks can pass while the absence of a representative
screen-reader study remains a disclosed residual risk.

An owner can accept a residual risk within their authority. They cannot claim
that the missing study happened.

## Why Digests Matter

A digest is a fingerprint calculated from bytes. SHA-256 is a commonly used
digest algorithm.

Suppose a reviewer tested archive A, but the website publishes archive B.
Even if the filenames look identical, the review does not prove anything
about B.

Receipts therefore bind:

```text
input roots
+ builder and dependency identity
+ consumer identity
+ generated roots
+ evaluation evidence
= one candidate identity
```

One governed-byte change produces a new identity. This can feel strict, but it
prevents approval from drifting silently from reviewed bytes to different
bytes.

## What A Receipt Should Tell You

A beginner should be able to answer these questions from a receipt:

1. Which gate catalogue and gate is this?
2. Which candidate does it cover?
3. Which exact inputs, tools and consumers were used?
4. Which command or review method ran?
5. What evidence was produced?
6. Who reviewed it, and in which role?
7. What passed, failed, remained unavailable or was not applicable?
8. What warnings and limitations remain?
9. Can referenced files be rehashed?
10. What decision is allowed next?

A simplified receipt might look like:

```json
{
  "gate_catalogue": "okf-foundry-build.v1",
  "gate": "G6",
  "title": "Evaluation",
  "candidate_root": "full-sha256-value",
  "status": "pass",
  "checks": [
    {"id": "hard-failures", "status": "pass"},
    {"id": "held-out-review", "status": "pass"}
  ],
  "reviewer": {
    "role": "independent-evaluation-reviewer",
    "independent": true
  },
  "warnings": [],
  "evidence": ["path/to/evaluation-receipt.json"]
}
```

This example teaches the shape. A project's real schema controls its actual
fields.

## What The Owner Reviews

The owner should receive a review pack rather than a demand to inspect every
raw JSON file.

### Identity box

Every page starts with:

- version;
- candidate commit;
- source/profile roots;
- bundle and plane roots;
- consumer version and digest; and
- gate catalogue name/version.

### Gate table

For each applicable gate:

- title;
- pass criterion;
- result;
- evidence links;
- reviewer;
- warnings;
- accepted or proposed exceptions; and
- effect on the next decision.

### Claims and limitations

The pack lists:

- claims the public release will make;
- claims it must not make;
- source and observation cutoff;
- coverage boundary;
- rights and access limitations;
- absent audits or research; and
- residual risks.

### Owner choices

The owner can:

- accept the domain contract;
- request a change;
- accept a non-hard bounded exception;
- reject an exception;
- authorise RC deployment;
- reject release; or
- authorise final promotion after public validation.

The owner does not need to say “I accept all gates.” Gates pass through their
own evidence.

## Copy-Ready Owner Statements

### Authorise continued checking

> I authorise the team to complete the remaining checks for the named
> candidate. This is not approval of unrun gates and does not authorise public
> release.

### Accept the domain contract

> I have reviewed the named domain-profile root and accept its scope,
> exclusions, authority rules, source boundaries, intended users, hard
> failures and recorded limitations for this candidate.

### Accept a bounded exception

> I accept exception [ID] for candidate [full digest], for the reasons and
> mitigations recorded in [evidence]. This does not waive any declared hard
> failure and does not apply to later candidate bytes.

### Authorise RC deployment

> I authorise deployment of candidate [full digest] as a release candidate. I
> have reviewed the applicable gate receipts, claims, limitations and residual
> risks. Final promotion remains conditional on the exact deployed routes
> passing Foundry G8 public identity and journey checks.

### Authorise final promotion

> I authorise promotion of the verified RC to final release. The promotion
> evidence shows that the archive, manifests, bundle roots and public
> artefacts are byte-identical to the RC that passed Foundry G8.

Real approvals should also record owner identity, role and time.

## Worked Example: A Tiny Library Catalogue

Imagine publishing a catalogue of three public-library guides.

### Foundry G0

The profile says:

- include public guide metadata;
- exclude borrower records;
- the library website is authoritative;
- the product helps people find guides;
- it does not claim every historic guide is included.

The owner accepts that scope.

### Foundry G1

The fixture contains:

- one valid guide;
- one missing optional language field;
- one unsafe external URL; and
- one malformed descriptor.

The producer builds twice. The real Explorer accepts the valid fixture and
fails closed on the malformed descriptor.

### Foundry G2

The expected list contains three guides. Outcomes are:

- two acquired;
- one unavailable.

The public coverage statement says “two of three expected guides observed,”
not “complete library catalogue.”

### Foundry G3

Schemas, identifiers, rights states, links and checksums pass.

### Foundry G4

The Explorer loads the descriptor, searches for a guide, restores a selected
record route and makes no unexpected request.

### Foundry G5

No model enrichment is used, so the gate is `not_applicable` with a reason.

### Foundry G6

An independent reviewer checks that:

- the intended guide ranks;
- the unavailable guide is not described as available;
- source links resolve; and
- the catalogue never exposes borrower information.

### Foundry G7

Two clean full builds are identical. Security and accessibility checks pass
within their declared scope.

### Foundry G8

The public RC serves the expected checksum and the Explorer deep link restores
the right guide. HTTP 200 is only one observation among these checks.

### Foundry G9

The final archive hash equals the RC archive hash. The owner promotes those
same bytes.

The example is deliberately small. The evidence pattern remains the same for
a catalogue containing millions of records.

## Common Beginner Traps

### “CI is green, so the release is approved”

CI proves only the checks it actually ran against the identity it recorded.
It cannot make an owner decision.

### “I accept all gates”

An owner can authorise work and accept bounded residual risk. They cannot make
unrun checks become passes or manufacture an independent review.

### “The site returned HTTP 200”

The server returned something. It may still be an empty app shell, a stale
bundle or the wrong snapshot.

### “The old receipt passed”

A receipt for another digest is historical evidence. Reuse is allowed only
when the dependency graph and all declared roots prove that its inputs and
outputs are unchanged.

### “We rebuilt for the final release”

That creates new bytes. Promote the tested RC bytes instead.

### “G5 means evaluation”

Only in a gate catalogue that defines it that way. In the generic Foundry
sequence, evaluation is Foundry G6 and optional enrichment is Foundry G5.

## A Beginner Review Checklist

Before agreeing to the next release action, ask:

- [ ] Is the gate catalogue named?
- [ ] Is the gate written with a descriptive title?
- [ ] Does the evidence name the exact candidate?
- [ ] Is the pass criterion visible?
- [ ] Did the declared check or review actually run?
- [ ] Are `not_run`, unavailable and not-applicable states honest?
- [ ] Is the reviewer role and independence clear?
- [ ] Are warnings and limitations explained?
- [ ] Are any hard failures present?
- [ ] Does an exception identify an authorised owner and exact digest?
- [ ] Is the public URL still labelled unverified until its browser gate?
- [ ] Will promotion reuse the RC bytes without rebuilding?

If any answer is unclear, pause and ask for a smaller review packet. Assurance
should make decisions easier to inspect, not hide them behind jargon.

## Continue

Review:

- [Foundry authoring and domain profiles](19-foundry-authoring-and-domain-profiles.md);
- [Governed enrichment and release assurance](20-governed-enrichment-and-release-assurance.md);
- the [Foundry prompt kit](../okf-authoring-prompt-kit.md); and
- the [Foundry build prompt](../prompts/okf-bundle-build.md).

Return to the [learning-path index](index.md) when you are ready to choose
another topic.
