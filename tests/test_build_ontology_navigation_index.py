from pathlib import Path
import sys
import unittest

from rdflib import Graph, Literal, OWL, RDF, RDFS, SKOS, URIRef


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from build_ontology_navigation_index import build_index  # noqa: E402


class BuildOntologyNavigationIndexTest(unittest.TestCase):
    def test_keeps_declared_hierarchy_and_mapping_strength_without_inference(self):
        graph = Graph()
        narrow = URIRef("urn:example:narrow")
        broad = URIRef("urn:example:broad")
        concept = URIRef("urn:example:concept")
        unknown = URIRef("urn:example:undeclared")
        outside = URIRef("https://example.test/external#concept")
        graph.add((narrow, RDF.type, OWL.Class))
        graph.add((broad, RDF.type, RDFS.Class))
        graph.add((concept, RDF.type, SKOS.Concept))
        graph.add((broad, RDFS.label, Literal("Class label", lang="en-GB")))
        graph.add((narrow, RDFS.subClassOf, broad))
        graph.add((broad, RDFS.subClassOf, unknown))
        graph.add((concept, SKOS.closeMatch, outside))
        graph.add((concept, SKOS.relatedMatch, outside))
        raw = graph.serialize(format="nt").encode("utf-8")
        result = build_index(raw, "urn:example:graph")

        self.assertEqual(result["relationships"], [
            {"from": str(narrow), "predicate": str(RDFS.subClassOf), "to": str(broad)}
        ])
        self.assertEqual([edge["strength"] for edge in result["mappings"]], ["close", "related"])
        self.assertEqual([node["id"] for node in result["terms"]], [str(broad), str(concept), str(narrow)])
        self.assertEqual(result["terms"][0]["labels"], [{"value": "Class label", "language": "en-GB"}])

        reversed_graph = b"\n".join(reversed(raw.splitlines()))
        again = build_index(reversed_graph, "urn:example:graph")
        self.assertNotEqual(result["graph_sha256"], again["graph_sha256"])
        self.assertEqual(result["terms"], again["terms"])
        self.assertEqual(result["mappings"], again["mappings"])
