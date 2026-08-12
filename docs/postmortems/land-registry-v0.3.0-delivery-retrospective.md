---
title: "HM Land Registry v0.3.0 delivery retrospective"
description: "A measured account of the fourteen producer attempts, late agent-created defects, final publication and delivery-control improvements for the OKF Land Registry semantic release."
status: complete
language: en-GB
date: 2026-08-12
---

# HM Land Registry v0.3.0 Delivery Retrospective

## Executive finding

The Land Registry migration took longer than the other OKF work because the
implementing agent repeatedly froze, built or assured a candidate before its
governance, dependency and release boundaries had been reviewed completely.
Repository size and semantic complexity made each mistake more expensive, but
they did not cause the mistakes.

The directly audited record contains **14 numbered producer attempts**:

- 11 successful builds;
- two failed corrective builds;
- one numbered preflight that closed before touching an output;
- five of the successful builds were required clean reproductions; and
- one additional dirty-environment preflight closed before the Build 11 builder
  invocation and is therefore recorded separately, not silently promoted to a
  fifteenth build.

After the initial build, there were 13 further numbered attempts. Seven were
corrective or replacement attempts, five were clean reproducibility builds and
one was a compact-candidate preflight. This report does not disguise those
attempts by calling every one a “rebuild”, nor does it inflate the count with
test runs, read-only probes, CI snapshot verification or conversational polling.

The agent, rather than another contributor, implemented the migration and
introduced the late defects described here. Examples include allowing the
ignored `evaluation/latest-report.json` calibration output into candidate
evidence, testing some candidate rules against the worktree rather than frozen
Git blobs, using a 128 MiB internal policy despite GitHub's lower regular-object
limit, retaining an obsolete tree-ordering algorithm in the evaluator, and
running two browser harnesses against the same fixed port. These are delivery
and test-design errors. They must not be attributed to HM Land Registry data.

The main corrective action is to make the delivery order executable:

1. review and freeze the complete causal input closure;
2. verify the exact consumer and release-platform contracts;
3. run adversarial microfixtures and independent review;
4. build once and reproduce once in a clean checkout;
5. commit and validate evidence against immutable candidate blobs; and
6. promote those exact bytes without rebuilding or repackaging them.

## Current status boundary

This report separates the final outcome from events that were still pending
when the retrospective artefact was first assembled.

| Item | Final state | Evidence |
| --- | --- | --- |
| Final G1–G9 evidence | Complete | Evidence commit `1d708e39f2cde19610d43c5a7f5e36e4a2f947bc`; final manifest SHA-256 `3bb0d8ba015df82611db3f705b36bc7b927285468436e0aab81e9f32fc66a232`. |
| Pull-request integration | Complete | [Land Registry PR #3](https://github.com/chris-page-gov/okf-LandRegistry/pull/3) records integration at the unchanged evidence SHA. |
| Release candidate | Complete | Immutable prerelease `v0.3.0-rc.1`, GitHub release identifier `368893014`, contains the seven governed assets. |
| Final `v0.3.0` release | Complete | Immutable [v0.3.0 release](https://github.com/chris-page-gov/okf-LandRegistry/releases/tag/v0.3.0), GitHub release identifier `368931199`, publishes the unchanged seven governed assets. Annotated tag object `d4159f1076c090dd69260a08308f4162859e4165` peels to evidence commit `1d708e39...`. |
| GitHub Pages deployment | Complete for the frozen Land Registry candidate | Run [31543515600](https://github.com/chris-page-gov/okf-LandRegistry/actions/runs/31543515600) deployed exact commit `1d708e39f2cde19610d43c5a7f5e36e4a2f947bc` successfully. |
| Public real-browser verification | Complete after one product correction and three verifier-definition failures | Immutable [Explorer v0.6.3](https://github.com/chris-page-gov/okf-explorer/releases/tag/v0.6.3), merge `c6c8ccd9...` and Pages run [31549668889](https://github.com/chris-page-gov/okf-explorer/actions/runs/31549668889) corrected Reader and Timeline. The final cache-isolated Chromium receipt passed with 2,203 records, 2,203 sources, 22,267 total relationships and a 15-relationship semantic deep link; receipt SHA-256 `3511e132...`. |
| Cross-pack comparison | Audit complete; exact histories unavailable | Every other producer exposes at least one validated current state, but none retains a Build-1-to-final attempt register comparable with Land Registry. Exact attempt, failure, elapsed-time and token counts therefore remain `null`, not zero. |

Earlier revisions used “pending” as a data-quality marker. The rows above now
name only completed, externally observed states and retain the earlier failures
in the causal narrative rather than rewriting them as successful first passes.

## How to read the counts

The following definitions are deliberately plain. They prevent one word such as
“rebuild” from hiding different kinds of work.

### Build invocation

A numbered attempt to run the governed producer sequence for a candidate. An
attempt remains in the register if it fails. Build 7 is retained as a numbered
attempt even though its preflight stopped before output was touched.

### Initial build

The first candidate produced from the then-frozen inputs. Build 1 is the only
initial build in this release series.

### Corrective or replacement build

An attempt made because an earlier candidate was wrong, undeliverable or bound
to a dependency that had been superseded. Builds 3, 4, 5, 8, 9, 11 and 13 are
in this class. Two failed and five succeeded.

### Reproducibility build

A required second build from a clean checkout, intended to prove that the same
frozen inputs produce byte-identical outputs. Builds 2, 6, 10, 12 and 14 are
reproducibility builds. They are not corrective builds. They became avoidable
cost when the candidate they reproduced was later superseded because an earlier
review gate had been run too late.

### Failed or preflight-closed attempt

An invocation that did not publish a candidate. The failure remains valuable
evidence, but it is not counted as a successful build. Builds 3 and 4 left the
live bundle unchanged; Build 7 closed before output was touched.

### No-op preflight or read-only probe

A check that inspects state but neither invokes the producer nor changes
candidate bytes. The dirty-`.venv` event before Build 11 belongs here. So do the
mistyped path, key and shell-variable probes described later. These consumed
time, but counting them as builds would be misleading.

### CI verification build

A continuous-integration job that reconstructs or checks an already frozen
snapshot. PR workflow run
[31537885306](https://github.com/chris-page-gov/okf-LandRegistry/actions/runs/31537885306)
ran for 22 minutes 14 seconds and included a frozen-snapshot build and the full
test suite; its snapshot-build step took 335 seconds. Main-branch run
[31543262622](https://github.com/chris-page-gov/okf-LandRegistry/actions/runs/31543262622)
then passed in 21 minutes 47 seconds: its verification job took 21 minutes 43
seconds, including a 328-second offline build and 928-second test step.
Deployment run
[31543515600](https://github.com/chris-page-gov/okf-LandRegistry/actions/runs/31543515600)
also reconstructed the snapshot. It completed 37 minutes 32 seconds after
dispatch, including 18 minutes 1 second queued and a 19-minute 13-second
verification job; its offline build took 289 seconds and tests took 813 seconds.
The Pages deploy job took 13 seconds, including an 11-second deployment step.

These are **three full CI builds** of the same frozen release path—335, 328 and
289 seconds—not Builds 15, 16 and 17. They verify committed candidate bytes,
create no new release root and do not alter the count of 14 producer attempts.

### Candidate, release root and evidence

A **candidate** is the exact proposed release tree. Its **release root** is a
digest that identifies the generated closure. **Evidence** records what was
checked about that candidate. Evidence must point to immutable candidate bytes;
changing evidence must not silently change the candidate it is meant to assess.

### Token use

Token use means the model tokens attributed to an individual recorded attempt.
The retained v0.3.0 evidence does not expose that measurement per build, so every
build's token value is `null` in the companion register. The historical figure
of 213,364 tokens belongs to v0.1 and is expressly excluded from this v0.3.0
analysis. A plausible-looking allocation would be invented evidence.

## Audited build register

| Attempt | Class | Evidence-backed time | Outcome | Why it happened and who owned the cause | Token use |
| --- | --- | --- | --- | --- | --- |
| 1 — initial governed candidate | Initial | Approximately 67 seconds | Success at root `2e5b4c82df36c8c4aa9f7f0af6faf54f793d90766c5fc8afc4925c758e14994d`; later superseded | Independent Stage 1 review occurred after the freeze and found omitted source families, rights decisions, CPSV-AP material and predicates. The agent froze too early. | Unavailable (`null`) |
| 2 — clean reproduction | Reproducibility | 66 seconds recorded | Success; byte-identical to Build 1 at root `2e5b4c82df36c8c4aa9f7f0af6faf54f793d90766c5fc8afc4925c758e14994d`; later superseded | The reproduction was required for the candidate, but both builds became avoidable after the late governance review superseded it. | Unavailable (`null`) |
| 3 — corrective replacement | Corrective | Approximately 24 seconds to the last partial write | Failed; 247 MiB partial candidate retained; live bundle unchanged | Full hydration exceeded the retained-text ceiling by 746,220 units. Agent-created tests used one fresh row plus clones or inspected the stale live bundle, and the Python and JavaScript mirrors mishandled optional `review_status`. | Unavailable (`null`) |
| 4 — corrective retry | Corrective | Approximately 71 seconds | Failed; 458 MiB partial candidate retained; live bundle unchanged | The agent-created CPSV validator demanded an administrative territorial unit even though the governed England-and-Wales model deliberately used `dcterms:Location` and authorised zero ATU evidence. The tests encoded a contradictory contract. | Unavailable (`null`) |
| 5 — corrected replacement | Corrective | Approximately 75 seconds | Success at root `15035135001312b74c8c52530179ba79fb2bf214d17868f021a128adbf7a7794`; later superseded | It repaired Builds 3 and 4, but its 113,502,906-byte JSON-LD file could not be stored as a normal GitHub Git object. The agent checked an internal 128 MiB policy instead of the actual delivery boundary. | Unavailable (`null`) |
| 6 — clean reproduction | Reproducibility | Approximately 109.016 seconds from the observable filesystem window; exact shell wall time unavailable | Success; byte-identical to Build 5; later superseded | This was the required clean reproduction. Its cost became avoidable when the later push exposed the untested GitHub object-size boundary. | Unavailable (`null`) |
| 7 — compact-candidate preflight | Numbered preflight | 0.35 seconds | Failed closed before output was touched | `scripts/build.py` was absent from the frozen stage-0 index. This was an agent-created staging error, not a data or corpus failure. | Unavailable (`null`) |
| 8 — compact replacement | Corrective | Exact wall time unavailable | Success at root `6582516f86b50917c09ebac48c806a2db41c4e3bad37dde3e0226419877b8e05`; later superseded | Compact serialisation addressed the delivery-size defect. Independent review then found text-mode newline portability and required a precise provenance-semantic impact account. The associated focused 160-test validation took 122.831 seconds. | Unavailable (`null`) |
| 9 — compact candidate | Corrective | Exact wall time unavailable | Success at root `ef33dd436ae051706a6e4e0135d28f3510dfa08c7b730a97b4eb7b6e0ef9fba4`; later superseded | It incorporated the Build 8 portability and provenance corrections. Post-freeze consumer evidence then exposed an Explorer search-policy mismatch and three skip-link focus failures. | Unavailable (`null`) |
| 10 — clean reproduction | Reproducibility | Approximately 96 seconds from the observable filesystem window | Success; byte-identical to Build 9; later superseded | This was the required clean reproduction, not a correction. The consumer and accessibility checks should have run before Builds 9 and 10. | Unavailable (`null`) |
| 11 — Explorer v0.6.2 consumer replacement | Corrective | 96.20 seconds wall time | Success at root `900976ba4b8b610ec2dda2c17cd7e97f31725968f82cd35719748790cc9d24e3`; later superseded | The newly released Explorer v0.6.2 identity, bounded query policy, settled-result contract and focus corrections superseded Build 9/10 evidence. The full 557-test suite then passed in 370.777 seconds, 373.44 seconds shell wall time. | Unavailable (`null`) |
| 12 — clean reproduction | Reproducibility | 95.53 seconds wall time | Success; byte-identical to Build 11; later superseded | Required clean reproduction of the v0.6.2-bound candidate before fresh assurance. | Unavailable (`null`) |
| 13 — tree-identity correction | Corrective | 94.66 seconds wall time | Success at root `6a29e38e7bb805aafb7f36ba8d1fa4ce976875f45997049cd4808d6ede7f75e1`; current candidate | Formal G5 exposed an agent-created cross-tool version drift: the Python evaluator retained the former ICU-like collation and three-field tree identity while Explorer v0.6.2 used recursive UTF-8 bytewise ordering and a four-field identity. The associated full 557-test validation took 366.519 seconds, with 369.23 seconds shell wall time. | Unavailable (`null`) |
| 14 — clean reproduction | Reproducibility | 96.18 seconds wall time | Success; byte-identical to Build 13; current reproduction | Required clean reproduction of the final corrected candidate. | Unavailable (`null`) |

The numeric build-time fields that are present add to 890.936 seconds, or about
14 minutes 50.936 seconds. That is only a **partial mixed-precision sum**: Builds
8 and 9 have no exact wall time, and several other values are approximate
filesystem windows rather than shell measurements. It must not be presented as
the total delivery time. It also excludes test suites, reviews, CI, failed
browser orchestration, waiting, GitHub publication and conversational work.

The separately observed local validation runs after Builds 8, 9, 11 and 13 add
to **1,263.383 seconds**. This is also only a partial measured sum: the runs
cover different test selections, shell overhead is not consistently available,
and the retained record does not expose every validation invocation. Exact
total validation time is therefore `null`, not 1,263.383 seconds.

## Causal narrative

### 1. Governance was reviewed after the first freeze

Builds 1 and 2 proved that the first candidate was reproducible. They did not
prove it was complete. The independent Stage 1 review then found that source
families, rights decisions, CPSV-AP material and emitted predicates were outside
the governed closure. Reproducing an incompletely reviewed candidate merely
made the wrong boundary deterministic.

The control failure was sequencing: independent scope review should have been a
hard predecessor of candidate freeze. Running it afterwards consumed an initial
build, its clean reproduction and the work needed to retire both.

### 2. Corrective tests did not exercise realistic whole-candidate conditions

Build 3 exposed a real retained-text overflow only after writing a large partial
candidate. The earlier tests were inadequate because they used a fresh row plus
clones, or inspected the stale live bundle, rather than exercising the full
candidate assembled from frozen inputs. The Python and JavaScript validators
also disagreed about optional `review_status`.

Build 4 then exposed a second test-design error: the validator contradicted the
governed CPSV decision. England and Wales was modelled as `dcterms:Location`, but
the validator demanded an administrative territorial unit that the profile
explicitly said could have zero evidence. Tests had made the contradiction look
like a requirement.

### 3. The release-platform boundary was checked after expensive generation

Builds 5 and 6 were semantically corrected and byte-reproducible, but their
113,502,906-byte JSON-LD member could not cross GitHub's regular Git-object
boundary. The agent's first response—raising an internal ceiling to 128 MiB—was
wrong because it validated an invented local policy rather than the actual
publication platform.

Build 7 then found that `scripts/build.py` had not been staged. Builds 8 and 9
introduced compact serialisation and portability/provenance corrections; Build
10 reproduced Build 9. The successful compact files were 94,076,057 bytes for
JSON-LD and 104,711,329 bytes for YAML-LD. This sequence demonstrates why
delivery constraints, complete staging and cross-platform byte controls belong
in a cheap pre-build gate.

### 4. The consumer contract was settled after the producer was frozen

Post-freeze evidence against Explorer v0.6.1 found that only three of 26 expected
search records were visible. Explorer required every meaningful token and
preserved hyphenated compounds; the producer declared component tokenisation and
minimum-should-match but did not emit that policy into the runtime manifest.
Already-empty results also waited for a full journey deadline because the
consumer lacked a settled-result action.

The same phase found three skip links that changed the URL fragment without
moving keyboard focus to `<main>`. A later patch review caught global result
selectors that could match duplicate navigation and primary-result rows, an
evaluator that accepted malformed query-policy fields, a consumer lock that did
not bind the reviewed Git tree, and an identity conflation between the current
Reader, Predicate Registry and Bundle Wiki source releases.

Those defects were corrected before Build 11, then Build 12 reproduced the
v0.6.2-bound output. The key failure was not that Explorer changed; it was that
the carried-forward end-to-end consumer journeys were not run before the
producer freeze.

### 5. The final evaluator was derived from an obsolete contract

Formal G5 eventually showed that Explorer and the Python evaluator examined the
same 857 files and 466,605,616 bytes but ordered their paths differently. The
evaluator retained the former ICU-like ordering and three-field identity;
Explorer v0.6.2 used recursive UTF-8 bytewise `Buffer.compare` ordering and the
four-field `sha256-sha256sum-lines-v1` identity.

Tests derived from the evaluator itself could not reveal that the evaluator was
wrong. Independent regression vectors should have been shared by both
implementations before either implementation became an oracle. Build 13 repaired
the causal evaluator bytes and Build 14 reproduced the final root.

### 6. Public presentation exposed an acceptance gap, not a data rebuild

The successful Pages run deployed exact evidence commit
`1d708e39f2cde19610d43c5a7f5e36e4a2f947bc`. The subsequent public journey
found that Explorer described **14 dataset groupings** as HMLR records. That
label conflicts with the bundle's own authoritative counters: 2,203 records and
22,267 relationships.

The mismatch is in Explorer's presentation and in the acceptance coverage that
allowed grouping count and record count to be conflated. It does not show that
Land Registry generated 14 records, and it does not invalidate or require a
rebuild of the frozen Land Registry semantic data. The correction is tracked in
Explorer issue [#90](https://github.com/chris-page-gov/okf-explorer/issues/90)
and PR [#91](https://github.com/chris-page-gov/okf-explorer/pull/91).

This finding is still an agent-created late defect: acceptance asserted that the
bundle loaded and exposed counts, but did not require every human-facing count
label to identify the counted unit correctly. The first corrective regression
was itself ineffective because its fixture gave `datasets` and `records` the
same value. Independent review then found a second presentation path: the
unloaded Timeline heading also preferred `datasets`. Both defects were corrected
before merge with genuinely divergent 14-grouping/365,786-record test data and
a separate legacy dataset-only fallback.

Exact-head Explorer CI run
[31548806154](https://github.com/chris-page-gov/okf-explorer/actions/runs/31548806154)
passed all selected gates, including 356 Python checks and the full
Chrome/Firefox/WebKit suite. PR #91 merged as `c6c8ccd9...`; Pages run
[31549668889](https://github.com/chris-page-gov/okf-explorer/actions/runs/31549668889)
deployed that exact merge; and immutable
[Explorer v0.6.3](https://github.com/chris-page-gov/okf-explorer/releases/tag/v0.6.3)
is release `368930730`.

The public verifier then failed three times because the agent wrote the verifier
against assumptions that were not in the frozen journey contract. Attempt one
read the pre-query settled list before the debounced query became active.
Attempt two required a non-contractual right-panel `Relationships (15)` string.
Attempt three imposed an ungoverned rank-one rule and conflated the boundary
search with the separate translation-graph route. Each failure closed the public
gate, changed no repository or bundle byte and was retained as explanatory
evidence. The verifier was corrected to follow the frozen journeys rather than
weakening them.

The final service-worker-blocked Chromium receipt passed: Reader showed 2,203
records, 2,203 official sources and 22,267 total relationships; Timeline showed
2,203 records; the governed boundary result was present; and the separate
semantic deep link rendered 15 relationships including `translation of` through
the runtime manifest, governed route locator and relationship shard. Console
and network checks were clean. The scoped receipt SHA-256 is
`3511e132a6b3b6d8348f750e977addbccacd5b0b16ba610a2b7c7102b95ce53c`.
Independent audit passed it, and the unchanged
[Land Registry v0.3.0 release](https://github.com/chris-page-gov/okf-LandRegistry/releases/tag/v0.3.0)
was published immutably as release `368931199`.

Two passing runs over the same byte identities observed the boundary result at
ranks 14 and 1. Rank was not a governed assertion, so this did not block the
release or justify a Land Registry rebuild. It is retained as non-blocking
Explorer diagnostic [issue #92](https://github.com/chris-page-gov/okf-explorer/issues/92)
and must not be cited as stable ranking performance.

## Non-build incidents and late findings

The build table alone understates the problem. The following findings consumed
review, test or orchestration time without necessarily changing candidate bytes.
They are retained because they explain why the process felt repeatedly stuck.

### Frozen-input and generated-output boundary

- The ignored calibration output `evaluation/latest-report.json` was captured in
  a rebuilt receipt. The implementing agent created and later discovered this
  contamination. Ignored local evaluation state must never enter a release
  closure merely because a live directory is copied.
- Candidate-input checks initially read the worktree rather than immutable
  candidate blobs. That allowed a check to describe bytes other than those being
  promoted.
- The freeze did not initially prove complete governed-input staging, candidate
  ancestry or all source-family byte counts. Commit comparison also examined
  endpoints without first proving the required linear ancestry between them.
- Newly introduced caches survived the frozen-input boundary; ignored vendor
  members and `pages/` live-directory copying could also admit unmanifested
  files.
- The pack-root comment named six members, but the first causal graph omitted
  four of them and the builder trusted the comment before independently hashing
  the complete set.
- `build_inputs` and validation inputs were combined in the build receipt. A
  test, workflow or prose edit could therefore churn the bundle root even when
  it was not a causal producer input.
- The dependency lock, interpreter identity and some installed-state evidence
  were missing from the causal receipt.
- The first gzip implementation retained a platform-specific header. Repeating
  it locally did not prove cross-platform deterministic bytes.
- Receipt and inventory operations initially lacked complete aggregate-byte,
  entry-count, decompression and retained-text ceilings.
- A multi-read view of the Git index could change between checks, and the
  post-check metadata flow left a time-of-check/time-of-use window with
  incomplete rollback. Versioned-output and version-path validation were also
  too permissive.

These are recurrences of one control failure: the process did not define and
enforce a single immutable input boundary before generation.

### Evidence and release procedure

- G8 archive binding was initially optional rather than mandatory.
- The runbook anchored some checks to `HEAD`, omitted real evidence commits,
  accepted uncommitted final evidence and did not repeat canonical closure after
  evidence was committed.
- Evidence-only scope was broad enough to mutate historical evidence; forced
  staging could admit ignored and unmanifested bundle files; non-linear evidence
  merges and checksum aliases were insufficiently constrained.
- Evidence scope was initially checked after an irreversible commit, and the
  documented path did not guarantee that final evidence was pushed to the
  candidate branch before PR validation.
- Release metadata was prepared before all release coordinates were reconciled.
  Earlier instructions then contradicted the freeze by asking for citation and
  changelog edits after approval.
- The documented RC deployment order was impossible, v0.3 evidence could be
  directed towards immutable v0.2 paths, and a retained v0.2 guide carried stale
  unlabelled status.
- Release upload discovery could include ignored extras; remote identity and PR
  number were not hard-bound early enough; pasted command blocks were not always
  fail-fast; and the procedure assumed a protected-branch fast-forward without
  checking live rules first.
- A non-triggering approval-variable step and a release-only workflow attached
  to ordinary pull requests could not implement the intended sequence.
- The sole developer cannot submit a native GitHub approval on their own pull
  request. The agent discovered that platform constraint only after G9 and PR
  checks. A transparent one-release exception was recorded; this must become an
  explicit pre-freeze governance decision for future sole-maintainer releases.
- The first protected-branch dry run contained a zsh refspec expansion error.
  It failed before changing the target, but it was another avoidable agent error.

These findings did not justify rebuilding approved bytes. They required bounded
evidence, workflow or release-control corrections.

One adjacent defect has different ownership and must not be folded into the
agent-created list: the inherited evidence assembler had a publication race and
could expose a partial output set on failure. The migration still had to contain
and test that inherited behaviour, but it did not introduce it.

### Runtime and orchestration

- GitHub Pages used Python 3.13 outside `.venv` while the governed candidate used
  CPython 3.12.11 inside `.venv`. The workflow and local preflight did not
  initially enforce one interpreter identity.
- The agent repeatedly applied build-only `-I` isolation to repository modules
  that required the project import path. The correct documented `-B` invocation
  should have been used.
- Focused tests left `__pycache__/*.pyc` files inside the governed `.venv`. The
  pre-Build-11 environment check stopped before invoking the builder. This is a
  separate no-op preflight, not Build 11.
- Node 26 evidence was run before the Node 24 lock was settled, creating work
  that could not support the governed candidate.
- Two browser harnesses were started concurrently on fixed port 4179, causing
  `EADDRINUSE` before the Node 24 journey.
- Two probes guessed a receipt path and a runtime-limit key instead of inspecting
  their names; another probe used zsh's reserved `path` name, another used the
  read-only `status` name, and the first British-English scan used unsupported
  lookahead without `--pcre2`.
- A broad repository search produced avoidably large output immediately before
  context compaction. Bounded file-specific queries and an external state ledger
  would have reduced recovery risk.

These changed no Land Registry domain data. They are agent-created orchestration
noise and should be measured separately from producer builds.

### Test and review design

- Some tests read a stale live bundle or clone one new row instead of evaluating
  the complete frozen candidate.
- Python and JavaScript used divergent optional-field and pattern grammars.
- A whitespace exemption covered source-native CPSV-AP files but not their
  byte-identical generated copies.
- A fixture-only 50 MiB read ceiling rejected real 84 MiB and 78 MiB semantic
  artefacts.
- Four post-Build-5 tests selected a compact assertion type instead of the
  governed absolute class IRI. Another test assumed one publisher edge per
  record and equated a coarse `dataset` delivery kind with `dcat:Dataset`.
- Query-policy, skip-link focus, primary-result selector and consumer-tree
  binding checks arrived after the candidate freeze.
- The evaluator accepted missing, extra, boolean or drifted
  `minimum_should_match` fields although the builder and Reader rejected them.
- Tests derived expected tree identity from the same obsolete evaluator they
  were meant to challenge.
- Explorer acceptance checked that the public bundle loaded but did not prove
  that every displayed count used the correct unit. It therefore missed the
  later conflation of 14 dataset groupings with 2,203 HMLR records.
- The first count regression reused equal `datasets` and `records` values and
  therefore passed against the broken precedence. It also covered Reader but
  missed the same reversed fallback in Timeline. Independent review, not the
  first agent-authored test, exposed both weaknesses before merge.
- Three public-verification runs failed because the agent's verifier added
  timing, wording, rank and route assumptions that were absent from the frozen
  product journeys. The failed receipts are retained, but they are verifier
  definition failures rather than product or Land Registry build failures.
- Identical Explorer and Land Registry bytes produced observed boundary-result
  ranks 14 and 1 in separate passing fresh-context runs. Presence was the
  governed assertion; rank is now tracked separately in Explorer issue #92 and
  must not be treated as a stable performance result.
- G8 originally accepted correctly hashed but semantically false provenance or
  SBOM content; hash identity alone was mistaken for truth.
- A self-consistent ZIP with non-canonical metadata could be accepted after its
  receipt was recomputed.
- Several regressions asserted unsafe wording or sequence. A passing test cannot
  establish a control when the expected behaviour is itself wrong.

The remedy is independent test vectors and adversarial microfixtures executed
before generation, not more assertions derived from the implementation under
test.

### Performance and memory

The first size-policy correction materialised large artefacts in memory and
omitted aggregate limits. Review measured about 332 MB peak resident memory.
The constant-memory correction reduced this to about 31.2 MiB. Large files made
the inefficient implementation visible, but the missing streaming and bounding
requirements were agent design omissions.

### Context compaction

The retained transcript contains exactly two automatic-compaction markers and
exactly two completed builds in that excerpt: Build 1 and its intentional clean
reproduction, Build 2. It does **not** prove a hidden duplicate build caused by
compaction.

Compaction did increase orchestration risk because important gate state lived in
conversation rather than a machine-readable external ledger. After the second
compaction, the process resumed by discovering that Stage 1 governance was
incomplete. The corrective rebuild was caused by that earlier review failure,
not by compaction. The optimisation is to persist candidate, gate, command and
decision state outside the conversational context so that recovery is a lookup,
not a rediscovery exercise.

## Why this repository took longer

The direct comparison question is more important than the defect list. The
cross-pack audit found that exact attempt histories are unavailable outside Land
Registry, so this section states only causal conclusions supported by durable
evidence.

1. **The sequence was reversed.** Candidate construction and reproduction
   preceded complete governance and independent review. Later findings therefore
   invalidated work that had already been made deterministic.
2. **The consumer was not settled first.** Explorer search, focus and tree
   identity contracts were exercised after producer freeze. Consumer-first
   integration would have prevented two replacement pairs.
3. **Tests shared the implementation's assumptions.** Stale live bundles,
   cloned rows, self-derived tree vectors and contradictory profile assertions
   produced false confidence.
4. **The release boundary was treated as a late concern.** Git object size,
   branch rules, reviewer eligibility, runtime identity and immutable release
   ordering were checked after expensive candidate work.
5. **Generated and mutable state were insufficiently separated.** Ignored
   evaluation output, caches, live-directory copies and validation inputs could
   leak into candidate or receipt closures.
6. **Too many concerns changed concurrently.** Semantic modelling, compact
   serialisation, Explorer integration, accessibility, evidence assembly and
   release mechanics were corrected within one long candidate sequence. The
   dependency graph existed conceptually but did not mechanically block work in
   the wrong order.
7. **Durable process state arrived late.** Context compaction did not duplicate
   builds, but the absence of a single-flight state ledger made the agent repeat
   diagnostics and rediscover boundaries.

Land Registry's 466,605,616-byte generated closure and rich semantic model raised
the cost of each loop. They do not explain why a calibration file was captured,
why incompatible runtime versions were mixed, why a fixed port was reused, why a
platform limit was not checked, or why independent review followed freeze. Those
were the agent's errors.

## Enforceable improvements

### 1. Make the dependency graph a gate, not prose

Encode a state machine with these predecessors:

`consumer release → complete causal-input review → adversarial preflight → independent review → freeze → build → clean reproduction → G1–G9 → PR → immutable release → deploy → public verification`.

A command must fail closed if its predecessor evidence is missing or bound to a
different commit, tree, runtime or release coordinate.

### 2. Freeze Git blobs, never ambient directories

Generate from an exact staged or committed tree in a clean checkout. Enumerate
every causal input, dependency lock and tool digest. Reject ignored, untracked,
cached and unmanifested files. Re-run the closure check after commit. Read
evidence inputs from candidate blobs rather than the mutable worktree.

### 3. Split causal build inputs from validation inputs

Changing a test, workflow or explanation must not alter a semantic bundle root
unless the file is genuinely consumed by the producer. Record separate build,
validation, evidence and publication closures with independent digests.

### 4. Run cheap adversarial checks before a full build

Pre-build microfixtures must cover:

- full-scale retained-text, entry-count, aggregate and decompression limits;
- absent and extra optional fields in both Python and JavaScript;
- CPSV Location-versus-ATU policy;
- canonical ZIP and cross-platform gzip metadata;
- GitHub object-size and release-asset boundaries;
- credential-free URL and route validation;
- exact consumer query-policy fields;
- independent UTF-8 bytewise tree-order vectors; and
- ignored-file, cache and post-receipt mutation attempts.

### 5. Settle and release the consumer first

Run the carried-forward Explorer questions, accessibility journeys and exact
tree-identity contract before producer freeze. Bind Reader, Predicate Registry
and Bundle Wiki sources independently. Do not use “current Explorer” as a proxy
for three different release identities.

### 6. Standardise the governed environment

One wrapper should verify CPython 3.12.11, the dependency lock, no `.pth` or
customiser files, no bytecode, the governed Node version and dynamic reserved
browser ports. It should reject incompatible isolation flags before executing a
long suite. CI must call the same wrapper.

### 7. Require independent vectors and negative tests

An implementation cannot be its own oracle. Tree ordering, route identity,
query policy and archive metadata need small reviewed vectors consumed by every
language implementation. A profile exception must have a positive model and a
negative conflation case.

### 8. Persist a single-flight state ledger

After every state transition, write the exact candidate SHA, tree, release root,
completed gate, command, result, time source, recovery location and next allowed
action. Polling or context recovery must read that ledger before running any
command. This directly addresses compaction risk without blaming compaction for
builds it did not cause.

### 9. Adopt cause-before-retry

No failed long-running command may be repeated until its failure is classified
as product, test, environment, platform, orchestration or transient external
failure. Record why the proposed rerun can produce a different result and which
dependency plane it invalidates.

### 10. Preflight the sole-maintainer release path

Before G9, verify live branch protection, reviewer eligibility, exact remote,
merge topology, immutable-release setting, Pages dispatch inputs and the public
verification journey. Where GitHub cannot represent sole-author approval, record
the narrow governance exception before freeze rather than discovering it after
approval.

### 11. Promote exact bytes

The final release must reuse the verified candidate archive. It must not rebuild,
recompress or silently add files. Asset names, sizes and SHA-256 digests must be
checked locally, on GitHub and in the deployed identity before public status is
claimed.

## Cross-pack comparison — completed evidence-boundary audit

The user's question asks how many rebuilds **each** pack required. Applying the
Land Registry definitions to every repository produced a useful negative result:
only Land Registry retains an attempt-by-attempt register from initial freeze to
release assurance. Each other producer exposes at least one validated current
state, but its earlier attempts, failures and superseded states cannot be
reconstructed exactly from the durable repository evidence. Their exact values
are therefore `null`, not zero and not “one”.

| Pack | Current audited state | Validated-state lower bound | Exact producer attempts | Corrective / reproduction / failure counts | Build time | Validation time | Recorded causes | Token use |
| --- | --- | ---: | ---: | --- | --- | --- | --- | ---: |
| `okf-LandRegistry` v0.3.0 | Exact Build 1–14 register, including 11 successful build outcomes | At least 1 | 14 | 7 corrective/replacement attempts / 5 clean reproductions / 3 failed or preflight-closed outcomes | Exact total `null`; partial mixed-precision sum 890.936 seconds; two build times unavailable | Exact total `null`; partial mixed-coverage sum 1,263.383 seconds | Available for every numbered attempt in this report and the companion register | `null` |
| `okf-explorer` | Shared Reader; v0.6.3 released and publicly verified | At least 1 | Not a producer; development-attempt history `null` | `null` | `null` | `null` | Complete comparable history unavailable (`null`) | `null` |
| `okf-ai-infrastructure` | Released and publicly verified as v0.6.0 | At least 1 | `null` | `null` | `null` | `null` | Complete comparable history unavailable (`null`) | `null` |
| `okf-govuk-content` | Semantic implementation complete locally; full-corpus hydration, closing reconciliation and release remain | At least 1 | `null` | `null` | `null` | `null` | Complete comparable history unavailable (`null`) | `null` |
| `okf-ons` | Semantic implementation complete locally; candidate review and deployment remain | At least 1 | `null` | `null` | `null` | `null` | Complete comparable history unavailable (`null`) | `null` |
| `okf-uk-government-apis` | Semantic implementation complete locally; fresh candidate, release gates and deployment remain | At least 1 | `null` | `null` | `null` | `null` | Complete comparable history unavailable (`null`) | `null` |
| `okf-uk-legislation` | Semantic implementation complete locally; a new candidate must be frozen and assured | At least 1 | `null` | `null` | `null` | `null` | Complete comparable history unavailable (`null`) | `null` |
| `okf-uk-living` | Semantic implementation complete locally; specialist review, release and public verification remain | At least 1 | `null` | `null` | `null` | `null` | Complete comparable history unavailable (`null`) | `null` |
| `okf-testing` | Local semantic contract fixtures complete; no publication target | At least 1 | `null` | `null` | `null` | `null` | Complete comparable history unavailable (`null`) | `null` |

Explorer is listed for completeness but remains the shared Reader rather than a
producer. Its governed Land Registry consumer dependency remains v0.6.2, while
v0.6.3 is released and publicly verified as the post-G9 presentation
correction. Its own development-attempt count is not reconstructed here.

### Stage-exposure bias

Land Registry looks uniquely failure-prone partly because this release preserves
every freeze, failed write, replacement, reproduction, gate and release
transition. Most other pack repositories expose a validated current working-tree
state and generated receipt, not the complete history that produced it. This is
**stage-exposure bias**: a process observed at every stage will reveal more
attempts than a process represented only by its latest surviving state.

That limitation does not excuse the Land Registry errors. Its 14-attempt record
proves the failures described in this report. It does mean the available evidence
cannot support the stronger numerical claim that every other pack required
exactly one build or zero corrective work. The defensible comparison is:

- Land Registry: exact attempt and outcome counts are known;
- every other audited producer: at least one validated state is known; and
- every other exact historical attempt, duration and token count is unavailable.

For Land Registry, the initial, corrective/replacement, clean-reproduction and
numbered-preflight classes sum to 14. The three failed/preflight-closed outcomes
are an overlapping result set—failed corrective Builds 3 and 4 plus numbered
preflight Build 7—not an additional class. The companion JSON expresses these
sets explicitly to avoid accidental double counting.

## Accountability and conclusion

No other contributor implemented this migration. The fairest account is
therefore also the simplest: the implementing agent repeatedly allowed review,
consumer integration and release-platform validation to occur after candidate
generation. The agent also wrote tests that encoded stale or contradictory
assumptions, then spent further cycles discovering those assumptions at full
scale. The repository's size amplified the elapsed cost and memory pressure; it
did not originate the defects.

The work nevertheless produced useful controls: atomic candidate swaps, clean
reproduction, bounded streaming validation, exact candidate/evidence separation,
formal G1–G9 binding and an immutable release-candidate asset set. The lesson is
not to remove those controls. It is to run their cheapest and most discriminating
parts before generation, and to make their dependency order machine-enforced.

Final release, deployment and public-browser results are now recorded in the
explicit status fields above. Explorer v0.6.3 and Land Registry v0.3.0 are both
immutable releases, and the final scoped public receipt passed without changing
the approved Land Registry bytes. The completed cross-pack evidence-boundary
audit still requires unavailable historical figures to remain null unless new
durable build registers are recovered.

## Evidence sources

- [Programme migration ledger](../okf-0.2-yaml-ld-semantic-authoring.md), including
  the audited Build 1–14 register and the release checkpoint.
- [Land Registry PR #3](https://github.com/chris-page-gov/okf-LandRegistry/pull/3).
- [Exact-head PR workflow 31537885306](https://github.com/chris-page-gov/okf-LandRegistry/actions/runs/31537885306).
- [Main verification workflow 31543262622](https://github.com/chris-page-gov/okf-LandRegistry/actions/runs/31543262622).
- [Pages deployment workflow 31543515600](https://github.com/chris-page-gov/okf-LandRegistry/actions/runs/31543515600).
- [Explorer issue #90](https://github.com/chris-page-gov/okf-explorer/issues/90)
  and [hotfix PR #91](https://github.com/chris-page-gov/okf-explorer/pull/91).
- [Explorer v0.6.3 release](https://github.com/chris-page-gov/okf-explorer/releases/tag/v0.6.3)
  and [Pages run 31549668889](https://github.com/chris-page-gov/okf-explorer/actions/runs/31549668889).
- [Land Registry v0.3.0 release](https://github.com/chris-page-gov/okf-LandRegistry/releases/tag/v0.3.0).
- [Explorer search-rank diagnostic issue #92](https://github.com/chris-page-gov/okf-explorer/issues/92).
- Companion machine-readable register:
  [`land-registry-v0.3.0/build-attempts.json`](land-registry-v0.3.0/build-attempts.json).
- Durable public-verification evidence: the
  [final receipt](land-registry-v0.3.0/public-verification/receipt.json),
  [verifier](land-registry-v0.3.0/public-verification/verifier.mjs),
  [earlier passing receipt](land-registry-v0.3.0/public-verification/pre-audit-pass.json)
  and three retained failed verifier receipts in the same directory. The
  earlier receipts bind their evaluator revisions by SHA-256, but only the
  final verifier source was retained; those earlier observations are therefore
  auditable but not exactly replayable from this repository alone.
