from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch
from rdflib import Graph, PROV, RDF, URIRef


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import materialise_subclass_candidate as candidate  # noqa: E402
from scripts.build_subclass_inference_example import OUTPUT, example  # noqa: E402


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
    def test_optional_execution_evidence_binds_times_agent_configuration_and_output(self):
        source = [assertion("a", "A", "B"), assertion("b", "B", "C")]
        raw = json.dumps(source).encode()
        result = candidate.materialise(source, enabled=True)
        start = datetime(2026, 11, 18, 19, 30, tzinfo=timezone.utc)
        end = start.replace(second=1)
        evidence = candidate.execution_provenance(raw, result, start, end)
        graph = Graph().parse(data=json.dumps(evidence), format="json-ld")
        activity, = graph.subjects(RDF.type, PROV.Activity)
        self.assertIn((activity, PROV.wasAssociatedWith, URIRef(candidate.SOFTWARE)), graph)
        self.assertIn((activity, PROV.used, URIRef(f"urn:okf:sha256:{sha256(raw).hexdigest()}")), graph)
        expected_output = sha256(candidate.canonical_json(result)).hexdigest()
        self.assertIn((URIRef(f"urn:okf:sha256:{expected_output}"), PROV.wasGeneratedBy, activity), graph)
        self.assertEqual(next(graph.objects(activity, PROV.endedAtTime)).toPython(), end)
        with self.assertRaisesRegex(ValueError, "ordered timestamps"):
            candidate.execution_provenance(raw, result, end, start)

    def test_reader_example_matches_materialised_assertions(self):
        for name, body in example().items():
            with self.subTest(path=name):
                self.assertEqual((OUTPUT / name).read_bytes(), body)

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
