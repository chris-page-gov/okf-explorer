"""Validate the versioned workbench result and renderer-neutral view contracts."""

from __future__ import annotations

import copy
import json
import unittest
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker


ROOT = Path(__file__).resolve().parents[1]
PROFILE = ROOT / "profiles" / "evidence-workbench-tools" / "v1"


def load(name: str) -> dict:
    return json.loads((PROFILE / name).read_text(encoding="utf-8"))


def serialised(value: dict) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


class WorkbenchToolContractsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.result_schema = load("response.schema.json")
        cls.view_schema = load("view.schema.json")
        for schema in (cls.result_schema, cls.view_schema):
            Draft202012Validator.check_schema(schema)
        cls.result_validator = Draft202012Validator(cls.result_schema, format_checker=FormatChecker())
        cls.view_validator = Draft202012Validator(cls.view_schema, format_checker=FormatChecker())

    def view(self, kind: str = "graph") -> dict:
        return {
            "schema": "okf-workbench-view.v1", "kind": kind, "title": "Source-bound view",
            "fields": [{"key": "source", "label": "Source", "type": "string"}],
            "rows": [{"source": "Recorded evidence", "ref": "e-one", "references": ["e-one", "e-two"]}],
            "nodes": [{"ref": "e-one", "label": "Record one", "status": "normalized"}],
            "edges": [],
            "time_basis": {"assessment_date": None, "effective_from": "2026-01-01", "effective_to": None},
            "provenance": [{"ref": "e-one", "url": "https://example.test/source.pdf#page=3", "locator": "page 3", "source_date": None}],
            "limitations": ["This retained view does not establish legal applicability."],
            "authority": "retained-evidence-projection",
            "coverage": {"offset": 0, "total_rows": 1, "delivered_rows": 1, "complete": True, "next_cursor": None},
        }

    def test_existing_result_fixtures_have_exact_measured_delivery(self) -> None:
        for path in sorted((PROFILE / "fixtures").glob("*.json")):
            name = path.name
            with self.subTest(name=name):
                value = load(f"fixtures/{name}")
                self.assertEqual([], list(self.result_validator.iter_errors(value)))
                body = serialised(value)
                self.assertEqual(len(body.encode("utf-8")), value["delivery"]["bytes"])
                self.assertEqual(len(body), value["delivery"]["characters"])
                self.assertEqual((len(body) + 3) // 4, value["delivery"]["estimated_tokens"])
                if value.get("data", {}).get("schema") == "okf-workbench-view.v1":
                    self.assertEqual([], list(self.view_validator.iter_errors(value["data"])))

    def test_all_view_kinds_and_nullable_readiness_values(self) -> None:
        for kind in ("graph", "interactions", "requirements", "rates", "calculation"):
            with self.subTest(kind=kind):
                value = self.view(kind)
                value["rows"][0]["required"] = None
                self.assertEqual([], list(self.view_validator.iter_errors(value)))
                result = load("fixtures/insufficient-evidence.json")
                result["data"] = value
                self.assertEqual([], list(self.result_validator.iter_errors(result)))

    def test_rejects_executable_or_remote_configuration(self) -> None:
        for location, field, payload in (
            ("top", "renderer", "javascript:alert(1)"),
            ("top", "remote_config", {"url": "https://example.test/config"}),
            ("row", "script", "alert(1)"),
            ("field", "onClick", "alert(1)"),
        ):
            with self.subTest(location=location, field=field):
                value = self.view()
                target = value if location == "top" else value["rows"][0] if location == "row" else value["fields"][0]
                target[field] = payload
                self.assertTrue(list(self.view_validator.iter_errors(value)))
        value = self.view()
        value["provenance"][0]["url"] = "javascript:alert(1)"
        self.assertTrue(list(self.view_validator.iter_errors(value)))
        value["provenance"][0]["url"] = "https://user:pass@example.test/source.pdf"
        self.assertTrue(list(self.view_validator.iter_errors(value)))

    def test_rejects_oversized_graph_rows_and_invalid_coverage(self) -> None:
        for field, count in (("nodes", 21), ("edges", 41), ("rows", 81)):
            with self.subTest(field=field):
                value = self.view()
                value[field] = [copy.deepcopy(value[field][0] if value[field] else {"ref": "e", "source": "e", "target": "e", "label": "link", "status": "declared"}) for _ in range(count)]
                self.assertTrue(list(self.view_validator.iter_errors(value)))
        value = self.view()
        value["coverage"]["offset"] = -1
        self.assertTrue(list(self.view_validator.iter_errors(value)))


if __name__ == "__main__":
    unittest.main()
