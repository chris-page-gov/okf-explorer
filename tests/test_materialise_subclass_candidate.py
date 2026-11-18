import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch
from rdflib import Graph, PROV, RDF, URIRef


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import materialise_subclass_candidate as candidate  # noqa: E402


def assertion(identifier: str, source: str, target: str, **fields) -> dict[str, str]:
    return {
        "id": identifier,
        "source_iri": f"urn:example:{source}",
        "target_iri": f"urn:example:{target}",
        "predicate": candidate.SUBCLASS,
        "assertion_scope": "synthetic-fixture",
        "assertion_status": "official",
        **fields,
    }


class MaterialiseSubclassCandidateTest(unittest.TestCase):
    def test_transitivity_preserves_exact_support_and_skips_other_statuses(self):
        source = [assertion("a", "A", "B"), assertion("b", "B", "C"),
                  assertion("c", "C", "D", assertion_status="normalized")]
        result = candidate.materialise(source, enabled=True)
        self.assertEqual(result, candidate.materialise(list(reversed(source)), enabled=True))
        inferred, = result["assertions"]
        self.assertEqual((inferred["source_iri"], inferred["target_iri"]), ("urn:example:A", "urn:example:C"))
        self.assertEqual(inferred["assertion_status"], "inferred")
        self.assertEqual(inferred["rule"], candidate.RULE)
        self.assertEqual(inferred["derivation_activity"], result["activity"])
        self.assertEqual(inferred["supporting_assertions"], ["a", "b"])
        self.assertEqual(result["rule_manifest"]["input_assertion_status"], "official")
        graph = Graph().parse(data=json.dumps(result["provenance"]), format="json-ld")
        activity = URIRef(result["activity"])
        edge = URIRef(inferred["id"])
        self.assertIn((activity, RDF.type, PROV.Activity), graph)
        self.assertIn((edge, PROV.wasGeneratedBy, activity), graph)
        self.assertEqual(
            set(graph.objects(edge, PROV.wasDerivedFrom)),
            {URIRef(candidate.assertion_iri(identifier)) for identifier in ("a", "b")},
        )
        disabled = candidate.materialise(source, enabled=False)
        self.assertEqual(disabled["assertions"], [])
        self.assertIsNone(disabled["activity"])
        self.assertEqual(disabled["provenance"], {"@graph": []})
        self.assertEqual([item["assertion_status"] for item in source], ["official", "official", "normalized"])

    def test_cycles_do_not_create_reflexive_or_duplicate_edges(self):
        source = [assertion("a", "A", "B"), assertion("b", "B", "A")]
        self.assertEqual(candidate.materialise(source, enabled=True)["assertions"], [])

    def test_fails_closed_at_visit_limit_and_on_mixed_scopes(self):
        source = [assertion("a", "A", "B"), assertion("b", "B", "C")]
        with patch.object(candidate, "MAX_VISITS", 1), self.assertRaisesRegex(ValueError, "visit budget"):
            candidate.materialise(source, enabled=True)
        with patch.object(candidate, "MAX_SUPPORT_REFERENCES", 1), self.assertRaisesRegex(ValueError, "support budget"):
            candidate.materialise(source, enabled=True)
        source[1]["assertion_scope"] = "real-world"
        with self.assertRaisesRegex(ValueError, "single assertion scope"):
            candidate.materialise(source, enabled=True)
