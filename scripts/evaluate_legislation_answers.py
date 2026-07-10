#!/usr/bin/env python3
"""Score provenance-complete answers against the legislation evaluation suite."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SUITE = ROOT / "evaluation" / "legislation" / "questions.json"
PINPOINT = re.compile(r"/(section|article|regulation|rule|schedule|paragraph|part|chapter)/|#[A-Za-z0-9_-]+", re.I)


def load_answers(path: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8").strip()
    if not text:
        return []
    if text.startswith("["):
        return json.loads(text)
    return [json.loads(line) for line in text.splitlines() if line.strip()]


def ratio_points(matched: int, total: int, points: float) -> float:
    return round(points * min(1.0, matched / max(1, total)), 2)


def score_answer(question: dict, answer: dict) -> dict:
    prose = str(answer.get("answer", ""))
    lower = prose.lower()
    propositions = answer.get("propositions") if isinstance(answer.get("propositions"), list) else []
    citations = [citation for proposition in propositions for citation in proposition.get("citations", []) if isinstance(citation, dict)]
    official = [citation for citation in citations if urlparse(str(citation.get("url", ""))).hostname in {"www.legislation.gov.uk", "legislation.gov.uk"}]
    complete_citations = [citation for citation in citations if all(str(citation.get(key, "")).strip() for key in ("source_title", "url", "passage", "retrieved_at"))]
    cited_propositions = sum(bool(proposition.get("claim")) and bool(proposition.get("citations")) for proposition in propositions)
    pinpoint = [citation for citation in citations if PINPOINT.search(str(citation.get("url", ""))) and str(citation.get("passage", "")).strip()]
    expected_terms = question.get("expected_terms", [])
    terms_found = [term for term in expected_terms if term.lower() in lower]
    temporal = answer.get("temporal_context") if isinstance(answer.get("temporal_context"), dict) else {}
    temporal_fields = [key for key in ("version", "commencement", "extent", "amendments") if str(temporal.get(key, "")).strip()]
    manual = answer.get("manual_scores") if isinstance(answer.get("manual_scores"), dict) else {}

    scores = {
        "substantive_correctness": ratio_points(len(terms_found), len(expected_terms), 15) + min(15.0, float(manual.get("substantive_correctness", 0) or 0)),
        "authoritative_sources": ratio_points(len(official), max(1, len(citations)), 10),
        "proposition_provenance": ratio_points(cited_propositions, max(1, len(propositions)), 10) + ratio_points(len(complete_citations), max(1, len(citations)), 10),
        "pinpoint_passages": ratio_points(len(pinpoint), max(1, len(citations)), 15),
        "temporal_and_jurisdictional_context": ratio_points(len(temporal_fields), 4, 5) + min(5.0, float(manual.get("temporal_and_jurisdictional_context", 0) or 0)),
        "completeness_and_uncertainty": min(10.0, float(manual.get("completeness_and_uncertainty", 0) or 0)),
        "clarity_and_utility": min(5.0, float(manual.get("clarity_and_utility", 0) or 0)),
    }
    missing_expected_sources = [url for url in question.get("expected_sources", []) if not any(str(citation.get("url", "")).startswith(url) for citation in citations)]
    hard_failures = []
    if not official:
        hard_failures.append("no official legislation.gov.uk citation")
    if any(not proposition.get("citations") for proposition in propositions):
        hard_failures.append("one or more propositions lack citations")
    if not propositions:
        hard_failures.append("no proposition provenance ledger")
    if missing_expected_sources:
        hard_failures.append("expected selected passage not cited")
    raw_total = round(sum(scores.values()), 2)
    capped_total = min(raw_total, 49.0) if hard_failures else raw_total
    manual_complete = all(key in manual for key in ("substantive_correctness", "temporal_and_jurisdictional_context", "completeness_and_uncertainty", "clarity_and_utility"))
    return {
        "question_id": question["id"],
        "scores": scores,
        "total": capped_total,
        "raw_total": raw_total,
        "manual_review_complete": manual_complete,
        "terms_found": terms_found,
        "citation_count": len(citations),
        "hard_failures": hard_failures,
        "missing_expected_sources": missing_expected_sources,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("answers", type=Path, help="JSON array or JSONL answers")
    parser.add_argument("--suite", type=Path, default=DEFAULT_SUITE)
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    suite = json.loads(args.suite.read_text(encoding="utf-8"))
    answers = {answer.get("question_id"): answer for answer in load_answers(args.answers)}
    rows = [score_answer(question, answers[question["id"]]) for question in suite["questions"] if question["id"] in answers]
    report = {
        "schema": "okf-legislation-answer-results.v1",
        "suite": str(args.suite),
        "questions_in_suite": len(suite["questions"]),
        "answers_scored": len(rows),
        "mean_score": round(sum(row["total"] for row in rows) / len(rows), 2) if rows else 0,
        "manual_review_complete": bool(rows) and all(row["manual_review_complete"] for row in rows),
        "results": rows,
    }
    rendered = json.dumps(report, indent=2, ensure_ascii=False) + "\n"
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(rendered, encoding="utf-8")
    else:
        print(rendered, end="")


if __name__ == "__main__":
    main()
