---
type: "Research"
title: "OKF grounding and compact retrieval evidence"
description: "Evidence, limits and evaluation design for using OKF bundles to ground language models with compact, attributable context."
tags: [okf, grounding, retrieval, llm, evaluation]
language: en-GB
generated: { by: "process:okf-evolution-review", at: "2026-08-17T00:00:00Z" }
status: stable
---

# OKF grounding and compact retrieval evidence

Grounding means giving a model the relevant evidence for a question and
requiring the answer to stay within it. An OKF bundle helps because its content
is small, addressable, source-linked and quality-labelled. It cannot make an
unsupported answer true, repair a wrong source, or guarantee that a model
obeys instructions.

## Evidence already obtained

The Microsoft 365 Copilot development trial over 293 governed families kept
all 293 assessed responses within the defined safety boundary and selected the
exact expected family for 292. The one failure was a near-neighbour identity
collision between a general Universal Credit family and the more specific
unemployment case. That is 99.6587% strict selection accuracy for the authored
development schedule, not a universal accuracy figure. Raw transcripts remain
private; the schedule was not an independent holdout; OneNote and a negative
permission test remain open.

This result supports four narrower claims:

1. stable family identity and compact facts can make errors visible;
2. direct prompts and links can work well in an existing enterprise product;
3. near-neighbour disambiguation needs explicit aliases, scope and ranking;
4. rate limits and permission boundaries are part of retrieval quality.

It does not isolate the effect of OKF from the model, SharePoint index,
authored questions or prompt. The MCP evaluation in this review therefore
measures retrieval size and expected-record selection separately from answer
quality.

## Compact context contract

A useful context pack contains only:

- the question and retrieval method;
- selected record identity, title, type, status and timestamp;
- the smallest relevant body excerpt;
- material relationship rows with direction and authority;
- source and rights links;
- integrity digest and bundle identity; and
- explicit omissions, truncation and unresolved ambiguity.

The prototype enforces byte and result limits before returning text. It reports
an estimated token count (`ceil(characters / 4)`) only as a repeatable proxy;
real tokenisation varies by model.

## Evaluation layers

| Layer | Metric | What it can establish |
| --- | --- | --- |
| Retrieval | expected record in top-k, reciprocal rank, ambiguity count | Whether indexing selects the intended evidence. |
| Compactness | input bytes, returned bytes, estimated tokens, reduction ratio | Whether access avoids sending the whole bundle. |
| Attribution | answer claims linked to supplied record/source IDs | Whether a reviewer can trace an answer. |
| Answer faithfulness | supported, contradicted and unsupported claims | Whether the model stayed inside the evidence. |
| Answer correctness | expert-scored exact answer and material omissions | Whether the final answer meets the domain need. |
| Safety | inaccessible-record, stale-data, rights and advice-boundary tests | Whether retrieval respects constraints under adverse cases. |
| Operations | latency, error rate, throttling and cache behaviour | Whether the system works reliably at the intended scale. |

The report treats a compactness win as necessary but not sufficient. An empty
answer is tiny; a highly compressed wrong record is dangerous. The preferred
comparison freezes one bundle and question set, then tests prompt-plus-link,
MCP retrieval and any vector/semantic variant against the same ground truth.

## Where OKF is strong and weak

OKF is strong for bounded, mostly documentary knowledge where identity,
provenance, progressive disclosure, human review and portable publication
matter. It is weak as a transactional system, rapidly changing operational
database, numerical analysis engine, confidential access-control authority,
general ontology reasoner or substitute for professional judgement. Those
systems should be linked through governed interfaces, not copied wholesale
into Markdown.
