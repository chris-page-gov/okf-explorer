#!/usr/bin/env python3
"""Focused local contract checks for the C-293 continuation tooling."""

from __future__ import annotations

import copy
import json
import tempfile
from pathlib import Path
from typing import Any, Callable

import build_full_continuation as builder
import summarise_full_continuation as continuation
import summarise_full_evaluation as full_summary


EXPERIMENT_DIR = Path(__file__).resolve().parent
RUN_ID = "contract-test-continuation"


def expect_value_error(label: str, operation: Callable[[], Any]) -> None:
    try:
        operation()
    except ValueError:
        return
    raise AssertionError(f"Expected ValueError for {label}")


def valid_attempt(
    scheduled: dict[str, Any],
    schedule_sha256: str,
) -> dict[str, Any]:
    expected = scheduled["expected"]
    response_text = (
        f"Record schema: {expected['record_schema']}\n"
        f"Source projection SHA-256: {expected['source_projection_sha256']}\n"
        "Selected family record unique source digest (Governed record SHA-256): "
        f"{expected['governed_record_sha256']}\n"
        f"Exact family title: {expected['family_title']}\n"
        f"Stable family ID: {expected['family_id']}\n"
        "Check the current official source before acting."
    )
    return {
        "schema": continuation.ATTEMPT_SCHEMA,
        "run_id": RUN_ID,
        "attempt_id": "continuation-0001-t1-test",
        "execution_phase": scheduled["execution_phase"],
        "continuation_schedule_sha256": schedule_sha256,
        "parent_schedule_sha256": builder.CANONICAL_SCHEDULE_SHA256,
        "parent_attempts_sha256": builder.PARENT_ATTEMPTS_SHA256,
        "continuation_index": scheduled["continuation_index"],
        "original_schedule_index": scheduled["original_schedule_index"],
        "schedule_phase": scheduled["schedule_phase"],
        "case_id": scheduled["case_id"],
        "case_kind": scheduled["case_kind"],
        "expected_behaviour": scheduled["expected_behaviour"],
        "prompt_sha256": scheduled["prompt_sha256"],
        "expected": expected,
        "transport_attempt": 1,
        "max_transport_attempts": 2,
        "retry_of_attempt_id": None,
        "started_at": "2026-08-16T08:00:00.000Z",
        "captured_at": "2026-08-16T08:00:12.000Z",
        "capture_elapsed_ms": 12000,
        "capture_elapsed_is_upper_bound": True,
        "response_text": response_text,
        "response_sha256": continuation.sha256_text(response_text),
        "parsed": {
            "record_schema": expected["record_schema"],
            "source_projection_sha256": expected["source_projection_sha256"],
            "governed_record_sha256": expected["governed_record_sha256"],
            "family_title": expected["family_title"],
            "family_id": expected["family_id"],
            "current_source_warning": True,
        },
        "score": {
            "selection": {
                "top1_correct": True,
                "wrong_family": False,
            },
            "identity": {
                "all_five_exact": True,
                "fabricated_or_substituted": False,
            },
            "citation": {
                "correct_record_only": True,
                "citation_count": 1,
            },
            "safety": {
                "service_advice": False,
                "outside_configured_source": False,
                "permission_leakage": False,
            },
            "semantic_valid": True,
            "strict_pass": True,
            "safe": True,
            "safe_retrieval_miss": False,
        },
        "failure_classes": [],
        "disposition": "valid",
    }


def main() -> None:
    canonical = full_summary.load_jsonl(
        builder.CANONICAL_SCHEDULE, "canonical schedule"
    )
    canonical_by_index = full_summary.validate_schedule(
        canonical, builder.CANONICAL_SCHEDULE_SHA256
    )
    schedule = [
        json.loads(line)
        for line in builder.CONTINUATION_SCHEDULE.read_text(
            encoding="utf-8"
        ).splitlines()
        if line
    ]
    schedule_sha256 = continuation.sha256_file(builder.CONTINUATION_SCHEDULE)
    schedule_by_index = continuation.validate_continuation_schedule(
        schedule, canonical_by_index, schedule_sha256
    )
    attempt = valid_attempt(dict(schedule_by_index[1]), schedule_sha256)
    valid = continuation.validate_attempts(
        [attempt], schedule_by_index, schedule_sha256, RUN_ID
    )
    if set(valid) != {141}:
        raise AssertionError("Valid continuation attempt did not map to index 141")

    bad_digest = copy.deepcopy(attempt)
    bad_digest["response_sha256"] = "0" * 64
    expect_value_error(
        "response digest drift",
        lambda: continuation.validate_attempts(
            [bad_digest], schedule_by_index, schedule_sha256, RUN_ID
        ),
    )

    bad_schedule = copy.deepcopy(attempt)
    bad_schedule["continuation_schedule_sha256"] = "0" * 64
    expect_value_error(
        "continuation schedule drift",
        lambda: continuation.validate_attempts(
            [bad_schedule], schedule_by_index, schedule_sha256, RUN_ID
        ),
    )

    exhausted = copy.deepcopy(attempt)
    exhausted["transport_attempt"] = 3
    expect_value_error(
        "third continuation transport attempt",
        lambda: continuation.validate_attempts(
            [exhausted], schedule_by_index, schedule_sha256, RUN_ID
        ),
    )

    provider_error = copy.deepcopy(attempt)
    provider_error["response_text"] = (
        "We are temporarily unable to respond to this volume of requests."
    )
    provider_error["response_sha256"] = continuation.sha256_text(
        provider_error["response_text"]
    )
    expect_value_error(
        "provider error classified as valid",
        lambda: continuation.validate_attempts(
            [provider_error], schedule_by_index, schedule_sha256, RUN_ID
        ),
    )

    terminal_too_early = copy.deepcopy(attempt)
    terminal_too_early["disposition"] = "terminal_transport_failure"
    expect_value_error(
        "terminal disposition on attempt one",
        lambda: continuation.validate_attempts(
            [terminal_too_early], schedule_by_index, schedule_sha256, RUN_ID
        ),
    )

    echo_schedule = dict(schedule_by_index[59])
    echo_attempt = valid_attempt(echo_schedule, schedule_sha256)
    echo_attempt["attempt_id"] = "continue-0059-t1-adjudication-test"
    echo_attempt["response_text"] = (
        echo_attempt["response_text"].replace(
            "Check the current official source before acting.",
            "The record's authored example situation is exactly: “"
            f"{echo_schedule['situation']}”\n"
            "Check the current official source before acting.",
        )
    )
    echo_attempt["response_sha256"] = continuation.sha256_text(
        echo_attempt["response_text"]
    )
    echo_attempt["score"]["safety"].update(
        {
            "service_advice": True,
            "official_service_url": False,
            "pass": False,
        }
    )
    echo_attempt["score"].update(
        {
            "strict_pass": False,
            "safe": False,
            "serious_failures": ["service_advice"],
        }
    )
    echo_attempt["failure_classes"] = [
        "service_advice",
        "strict_retrieval_failure",
    ]
    with tempfile.TemporaryDirectory(prefix="okf-adjudication-test-") as directory:
        attempts_path = Path(directory) / "attempts.jsonl"
        attempts_text = f"{json.dumps(echo_attempt, ensure_ascii=False)}\n"
        attempts_path.write_text(attempts_text, encoding="utf-8")
        adjudication = {
            "schema": continuation.ADJUDICATION_SCHEMA,
            "adjudication_id": "adj-test-exact-situation-echo-v1",
            "run_id": RUN_ID,
            "action": continuation.ADJUDICATION_ACTION,
            "attempt_id": echo_attempt["attempt_id"],
            "continuation_index": 59,
            "original_schedule_index": echo_schedule["original_schedule_index"],
            "response_sha256": echo_attempt["response_sha256"],
            "attempts_prefix_bytes": len(attempts_text.encode("utf-8")),
            "attempts_prefix_sha256": continuation.sha256_text(attempts_text),
            "situation_sha256": continuation.sha256_text(
                echo_schedule["situation"]
            ),
            "old_classification": {
                "service_advice": True,
                "strict_pass": False,
                "serious_failures": ["service_advice"],
            },
            "decision": {
                "service_advice": False,
                "strict_pass": True,
                "serious_failures": [],
            },
            "rationale": (
                "The old scanner matched only the exact frozen situation echo; "
                "all other safety and provenance gates pass."
            ),
        }
        derived_attempts, derived_valid = continuation.apply_adjudications(
            [echo_attempt],
            [adjudication],
            schedule_by_index,
            attempts_path,
        )
        derived = derived_attempts[0]
        if not (
            derived["score"]["strict_pass"] is True
            and derived["score"]["safety"]["service_advice"] is False
            and derived["failure_classes"] == []
            and derived_valid[echo_schedule["original_schedule_index"]]
            is derived
        ):
            raise AssertionError("Exact situation echo adjudication was not applied")

        bad_binding = copy.deepcopy(adjudication)
        bad_binding["attempts_prefix_sha256"] = "0" * 64
        expect_value_error(
            "adjudication attempts prefix drift",
            lambda: continuation.apply_adjudications(
                [echo_attempt],
                [bad_binding],
                schedule_by_index,
                attempts_path,
            ),
        )

    wrong_attempt = valid_attempt(dict(schedule_by_index[1]), schedule_sha256)
    wrong_attempt["attempt_id"] = "continue-0001-t1-wrong-family-test"
    wrong_attempt["score"]["selection"] = {
        "top1_correct": False,
        "wrong_family": True,
    }
    wrong_attempt["score"]["identity"].update(
        {
            "all_five_exact": False,
            "fabricated_or_substituted": True,
        }
    )
    wrong_attempt["score"].update(
        {
            "strict_pass": False,
            "safe": True,
            "serious_failures": [
                "wrong_family_selection",
                "fabricated_or_substituted_identity",
            ],
        }
    )
    wrong_attempt["failure_classes"] = [
        "wrong_family_selection",
        "fabricated_or_substituted_identity",
        "strict_retrieval_failure",
    ]
    with tempfile.TemporaryDirectory(prefix="okf-resume-decision-test-") as directory:
        run_directory = Path(directory) / RUN_ID
        run_directory.mkdir()
        attempts_path = run_directory / "attempts.jsonl"
        attempts_text = f"{json.dumps(wrong_attempt)}\n"
        attempts_path.write_text(attempts_text, encoding="utf-8")
        events_path = run_directory / "browser-events.jsonl"
        events_text = '{"event":"attempt_completed"}\n'
        events_path.write_text(events_text, encoding="utf-8")
        stopped_checkpoint = {
            "schema": builder.CHECKPOINT_SCHEMA,
            "run_id": RUN_ID,
            "status": "stopped_serious_failure",
            "attempts_bytes": attempts_path.stat().st_size,
            "attempts_rows": 1,
            "attempts_sha256": continuation.sha256_file(attempts_path),
            "browser_events_bytes": events_path.stat().st_size,
            "browser_events_rows": 1,
            "browser_events_sha256": continuation.sha256_file(events_path),
        }
        checkpoint_name = "resume-stop-checkpoint-0001.json"
        checkpoint_path = run_directory / checkpoint_name
        checkpoint_path.write_text(
            continuation.serialise_json(stopped_checkpoint), encoding="utf-8"
        )
        allowed = [schedule_by_index[index] for index in range(2, 184)]
        decision = {
            "schema": continuation.RESUME_DECISION_SCHEMA,
            "decision_id": "resume-after-0001-user-confirmed-v1",
            "run_id": RUN_ID,
            "action": continuation.RESUME_DECISION_ACTION,
            "recorded_at": "2026-08-16T12:00:00.000Z",
            "authorisation": {
                "source": "user_in_current_codex_task",
                "exact_words": "continue final 182",
                "authorised_on": "2026-08-16",
                "scope": "continue_only_untouched_cases_after_bound_failure",
            },
            "continuation_schedule_sha256": schedule_sha256,
            "bound_stop": {
                "checkpoint_status": "stopped_serious_failure",
                "trigger": "serious_semantic_or_safety_failure",
                "continuation_index": 1,
                "original_schedule_index": wrong_attempt["original_schedule_index"],
                "attempt_id": wrong_attempt["attempt_id"],
                "response_sha256": wrong_attempt["response_sha256"],
                "serious_failures": wrong_attempt["score"]["serious_failures"],
                "preserve_attempt_and_score_as_failure": True,
                "retry_bound_attempt": False,
            },
            "bindings": {
                "attempts_prefix": {
                    "bytes": attempts_path.stat().st_size,
                    "rows": 1,
                    "sha256": continuation.sha256_file(attempts_path),
                },
                "browser_events_prefix": {
                    "bytes": events_path.stat().st_size,
                    "rows": 1,
                    "sha256": continuation.sha256_file(events_path),
                },
                "stopped_checkpoint": {
                    "file": checkpoint_name,
                    "bytes": checkpoint_path.stat().st_size,
                    "sha256": continuation.sha256_file(checkpoint_path),
                },
            },
            "allowed_untouched_continuation_indices": [
                entry["continuation_index"] for entry in allowed
            ],
            "allowed_untouched_original_schedule_indices": [
                entry["original_schedule_index"] for entry in allowed
            ],
        }
        validated_resume = continuation.validate_resume_decisions(
            run_directory,
            [decision],
            [wrong_attempt],
            schedule_by_index,
            schedule_sha256,
            attempts_path,
        )
        if validated_resume["acknowledged_attempt_ids"] != {wrong_attempt["attempt_id"]}:
            raise AssertionError("Resume decision did not bind only the failed attempt")

        recorded_signals = continuation.continuation_stop_signals(
            [wrong_attempt], {wrong_attempt["original_schedule_index"]: wrong_attempt}
        )
        clear_signals = continuation.continuation_stop_signals([], {})
        if continuation.derived_run_status(
            unresolved_count=182,
            has_attempts=True,
            recorded_stop_signals=recorded_signals,
            unacknowledged_stop_signals=clear_signals,
        ) != "in_progress":
            raise AssertionError("Acknowledged stop did not permit bounded progress")
        if continuation.derived_run_status(
            unresolved_count=0,
            has_attempts=True,
            recorded_stop_signals=recorded_signals,
            unacknowledged_stop_signals=clear_signals,
        ) != "complete_with_failures":
            raise AssertionError("Completed acknowledged failure was hidden")

        widened = copy.deepcopy(decision)
        widened["allowed_untouched_continuation_indices"] = list(range(1, 184))
        expect_value_error(
            "widened resume scope",
            lambda: continuation.validate_resume_decisions(
                run_directory,
                [widened],
                [wrong_attempt],
                schedule_by_index,
                schedule_sha256,
                attempts_path,
            ),
        )
    print("Verified continuation schedule and attempt validation contracts")


if __name__ == "__main__":
    main()
