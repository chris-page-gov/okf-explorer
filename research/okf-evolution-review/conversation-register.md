---
type: "Research"
title: "OKF conversation evidence register"
description: "A privacy-preserving register of the tasks and curated exchanges that materially influenced OKF design decisions."
tags: [okf, conversations, evidence, privacy]
language: en-GB
generated: { by: "process:okf-evolution-review", at: "2026-08-17T00:00:00Z" }
status: stable
---

# OKF conversation evidence register

Conversation history explains intent and alternatives, but Git proves what was
actually retained. This register therefore stores task identifiers, bounded
decision summaries and evidence grades, not private raw transcripts.

| Task or record | Material contribution | Evidence treatment |
| --- | --- | --- |
| Challenge 2 EX-0003, 16 April 2026 | Direct request for the Karpathy Wiki method over all documents and metadata; led to the first located working LLM-Wiki. | Grade A: timestamped, redacted exchange plus same-day commits. |
| Challenge 2 postmortem conversation `conv-002` | Records planned corpus completeness, immutable sources, generated pages, front matter, source register, links, lint and evaluation. | Grade A/B: curated public derivative; raw transcript remains private. |
| `6a804d06-c1c0-83eb-9b47-06262bb12fae`, “My OKF+MCP Journey” | Useful retrospective narrative connecting the April experiment, June OKF discovery, Explorer and MCP. | Grade C: secondary recollection; dates require Git or source corroboration. |
| `6a6fac0d-e5c4-83ed-a4e9-e30ea9497b88`, “OKF Explorer Evaluation Process” | Separated Evaluation Foundry (learning about functionality) from Publication Foundry (assuring a real release). | Grade B: decision record corroborated by later repository documentation. |
| `6a803154-4cac-83eb-935d-6b477bfd19db`, “OKF Project Suitability” | Concluded that OKF complements, rather than replaces, operational ground-risk graphs and domain standards such as AGS, GeoSciML and GeoSPARQL. | Grade B: design evaluation; not an implementation result. |
| `6a7e05a3-26b8-83eb-a75a-08505a533e5c`, “Explore OKF Overview” | Clarified conceptual families versus records/relationships and the value of ordering, aliases, jurisdiction, provenance and review status. | Grade B/C: task-derived figures must be independently verified before reuse as current facts. |
| `019fae88-8129-73c1-a4c5-b502c3500230`, workflow review | Tested and refined the producer workflow. | Grade B: corroborated by methodology and checks. |
| `019fc471-90ec-7633-abde-8e72fcdd5280`, Evaluation Foundry | Developed the explicit evaluation process and fixtures. | Grade B: corroborated by repository artefacts. |
| `019facd3-2406-7813-bb5c-49c3166e44cc` and `019f5071-8029-78e1-98d3-e008b369ba78` | Land Registry scaffolding and legislation status work revealed producer-specific scope, law and provenance needs. | Grade B where tied to commits and reports. |
| `019fdc1d-5f78-7632-80d8-6076dc5e2a18` and `019ff7d3-2d5d-7920-a5a3-33ba8f1e343b` | A citizen-journey ontology task first stalled under a platform safety error, then resumed with stricter governed-record evidence requirements. | Grade A/B for process evidence; failure is retained rather than erased. |
| `019fdc45-2343-79b0-964e-1267f5108825` | Life-in-the-UK work strengthened the need for rich sharded relationships, safe routing and exact identity. | Grade B where the repository contract and tests corroborate it. |

## Conversation census

The app audit reviewed 12 pinned task summaries, the 50 most recent non-pinned
task summaries and 50 archived summaries. The archived cursor had then passed
back to 24 March 2026, before the earliest located 16 April LLM-Wiki event.
The Challenge 2 public postmortem separately indexes all five project
conversations and 53 prompt/response exchange pages from the original build.

The following screened task records contained OKF, wiki or directly related
delivery context but did not need an additional decision row above because
their material outcome is already represented by a repository, report or a
more specific task:

- `019fb285-fa50-7263-99ed-2f0e2c18956b`, “Analyze GeoNetwork in Doomsday map”;
- `019fb2c5-617d-78c1-8713-40da3496175f`, “Design LGR planning portal PoC”;
- `01a0099e-5b51-7ba0-9842-598625b9694d`, “Check OKF bundle site status”;
- `01a0097b-5dbd-7e13-b4ac-38e474a191cb`, “Review product safety explorer”;
- `019feaa8-988b-7812-83df-f0bb66f4ace4`, “Build the OKF beginner curriculum”;
- `019fce22-ea3b-72d3-a699-0fb0db9bc227`, “Scaffold repo for OKF agents”;
- `019f6fd0-8b43-7001-893b-b11ca59a15e1`, “Compare new Domesday repo”;
- `019fa6c0-9e37-79d1-8c89-b075a42cefea`, “Add beginner documentation”;
- `6a687878-e370-83ed-98e1-7afc080dc0d9`, “OKF-ONS Bundle Query”;
- `6a6a06af-928c-83eb-83e2-d58a7f84afee`, “VM BDUK-OKF Access”;
- `019f8866-6fa1-7d71-817d-490361edfacf`, “Assess ChatGPT Sites hosting”; and
- `019e21d9-fe1f-70f1-b61d-c7a084de4eb6`, “Holger test Nottingham, trace llm-wiki”.

Unrelated personal, photographic, health, theological, household and general
software tasks were screened by title/summary and excluded from content review.
This census records the observable app boundary; deleted tasks, inaccessible
sources and private raw transcripts remain outside it.

## Privacy and completeness boundary

Task titles and identifiers are locators, not public evidence by themselves.
No full private transcript is included in the bundle. Claims derived only from
a conversation are labelled accordingly; implementation claims require files,
commits, checks or release evidence. This avoids both disclosing working
conversations and rewriting history as if every suggestion was adopted.
