---
id: vocabulary-schemes
root: profiles/governed-vocabulary/v1/examples/vocabulary
title: Distinguish a format, a licence and a topic
question: How can an AI distinguish the CSV format, a licence term and an education topic, and does their presence establish a dataset's reuse conditions?
answer: >-
  Comma-separated values belongs to Explorer data formats. Creative Commons
  Attribution 4.0 International belongs to Explorer licences. Education
  belongs to Explorer topics. The three memberships keep these meanings
  separate. The fixture contains vocabulary terms and schemes, with no
  assertion applying the licence term to an actual dataset.
records: [csv, formats, cc-by-40, licences, education, topics]
expected_titles: {csv: Comma-separated values, formats: Explorer data formats, cc-by-40: Creative Commons Attribution 4.0 International, licences: Explorer licences, education: Education, topics: Explorer topics}
expected_counts: {records: 6, relationships: 3}
relationships:
  - [csv, formats, belongs to concept scheme]
  - [cc-by-40, licences, belongs to concept scheme]
  - [education, topics, belongs to concept scheme]
sources: [source.nt, data/ontology.json, data/shacl.json]
shacl_conforms: true
limitations:
  - Vocabulary membership does not establish a dataset's licence or access conditions.
  - These six terms are an illustrative fragment, not a complete government vocabulary.
  - The three disconnected memberships do not create relationships between the terms.
---

Search for **Comma-separated values**, inspect its scheme, then compare the
licence and topic records. Keep the identifiers and the three source edges
with the answer. The recorded validation result is a separate evidence item.
