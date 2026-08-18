# OKF estate build and publication standardisation tracker

Status: active implementation, started 18 August 2026.

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
| Documentation and changelog lockstep | Implemented in Explorer | The checker reads the publication contract and no longer exempts dependency automation. Estate adoption remains in progress. |
| Dependency-routed validation | Implemented in Explorer | The fail-closed planner returns direct and transitive affected planes without executing untrusted command declarations. |
| Browser installation policy | Implemented in Explorer templates | Ordinary checks use installed Chrome; Firefox/WebKit installation is bounded to affected assurance. |
| Exact-deployment verification | Implemented on Explorer branch | The Site candidate binds the full commit and control-file digests; the first merged Pages run must still produce the live installed-Chrome receipt. |
| New source-family intake | Implemented in profile | Workbook-folder controls cover formulae, macros, hidden sheets, external links, locale, rights and sensitivity without treating cells as semantic authority automatically. |

## Repository adoption

| Repository | Role | Audit | Adoption | Validation | Publication |
| --- | --- | --- | --- | --- | --- |
| `okf-explorer` | Profile, registry and consumer | Complete | Implemented on feature branch | 465 Python tests, 408 application tests, 86 Node contract tests, deterministic application build, SBOM and 817 MB Site assembly passed | Pending merge, Pages run and exact-route receipt |
| `okf-ai-infrastructure` | Small bundle producer | Complete | Isolated adoption queued | Pending | Pending |
| `okf-LandRegistry` | Large-corpus producer | Complete | Isolated adoption queued | Pending | Pending |
| `okf-govuk-content` | Large-corpus producer | Complete | Isolated adoption queued | Pending | Pending |
| `okf-ons` | Large-corpus producer | Complete | Isolated adoption queued | Pending | Pending |
| `okf-uk-government-apis` | Large-corpus producer | Complete | Isolated adoption queued | Pending | Pending |
| `okf-uk-legislation` | Federation producer | Complete | Isolated adoption queued | Pending | Pending |
| `okf-uk-living` | Large-corpus producer | Complete | Isolated adoption queued | Pending | Pending |
| `okf-testing` | Conformance fixtures | Complete | Not applicable: local non-Git fixture | Local-only evidence recorded | Not applicable |
| `okf-heritage-coventry-warwickshire` | Immutable derived publication unit | Complete | Future-release template implemented; released bytes excluded | Focused template checks passed | No rebuild of existing releases |
| `okf-els-api` | Public draft bundle producer | Complete | Explorer migration preset implemented; isolated adoption queued | Preset tests passed | Pending |
| `okf-planning` | Public draft bundle producer | Complete | Explorer migration preset implemented; isolated adoption queued | Preset tests passed | Pending |
| `OKF-knowledge-catalog` | Upstream specification fork and dependency | Complete | Not applicable | Exact repository identity recorded | Not applicable |
| `ai-engineering-lab-hackathon-london-2026` | Fixture and demonstrator host | Complete | Not applicable as a producer | Exact repository identity recorded | Not applicable as a producer |
| `wcc-domesday-map/okf/warwickshire-public` | Embedded private OKF producer | Complete | In progress in isolated clone | Focused CI checks passed; contract checks pending | Pending |
| `ai-infrastructure-wiki-compat` | Legacy compatibility redirect | Complete | Not applicable beyond route preservation | Exact repository identity recorded | Preserve redirect only |
| `govuk-casa/okf` | Experimental embedded Markdown consumer | Complete | Not applicable as a governed producer | Exact repository identity recorded | Not a governed producer |

## Parallel work allocation

| Workstream | Scope | Dependency | State |
| --- | --- | --- | --- |
| Registry and methodology | Explorer schemas, documentation and generated registry | None | Implemented; full validation in progress |
| Small-bundle and Land Registry adoption | Repository contracts, CI and repository-specific checks | Explorer profile publication | Audit complete; isolated implementation queued |
| Large-producer adoption | GOV.UK Content, ONS, APIs, legislation and living | Explorer profile publication | CI audit complete; isolated implementation queued |
| Validation and deployment | Repository checks, PRs, merges and live journeys | Applicable adoption changes | In progress |

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
- Local browser tests initially failed because the managed sandbox denied macOS
  browser rendezvous and loopback sockets. The unchanged suite passed when run
  with its governed browser and loopback permissions. Treat this error class as
  an execution-environment boundary, not a reason to rebuild application bytes.

## Optimisation backlog

- Decide whether common lockstep tooling should be vendored, packaged or invoked
  from a pinned Explorer revision; avoid an unpinned cross-repository dependency.
- Add cache and timing evidence so impact routing can be evaluated against actual
  CI duration rather than assumed savings.
- Define workbook-folder intake for `.xlsx`, `.xlsm`, `.ods` and CSV companions,
  including formula, macro, hidden-sheet, external-link, provenance, rights and
  personal-data boundaries.
- Decide and document the lifecycle of candidate or legacy repositories found
  by discovery but absent from the reviewed reconciliation presets.
- Add a shared, commit-pinned post-deployment verifier which uses runner-installed
  Chrome, consumes repository-declared identity and journey checks, and does not
  rebuild candidate bytes.
- Profile the 21-minute UK Legislation validator and the 9-minute ONS test suite
  before sharding; route documentation-only changes only after fail-closed
  dependency classification has evidence.
