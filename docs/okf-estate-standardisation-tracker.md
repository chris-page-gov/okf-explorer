# OKF estate build and publication standardisation tracker

Status: implementation complete; public completion is enforced by the
post-merge exact-main Chrome deployment gate. Started 18 August 2026.

This is the canonical progress record for standardising OKF repository builds,
documentation lockstep and publication. Update it in the same change as each
material decision, repository adoption, validation result or newly discovered
backlog item.

## Completion definition

The programme is complete when every registered OKF repository has been
reviewed and either adopts the applicable controls or records a justified
non-applicable decision; changed repositories have passed their declared checks;
affected public deployments have been verified at their exact commit; and all
additional optimisations found during adoption are recorded in the backlog.

## Shared controls

| Control | State | Evidence or next action |
| --- | --- | --- |
| Canonical bundle registry | Implemented in Explorer | Semantic bundle discovery remains separate from the 17-entry operational estate registry and generated human view. |
| Publication-impact plan | Implemented in Explorer | `okf.publication.json` declares source, generated, documentation, changelog, test, CI, deployment and browser planes. |
| Documentation and changelog lockstep | Implemented across applicable producers | The checker reads each publication contract, no longer blanket-exempts dependency automation and keeps methodology changes with documentation and `CHANGELOG.md`. |
| Dependency-routed validation | Implemented in Explorer | The fail-closed planner returns direct and transitive affected planes without executing untrusted command declarations. |
| Browser installation policy | Implemented in Explorer templates | Ordinary checks use installed Chrome; Firefox/WebKit installation is bounded to affected assurance. |
| Exact-deployment verification | Correction implemented; deployment gate required | Run [32175666804](https://github.com/chris-page-gov/okf-explorer/actions/runs/32175666804) proved exact commit `f981130c`, identity and route bytes, then correctly failed on the generated registry's missing project-relative favicon. Audited correction `6060d4a2` and its focused tests pass; the final main candidate must pass the same clean-console Chrome gate. |
| New source-family intake | Implemented in profile | Workbook-folder controls cover formulae, macros, hidden sheets, external links, locale, rights and sensitivity without treating cells as semantic authority automatically. |

## Repository adoption

| Repository | Role | Audit | Adoption | Validation | Publication |
| --- | --- | --- | --- | --- | --- |
| `okf-explorer` | Profile, registry and consumer | Complete | Method merged through [PR #109](https://github.com/chris-page-gov/okf-explorer/pull/109) at `f981130c`; audited correction `6060d4a2` prepared | All method gates and focused registry/verifier tests pass; the first live run proved exact bytes and exposed one missing favicon through its clean-console gate | One affected Site build and final exact-main clean-console receipt are mandatory after merge |
| `okf-ai-infrastructure` | Small bundle producer | Complete | Merged through [PR #5](https://github.com/chris-page-gov/okf-ai-infrastructure/pull/5) at `39c82b51` | 64 tests and PR/main contract, semantic and British-English gates passed; no generated-byte drift | Exact-byte Pages and bounded HTTP identity passed; real-browser interaction/console evidence remains backlog |
| `okf-LandRegistry` | Large-corpus producer | Complete | PRs [#7](https://github.com/chris-page-gov/okf-LandRegistry/pull/7) and [#8](https://github.com/chris-page-gov/okf-LandRegistry/pull/8) merged at `4580c9e4` | Exact-main run [32180585401](https://github.com/chris-page-gov/okf-LandRegistry/actions/runs/32180585401) passed impact, all 568 tests, frozen byte comparison and the repaired immutable-maintenance path | No v0.3.0 rebuild, release or deployment |
| `okf-govuk-content` | Large-corpus producer | Complete | Merged through [PR #18](https://github.com/chris-page-gov/okf-govuk-content/pull/18) at `94f5020c` | Full PR assurance passed and the squash tree is byte-identical; GitHub emitted no main-push run, so a recovery hook is backlogged | Manual publication unchanged; latest preview remains at its preceding authorised commit |
| `okf-ons` | Large-corpus producer | Complete | Merged through [PR #11](https://github.com/chris-page-gov/okf-ons/pull/11) at `b0283b0d` | 277 tests, Ruff, one-build bundle validation and assembled OKF gate passed; no tracked generated-byte drift | Main Pages run [32175602027](https://github.com/chris-page-gov/okf-ons/actions/runs/32175602027) passed; immutable-baseline and real-browser limitations remain explicit |
| `okf-uk-government-apis` | Large-corpus producer | Complete | Merged through [PR #4](https://github.com/chris-page-gov/okf-uk-government-apis/pull/4) at `55c7e679` | 39 tests and PR/main contract, checksum and bundle gates passed; no generated-byte drift | Exact-byte Pages and bounded HTTP identity passed; real-browser interaction/console evidence remains backlog |
| `okf-uk-legislation` | Federation producer | Complete | Merged through [PR #12](https://github.com/chris-page-gov/okf-uk-legislation/pull/12) at `93e072f0` | Hosted validation passed all 469 tests; exactly six workflow-bound lifecycle assurance/checksum projections changed, while semantic shards and the frozen release stayed byte-identical | Exact-main Pages run [32179587677](https://github.com/chris-page-gov/okf-uk-legislation/actions/runs/32179587677) and six byte-identical HTTP routes passed; real-browser assurance remains backlogged |
| `okf-uk-living` | Large-corpus producer | Complete | Merged through [PR #35](https://github.com/chris-page-gov/okf-uk-living/pull/35) at `241209d2` | All 240 tests and integrated-tree checks passed; frozen base, corpus, semantic and assurance bytes stayed unchanged | Local-only/manual-owner policy preserved; no deployment, refreeze or exact-head browser receipt claimed |
| `okf-testing` | Conformance fixtures | Complete | Not applicable: local non-Git fixture | Local-only evidence recorded | Not applicable |
| `okf-heritage-coventry-warwickshire` | Immutable derived publication unit | Complete | Future-release template implemented; released bytes excluded | Focused template checks passed | No rebuild of existing releases |
| `okf-els-api` | Public draft bundle producer | Complete | Merged through [PR #6](https://github.com/chris-page-gov/okf-els-api/pull/6) at `811a6881` | 35 tests and deterministic bundle checks passed; no generated-byte drift or build-before-check masking | Exact-main Pages run [32175479631](https://github.com/chris-page-gov/okf-els-api/actions/runs/32175479631) passed; real-browser receipt remains migration-pending |
| `okf-planning` | Public draft bundle producer | Complete | Merged through [PR #2](https://github.com/chris-page-gov/okf-planning/pull/2) at `9941f9e4` | 26 tests, OKF conformance, 280-file integrity and packed candidate passed; one redundant build removed | Exact-main Pages run [32175480025](https://github.com/chris-page-gov/okf-planning/actions/runs/32175480025) passed; real-browser receipt remains migration-pending |
| `OKF-knowledge-catalog` | Upstream specification fork and dependency | Complete | Not applicable | Exact repository identity recorded | Not applicable |
| `ai-engineering-lab-hackathon-london-2026` | Fixture and demonstrator host | Complete | Not applicable as a producer | Exact repository identity recorded | Not applicable as a producer |
| `wcc-domesday-map/okf/warwickshire-public` | Embedded private OKF producer | Complete | Merged through replacement [PR #35](https://github.com/wcc-domesday-map/domesday-map/pull/35) at `ffe92bbc` | 376 tests, 172,257 OKF checks, canonical contract/impact gates and pull-request plus [integrated-main CI](https://github.com/wcc-domesday-map/domesday-map/actions/runs/32176692225) passed; installed Chrome exposed and verified the favicon correction | Private manual publication boundary unchanged; no deployment triggered |
| `ai-infrastructure-wiki-compat` | Legacy compatibility redirect | Complete | Not applicable beyond route preservation | Exact repository identity recorded | Preserve redirect only |
| `govuk-casa/okf` | Experimental embedded Markdown consumer | Complete | Not applicable as a governed producer | Exact repository identity recorded | Not a governed producer |

## Parallel work allocation

| Workstream | Scope | Dependency | State |
| --- | --- | --- | --- |
| Registry and methodology | Explorer schemas, documentation and generated registry | None | Implementation complete; final generated projection and exact-main gate are this follow-up's remaining publication steps |
| Small-bundle and Land Registry adoption | Repository contracts, CI and repository-specific checks | Explorer profile publication | Complete: AI, APIs, ELS, Planning and Land Registry are merged with their declared main evidence |
| Large-producer adoption | GOV.UK Content, ONS, legislation and living | Explorer profile publication | Complete: all four merged with declared evidence and explicit manual/browser limitations |
| Workbook-source adoption | WCC embedded producer and candidate `.xlsx` family | Explorer profile publication | Replacement PR #35 merged with both hosted gates green; private deployment unchanged |
| Validation and deployment | Repository checks, PRs, merges and live journeys | Applicable adoption changes | Producer evidence complete; Explorer's exact-main Chrome gate determines final public completion |

## Decisions and conflict log

- The tracker is authored documentation and is not a semantic-graph authority.
- Repository-specific commands remain authoritative. Shared tooling may inspect
  and report them but must not replace them with Explorer commands.
- Existing dirty worktrees, branches and untracked files are preserved. An
  adoption workstream must stop only for the affected repository; independent
  repositories continue.
- Parallel agents do not edit the same repository concurrently unless they have
  disjoint files and an explicit hand-off. Any unexpected overlap is recorded
  here before work resumes.
- Live GitHub discovery is a separate input from the reconciliation presets.
  Four additional `okf-*` repositories and one external registered-bundle host
  were found; no preset list is treated as complete until registry discovery
  and classification reconcile.
- Initial timing evidence found duplicate branch `push` and pull-request CI in
  AI Infrastructure, GOV.UK Content, UK Legislation and UK Government APIs.
  ONS also builds the same bundle twice in one validation path, while building
  before `--check` can mask tracked-output drift. Repository-specific changes
  will preserve required main/tag assurance and check clean state before build.
- Repeated hand-off scans found ignored `.DS_Store` files appearing across
  source, cache and Git-internal directories while command-line work continued.
  Finder involvement is an unproven inference, and repeatedly deleting ignored
  local cache metadata did not provide a stable control. The enforceable
  publication boundary is therefore fail-closed: no such file may be tracked,
  staged, copied into a Site component or present in the assembled Site. Each
  repository hand-off checks those four boundaries without treating unrelated
  ignored local state as a reason to stop other work.
- The semantic Bundle Wiki registry remains a discovery surface for publishable
  bundles. A separate estate registry records every reviewed repository,
  including fixtures, embedded producers, immutable publication units,
  compatibility routes and upstream dependencies. Lifecycle publication scope
  must not be overloaded into a bundle's semantic `status`.
- Adoption is transactionally isolated per repository. The reconciler retains
  its safe all-target preflight default, while estate orchestration invokes one
  repository at a time so a blocked or dirty target does not stop independent
  work.
- Five active producer worktrees already contain substantial, unrelated
  semantic migrations. Their standardisation changes will be prepared in clean
  isolated clones and reviewed as repository-specific commits rather than
  overwriting shared working state.
- The ONS producer supplies the existing workbook-folder precedent: governed
  Excel sources are transformed through an allowlisted, deterministic snapshot.
  This is an input adapter and provenance boundary, not automatic semantic
  authority for cells, formulas or presentation structure.
- Regenerating the Explorer semantic bundle and legacy viewer after adding the
  lifecycle profile produced no tracked byte changes. The standardisation work
  therefore remains a governance, application and Site publication change; it
  does not force a semantic bundle or GitHub Release rebuild.
- The first full application gate found the server-rendered learning registry
  still carried pre-validation bundle statuses and the AI Infrastructure 0.4.0
  version. The canonical registry projections were already correct; the small
  application projection was corrected and its existing drift test now passes.
  This is a dependency the initial parallel work allocation had not identified.
- The first hosted Python-contract gate then correctly rejected the heritage
  local-candidate receipt because it still bound the preceding Explorer app
  tree. The existing Site and corpus bytes were reused: installed Chrome reran
  the 100-question evaluation and the tiny, faithful and synthetic journeys,
  then the receipt alone was rebound to the exact current app identity. The
  first journey invocation omitted its declared publication `bundle-root` and
  failed all three paths independently; the corrected invocation passed 3 of 3.
  Future orchestration must carry an application's route and its corpus mount
  as separate declared inputs when the Pages root is a learner landing page.
- Local browser tests initially failed because the managed sandbox denied macOS
  browser rendezvous and loopback sockets. The unchanged suite passed when run
  with its governed browser and loopback permissions. Treat this error class as
  an execution-environment boundary, not a reason to rebuild application bytes.
- The first WCC runner-Chrome attempt linked `chromium.executablePath()` into
  Playwright's browser cache. Playwright Test headless mode resolves a distinct
  `chromium_headless_shell` path, so the Silver job failed before browser
  interaction. The supported `chrome` channel now selects installed Chrome for
  every affected launcher without a download or cache mutation. Installed
  Chrome then exposed a real missing-favicon console error, corrected with a
  self-contained icon. Future adoptions must use an explicit supported channel
  and retain clean-console checks rather than synthesising cache paths.
- GitHub did not attach the corrected WCC branch head to PR #34 even though both
  Git and the GitHub ref API reported `6aa4910b`. Independent repository work
  continued. The stale PR was closed without deleting its branch and replacement
  PR #35 immediately bound the correct head and started fresh checks. Future
  orchestration must compare the PR head OID with the remote branch OID after
  every corrective push and replace only the affected PR if they diverge.
- GitHub did not emit a `push` run or check suite for the GOV.UK Content squash
  commit even though the workflow is active and declares `main`. The reviewed
  pull-request tree and integrated tree have the same Git tree identity. A
  byte-preserving manual recovery attempt failed closed because the workflow has
  no `workflow_dispatch` entry. Future producer CI should provide a reviewed
  exact-ref recovery hook, and orchestration must record missing event evidence
  rather than inventing an integration gate.
- ONS confirmed the repository-specific limit of a generic clean-first rule:
  its generated `bundle/` is intentionally ignored and absent from a clean Git
  tree. The adopted workflow therefore builds it exactly once and transports
  that workspace to Pages. An immutable baseline is a separate design decision,
  not a reason to perform a second masking build.
- Land Registry's first full-test run found one genuine lockstep dependency:
  the new publication-method document increased the current governed inventory
  from 153 to 154 controls, while a legacy-bound test still expected 153. The
  repair updates the current test, architecture and maintenance documentation
  together, while retaining the immutable v0.3.0 release's historical 153-file
  boundary. Bundle, distribution, validation and frozen release bytes remain
  unchanged.
- Explorer's first exact deployed-commit run proved the identity, contract,
  route bytes and structured registry links, then failed the clean-console gate
  because the generated page did not declare its project favicon. Chrome
  requested origin-root `/favicon.ico`, while Pages correctly publishes
  `/okf-explorer/favicon.svg`. The renderer now emits the relative
  `../../favicon.svg` link and the verifier records console message URL, line
  and column. This is an application/Site correction only; no semantic bundle,
  corpus or release rebuild is required.
- Land Registry's first integrated-main run exposed an interaction between two
  fail-closed flags. The reviewed three-file lifecycle exception cleared
  `manual_review_required`, but the same unknown paths still set
  `stage1_review_required`, making immutable maintenance unreachable. Focused
  PR #8 clears both flags only for those exact paths and adds a historical-main
  replay test. All 568 main tests passed and the bundle, distribution,
  validation, source, semantic and schema bytes have zero diff.

## Optimisation backlog

- Decide whether common lockstep tooling should be vendored, packaged or invoked
  from a pinned Explorer revision; avoid an unpinned cross-repository dependency.
- Add cache and timing evidence so impact routing can be evaluated against actual
  CI duration rather than assumed savings.
- Add workbook-folder conformance fixtures and content-free inventories for
  `.xlsx`, `.xlsm`, `.ods` and CSV companions, covering formula, macro,
  hidden-sheet, external-link, provenance, rights and personal-data boundaries.
- Decide and document the lifecycle of candidate or legacy repositories found
  by discovery but absent from the reviewed reconciliation presets.
- Add a shared, commit-pinned post-deployment verifier which uses runner-installed
  Chrome, consumes repository-declared identity and journey checks, and does not
  rebuild candidate bytes.
- Profile the 21-minute UK Legislation validator and the 9-minute ONS test suite
  before sharding; route documentation-only changes only after fail-closed
  dependency classification has evidence.
- Add a reviewed `workflow_dispatch` recovery path with exact-ref reporting to
  GOV.UK Content CI, and investigate why GitHub omitted its integrated-main
  `push` event.
- Triage the four pre-existing GOV.UK Content Dependabot alerts (one high and
  three moderate) independently of this byte-preserving methodology adoption.
- Decide whether ONS should publish an immutable generated-bundle baseline;
  until then, retain one build and never claim a clean pre-build byte comparison.
- Add the Planning Pages shell and `.nojekyll` to a governed checksum catalogue
  without forcing a semantic bundle rebuild.
- Enforce pull-request head identity against the remote branch after corrective
  pushes so stale GitHub bindings cannot hide the reviewed commit.
- Keep the application route and corpus mount as separate declared browser
  inputs; a learner landing page must not be inferred to be the bundle root.
- Harden the estate-registry builder with fail-closed checks for unique backlog
  IDs, valid repository references, single bundle ownership and coherent
  adoption/audit/contract state tuples.
- Refresh immutable GitHub Action pins which still declare the deprecated
  Node.js 20 runtime; legislation's exact-main run showed GitHub forcing those
  actions onto Node.js 24. Review the equivalent estate pins without replacing
  immutable SHAs with moving tags.
