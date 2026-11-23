# Write an attested computation

This file gives the steps that the `okf-generate` skill follows when it writes an Attested Computation (SPEC.md section 10). Write one only when you have a sanctioned computation from an approved source. Never write the computation yourself.

1. Write the computation as its own concept with `type: Attested Computation`, usually in `computations/`.
2. Set `runtime`, which the specification requires for this type, for example `bigquery`, `postgres`, `dbt`, or `python`.
3. List each value that a consumer can supply in `parameters`, as `{ name, type, required }`. `name` and `type` are required. `required` defaults to `false`. Common types are `string`, `integer`, `number`, `boolean`, `date`, and `timestamp`.
4. Put the computation in exactly one fenced code block in a section with the heading `Computation`. As an alternative, set `computation` to the path of a file that holds it, and put no fenced block in that section.
5. Set `executor.resource` to the run instructions or code. List the receipt fields in `executor.receipt`, for example `[job_id, executed_sql, result]`.
6. Set `attester.resource` to deterministic code that checks a receipt and returns a mapping with `ok` and an optional `reason`.
7. If no executor or attester exists yet, omit that field. State in the body that the computation cannot be attested yet, and tell the user. A consumer cannot show a value as attested without `runtime` and `attester`. Do not point at a file that does not exist.
8. Link to the computation from each concept that uses its value, for example from a `Metric`.
