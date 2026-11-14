# Feature and plan status — 14 November 2026

Reviewed implementation baseline: `5755359efd54b14a356dbff67d6082db1b195a91`, fetched from GitHub main on 14 November 2026. App release `0.8.1` and Analytical Data `1.0.0-rc.1` are independent versions. This inventory records code/contract maturity separately from domain acceptance, host compatibility, deployment and source completeness. The latest check results are in the [check record](feature-review-2026-11-14.json).

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
| Small bundle loading and bounded YAML-LD parsing | Implemented | `src/lib/sources/smallBundle.ts`; arbitrary remote contexts are not executed. |
| Large sharded corpus loading | Implemented | `src/lib/sources/largeCorpus.ts`; resource limits and missing shards remain visible. |
| Digest-bound relationship runtime and route loading | Implemented | [Rich graph architecture](okf-bundle-wiki-architecture-2026-07-11.md); historical/rejected planes remain separate. |
| Resource URL, origin, redirect and integrity controls | Implemented | [Source constraints](source-constraint-ledger.md); access permission is not inferred from availability. |
| Search and static search indexes | Implemented | [Search/filter manual](static-search-filtering-manual.md); source coverage bounds results. |
| Facets, explicit missing values and selection state | Implemented | [Facet gates](foundry-facets.md); producer-specific distinctions need actual output/Reader evidence. |
| Record cards, detail, graph and relationship inspection | Implemented | [Interaction implementation](explorer-interaction-implementation.md); presentation grouping is not identity. |
| Timeline and date-role presentation | Implemented | `src/lib/viewer/smallTimeline.ts`, `largeTimeline.ts`; does not supply tabular datetime typing. |
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
| Frozen Warwickshire and NDL trial | Retained evidence; follow-up parked | [Trial](analytical-data-trial-2026-11-11.md); preserve compatibility gaps and original hashes. |
| Frozen Defra API pagination/time/spatial trial | Retained evidence | [Live-trial report](analytical-live-trial-2026-11-11.md); observation is not general API or county-coverage certification. |
| Data curation and Defra learning | Local assessment | [Curation review](analytical-data-curation-review-2026-11-11.md); source obligations need scoped adoption. |
| Typed datetime validation | Proposed distinct version | RC.1 does not supply complete typed datetime semantics; retain literals/timezones and freeze compatibility vectors before adoption. |
| Richer spatial validation | Proposed distinct version | Need explicit CRS/axes/units/extent rules; no inferred reprojection or geometry completeness. |
| In-browser analytical CSV previews | Proposed | Existing geospatial previews are narrower; bounded, local/read-only CSV inspection and its tests remain to implement. |
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
| PWA/static site publication | Implemented mechanism | No new deployment is asserted by this review. Verify the exact HTTPS identity and human journey before publishing a current URL. |
| Whole-implementation P0 source review | Completed historical baseline | [23 October review](p0-implementation-review-2026-10-23.md); later changes need impact review, not inherited blanket approval. |
| Independent specialist/security review | Scoped/acceptance outstanding | No broad certification is established by the source review or green CI. |
| External dependency PRs | Separate review queue | PRs #195 and #203 were open at review; their failures do not become passing main evidence. Do not auto-merge them through this consolidation. |

The maintained architecture plan remains the delivery coordinator: A has a completed historical source-review baseline; B–F retain the individual acceptance criteria recorded above. This inventory does not mark them complete merely because related modules now exist. The YAML-LD migration plan, facet experiments, learner-hub specification, search/filtering design, geospatial persona/design notes, GOV CKAN journey design, postmortems and dated code reviews are retained design/history inputs. Their implemented portions are represented above; any remaining suggestion without current acceptance evidence is proposed or unverified, not an undisclosed completed feature. Domain postmortem registers retain their own case-by-case decisions.

## Impact of the standards consolidation

Public-source AI/architecture notes, a private evidence archive and a public learning supplement require producer/export/publication checks. They do not require a breaking change to OKF 0.2, Bundle Wiki v1, the context identity contract or the existing pinned Reader. Private archive material must never enter public artifacts. Public learning companion pages are distinct from the frozen tool-indexed evidence graph.

Typed datetime, spatial contract changes and a CSV preview would affect optional profile schemas/validators, UI/parser limits, negative fixtures, browser journeys and publication docs. Preserve RC.1, historical trial hashes and producer pins; introduce any changed interpretation through a distinct versioned route and an explicit migration decision. WCC acquisitions, probes, county coverage and remediation remain parked; frozen offline regressions do not reopen that investigation.

Local checks ran on the implementation baseline above. The check record preserves the first-run Chrome failure, affected rerun, WebKit success, conditional skips and Firefox startup blocker. This is not a clean three-engine pass.
