# Agent Research Guide

[Documentation spine](index.md) · [Getting started](getting-started.md) · [Personas and journeys](personas-and-user-journeys.md) · [Illustrated manual](illustrated-manual.md) · [Evaluation](evaluation-and-quality.md) · [Maintenance](maintenance.md)

This guide defines how an agent should use the UK Legislation OKF pack without loading the whole corpus or losing provenance.

## Progressive discovery algorithm

1. Fetch `legislation/okf-explorer.json`.
2. Read the descriptor, overview, counts, notices and available facets.
3. Convert the user question into candidate title terms, citation terms, jurisdiction, time and document-type constraints.
4. Search titles locally; use the official remote full-text search when wording rather than title is needed.
5. Rank candidate works, but require identity confirmation from title/type/year/number/official ID.
6. Load only the selected work's official CLML structure.
7. Locate the smallest relevant subdivisions and retain their source IDs.
8. Open selected-passage, work, contents and changes/effects links as required.
9. Check version, commencement, extent and amendment context.
10. Write discrete propositions with a citation ledger and explicit uncertainty.

## Source hierarchy

Prefer, in order:

1. official selected passage and official work/version pages;
2. official CLML/Atom/effects data;
3. normalized OKF identity and navigation metadata;
4. derived topic or quality metadata only as discovery context.

Never cite a derived topic as law. Never turn a catalogue absence into a claim that no legislation exists.

## Minimum answer shape

```json
{
  "question_id": "LQ001",
  "answer": "Answer-first synthesis with qualifications.",
  "propositions": [
    {
      "claim": "One material proposition.",
      "citations": [
        {
          "source_title": "Exact title",
          "url": "https://www.legislation.gov.uk/.../section/6",
          "passage": "Supporting passage",
          "version": "Current text checked on the stated date",
          "retrieved_at": "2026-07-11"
        }
      ]
    }
  ],
  "temporal_context": {
    "version": "...",
    "commencement": "...",
    "extent": "...",
    "amendments": "..."
  }
}
```

## Guardrails

- Say when a conclusion depends on missing facts.
- Distinguish statutory wording from inference and application.
- Identify when case law, retained-EU interpretation or another source class is required.
- Do not describe the latest displayed text as operative everywhere without currency checks.
- Do not imply that the research bulk/SPARQL surfaces were harvested while anonymous access remains restricted.
- Treat source timestamp anomalies as source facts to flag, not values to silently repair.

## Evaluation

Use the [evaluation and quality guide](evaluation-and-quality.md) and the 100-question suite. Automated scores validate observable evidence structure; expert review remains necessary for substantive legal correctness and forensic utility.
