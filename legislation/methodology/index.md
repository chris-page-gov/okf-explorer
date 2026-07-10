---
type: "Methodology"
title: "Corpus completeness, provenance and limitations"
description: "How the complete website corpus is enumerated, normalized, validated and refreshed."
resource: "https://www.legislation.gov.uk/all/data.feed"
timestamp: "2026-07-10T22:56:50Z"
tags: ["methodology", "provenance", "quality"]
---

# Completeness contract

* Every official `facetYear` partition is retrieved with `results-count=10000`.
* The received count for each year must exactly match its advertised facet total or generation stops.
* IDs are deduplicated across year and draft feeds.
* **365,786** unique works were emitted from **397** source requests or cache reads.
* Every work retains the official identifier, document, CLML, table-of-contents and manifestation links advertised by its Atom entry.
* Every addressable subdivision is discoverable from its work's official CLML on demand; subdivision instances are not duplicated in Git.

# Source conflict retained

The public documentation advertises SPARQL and bulk downloads, but both surfaces returned HTTP 401 to anonymous clients during implementation. The Atom and document APIs remained available and are the build source. Topic labels are explicitly derived because the linked-data documentation says subject-classification data are a future development.

# Legal-use warning

Latest-available text may have unapplied changes and is not guaranteed to be legally current. Historical coverage, effects and format availability vary. Answers must cite work/provision URI, version/extent/language context and retrieved passage.

# Citations

[1] [Atom API](https://legislation.github.io/data-documentation/api/overview.html)
[2] [Coverage limitations](https://legislation.github.io/data-documentation/what-we-have.html)
[3] [Linked Data limitations](https://legislation.github.io/data-documentation/api/linked-data.html)
[4] [Fair use](https://legislation.github.io/data-documentation/fair-use.html)
