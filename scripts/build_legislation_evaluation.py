#!/usr/bin/env python3
"""Generate the 100-question legal-answer evaluation suite."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "evaluation" / "legislation" / "questions.json"

TARGETS = [
    ("public-law", "Human Rights Act 1998 section 6", "https://www.legislation.gov.uk/ukpga/1998/42/section/6", ["unlawful", "public authority", "Convention right"]),
    ("equality", "Equality Act 2010 section 19", "https://www.legislation.gov.uk/ukpga/2010/15/section/19", ["indirect discrimination", "provision, criterion or practice", "proportionate means"]),
    ("company", "Companies Act 2006 section 172", "https://www.legislation.gov.uk/ukpga/2006/46/section/172", ["good faith", "success of the company", "members as a whole"]),
    ("consumer", "Consumer Rights Act 2015 section 9", "https://www.legislation.gov.uk/ukpga/2015/15/section/9", ["satisfactory quality", "goods", "reasonable person"]),
    ("employment", "Employment Rights Act 1996 section 94", "https://www.legislation.gov.uk/ukpga/1996/18/section/94", ["employee", "right", "unfairly dismissed"]),
    ("data-protection", "Data Protection Act 2018 section 3", "https://www.legislation.gov.uk/ukpga/2018/12/section/3", ["personal data", "processing", "information"]),
    ("retained-eu", "UK GDPR Article 6", "https://www.legislation.gov.uk/eur/2016/679/article/6", ["lawful", "processing", "legal basis"]),
    ("criminal", "Theft Act 1968 section 1", "https://www.legislation.gov.uk/ukpga/1968/60/section/1", ["dishonestly", "appropriates", "property belonging to another"]),
    ("criminal", "Fraud Act 2006 section 2", "https://www.legislation.gov.uk/ukpga/2006/35/section/2", ["false representation", "dishonestly", "gain"]),
    ("evidence", "Police and Criminal Evidence Act 1984 section 78", "https://www.legislation.gov.uk/ukpga/1984/60/section/78", ["exclude", "evidence", "adverse effect"]),
    ("limitation", "Limitation Act 1980 section 2", "https://www.legislation.gov.uk/ukpga/1980/58/section/2", ["six years", "cause of action", "tort"]),
    ("tort", "Occupiers' Liability Act 1957 section 2", "https://www.legislation.gov.uk/ukpga/Eliz2/5-6/31/section/2", ["common duty of care", "visitor", "reasonable"]),
    ("children", "Children Act 1989 section 1", "https://www.legislation.gov.uk/ukpga/1989/41/section/1", ["welfare", "paramount", "child"]),
    ("family", "Matrimonial Causes Act 1973 section 25", "https://www.legislation.gov.uk/ukpga/1973/18/section/25", ["circumstances", "welfare", "financial resources"]),
    ("housing", "Housing Act 1988 section 21", "https://www.legislation.gov.uk/ukpga/1988/50/section/21", ["assured shorthold tenancy", "notice", "possession"]),
    ("planning", "Town and Country Planning Act 1990 section 55", "https://www.legislation.gov.uk/ukpga/1990/8/section/55", ["development", "building", "material change"]),
    ("environment", "Environment Act 2021 section 1", "https://www.legislation.gov.uk/ukpga/2021/30/section/1", ["environmental targets", "Secretary of State", "regulations"]),
    ("immigration", "Immigration Act 1971 section 3", "https://www.legislation.gov.uk/ukpga/1971/77/section/3", ["leave", "enter", "remain"]),
    ("arbitration", "Arbitration Act 1996 section 1", "https://www.legislation.gov.uk/ukpga/1996/23/section/1", ["fair resolution", "delay", "party autonomy"]),
    ("devolution", "Scotland Act 1998 section 29", "https://www.legislation.gov.uk/ukpga/1998/46/section/29", ["legislative competence", "Scottish Parliament", "outside competence"]),
    ("devolution", "Government of Wales Act 2006 section 107", "https://www.legislation.gov.uk/ukpga/2006/32/section/107", ["Senedd", "legislative competence", "Act"]),
    ("devolution", "Northern Ireland Act 1998 section 6", "https://www.legislation.gov.uk/ukpga/1998/47/section/6", ["legislative competence", "Assembly", "outside competence"]),
    ("constitutional", "European Union (Withdrawal) Act 2018 section 4", "https://www.legislation.gov.uk/ukpga/2018/16/section/4", ["rights", "EU law", "domestic law"]),
    ("secondary-health-safety", "Management of Health and Safety at Work Regulations 1999 regulation 3", "https://www.legislation.gov.uk/uksi/1999/3242/regulation/3", ["risk assessment", "employer", "suitable and sufficient"]),
    ("secondary-employment", "Working Time Regulations 1998 regulation 13", "https://www.legislation.gov.uk/uksi/1998/1833/regulation/13", ["annual leave", "worker", "leave year"]),
]

PROMPTS = [
    ("rule", "State the legal rule in {name}, identifying each element, qualification and exception in the text.", "rule extraction and elements"),
    ("application", "How should counsel analyse a disputed fact pattern under {name}? Give the statutory sequence of questions without inventing facts.", "application, conditions and exceptions"),
    ("currency", "Is {name} currently safe to rely on? Identify version, commencement, extent and amendment issues that must be checked.", "temporal status, commencement, extent and effects"),
    ("provenance", "Prepare a concise submission on {name}. Attach proposition-level provenance and direct links to every selected passage.", "barrister-style synthesis with complete provenance"),
]

RUBRIC = {
    "substantive_correctness": {"points": 30, "mode": "15 automated term coverage + 15 expert review", "checks": ["states the operative rule accurately", "distinguishes conditions, exceptions and discretions", "does not overstate the supplied authority"]},
    "authoritative_sources": {"points": 10, "mode": "automated", "checks": ["uses legislation.gov.uk or another declared primary authority", "identifies each source by title"]},
    "proposition_provenance": {"points": 20, "mode": "automated structural validation", "checks": ["every material proposition maps to one or more citations", "each citation carries source title, passage text and retrieval date"]},
    "pinpoint_passages": {"points": 15, "mode": "automated", "checks": ["links point to a section, article, regulation, rule, schedule or other selected passage", "quoted or paraphrased passage is supplied"]},
    "temporal_and_jurisdictional_context": {"points": 10, "mode": "automated evidence + expert review", "checks": ["states version or point in time", "checks commencement and extent", "checks amendments and unapplied effects"]},
    "completeness_and_uncertainty": {"points": 10, "mode": "expert review", "checks": ["addresses each part of the question", "flags missing facts and adverse or unresolved material", "separates law from inference"]},
    "clarity_and_utility": {"points": 5, "mode": "expert review", "checks": ["answer-first structure", "usable by counsel", "no unsupported legal advice claim"]},
}


def build() -> dict:
    questions = []
    number = 1
    for category, name, source, terms in TARGETS:
        for kind, template, coverage in PROMPTS:
            questions.append({
                "id": f"LQ{number:03d}",
                "category": category,
                "question_type": kind,
                "prompt": template.format(name=name),
                "authority": name,
                "expected_sources": [source],
                "expected_terms": terms,
                "answer_requirements": [coverage, "proposition-to-citation provenance ledger", "official selected-passage links", "version, commencement, extent and amendments where material"],
                "tags": [category, kind, "official-legislation", "provenance"],
            })
            number += 1
    return {
        "schema": "okf-legislation-answer-evaluation.v1",
        "title": "UK Legislation Barrister-Question Evaluation Suite",
        "description": "100 questions across primary, secondary, retained-EU, devolved and historical legislation. Scores legal-answer quality and complete proposition-level provenance.",
        "target_bundle": "https://chris-page-gov.github.io/okf-uk-legislation/okf-explorer.json",
        "rubric": RUBRIC,
        "answer_schema": "answer-schema.json",
        "questions": questions,
    }


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(build(), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {OUTPUT.relative_to(ROOT)} with {len(build()['questions'])} questions")


if __name__ == "__main__":
    main()
