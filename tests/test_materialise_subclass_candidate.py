from pathlib import Path
import sys
import unittest
from unittest.mock import patch


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
        "assertion_status": "asserted",
        **fields,
    }


class MaterialiseSubclassCandidateTest(unittest.TestCase):
    def test_transitivity_preserves_exact_support_and_skips_other_statuses(self):
        source = [assertion("a", "A", "B"), assertion("b", "B", "C"),
                  assertion("c", "C", "D", assertion_status="proposed")]
        result = candidate.materialise(source, enabled=True)
        self.assertEqual(result, candidate.materialise(list(reversed(source)), enabled=True))
        inferred, = result["assertions"]
        self.assertEqual((inferred["source_iri"], inferred["target_iri"]), ("urn:example:A", "urn:example:C"))
        self.assertEqual(inferred["assertion_status"], "inferred")
        self.assertEqual(inferred["derivation"], {
            "rule": candidate.RULE, "activity": result["activity"], "supporting_assertions": ["a", "b"]
        })
        disabled = candidate.materialise(source, enabled=False)
        self.assertEqual(disabled["assertions"], [])
        self.assertIsNone(disabled["activity"])
        self.assertEqual([item["assertion_status"] for item in source], ["asserted", "asserted", "proposed"])

    def test_cycles_do_not_create_reflexive_or_duplicate_edges(self):
        source = [assertion("a", "A", "B"), assertion("b", "B", "A")]
        self.assertEqual(candidate.materialise(source, enabled=True)["assertions"], [])

    def test_fails_closed_at_visit_limit_and_on_mixed_scopes(self):
        source = [assertion("a", "A", "B"), assertion("b", "B", "C")]
        with patch.object(candidate, "MAX_VISITS", 1), self.assertRaisesRegex(ValueError, "visit budget"):
            candidate.materialise(source, enabled=True)
        source[1]["assertion_scope"] = "real-world"
        with self.assertRaisesRegex(ValueError, "single assertion scope"):
            candidate.materialise(source, enabled=True)
