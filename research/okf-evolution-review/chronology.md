---
type: "Research"
title: "OKF evolution chronology"
description: "Primary-evidence chronology from the April 2026 LLM-Wiki experiment to the August 2026 semantic and assurance profile."
tags: [okf, history, evidence, yaml-ld]
language: en-GB
generated: { by: "process:okf-evolution-review", at: "2026-08-17T00:00:00Z" }
status: stable
---

# OKF evolution chronology

Dates below are Git commit times unless explicitly identified as a conversation
time or standards publication date. A commit proves that a repository recorded
a change by that time; it does not prove the exact start of the underlying
thinking or public deployment.

| Date and time (Europe/London unless marked) | Evidence | What changed | Interpretation |
| --- | --- | --- | --- |
| 16 April 2026, 08:51:25Z | Challenge 2 conversation EX-0003 | The user asked to translate all supplied documents and metadata using the “Karpathy Wiki method” into an Obsidian-navigable knowledge base. | This is the earliest located primary conversation evidence for the LLM-Wiki approach. |
| 16 April 2026, 10:15–14:10 | Commits `022b67`, follow-up documentation, architecture and evaluation commits | A 43-document immutable-source, generated-Markdown wiki gained indexes, metadata, provenance, links, linting and an evaluation harness. | The core pattern was already “small auditable corpus plus deterministic navigation”, before OKF terminology. |
| 19–20 April 2026 | Challenge repository commits | Copilot prompts, MCP research and a Wiki MCP evaluation were added. | Prompt-and-files and tool-mediated retrieval began as parallel access paths, not successive replacements. |
| 14–15 May 2026 | `mcp-geo` and `assertion-seelinks` commits | Postmortem capture and another LLM-Wiki scaffold appeared. | The method began to be reused across domains. |
| 2–18 June 2026 | Agent-harness, discourse, WCC mapping and Domesday commits | More LLM-Wikis appeared; WCC repositories recorded “Adopt OKF wiki standard” on 18 June. | Terminology shifted from a technique to a portable knowledge product. Early “standard” wording was aspirational, not a formal conformance claim. |
| 23–30 June 2026 | `api-mcp-wiki`, `seelinks`, hackathon and `govuk-casa` commits | Publication-ready OKF bundle, metadata schema, static viewer and OKF 0.1 viewer patterns were recorded. | OKF 0.1 supplied a minimal exchange envelope; the inherited wiki supplied human navigation and provenance conventions. |
| 27 June 2026 | OKF source capture in the challenge postmortem | Google OKF material and the Karpathy source were pinned with retrieval metadata and licence cautions. | External influence became explicitly evidenced rather than recollected. |
| 4 July 2026, 12:48–20:36 | Explorer commits `12a4b366`, `5ff1ccb0`, `cdd06d1f` | The Svelte OKF Explorer was created and large-corpus views completed and reviewed. | Display moved beyond a single static HTML viewer to search, facets, multiple views and durable state. |
| 11 July 2026, 13:47 | Commit `28331c9f` | YAML-LD Bundle Wiki profile foundation added. | A semantic authority layer was made additive to OKF, not smuggled into the small core. |
| 11 July 2026, 18:04–18:38 | UK Legislation, UK Government APIs, AI Infrastructure and compatibility repositories | Independently published bundle wikis and migration compatibility layers appeared. | Federation and stable old URLs became design requirements. |
| 17–23 July 2026 | ONS, ELS, GOV.UK retrieval and provider-snapshot work | Larger real catalogues and retrieval evaluations exposed scale, provenance and live-reference problems. | A bundle needed governed snapshots and integrity, not merely more Markdown. |
| 24 July 2026 | Google published OKF v0.2 trust-signal material | OKF gained stronger provenance, lifecycle and attestation concepts while retaining a minimal, tolerant core. | The project adopted v0.2 and kept richer relationship requirements in its own named profile. |
| 25 July 2026 | Explorer v0.2 exemplar and producer migrations | Planning and GOV.UK content moved to OKF 0.2. | Core versioning and Explorer extensions were separated explicitly. |
| 28 July 2026 | W3C YAML-LD Working Draft and MCP 2026-07-28 publication | YAML-LD advanced as a Working Draft; MCP introduced a stateless core and discovery method. | Both were moving standards. Implementations therefore require pinned versions and honest maturity labels. |
| 29 July–3 August 2026 | Land Registry and heritage Evaluation Foundry work | A full producer/reviewer/release process exposed late semantic, presentation, rights and platform defects. | Validation had to start earlier and run by affected dependency plane. |
| 10 August 2026, 08:44–12:32 | Semantic contract, Explorer v0.6.0 and pinned profile commits | Stable assertion IDs, explicit predicates, evidence, authority, safe URLs, generated projections and byte-identical vendoring became enforceable. | This is the point at which “linked Markdown” became a governed evidence-bearing semantic product. |
| 12 August 2026 | Land Registry retrospective, Explore OKF method and locked `uv` toolchain | Citizen labels, competency questions, denominator-based link coverage, bounded exploratory publication and reproducible Python were added. | Human comprehension and early learning became first-class assurance gates. |
| 16 August 2026 | Copilot trial and beginner guidance merge | A 293-case governed retrieval development run was consolidated. | The strongest current evidence supports high retrieval accuracy, but not a universal accuracy claim. |
| 17 August 2026 | This review snapshot | 138 repositories scanned, 26 candidates curated; report, review bundle, UI path, MCP prototype and evaluation built together. | The journey is now inspectable as evidence rather than only a retrospective story. |

## Duration

The located primary journey spans 123 days from the 16 April request to this
17 August review. The first working LLM-Wiki was produced in hours; a reusable
Explorer arrived about 79 days later; the YAML-LD foundation followed one week
after that; and the enforceable cross-repository semantic contract took a
further 30 days. The quick first result and slower assurance work are both
important: the former proved usefulness, while the latter made limitations,
identity and evidence increasingly explicit.
