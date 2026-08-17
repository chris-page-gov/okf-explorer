"""Deterministic retrieval over an OKF Explorer bundle.

This module contains no transport or model dependency. It is intentionally
small enough for retrieval behaviour, byte limits and identity handling to be
tested independently from an MCP SDK.
"""

from __future__ import annotations

import hashlib
import json
import math
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any


WORD_RE = re.compile(r"[a-z0-9]+")


class OkfMcpError(ValueError):
    """A bounded request could not be satisfied safely."""


@dataclass(frozen=True)
class SearchHit:
    record_id: str
    title: str
    record_type: str
    route: str
    score: int
    matched_terms: tuple[str, ...]

    def as_dict(self) -> dict[str, Any]:
        return {
            "record_id": self.record_id,
            "title": self.title,
            "type": self.record_type,
            "route": self.route,
            "score": self.score,
            "matched_terms": list(self.matched_terms),
        }


def canonical_json(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()


def estimate_tokens(text: str) -> int:
    """Return a transparent proxy, not a model-specific token count."""

    return math.ceil(len(text) / 4)


class OkfBundleStore:
    """Read and query one immutable local OKF bundle projection."""

    def __init__(self, path: Path):
        self.path = path.resolve()
        raw = self.path.read_bytes()
        self.digest = hashlib.sha256(raw).hexdigest()
        self.bundle = json.loads(raw)
        corpora = self.bundle.get("corpora")
        if not isinstance(corpora, dict) or not corpora:
            raise OkfMcpError("bundle has no corpora")
        self.corpus_id = str(self.bundle.get("meta", {}).get("default_corpus") or next(iter(corpora)))
        if self.corpus_id not in corpora:
            raise OkfMcpError("default corpus is missing")
        self.corpus = corpora[self.corpus_id]
        nodes = self.corpus.get("nodes")
        if not isinstance(nodes, dict):
            raise OkfMcpError("corpus nodes must be an object")
        self.nodes: dict[str, dict[str, Any]] = nodes
        relationships = self.corpus.get("relationships") or []
        if not isinstance(relationships, list):
            raise OkfMcpError("corpus relationships must be an array")
        self.relationships: list[dict[str, Any]] = relationships

    def bundle_descriptor(self) -> dict[str, Any]:
        meta = self.bundle.get("meta") or {}
        return {
            "bundle_id": self.corpus_id,
            "title": meta.get("title") or self.corpus.get("title") or self.corpus_id,
            "description": meta.get("description") or "",
            "okf_version": self.bundle.get("okf_version"),
            "profile": meta.get("profile"),
            "generated_at": self.bundle.get("generated_at"),
            "sha256": self.digest,
            "record_count": len(self.nodes),
            "relationship_count": len(self.relationships),
        }

    @staticmethod
    def _terms(text: str) -> tuple[str, ...]:
        return tuple(dict.fromkeys(WORD_RE.findall(text.casefold())))

    def search(self, query: str, *, limit: int = 5) -> list[dict[str, Any]]:
        query = query.strip()
        if not query:
            raise OkfMcpError("query must not be empty")
        if not 1 <= limit <= 20:
            raise OkfMcpError("limit must be between 1 and 20")
        terms = self._terms(query)
        if not terms:
            raise OkfMcpError("query contains no searchable terms")
        phrase = query.casefold()
        hits: list[SearchHit] = []
        for record_id, node in self.nodes.items():
            title = str(node.get("title") or record_id)
            aliases = " ".join(str(value) for value in node.get("aliases") or [])
            description = str(node.get("description") or "")
            body = str(node.get("body") or "")
            title_text = title.casefold()
            summary_text = f"{title} {aliases} {description}".casefold()
            full_text = f"{summary_text} {body}".casefold()
            matched = tuple(term for term in terms if term in full_text)
            if not matched:
                continue
            score = 30 * len(matched)
            score += 60 * sum(term in title_text for term in terms)
            score += 25 * sum(term in summary_text for term in terms)
            score += 100 if phrase in title_text else 0
            score += 50 if phrase in summary_text else 0
            score += min(20, sum(full_text.count(term) for term in terms))
            hits.append(
                SearchHit(
                    record_id=record_id,
                    title=title,
                    record_type=str(node.get("type") or ""),
                    route=str(node.get("route") or record_id.removesuffix(".md")),
                    score=score,
                    matched_terms=matched,
                )
            )
        hits.sort(key=lambda hit: (-hit.score, hit.title.casefold(), hit.record_id))
        return [hit.as_dict() for hit in hits[:limit]]

    def get_record(self, record_id: str, *, max_body_chars: int = 12_000) -> dict[str, Any]:
        if not 0 <= max_body_chars <= 50_000:
            raise OkfMcpError("max_body_chars must be between 0 and 50000")
        node = self.nodes.get(record_id)
        if node is None:
            raise OkfMcpError(f"unknown record_id: {record_id}")
        body = str(node.get("body") or "")
        return {
            "record_id": record_id,
            "semantic_id": node.get("semantic_id"),
            "route": node.get("route"),
            "title": node.get("title"),
            "type": node.get("type"),
            "description": node.get("description"),
            "status": node.get("status"),
            "timestamp": node.get("timestamp"),
            "resource": node.get("resource"),
            "source": node.get("source"),
            "body": body[:max_body_chars],
            "body_truncated": len(body) > max_body_chars,
            "bundle_sha256": self.digest,
        }

    def follow_relationships(self, record_id: str, *, limit: int = 20) -> list[dict[str, Any]]:
        if record_id not in self.nodes:
            raise OkfMcpError(f"unknown record_id: {record_id}")
        if not 1 <= limit <= 100:
            raise OkfMcpError("limit must be between 1 and 100")
        rows = []
        for relationship in self.relationships:
            source = relationship.get("source")
            target = relationship.get("target")
            if source != record_id and target != record_id:
                continue
            direction = "outbound" if source == record_id else "inbound"
            peer_id = str(target if direction == "outbound" else source)
            peer = self.nodes.get(peer_id) or {}
            rows.append(
                {
                    "assertion_id": relationship.get("id"),
                    "direction": direction,
                    "predicate": relationship.get("predicate"),
                    "label": relationship.get("label") if direction == "outbound" else relationship.get("inverse_label"),
                    "peer_id": peer_id,
                    "peer_title": peer.get("title"),
                    "authority": relationship.get("authority"),
                    "assertion_status": relationship.get("assertion_status"),
                    "evidence": relationship.get("evidence") or [],
                }
            )
        rows.sort(key=lambda row: (str(row["direction"]), str(row["label"]), row["peer_id"]))
        return rows[:limit]

    def context_pack(
        self,
        question: str,
        *,
        limit: int = 3,
        max_bytes: int = 16_000,
        relationship_limit: int = 8,
    ) -> dict[str, Any]:
        if not 1_024 <= max_bytes <= 200_000:
            raise OkfMcpError("max_bytes must be between 1024 and 200000")
        hits = self.search(question, limit=limit)
        records = []
        body_budget = max(200, (max_bytes // max(1, len(hits)) // 3))
        for hit in hits:
            record = self.get_record(hit["record_id"], max_body_chars=body_budget)
            record["retrieval"] = hit
            record["relationships"] = self.follow_relationships(
                hit["record_id"], limit=relationship_limit
            )
            records.append(record)
        pack: dict[str, Any] = {
            "schema": "okf-context-pack.v1",
            "question": question,
            "retrieval_method": "deterministic-lexical-v1",
            "bundle": self.bundle_descriptor(),
            "records": records,
            "limitations": [
                "Search is lexical and does not establish answer correctness.",
                "Token count is estimated as ceil(characters / 4).",
                "Only explicit bundle records and relationships are returned.",
            ],
        }
        encoded = canonical_json(pack)
        while len(encoded) > max_bytes and any(record["body"] for record in records):
            for record in records:
                record["body"] = record["body"][: max(0, len(record["body"]) // 2)]
                record["body_truncated"] = True
            encoded = canonical_json(pack)
        if len(encoded) > max_bytes:
            for record in records:
                record["relationships"] = []
            encoded = canonical_json(pack)
        if len(encoded) > max_bytes:
            raise OkfMcpError("metadata exceeds max_bytes; request fewer records")
        pack["receipt"] = {
            "content_bytes": 0,
            "estimated_tokens": 0,
            "truncated": any(record["body_truncated"] for record in records),
        }
        for _ in range(4):
            encoded = canonical_json(pack)
            pack["receipt"]["content_bytes"] = len(encoded)
            pack["receipt"]["estimated_tokens"] = estimate_tokens(encoded.decode())
        encoded = canonical_json(pack)
        if len(encoded) > max_bytes:
            raise OkfMcpError("context receipt exceeds max_bytes; request fewer records")
        pack["receipt"]["content_bytes"] = len(encoded)
        return pack
