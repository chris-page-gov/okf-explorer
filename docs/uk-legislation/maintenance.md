# Maintenance Guide

[Documentation spine](index.md) · [Getting started](getting-started.md) · [Personas and journeys](personas-and-user-journeys.md) · [Illustrated manual](illustrated-manual.md) · [Agent guide](agent-research-guide.md) · [Evaluation](evaluation-and-quality.md)

This guide keeps the corpus, documentation spine and illustrated manual independently updateable but synchronized.

## Source-of-truth map

| Surface | Source of truth | Generated or maintained output |
|---|---|---|
| work catalogue and facets | official Atom feeds plus `scripts/build_legislation_okf.py` | `legislation/` |
| provision normalization | `apps/okf-explorer/src/lib/legislation/structure.ts` | live browser CLML tree |
| answer benchmark | `scripts/build_legislation_evaluation.py` | `evaluation/legislation/questions.json` |
| documentation spine | `docs/uk-legislation/` and `docs/uk-legislation-okf.md` | Pages `docs/` routes |
| screenshots | hosted Explorer states in `manifest.json` | `docs/assets/uk-legislation-manual/` |

## Corpus refresh

```sh
python3 scripts/build_legislation_okf.py --refresh
python3 scripts/check_legislation_okf.py
```

Update corpus counts, represented years, type coverage and any upstream-access conflict in the architecture guide and screenshots. Preserve source anomalies as warnings rather than silently rewriting them.

## Screenshot refresh contract

Screenshots are 1280×720 JPEG captures unless the manifest declares a deliberate crop. For each item:

1. open the recorded `route`;
2. perform the recorded `interactions` in order;
3. wait until every `expected_text` value is present;
4. capture the viewport;
5. crop only when the screenshot's declared `crop` requires it;
6. inspect the image at original resolution;
7. update `captured_at`, dimensions and corpus generation timestamp in the manifest;
8. update the manual if the interaction or expected behaviour changed.

Refresh screenshots when:

- the Explorer layout or legislation detail card changes;
- counts or generation timestamps shown in an image are no longer the intended documentation checkpoint;
- search ranking materially changes;
- normalized CLML labels or passage actions change;
- an image fails visual inspection or no longer matches its user journey.

Do not refresh screenshots merely to erase a documented upstream anomaly.

## Documentation review

Check each spine in this order:

1. [Getting started](getting-started.md) — task steps and labels.
2. [Personas and journeys](personas-and-user-journeys.md) — needs, risks and success criteria.
3. [Illustrated manual](illustrated-manual.md) — current states and expected behaviour.
4. [Agent guide](agent-research-guide.md) — progressive discovery and evidence contract.
5. [Architecture](../uk-legislation-okf.md) — counts, ontology, access and limitations.
6. [Evaluation](evaluation-and-quality.md) — rubric, schema and commands.

## Publication checklist

- Regenerate deterministic outputs whose source changed.
- Run all commands in [Evaluation and quality](evaluation-and-quality.md).
- Confirm `git diff --check` and documentation lockstep.
- Build `_site/` and verify every manual image is copied.
- Open the hosted Explorer URL after Pages deployment.
- Verify the documentation spine landing page and at least one image URL.
- Record the user-visible update in `CHANGELOG.md`.
