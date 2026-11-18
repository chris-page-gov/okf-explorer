"""Build the bounded PROV-O inference example used in Explorer."""

from __future__ import annotations

import argparse
from pathlib import Path

from rdflib import Graph, Literal, OWL, RDF, RDFS, URIRef

from scripts.build_governed_vocabulary_examples import binding, reader_files
from scripts.build_ontology_navigation_index import build_index
from scripts.materialise_subclass_candidate import PROV, SUBCLASS, materialise
from scripts.normalise_shacl_report import canonical_json
from scripts.run_shacl_core import triples


OUTPUT = Path(__file__).resolve().parents[1] / "profiles/bounded-inference/v1"
SOURCE = "https://www.w3.org/TR/2013/REC-prov-o-20130430/#"
TERMS = {"Revision": "Revision", "Derivation": "Derivation", "EntityInfluence": "Entity influence"}
CLASS_EDGES = (("Revision", "Derivation"), ("Derivation", "EntityInfluence"))
PROPERTY_EDGES = (("wasRevisionOf", "wasDerivedFrom"), ("wasDerivedFrom", "wasInfluencedBy"))
PUBLIC = "https://chris-page-gov.github.io/okf-explorer/profile/bounded-inference/v1/"


def ontology_example() -> dict[str, bytes]:
    """Project only declarations used by the W3C class and property journeys."""
    graph = Graph()
    records = []
    relationships = []
    for edges, rdf_type, predicate, kind, record_type in (
        (CLASS_EDGES, OWL.Class, RDFS.subClassOf, "subclass of", "PROV-O class"),
        (PROPERTY_EDGES, OWL.ObjectProperty, RDFS.subPropertyOf, "subproperty of", "PROV-O property"),
    ):
        for name in sorted({name for edge in edges for name in edge}):
            term = URIRef(PROV + name)
            graph.add((term, RDF.type, rdf_type))
            title = TERMS.get(name, name)
            graph.add((term, RDFS.label, Literal(name)))
            records.append({"id": str(term), "name": name, "url": SOURCE + name, "ontology_term": str(term),
                            "title": title, "record_type": record_type, "resource_count": 0})
        for child, parent in edges:
            graph.add((URIRef(PROV + child), predicate, URIRef(PROV + parent)))
            relationships.append({
                "source": f"dataset/{child}", "target": f"dataset/{parent}", "source_iri": PROV + child,
                "target_iri": PROV + parent, "predicate": str(predicate), "kind": kind,
                "assertion_status": "official",
                "authority": {"class": "official", "label": "W3C PROV-O Recommendation"},
                "evidence": [SOURCE + child],
            })
    raw = triples(graph)
    title = "PROV-O class and property hierarchy"
    bundle = PUBLIC + "ontology/source.nt"
    index = build_index(raw, bundle)
    counts, files = reader_files(title, index, records, relationships)
    files["source.nt"] = raw
    files["okf-explorer.json"] = canonical_json({
        "@id": bundle, "title": title, "counts": counts, "kind": "okf-large-corpus",
        "schema": "okf-explorer-large-corpus.v1",
        "entrypoints": {
            "data_manifest": "data/manifest.json", "overview_index": "data/overview.json",
            "ontology_navigation": binding("data/ontology.json", files["data/ontology.json"]),
        },
        "related_links": [
            {"label": "W3C PROV-O Recommendation", "url": SOURCE[:-1], "kind": "source-ontology"},
            {"label": "Selected hierarchy triples", "url": bundle, "kind": "ontology-graph"},
        ],
    })
    return {f"ontology/{path}": content for path, content in files.items()}


def example() -> dict[str, bytes]:
    asserted = [
        {
            "id": f"urn:okf:example:prov-o:{source}:{target}",
            "source_iri": PROV + source,
            "target_iri": PROV + target,
            "predicate": SUBCLASS,
            "assertion_status": "official",
            "assertion_scope": "real-world",
            "authority": {"class": "official", "label": "W3C PROV-O Recommendation"},
            "evidence": [SOURCE + source],
        }
        for source, target in CLASS_EDGES
    ]
    result = materialise(asserted, enabled=True)
    inferred = [{**edge, "authority": {"class": "derived", "label": "Bounded subclass rule"}}
                for edge in result["assertions"]]
    nodes = {
        term: {"id": term, "title": title, "type": "PROV-O class", "source_url": SOURCE + term}
        for term, title in TERMS.items()
    }

    def bundle(assertions: list[dict], title: str) -> bytes:
        relationships = [
            {**edge, "source": edge["source_iri"].removeprefix(PROV),
             "target": edge["target_iri"].removeprefix(PROV), "kind": "subclass of"}
            for edge in assertions
        ]
        return canonical_json({"okf_version": "0.2", "title": title, "nodes": nodes,
                               "relationships": relationships})

    return {
        "asserted.json": bundle(asserted, "PROV-O source assertions"),
        "comparison.json": bundle(asserted + inferred, "PROV-O assertion comparison"),
        "derivation.json": canonical_json(result),
        **ontology_example(),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    for name, body in example().items():
        path = args.output / name
        if args.check:
            if not path.is_file() or path.read_bytes() != body:
                parser.error(f"Example bytes differ at {path}")
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(body)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
