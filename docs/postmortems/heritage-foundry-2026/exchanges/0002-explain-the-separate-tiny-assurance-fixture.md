---
"@context":
  - https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/context.jsonld
  - https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/semantic-context.jsonld
"@id": https://chris-page-gov.github.io/okf-explorer/docs/postmortems/heritage-foundry-2026/exchanges/0002-explain-the-separate-tiny-assurance-fixture.html
"@type": https://schema.org/Conversation
type: Conversation
title: "Explain the separate tiny assurance fixture"
description: "Redacted prompt-response exchange EX-0002 from the heritage Foundry task."
generated:
  by: process:heritage-foundry-postmortem-builder
  at: "2026-08-04T13:16:54Z"
assertion_status: normalized
assertion_scope: real-world
tags:
  - postmortem
  - conversation
  - heritage-evaluation-foundry
---
# EX-0002: Explain the separate tiny assurance fixture

[EX-0001](0001-assess-access-and-define-the-heritage-evaluation-foundry.md) | [start-to-finish reader](../readers/conv-001-heritage-evaluation-foundry.md) | [EX-0003](0003-implement-and-publish-the-complete-heritage-exemplar.md)

## Publication Boundary

This is a public-safe derivative of the visible task conversation. It excludes hidden instructions, private reasoning, tool arguments, tool outputs, credentials and local evidence paths. Commentary and final responses are preserved.

## User Prompt

- Timestamp: `2026-08-02T22:02:21.764Z`

````text
Explain with a separate tiny assurance fixture
````

## Codex Response

### Response 1 (final_answer)

- Timestamp: `2026-08-02T22:02:48.693Z`

````text
A separate tiny assurance fixture is a deliberately small, controlled heritage bundle used to prove that the builder and Explorer work correctly before processing the complete Coventry and Warwickshire corpus.

It is separate because the full corpus is large, changes over time, and cannot safely contain deliberately malformed test data.

For example, the fixture might contain 15–30 representative records covering:

- a listed-building point and polygon;
- a scheduled monument;
- a registered park or garden;
- a battlefield;
- multiple grades and local authorities;
- designation and amendment dates;
- several years of Heritage at Risk observations;
- explicit asset–place, asset–person and asset–complex relationships;
- official names, historical names, aliases and controlled misspellings;
- complete and deliberately missing optional metadata.

From this valid base, the tests create isolated negative variants:

- duplicate or missing identifiers;
- invalid geometry or coordinate order;
- unresolved relationship targets;
- ambiguous dates;
- unavailable source links;
- stale observations;
- rights restrictions;
- malformed paths;
- altered search shards;
- digest mismatches.

The two-stage assurance is:

1. **Producer assurance:** build the fixture twice and require byte-identical output, valid schemas, expected search/facet contents and matching plane digests.
2. **Consumer assurance:** load those exact bytes through the real locked Explorer. Verify successful journeys for the valid fixture and explicit degradation or fail-closed behaviour for every negative variant.

The complete regional corpus then serves a different purpose:

| Artifact | What it proves |
|---|---|
| Tiny assurance fixture | Correctness, determinism and known failure behaviour |
| Full Coventry–Warwickshire corpus | Completeness, scale, usefulness and real-world feature coverage |
| Optional synthetic supplement | How unsupported features would look, clearly excluded from claims about the source |

Thus, passing the tiny fixture does not prove that the regional data is complete or semantically correct. It proves that when the full harvest is built, any failures are much more likely to be source or mapping problems—not an unknown defect in the pipeline or Explorer.
````

## Contribution Reading

- User contribution: Asked for the assurance fixture to be explained as a separate product.
- Codex contribution: Separated producer/consumer correctness evidence from regional completeness and synthetic illustration.

[EX-0001](0001-assess-access-and-define-the-heritage-evaluation-foundry.md) | [start-to-finish reader](../readers/conv-001-heritage-evaluation-foundry.md) | [EX-0003](0003-implement-and-publish-the-complete-heritage-exemplar.md)
