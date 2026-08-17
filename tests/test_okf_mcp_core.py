from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from mcp.okf_mcp_core import OkfBundleStore, OkfMcpError, canonical_json
from mcp.okf_mcp_server import dispatch


def fixture_bundle(path: Path) -> Path:
    bundle = {
        "schema": "okf-explorer-bundle.v0",
        "okf_version": "0.2",
        "generated_at": "2026-08-17T00:00:00Z",
        "meta": {"title": "Test", "default_corpus": "test"},
        "corpora": {
            "test": {
                "nodes": {
                    "alpha.md": {"title": "YAML-LD profile", "type": "Standard", "route": "alpha", "semantic_id": "https://example.test/alpha", "description": "Additive semantics", "body": "YAML-LD remains separate from the OKF core.", "status": "reviewed", "timestamp": "2026-08-17T00:00:00Z", "source": "alpha.md"},
                    "beta.md": {"title": "OKF core", "type": "Standard", "route": "beta", "semantic_id": "https://example.test/beta", "description": "Minimal exchange", "body": "Only type is required.", "status": "reviewed", "timestamp": "2026-08-17T00:00:00Z", "source": "beta.md"},
                },
                "relationships": [{"id": "assertion:1", "source": "alpha.md", "target": "beta.md", "predicate": "https://example.test/adds-to", "label": "adds to", "inverse_label": "extended by", "assertion_status": "official", "authority": {"class": "official"}, "evidence": []}],
            }
        },
    }
    path.write_bytes(canonical_json(bundle))
    return path


class OkfMcpCoreTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.store = OkfBundleStore(
            fixture_bundle(Path(self.temporary.name) / "bundle.json")
        )

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def test_search_exact_identity_and_relationships(self) -> None:
        hits = self.store.search("YAML-LD additive", limit=2)
        self.assertEqual(hits[0]["record_id"], "alpha.md")
        self.assertEqual(
            self.store.get_record("alpha.md")["semantic_id"],
            "https://example.test/alpha",
        )
        relationships = self.store.follow_relationships("beta.md")
        self.assertEqual(relationships[0]["direction"], "inbound")
        self.assertEqual(relationships[0]["label"], "extended by")

    def test_context_pack_is_digest_bound_and_bounded(self) -> None:
        pack = self.store.context_pack("YAML-LD additive", limit=2, max_bytes=2048)
        self.assertEqual(pack["bundle"]["sha256"], self.store.digest)
        self.assertEqual(pack["records"][0]["record_id"], "alpha.md")
        self.assertLessEqual(pack["receipt"]["content_bytes"], 2048)
        self.assertEqual(pack["receipt"]["content_bytes"], len(canonical_json(pack)))
        self.assertGreater(pack["receipt"]["estimated_tokens"], 0)

    def test_invalid_requests_fail_closed(self) -> None:
        with self.assertRaises(OkfMcpError):
            self.store.get_record("../secret")
        with self.assertRaises(OkfMcpError):
            self.store.context_pack("test", max_bytes=100)

    def test_json_rpc_adapter_exposes_structured_tool_result(self) -> None:
        response = dispatch(self.store, {"jsonrpc": "2.0", "id": 7, "method": "tools/call", "params": {"name": "okf.search", "arguments": {"query": "OKF core"}}})
        self.assertEqual(response["id"], 7)
        self.assertEqual(response["result"]["structuredContent"][0]["record_id"], "beta.md")
        self.assertEqual(json.loads(response["result"]["content"][0]["text"])[0]["record_id"], "beta.md")


if __name__ == "__main__":
    unittest.main()
