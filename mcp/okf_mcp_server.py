#!/usr/bin/env python3
"""Minimal stdio JSON-RPC adapter for the bounded OKF retrieval core."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from mcp.okf_mcp_core import OkfBundleStore, OkfMcpError


TOOLS = [
    {"name": "okf.list_bundles", "description": "List the configured local OKF bundle and its digest."},
    {"name": "okf.search", "description": "Search records using bounded deterministic lexical ranking."},
    {"name": "okf.get_record", "description": "Get one exact record by stable bundle record ID."},
    {"name": "okf.follow_relationships", "description": "Follow explicit evidence-bearing relationships."},
    {"name": "okf.context_pack", "description": "Return compact evidence for a question within a byte budget."},
]


def result(request_id: Any, value: Any) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": request_id, "result": value}


def error(request_id: Any, code: int, message: str) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": request_id, "error": {"code": code, "message": message}}


def dispatch(store: OkfBundleStore, request: dict[str, Any]) -> dict[str, Any]:
    request_id = request.get("id")
    method = request.get("method")
    params = request.get("params") or {}
    try:
        if method == "server/discover":
            return result(request_id, {"name": "okf-bundle-retriever", "protocol": "bounded-json-rpc-prototype", "capabilities": {"tools": True, "resources": True, "prompts": True}})
        if method == "tools/list":
            return result(request_id, {"tools": TOOLS})
        if method == "resources/list":
            return result(request_id, {"resources": [{"uri": "okf://registry", "name": "Configured OKF bundles", "mimeType": "application/json"}]})
        if method == "resources/read" and params.get("uri") == "okf://registry":
            return result(request_id, {"contents": [{"uri": "okf://registry", "mimeType": "application/json", "text": json.dumps([store.bundle_descriptor()], sort_keys=True)}]})
        if method == "prompts/list":
            return result(request_id, {"prompts": [{"name": "grounded-answer", "description": "Answer only from the returned OKF context and cite record IDs."}]})
        if method == "prompts/get" and params.get("name") == "grounded-answer":
            question = str((params.get("arguments") or {}).get("question") or "")
            return result(request_id, {"description": "Bounded OKF grounding prompt", "messages": [{"role": "user", "content": {"type": "text", "text": f"Use okf.context_pack for this question. Answer only from returned evidence, cite each record_id, and state ambiguity or missing evidence: {question}"}}]})
        if method != "tools/call":
            return error(request_id, -32601, "method not found")
        name = params.get("name")
        arguments = params.get("arguments") or {}
        if name == "okf.list_bundles":
            value = [store.bundle_descriptor()]
        elif name == "okf.search":
            value = store.search(str(arguments.get("query") or ""), limit=int(arguments.get("limit", 5)))
        elif name == "okf.get_record":
            value = store.get_record(str(arguments.get("record_id") or ""), max_body_chars=int(arguments.get("max_body_chars", 12000)))
        elif name == "okf.follow_relationships":
            value = store.follow_relationships(str(arguments.get("record_id") or ""), limit=int(arguments.get("limit", 20)))
        elif name == "okf.context_pack":
            value = store.context_pack(str(arguments.get("question") or ""), limit=int(arguments.get("limit", 3)), max_bytes=int(arguments.get("max_bytes", 16000)), relationship_limit=int(arguments.get("relationship_limit", 8)))
        else:
            return error(request_id, -32602, "unknown tool")
        return result(request_id, {"content": [{"type": "text", "text": json.dumps(value, ensure_ascii=False, sort_keys=True)}], "structuredContent": value})
    except (OkfMcpError, TypeError, ValueError) as exc:
        return error(request_id, -32602, str(exc))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--bundle", type=Path, default=Path("okf-bundle.json"))
    args = parser.parse_args()
    store = OkfBundleStore(args.bundle)
    for line in sys.stdin:
        try:
            request = json.loads(line)
            response = dispatch(store, request)
        except json.JSONDecodeError as exc:
            response = error(None, -32700, f"parse error: {exc.msg}")
        print(json.dumps(response, ensure_ascii=False, separators=(",", ":")), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
