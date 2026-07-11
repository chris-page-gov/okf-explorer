#!/usr/bin/env python3
"""Use a governed model call to propose high-precision legislation title rules."""

from __future__ import annotations

import argparse
import gzip
import json
import os
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "enrichment" / "model-assisted-v1.json"
MODEL = "gpt-5-mini-2025-08-07"
INPUT_USD_PER_MILLION = 0.25
OUTPUT_USD_PER_MILLION = 2.00


def sample_titles(limit: int) -> list[str]:
    unclassified: list[str] = []
    classified: list[str] = []
    for path in sorted((ROOT / "legislation" / "data").glob("works-*.json.gz")):
        rows = json.loads(gzip.decompress(path.read_bytes()))
        for row in rows:
            title = str(row.get("title", "")).strip()
            if not title:
                continue
            target = unclassified if any(str(topic).startswith("Unclassified") for topic in row.get("topics", [])) else classified
            if len(target) < limit:
                target.append(title)
        if len(unclassified) >= limit and len(classified) >= limit // 3:
            break
    return unclassified[:limit] + classified[: max(1, limit // 3)]


def response_text(response: dict) -> str:
    for item in response.get("output", []):
        for content in item.get("content", []):
            if content.get("type") == "output_text":
                return str(content.get("text", ""))
    raise RuntimeError("OpenAI response did not contain output_text")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--sample-size", type=int, default=120)
    args = parser.parse_args()
    key = os.environ.get("OPENAI_API_KEY", "")
    if not key:
        raise SystemExit("OPENAI_API_KEY is not available")
    topics = [
        "Constitutional and administrative law", "Civil justice and procedure", "Criminal law and policing",
        "Employment and industrial relations", "Taxation and customs", "Companies, insolvency and financial services",
        "Land, housing and planning", "Environment, energy and agriculture", "Health and social care",
        "Education and children", "Family and succession", "Immigration, nationality and asylum",
        "Social security and welfare", "Transport and infrastructure", "Communications, data and technology",
        "Consumer and commercial law", "Local government", "Elections and political parties",
        "Defence and national security", "Human rights and equality", "Intellectual property and media",
        "Professional regulation", "European Union and retained EU law",
    ]
    prompt = {
        "task": "Propose conservative semantic enrichment rules for UK legislation titles.",
        "requirements": [
            "Return only high-precision literal words or phrases that strongly indicate exactly one controlled topic.",
            "Do not include generic legal words such as act, order, regulations, amendment, provisions or commencement.",
            "Every keyword must appear verbatim in at least one supplied title, ignoring case.",
            "Entity suffixes must identify named public bodies or offices, not people inferred from context.",
            "The output is candidate metadata and will remain visibly model-assisted and reviewable.",
        ],
        "controlled_topics": topics,
        "sample_titles": sample_titles(args.sample_size),
    }
    schema = {
        "type": "object",
        "properties": {
            "topic_keywords": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {"topic": {"type": "string", "enum": topics}, "keyword": {"type": "string"}, "rationale": {"type": "string"}},
                    "required": ["topic", "keyword", "rationale"],
                    "additionalProperties": False,
                },
            },
            "entity_suffixes": {"type": "array", "items": {"type": "string"}},
            "caveats": {"type": "array", "items": {"type": "string"}},
        },
        "required": ["topic_keywords", "entity_suffixes", "caveats"],
        "additionalProperties": False,
    }
    payload = {
        "model": MODEL,
        "input": [
            {"role": "developer", "content": "You design governed, auditable knowledge-graph enrichment rules. Prefer omission to a weak semantic claim."},
            {"role": "user", "content": json.dumps(prompt, ensure_ascii=False)},
        ],
        "text": {"format": {"type": "json_schema", "name": "legislation_semantic_rules", "strict": True, "schema": schema}},
        "reasoning": {"effort": "low"},
        "max_output_tokens": 5000,
    }
    request = Request(
        "https://api.openai.com/v1/responses",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=180) as response:
            api_response = json.loads(response.read())
    except HTTPError as exc:
        try:
            detail = json.loads(exc.read()).get("error", {})
        except (json.JSONDecodeError, AttributeError):
            detail = {}
        error_type = str(detail.get("type", "http_error"))
        error_code = str(detail.get("code", ""))
        message = str(detail.get("message", exc.reason))
        raise SystemExit(f"OpenAI API request failed ({exc.code}, {error_type}, {error_code}): {message}") from None
    result = json.loads(response_text(api_response))
    usage = api_response.get("usage", {})
    input_tokens = int(usage.get("input_tokens", 0))
    output_tokens = int(usage.get("output_tokens", 0))
    cost = input_tokens / 1_000_000 * INPUT_USD_PER_MILLION + output_tokens / 1_000_000 * OUTPUT_USD_PER_MILLION
    document = {
        "schema": "okf-model-assisted-enrichment.v1",
        "prompt_version": "legislation-title-rules.v1",
        "model": api_response.get("model", MODEL),
        "response_id": api_response.get("id", ""),
        "review_status": "candidate-requires-human-or-governed-rule-review",
        "input_basis": {"source": "published legislation work titles", "sample_count": len(prompt["sample_titles"]), "controlled_topics": topics},
        "rules": result,
        "usage": {"input_tokens": input_tokens, "output_tokens": output_tokens, "total_tokens": int(usage.get("total_tokens", input_tokens + output_tokens))},
        "pricing_basis_usd_per_million": {"input": INPUT_USD_PER_MILLION, "output": OUTPUT_USD_PER_MILLION},
        "estimated_cost_usd": round(cost, 8),
    }
    output = args.output if args.output.is_absolute() else ROOT / args.output
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(document, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"wrote {output.relative_to(ROOT)}: {input_tokens} input + {output_tokens} output tokens; estimated ${cost:.6f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
