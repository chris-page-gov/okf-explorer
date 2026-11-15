# Feature and plan status — 15 November 2026

Last complete implementation check: merged main `b3f83cede346d76699529e4a7dadfae24d5d99a8`.
The [full main run](https://github.com/chris-page-gov/okf-explorer/actions/runs/43758093745)
passed 597 Python, 946 app, 555 UI and 78 Foundry cases, with the UI/Foundry
journeys across Chrome, Firefox and WebKit. The [Pages run](https://github.com/chris-page-gov/okf-explorer/actions/runs/43758075502)
passed exact-revision and real-Chrome estate/public-access journeys. These
receipts apply to that revision and their declared scope; they do not close
the outstanding work below.

App `0.8.1`, frozen Analytical Data v1 `1.0.0-rc.1` and optional v2
`2.0.0-rc.1` are independent versions. Typed datetime, spatial declarations
and `/inspect-data/` are implemented on main as experimental v2 features.
Their broader schema parity, adoption and independent acceptance remain open.
No producer or pinned Reader is migrated automatically.

## Remaining work and closure conditions

This is the current work inventory. Closure conditions are proposed evidence
requirements, not a claim that a fix, approval or additional scope exists.
Producer assurance belongs to the producer as well as its pinned Reader;
passing Explorer CI does not renew a producer's older acceptance receipt.

| ID and area | Current state and evidence | Remaining work and closure evidence |
| --- | --- | --- |
| REM-01: help scrolling | Open intermittency. The narrow-layout Chrome PageDown failure was observed; later isolated repetitions passed without an established cause. The original failing trace was overwritten. See the [help investigation](validation/reading-help-scroll-2026-11-14.json). | Retain a fresh failing trace and exact source/browser/state identities, establish the cause, add a discriminating regression and verify the correction. Passing repetitions alone do not establish closure. |
| REM-02: WebKit facets | Open intermittency. An expanded facet expected ten values and initially returned zero, then passed on retry. Twenty isolated repeats passed; no original trace artefact was listed. See the [facet retry record](validation/facet-touch-retry-2026-11-14.json). | Capture and explain the failing expansion/selection state, retain the original trace and verify any correction on the affected engine. The superseded cancelled run is not an all-engine pass. |
| REM-03: local Firefox startup | Open environment blocker before application load on macOS. Fresh owned cache/profile attempts did not resolve it. Current Linux CI passes Firefox. See the [historical local check](feature-review-2026-11-14.json). | Obtain a successful controlled local launch and the actual Reader journeys, with retained package/browser/profile diagnostics. Keep this distinct from REM-04. |
| REM-04: Playwright PR #195 | Blocked and unmerged. Latest stable 1.65.1's Firefox revision 1572 still crashes in both cross-world ARIA probes; the control passes. Main retains 1.64.1. See the [fresh probe](validation/playwright-firefox-aria-2026-11-15.json) and [PR #195](https://github.com/chris-page-gov/okf-explorer/pull/195). | A stable package must first pass the focused probe. Then reconcile the dependency branch, update related packages/docs/SBOM together and pass the full Chrome/Firefox/WebKit gate. Retain every accessibility rule and engine. |
| REM-05: broader producer Reader/package proofs | Open producer assurance. Older broad portable, TOM and security Reader/package receipts are stale against current producer outputs. Current scoped AI/ORUK evidence does not renew that broader scope. This is separate from the green Explorer implementation and Pages checks above. | Re-run each broader producer journey against its exact current bundle digest and pinned Reader, then revalidate the matching package. Retain separate receipts and scope limits. Protected contents and detailed private findings stay in the producer's authorised private storage. |
| REM-06: data compatibility and coverage | Open publisher-specific gaps. DfE geography-header naming, retained Warwickshire/NDL compatibility/access gaps and bounded Defra pagination/time/spatial observations do not establish general interoperability or county coverage. See the [profile rollout](analytical-data-profile-rollout.md) and [curation review](analytical-data-curation-review-2026-11-11.md). | Resolve each publisher's contract/access question with versioned evidence before claiming support. WCC live acquisition, CSV diagnosis, feed probes, coverage and remediation stay parked; only frozen offline regressions are in scope. |
| REM-07: optional analytical v2 | Code is implemented, with experimental adoption and conformance boundaries. Browser preview is one bounded selected CSV, not full Python package/schema validation; broader datetime/CRS/geometry needs remain unsupported. See the [v2 boundary](analytical-data-v2-preview.md). | Independent schema/domain review, representative analyst and human accessibility tasks, explicit browser/CLI parity decisions and a governed adoption/migration decision. Additional formats or spatial operations need separately reviewed scope and versioning. |
| REM-08: conditional and opt-in checks | Open coverage limits. Full main CI skips 15 external-corpus UI cases, one Evidence Connect source integration and one genuine-CDP observer. All 115 service tests pass locally with both pinned source environments; the local CDP observer remains skipped. Two additional standalone producer-integration skips are outside the registered terminal runner. | Supply the declared immutable inputs or explicit opt-in, execute the affected checks and retain exact revision/environment results. Missing input is not passing integration evidence. Do not reacquire parked WCC data to clear a skip. |
| REM-09: independent acceptance and architecture B–F | Outstanding. Domain/rights and information-owner decisions, held-back response assessment, client-visible completeness, representative users/new authors, human assistive technology, second-domain scale and comparative rendering retain their own criteria. See the [plan register](#reviewed-plan-register). | Complete the applicable agreed protocols with independent reviewers, actual outputs, failures/retests and bounded conclusions. Automated structure, transport, axe or delivery checks do not supply these decisions. Local roles/thresholds and real model/library/service production integration also need owner acceptance. |
| REM-10: Hono PR #203 and Worker promotion | Repository repair complete: [#203](https://github.com/chris-page-gov/okf-explorer/pull/203) merged Hono 4.13.18 after green checks; full main and Pages receipts are linked above. The remote Worker and frozen source/engine pairs retain separate deployment identities. | No Hono repository repair remains open. A Worker promotion, if required and authorised, needs its own exact build/deployment/client receipts. Neither green CI nor a lockfile update establishes deployed exposure or alert closure. |
| REM-11: deferred or proposed scope | Voice, general cross-client host support, broader standalone legacy links, integrated novice authoring, storage replacement and other plan suggestions retain the dispositions below. | Make an explicit compatibility/scope/adoption decision before treating a proposal as a committed feature. Retain the acceptance evidence for any adopted scope; do not silently mark it implemented. |

## Historical baselines and interpretation

Pre-existing implementation baseline: `5755359efd54b14a356dbff67d6082db1b195a91`, fetched from GitHub main on 14 November 2026. App release `0.8.1` and Analytical Data `1.0.0-rc.1` are independent versions. This inventory records code/contract maturity separately from domain acceptance, host compatibility, deployment and source completeness. The historical baseline checks are in the [check record](feature-review-2026-11-14.json). The then-unmerged v2 extension is separately bound by the [targeted receipt](analytical-data-v2-targeted-validation-2026-11-14.json) and its final candidate CI; it is not attributed to the older baseline.

Main advanced during this review. Local main was subsequently fast-forwarded to `3f211964` (PRs #206, #207 and #210), and that revision was merged into the inventory/candidate work. The historical baseline check record remains tied to `5755359e`; it does not automatically validate these additions. The later implementation and main assurance above supersede that candidate state.

Implemented means the stated code and local contract exist. Experimental means a bounded candidate exists with unresolved adoption/compatibility. Proposed and deferred mean no accepted implementation is claimed. An acceptance gap can remain against implemented code. Historical documents retain their dated baseline; a title containing “plan” is not a promise that every historical idea is still scheduled.

## Reader and governed knowledge

| Feature | Status | Evidence and remaining work |
| --- | --- | --- |
| Small OKF 0.2 Markdown core | Implemented | [Conformance](okf-conformance.md); richer profiles remain additive. |
| Bundle Wiki v1 YAML-LD/JSON-LD semantics | Implemented | [Semantic authoring](okf-0.2-yaml-ld-semantic-authoring.md); only pinned contexts resolve. |
| Evidence-bearing directed relationship assertions | Implemented | [Assertion mapping](yaml-ld-relationship-assertion-mapping.md); validate every assertion, preserve authority/status planes. |
| Deterministic bundle, registry, viewer and site generation | Implemented | [Publication contract](../okf.publication.json); exact candidate assurance remains revision-specific. |
| Canonical profile vendoring and estate reconciliation | Implemented | [Estate tracker](okf-estate-standardisation-tracker.md); each producer's current adoption requires its own check. |
| Independent bundle registry and federation | Implemented | [Federation](federated-bundles.md); admission and source coverage are producer responsibilities. |
| Public bundle access directory and discovery routes | Implemented in upstream main | [Access directory](public-bundle-access.md), `okf-public-access.json`, `/.well-known/okf.json` and `llms.txt`; retained HTTP observations do not establish browser, Voice, rights or answer acceptance. Nested discovery links retain their Pages path prefix. |
| Small bundle loading and bounded YAML-LD parsing | Implemented | `src/lib/sources/smallBundle.ts`; arbitrary remote contexts are not executed. |
| Large sharded corpus loading | Implemented | `src/lib/sources/largeCorpus.ts`; resource limits and missing shards remain visible. |
| Digest-bound relationship runtime and route loading | Implemented | [Rich graph architecture](okf-bundle-wiki-architecture-2026-07-11.md); historical/rejected planes remain separate. |
| Resource URL, origin, redirect and integrity controls | Implemented | [Source constraints](source-constraint-ledger.md); access permission is not inferred from availability. |
| Search and static search indexes | Implemented | [Search/filter manual](static-search-filtering-manual.md); source coverage bounds results. |
| Facets, explicit missing values and selection state | Implemented | [Facet gates](foundry-facets.md); producer-specific distinctions need actual output/Reader evidence. |
| Record cards, detail, graph and relationship inspection | Implemented | [Interaction implementation](explorer-interaction-implementation.md); presentation grouping is not identity. |
| Timeline and date-role presentation | Implemented | `src/lib/viewer/smallTimeline.ts`, `largeTimeline.ts`; presentation alone does not supply tabular typing. Optional v2 validates its declared datetime subset separately. |
| Bookmarks and workspace navigation | Implemented | `src/lib/viewer/bookmarks.ts`, `workspaceNavigation.ts`; browser state is not an audit repository. |
| Source inspector and local source exploration | Implemented | `src/lib/viewer/SourceInspector.svelte`; visible source gaps remain explicit. |
| Governed terms and concept navigation | Implemented | [Conceptual navigation](conceptual-navigation.md); similarity does not establish semantic identity. |
| Large-record narratives and endpoint labels | Implemented | [Narrative contract](large-record-narrative-source-contract.md); producer declarations must be retained. |
| Geospatial map and bounded preview | Implemented, scoped | [Map manual](geospatial-map-manual.md); no general reprojection or county completeness inference. |
| Legislation structure/detail and effects | Implemented, scoped | [Legislation acceptance](legislation-runtime-acceptance.md); legal sufficiency remains independent. |
| Learning catalogue, pathways and learner hub | Implemented | [Learning presentation](learning-presentation.md); external curriculum fixtures have conditional tests. |
| Provider datapack presentation | Experimental contract | [Provider datapacks](provider-datapacks.md); individual producer/adoption evidence remains separate. |
| Model enrichment presentation | Experimental, labelled | Keep model-derived evidence distinct from official/normalised source planes. |
| Legacy single-file viewer and browser-compatible docs | Implemented compatibility | [Repository guide](repository-guide.md); main interactive app remains the Reader. |
| Reading help and source-bound explanations | Implemented, scoped | [Reading help](reading-help.md); broader producer passage annotation/review remains open. |
| Reading-help corpus review | Implemented tooling | [Corpus review](reading-help-corpus.md); displaying an explanation does not independently accept it. |
| Evidence workbench | Implemented | [Workbench](evidence-workbench.md); review/export is separate from producer adoption. |
| Passage boundaries and local reference review | Implemented | [Passage contract](evidence-workbench-passage-boundaries-v1.md); producer integration tests need declared local inputs. |
| Local correction/proposal export | Implemented preview boundary | No automatic writeback or official approval is inferred. |
| General user learnability | Acceptance outstanding | Architecture plan D requires five representative participants and retained failures/retests. |
| Human assistive-technology acceptance | Acceptance outstanding | Automated keyboard/layout/axe checks do not discharge a human review. |

## Evidence assembly and clients

| Feature | Status | Evidence and remaining work |
| --- | --- | --- |
| Ask OKF governed context assembly | Implemented | [Context assembly](context-assembly.md); insufficient evidence remains insufficient. |
| Required-evidence allocation and dependency closure | Implemented contract | [Allocation ADR](adr-required-evidence-allocation.md); producers must declare controlling dependencies adequately. |
| Budgeted selection, truncation and gap reporting | Implemented | [Context evaluation](context-assembly-evaluation.md); complete delivery can still lack required evidence. |
| Independent A–H controls | Implemented harness | The controls assess their declared package/scope, not universal answer accuracy. |
| Source-route retrieval candidate | Experimental addition | [Remote MCP](remote-mcp.md); source-pinned retrieval and held-out domain acceptance remain separate. |
| Compact catalogue/manifest delivery | Implemented | [Compact delivery ADR](adr-compact-evidence-delivery.md); client-visible clipping must be assessed separately. |
| Exact bounded evidence reads and continuations | Implemented | Continue at the same source/engine/budget/context identity; partial reads are incomplete. |
| Versioned evidence replay and context identity | Implemented | [Replay ADR](adr-versioned-evidence-replay.md); replay links are not stored audit logs. |
| Browser evidence replay and human inspection | Implemented | [Workbench](evidence-workbench.md); inspection is not model-response acceptance. |
| Read-only remote MCP transport | Implemented | [Service publication record](remote-mcp-publication.md); code, recorded deployment and current host exposure are separate. |
| MCP service source/deployment receipts | Implemented mechanism | Exact service/engine/corpus/digest witnesses required; later doc commits do not become deployed code. |
| Native browser page tools | Experimental host compatibility | [Page tools](workbench-page-tools.md); registration, native execution and AI-host callable tools are separate observations. |
| Manual handlers when native tools are unavailable | Implemented | Human route remains usable; manual invocation does not establish native host execution. |
| Repository authoring plugin/prompt kit | Implemented package | [Prompt kit](okf-authoring-prompt-kit.md); integrated consumer acceptance remains open. |
| Cross-client capability preflight | Proposed acceptance programme | Plan C: actual browser, Codex and ChatGPT versions, transport and tool visibility. |
| Model-visible complete delivery across clients | Unverified generally | Need retained reconstruction/clipping observations at fixed identities and ceilings. |
| Evidence-to-explanation domain pilot | Proposed acceptance programme | Plan B: at least ten held-back cases and independent specialist assessment of every actual response. |
| General domain answer quality | Acceptance outstanding | No blanket legal, public-service or analytical answerability claim follows from transport tests. |
| Voice journey | Deferred | Separate microphone, interruption, correction, source/uncertainty and end-call acceptance; typed input/audio output is narrower. |
| Restricted personal-data processing | Not adopted | Public-evidence exemplar does not provide claimant-data access/retention assurance. |
| Production write/action authority | Outside current evidence-reader scope | A separate executing service must enforce scoped permissions, approvals, recovery and audit. |

## Authoring, tabular data and research

| Feature | Status | Evidence and remaining work |
| --- | --- | --- |
| Authoring profile and domain discovery | Implemented | [Authoring profile](../profiles/authoring/v1/index.md); validate real producer populations and facets. |
| Foundry profile/schema/facet/evaluation checks | Implemented | [Evaluation harness](okf-explorer-evaluation.md); structural checks are not independent domain acceptance. |
| Project Studio eight-stage pathway | Implemented documentation | [Pathway](project-studio/index.md). |
| Integrated guided authoring application | Proposed | No complete application/novice acceptance is claimed. |
| New-author checkpoint/resume/failure/correction journey | Acceptance outstanding | Plan D requires actual producer output and a new author's observation. |
| Second independently authored domain pilot | Proposed acceptance programme | Plan E; existing demonstrations do not automatically satisfy its agreed protocol. |
| Resource/scale and storage decision protocol | Proposed acceptance programme | Measure bytes, latency, cancellation and peak memory before architectural replacement. |
| Analytical Data profile | Experimental `1.0.0-rc.1` | [Rollout](analytical-data-profile-rollout.md); optional tabular contract, not a new universal OKF core. |
| CSV checksum, dialect, declared types, keys and missing-value checks | Implemented in candidate validator | `scripts/check_analytical_data.py`; candidate conformance does not establish analytical utility. |
| Native DfE EES CSV/metadata pair inspection | Implemented in upstream main | [EES Reader](dfe-ees-reader.md), `/data/`; exact sidecar joins, raw/numeric views, bounds and hash-bound download. Separate from the optional analytical manifest/profile and `/inspect-data/`; no upload or automatic conversion/adoption. |
| Frozen Warwickshire and NDL trial | Retained evidence; follow-up parked | [Trial](analytical-data-trial-2026-11-11.md); preserve compatibility gaps and original hashes. |
| Frozen Defra API pagination/time/spatial trial | Retained evidence | [Live-trial report](analytical-live-trial-2026-11-11.md); observation is not general API or county-coverage certification. |
| Data curation and Defra learning | Local assessment | [Curation review](analytical-data-curation-review-2026-11-11.md); source obligations need scoped adoption. |
| Typed datetime validation | Experimental v2 candidate | [Implementation](analytical-data-v2-preview.md): exact nanosecond keys and a declared limited timestamp subset; RC.1 unchanged. Independent adoption remains open. |
| Richer spatial validation | Experimental v2 candidate | Explicit supported CRS/axes/units, decimal-string extents, paired coordinates and vertical datum gaps; no reprojection, geometry or coverage certification. |
| In-browser analytical CSV previews | Experimental local feature | `/inspect-data/` checks one local CSV with bounded resources, escaped literals and explicit gaps. Full schema/package conformance and independent analyst/accessibility acceptance remain separate. |
| RC.1 estate migration | Not automatic | No producer or pinned Reader is silently upgraded by a new candidate. |
| Controlled-language renderer | Isolated experiment | [Experiment](controlled-language-experiment.md); measured wording is not semantic fidelity. |
| Independent rendering/comprehension comparison | Proposed | Plan F requires equal evidence, retained model settings/outputs, negative controls and independent assessment. |
| Reconstructed BEP schema migration | Not adopted | [BEP status](bep-implementation-status.md); production `context_id` is not research `package_id`. |
| Cross-runtime canonicalisation standard | Not demonstrated | Current deterministic serialisation is narrower than independent runtime identity equivalence. |
| PostgreSQL/DBOS storage replacement | Conditional proposal | Benchmarks and migration/replay evidence required; not a prerequisite for current file-backed service. |
| Jev-Mem | Deferred | No implementation or adoption is claimed. |
| Paid model comparison | Not authorised | Included allowance and zero paid-credit budget apply; unattended work is not budget permission. |

## Build, release and plan accountability

| Feature | Status | Evidence and remaining work |
| --- | --- | --- |
| Locked Python/Node dependency contracts and SBOM | Implemented | Lockfiles, dependency policy and 141-component SBOM; advisories and exact deployed exposure remain separate. |
| Deterministic app and component site build | Implemented | [Build method](okf-build-and-publication-methodology.md); current site retains a finite hosting-size budget. |
| Impact-routed checks and fail-closed aggregate gate | Implemented | `.github/workflows/okf-explorer-ci.yml`; explicitly report skipped external integrations and failed planes. |
| Chrome/Firefox/WebKit terminal browser suite | Implemented | Full-suite outcome applies to its exact candidate; an intermittent help-layout failure remains a known regression risk until evidenced closed. |
| Foundry adversarial fixtures | Implemented | Negative controls complement source, semantic and runtime checks; fixtures are not independent producer acceptance. |
| Candidate manifests, promotion envelopes and deployment verification | Implemented mechanism | [Publication methodology](okf-build-and-publication-methodology.md); merge, deployment and acceptance are separate gates. |
| PWA/static site publication | Implemented and checked for stated revision | The main/Pages checks for the stated revision above passed both real-Chrome journeys. Other revisions and broader human/domain acceptance need their own evidence. |
| Whole-implementation P0 source review | Completed historical baseline | [23 October review](p0-implementation-review-2026-10-23.md); later changes need impact review, not inherited blanket approval. |
| Independent specialist/security review | Scoped/acceptance outstanding | No broad certification is established by the source review or green CI. |
| External dependency PRs | #203 merged; #195 blocked | Hono 4.13.18 passed required PR/full-main gates. Playwright retains the upstream Firefox blocker, focused probe and full three-engine merge condition; see REM-04/REM-10. |

The maintained architecture plan remains the delivery coordinator: A has a completed historical source-review baseline; B–F retain the individual acceptance criteria recorded above. This inventory does not mark them complete merely because related modules now exist. The YAML-LD migration plan, facet experiments, learner-hub specification, search/filtering design, geospatial persona/design notes, GOV CKAN journey design, postmortems and dated code reviews are retained design/history inputs. Their implemented portions are represented above; any remaining suggestion without current acceptance evidence is proposed or unverified, not an undisclosed completed feature. Domain postmortem registers retain their own case-by-case decisions.

## Impact of the standards consolidation

Public-source AI/architecture notes, a private evidence archive and a public learning supplement require producer/export/publication checks. They do not require a breaking change to OKF 0.2, Bundle Wiki v1, the context identity contract or the existing pinned Reader. Private archive material must never enter public artifacts. Public learning companion pages are distinct from the frozen tool-indexed evidence graph.

The implemented optional v2 datetime/spatial contract and CSV preview span separate schemas/validators, UI/parser limits, negative fixtures, browser journeys and publication docs. REM-07 records their remaining conformance and adoption boundaries. Preserve RC.1, historical trial hashes and producer pins; introduce any changed interpretation through a distinct versioned route and an explicit migration decision. WCC acquisitions, probes, county coverage and remediation remain parked; frozen offline regressions do not reopen that investigation.

Historical local checks ran on the 14 November implementation baseline. The check record preserves the first-run Chrome failure, affected rerun, WebKit success, conditional skips and Firefox startup blocker. That interrupted local run is not a clean three-engine pass; later Linux main CI is separately recorded above.

## Reviewed plan register

This table accounts for every tracked Markdown filename matching plan, roadmap, backlog, specification, design or implementation at this review. Filename matches that describe subject matter are separated from delivery plans. Imported/source recommendations are content, not instructions to execute.

| Plan or design record | Current disposition | Remaining boundary |
| --- | --- | --- |
| [Architecture and implementation plan](architecture-and-implementation-plan.md) | Maintained coordinator. A's historical source-review baseline is complete; B–F remain individually assessed acceptance programmes. | Domain pilot, client-visible completeness, representative-user/human accessibility evidence, second-domain scale and comparative rendering remain open as listed above. |
| [P0 implementation review](p0-implementation-review-2026-10-23.md) | Completed historical source review and recorded corrections. | Later changes need impact review; no blanket current security, domain or deployment certification. |
| [YAML-LD default semantic-layer plan](yaml-ld-default-semantic-layer-implementation-plan.md) | Reports local implementation across nine reviewed repositories on 9 August 2026. The current Reader/build contracts retain the implemented semantic-to-runtime boundary. | Historical completion does not verify today's whole estate, release/deployment or public adoption. The estate registry still has separately recorded backlog entries. |
| [Interaction implementation](explorer-interaction-implementation.md) | Implemented state, navigation, loading and presentation modules with scoped test evidence. | General usability and human assistive-technology acceptance remain separate; the earlier help PageDown failure has no established cause. |
| [Learner-hub specification](learner-hub-specification-2026-08-17.md) | Hub, `/explore/`, curriculum and bundle-bearing root redirects exist. | The spec's broader promise for standalone view/query/filter/fragment legacy links needs an explicit compatibility decision and acceptance evidence; the inspected root code redirects on `bundle`. Participant outcomes are not established by page tests. |
| [Static search/filtering design](search-filtering-design.md) | Static deterministic lexical search, inspectable filters/facets and bounded evidence selection are implemented. | Hosted/vector retrieval and model planning passages are research background, not a missing promised Vespa/LLM implementation. Benchmark/source coverage and human task acceptance retain their own scopes. |
| [BEP implementation status](bep-implementation-status.md) | Production context assembly/delivery exists; reconstructed schema and storage research remain separate. | No accepted `context_id` to research `package_id` migration, cross-runtime canonicalisation, PostgreSQL/DBOS replacement, restricted-data assurance or general domain-answer acceptance. Jev-Mem remains deferred. |
| [Recommendations and roadmap](../document/themes/recommendations-roadmap.md) | Authored conceptual recommendations, not an Explorer product delivery commitment. | Execution/control planes, OPA/workload-identity deployment and institutional capability must not be inferred from glossary pages or the read-only Reader. |
| [Control plane](../stack/control-plane.md) and [land, housing and planning](../legislation/topics/land-housing-and-planning.md) | Subject-matter notes matched by their filenames, not implementation plans. | Their descriptions do not create an autonomous delivery task or operational authority. |

The profile rollout, provider-datapack, map/persona, Project Studio, consumer/Voice, controlled-language and domain postmortem records are also represented in the feature rows above even where their filenames do not contain these terms. Their remaining acceptance criteria are retained, rather than silently treated as complete.

The historical candidate integration at `5460ef56` passed 946 app and 595 Python tests, the deterministic 53-material app build, SBOM and the full registered Chrome/WebKit terminal browser run (370 UI passes, ten external-corpus skips; 52 Foundry passes). The standalone source-bound producer `.mjs` integration needs `DWP_PASSAGE_REVIEW_DIR` and is not selected by that registered runner: its two additional missing-input skips are explicit. The site validated 417 pages and 10,391 links. Earlier baseline records remain historical; exact-head CI and independent acceptance remain separate.

The [WebKit facet retry record](validation/facet-touch-retry-2026-11-14.json) retains another observed intermittent case: the superseded 2a8fdc8 CI expected ten expanded values and initially saw zero, then passed on retry. Twenty isolated repetitions passed on unchanged facet code; cause unresolved. No original browser trace artifact was listed. The old run was cancelled and is not an all-engine CI pass. This is separate from the earlier help-scroll issue.

## Merge history — 15 November 2026

PRs #208 and #209 merged after green checks; the squash reconciliation preserved the complete reviewed file tree. Typed datetime/spatial validation and `/inspect-data/` are implemented on main as optional experimental v2, with no automatic producer migration or stable-profile adoption. Manual CI now explicitly requests every declared plane, fixture and job with `--full`; an empty diff must not turn main assurance into an empty selection. PR routing and frozen profile populations are unchanged. The listed external-input skips, standalone source-bound integration, local Firefox startup and help/facet observations remain open, alongside independent analyst/accessibility/domain acceptance.

## Dependency follow-up — 15 November 2026

Hono 4.13.18 updates the remote service lock resolution in PR #203; the prior
lockstep failure is corrected by accompanying service/top-level docs and the
changelog. Source-bound service tests can run against the existing immutable
DWP Git objects without network acquisition. Worker deployment and frozen
source/engine pairs remain separate. Exact-head PR and final-main CI outcomes
remain in GitHub rather than being inferred from a lockfile edit.

PR #195 still awaits a fixed stable Playwright browser: the latest 1.65.1
Firefox 1572 crashes in both cross-world ARIA cases on the fresh focused probe.
See the [dependency review](dependency-maintenance.md) and its complete receipt.
This upstream blocker is separate from main's local Firefox startup problem,
help/facet intermittency, external-input skips and independent acceptance.
WCC live work remains parked.
