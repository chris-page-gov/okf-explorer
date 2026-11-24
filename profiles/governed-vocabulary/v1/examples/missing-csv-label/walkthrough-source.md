---
id: missing-csv-label
root: profiles/governed-vocabulary/v1/examples/missing-csv-label
title: Trace a missing label through validation and review
question: Why can CSV still appear in Reader when its preferred label is missing, which constraint fails, and what does the review evidence establish?
answer: >-
  The CSV identifier and its format-scheme membership remain in the graph.
  A navigation label does not establish that skos:prefLabel exists in the
  source. The retained SHACL result does not conform: one minimum-count
  violation concerns the CSV term's skos:prefLabel. Inspect the review record
  alongside that finding; the fixture is an intentional negative control.
records: [csv, formats, cc-by-40, licences, education, topics]
expected_titles: {csv: CSV concept with a missing label, formats: Explorer data formats, cc-by-40: Creative Commons Attribution 4.0 International, licences: Explorer licences, education: Education, topics: Explorer topics}
expected_counts: {records: 6, relationships: 3}
relationships:
  - [csv, formats, belongs to concept scheme]
  - [cc-by-40, licences, belongs to concept scheme]
  - [education, topics, belongs to concept scheme]
sources: [source.nt, data/ontology.json, data/shacl.json, data/review.json]
shacl_conforms: false
missing_label: "https://chris-page-gov.github.io/okf-explorer/profile/governed-vocabulary/v1/#csv"
limitations:
  - The missing preferred label is deliberately retained to exercise validation.
  - A visible navigation label does not resolve the source finding.
  - This fixture must continue to report its non-conforming validation result.
---

Open **csv**, inspect the validation finding, then read the linked review
evidence. Preserve the negative result when handing this bundle to an AI.
