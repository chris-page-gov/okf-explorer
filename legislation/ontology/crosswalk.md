---
type: "Legal Ontology"
title: "Legal standards crosswalk"
description: "Normalized relationships between the source model and interoperable vocabularies."
resource: "https://legislation.github.io/data-documentation/model/legislation.html"
timestamp: "2026-07-10T22:56:50Z"
tags: ["ontology", "legal-standards-crosswalk"]
---

# Model

| Source concept | ELI | Schema.org | Explorer vocabulary |
|---|---|---|---|
| Item identifier URI | `eli:LegalResource` | `schema:Legislation` | Legislation Work |
| Point-in-time document URI | `eli:LegalExpression` | `legislationDateVersion` | Legal Expression |
| CLML/AKN/HTML/PDF | `eli:Format` | `encoding` / `LegislationObject` | Manifestation |
| Part/Chapter/P1–P7/Schedule | `eli:LegalResourceSubdivision` | `schema:Legislation` + `isPartOf` | Provision node |
| Effect | ELI-I `Impact` / ELI change properties | `legislationChanges` specializations | Legal effect |
| Official URI | `eli:uri_schema` / `eli:id_local` | `legislationIdentifier` | Provenance link |

# Citations

[1] [Legal standards crosswalk](https://legislation.github.io/data-documentation/model/legislation.html)
[2] [Legislation.gov.uk data model](https://legislation.github.io/data-documentation/model/legislation.html)
