from hashlib import sha256
from pathlib import Path
import sys
import unittest

from rdflib import Graph, Literal, RDF, SKOS, URIRef

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from run_shacl_core import canonical_report, check_core, triples  # noqa: E402


PROFILE = ROOT / "profiles" / "governed-vocabulary" / "v1"
SHAPES = (PROFILE / "shapes.ttl").read_bytes()
BUNDLE = "urn:example:governed-vocabulary"
FOCUS = URIRef(BUNDLE + ":subject")


def digest(payload):
    return sha256(payload).hexdigest()


def validate(data, shapes=SHAPES):
    return check_core(data, shapes, BUNDLE, digest(data), digest(shapes))


class RunShaclCoreTest(unittest.TestCase):
    def test_governed_vocabulary_conforms_to_the_pinned_named_shapes(self):
        graph = Graph().parse(PROFILE / "vocabulary.ttl", format="turtle")
        data = triples(graph)
        report = validate(data)
        self.assertTrue(report["conforms"])
        self.assertEqual(report["findings"], [])
        self.assertEqual(report["report_sha256"], digest(canonical_report(report)))
        self.assertEqual(report["execution"]["graph_sha256"], digest(data))
        self.assertEqual(report["execution"]["shapes_sha256"], digest(SHAPES))
        self.assertEqual(report["execution"]["validator_version"], "0.40.2")

    def test_named_findings_are_deterministic_and_keep_predicate_and_source_shape(self):
        graph = Graph()
        scheme = URIRef(BUNDLE + ":scheme")
        graph.add((scheme, RDF.type, SKOS.ConceptScheme))
        graph.add((FOCUS, RDF.type, SKOS.Concept))
        graph.add((FOCUS, SKOS.notation, Literal("example")))
        graph.add((FOCUS, SKOS.inScheme, scheme))
        data = triples(graph)
        first = validate(data)
        self.assertEqual(first, validate(data))
        self.assertFalse(first["conforms"])
        finding, = first["findings"]
        self.assertEqual(finding["focus"], str(FOCUS))
        self.assertEqual(finding["path"], str(SKOS.prefLabel))
        self.assertTrue(finding["shape"].endswith("#PreferredLabel"))
        self.assertEqual(finding["severity"], "violation")

    def test_integrity_and_unsupported_execution_fail_before_validation(self):
        data = triples(Graph().add((FOCUS, RDF.type, SKOS.Concept)))
        with self.assertRaisesRegex(ValueError, "Data graph"):
            check_core(data, SHAPES, BUNDLE, "0" * 64, digest(SHAPES))
        invalid = SHAPES + b"\nscope:Concept sh:rule scope:Extra .\n"
        with self.assertRaisesRegex(ValueError, "local SHACL Core"):
            validate(data, invalid)
