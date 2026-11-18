from hashlib import sha256
import json
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from export_openapi_selection import export_selection  # noqa: E402


SOURCE = "https://example.test/openapi.json"
RECORD_PATH = "/services/{identifier}"
STATUS_PATH = "/availability"


def document():
    return {
        "openapi": "3.1.0",
        "info": {"title": "Service catalogue", "version": "2026-11"},
        "servers": [{"url": "https://api.example.test/v1"}],
        "security": [{"subscription": []}],
        "components": {
            "schemas": {"Service": {"type": "object", "properties": {"name": {"type": "string"}}}},
            "securitySchemes": {"subscription": {"type": "apiKey", "in": "header", "name": "X-Subscription"}},
        },
        "paths": {
            RECORD_PATH: {
                "parameters": [{"name": "identifier", "in": "path", "required": True, "schema": {"type": "string"}}],
                "get": {"operationId": "readService", "responses": {
                    "200": {"description": "Service record", "content": {
                        "application/json": {"schema": {"$ref": "#/components/schemas/Service"}}
                    }}
                }},
                "delete": {"operationId": "removeService", "responses": {"204": {"description": "Removed"}}},
            },
            STATUS_PATH: {"get": {"operationId": "getStatus", "responses": {"200": {"description": "Availability"}}}},
        },
    }


def raw(value):
    return json.dumps(value).encode()


class ExportOpenApiSelectionTest(unittest.TestCase):
    def test_documented_module_cli_exports_the_selected_operation(self):
        with TemporaryDirectory() as temporary:
            source = Path(temporary) / "publisher.json"
            output = Path(temporary) / "selection.json"
            content = raw(document())
            source.write_bytes(content)
            subprocess.run(
                [sys.executable, "-m", "scripts.export_openapi_selection",
                 "--input", str(source), "--source", SOURCE,
                 "--operation", "GET", RECORD_PATH, "--output", str(output)],
                cwd=ROOT, check=True, capture_output=True,
            )
            self.assertEqual(output.read_bytes(), export_selection(content, SOURCE, [("GET", RECORD_PATH)]))

    def test_extracts_exact_operations_and_preserves_inherited_context(self):
        original = document()
        source = raw(original)
        operations = [("GET", RECORD_PATH), ("get", STATUS_PATH)]
        first = export_selection(source, SOURCE, operations)
        self.assertEqual(first, export_selection(source, SOURCE, operations[::-1]))
        stub = json.loads(first)
        self.assertEqual(stub["openapi"], original["openapi"])
        self.assertEqual(stub["security"], original["security"])
        self.assertEqual(stub["servers"], original["servers"])
        path = stub["paths"][RECORD_PATH]
        self.assertEqual(path["get"], original["paths"][RECORD_PATH]["get"])
        self.assertEqual(path["parameters"], original["paths"][RECORD_PATH]["parameters"])
        self.assertNotIn("delete", path)
        self.assertEqual(stub["x-okf-source"]["sha256"], sha256(source).hexdigest())
        self.assertIn({"method": "GET", "path": RECORD_PATH, "pointer": "/paths/~1services~1{identifier}/get"},
                      stub["x-okf-source"]["operations"])

    def test_fails_closed_on_bad_or_unselected_references(self):
        for target in ("#/paths/~1availability/get", "#/components/schemas/Absent", "https://example.test/schema.json"):
            with self.subTest(target=target):
                content = document()
                content["paths"][RECORD_PATH]["get"]["responses"]["200"] = {"$ref": target}
                with self.assertRaisesRegex(ValueError, "reference"):
                    export_selection(raw(content), SOURCE, [("GET", RECORD_PATH)])

    def test_preserves_only_declared_operations_and_fails_on_duplicate_json(self):
        content = raw(document())
        with self.assertRaisesRegex(ValueError, "selected operation"):
            export_selection(content, SOURCE, [("POST", RECORD_PATH)])
        with self.assertRaisesRegex(ValueError, "declared OpenAPI"):
            export_selection(content, SOURCE, [("GET", "/absent")])
        with self.assertRaisesRegex(ValueError, "duplicate object"):
            export_selection(b'{"openapi":"3.1.0","openapi":"3.1.1"}', SOURCE, [("GET", RECORD_PATH)])
        with self.assertRaisesRegex(ValueError, "credential"):
            export_selection(content, SOURCE + "?token=fixture", [("GET", RECORD_PATH)])
