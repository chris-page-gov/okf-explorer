import unittest

from rdflib import BNode, Graph, Literal, RDF, SH, URIRef

from scripts.normalise_shacl_report import normalise_report


BUNDLE = "https://example.test/bundle/okf-explorer.json"
FOCUS = URIRef("urn:example:record")


def validation_report() -> Graph:
    graph = Graph()
    report = BNode("report")
    graph.add((report, RDF.type, SH.ValidationReport))
    graph.add((report, SH.conforms, Literal(False)))
    for name in ("first", "second"):
        result = BNode(name)
        graph.add((report, SH.result, result))
        graph.add((result, RDF.type, SH.ValidationResult))
        graph.add((result, SH.resultSeverity, SH.Violation))
        graph.add((result, SH.focusNode, FOCUS))
        graph.add((result, SH.sourceShape, URIRef("urn:example:shape")))
        graph.add((result, SH.resultPath, URIRef("urn:example:property")))
        graph.add((result, SH.sourceConstraintComponent, SH.MinCountConstraintComponent))
        graph.add((result, SH.resultMessage, Literal("Source-specific sample value")))
    return graph


class NormaliseShaclReportTest(unittest.TestCase):
    def test_groups_occurrences_and_uses_stable_finding_ids(self):
        raw = validation_report().serialize(format="nt").encode("utf-8")
        reordered = b"\n".join(reversed(raw.splitlines())).replace(b"_:first", b"_:new")
        original = normalise_report(raw, BUNDLE)
        changed = normalise_report(reordered, BUNDLE)
        self.assertNotEqual(original["report_sha256"], changed["report_sha256"])
        self.assertEqual(original["findings"], changed["findings"])
        finding, = original["findings"]
        self.assertEqual(finding["occurrences"], 2)
        self.assertEqual(finding["focus"], str(FOCUS))
        self.assertEqual(finding["severity"], "violation")
        self.assertNotIn("Source-specific sample value", str(original))

    def test_rejects_unnamed_shapes(self):
        graph = validation_report()
        result = next(graph.subjects(RDF.type, SH.ValidationResult))
        graph.set((result, SH.sourceShape, BNode("unnamed")))
        with self.assertRaisesRegex(ValueError, "named IRI"):
            normalise_report(graph.serialize(format="nt").encode("utf-8"), BUNDLE)
