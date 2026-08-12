# Publication Plan

Status: the Explorer remains the runtime and documentation publication unit;
the Coventry and Warwickshire exemplar is an independently owned data
publication unit. This separation keeps a large, stable candidate out of the
Explorer's ordinary Site rebuild and release closure.

## Public Surfaces

- Repository: canonical OKF Explorer source, sample OKF Markdown corpus,
  provenance, issues, pull requests, and review history.
- Root sample data: `okf-bundle.json` is the compatibility runtime projection;
  `okf-bundle.yamlld` and `okf-bundle.jsonld` are synchronised semantic
  representations generated from the same normalised Markdown graph. Site
  assembly rejects any drift among them.
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

## Componentised Site Assembly

`scripts/build_site.py` builds four independently content-addressed components:
`data`, `shell`, `docs`, and `app`. Components are verified before reuse and
assembled with manifest-owned, changed-only writes. A stale output is removed
only if its bytes still match the previous assembly manifest; collisions must
have an explicit final owner. `.site-components/` is a local/CI cache and is
not source material.

Run `uv sync --locked` before local publication work. Every Explorer-owned
Python command below uses the committed CPython 3.12.11 and `uv.lock` through
`uv run --locked`. The separately versioned external Heritage publication unit
retains a byte-preserved legacy requirements manifest, but its host-Python
workflow does not lock transitive dependencies; do not mistake that explicit
compatibility boundary for the governed Explorer environment.

The candidate receipt is deliberately written outside `_site/`:

```sh
uv run --locked python scripts/build_site.py \
  --candidate-receipt "$RUNNER_TEMP/site-candidate-receipt.json"
```

Promotion status, timestamps, signatures, browser receipts, and scheduled-link
observations are evidence about that candidate. They are never copied into the
candidate or used as a Site component input, so refreshing them cannot change
the candidate identity.

## Explorer v0.7.0 Release Sequence

Explorer releases use the Explorer repository's own merge, Pages and browser
evidence. They do not reuse the external Heritage R1/R2 promotion procedure
below.

1. Merge the fully green pull request into `main` and record the resulting
   40-character merge commit. Do not tag the pull-request head or a mutable
   branch name.
2. Wait for **Publish GitHub Pages** to complete for that exact merge commit.
   Record the run URL and download both its unchanged `github-pages` artefact
   and `pages-site-candidate-receipt` evidence before Actions retention expires.
   The run's `headSha` must equal the recorded merge commit.
3. Compare the deployed
   `okf-explorer-build-manifest.json` bytes and `tree_sha256` with the manifest
   in that Pages artefact. Also compare the public beginner chapter, `guide.css`
   and `guide.js` bytes with the same artefact. Use cache-bypassing requests;
   an earlier successful Pages run is not evidence for this release.
4. Run the focused public journeys against the deployed URL in installed Google
   Chrome. The first command exercises governed endpoint labels and the
   exploratory-publication banner across the Explorer; the second proves the
   independently scrolling learning path, collapsed rail, hover and keyboard
   expansion, persistent pin, narrow/touch fallback, reduced motion and exact
   chapter routing:

   ```sh
   cd apps/okf-explorer
   PLAYWRIGHT_BASE_URL=https://chris-page-gov.github.io/okf-explorer/ \
     pnpm exec playwright test \
       tests/ui/endpoint-label-index.spec.ts \
       tests/ui/exploratory-publication.spec.ts \
       --project=chrome
   PLAYWRIGHT_BASE_URL=https://chris-page-gov.github.io/okf-explorer/ \
     pnpm exec playwright test \
       --config=playwright.foundry.config.ts \
       tests/foundry/beginner-guide-navigation.spec.ts \
       --project=chrome
   ```

   The `chrome` project is configured with `channel: "chrome"`; this is a
   genuine Google Chrome run, not Playwright's bundled Chromium. Confirm the
   tested fragment and current chapter survive navigation and reload, and that
   no page or browser-console error occurred.
5. Write `okf-explorer-v0.7.0-public-verification.json` outside `_site/`. It
   must record the merge commit, Pages run and deployment URLs, observation
   time, browser name and version, exact commands and passing test counts,
   Pages artefact byte count and SHA-256, candidate-receipt SHA-256, deployed
   application-manifest SHA-256 and tree SHA-256, tested URLs/fragments,
   assertion results and any limitations. A failed or partial journey remains
   failed evidence; do not edit it into a pass.
6. Create and push annotated tag `v0.7.0` at the exact verified merge commit.
   Prepare a draft release titled **OKF Explorer v0.7.0** from the matching
   changelog section. Attach exactly these three assets:

   - `okf-explorer-v0.7.0-pages-artifact.zip` — the unchanged `github-pages`
     Actions artefact from step 2; it contains the released Explorer, rendered
     corpus, OKF JSON/YAML-LD projections and legacy viewer;
   - `okf-explorer-v0.7.0-sbom.cdx.json` — the checked
     `release-assurance/explorer.sbom.cdx.json`, renamed without changing its
     bytes; and
   - `okf-explorer-v0.7.0-public-verification.json` — the exact step 5 receipt.

7. Before publishing the draft, download all three assets and independently
   compare their byte counts and SHA-256 digests with the local files. Confirm
   the annotated tag peels to the recorded merge commit and the release has no
   missing or unexpected assets. Publish only after those checks pass; then
   record the immutable release URL in the semantic-authoring ledger.

The Actions receipt and public-verification receipt remain evidence *about*
the deployed candidate. Keeping them outside the Pages bytes prevents a
self-referential rebuild in which recording a Site digest changes that Site.

## Heritage Publication Unit

To bootstrap or refresh the external repository, materialise the deterministic
candidate into its `site/` directory, copy all five repository workflows to
`.github/workflows/`, copy the publication-unit README to repository root, and
install the promotion-envelope template outside the candidate root:

```sh
uv run --locked python scripts/retarget_heritage_source_snapshots.py --check
uv run --locked python scripts/build_heritage_evaluation.py --check --fixture all
uv run --locked python scripts/export_publication_unit.py \
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
materialised in workflow temporary storage and published only as attested R2
release evidence; it is never committed or copied into `site/`. Ordinary Pages
publication validates only the exact candidate manifest. Terminal release
validation additionally requires that promoted envelope to bind the candidate
and its assurance receipts.

## Heritage Release Steps

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
   materialises and attests the promotion envelope; and publishes the complete
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

Run these before publishing or cutting an Explorer release:

```sh
pnpm --dir apps/okf-explorer install --frozen-lockfile
pnpm --dir apps/okf-explorer check
pnpm --dir apps/okf-explorer test
pnpm --dir apps/okf-explorer sbom:check
pnpm --dir apps/okf-explorer build:determinism
uv run --locked python scripts/check_legislation_okf.py
uv run --locked python scripts/build_legislation_evaluation.py
uv run --locked python scripts/build_okf_bundle.py --check
uv run --locked python scripts/update_viewer.py --check
uv run --locked python scripts/check_okf.py
uv run --locked python scripts/check_heritage_adversarial.py
uv run --locked python scripts/retarget_heritage_source_snapshots.py --check
uv run --locked python scripts/build_heritage_evaluation.py --check --fixture all
uv run --locked python scripts/export_publication_unit.py \
  --descriptor publication-units/heritage-coventry-warwickshire/publication-unit.json \
  --check
uv run --locked python scripts/build_site.py \
  --candidate-receipt "$RUNNER_TEMP/site-candidate-receipt.json"
pnpm --dir apps/okf-explorer test:e2e:terminal
```

Run the live UK Government API producer check when its source inputs, builder
or generated publication plane is selected for change or republication:

```sh
uv run --locked python scripts/build_uk_government_api_okf.py --check
```

That producer check deliberately observes a separately changing official
inventory. A newly observed inventory difference must be triaged as producer
publication work; it must not silently regenerate thousands of unrelated files
or block an otherwise unchanged Explorer release. The pull-request impact plan
and the release record must state whether this producer plane was selected.

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
Explorer v0.7.0 additionally loads an optional, integrity-bound compact
endpoint-label index before presenting route names, and retains a validated
exploratory-publication banner across Reader, Graph, Links, Timeline, Type,
Resources, Map and Narrative. Missing governed labels fail visibly as
**Missing label**; malformed exploratory intent produces an explicit warning
and `noindex` instead of ordinary release presentation.
