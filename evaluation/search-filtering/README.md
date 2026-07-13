# Static search ranking benchmark

This controlled fixture evaluates the three deterministic ranking strategies
implemented by the static search worker:

- `weighted`: the current field-weighted lexical score;
- `idf`: field weights multiplied by inverse document frequency;
- `idf-exact`: IDF plus exact title, route and identifier boosts.

`questions.json` contains exactly 30 stratified queries. Each query declares
graded relevant routes, routes that must not appear in the first 10 results,
and any filters that must be applied before ranking. Identifier cases are
marked separately so a ranking change cannot trade exact lookup success for a
higher aggregate score.

Run the benchmark from the repository root:

```sh
node scripts/benchmark_static_search.mjs
```

The script reports macro nDCG@10, Recall@20, exact-identifier top-result
success, prohibited-route failures and warm-query p95. It selects a different
default only when the candidate improves macro nDCG@10 by at least 3%, does not
reduce exact-identifier success or Recall@20, keeps warm-query p95 within 20%
of the control and does not increase strategy-specific static assets by more
than 10%.

This fixture is a stable ranking regression benchmark, not a substitute for
the existing 100-question browser suite against a published corpus. The browser
suite remains the end-to-end functional and presentation baseline.
