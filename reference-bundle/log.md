# Change log & provenance

## 2026-07-25

* **Format**: Migrated the canonical Markdown bundle to OKF v0.2. Concepts now use structured `generated`, `verified`, `status` and `sources` frontmatter; reserved indexes and this log use their v0.2 structures.
* **Compatibility**: Kept v0.1 consumption through `timestamp` and body `# Citations` fallbacks while giving v0.2 fields precedence.
* **Explorer**: Added explicit trust-tier, lifecycle, freshness, provenance and passive Attested Computation contract presentation. Loading a bundle never executes declared computation, executor or attester resources.

## 2026-07-07

* **Update**: Applied the Claude Fable 5 code review: XSS and URL-scheme hardening across the Svelte, static, and legacy viewers; harvested-URL sanitisation (credential redaction, scheme validation) and data-hygiene warnings in the UK Government API generator; CI now exercises the generator against fixtures. Full findings in `docs/code-review-2026-07-07.md`.
* **Update**: Restructured this log to OKF §7 date-grouped headings; intentional OKF v0.1 deviations documented in `docs/okf-conformance.md`.

## 2026-06-27

* **Initialization**: Bundle created from *From API-Calling LLMs to Agent-Ready Digital Infrastructure* (Published DRAFT), the *Federated AI Research Execution Report*, and the *Engineering Agent-Ready Infrastructure* deck. 137 concepts authored across nine sections; technical claims grounded in primary standards, RFCs, arXiv papers and UK guidance (URLs from the source paper's own references where available).
* **Update**: Added [Context Hub](frameworks/context-hub.md) (Andrew Ng; `andrewyng/context-hub`, MIT) as the now-verified primary source for the content/skills registry layer, resolving the open item from the source paper.
* **Convention**: Point-of-use glossary linking + reverse index; see [Linking conventions](index.md). Open items (Context Hub; UK federated-AI deployment evidence) recorded in the [evaluation](document/peer-review.md).
* **Format**: Open Knowledge Format v0.1 (Google Cloud, 2026).
