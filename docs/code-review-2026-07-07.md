# Code Review — ai-infrastructure-wiki

**Date:** 2026-07-07 · **Scope:** full repository, with deep dives on the OKF Explorer implementations, the Python build/validation tooling, and the UK Government APIs OKF exemplar assessed against its aims (`sources/UK-Government-API-OKF.md`) and the [OKF v0.1 spec](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md).

> **Current status:** this report is preserved as the original review record.
> Its findings and completion plan have been superseded by
> [code-review-2026-07-08.md](code-review-2026-07-08.md) and later merged
> work on `main`. Do not use the quantified gaps in this file as the current
> state of the UK Government APIs OKF pack without rechecking the generated
> descriptor and `docs/code-review-2026-07-08.md`.

**Method:** three parallel review agents — a Sonnet agent on `scripts/` + `tests/` + CI, a Sonnet agent on `apps/okf-explorer/` + `explorer/` + `viewer.html`, and a Fable agent measuring `uk-government-apis/` against the aims document (computing coverage statistics from the actual data rather than sampling). Findings were then verified by the orchestrator and safe fixes applied directly. All quantitative claims below were re-verified against the repository.

## Summary

The codebase is in better shape than most projects of this age: the Svelte Explorer has zero `{@html}` usage, a real URL-scheme allowlist applied at most render sites, request-id guards on search, bounded DOM rendering against 58k-record corpora, and stdlib-only deterministic Python builders with `--check` drift detection. The review nevertheless found two critical XSS paths in the legacy/static viewers, a cluster of missing URL-scheme guards, a hard crash on Python 3.10, no CI coverage at all for the highest-value build script, and — in the exemplar data itself — ~106 inherited credential parameters stored in harvested URLs despite the aims document's categorical no-secrets rule.

**19 issues were fixed in this review** (all Critical/High items and most Mediums). The remaining work — chiefly regenerating the exemplar with secret redaction, adding CI coverage, and closing the gap between the exemplar and its aims — is laid out in the completion plan at the end.

> **Post-review update (2026-07-08):** every Open finding below except the component-test gap has since been fixed and committed — see §7 for the fix-session record and the reduced outstanding list.

Verdict on the UK Government APIs OKF exemplar: **a strong large-corpus Explorer artefact that realises roughly a third of its stated ambition.** It is honest, well-provenanced and internally consistent, but it is not yet an OKF bundle in the spec's sense (no Markdown layer), its knowledge graph leaves the 244 flagship declared APIs isolated, contracts stand at zero, and edges carry none of the provenance/confidence the aims document mandates.

---

## 1. Findings

Severity: 🔴 Critical · 🟠 High · 🟡 Medium · ⚪ Low. Status **Fixed** = changed in this review; **Open** = in completion plan.

### 1.1 Explorer apps (Svelte `apps/okf-explorer/`, static `explorer/`, legacy `viewer.html`)

| # | Sev | File | Issue | Status |
|---|-----|------|-------|--------|
| E1 | 🔴 | `viewer.html` | `esc()` did not escape quotes, and `n.resource` was concatenated into an `href` attribute with **no escaping or scheme check**, then assigned via `innerHTML` — zero-click XSS from a crafted `resource` value in bundle data. | **Fixed** — `esc()` now escapes `"`/`'`; resource links are escaped and gated to `http(s)`, otherwise rendered as text. |
| E2 | 🔴 | `explorer/app.js` (`inlineMarkdown`) | Markdown links in record bodies accepted **any URI scheme** — `[click](javascript:…)` executed on click in the app served as the site's `index.html`. | **Fixed** — non-`http(s)`/`mailto:` external links now render as plain text; same guard added to the image branch. |
| E3 | 🟠 | `explorer/app.js` (`renderDetail`) | Inspector-panel Source/Resource fields put `node.source`/`node.resource` into `href` with quote-escaping only — same `javascript:` bypass, reachable for every node. | **Fixed** — gated through new `isHttpHref()`. |
| E4 | 🟠 | `+page.svelte` (Context panel) | `acronym_expansions[].source_url` and `context_links[].url` were the only 2 of ~9 anchor sites not gated by `isUrl()` — clickable `javascript:` links from bundle data. | **Fixed** — both wrapped with `isUrl()`, falling back to text. |
| E5 | 🟠 | `+page.svelte` (`loadSource`) | No request-id guard (unlike search): rapidly loading bundle A then B raced two async pipelines; the loser could overwrite the winner's state. Load buttons not disabled while loading. | **Fixed** — monotonic `loadRequest` counter with stale-checks after every await and a guarded `finally`. |
| E6 | 🟡 | `+page.svelte` | `largeSearchClient.init()` sat inside the corpus try/catch — a 404 on the search shard discarded an otherwise fully-loaded corpus. | **Fixed** — search init isolated; failure degrades to "search unavailable" (console warning), corpus kept. |
| E7 | 🟡 | `fetch.ts`, worker, `explorer/app.js` | `?bundle=` accepted any scheme/host (browser-mediated SSRF/intranet probing); no fetch timeouts or size caps — a hanging or multi-GB attacker response stalled the UI or crashed the tab. | **Fixed** — https/same-origin enforcement + 20–30s timeouts (review), Content-Length caps at 64 MiB in all three fetch paths (fix session, `27ae4a7`). Streamed byte-count caps remain future hardening (R9). |
| E8 | 🟡 | `+page.svelte`, `explorer/app.js` | Unguarded `decodeURIComponent(location.hash…)` — a shared link ending `#%` threw `URIError` and aborted routing handlers. | **Fixed** — `safeDecodeHash()` in Svelte app (review); static app's `idFromHash` guarded in the fix session (`27ae4a7`). |
| E9 | 🟡 | `registry.ts`, `explorer/app.js` | Three unguarded `localStorage.setItem` writes — quota/private-mode errors surfaced as "bundle failed to load". | **Fixed** — try/catch on all three (reads were already defensive). |
| E10 | ⚪ | worker | A failed shard fetch left a rejected promise cached forever — search stayed broken until reload. | **Fixed** — failed fetches evicted from cache. |
| E11 | ⚪ | `largeCorpus.ts` | "Load full relationship index" hydrates every relationship row (~2M for CKAN-scale corpora) into two full-size Maps with no cap/streaming. UI warns, but no hard limit. | **Fixed** (fix session, `27ae4a7`) — capped at 300,000 rows; `loadRelationships` returns `{ relationships, truncated }` and the Links view shows a truncation notice. |

### 1.2 Python tooling (`scripts/`, `tests/`, CI)

| # | Sev | File | Issue | Status |
|---|-----|------|-------|--------|
| P1 | 🟠 | `build_uk_government_api_okf.py:18` | `from datetime import UTC` requires Python ≥3.11; crashed on 3.10 (reproduced — also broke the test suite at import time). No Python version pinned anywhere. | **Fixed** — `timezone.utc` alias (review); `actions/setup-python` pinned to 3.12 in both workflows (fix session, `f3faf49`). |
| P2 | 🟠 | CI workflows | `build_uk_government_api_okf.py` is never invoked by CI — not even `--check` with fixtures. The ~236 committed data files can drift indefinitely with no signal. | **Fixed** (fix session, `f3faf49`) — CI runs the generator end to end against the committed fixtures (catalogue CSV, CKAN, OS, ONS) into a temp directory. |
| P3 | 🟡 | `plain_text()` | Tag-stripping ran **before** `html.unescape()`, so entity-encoded markup (`&lt;img onerror=…&gt;`) was resurrected into literal HTML in generated JSON; `title` had no sanitization at all; literal `\n` text sequences from the upstream CSV survived into shipped notes. | **Fixed** — unescape-then-strip, titles routed through `plain_text(…, 300)`, literal `\n`/`\r\n` normalised, whitespace collapsed. Takes effect on next regeneration. |
| P4 | 🟡 | network layer | Zero retry/error handling on 3 of 4 remote sources — one transient timeout aborted the whole multi-source build. | **Fixed** — `request_bytes()` now retries transient failures (429/5xx/URLError/timeout) ×3 with exponential backoff; non-transient HTTP errors still raise immediately. |
| P5 | 🟡 | `rows_from_csv()` | Ragged CSV rows (extra cells → list under `None` key) crashed the harvest with `AttributeError`. | **Fixed** — non-string keys/cells filtered. |
| P6 | 🟡 | `load_ckan_packages()` | No `sort` parameter — CKAN relevance ordering isn't byte-stable across runs, undermining `--check` determinism. | **Fixed** — pinned `sort=name asc`. |
| P7 | 🟡 | harvest layer | No URL-scheme validation on harvested `url`/`documentation`/`href` values before writing them into bundle JSON (a malicious data.gov.uk publisher could plant `javascript:` URLs; front-ends now guard, but the bundle itself should too). | **Fixed** (fix session, `fe8fe2f`) — `safe_url()` applied at every adapter ingestion boundary; drops counted in the new `warnings` block. |
| P8 | 🟡 | `check_okf.py` / corpus | Validation never covers `uk-government-apis/`; `REQUIRED_FIELDS` promotes 3 spec-*recommended* fields to mandatory (repo policy conflated with OKF §9 conformance); root/subdirectory `index.md` files carry frontmatter the spec disallows; `log.md` lacks the mandated `## YYYY-MM-DD` headings. | **Fixed** (fix session, `a5162c8`) — `log.md` conformed to §7; remaining deviations documented as intentional in `docs/okf-conformance.md`; scope comments added to both scripts. |
| P9 | ⚪ | `add_record()` | Silent record drop on slug collision across all four sources; endpoint-URL dedup scoped to CKAN adapter only; `generated_at` is content-derived (deliberate, but misleadingly named). | **Fixed** (fix session, `fe8fe2f`) — collisions warn to stderr and are counted; dedup centralised per `(record_type, canonical_url)`. `generated_at` rename deliberately declined (breaking for consumers) and documented instead. |
| P10 | ⚪ | tests | ~350 lines effectively untested: the whole I/O/CLI layer, the hand-rolled search-index builder (where P3 lived), no negative-path or injection-shaped fixtures, single-row CSV fixture. | **Partially fixed** (fix session) — Python suite 4→18 tests incl. injection-shaped fixtures; CI exercises `main()`/`write_files()`. Component tests for `+page.svelte`/`explorer/` still open (R8). |

### 1.3 What looks good

Worth keeping and building on: no `{@html}` anywhere in the Svelte app and consistent auto-escaped interpolation; `isHttpUrl` allowlisting at most anchor sites; request-id guards on search; 16-way batched chunk loading and aggressive `.slice()` caps keeping the DOM bounded; the service worker refusing cross-origin cache entries; stdlib-only deterministic builders with capped `--check` diffs; content-derived timestamps for reproducibility; genuine per-item fault tolerance in the OS crawler; and meaningful cross-cutting invariant tests. The exemplar's provenance discipline (per-record source URL, adapter, tier, confidence, CSV sha256) is exemplary.

---

## 2. UK Government APIs OKF — assessment against its aims

The aims (from `sources/UK-Government-API-OKF.md`, condensed): an exemplar OKF bundle for UK Government APIs carrying **maximum useful information, maximally crosslinked, enriched from relevant information available on the web**, with typed+provenanced relationships, five source tiers, canonical counts, scorecards, observed/declared/assured statuses, and an absolute no-secrets rule.

### 2.1 Measured profile (verified against the data)

42,543 records: 257 API Products (244 declared via GOV.UK API Catalogue + 13 provider-native from OS/ONS), 34,327 Data Access API Endpoints, 7,827 Data Products, 38 API Operations, 93 Schemas, 1 Provider Portal — plus 43,051 resources, 274 providers, and 282,870 relationships across 16 verbs. Canonical counts are present and consistent across descriptor, manifest, overview and analysis (`contracts: 0` — honest, but zero). Enrichment coverage is strong on identity/provenance (title, publisher, tags, provenance ≈100%; description 99%) and weak on the operational dimensions that matter most: licence 15.6%, detected access model for declared products 29.2% (all 41,817 CKAN records hardcoded `anonymous`), lifecycle beyond defaults 12.1% of products, contract links 6.6% of products (regex text-signals only).

### 2.2 Aims coverage

| Aim | Status | Evidence |
|-----|--------|----------|
| MVP 1 — Harvest GOV.UK API Catalogue → API Product | **Met** | 244 products, row-level provenance incl. CSV sha256 |
| MVP 2 — Provider-native harvest (OS, ONS) | **Met** | Recursive `api.os.uk` traversal; ONS datasets/topics/code-lists |
| MVP 3 — data.gov.uk API-likes as endpoints, not products | **Met** | 34,327 endpoints, separate tier, protocol classified, deduplicated |
| MVP 4 — Organisation normalisation | Partial | Slug/regex only; duplicate orgs persist (e.g. two hydrographic-office slugs; DCLG beside MHCLG) |
| MVP 5 — Classify visibility/access | Partial | Classifiers exist; 70.8% of declared products remain `unknown` |
| MVP 6 — Find contracts | **Mostly missing** | `contracts: 0`; 17 regex-indicated; `contract_discovery` tier declared but empty |
| MVP 7 — Right-card metadata | Met (largely) | Owner/support route beyond publisher missing |
| MVP 8 — Analysis overview with warnings | Partial | 18 scored facets, hierarchies, narrative present; **warnings block absent** |
| MVP 9 — Typed relationships | Partial | 16 verbs / 282,870 edges; ~4 of the 18 aim verbs; no service/standards edges |
| MVP 10 — Scorecard v0 | **Met** | Transparent 6-metric scorecard on 100% of records |
| MVP 11 — Static sample placeholders | **Missing** | No samples or `sample_policy` anywhere |
| MVP 12 — No credential storage; model requirements | Partial | `secret_values_stored: false` and no live calls; but no `credential_requirements` structure — and see the secrets finding below |
| Source tiers (5 defined) | Partial | 3 of 5 present in data |
| Canonical counts (7 defined) | **Met** | All present, all consistent |
| Edge-level provenance + confidence | **Missing** | Edges are bare `{source, target, kind}` triples |
| observed / declared / assured | Partial | observed/declared real and filterable; `assured` unrepresentable |
| Concept-type vocabulary (~30 types) | Partial | 6 emitted; no Version, Environment, Auth Scheme, Policy, Sample, MCP types |
| No-secrets rule ("not in URLs") | **Violated (inherited)** | ~96 `password=`, ~10 `token=`/`login=` params in harvested URLs across 18+ data files (e.g. `feeds.getmapping.com/…&login=…&password=…`) — inherited verbatim from data.gov.uk metadata, no redaction pass |
| Spec-conformant Markdown OKF bundle | **Missing** | Zero `.md` files in `uk-government-apis/`; every record's `concept_id` points at a `.md` file that doesn't exist |

### 2.3 Verdict

As a large-corpus Explorer artefact the exemplar is genuinely strong: honest counts, disciplined provenance, a real observed/declared distinction, and self-aware framing ("an observed public catalogue view, not an assurance register"). Roughly 7 of the 12 MVP steps are substantially delivered, and the descriptor/analysis layer fully honours the Explorer data contract in `docs/explorer-overview-context.md`.

Against "maximum useful information, maximally crosslinked, enriched" it realises perhaps a third of the ambition, and the shortfall is concentrated exactly where the aims document says the value is. Only 24.4% of edges connect records to records — and 99.7% of the real crosslinking is the mechanical CKAN endpoint↔data-product reciprocal pair. All 244 declared API products — the flagship tier — are graph-isolated from every other record. No edge carries evidence or confidence. The contract layer ("the executable domain truth" in the aims doc) is empty, auth is unknown for 71% of declared products, and web enrichment in practice means four official JSON/CSV feeds plus regex classifiers.

Two findings are definitional rather than incremental. First, the exemplar is not yet an OKF bundle under OKF v0.1 §9: it is an Explorer-specific JSON projection, with the Markdown layer (frontmatter, `index.md`, `log.md`, cross-links, citations) entirely unwritten — even though every record already carries the `concept_id` of the Markdown file it should become. Second, the corpus stores ~106 inherited credential parameters inside harvested URLs, breaching the aims document's categorical rule. Both are highly tractable: the first is a generator feature, the second a redaction pass — and surfacing inherited credentials as a *quality warning* would turn the violation into precisely the kind of insight this control-plane view exists to produce.

---

## 3. Changes made in this review

All changes are uncommitted in the working tree for your review (`git diff`). No generated corpus data was hand-edited, and nothing was committed.

**`scripts/build_uk_government_api_okf.py`** — Python 3.10 compatibility (`UTC = timezone.utc`); retry-with-backoff on all remote fetches; ragged-CSV guard; deterministic CKAN `sort=name asc`; `plain_text()` unescape-before-strip + literal `\n` normalisation + whitespace collapse; record titles sanitised via `plain_text(…, 300)`.

**`apps/okf-explorer/src/routes/+page.svelte`** — request-id race guard on `loadSource` with stale-checks after each await; https-or-same-origin enforcement on bundle URLs; search-index init isolated so its failure no longer discards a loaded corpus; `safeDecodeHash()` replacing three unguarded `decodeURIComponent` calls; `isUrl()` guards on the two unguarded Context-panel anchors.

**`apps/okf-explorer/src/lib/sources/fetch.ts` / `workers/largeSearch.worker.ts` / `lib/sources/registry.ts`** — 30s fetch timeouts; failed-fetch cache eviction in the worker; guarded `localStorage` write.

**`explorer/app.js`** — new `isHttpHref()`; scheme guards on markdown links, markdown images, and detail-panel Source/Resource; `validatedBundleUrl()` (https or same-origin) applied at both bundle-load entry points; 20s fetch timeout; two guarded `localStorage` writes.

**`viewer.html`** — `esc()` now escapes quotes; resource link escaped and scheme-gated (template JS only — `update_viewer.py --check` still passes).

**Consequence to note:** the generator fixes (P3, P6) intentionally change future generated output, so `build_uk_government_api_okf.py --check` will report drift against the committed corpus until the data is regenerated (regeneration is P0 in the plan below — it should be combined with the secrets-redaction pass so the corpus is only rebuilt once).

## 4. Verification

| Check | Result |
|-------|--------|
| `python3 -m py_compile scripts/*.py` | Pass |
| `pytest tests/ -q` on Python 3.10 | **4/4 pass** (previously crashed at import) |
| `scripts/check_okf.py` | Pass — 152 nodes, 576 edges |
| `scripts/build_okf_bundle.py --check` | Pass (corpus unchanged) |
| `scripts/update_viewer.py --check` | Pass after viewer.html edits (data blob untouched) |
| `apps/okf-explorer` vitest | **27/27 pass** (fresh install, edited source) |
| `apps/okf-explorer` svelte-check | **0 errors, 0 warnings** |
| `apps/okf-explorer` production build (`vite build`) | Pass — static site written |
| `node --check` on `explorer/app.js` and `viewer.html` script | Pass |

Diff footprint: 7 files, +126/−36 lines, all uncommitted for review.

## 5. Completion plan

> **Superseded by §7.3 (2026-07-08).** P0, P1 and most of P2/P3 below were completed in the fix session; this section is preserved as the original review-time plan. For the current state and the exact remaining work, read §7.3.

**P0 — before next publish (hours):**
Implement a secrets-redaction pass in the generator (strip/flag `password=`, `token=`, `login=`, `key=` query params; record each redaction as evidence and count them in a new `warnings` block), then regenerate `uk-government-apis/` once to pick up redaction + the P3/P6 generator fixes together. Add harvest-time URL-scheme validation (P7) in the same regeneration.

**P1 — CI and validation hardening (about a day):**
Pin Python ≥3.11 (or keep the 3.10 shim) via `actions/setup-python` in both workflows; add a CI step running `build_uk_government_api_okf.py` against the committed fixtures with a small expected-output snapshot; extend `check_okf.py` to cover (or explicitly exclude, documented) `uk-government-apis/`; resolve the `index.md` frontmatter / `log.md` heading deviations from OKF §6/§7 — either conform or document the intentional deviation; add unit tests for the search-index builder, the I/O/CLI layer, and injection-shaped fixtures (`---`, `<script>`, entities, `javascript:` URLs); add at least smoke-level component tests for `+page.svelte` href rendering and a test harness for `explorer/`.

**P2 — exemplar toward its aims (days, highest knowledge value):**
Emit the Markdown OKF bundle the `concept_id`s already promise (`api-records/*.md`, `organisations/*.md`, `index.md`, `log.md` with frontmatter from record JSON) — this single step makes the exemplar spec-conformant and is mostly templating; attach `evidence_type`/`confidence`/`observed_at`/`source` to edges (data already exists on records); crosslink the 244 declared products to CKAN/OS/ONS records by endpoint host + publisher; add the warnings block (`missing_contract`, `unknown_access`, `api_key_only`, `missing_licence`, credential-in-url) and a quality-band facet; reconcile organisations against the GOV.UK register.

**P3 — enrichment depth (a week+):**
Implement the `contract_discovery` adapter (fetch OGC GetCapabilities / ArcGIS JSON / SPARQL descriptions / indicated OpenAPI docs) and parse contracts into API Version / Operation records with `described_by`/`has_version`/`has_operation` edges; implement the `provider_portal_allowlist` tier to harvest auth/access from developer portals; add static sample placeholders and `credential_requirements` modelling; add response-size caps to Explorer fetches and a capped/streamed relationship index (E11); make `assured` representable.

## 6. Housekeeping notes

Untracked in the working tree (pre-existing, left alone): `CLAUDE.md`, two `okf-ckan-*.png` screenshots, `.DS_Store`. The descriptor's `entrypoints.viewer: "../next/"` only resolves on the published site when the Svelte build has been copied to `_site/next/` — worth a README note. `generated_at` is content-derived (deliberate for determinism) and would be clearer named `content_observed_through`.

## 7. Post-review fix session (completed 2026-07-08)

Every finding in §1 is now fixed (P10 partially — see R8) in eleven feature/fix commits, each crediting this review. Solutions were designed by Claude Fable 5; the two larger implementation sets (`fe8fe2f`, `27ae4a7`) were built by Claude Sonnet agents under its direction and independently re-verified before committing. Commits are local and unpushed.

### 7.1 Commit record

| Commit | Type | Change | Findings closed |
|--------|------|--------|-----------------|
| `25cde4b` | fix | Legacy viewer: quote-escaping `esc()`, scheme-gated resource links | E1 |
| `1765fc4` | fix | Static explorer: scheme guards, bundle-URL validation, fetch timeout, storage guards | E2, E3, E7 (part), E9 |
| `2ac62b4` | fix | Svelte explorer: href guards, load race, search-init isolation, https-only, timeouts, hash decoding | E4, E5, E6, E7 (part), E8 (part), E9, E10 |
| `63f7f94` | fix | Generator: Py3.10 compat, network retries, ragged CSV, deterministic sort, text sanitisation | P1 (part), P3, P4, P5, P6 |
| `f26fa6d` | docs | This review report | — |
| `fe8fe2f` | feat | `redact_url()`/`safe_url()` at all adapter boundaries, warnings block, collision logging, per-type dedup; 13 new tests | P7, P9, no-secrets aim (generator side) |
| `27ae4a7` | fix | Content-Length caps (64 MiB) ×3, relationship cap (300k, truncation UI), static-app hash guard; tests → 32 | E7, E8, E11 |
| `f3faf49` | ci | Fixture-based end-to-end generator run; Python 3.12 pinned in both workflows | P1, P2 |
| `a5162c8` | docs | `log.md` → OKF §7 date headings; `docs/okf-conformance.md`; bundle+viewer resynced | P8 |
| `67bfa61` | feat | Edge provenance: `evidence_type`/`confidence`/`observed_at` on every relationship | edge-provenance aim (generator side) |
| `ab36211` | docs | Fix-session record in this report | — |

### 7.2 Verification at close

pytest **18/18** (Python 3.10; was 4 crashing at import), vitest **32/32**, svelte-check **0 errors / 0 warnings**, production `vite build` passing, `node --check` clean on both static apps, `check_okf` + bundle + viewer `--check` all green, workflow YAML validated, worktree clean. A fixture-based end-to-end generation produced zero `password=` occurrences with correct warning counters (`credential_parameters_redacted: 3`, `unsafe_urls_dropped: 1`, `duplicate_endpoints_skipped: 1` on the test fixtures).

Housekeeping from the sandboxed session: empty `*.stale*`/`tmp_obj_*`/`probe*` files were left under `.git/` (the sandbox cannot delete files). Clean with:
`find .git \( -name "*.stale*" -o -name "tmp_obj_*" -o -name "probe*" \) -delete`

### 7.3 Exactly what remains

Generator-side fixes (redaction, URL validation, sanitised text, edge provenance, warnings) only reach the *published* corpus when it is regenerated — R1 is therefore the gate for everything data-facing.

**R1 — Regenerate and republish `uk-government-apis/`.** Run `python3 scripts/build_uk_government_api_okf.py` on a network-connected machine (live harvest: GOV.UK catalogue, ~35 paginated CKAN calls, OS crawl, ONS; expect minutes), review the diff, commit, push. Until this runs, the committed corpus still contains the ~106 inherited credential parameters, unsanitised titles/notes, and provenance-less edges. Effort: minutes of runtime + diff review. No code changes needed.

**R2 — Emit the Markdown OKF bundle** (§2.3's definitional gap). Generator feature writing the files every record's `concept_id` already references: `api-records/<slug>.md` with frontmatter (`type`, `title`, `description`, `resource`, `tags`, `timestamp` from record JSON), `organisations/<slug>.md`, plus `index.md`/`log.md`. Design decision required first: emit for all 42,543 records (repo-size cost) or for API Products/Providers/Operations/Schemas only (~700 files) with endpoint `concept_id`s adjusted accordingly — recommended. Offline-testable with fixtures. Effort: ~1–2 days. Makes the exemplar OKF v0.1 §9-conformant.

**R3 — Crosslink the 244 declared API products** (currently graph-isolated). Match catalogue products to CKAN data products/endpoints and OS/ONS records by endpoint host + publisher slug; emit `exposes_data_product`/`supports_service` edges with the now-standard edge provenance. Offline-testable. Effort: ~0.5–1 day. Depends on R1 to reach published data.

**R4 — Contract discovery** (`contracts: 0` today). New `contract_discovery` adapter fetching OGC GetCapabilities, ArcGIS service JSON, SPARQL service descriptions and the 6 indicated OpenAPI URLs; emit Contract records + `described_by` edges; then parse contracts into API Version/Operation records (`has_version`/`has_operation`). Network-dependent. Effort: days. The `provider_portal_allowlist` tier (developer-portal auth harvesting, raising access-model coverage above 29%) belongs to the same phase.

**R5 — Organisation reconciliation.** Normalise the 274 provider slugs against the GOV.UK organisations register (canonical IDs), merging duplicates (e.g. the two hydrographic-office slugs; defunct DCLG → MHCLG). Offline-testable with a cached register snapshot. Effort: ~0.5 day.

**R6 — Missing facets and statuses.** Add a quality-band facet (bucket the existing `quality.overall`), plus data-classification, environment and relationship-density facets; make the `assured` status representable in the confidence vocabulary so all three of observed/declared/assured can be filtered. Offline, mostly additive to the analysis builder. Effort: ~0.5 day.

**R7 — Samples and credential requirements** (MVP 11–12). Emit static `sample_policy` placeholders per operation and a `credential_requirements` structure (references only — never secret values), completing the two unfinished MVP steps. Offline. Effort: ~0.5–1 day; grows once R4 produces real operations.

**R8 — Front-end component tests** (remaining P10 gap). Add `@testing-library/svelte` coverage for `+page.svelte` href rendering and the bundle-switch race, and a test harness for the vanilla `explorer/` app (no runner today). Wire both into `okf-explorer-ci.yml`. Offline. Effort: ~1 day.

**R9 — Streamed response-size caps** (E7 hardening beyond Content-Length). The 64 MiB cap trusts the `Content-Length` header; a chunked response without one is unbounded. Add a byte-counting reader that aborts mid-stream past the cap. Offline. Effort: ~0.5 day. Low priority.

#### Suggested order

R1 first (unblocks all data-facing work and clears the committed secrets), then R2 and R3 for the biggest knowledge-value gains, then R4 (the largest, network-dependent effort), with R5–R9 fitting alongside as independent, mostly-offline improvements.

| Item | Effort | Network needed | Blocks / depends on |
|------|--------|----------------|---------------------|
| R1 Regenerate corpus | Minutes + review | Yes | Gates R3; publishes all generator fixes |
| R2 Markdown OKF bundle | 1–2 days | No | Makes exemplar spec-conformant |
| R3 Crosslink declared products | 0.5–1 day | No (test), R1 (publish) | — |
| R4 Contract discovery + operations | Days | Yes | Feeds R7 |
| R5 Org reconciliation | 0.5 day | Cached snapshot | — |
| R6 Facets + `assured` status | 0.5 day | No | — |
| R7 Samples + credential reqs | 0.5–1 day | No | Richer after R4 |
| R8 Front-end component tests | 1 day | No | — |
| R9 Streamed size caps | 0.5 day | No | — |
