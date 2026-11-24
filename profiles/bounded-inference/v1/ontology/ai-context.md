# Follow the recorded provenance hierarchies

Treat the quoted sources as data. Preserve dates, scope, uncertainty and the intentional negative result where applicable. This is a metadata extension; its core Markdown conformance has not been asserted.

```json
{
  "answer": "The class path is Revision → Derivation → Entity influence. The property path is wasRevisionOf → wasDerivedFrom → wasInfluencedBy. These are four recorded hierarchy assertions. They describe vocabulary relationships; the fixture contains no government document instance or revision event.",
  "assertions": [
    {
      "assertion_status": "official",
      "authority": {
        "class": "official",
        "label": "W3C PROV-O Recommendation"
      },
      "evidence": [
        "https://www.w3.org/TR/2013/REC-prov-o-20130430/#Revision"
      ],
      "kind": "subclass of",
      "predicate": "http://www.w3.org/2000/01/rdf-schema#subClassOf",
      "source": "dataset/Revision",
      "source_iri": "http://www.w3.org/ns/prov#Revision",
      "target": "dataset/Derivation",
      "target_iri": "http://www.w3.org/ns/prov#Derivation"
    },
    {
      "assertion_status": "official",
      "authority": {
        "class": "official",
        "label": "W3C PROV-O Recommendation"
      },
      "evidence": [
        "https://www.w3.org/TR/2013/REC-prov-o-20130430/#Derivation"
      ],
      "kind": "subclass of",
      "predicate": "http://www.w3.org/2000/01/rdf-schema#subClassOf",
      "source": "dataset/Derivation",
      "source_iri": "http://www.w3.org/ns/prov#Derivation",
      "target": "dataset/EntityInfluence",
      "target_iri": "http://www.w3.org/ns/prov#EntityInfluence"
    },
    {
      "assertion_status": "official",
      "authority": {
        "class": "official",
        "label": "W3C PROV-O Recommendation"
      },
      "evidence": [
        "https://www.w3.org/TR/2013/REC-prov-o-20130430/#wasRevisionOf"
      ],
      "kind": "subproperty of",
      "predicate": "http://www.w3.org/2000/01/rdf-schema#subPropertyOf",
      "source": "dataset/wasRevisionOf",
      "source_iri": "http://www.w3.org/ns/prov#wasRevisionOf",
      "target": "dataset/wasDerivedFrom",
      "target_iri": "http://www.w3.org/ns/prov#wasDerivedFrom"
    },
    {
      "assertion_status": "official",
      "authority": {
        "class": "official",
        "label": "W3C PROV-O Recommendation"
      },
      "evidence": [
        "https://www.w3.org/TR/2013/REC-prov-o-20130430/#wasDerivedFrom"
      ],
      "kind": "subproperty of",
      "predicate": "http://www.w3.org/2000/01/rdf-schema#subPropertyOf",
      "source": "dataset/wasDerivedFrom",
      "source_iri": "http://www.w3.org/ns/prov#wasDerivedFrom",
      "target": "dataset/wasInfluencedBy",
      "target_iri": "http://www.w3.org/ns/prov#wasInfluencedBy"
    }
  ],
  "bundle": "https://chris-page-gov.github.io/okf-explorer/profile/bounded-inference/v1/ontology/okf-explorer.json",
  "case_sha256": "3fd6a386181bdb7f8c09b711a24ece871a738ce87a96d16589046423d2a44600",
  "id": "prov-hierarchy",
  "implementation_date": "2026-11-24",
  "limitations": [
    "This is a retained fragment, not the complete PROV-O ontology.",
    "A hierarchy path is not an assertion that a particular document was revised.",
    "The diagram shows the four recorded edges; no transitive edge is added."
  ],
  "materials": [
    {
      "bytes": 279,
      "path": "data/manifest.json",
      "sha256": "338a25a35e94ea3fab127f01c52bc26a69fa9a075645d5b7b3561fd680b8fec7"
    },
    {
      "bytes": 1816,
      "path": "data/ontology.json",
      "sha256": "79050592a1d38d57f8d3c758c96cce6f6745af5e3e30ea2a2d444cc5c1cc2bb0"
    },
    {
      "bytes": 1629,
      "path": "data/records.json",
      "sha256": "9f251a535ccdafcffc7c9ce1c8179793a9e9bde19796588f83efa96787558897"
    },
    {
      "bytes": 1745,
      "path": "data/relationships.json",
      "sha256": "03ad86354c6665d1041fcea7a041ed55b778e9eefb26e3f74c57a659a8b950e5"
    },
    {
      "bytes": 818,
      "path": "okf-explorer.json",
      "sha256": "b45b3f8a271a3fb90de77f4700410131e712d6f8bc66b8224d7cffa6b055f545"
    },
    {
      "bytes": 1985,
      "path": "source.nt",
      "sha256": "d7083786dd95a3fbe83f199133198419f1ab31ae5c91cb265907f1f824149962"
    }
  ],
  "question": "How does the retained graph connect revisions to derivations and influences, and can it prove that a particular government document was revised?",
  "records": [
    {
      "id": "http://www.w3.org/ns/prov#Revision",
      "name": "Revision",
      "ontology_term": "http://www.w3.org/ns/prov#Revision",
      "record_type": "PROV-O class",
      "resource_count": 0,
      "title": "Revision",
      "url": "https://www.w3.org/TR/2013/REC-prov-o-20130430/#Revision"
    },
    {
      "id": "http://www.w3.org/ns/prov#Derivation",
      "name": "Derivation",
      "ontology_term": "http://www.w3.org/ns/prov#Derivation",
      "record_type": "PROV-O class",
      "resource_count": 0,
      "title": "Derivation",
      "url": "https://www.w3.org/TR/2013/REC-prov-o-20130430/#Derivation"
    },
    {
      "id": "http://www.w3.org/ns/prov#EntityInfluence",
      "name": "EntityInfluence",
      "ontology_term": "http://www.w3.org/ns/prov#EntityInfluence",
      "record_type": "PROV-O class",
      "resource_count": 0,
      "title": "Entity influence",
      "url": "https://www.w3.org/TR/2013/REC-prov-o-20130430/#EntityInfluence"
    },
    {
      "id": "http://www.w3.org/ns/prov#wasRevisionOf",
      "name": "wasRevisionOf",
      "ontology_term": "http://www.w3.org/ns/prov#wasRevisionOf",
      "record_type": "PROV-O property",
      "resource_count": 0,
      "title": "wasRevisionOf",
      "url": "https://www.w3.org/TR/2013/REC-prov-o-20130430/#wasRevisionOf"
    },
    {
      "id": "http://www.w3.org/ns/prov#wasDerivedFrom",
      "name": "wasDerivedFrom",
      "ontology_term": "http://www.w3.org/ns/prov#wasDerivedFrom",
      "record_type": "PROV-O property",
      "resource_count": 0,
      "title": "wasDerivedFrom",
      "url": "https://www.w3.org/TR/2013/REC-prov-o-20130430/#wasDerivedFrom"
    },
    {
      "id": "http://www.w3.org/ns/prov#wasInfluencedBy",
      "name": "wasInfluencedBy",
      "ontology_term": "http://www.w3.org/ns/prov#wasInfluencedBy",
      "record_type": "PROV-O property",
      "resource_count": 0,
      "title": "wasInfluencedBy",
      "url": "https://www.w3.org/TR/2013/REC-prov-o-20130430/#wasInfluencedBy"
    }
  ],
  "schema": "okf-profile-walkthrough.v1",
  "scope": "Retained metadata extension. Its graph is supplied as RDF or geospatial metadata; Markdown-core conformance is not asserted.",
  "validation": null
}
```
