# Publication Plan

Status: the Explorer remains the runtime and documentation publication unit;
the Coventry and Warwickshire exemplar is an independently owned data
publication unit. This separation keeps a large, stable candidate out of the
Explorer's ordinary Site rebuild and release closure.

## Public Surfaces

- Repository: canonical OKF Explorer source, sample OKF Markdown corpus,
  provenance, issues, pull requests, and review history.
- Main GitHub Pages: Explorer runtime, small examples, documentation, and
  lightweight compatibility pages for the external heritage exemplar. It does
  not copy the heritage corpus or faithful fixture into `_site/`.
- Heritage publication unit: the byte-for-byte corpus is rooted at
  `https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/` and
  depends on the Explorer through the explicit `okf-explorer-large-corpus.v1`
  runtime contract. Its immutable descriptor is
  `publication-units/heritage-coventry-warwickshire/publication-unit.json`.
- GitHub Pages: public root redirects to the canonical Svelte OKF Explorer
  under `next/`, preserving query-string and hash routes.
- Svelte Explorer: when `apps/okf-explorer/build/` exists, the Pages build
  publishes the canonical Vite 8 / SvelteKit implementation under `next/`.
- Legacy Explorer: the dependency-free compatibility Explorer is published
  explicitly under `legacy/`, while `viewer.html` and `view.html` remain the
  single-file legacy viewer surfaces.
- GitHub Releases: versioned snapshots of the explorer, OKF bundle, legacy
  viewer, and sample corpus.
- UK Legislation: the complete static work catalogue is published at
  `legislation/okf-explorer.json`; selected works progressively load their
  authoritative CLML subdivision tree from legislation.gov.uk.
- UK Legislation documentation: the maintained spine is published under
  `docs/uk-legislation/`, with screenshot assets and their refresh manifest
  under `docs/assets/uk-legislation-manual/`.
- Human-readable documentation: every local Markdown dependency reachable
  from `docs/` and `profiles/` is published at a deterministic HTML route.
  Same-site Markdown navigation, missing targets and missing heading fragments
  fail the Pages build, as do missing scripts, stylesheets, images and duplicate
  identifiers. Raw Markdown remains a machine-discoverable exact-build
  alternate; ordinary human navigation always uses rendered HTML.
- Optional DOI: connect the public repository to Zenodo after the first release
  if a persistent scholarly citation is required.

## Componentized Site Assembly

`scripts/build_site.py` builds four independently content-addressed components:
`data`, `shell`, `docs`, and `app`. Components are verified before reuse and
assembled with manifest-owned, changed-only writes. A stale output is removed
only if its bytes still match the previous assembly manifest; collisions must
have an explicit final owner. `.site-components/` is a local/CI cache and is
not source material.

The candidate receipt is deliberately written outside `_site/`:

```sh
python3 scripts/build_site.py \
  --candidate-receipt "$RUNNER_TEMP/site-candidate-receipt.json"
```

Promotion status, timestamps, signatures, browser receipts, and scheduled-link
observations are evidence about that candidate. They are never copied into the
candidate or used as a Site component input, so refreshing them cannot change
the candidate identity.

## Heritage Publication Unit

To bootstrap or refresh the external repository, materialize the deterministic
candidate into its `site/` directory, copy all five repository workflows to
`.github/workflows/`, copy the publication-unit README to repository root, and
install the promotion-envelope template outside the candidate root:

```sh
python3 scripts/retarget_heritage_source_snapshots.py --check
python3 scripts/build_heritage_evaluation.py --check --fixture all
python3 scripts/export_publication_unit.py \
  --descriptor publication-units/heritage-coventry-warwickshire/publication-unit.json \
  --output /path/to/okf-heritage-coventry-warwickshire/site
python3 /path/to/okf-heritage-coventry-warwickshire/site/scripts/check_publication_unit_manifest.py \
  /path/to/okf-heritage-coventry-warwickshire/site
mkdir -p /path/to/okf-heritage-coventry-warwickshire/.github/workflows \
  /path/to/okf-heritage-coventry-warwickshire/release-assurance
cp publication-units/heritage-coventry-warwickshire/repository-template/README.md \
  /path/to/okf-heritage-coventry-warwickshire/README.md
cp publication-units/heritage-coventry-warwickshire/repository-template/ci.yml \
  publication-units/heritage-coventry-warwickshire/repository-template/pages.yml \
  publication-units/heritage-coventry-warwickshire/repository-template/candidate-release.yml \
  publication-units/heritage-coventry-warwickshire/repository-template/terminal-assurance.yml \
  publication-units/heritage-coventry-warwickshire/repository-template/promotion-release.yml \
  /path/to/okf-heritage-coventry-warwickshire/.github/workflows/
cp publication-units/heritage-coventry-warwickshire/repository-template/promotion-envelope.template.json \
  /path/to/okf-heritage-coventry-warwickshire/release-assurance/promotion-envelope.template.json
```

Corpus-role materials are copied byte for byte. The exporter will reject a
corpus still rooted at the former public base instead of silently rewriting it.
It validates every plane entry, plane root, release root, build-manifest entry,
rendered Markdown target, and heading fragment. Documentation and fixture
links may be structurally retargeted during export.

Only the immutable promotion-envelope template is committed at repository root
under `release-assurance/`, outside `site/`. The runtime promotion envelope is
materialized in workflow temporary storage and published only as attested R2
release evidence; it is never committed or copied into `site/`. Ordinary Pages
publication validates only the exact candidate manifest. Terminal release
validation additionally requires that promoted envelope to bind the candidate
and its assurance receipts.

## Release Steps

1. Create the external repository, select GitHub Actions as its Pages source,
   enable immutable releases, and install the five workflows and detached
   promotion template shown above.
2. Run the publication checks below, export the exact candidate, commit it, push
   `main`, and wait for that same commit's Pages deployment.
3. Create and push an annotated R1 tag matching
   `heritage-coventry-warwickshire-YYYYMMDD`. Dispatch `candidate-release.yml`
   from updated `main` with that existing tag and the exact 40-hex OKF Explorer
   assurance commit. The workflow checks that action 32 names the exact release
   URL, builds only from the tagged `site/`, records the separate workflow ref
   and commit in the archive-attestation receipt, attaches the complete closure
   to a draft, publishes it, and then verifies platform immutability.
4. Dispatch `terminal-assurance.yml` at the R1 tag and supply an exact 40-hex
   OKF Explorer assurance commit. It reconstructs one exact URL closure from
   every rendered external HTML anchor plus the faithful, tiny and synthetic
   link-intent manifests. Every deduplicated URL must then have either a
   passing bulk observation or one of the 11 exact genuine-Chrome actions;
   promotion replays the same derivation and rejects omissions, additions and
   changed source roots. The bulk step is capped at 75 minutes inside the
   180-minute job. Its reviewed 14,000-URL ceiling, 48 workers, six-second
   request timeout and at most two attempts give a nominal worst-case network
   budget below 59 minutes, leaving bounded overhead and 105 minutes for the
   genuine-browser and three-engine gates. The remaining 21 actions run live
   in Chromium, Firefox and WebKit, and all evidence stays outside the
   candidate.
5. After terminal assurance succeeds, create an annotated R2 tag at exactly the
   R1 commit using
   `heritage-coventry-warwickshire-YYYYMMDD-promotion.N`.
6. Dispatch `promotion-release.yml` from updated `main` with both tags, the
   successful terminal workflow run ID, and the same exact 40-hex OKF Explorer
   assurance commit. It verifies the run repository,
   workflow, result, commit, timing and artifact identity; rechecks R1;
   materializes and attests the promotion envelope; and publishes the complete
   closure from a draft.
7. Each post-publication gate requires `release.immutable == true`, GitHub's
   verified release attestation
   and the exact policy-declared asset closure. The release API names, byte
   counts and SHA-256 digests must match the local files, and every digest must
   also appear in `gh release verify` output. The promotion workflow then
   records R2's platform observation outside the envelope, avoiding a
   self-referential release.

The release jobs need no personal access token and do not read the repository
administration endpoint. Their scoped `GITHUB_TOKEN` publishes and reads the
release; the post-publication release object, `gh release verify`, and exact
asset closure are authoritative. The Pages push trigger is restricted to
`site/**`, so installing or correcting workflows on `main` cannot replace an
already verified Pages deployment.

The external repository templates implement this ordering. See GitHub's
[immutable release guidance](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/establish-provenance-and-integrity/prevent-release-changes)
and [artifact attestation guidance](https://docs.github.com/en/actions/how-tos/secure-your-supply-chain/use-artifact-attestations/use-artifact-attestations).

## Publication Checks

Run these before publishing or cutting a release:

```sh
cd apps/okf-explorer && pnpm install && pnpm check && pnpm build && cd ../..
python3 scripts/build_uk_government_api_okf.py --check
python3 scripts/check_legislation_okf.py
python3 scripts/build_legislation_evaluation.py
python3 scripts/build_okf_bundle.py --check
python3 scripts/update_viewer.py --check
python3 scripts/check_okf.py
python3 scripts/check_heritage_adversarial.py
python3 scripts/retarget_heritage_source_snapshots.py --check
python3 scripts/build_heritage_evaluation.py --check --fixture all
python3 scripts/export_publication_unit.py \
  --descriptor publication-units/heritage-coventry-warwickshire/publication-unit.json \
  --check
python3 scripts/build_site.py \
  --candidate-receipt "$RUNNER_TEMP/site-candidate-receipt.json"
```

Pull requests use the checked-in impact planner to run independent Python, app,
browser, Foundry, documentation, Site, and release-policy jobs in parallel.
Browser changes requiring complete assurance run Chrome, Firefox, and WebKit;
bounded changes use targeted Chromium. A nightly and manually dispatchable
shadow workflow always runs all three engines and the full Foundry family.

The scheduled link observer rotates over hash shards on its own freshness
schedule. Bulk official URLs use bounded HTTP observations; protected rich
pages use a real Chromium journey. Both receipts are workflow artifacts outside
the candidate and cannot trigger a Site rebuild.

## Current Svelte Coverage

The Svelte Explorer covers monolithic OKF bundles and large-corpus descriptors.
Large-corpus startup remains overview-only; static search stays worker-backed;
full dataset/resource/publisher chunks hydrate only for detail/filter/timeline/
type/resource views; relationship chunks hydrate only for graph/link views.
