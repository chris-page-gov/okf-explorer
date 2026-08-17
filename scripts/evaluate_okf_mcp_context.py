#!/usr/bin/env python3
"""Evaluate bounded OKF retrieval against a fixed review question set."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from mcp.okf_mcp_core import OkfBundleStore, canonical_json


DEFAULT_OUTPUT = Path("research/okf-evolution-review/evidence/mcp-context-evaluation.json")
QUESTIONS = [
    ("What happened first in the journey from LLM-Wiki to OKF?", "research/okf-evolution-review/chronology.md"),
    ("Which repositories are actual OKF bundle producers?", "research/okf-evolution-review/bundle-inventory.md"),
    ("Why is YAML-LD additive rather than part of the OKF 0.2 core?", "research/okf-evolution-review/standards-decisions.md"),
    ("What evidence supports using OKF for compact LLM grounding?", "research/okf-evolution-review/grounding-and-retrieval.md"),
    ("Should bundle discovery use a meta-OKF bundle or a registry?", "research/okf-evolution-review/mcp-and-discovery.md"),
    ("What is the current OKF authoring and validation best practice?", "research/okf-evolution-review/best-practice.md"),
    ("Which conversations influenced the OKF design?", "research/okf-evolution-review/conversation-register.md"),
]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--bundle", type=Path, default=Path("okf-bundle.json"))
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--max-bytes", type=int, default=12_000)
    args = parser.parse_args()

    store = OkfBundleStore(args.bundle)
    bundle_bytes = args.bundle.stat().st_size
    cases = []
    hits = 0
    reciprocal_rank_total = 0.0
    returned_bytes_total = 0
    for question, expected_id in QUESTIONS:
        ranked = store.search(question, limit=5)
        rank = next((index for index, hit in enumerate(ranked, start=1) if hit["record_id"] == expected_id), None)
        pack = store.context_pack(question, limit=3, max_bytes=args.max_bytes)
        selected_ids = [record["record_id"] for record in pack["records"]]
        selected = expected_id in selected_ids
        hits += int(selected)
        reciprocal_rank_total += 0.0 if rank is None else 1.0 / rank
        returned_bytes_total += pack["receipt"]["content_bytes"]
        cases.append(
            {
                "question": question,
                "expected_record_id": expected_id,
                "rank_in_top_5": rank,
                "selected_in_context_top_3": selected,
                "context_record_ids": selected_ids,
                "content_bytes": pack["receipt"]["content_bytes"],
                "estimated_tokens": pack["receipt"]["estimated_tokens"],
            }
        )
    count = len(cases)
    output = {
        "schema": "okf-mcp-context-evaluation.v1",
        "evaluation_type": "authored development questions; not an independent holdout",
        "bundle": store.bundle_descriptor(),
        "configuration": {
            "retrieval": "deterministic-lexical-v1",
            "top_k_context": 3,
            "top_k_rank": 5,
            "max_bytes": args.max_bytes,
            "token_estimate": "ceil(serialized context characters / 4)",
        },
        "summary": {
            "question_count": count,
            "expected_record_in_context_count": hits,
            "expected_record_in_context_rate": hits / count,
            "mean_reciprocal_rank_at_5": reciprocal_rank_total / count,
            "bundle_bytes": bundle_bytes,
            "mean_context_content_bytes": returned_bytes_total / count,
            "mean_byte_reduction_ratio": 1 - (returned_bytes_total / count / bundle_bytes),
        },
        "cases": cases,
        "limitations": [
            "The questions were authored with knowledge of the review records.",
            "This evaluates retrieval and compactness, not language-model answer correctness.",
            "The token figure is a model-independent proxy, not a tokenizer measurement.",
            "A direct prompt-and-link client may perform its own indexing and cannot be reduced to bundle byte size alone.",
        ],
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(json.dumps(output, indent=2, ensure_ascii=False).encode() + b"\n")
    print(canonical_json(output["summary"]).decode())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
