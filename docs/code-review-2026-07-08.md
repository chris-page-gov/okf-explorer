# Code Review Follow-up — ai-infrastructure-wiki

**Date:** 2026-07-08
**Scope:** review of `docs/code-review-2026-07-07.md`, the local fix-session commits described in that document, and the remaining work required to reach a clean, publishable state.

## Executive Summary

`docs/code-review-2026-07-07.md` is useful and mostly accurate as a combined review report plus implementation log. It correctly identifies the most important issue: the published UK Government APIs corpus still contains inherited credential-like query parameters even though the aims document forbids stored secret values. It also correctly records that Claude Fable/Sonnet implemented generator-side and Explorer-side fixes for most of the code defects.

The important correction is that the fix session was not complete from a publication perspective. The code had been fixed locally, but the generated `uk-government-apis/` corpus had not been regenerated with the fixed generator. Therefore the repository still contained the credential-bearing URLs in the committed generated data, and the public Pages deployment from `origin/main` was still stale. Completion had to be treated as a gated publication task, not a documentation cleanup.

> **Current status after merge:** this follow-up is now a historical completion
> report plus current-state checkpoint. The completion branch was merged, and
> later Explorer work on `main` added facet/search/graph/timeline improvements
> and throttled large-corpus shard hydration to reduce transient GitHub Pages
> 503s. Current local `main` is synced to `origin/main` at `ae7879bd`
> (`Throttle large-corpus shard hydration`).

Review-time local state:

- At the start of this follow-up, local `main` was **12 commits ahead of
  `origin/main`** and the generated corpus had not yet been republished.
- That review-time state is no longer current. The remediation and subsequent
  Explorer fixes are now merged to `main`.
- The current repository should be checked with `git status --short --branch`
  before acting on any dated branch-status statement below.

Implementation update:

- The branch `codex/complete-code-review-fixes` now carries this completion work.
- The live UK Government APIs corpus has been regenerated with redaction, safety checks, derived records and the wider exemplar improvements.
- Current generated counts are 244 declared API products, 13 provider-native API products, 34,327 data access endpoints, 7,827 data products, 2,994 contracts/capability documents, 38 operations, 93 schemas, 274 publishers and 302,683 relationships.
- A structured scan of generated JSON found zero credential-like URL query parameters across 360,584 generated URLs.
- The generator now emits Markdown OKF files for selected record classes: 3,383 `api-records/*.md`, 274 `organisations/*.md`, plus `index.md` and `log.md`.

## Review of the 2026-07-07 Report

### What It Gets Right

The report correctly separates three layers that are easy to conflate:

1. **Explorer security defects** in Svelte, the static explorer, and the legacy viewer.
2. **Generator defects** around URL safety, redaction, deterministic harvests, text sanitisation, and relationship provenance.
3. **Exemplar completeness gaps** around Markdown OKF output, declared-product crosslinks, contract discovery, organisation reconciliation, samples, and credential modelling.

It also correctly classifies the inherited credential URLs as a real no-secrets violation, not merely an agent false positive. At review time, a fresh scan of the then-current generated corpus found:

```text
unique_urls_with_credential_params: 54
param_occurrences:
  access_token: 4
  login: 192
  password: 192
  token: 20
```

Those occurrence counts are inflated by repeated representations in generated shards, but the underlying issue is real. The exact numbers vary depending on whether the scan counts unique URLs, fields, generated shards, or individual query parameters.

The report also correctly records that fixture generation with the fixed generator redacts credentials and surfaces counters. A local fixture run produced no `password=`, `token=`, `access_token=`, or `login=` URL matches and reported:

```json
{
  "credential_parameters_redacted": 3,
  "duplicate_endpoints_skipped": 1,
  "duplicate_slugs_dropped": 0,
  "unsafe_urls_dropped": 1
}
```

### What Was Stale or Too Optimistic

The report's section 7 says every Open finding except the component-test gap has been fixed. At review time, that was accurate only for code paths and fixture output. It was not yet true for the checked-in generated corpus or the public URL.

The report marks R1 as "minutes + review." In practice R1 was the highest-risk gate because it was the step that removed credential-bearing URLs from the committed and published bundle. It had to be promoted from a remaining task to a release blocker.

The report also says the worktree was clean and `build_site.py` passed at close. In this local environment, the repository had ignored `.DS_Store` files in paths copied into `_site`, so `build_site.py` failed until those files were removed. This was not a code regression, but it was a real local pre-flight requirement.

Finally, the report records the fix commits as local and unpushed. That remained true relative to `origin/main`; the completion plan therefore needed a branch/PR from the local fixed state rather than assuming the fixes were already on GitHub.

## Pre-implementation Verification Snapshot

Commands run on 2026-07-08:

| Check | Result |
|-------|--------|
| `python3 -m unittest discover -s tests` | Pass, 18 tests |
| `python3 scripts/build_okf_bundle.py --check` | Pass |
| `python3 scripts/update_viewer.py --check` | Pass |
| `python3 scripts/check_okf.py` | Pass |
| `pnpm check` in `apps/okf-explorer` | Pass, 0 errors / 0 warnings |
| `pnpm test` in `apps/okf-explorer` | Pass, 32 tests |
| `pnpm build` in `apps/okf-explorer` | Pass |
| Fixture UK API generation | Pass; redaction warnings emitted |
| `python3 scripts/build_site.py` | Fails locally on ignored `.DS_Store` files |
| Current `uk-government-apis/` credential scan | Fails; stale generated corpus still contains credential-bearing URLs |

The CI workflow added by the fix session is directionally correct: it pins Python 3.12, runs Svelte validation, runs Python unit tests, exercises fixture-based UK API generation into `$RUNNER_TEMP`, and builds the static site. GitHub CI should not see local `.DS_Store` files, but the local pre-flight should clean them so the developer check suite matches CI.

## Completion Plan to Pass All Checks

### Phase 0 — Stabilise the Branch

Create a real feature branch from the local fixed `main` state before making any more changes:

```sh
git checkout -B codex/complete-code-review-fixes
```

Do not push local `main` directly. The branch should contain the 12 existing local fix commits plus the final corpus regeneration commit and this report.

### Phase 1 — Clean Local Build Hygiene

Remove ignored Finder metadata before running publication checks:

```sh
find . -name .DS_Store -delete
```

This is required because `scripts/build_site.py` intentionally rejects forbidden files after copying public trees into `_site/`. The files are ignored by Git, but they still affect the local site build.

### Phase 2 — Regenerate the UK Government APIs Corpus

Run the live generator with the fixed redaction and provenance logic:

```sh
python3 scripts/build_uk_government_api_okf.py
```

This is the release-blocking step. It should update `uk-government-apis/` so that:

- credential-bearing query parameters are removed from persisted URLs;
- data-hygiene warnings appear in overview/analysis outputs;
- unsafe harvested URLs are dropped;
- text sanitisation changes are reflected in generated records;
- generated relationships include edge provenance/confidence where supported by the new generator;
- `python3 scripts/build_uk_government_api_okf.py --check` passes afterward against live sources.

After regeneration, run a credential scan over `uk-government-apis/` and require zero matches for persisted URL query parameters named `password`, `login`, `token`, `access_token`, `api_key`, `apikey`, `client_secret`, `secret`, `sig`, `signature`, or keys ending in `key`.

### Phase 3 — Run the Full Local Gate

Run the checks in this order:

```sh
python3 -m unittest discover -s tests
python3 scripts/build_uk_government_api_okf.py --check
python3 scripts/build_okf_bundle.py --check
python3 scripts/update_viewer.py --check
python3 scripts/check_okf.py
cd apps/okf-explorer && pnpm check && pnpm test && pnpm build && cd ../..
python3 scripts/build_site.py
```

Expected outcome:

- all checks pass;
- `build_site.py` reports a completed `_site` build;
- no forbidden files are copied;
- no credential-bearing URLs remain in generated corpus JSON;
- `git status` shows only intended tracked changes plus known untracked local screenshots if left outside the commit.

### Phase 4 — Commit and PR

Commit the completion as a new commit on `codex/complete-code-review-fixes`. The commit should include:

- regenerated `uk-government-apis/` data;
- this `docs/code-review-2026-07-08.md` report;
- any necessary small correction if the regeneration reveals a deterministic check failure.

Push and open a PR. The PR description should explicitly state that it closes the security-publication gap by regenerating the corpus with credential redaction.

Required GitHub checks:

- `okf-explorer-ci` passes on the PR;
- review requirement satisfied;
- admin override should not be needed unless the policy state requires it.

### Phase 5 — Merge and Verify Publication

After merge, verify the Pages deployment and the stable URLs:

```sh
curl -fsSL https://chris-page-gov.github.io/okf-uk-government-apis/okf-explorer.json
curl -sI "https://chris-page-gov.github.io/okf-explorer/?bundle=https%3A%2F%2Fchris-page-gov.github.io%2Fai-infrastructure-wiki%2Fuk-government-apis%2Fokf-explorer.json&view=reader#overview"
```

Then re-run the credential scan against the published descriptor/shards if practical, or at minimum against the merged repository state.

## Exemplar-improvement Work Completed With This Completion

The 2026-07-07 report listed several larger exemplar-improvement tasks as valuable but not required for the immediate security/publication completion. This pass completed them as part of the same branch so the exemplar is materially closer to the specification rather than merely cleared of credential-bearing URLs.

- Markdown OKF files are emitted for selected record classes, with endpoint-scale records retained in JSON shards to avoid turning the exemplar into tens of thousands of Markdown files.
- Declared API products are crosslinked to CKAN/OS/ONS records where a canonical provider and endpoint host can be matched; inferred links carry evidence type and confidence rather than pretending to be authoritative declarations.
- Contract and capability-document records are derived from observed OpenAPI, WSDL, OGC, ArcGIS, SPARQL and related metadata signals, and linked back to described records.
- Organisations now carry canonical publisher identifiers/titles for the provider set currently harvested, with alias handling for known GOV.UK/provider-name variants.
- The Explorer vocabulary now includes `quality_band`, `relationship_density`, `assurance_status`, `canonical_publisher`, `data_classification` and `environment` facets.
- Records include `credential_requirements` and static `sample_policy` fields, using references and policy descriptors only.
- The frontend test suite now includes a shipped-static-Explorer regression harness, and the Svelte source fetch helpers have byte-counted response tests.
- Svelte, worker and vanilla static Explorer JSON fetches now enforce streamed byte-count caps, not only `Content-Length`.

Remaining enrichment work should now be treated as iterative product depth rather than completion gating: deeper live contract parsing, fuller GOV.UK organisation-register reconciliation, richer provider-portal assurance and higher-fidelity operation/sample extraction.

## Recommended Done Criteria

Completion is done only when all of the following are true:

1. The fixed generator has regenerated `uk-government-apis/`.
2. The generated corpus contains zero persisted credential-bearing URL query parameters.
3. The generated warnings counters record redactions/drops from live data.
4. The full local gate in Phase 3 passes.
5. The PR CI gate passes.
6. The PR is merged.
7. GitHub Pages deploys the merged commit.
8. The published descriptor is reachable at the stable URL.

Current branch status after this implementation pass:

| Criterion | Status |
|-----------|--------|
| Fixed generator regenerated `uk-government-apis/` | Done |
| Zero persisted credential-bearing URL query parameters | Done |
| Live warnings counters record redactions/drops | Done |
| Full local gate in Phase 3 passes | Done |
| PR CI gate passes | Done |
| PR is merged | Done |
| GitHub Pages deploys merged commit | Done for the remediation merge; later Pages state should be rechecked after each merge |
| Published descriptor is reachable at stable URL | Done at review close; recheck with the stable descriptor URL before demos |

## Current Pack Checkpoint

Current generated descriptor state on `main` after the follow-up and later UI
work:

- 257 API products, including 244 GOV.UK-declared products and 13
  provider-native API products.
- 34,327 data access endpoints and 7,827 data products.
- 2,994 contracts/capability documents, 38 operations and 93 schemas.
- 274 providers/publishers and 302,683 relationships.
- 3,383 selected `api-records/*.md` files, 274 `organisations/*.md` files,
  plus `uk-government-apis/index.md` and `uk-government-apis/log.md`.
- All scanned relationships carry `confidence`, `evidence_type` and
  `observed_at` provenance fields.
- Generated warnings record 102 credential-parameter redactions, 5,892
  duplicate endpoints skipped, 5 duplicate slugs dropped, 25,397 licences
  inferred from provider terms, 12,289 missing licences, 202 unknown access
  models and 17 missing contracts.
- A repository scan for persisted URL query parameters named `password`,
  `login`, `token`, `access_token`, `api_key`, `apikey`, `client_secret`,
  `secret`, `sig` or `signature` returns zero matches.

The 2026-07-07 report should therefore be read as the original problem record,
not as the current state of the exemplar.
