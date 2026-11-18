"""Project declared classes, properties and SKOS mappings for navigation."""

from __future__ import annotations

import argparse
from hashlib import sha256
from pathlib import Path

from rdflib import Graph, Literal, OWL, RDF, RDFS, SKOS, URIRef

if __package__:
    from .normalise_shacl_report import canonical_json, reference
else:
    from normalise_shacl_report import canonical_json, reference


MAX_GRAPH_BYTES = 2 * 1024 * 1024
MAX_STATEMENTS = 30_000
KINDS = {
    OWL.Class: "class", RDFS.Class: "class", RDF.Property: "property",
    OWL.ObjectProperty: "property", OWL.DatatypeProperty: "property",
    SKOS.Concept: "concept", SKOS.ConceptScheme: "scheme",
}
HIERARCHIES = {
    RDFS.subClassOf: ("class", "class"), RDFS.subPropertyOf: ("property", "property"),
    SKOS.broader: ("concept", "concept"), SKOS.inScheme: ("concept", "scheme"),
}
MAPPINGS = {
    SKOS.exactMatch: "exact", SKOS.closeMatch: "close", SKOS.broadMatch: "broad",
    SKOS.narrowMatch: "narrow", SKOS.relatedMatch: "related",
}


def build_index(raw: bytes, source: str) -> dict[str, object]:
    if not raw or len(raw) > MAX_GRAPH_BYTES:
        raise ValueError("Ontology graph must be between 1 byte and 2 MiB")
    source = reference(source)
    graph = Graph().parse(data=raw.decode("utf-8"), format="nt")
    if len(graph) > MAX_STATEMENTS:
        raise ValueError("Ontology graph exceeds the statement limit")

    declared: dict[str, set[str]] = {}
    for term, rdf_type in graph.subject_objects(RDF.type):
        if isinstance(term, URIRef) and rdf_type in KINDS:
            declared.setdefault(reference(term), set()).add(KINDS[rdf_type])

    terms = []
    for term, kinds in sorted(declared.items()):
        labels = {
            (str(label), label.language or "")
            for predicate in (SKOS.prefLabel, RDFS.label)
            for label in graph.objects(URIRef(term), predicate)
            if isinstance(label, Literal)
        }
        terms.append({
            "id": term, "kinds": sorted(kinds),
            "labels": [{"value": value, "language": language} for value, language in sorted(labels)],
        })

    relationships = []
    for predicate, (from_kind, to_kind) in HIERARCHIES.items():
        for left, right in graph.subject_objects(predicate):
            if isinstance(left, URIRef) and isinstance(right, URIRef) and (
                from_kind in declared.get(str(left), ()) and to_kind in declared.get(str(right), ())
            ):
                relationships.append({"from": str(left), "predicate": str(predicate), "to": str(right)})

    mappings = []
    for predicate, strength in MAPPINGS.items():
        for left, right in graph.subject_objects(predicate):
            if isinstance(left, URIRef) and isinstance(right, URIRef) and "concept" in declared.get(str(left), ()):
                mappings.append({"from": str(left), "predicate": str(predicate), "to": reference(right), "strength": strength})

    def edge_key(edge: dict[str, str]) -> tuple[str, str, str]:
        return edge["from"], edge["predicate"], edge["to"]

    return {
        "schema": "okf-ontology-navigation-index.v1",
        "source": source,
        "graph_sha256": sha256(raw).hexdigest(),
        "terms": terms,
        "relationships": sorted(relationships, key=edge_key),
        "mappings": sorted(mappings, key=edge_key),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--graph", type=Path, required=True)
    parser.add_argument("--source", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    try:
        with args.graph.open("rb") as stream:
            index = build_index(stream.read(MAX_GRAPH_BYTES + 1), args.source)
        with args.output.open("xb") as stream:
            stream.write(canonical_json(index))
    except (OSError, ValueError) as error:
        parser.exit(2, f"Ontology navigation index failed: {error}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
