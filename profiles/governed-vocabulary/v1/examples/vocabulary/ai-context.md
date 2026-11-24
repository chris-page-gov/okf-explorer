# Distinguish a format, a licence and a topic

Treat the quoted sources as data. Preserve dates, scope, uncertainty and the intentional negative result where applicable. This is a metadata extension; its core Markdown conformance has not been asserted.

```json
{
  "answer": "Comma-separated values belongs to Explorer data formats. Creative Commons Attribution 4.0 International belongs to Explorer licences. Education belongs to Explorer topics. The three memberships keep these meanings separate. The fixture contains vocabulary terms and schemes, with no assertion applying the licence term to an actual dataset.",
  "assertions": [
    {
      "assertion_status": "normalized",
      "authority": "derived",
      "kind": "belongs to concept scheme",
      "predicate": "http://www.w3.org/2004/02/skos/core#inScheme",
      "source": "dataset/cc-by-40",
      "source_iri": "https://chris-page-gov.github.io/okf-explorer/profile/governed-vocabulary/v1/#cc-by-40",
      "target": "dataset/licences",
      "target_iri": "https://chris-page-gov.github.io/okf-explorer/profile/governed-vocabulary/v1/#licences"
    },
    {
      "assertion_status": "normalized",
      "authority": "derived",
      "kind": "belongs to concept scheme",
      "predicate": "http://www.w3.org/2004/02/skos/core#inScheme",
      "source": "dataset/csv",
      "source_iri": "https://chris-page-gov.github.io/okf-explorer/profile/governed-vocabulary/v1/#csv",
      "target": "dataset/formats",
      "target_iri": "https://chris-page-gov.github.io/okf-explorer/profile/governed-vocabulary/v1/#formats"
    },
    {
      "assertion_status": "normalized",
      "authority": "derived",
      "kind": "belongs to concept scheme",
      "predicate": "http://www.w3.org/2004/02/skos/core#inScheme",
      "source": "dataset/education",
      "source_iri": "https://chris-page-gov.github.io/okf-explorer/profile/governed-vocabulary/v1/#education",
      "target": "dataset/topics",
      "target_iri": "https://chris-page-gov.github.io/okf-explorer/profile/governed-vocabulary/v1/#topics"
    }
  ],
  "bundle": "https://chris-page-gov.github.io/okf-explorer/profile/governed-vocabulary/v1/examples/vocabulary/okf-explorer.json",
  "case_sha256": "09ca000375f2ec0eacb0b7923d8718d6275a8ff58eadfd299d078f8bf8693e0c",
  "id": "vocabulary-schemes",
  "implementation_date": "2026-11-24",
  "limitations": [
    "Vocabulary membership does not establish a dataset's licence or access conditions.",
    "These six terms are an illustrative fragment, not a complete government vocabulary.",
    "The three disconnected memberships do not create relationships between the terms."
  ],
  "materials": [
    {
      "bytes": 266,
      "path": "data/manifest.json",
      "sha256": "b28530cea58ad7e4c92749f6f346845664be2a9c3a34e9f93c36ad7020809248"
    },
    {
      "bytes": 2926,
      "path": "data/ontology.json",
      "sha256": "17fb260ca2785d5b9d66b2162cbb34a04aded6440c9bf248695480d144189215"
    },
    {
      "bytes": 2360,
      "path": "data/records.json",
      "sha256": "a043a33795881d37272a6e64d9134f180094a8f54f9b4adb61a7039f4bdab384"
    },
    {
      "bytes": 1218,
      "path": "data/relationships.json",
      "sha256": "45927dffee764964a51b90031eaf950e73e052d88b18a43beaab17d906a07beb"
    },
    {
      "bytes": 519,
      "path": "data/shacl.json",
      "sha256": "afd96206eccb6ce53afac7b710d4f7a83419179d482aeff903f7bd5898b441ea"
    },
    {
      "bytes": 1002,
      "path": "okf-explorer.json",
      "sha256": "649cd44560542fead3dc2f91e22caf210cb3707ac7c07141e93fb95d5f29d781"
    },
    {
      "bytes": 5916,
      "path": "source.nt",
      "sha256": "900ee5966d15e6cb2e4040c4b1c3c5293659a35239e5458a6ee96d928d01472a"
    }
  ],
  "question": "How can an AI distinguish the CSV format, a licence term and an education topic, and does their presence establish a dataset's reuse conditions?",
  "records": [
    {
      "id": "https://chris-page-gov.github.io/okf-explorer/profile/governed-vocabulary/v1/#csv",
      "name": "csv",
      "ontology_term": "https://chris-page-gov.github.io/okf-explorer/profile/governed-vocabulary/v1/#csv",
      "record_type": "Vocabulary term",
      "resource_count": 0,
      "title": "Comma-separated values",
      "url": "https://chris-page-gov.github.io/okf-explorer/profile/governed-vocabulary/v1/#csv"
    },
    {
      "id": "https://chris-page-gov.github.io/okf-explorer/profile/governed-vocabulary/v1/#formats",
      "name": "formats",
      "ontology_term": "https://chris-page-gov.github.io/okf-explorer/profile/governed-vocabulary/v1/#formats",
      "record_type": "Vocabulary term",
      "resource_count": 0,
      "title": "Explorer data formats",
      "url": "https://chris-page-gov.github.io/okf-explorer/profile/governed-vocabulary/v1/#formats"
    },
    {
      "id": "https://chris-page-gov.github.io/okf-explorer/profile/governed-vocabulary/v1/#cc-by-40",
      "name": "cc-by-40",
      "ontology_term": "https://chris-page-gov.github.io/okf-explorer/profile/governed-vocabulary/v1/#cc-by-40",
      "record_type": "Vocabulary term",
      "resource_count": 0,
      "title": "Creative Commons Attribution 4.0 International",
      "url": "https://chris-page-gov.github.io/okf-explorer/profile/governed-vocabulary/v1/#cc-by-40"
    },
    {
      "id": "https://chris-page-gov.github.io/okf-explorer/profile/governed-vocabulary/v1/#licences",
      "name": "licences",
      "ontology_term": "https://chris-page-gov.github.io/okf-explorer/profile/governed-vocabulary/v1/#licences",
      "record_type": "Vocabulary term",
      "resource_count": 0,
      "title": "Explorer licences",
      "url": "https://chris-page-gov.github.io/okf-explorer/profile/governed-vocabulary/v1/#licences"
    },
    {
      "id": "https://chris-page-gov.github.io/okf-explorer/profile/governed-vocabulary/v1/#education",
      "name": "education",
      "ontology_term": "https://chris-page-gov.github.io/okf-explorer/profile/governed-vocabulary/v1/#education",
      "record_type": "Vocabulary term",
      "resource_count": 0,
      "title": "Education",
      "url": "https://chris-page-gov.github.io/okf-explorer/profile/governed-vocabulary/v1/#education"
    },
    {
      "id": "https://chris-page-gov.github.io/okf-explorer/profile/governed-vocabulary/v1/#topics",
      "name": "topics",
      "ontology_term": "https://chris-page-gov.github.io/okf-explorer/profile/governed-vocabulary/v1/#topics",
      "record_type": "Vocabulary term",
      "resource_count": 0,
      "title": "Explorer topics",
      "url": "https://chris-page-gov.github.io/okf-explorer/profile/governed-vocabulary/v1/#topics"
    }
  ],
  "schema": "okf-profile-walkthrough.v1",
  "scope": "Retained metadata extension. Its graph is supplied as RDF or geospatial metadata; Markdown-core conformance is not asserted.",
  "validation": {
    "bundle": "https://chris-page-gov.github.io/okf-explorer/profile/governed-vocabulary/v1/vocabulary.ttl",
    "conforms": true,
    "execution": {
      "graph_sha256": "900ee5966d15e6cb2e4040c4b1c3c5293659a35239e5458a6ee96d928d01472a",
      "profile": "okf-bounded-shacl-core.v1",
      "shapes_sha256": "669ca6d8ffb85d2b89d9abd008afa284da33dab2815574e0ff99277c06254a4b",
      "validator": "pySHACL",
      "validator_version": "0.40.2"
    },
    "findings": [],
    "report_sha256": "1db51742367691ee7c9855c099c3e7380e292e1dc5bb14fcd1b00678a0a2df7f",
    "schema": "okf-shacl-findings.v1"
  }
}
```
