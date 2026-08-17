---
type: "Research"
title: "OKF standards decision ledger"
description: "Ledger of incorporated, adapted, deferred and rejected elements across OKF, YAML-LD, linked data, catalogue, API, provenance and domain standards."
tags: [okf, standards, yaml-ld, decisions]
language: en-GB
generated: { by: "process:okf-evolution-review", at: "2026-08-17T00:00:00Z" }
status: stable
---

# OKF standards decision ledger

“Aligned” does not mean “conformant”. Each standard keeps its own validation
and maturity. The Bundle Wiki profile is explicitly additive.

| Standard or influence | Incorporated | Adapted, deferred or ignored | Reason |
| --- | --- | --- | --- |
| Karpathy-style LLM-Wiki | Small Markdown files, progressive disclosure, indexes and human/agent navigability. | Obsidian-only wikilinks and one-tool dependence were dropped; browser-compatible links and generated viewers were preferred. | Portable plain text and inspectable context mattered more than one notebook application. |
| Google OKF 0.1 | Bundle shape, Markdown concepts, static exchange and a simple viewer. | It did not define the project's rich relationship authority, federation, sharding or UI. | A small common envelope accelerated adoption but could not answer provenance and scale questions alone. |
| Google OKF 0.2 | Minimal core, `type`, tolerant unknown fields, provenance/trust/lifecycle/attestation direction and progressive disclosure. | Profile-only requirements are never claimed as universal core. Untyped links remain valid core input but are insufficient as semantic authority here. | Preserve interoperability and forward compatibility while stating stricter local needs honestly. |
| YAML-LD 1.0 | Human-authorable YAML-LD, `.yamlld`, local context and deterministic JSON-LD projection. | The Reader does not fetch arbitrary remote contexts or run general reasoning. The Working Draft is pinned and labelled experimental. | YAML is author-friendly; bounded local resolution prevents network, security and reproducibility failures. |
| JSON-LD 1.1 / RDF | Absolute IRIs, explicit predicates, direct triples and reified evidence-bearing assertions. | RDF is a semantic projection, not the Markdown UI or operational database. | Machines need stable identity and graph semantics; people still need readable documents. |
| RDF/RDFS/OWL | RDF subject/predicate/object, labels and deliberately bounded ontology terms. | No unrestricted OWL inference; `owl:sameAs` is never inferred from matching text. | Strong inference can turn a weak match into a false fact. |
| SKOS | Preferred labels and qualified concept mappings such as exact, close, broad, narrow and related match. | Mapping strength is not collapsed into identity. | Concept similarity needs more nuance than equality. |
| PROV-O and Dublin Core Terms | Source, activity, observation time, derivation, rights, licence and evidence links. | A full activity graph is not required for every simple core document. | Evidence must be available where material without making the core unusably heavy. |
| DCAT 3 and DCAT-AP | Catalogue, dataset, distribution and data-service mappings; export readiness and gaps. | Current Markdown/JSON packs are “DCAT-alignable”, not DCAT-AP conformant without RDF and cardinality validation. | Reuse catalogue semantics without overstating the emitted artefact. |
| DQV | Quality vocabulary and future export target. | Quality percentages are not called DQV assurance where no DQV RDF is emitted. | Avoid laundering internal completeness measures into a standards claim. |
| OpenAPI, AsyncAPI and Arazzo | Links to executable API contracts and workflow descriptions. | OKF does not replace or invent paths, operations, schemas, security flows or workflows. | OKF describes and governs an estate; executable domain contracts remain authoritative for execution. |
| SHACL and JSON Schema 2020-12 | Shape/schema validation of rich assertions and generated structures. | Cross-repository samples are regression signals, not substitutes for every producer validating every assertion. | Consumer sampling cannot prove producer completeness. |
| CPSV-AP | Selective modelling of evidenced public services, competent authorities, events and channels. | Editorial life stages are not automatically public services; the profile is not imposed on unrelated domains. | Domain semantics must answer a real competency question. |
| ELI | Legislation identity and legal-resource semantics where the legislation producer can support them. | No legal relevance is inferred from keywords and the bundle does not provide legal advice. | Formal legal identity does not remove the need for professional interpretation. |
| GeoSPARQL, GeoSciML and AGS | Referenced for geometry, geoscience and ground-investigation interoperability. | OKF does not replace spatial computation, borehole exchange or domain databases. | Domain standards are richer and operationally proven. |
| MCP (2025-06-18 and 2026-07-28) | Resources, tools, prompts, discovery, bounded context and read-only access pattern. | The prototype avoids pretending that all deployed clients support the newer stateless core; transport and version negotiation remain explicit. | MCP can make retrieval measurable, but protocol adoption is still moving. |
| W3C Data on the Web Best Practices | Stable identifiers, vocabulary reuse, provenance, licences, coverage, feedback and human/machine views. | “Publish more links” is replaced by denominator-based, evidenced useful-link coverage. | A smaller true graph is better than a large misleading one. |

## Project-specific divergence

The largest deliberate divergence from minimal OKF is the
`okf:RelationshipAssertion`. Each material directed relationship has a stable
assertion identity, source and target IRIs and routes, predicate IRI, preferred
and inverse labels, status, scope, authority, derivation, observation time,
evidence and rights. A deterministic build emits both the direct triple and
the evidence-bearing assertion. This is stricter than OKF core, so it is
published under a separate profile URI and vendored byte for byte by producers
that claim that profile.
