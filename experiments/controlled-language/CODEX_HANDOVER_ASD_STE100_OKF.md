# Codex Handover: ASD-STE100 Controlled-Language Experiment for OKF

Recovery note, 10 October 2026: this document was recovered from the full augmented handover in the ChatGPT chat titled **ASD STE100 and OKF Bundles**. The download reference was accessible only as a sandbox reference. This is a recovered transcription, not a claimed byte-identical file download. The handover below preserves its supplied wording, including exact terminology.

## Objective

Investigate whether an ASD-STE100-inspired controlled-language layer can improve the clarity, consistency and evaluability of explanations generated from Open Knowledge Format (OKF/OKF+) bundles **without changing the underlying evidence, semantics or provenance**.

Core principle:

> **Simplify the expression, not the evidence or meaning.**

Treat ASD-STE100 as an optional, testable language profile layered onto OKF. Do not change the OKF core merely to accommodate it.

---

## Repositories

Start by inspecting:

- `chris-page-gov/okf-explorer`
- the current OKF-DWP / `okfdwp` repository
- existing OKF bundles
- Ask OKF
- the evaluation harness
- provenance/evidence structures

Understand the current implementation before changing anything.

---

## Research hypotheses

Test whether controlled language improves:

1. human comprehension;
2. terminology consistency;
3. machine interpretation;
4. identification of ambiguous statements;
5. evaluation of generated explanations;
6. consistency between evidence and generated answers.

Also test the contrary hypothesis:

> Simplification may remove distinctions that are legally, operationally or semantically significant.

---

## Architecture

Conceptually:

```text
Authoritative source
        │
        ▼
Knowledge extraction
        │
        ▼
OKF / OKF+ bundle
evidence + semantics + provenance
        │
        ▼
Selected evidence package
        │
        ├───────────────┐
        ▼               ▼
Normal renderer    Controlled-language renderer
                        │
                        ▼
                  ASD-STE checker
                        │
                        ▼
                  STE conformance result
        │
        └───────────────┐
                        ▼
              Semantic-preservation
                  OKF evaluation
```

This deliberately creates **two independent evaluation tracks**.

### Track 1 — Language conformance

Question:

> How closely does the transformed text conform to the chosen ASD-STE100 rules?

Use a deterministic checker where possible.

### Track 2 — Semantic preservation

Question:

> Did the transformation preserve everything that matters in the source evidence?

Use OKF evidence, semantics and provenance for this evaluation.

A rendering can therefore score highly for STE compliance and still **fail the experiment** if it changes the meaning.

---

# Phase 1 — Investigate existing open-source checkers

Before implementing a checker, investigate existing open-source ASD-STE100 tooling.

Evaluate candidate tools such as the Python and Go implementations previously identified, plus any better-maintained alternatives found during repository research.

For each candidate record:

```yaml
checker:
  name:
  repository:
  licence:
  language:
  ASD_STE100_issue:
  rules_implemented:
  dictionary_support:
  custom_terminology_support:
  cli_support:
  json_output:
  sarif_output:
  api_support:
  mcp_support:
  active_maintenance:
  tests:
  limitations:
```

Do not assume that an open-source checker provides complete ASD-STE100 compliance.

Distinguish carefully between:

- full ASD-STE100 compliance;
- implementation of a subset of rules;
- vocabulary checking;
- grammar/style checking;
- STE-inspired heuristics.

Check licensing implications around the official ASD-STE100 dictionary before copying or redistributing vocabulary.

---

# Phase 2 — Choose the DWP test case

Select one existing difficult OKF-DWP evaluation question for which the bundle has strong evidence and provenance.

Prefer the existing disabled-child / Universal Credit scenario involving different dates if suitable.

Freeze the selected evidence package.

Every rendering must receive **exactly the same evidence**.

Do not allow different retrieval between experimental conditions.

---

# Phase 3 — Produce three renderings

Generate:

```text
A. Baseline
   Existing/default OKF explanation

B. STE-inspired
   LLM instructed to follow the useful principles
   of ASD-STE100

C. Controlled
   More strictly constrained output intended
   to maximise checker compliance
```

Store each output as a derived artefact.

Never replace or modify the authoritative source material.

---

# Phase 4 — Run the STE checker

Pass B and C through the selected deterministic checker.

Optionally run A as well to establish a baseline.

Capture machine-readable results.

For example:

```json
{
  "renderer": "ste-inspired",
  "checker": "selected-checker",
  "checker_version": "...",
  "rules_checked": 20,
  "violations": [
    {
      "rule": "...",
      "sentence": "...",
      "position": "...",
      "message": "..."
    }
  ],
  "warning_count": 4,
  "error_count": 2
}
```

Preserve the raw checker output.

Do not reduce it merely to a single pass/fail score.

---

# Phase 5 — Semantic-preservation evaluation

Independently compare every transformed explanation with the frozen OKF evidence package.

Check preservation of:

- actors;
- actions;
- dates;
- amounts;
- conditions;
- exceptions;
- qualifications;
- negation;
- modality;
- temporal relationships;
- causal relationships;
- uncertainty;
- source references;
- provenance.

Pay particular attention to words such as:

```text
must
may
can
treated as
entitled
effective
from
following
before
after
within
unless
except
```

These may carry substantive legal meaning.

Never replace one merely because another expression scores better with the STE checker.

---

## Example semantic evaluation

Produce machine-readable results such as:

```json
{
  "rendering": "ste-inspired",
  "source_claims": 12,
  "claims_preserved": 12,
  "conditions_preserved": true,
  "exceptions_preserved": true,
  "dates_preserved": true,
  "actors_preserved": true,
  "modality_preserved": true,
  "provenance_preserved": true,
  "unsupported_claims": [],
  "omitted_qualifications": [],
  "semantic_preservation": "pass"
}
```

Adapt this to the existing OKF evaluation architecture where possible.

Do not create an unnecessary parallel evaluation framework.

Relate results to existing OKF evaluation dimensions where applicable:

- source;
- semantic;
- retrieval;
- traversal;
- assembly;
- provenance;
- boundary;
- answerability.

---

# Phase 6 — Compare the two dimensions

The central experiment is **not simply whether STE scores improve**.

Create a result matrix such as:

| Rendering | STE conformance | Semantic preservation | Provenance | Result |
|---|---:|---:|---:|---|
| Baseline | Low | High | Pass | Baseline |
| STE-inspired | Higher | High | Pass | Candidate |
| Strict | Highest | Lower | Pass | Reject |

The important case is the final one.

If stricter STE compliance causes loss of a legally significant qualification, the transformation has failed regardless of readability.

This allows us to investigate a possible **precision/readability frontier** rather than assuming maximum simplification is desirable.

---

# Phase 7 — Checker-in-the-loop experiment

If practical, add a second experimental mode:

```text
Evidence
   ↓
LLM controlled-language rendering
   ↓
STE checker
   ↓
Violations returned to LLM
   ↓
Revised rendering
   ↓
STE checker
   ↓
OKF semantic-preservation evaluation
```

Set a small maximum number of iterations.

Do not allow an uncontrolled optimisation loop.

Record whether checker-guided revision:

- improves STE conformance;
- improves readability;
- leaves semantics unchanged;
- introduces semantic errors.

This is particularly important.

The LLM may optimise text to satisfy the checker while inadvertently changing its meaning.

That behaviour should be measurable.

---

# Phase 8 — Terminology experiment

Investigate whether OKF can optionally expose preferred terminology.

For example:

```yaml
terms:
  - preferred: assessment period
    concept_id: ...
    definition: ...
    permitted_variants: [...]
    ambiguous_variants: [...]
    provenance: ...
```

Determine whether existing OKF structures can represent this before proposing schema changes.

A domain terminology layer could potentially complement the generic ASD-STE100 vocabulary.

---

# Phase 9 — MCP possibility

Investigate whether the selected checker can sensibly be exposed through MCP.

Conceptually:

```text
check_controlled_language(text)
        ↓
{
  violations: [...],
  rules_checked: [...],
  score: ...
}
```

This could allow:

- Codex;
- OKF Explorer;
- Ask OKF;
- other agents;
- CI pipelines

to invoke the same deterministic validation service.

Do not make MCP necessary for the initial experiment.

First establish whether the checker provides useful measurements.

---

# Provenance

Preserve provenance for both the **knowledge** and the **transformation**.

Ideally the experimental record should allow reconstruction of:

```text
source
   ↓
OKF claim/evidence
   ↓
evidence package
   ↓
renderer + prompt/profile/version
   ↓
generated text
   ↓
STE checker + version
   ↓
checker result
   ↓
semantic evaluator
   ↓
evaluation result
```

This makes the experiment inspectable and reproducible.

---

# Success criteria

A promising controlled-language profile should demonstrate:

**better linguistic clarity**

AND

**equal semantic fidelity**

AND

**complete evidence/provenance traceability**.

Improved STE compliance alone is insufficient.

---

# Deliverables

Produce:

1. checker landscape/comparison;
2. recommendation of the checker to use;
3. short architecture note;
4. working prototype;
5. selected OKF-DWP test case;
6. frozen evidence package;
7. three rendered explanations;
8. raw checker results;
9. machine-readable semantic-preservation results;
10. provenance traces;
11. checker-in-the-loop results;
12. findings on where controlled language helps or harms;
13. recommendation on whether controlled language should become an optional OKF/OKF+ profile;
14. reusable automated tests.

Keep experimental code sufficiently isolated that it can be removed without disrupting OKF Explorer.

---

# Do not

Do not:

- rewrite authoritative evidence;
- alter provenance;
- silently remove qualifications;
- treat simplified text as authoritative evidence;
- optimise solely for the STE checker;
- make unsupported DWP entitlement decisions;
- redesign OKF before understanding the current implementation;
- claim formal ASD-STE100 compliance without evidence;
- assume an LLM's judgement of its own compliance is sufficient.

---

# Stretch experiment — controlled language before knowledge extraction

Once the rendering experiment works, investigate the deeper hypothesis:

> **Can controlled language improve knowledge extraction itself?**

Test whether terminology normalisation or controlled-language transformation before extraction improves:

- entity resolution;
- relationship extraction;
- semantic consistency;
- retrieval;
- cross-bundle interoperability.

Keep this experiment separate.

We need to distinguish improvements in **knowledge representation** from improvements in **presentation**.

---

## Central research question

The experiment should ultimately answer:

> **Can deterministic controlled-language validation and provenance-aware OKF evaluation be combined so that an AI system can make complex knowledge easier to understand without making it less precise?**
