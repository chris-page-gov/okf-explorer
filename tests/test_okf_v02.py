from __future__ import annotations

import sys
import unittest
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import okf_semantic  # noqa: E402
import update_viewer  # noqa: E402


class OkfV02SemanticTests(unittest.TestCase):
    def test_v02_generation_verification_and_freshness(self) -> None:
        metadata = {
            "type": "Metric",
            "generated": {"by": "process:catalogue-build", "at": "2026-07-25T08:00:00Z"},
            "verified": {"by": "human:reviewer", "at": "2026-07-25T09:00:00Z"},
            "status": "stable",
            "stale_after": "2026-07-25",
            "sources": [{"resource": "https://example.test/policy"}],
            "x-provider-extension": {"retained": True},
        }

        self.assertEqual([], okf_semantic.validate_v02_concept(metadata, "Definition"))
        self.assertEqual("2026-07-25T08:00:00Z", okf_semantic.generated_at(metadata))
        self.assertEqual("human-reviewed", okf_semantic.trust_tier(metadata))
        self.assertTrue(okf_semantic.is_stale(metadata, today=date(2026, 7, 25)))
        self.assertTrue(metadata["x-provider-extension"]["retained"])

    def test_legacy_timestamp_is_only_used_when_generated_is_absent(self) -> None:
        self.assertEqual(
            "2025-01-01T00:00:00Z",
            okf_semantic.generated_at({"type": "Reference", "timestamp": "2025-01-01T00:00:00Z"}),
        )
        self.assertEqual(
            "2026-07-25T00:00:00Z",
            okf_semantic.generated_at(
                {
                    "type": "Reference",
                    "timestamp": "2025-01-01T00:00:00Z",
                    "generated": {"by": "process:new", "at": "2026-07-25T00:00:00Z"},
                }
            ),
        )
        self.assertEqual(
            "",
            okf_semantic.generated_at(
                {"type": "Reference", "timestamp": "2025-01-01T00:00:00Z", "generated": "invalid"}
            ),
        )

    def test_attested_computation_contract_is_validated_but_not_executed(self) -> None:
        metadata = {
            "type": "Attested Computation",
            "runtime": "python",
            "parameters": [{"name": "year", "type": "integer", "required": True}],
            "executor": {"resource": "references/run.md", "receipt": ["run_id", "result"]},
            "attester": {"resource": "references/attest.py"},
        }
        body = "# Computation\n\n```python\nprint(year)\n```"
        self.assertEqual([], okf_semantic.validate_v02_concept(metadata, body))
        self.assertIn(
            "Attested Computation requires attester.resource",
            okf_semantic.validate_v02_concept({**metadata, "attester": {}}, body),
        )

    def test_bare_and_list_verified_forms_normalize_identically(self) -> None:
        event = {"by": "process:nightly", "at": "2026-07-25T00:00:00Z"}
        self.assertEqual([event], okf_semantic.normalize_verified({"verified": event}))
        self.assertEqual([event], okf_semantic.normalize_verified({"verified": [event]}))
        self.assertEqual("machine-confirmed", okf_semantic.trust_tier({"verified": event}))

    def test_malformed_optional_signals_do_not_upgrade_trust_and_are_reported(self) -> None:
        metadata = {
            "type": "Metric",
            "generated": {"by": "not-an-actor", "at": "2026-07-25"},
            "verified": {"by": "", "at": "not-a-datetime"},
            "sources": [{
                "resource": "scope descriptor",
                "author": "unknown",
                "usage_count": -1,
                "last_modified": "2026-99-99",
                "usage_window": {"from": "2026-08-01", "to": "2026-07-01"},
            }],
        }
        errors = okf_semantic.validate_v02_concept(metadata, "Definition")
        self.assertEqual("unverified", okf_semantic.trust_tier(metadata))
        self.assertIn("generated.by must use the OKF actor convention", errors)
        self.assertIn("generated.at must be an ISO 8601 datetime", errors)
        self.assertIn("verified[0].by is required", errors)
        self.assertIn("sources[0].author must use the OKF actor convention", errors)
        self.assertIn("sources[0].usage_count must be a non-negative integer", errors)
        self.assertIn("sources[0].last_modified must be an ISO 8601 date", errors)
        self.assertIn(
            "sources[0].usage_window.from must not be after sources[0].usage_window.to",
            errors,
        )
        self.assertEqual(
            "unverified",
            okf_semantic.trust_tier(
                {
                    "verified": {
                        "by": "team:reviewer",
                        "at": "2026-07-25T09:00:00Z",
                    }
                }
            ),
        )
        self.assertEqual(
            "unverified",
            okf_semantic.trust_tier(
                {
                    "verified": {
                        "by": "human:reviewer",
                        "at": "2026-07-25",
                    }
                }
            ),
        )


class OkfV02ExemplarTests(unittest.TestCase):
    def test_repository_markdown_passes_core_and_explorer_profile(self) -> None:
        graph, errors = update_viewer.build_graph()
        self.assertEqual([], errors)
        self.assertGreater(len(graph["nodes"]), 140)

    def test_reserved_files_and_concepts_use_canonical_v02_shape(self) -> None:
        root = okf_semantic.parse_optional_frontmatter(ROOT / "index.md")
        self.assertEqual({"okf_version": "0.2"}, root.metadata)
        self.assertEqual([], update_viewer.validate_v02_core("index.md", root.metadata, root.body))

        log = okf_semantic.parse_optional_frontmatter(ROOT / "log.md")
        self.assertEqual({}, log.metadata)
        self.assertEqual([], update_viewer.validate_v02_core("log.md", log.metadata, log.body))

        concept = okf_semantic.parse_markdown(ROOT / "standards" / "mcp.md")
        self.assertNotIn("timestamp", concept.metadata)
        self.assertIsInstance(concept.metadata["generated"], dict)
        self.assertNotIn("verified", concept.metadata)
        self.assertIsInstance(concept.metadata["sources"], list)

    def test_generated_graph_preserves_extensions_and_structured_v02_fields(self) -> None:
        graph, errors = update_viewer.build_graph()
        self.assertEqual([], errors)
        mcp = graph["nodes"]["standards/mcp.md"]
        self.assertIsInstance(mcp["generated"], dict)
        self.assertNotIn("verified", mcp)
        self.assertEqual("unverified", mcp["trust_tier"])
        self.assertIsInstance(mcp["sources"], list)
        self.assertEqual(mcp["generated"]["at"], mcp["timestamp"])


if __name__ == "__main__":
    unittest.main()
