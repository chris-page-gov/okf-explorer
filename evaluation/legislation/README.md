# UK legislation AI-answer evaluation

This suite measures whether an AI can produce a useful, source-grounded answer for counsel—not merely retrieve a title. Its 100 questions span primary and secondary legislation, retained-EU material, devolution, public and private law, criminal law, procedure, employment, family, housing, planning, data and commercial law.

Every material proposition must appear in `propositions[]` with one or more citations. Each citation names the authority, links directly to a selected official passage, supplies the supporting passage and records the retrieval date. The separate `temporal_context` forces the answer to address version, commencement, territorial extent and amendments rather than silently treating the latest displayed text as universally operative.

The 100-point rubric is deliberately capped below 50 when an answer has no official citation, omits its proposition ledger, leaves a proposition uncited or fails to cite the expected selected passage. Automated checks cover 60 points; the remaining 40 require expert review because legal correctness, completeness and forensic utility cannot safely be inferred from keyword matching.

Run:

```bash
python3 scripts/build_legislation_evaluation.py
python3 scripts/evaluate_legislation_answers.py answers.jsonl --out results.json
```

Answers must conform to [answer-schema.json](answer-schema.json). `questions.json` is generated deterministically by `scripts/build_legislation_evaluation.py` and contains the full rubric, source passages and expected concepts.

The suite tests statutory research rather than providing legal advice. A high score is evidence about performance on this fixed suite, not assurance for an unseen matter. Expert reviewers should verify every cited passage and record disagreements.
