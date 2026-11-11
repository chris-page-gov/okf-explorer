# Warwickshire and National Data Library Analytical Data trial

The Analytical Data `1.0.0-rc.1` candidate passed a local conversion of all 333 observations in Warwickshire County Council's historical Ageing population 2008 CSV. The corresponding National Data Library directory record was captured and checked separately. Its recorded CSV URL and the HTTPS form both returned 403 AccessDenied, leaving that distribution unassessed. The trial covers one real dataset and one catalogue record describing it. [Warwickshire record](https://www.warwickshire.gov.uk/directory-record/6300/ageing-population-2008) · [NDL directory record](https://www.data.gov.uk/dataset/89e5101a-2064-46e7-955e-4cac2fb31c7c/warwickshire-ageing-population)

## Measured results

| Check | Result |
| --- | --- |
| Retained WCC distribution | 32,018 bytes from the publisher-linked GitHub repository, matching Git blob `42e03f81987c9ec4c41c57515f4217c8235bf55a`. |
| Complete data population | 333 rows, seven original fields, 333 distinct SOA codes and five district or borough names. |
| Local projection | Rename seven headers, remove grouping commas from counts, remove `%` from percentages and add `reference_year=2008` from the publisher catalogue. Retain row order, area codes and all other strings, including trailing locality spaces. |
| Analytical validation | Passed against the pinned candidate schema and validator. Key is `soa_code` plus `reference_year`. The exact manifest and converted CSV hashes appear in the receipt. |
| Numeric cross-check | Total-population checksum is 530,661. The source percentage range of 5.4% to 41.7% is retained in percentage points. These are conversion checks. They supply no independent statistical validation. |
| Actual special values | No blank cells, numeric zeroes or special-value tokens occur in the source. Synthetic profile tests retain coverage of suppression and zero. |
| Native-format compatibility | Original headers fail the candidate machine-name rules. Renaming only the headers still fails on grouped numeric values. |
| Negative probes | Duplicate keys, an undeclared blank, a percentage sign in a numeric field, changed bytes with an old digest and catalogue metadata presented as an analytical manifest are rejected. Together with the two native-format probes, seven probes reject as expected. |
| NDL metadata | Record ID `89e5101a-2064-46e7-955e-4cac2fb31c7c`, CSV resource ID `0e0492c0-e58d-43c6-b6d5-890e0432a1f3`. Last metadata update is 12 August 2013. |
| NDL access | The captured HTTP resource URL and its HTTPS form both returned 403 with an S3 `AccessDenied` response. No bytes were substituted for this inaccessible distribution. |

The [source register](../sources/analytical-data-trial-2026-11-11/source-register.json) retains every acquired file, response status, acquisition completion time and SHA-256. The [projection contract](../sources/analytical-data-trial-2026-11-11/projection.json) records local choices. The [trial results](examples/analytical-data-trial/results.json), [validation receipt](examples/analytical-data-trial/warwickshire/receipt.json) and [catalogue link trial](examples/analytical-data-trial/ndl-catalogue-link.json) reproduce offline.

## Compatibility gaps and adoption

| Gap | Evidence and consequence |
| --- | --- |
| Source formatting | The original CSV is a readable publisher format. The candidate needs the declared conversion to machine names and base-ten values. Keep the original file and derivation together. |
| Geography edition | The WCC page identifies Super Output Area and a 2008 reference period. It supplies no pinned boundary or code-list edition. Codes stay unchanged, and membership or joins with current geographies remain unverified. |
| Measure meaning | The source definition is females aged 60+ and males aged 65+. Modern retirement-age measures and a general 65+ population measure need their own concept mapping and comparison evidence. |
| Rights conflict | WCC's dataset-specific page links CC BY-SA 2.0 UK. NDL declares UK OGL through an unversioned licence identifier. The local manifest records rights as `unverified` and retains the WCC licence and attribution. A structural pass cannot resolve the discrepancy. |
| Unavailable NDL bytes | The WCC GitHub route succeeds and the NDL S3 route denies access. Matching titles and descriptions cannot prove the resources have identical bytes or versions. |
| Missing catalogue contract | NDL supplies neither an exact data release version nor a resource digest, size, field schema, observation key or analytical profile declaration. A local companion can fill these fields for the acquired WCC snapshot. Publisher adoption remains a separate step. |
| Sample coverage | Historical data demonstrates conversion and key integrity. It does not test current service data, changing boundaries or real disclosure symbols. |
| Existing producer contracts | Read-only shared-profile reconciliation finds 13 errors in the WCC producer and one in the NDL producer. The original Explorer checker reports identical errors. These baseline repository gaps have their own migration work. The analytical CSV conversion still passes. |

The publisher describes the source as retirement-age percentages by SOA and credits ONS Mid-2008 Super-Output Area Population Estimates. WCC's [dataset-specific record](https://www.warwickshire.gov.uk/directory-record/6300/ageing-population-2008) links [CC BY-SA 2.0 UK](https://creativecommons.org/licenses/by-sa/2.0/uk/). The captured [NDL record](https://www.data.gov.uk/dataset/89e5101a-2064-46e7-955e-4cac2fb31c7c/warwickshire-ageing-population) declares OGL. Those are source declarations. The normalisation, local manifest and proposed companion relationship are local trial decisions.

## Does OKF Explorer need an update?

The Explorer repository needs the profile, reference validator, examples, evidence and documentation included in this candidate. Those updates are local on `codex/analytical-data-profile`, based on `7d48a552` from the v0.8 release checkout. The application can already read ordinary records and links. The bounded [Reader trial bundle](examples/analytical-data-trial/reader-bundle.json) uses those existing capabilities to expose the WCC and NDL records and their companion links.

The offline validator performs Analytical Data checks before a producer publishes its companion. Existing OKF 0.2 and Bundle Wiki validation continue through their own entry points. The current Reader's relationship rendering and metadata views provide no analytical validation receipt interpretation, typed data-table preview or special-value display. Those capabilities would require a separately specified application change, with their own acceptance criteria. Adoption of this candidate only requires a producer to generate and validate its companion and link it from its ordinary record.

The [estate rollout](analytical-data-profile-rollout.md) now records this completed bounded trial. Resolving the NDL access route, rights conflict and geography edition precedes a claim of cross-catalogue equivalence. Neither a catalogue record nor this local trial declares publisher conformance.

The [producer reconciliation evidence](analytical-data-trial-2026-11-11-producers.json) pins the checked WCC and NDL commits. WCC has a separate geospatial profile, an invalid YAML-LD document and shared-contract field differences. Both checkouts have a declared root README without `okf_version: 0.2`. The check compares each checkout with the shared baseline and gives no acceptance of its own producer-specific contract. Keep those migrations separate from a new analytical companion.

## Reproduce the trial

Run the governed locked Python environment from this checkout.

```sh
uv run --locked python scripts/build_analytical_data_trial.py
uv run --locked python scripts/build_analytical_data_trial.py --check
uv run --locked python scripts/check_analytical_data.py docs/examples/analytical-data-trial/warwickshire
uv run --locked python -m unittest tests.test_analytical_data_profile tests.test_analytical_data_trial -v
```

The builder reads retained snapshots and uses the existing analytical validator. Its `--check` mode checks every generated trial byte. The candidate profile/schema bytes retain revision `1.0.0-rc.1` because this trial adds evidence and local projections without changing the contract.

## Local verification

The full local suite passed 563 Python tests, 891 Vitest tests, 119 application Node checks, 98 MCP checks and 47 context and other Node checks. Svelte checking reported zero errors and warnings. The deterministic app build, SBOM, bundle, registry, source constraints, documentation lockstep, British English and semantic checks passed. Two opt-in integrations were skipped in the app and MCP groups.

The full installed-Chrome UI run recorded 176 passes, six environment-dependent skips and one narrow reading-help failure where PageDown left `scrollTop` at zero. The isolated four-layout group passed on rerun. This remains an intermittent test observation. The dedicated two-record trial journey passed in installed Google Chrome, including the companion popup, exact manifest, CSV and schema hashes, catalogue denial qualifiers and documentation navigation, with no console errors or failed local requests.

The [verification record](analytical-data-trial-2026-11-11-verification.json) binds the test observations to the source, code, profile and companion digests. It also records the local Node and pnpm versions and the different CI declarations. These observations concern the local candidate based on `7d48a552`. The producer reconciliations retain the existing failures described above.

## Commit and draft PR preparation

The candidate was replayed onto current `main` at `dcd0c43e`, which contains Explorer v0.8.1 and its Legislation acceptance correction. The original verification record remains a dated observation of the initial working tree. The [integration record](analytical-data-candidate-integration-2026-11-11.json) pins the committed candidate and its packaging attributes. All seven source snapshots reproduce byte for byte from an export of the committed Git tree.

Fresh integration checks passed 563 Python tests, 25 runtime-acceptance Node tests, Svelte checking, the deterministic v0.8.1 app build, SBOM and the source, semantic, registry and documentation gates. The original Vitest, MCP and full Chrome observations retain their original base. Their eight skipped checks and intermittent help-layout failure remain explicit in both verification records. The compatibility gaps retain their open status during draft review.

The dedicated companion journey also passed against the integrated build in installed Chrome. Its receipt binds the exact v0.8.1 app manifest and tree alongside the analytical manifest, schema and CSV digests. The original full UI suite observation retains its separate date and scope.

## Supplementary curation and service review

The [NDL curation and DEFRA review](analytical-data-curation-review-2026-11-11.md) adds guidance that was absent from the initial trial evidence. The NDL trial exercised a directory record. Curated collection membership, demand, editorial selection and a maintained-publication review remain unverified. The [local assessment](analytical-data-curation-assessment-2026-11-11.json) records source period, data revision, metadata modification and acquisition as separate concepts, and retains the existing rights, access, geography and producer gaps. The candidate schema and original assurance observations retain their own versions and scope.
