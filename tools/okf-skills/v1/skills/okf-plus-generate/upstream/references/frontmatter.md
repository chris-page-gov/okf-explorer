# OKF v0.3 frontmatter fields

This file lists every frontmatter field that OKF v0.3 defines. Section numbers refer to [`SPEC.md`](https://github.com/open-knowledge-format/open-knowledge-format/blob/main/SPEC.md). A producer can add other keys at any level. Name them `x-<producer>-<name>`, because future versions will not define keys that start with `x-`. A consumer keeps unknown keys and does not reject them (section 4.1).

## Syntax (section 4)

- The file starts with a line that is exactly `---`. The frontmatter ends at the next line that is exactly `---`.
- The frontmatter parses as a YAML 1.2 mapping with the core schema.
- A key does not repeat.
- Quote each value that looks like a number or a boolean, for example `okf_version: "0.3"`.
- Do not use custom YAML tags.
- When you change a file, do not rewrite the values that you did not change.

## Core fields (section 4.1)

| Field | Status | Value |
|---|---|---|
| `type` | Required | A short descriptive string, for example `BigQuery Table`, `Metric`, `Playbook`, `Reference`, or `Attested Computation`. No central registry exists. A file without `type` is not a concept. |
| `title` | Optional | The display name. A consumer can derive one from the file name. |
| `description` | Optional | One sentence. Index files, search snippets, and previews use it. |
| `resource` | Optional | A URI that identifies the underlying asset. Omit it for an abstract concept. |
| `tags` | Optional | A YAML list of short strings. A scalar value is one tag. |

## Provenance (section 5.1)

| Field | Status | Value |
|---|---|---|
| `sources` | Optional | A list of source entries. |
| `sources[].resource` | Required in each entry | A URL, a path in the bundle, or a scope descriptor such as `all queries in BigQuery project acme`. |
| `sources[].id` | Required when the body cites the source | A stable key. Footnote labels use it. |
| `sources[].title` | Optional | The display label. |
| `sources[].author` | Optional | The actor (section 7) that produced the source. It shows authority. |
| `sources[].usage_count` | Optional | How often the source was used during `usage_window`. It shows liveness. Compare counts only by order of magnitude. |
| `sources[].last_modified` | Optional | When the source last changed. It shows recency. |
| `usage_window` | Required with `usage_count` | A `{ from, to }` pair of timestamps, written next to `sources`. One entry can override it. |

## Trust (sections 5.2 and 5.3)

| Field | Status | Value |
|---|---|---|
| `generated` | Optional | `{ by, at }`. It records how the current content was produced. |
| `generated.by` | Required in `generated` | An actor (section 7). |
| `generated.at` | Optional | The time of the last change in meaning. A change to format, whitespace, or links does not change it. |
| `verified` | Optional | A list of `{ by, at }` confirmation events. Both keys are required in an event. A single mapping counts as a list with one entry. |

A consumer derives the trust tier from the current events only. An event is current when its `at` is equal to or later than `generated.at`, or when `generated` is absent.

| Current events | Trust tier |
|---|---|
| None | unverified |
| Only actors without the `human:` scheme | machine-confirmed |
| At least one `human:` actor | human-reviewed |

## Lifecycle (sections 5.4 and 5.5)

| Field | Status | Value |
|---|---|---|
| `status` | Optional | `draft`, `stable`, or `deprecated`. A missing value means `stable`. Any other value means that the concept is not current. |
| `superseded_by` | Optional | The path of the concept that replaces this one. It has a meaning only with `status: deprecated`. |
| `stale_after` | Optional | A timestamp. The concept is stale when the current time is at or after it. A value that does not parse counts as stale. |

## Attested Computation (section 10)

These fields apply to a concept with `type: Attested Computation`.

| Field | Status | Value |
|---|---|---|
| `runtime` | Required | How the computation runs, for example `bigquery`, `postgres`, `dbt`, `python`, or `Looker`. It defines what `parameters` mean. |
| `parameters` | Optional | A list of `{ name, type, required }`. `name` and `type` are required. `required` defaults to `false`. Common types are `string`, `integer`, `number`, `boolean`, `date`, and `timestamp`. |
| `computation` | Optional | The path of a file that holds the computation. If it is absent, the computation is the first fenced code block in the `Computation` section. |
| `executor.resource` | Optional | The path of the run instructions or code. |
| `executor.receipt` | Optional | The fields that a run returns, for example `[job_id, executed_sql, result]`. |
| `attester.resource` | Optional | The path of deterministic code, with no LLM, that checks a receipt and returns `{ ok, reason }`. |

A consumer does not show a value as attested when the concept has no `runtime` or no `attester`.

## Root index only (section 8.1)

These keys are allowed only in the frontmatter of the bundle-root `index.md`. An `index.md` below the root has no frontmatter. `log.md` has no frontmatter.

| Field | Value |
|---|---|
| `okf_version` | The OKF version, as a quoted string such as `"0.3"`. |
| `title` | The display name of the bundle. |
| `description` | One sentence that states the scope of the bundle and when to use it. Agents use it to choose a bundle. |
| `license` | An SPDX expression, such as `CC-BY-4.0`, or the path of a license file in the bundle. |

## Value formats

- **Timestamp (section 5).** The timestamp keys are `generated.at`, `verified[].at`, `stale_after`, `sources[].last_modified`, `usage_window.from`, and `usage_window.to`. Each value is an RFC 3339 date-time with an offset, for example `"2026-06-30T14:00:00Z"`, or a date, for example `"2026-06-30"`, which means the start of that day in UTC. Use the date-time form for `generated.at` and `verified[].at`.
- **Actor (section 7).** `<producer>/<version>` for an agent or a tool, or `<scheme>:<id>`. The defined schemes are `human:` for a person, `team:` for a group, and `process:` for an automated process. Only `human:` gives the human-reviewed trust tier.
- **Path (section 6).** A URL, a path that starts with `/` and resolves from the bundle root, or another path that resolves from the directory of its file. Percent-encode a space as `%20`. Paths are case-sensitive.

## Fields from earlier versions (section 12.1 and Appendix B)

| Earlier form | v0.3 form |
|---|---|
| `timestamp` (v0.1) | `generated.at` |
| `# Citations` list in the body (v0.1) | `sources` entries and footnotes |
| A path field written from the bundle root without a leading `/` (v0.2) | The same path with a leading `/` |
| Frontmatter in `log.md` (v0.2) | No frontmatter |
