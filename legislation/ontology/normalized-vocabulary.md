---
type: "Legal Ontology"
title: "Normalized legislation vocabulary"
description: "Agent-facing vocabulary covering works, versions, manifestations and every CLML structural level."
resource: "https://legislation.github.io/data-documentation/model/legislation.html"
timestamp: "2026-07-10T22:56:50Z"
tags: ["ontology", "normalized-legislation-vocabulary"]
---

# Model

| Normalized concept | Source signals | Meaning |
|---|---|---|
| Legislation Work | identifier URI | Abstract legal item independent of version |
| Legal Expression | current, enacted/made/adopted, dated, prospective, quashed URI | Text/meaning at a point in time, extent and language |
| Manifestation | `data.xml`, `data.akn`, `data.html`, `data.xht`, `data.pdf`, `data.csv`, `data.rdf` | File-format embodiment |
| Introduction | `PrimaryPrelims`, `SecondaryPrelims`, `EUPrelims` | Preliminary matter |
| Group / Part / Chapter | matching CLML elements | Numbered higher-level divisions |
| Cross-heading | `Pblock`, `PsubBlock` | Titled unnumbered grouping |
| Provision | `P1` with ID prefix | Section, article, regulation, rule or paragraph |
| Nested provision | `P2`–`P7` | Subsection, paragraph, sub-paragraph or deeper level |
| Schedule / Appendix / Attachment / Annex | matching containers and IDs | Supplemental legal text |
| Signature / Explanatory note | `SignedSection`, `ExplanatoryNotes` | Closing and explanatory matter |
| Legal effect | changes/effects feed | Amendment, repeal, substitution, commencement or other impact |

# Citations

[1] [Normalized legislation vocabulary](https://legislation.github.io/data-documentation/model/legislation.html)
[2] [Legislation.gov.uk data model](https://legislation.github.io/data-documentation/model/legislation.html)
