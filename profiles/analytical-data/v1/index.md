# OKF+ Analytical Data profile v1

**Candidate 1.0.0-rc.1**

The profile gives a CSV dataset machine-readable metadata for observations, fields, identifiers and special values. Each package binds its release, provenance and rights declarations to the exact table bytes. This is an opt-in profile alongside OKF 0.2 and the [Bundle Wiki profile](../../bundle-wiki/v1/index.md). An OKF bundle can reference the analytical package as a separate distribution. Semantic graph assertions use their own Bundle Wiki contract.

The DfE guide provides the publishing precedent for explicit fields, labels, indicator formatting and special-value meanings. Its downloadable EES example uses `geographical_level`. Its detailed guidance and archived screener use `geographic_level`. Preserve the source spelling in a declared field and record any normalised projection and its derivation. The [estate rollout note](../../../docs/analytical-data-profile-rollout.md) describes the EES compatibility gap. [DfE Open Data Standards](https://dfe-analytical-services.github.io/analysts-guide/statistics-production/ud.html)

## Package contract

An analytical package contains `okf-analytical-data.json` and its declared UTF-8 CSVs. The manifest uses [the Draft 2020-12 schema](package.schema.json). [Profile descriptor and schema digest](profile.json)

| Declaration | Meaning |
| --- | --- |
| `conformsTo` | Includes the exact Analytical Data v1 profile URI. Other URIs declare additional profiles that need their own checks. |
| `profileVersion` | The exact contract revision, currently `1.0.0-rc.1`. |
| `dataset` | Stable dataset ID, publisher release version, display title, real-world or synthetic scope and rights declaration with a source URL. A declared licence includes its URL. |
| `tables` | Each table declares a relative CSV path, SHA-256 digest, source URL, observation date and optional source contract. |
| `fields` | In CSV column order, each field has an exact machine name, human label, role and type. Optional properties describe a concept, unit, display precision, vocabulary or identifier scheme. |
| `observationKey` | Declared dimension fields that together identify one observation in a table. |
| `valueStates` | Exact source tokens with explicit meanings for this field. |
| `allowedValues` | A local closed set of exact lexical values for this field. The validator checks these values from the manifest. A vocabulary URL supplies identity and provenance for further review. |

Machine names contain ASCII letters, digits and underscores and start with a letter or underscore. Preserve case, including an upstream code such as `LAD24CD`. Field roles are `dimension`, `measure` and `attribute`. Types are `string`, `integer`, `number`, `boolean` and `date`. Use base-ten numeric values, lowercase `true` or `false`, and calendar dates in `YYYY-MM-DD` form. Display precision describes presentation. The validator reads the underlying value at its declared type.

A field containing identifiers can name its `scheme`, `entityType` and optional `edition`. Keep each code as the original literal. An explicit mapping with evidence is needed before combining fields from different authorities or editions. The validator checks the declaration and any inline controlled values. Authoritative code membership and cross-edition equivalence need separate evidence.

Each CSV row has the exact declared number of fields. Observation keys use typed values, so integer `02026` and `2026` identify the same key value. Special-value tokens cannot form part of an observation key. Where the publisher combines several grains in one file, use an explicit derivation for any table split or new key and retain the original distribution separately.

## Value states

| State | Meaning |
| --- | --- |
| `missing` | The source records a missing observation. |
| `notApplicable` | The measure does not apply to this observation. |
| `notAvailable` | The observation is applicable and a value is unavailable. |
| `suppressed` | The source withholds a value under its disclosure rules. |
| `roundedToZero` | The source rounded a non-zero value to zero. |
| `lowReliability` | The source uses a token to mark low reliability. |

A numeric zero stays numeric. An empty cell needs a declared state token. A token for a typed numeric, Boolean or date field must be distinct from its valid typed values. The state names describe producer declarations. Where an upstream format supplies a numeric value with a separate quality flag, preserve the flag as a separate field and document the source convention.

## Run the reference check

From a checkout of Explorer, validate [the synthetic manifest](example/okf-analytical-data.json) and [its example CSV](example/data/participation.csv).

```sh
uv run --locked python scripts/check_analytical_data.py profiles/analytical-data/v1/example
```

The receipt includes the profile version and status, schema, validator and toolchain lock digests, input hashes, table counts and unevaluated profile URIs. A pass covers the analytical package rules implemented here. The check reads local files and uses a pinned schema. Rights and provenance checks validate declarations. Publication authority, publisher conformance, external code membership and graph or tool conformance require their own evidence. The reference check has per-file, package and row limits of 64 MiB, 256 MiB and 100,000 observations per table. An exceeded limit exits with status 2 for an unassessed package. Invalid data or declarations exit with status 1.

## Version and adoption

The [NDL curation and DEFRA review](../../../docs/analytical-data-curation-review-2026-11-11.md) adds a supplementary local assessment of audience, demand, ownership, currency, rights and versioned access. NDL collections have a human editorial selection process. A directory record retains its own publication route. The analytical receipt supplies evidence for the integrity part of that wider review. Future typed datetime or spatial validation needs an explicit contract revision.

The [11 November 2026 Warwickshire and NDL trial](../../../docs/analytical-data-trial-2026-11-11.md) checks a real 333-observation local projection and captures the separate catalogue's denied download and rights discrepancy. It also defines the current Explorer interface boundary. The trial keeps the candidate schema and validator at their pinned revision.

A producer pins the profile URI, exact version, descriptor and schema digest, and records the validator digest in its acceptance receipt. Dataset release versions track the source data separately. Assign a new release candidate number when candidate contract bytes change. Freeze the accepted contract and schema at release. A change that alters validation or interpretation gets a distinct versioned profile route and explicit compatibility tests. Existing producers can adopt an analytical companion per dataset through the [estate rollout](../../../docs/analytical-data-profile-rollout.md).

The [live Defra API trial](../../../docs/analytical-live-trial-2026-11-11.md) validates a real Warwick locality snapshot with five stations and 96 readings. Pagination, instant/timezone semantics and locality bounds have supplementary adapter checks. RC.1 retains timestamps as strings and spatial meanings from publisher documentation. Typed datetime or spatial rules need an explicit reviewed revision.
