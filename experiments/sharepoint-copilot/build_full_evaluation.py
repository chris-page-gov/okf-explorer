#!/usr/bin/env python3
"""Build the frozen preflight and unattended 293-family evaluation schedule."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from build_family_word import SOURCE_COMMIT, read_governed_record
from build_full_corpus import EXPECTED_FAMILY_COUNT, EXPECTED_PROJECTION_SHA256
from build_pilot_corpus import expected_identity, serialise_jsonl, sha256_file


EXPERIMENT_DIR = Path(__file__).resolve().parent
SOURCE_REPO = EXPERIMENT_DIR.parents[2] / "okf-uk-living"
FULL_CASES_PATH = EXPERIMENT_DIR / "full-corpus-cases.v1.jsonl"
PREFLIGHT_PATH = EXPERIMENT_DIR / "full-corpus-preflight.v1.jsonl"
SCHEDULE_PATH = EXPERIMENT_DIR / "full-corpus-schedule.v1.jsonl"
INSTRUCTIONS_PATH = (
    EXPERIMENT_DIR / "agent-c-literal-293-folder-v1-instructions.md"
)

PROMPT_TEMPLATE = """I need help understanding this situation: {situation}.

Using only the governed OKF records configured for this agent, identify the single best matching family if the records support one. I have not named or attached a file.

First report the record schema, source_projection SHA-256 and the selected family record's unique source digest. Then give its exact family title and stable ID and cite the record used. Do not give service advice yet.

If the records do not support one clear match, do not guess or combine families. Ask one clarifying question or say that the situation is not covered. Do not infer missing facts. Tell me to check the current official source before acting."""

SENTINELS: tuple[tuple[str, str], ...] = (
    ("access-fertility-and-reproductive-health", "fertility treatment"),
    ("correct-a-birth-registration", "amend a birth certificate"),
    ("make-freedom-of-information-request", "FOI request"),
    ("arrange-burial-or-cremation", "book crematorium"),
    ("get-mental-capacity-support", "mental capacity assessment"),
    ("get-childcare-cost-support", "help paying for childcare"),
    ("receive-written-employment-particulars", "written statement of employment"),
    ("start-work-based-apprenticeship", "become an apprentice"),
    ("access-adult-skills-training", "free adult courses"),
    ("get-vaccination", "book vaccine"),
    ("check-foreign-travel-advice", "is destination safe"),
    ("seek-planning-permission", "planning application"),
    ("apply-for-patent", "patent an invention"),
    ("get-social-care-in-later-life", "older person care assessment"),
    ("get-national-insurance-record", "check NI contributions"),
    ("appeal-court-or-tribunal-decision", "challenge court judgment"),
    ("license-taxi-or-private-hire", "taxi driver licence"),
    ("change-name", "change legal name"),
    ("use-household-recycling-service", "what can I recycle"),
    ("support-child-in-care-education", "looked-after child education"),
    ("report-product-safety-issue", "dangerous product report"),
    ("establish-social-enterprise", "set up community interest company"),
    ("access-child-trust-fund", "find child trust fund"),
    ("respond-to-vehicle-clamping-or-removal", "car clamped"),
)

AMBIGUOUS_PAIRS: tuple[tuple[str, str], ...] = (
    ("correct-a-birth-registration", "register-a-birth"),
    ("arrange-funeral", "arrange-burial-or-cremation"),
    ("apply-for-social-housing", "get-homelessness-help"),
    ("obtain-mot-test", "obtain-motor-insurance"),
)

NEGATIVES: tuple[str, ...] = (
    "A person needs to buy a television licence.",
    "A person needs a rod fishing licence.",
    "A resident wants to report a pothole.",
    "A pet owner needs to have a dog microchipped.",
)


def record(family_id: str) -> tuple[dict[str, Any], Any]:
    _, governed, binding = read_governed_record(
        SOURCE_REPO,
        SOURCE_COMMIT,
        family_id,
    )
    return governed, binding


def positive_case(position: int, family_id: str, alias: str) -> dict[str, Any]:
    governed, binding = record(family_id)
    family = governed["family"]
    if alias not in family["aliases"]:
        raise ValueError(f"Sentinel alias is not authored for {family_id}: {alias!r}")
    return {
        "schema": "explore-okf-full-corpus-preflight-case.v1",
        "case_id": f"preflight-positive-{position:02d}",
        "case_kind": "domain_balanced_indirect_signal",
        "situation": alias,
        "expected_behaviour": "select_one_family",
        "expected": expected_identity(governed, binding),
        "acceptable_family_ids": None,
        "evidence": {
            "family_id": family_id,
            "field": "family.aliases",
            "text": alias,
        },
        "synthetic_personal_data": False,
        "development_only": True,
    }


def ambiguous_case(position: int, left_id: str, right_id: str) -> dict[str, Any]:
    left, _ = record(left_id)
    right, _ = record(right_id)
    left_situation = left["family"]["situations"][0]
    right_situation = right["family"]["situations"][0]
    situation = (
        f"My situation could involve either '{left_situation}' or "
        f"'{right_situation}', but I have not said which outcome I need"
    )
    return {
        "schema": "explore-okf-full-corpus-preflight-case.v1",
        "case_id": f"preflight-ambiguous-{position:02d}",
        "case_kind": "deliberately_ambiguous_near_neighbours",
        "situation": situation,
        "expected_behaviour": "clarify_without_selecting",
        "expected": None,
        "acceptable_family_ids": [left_id, right_id],
        "evidence": {
            "left": {"family_id": left_id, "text": left_situation},
            "right": {"family_id": right_id, "text": right_situation},
        },
        "synthetic_personal_data": False,
        "development_only": True,
    }


def negative_case(position: int, situation: str) -> dict[str, Any]:
    return {
        "schema": "explore-okf-full-corpus-preflight-case.v1",
        "case_id": f"preflight-negative-{position:02d}",
        "case_kind": "closed_corpus_negative",
        "situation": situation,
        "expected_behaviour": "say_not_covered_without_citation",
        "expected": None,
        "acceptable_family_ids": None,
        "evidence": {"basis": "authored outside the 293-family projection"},
        "synthetic_personal_data": False,
        "development_only": True,
    }


def load_full_cases() -> list[dict[str, Any]]:
    cases = [
        json.loads(line)
        for line in FULL_CASES_PATH.read_text(encoding="utf-8").splitlines()
        if line
    ]
    if len(cases) != EXPECTED_FAMILY_COUNT:
        raise ValueError(f"Expected {EXPECTED_FAMILY_COUNT} full-corpus cases")
    return cases


def schedule_entry(index: int, phase: str, case: dict[str, Any]) -> dict[str, Any]:
    prompt = PROMPT_TEMPLATE.format(situation=case["situation"])
    return {
        "schema": "explore-okf-m365-full-corpus-schedule-entry.v1",
        "schedule_index": index,
        "phase": phase,
        "case_id": case["case_id"],
        "case_kind": case["case_kind"],
        "expected_behaviour": case["expected_behaviour"],
        "situation": case["situation"],
        "expected": case.get("expected"),
        "acceptable_family_ids": case.get("acceptable_family_ids"),
        "prompt": prompt,
        "prompt_sha256": hashlib.sha256(prompt.encode("utf-8")).hexdigest(),
        "max_transport_attempts": 2,
    }


def main() -> None:
    preflight = [
        positive_case(position, family_id, alias)
        for position, (family_id, alias) in enumerate(SENTINELS, start=1)
    ]
    preflight.extend(
        ambiguous_case(position, left_id, right_id)
        for position, (left_id, right_id) in enumerate(AMBIGUOUS_PAIRS, start=1)
    )
    preflight.extend(
        negative_case(position, situation)
        for position, situation in enumerate(NEGATIVES, start=1)
    )
    if len(preflight) != 32:
        raise ValueError(f"Expected 32 preflight cases, got {len(preflight)}")

    full_cases = load_full_cases()
    shuffled_full_cases = sorted(
        full_cases,
        key=lambda case: hashlib.sha256(
            f"{EXPECTED_PROJECTION_SHA256}:{case['case_id']}".encode("utf-8")
        ).hexdigest(),
    )
    schedule = [
        schedule_entry(index, "preflight", case)
        for index, case in enumerate(preflight, start=1)
    ]
    schedule.extend(
        schedule_entry(index, "full_293", case)
        for index, case in enumerate(shuffled_full_cases, start=len(schedule) + 1)
    )
    PREFLIGHT_PATH.write_text(serialise_jsonl(preflight), encoding="utf-8")
    SCHEDULE_PATH.write_text(serialise_jsonl(schedule), encoding="utf-8")
    report = {
        "instructions_sha256": sha256_file(INSTRUCTIONS_PATH),
        "preflight_cases": len(preflight),
        "preflight_sha256": sha256_file(PREFLIGHT_PATH),
        "full_family_cases": len(full_cases),
        "full_cases_sha256": sha256_file(FULL_CASES_PATH),
        "schedule_calls": len(schedule),
        "schedule_sha256": sha256_file(SCHEDULE_PATH),
    }
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
