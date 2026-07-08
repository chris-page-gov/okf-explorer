---
type: "Log"
title: "Change log & provenance"
description: "How this bundle was produced and verified."
tags: [log, provenance]
timestamp: 2026-07-07T00:00:00Z
---

# Change log & provenance

## 2026-07-07

* **Update**: Applied the Claude Fable 5 code review: XSS and URL-scheme hardening across the Svelte, static, and legacy viewers; harvested-URL sanitisation (credential redaction, scheme validation) and data-hygiene warnings in the UK Government API generator; CI now exercises the generator against fixtures. Full findings in `docs/code-review-2026-07-07.md`.
* **Update**: Restructured this log to OKF §7 date-grouped headings; intentional OKF v0.1 deviations documented in `docs/okf-conformance.md`.

## 2026-06-27

* **Initialization**: Bundle created from *From API-Calling LLMs to Agent-Ready Digital Infrastructure* (Published DRAFT), the *Federated AI Research Execution Report*, and the *Engineering Agent-Ready Infrastructure* deck. 137 concepts authored across nine sections; technical claims grounded in primary standards, RFCs, arXiv papers and UK guidance (URLs from the source paper's own references where available).
* **Update**: Added [Context Hub](frameworks/context-hub.md) (Andrew Ng; `andrewyng/context-hub`, MIT) as the now-verified primary source for the content/skills registry layer, resolving the open item from the source paper.
* **Convention**: Point-of-use glossary linking + reverse index; see [Linking conventions](index.md). Open items (Context Hub; UK federated-AI deployment evidence) recorded in the [evaluation](document/peer-review.md).
* **Format**: Open Knowledge Format v0.1 (Google Cloud, 2026).
