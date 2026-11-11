# Analytical Data profile rollout across the OKF estate

The first candidate is a separate versioned contract for analytical CSV packages. It gives producers a place to declare observation grain, field types, identifier schemes, special values and validation evidence. Each producer can select the profile for a specific distribution. [Analytical Data profile v1](../profiles/analytical-data/v1/index.md) · [Estate standardisation tracker](okf-estate-standardisation-tracker.md)

## Versioning and migration

| Identity | Version rule |
| --- | --- |
| OKF core and Bundle Wiki | Existing contracts govern bundles and relationship assertions. An analytical distribution can accompany them through an ordinary distribution reference. |
| Analytical Data profile | Use the versioned URI plus the exact contract revision. Freeze released schema bytes and the validated candidate. Pin the validator independently and preserve receipts for each check. |
| Dataset release | Use a publisher dataset ID and an explicit release version. Check the exact distribution digests before reuse. A different data version gets a separate validation receipt. |
| Producer and Reader | Record the producer revision, output digest and tested consumer revision. Check existing Reader journeys and analytical sidecar validation independently. |
| Additional profiles | Declare the applicable versioned URIs. Each governing profile has its own validator and receipt. The analytical validator reports the other declarations as unevaluated. |

Start with a bounded fixture and reconcile its native source names, observation key, lexical values, identifier edition, rights and file digests. Where conversion is necessary, retain the publisher distribution and record the derivation. Verify the opt-in package and a producer's ordinary bundle together. Promote a producer's declaration after its owner reviews both checks and the evidence for the declared source contract. Rollback uses the previously checked producer revision and distribution.

## Candidate adoption order

| Area | Local evidence and next check |
| --- | --- |
| DfE EES in `uk-gov-engineering-standards` | The dated example has 15 data rows and four exact metadata joins. Its geography spelling differs from the detailed guide and archived screener. A local projection passed all 15 rows using a derived area key across the two geographic levels. It retains the original header names and explicitly marks the blank national region fields as inapplicable in the trial. Publisher compatibility remains unresolved. [DfE guide](https://dfe-analytical-services.github.io/analysts-guide/statistics-production/ud.html) |
| ONS and WCC analytical distributions | The 11 November WCC trial converts and validates all 333 historical SOA observations. Exact source names and numbers remain recoverable. Geography edition, code membership and modern concept comparisons remain open. ONS and the WCC producer keep their existing contracts. [Trial report](analytical-data-trial-2026-11-11.md) |
| National Data Library discovery | The corresponding NDL directory record was captured on 11 November. Its CSV route and HTTPS form return 403 AccessDenied, and its OGL declaration differs from the WCC licence. A proposed local companion binds the separately acquired WCC snapshot. NDL distribution equivalence and publisher adoption remain open. [Trial report](analytical-data-trial-2026-11-11.md) |
| BDUK | The available `okf-bduk` folder is an export rather than a Git checkout. Identify the owning producer and data contract before testing any service or geography mapping. |
| API catalogue, legislation and other document producers | The inspected API and legislation checkouts declare Bundle Wiki v1. Adopt the analytical profile only for a distribution with observations and an explicit data contract. Validate their existing bundle and Reader journeys as compatibility baselines. |

The local checkout observations above were made on 10 November 2026. The estate registry remains the source for reviewed producer identities and publication state. This is a candidate rollout order and adoption needs evidence from each affected producer. [Estate standardisation tracker](okf-estate-standardisation-tracker.md)

The 11 November trial confirms the offline analytical check and supplies a bounded two-record Reader journey with ordinary companion links. In-browser typed data inspection and validation-receipt interpretation require a separately scoped application feature. [Explorer update assessment](analytical-data-trial-2026-11-11.md#does-okf-explorer-need-an-update)

Read-only shared-profile reconciliation also records 13 existing WCC producer errors and one existing NDL producer error. The original Explorer checker reproduces both sets. These producer contract migrations retain their own review scope. [Pinned reconciliation results](analytical-data-trial-2026-11-11-producers.json)

Draft PR preparation uses current `main` at `dcd0c43e` with Explorer v0.8.1. The earlier trial receipts retain their original base, skipped checks and intermittent UI observation. [Integration record](analytical-data-candidate-integration-2026-11-11.json)
