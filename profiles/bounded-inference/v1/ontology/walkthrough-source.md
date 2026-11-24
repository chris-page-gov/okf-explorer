---
id: prov-hierarchy
root: profiles/bounded-inference/v1/ontology
title: Follow the recorded provenance hierarchies
question: How does the retained graph connect revisions to derivations and influences, and can it prove that a particular government document was revised?
answer: >-
  The class path is Revision → Derivation → Entity influence. The property
  path is wasRevisionOf → wasDerivedFrom → wasInfluencedBy. These are four
  recorded hierarchy assertions. They describe vocabulary relationships;
  the fixture contains no government document instance or revision event.
records: [Revision, Derivation, EntityInfluence, wasRevisionOf, wasDerivedFrom, wasInfluencedBy]
expected_titles: {Revision: Revision, Derivation: Derivation, EntityInfluence: Entity influence, wasRevisionOf: wasRevisionOf, wasDerivedFrom: wasDerivedFrom, wasInfluencedBy: wasInfluencedBy}
expected_counts: {records: 6, relationships: 4}
relationships:
  - [Revision, Derivation, subclass of]
  - [Derivation, EntityInfluence, subclass of]
  - [wasRevisionOf, wasDerivedFrom, subproperty of]
  - [wasDerivedFrom, wasInfluencedBy, subproperty of]
sources: [source.nt, data/ontology.json]
limitations:
  - This is a retained fragment, not the complete PROV-O ontology.
  - A hierarchy path is not an assertion that a particular document was revised.
  - The diagram shows the four recorded edges; no transitive edge is added.
---

Start with **Revision**, inspect its parent, then follow the separate property
hierarchy. Check the source triples before using the vocabulary in an answer.
The existing W3C source and authority fields are retained in the evidence.
