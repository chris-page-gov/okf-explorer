# OKF implementation review rubric

Report findings before general observations. Give each finding a priority,
exact path or public artifact, evidence, consequence, and safe correction.

## Priority

- **P0:** published identity, rights, privacy, security, or destructive failure
  requiring immediate containment.
- **P1:** material correctness, authority, provenance, reproducibility, or
  release-gate failure.
- **P2:** important maintainability, compatibility, evaluation, performance,
  or operator-clarity weakness.
- **P3:** bounded improvement with low immediate risk.

Do not inflate a missing enhancement into a defect. Distinguish recorded
limitations from contradictions.

## Review dimensions

### 1. Core and profile conformance

- Does the root declare the intended OKF version?
- Are reserved indexes/logs and concept frontmatter valid?
- Are optional Explorer, semantic, federation, or domain fields clearly
  identified as profiles rather than OKF core?
- Are exact standard versions, applicability decisions, artifacts, and
  validators recorded for conformance claims?
- Does a producer validate the complete assertion population against the
  pinned shared schema before reporting conformance, rather than validating a
  sample or only its own projection invariants?

### 2. Identity and assertions

- Are identifiers stable, source-native where possible, and collision-checked?
- Do labels, aliases, canonicalization, and equivalence remain distinct?
- Does each relationship preserve source, target, predicate, authority,
  derivation, evidence, time, jurisdiction, confidence, and limitations as
  applicable?
- Are official, normalized, inferred, model-assisted, historical, rejected,
  and editorial-example assertions visibly separate?

### 3. Scope and coverage

- Is every completeness claim bound to a named, dated denominator?
- Are exclusions, failures, unresolved gaps, and unexplained omissions
  reported without shrinking the denominator?
- Are population completion, specialist review, release grade, and publication
  separate gates?

### 4. Sources, rights, privacy, and access

- Are source authority, rights evidence, allowed operations, observation time,
  access constraints, retention, and redistribution explicit?
- Are source bodies, personal data, secrets, signed URLs, credentials, and
  caches kept outside the public tree unless explicitly authorized?
- Is public access correctly kept separate from licence or operational
  assurance?

### 5. Authored/generated architecture

- Is every output traceable to an authored input and deterministic generator?
- Do checks fail on hand-edited generated artifacts and drift?
- Are live acquisition, offline compilation, evaluation, release assembly,
  and publication separate?
- Are digest roots and dependency/change-impact edges sufficient to select
  safe rebuild and retest scope?

### 6. Consumer and performance contract

- Is the actual consumer pinned and exercised against the produced bytes?
- Do large corpora use overview-first loading, bounded search and record
  locators, followed by lazy adjacency/rich routing—or an explicitly small,
  hard-capped whole-plane chunk set—rather than unbounded hydration?
- Are distinct relationship/datapack planes indexed and described honestly?
- Do old supported producers and new producers both have compatibility tests?

### 7. Evaluation quality

- Do personas, stories, competency questions, ordinary journeys, exception
  journeys, and failure cases trace to records and evidence?
- Are synthetic data and real personal data clearly separated?
- Do browser checks verify identity, state, content, provenance, source
  handoff, accessibility, and recovery rather than only HTTP status?
- Is model output independently evaluated rather than self-approved?

### 8. Release integrity

- Is one exact candidate frozen, reproduced, assured, authorized, and promoted
  without rebuild?
- Are release receipts and decisions digest-bound?
- Are public routes verified in a real browser against expected identity,
  snapshot, state, and source journey?
- Are failures and unverified links labelled rather than silently repaired or
  presented as passed?

### 9. Agent efficiency and safety

- Can an unfamiliar agent find source of truth, generated boundaries, exact
  commands, current status, and stop conditions in the first few files?
- Are repository-specific prohibitions and publication authority explicit?
- Does guidance avoid duplicated manuals, stale command lists, or conflicting
  gate identifiers?
- Can the agent run a narrow check before the full suite and recover safely
  after interruption?

### 10. Repository hygiene

- Is the working tree understood before edits?
- Are caches, virtual environments, `.DS_Store`, editor state, lock files,
  `_site/` where disallowed, and temporary artifacts excluded?
- Are planning, tracking, status, decisions, changelog, and generated evidence
  synchronized when local policy requires it?
- Is an empty, planned, or abandoned path described accurately rather than
  counted as implementation?

## Minimum trace sample

For every substantive review, trace at least:

1. one ordinary record or concept;
2. one exception, jurisdiction variant, or failure;
3. one official-source relationship;
4. one generated or inferred relationship;
5. one missing/stale/review-required state; and
6. one public or local consumer journey.

If any plane cannot be sampled, report the missing access or index as a review
limitation.
