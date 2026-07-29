# Agent Research Guide

[Documentation spine](index.md) · [Getting started](getting-started.md) · [Personas and journeys](personas-and-user-journeys.md) · [Illustrated manual](illustrated-manual.md) · [Evaluation](evaluation-and-quality.md) · [Maintenance](maintenance.md)

This guide defines how an agent should use the UK Legislation OKF pack without loading the whole corpus or losing provenance.

## Progressive discovery algorithm

1. Fetch
   `https://chris-page-gov.github.io/okf-uk-legislation/okf-explorer.json`.
2. Read the descriptor, overview, counts, notices and available facets.
3. Convert the user question into candidate title terms, citation terms, jurisdiction, time and document-type constraints.
4. Follow the descriptor's declared static-search manifest and filter postings;
   never guess a raw repository path.
5. Treat facet membership as snapshot-bound navigation metadata. In
   particular, the jurisdiction facet is territorial publication context
   inferred from official type code, not proof of provision-level extent or
   applicability.
6. Rank candidate works, but require identity confirmation from
   title/type/year/number/official ID.
7. Follow the declared relationship-adjacency manifest to load the selected
   work's bounded core assertion shard.
8. Resolve the selected route through the declared record locator. When the
   descriptor declares governed `model_enrichment_v3`, use that record-chunk
   index to load the same-index accepted enrichment chunk and retain only rows
   whose source or target is the selected route.
9. Load only the selected work's official CLML structure.
10. Locate the smallest relevant subdivisions and retain their source IDs.
11. Open selected-passage, work, contents and changes/effects links as
    required.
12. Check version, commencement, extent and amendment context.
13. Write discrete propositions with a citation ledger and explicit
    uncertainty.

The compact JSON record and relationship planes are suitable for AI access;
they do not need to be duplicated into one giant RDF document. Root YAML-LD
and JSON-LD, plus the Whole-Law federation's Turtle projection, describe the
governed semantic contract; search postings, core adjacency shards and aligned
accepted model-enrichment chunks provide scalable traversal.

Current limitation: core and model-assisted relationships have separate
bounded paths. Core assertions use the relationship-adjacency manifest;
governed v3 assertions use the selected route's record-locator chunk index and
the aligned accepted enrichment chunk. Official effects remain available in
the release-wide effect datapack and reconciliation material but are not yet
source-and-target indexed per selected work. State that limit explicitly when
answering a relationship-completeness question.

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
