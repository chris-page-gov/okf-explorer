# Evaluation And Quality

[Documentation spine](index.md) · [Getting started](getting-started.md) · [Personas and journeys](personas-and-user-journeys.md) · [Illustrated manual](illustrated-manual.md) · [Agent guide](agent-research-guide.md) · [Maintenance](maintenance.md)

## What is evaluated

The legislation publication has three assurance layers:

1. **Corpus checks** — unique work IDs, minimum count, representative type coverage, chunk/search consistency, required facets and documentation.
2. **Explorer checks** — static search, compressed-chunk handling, legislation detail rendering, CLML normalization and Pages build.
3. **Answer checks** — a 100-question barrister-oriented suite covering legal correctness, provenance, pinpoint passages, temporal/jurisdictional context, completeness and clarity.

## AI-answer rubric

| Criterion | Points |
|---|---:|
| Substantive correctness | 30 |
| Authoritative sources | 10 |
| Proposition-level provenance | 20 |
| Pinpoint passages | 15 |
| Temporal and jurisdictional context | 10 |
| Completeness and uncertainty | 10 |
| Clarity and utility | 5 |

An answer is capped below 50 when it has no official citation, omits the proposition ledger, leaves a proposition uncited or fails to cite the expected selected passage. Automated evidence checks do not replace expert legal review.

## Run the suite

```sh
python3 scripts/build_legislation_evaluation.py
python3 scripts/evaluate_legislation_answers.py answers.jsonl --out results.json
```

The answer contract is in `evaluation/legislation/answer-schema.json`; the questions and full rubric are in `evaluation/legislation/questions.json`.

## Publication checks

```sh
python3 scripts/check_legislation_okf.py
python3 -m unittest discover -s tests
cd apps/okf-explorer
pnpm test
pnpm check
pnpm build
cd ../..
python3 scripts/build_okf_bundle.py --check
python3 scripts/update_viewer.py --check
python3 scripts/check_okf.py
python3 scripts/check_documentation_lockstep.py
python3 scripts/build_site.py
```

## Human review prompts

- Did the answer select the correct principal work rather than a related instrument?
- Is every material proposition supported by the cited passage?
- Are qualifications and exceptions preserved?
- Are commencement, extent and amendments addressed rather than assumed?
- Is adverse, conflicting or missing material visible?
- Does the answer state when case law or another source is required?
- Could counsel reproduce the research path from the ledger?
