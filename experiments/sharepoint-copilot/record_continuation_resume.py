#!/usr/bin/env python3
"""Record one explicit, evidence-bound continuation resume decision.

This command never calls a provider. It preserves the stopped checkpoint,
appends a private decision and atomically replaces only the derived checkpoint.
The raw attempt and browser-event logs are read-only inputs.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping

import build_full_continuation as builder
import summarise_full_continuation as summary
import summarise_full_evaluation as full_summary


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("run_directory", type=Path)
    parser.add_argument("--authorisation-text", required=True)
    parser.add_argument("--authorised-on", required=True)
    return parser.parse_args()


def rows(path: Path) -> int:
    return sum(bool(line) for line in path.read_text(encoding="utf-8").splitlines())


def exclusive_write(path: Path, content: bytes) -> None:
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        os.write(descriptor, content)
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def atomic_json(path: Path, value: Mapping[str, Any]) -> None:
    content = summary.serialise_json(value).encode("utf-8")
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{path.name}.", suffix=".tmp", dir=path.parent
    )
    try:
        os.fchmod(descriptor, 0o600)
        os.write(descriptor, content)
        os.fsync(descriptor)
        os.close(descriptor)
        descriptor = -1
        os.replace(temporary_name, path)
        directory_descriptor = os.open(path.parent, os.O_RDONLY)
        try:
            os.fsync(directory_descriptor)
        finally:
            os.close(directory_descriptor)
    finally:
        if descriptor >= 0:
            os.close(descriptor)
        if os.path.exists(temporary_name):
            os.unlink(temporary_name)


def main() -> None:
    args = parse_args()
    run_directory = args.run_directory.resolve()
    summary.require(run_directory.is_dir(), f"Missing run directory: {run_directory}")
    summary.require(
        re.fullmatch(r"\d{4}-\d{2}-\d{2}", args.authorised_on) is not None,
        "--authorised-on must be an ISO date",
    )

    schedule_path = run_directory / "schedule.jsonl"
    attempts_path = run_directory / "attempts.jsonl"
    events_path = run_directory / "browser-events.jsonl"
    checkpoint_path = run_directory / "checkpoint.json"
    decisions_path = run_directory / "resume-decisions.jsonl"
    for path, label in (
        (schedule_path, "schedule"),
        (attempts_path, "attempt log"),
        (events_path, "browser-event log"),
        (checkpoint_path, "checkpoint"),
    ):
        summary.require(path.is_file(), f"Missing {label}: {path}")
    summary.require(not decisions_path.exists(), "A resume decision already exists")

    canonical = full_summary.load_jsonl(builder.CANONICAL_SCHEDULE, "canonical schedule")
    canonical_by_index = full_summary.validate_schedule(
        canonical, builder.CANONICAL_SCHEDULE_SHA256
    )
    schedule = summary.load_jsonl(schedule_path, "continuation schedule")
    schedule_sha256 = summary.sha256_file(schedule_path)
    schedule_by_index = summary.validate_continuation_schedule(
        schedule, canonical_by_index, schedule_sha256
    )
    attempts = summary.load_jsonl(attempts_path, "continuation attempts")
    summary.validate_attempts(
        attempts, schedule_by_index, schedule_sha256, run_directory.name
    )
    checkpoint = summary.load_json(checkpoint_path, "stopped checkpoint")
    summary.require(
        checkpoint.get("status") == "stopped_serious_failure",
        "The current checkpoint is not stopped after a serious failure",
    )
    summary.require(
        checkpoint.get("active_attempt_id") in (None, ""),
        "The checkpoint still names an active attempt",
    )
    summary.require(
        checkpoint.get("attempts_bytes") == attempts_path.stat().st_size
        and checkpoint.get("attempts_rows") == len(attempts)
        and checkpoint.get("attempts_sha256") == summary.sha256_file(attempts_path),
        "The stopped checkpoint does not bind the complete attempt log",
    )
    summary.require(
        checkpoint.get("browser_events_bytes") == events_path.stat().st_size
        and checkpoint.get("browser_events_rows") == rows(events_path)
        and checkpoint.get("browser_events_sha256") == summary.sha256_file(events_path),
        "The stopped checkpoint does not bind the complete browser-event log",
    )

    bound_attempt = attempts[-1]
    score = summary.require_mapping(bound_attempt.get("score"), "bound attempt score")
    serious_failures = score.get("serious_failures")
    summary.require(
        bound_attempt.get("disposition") == "valid"
        and summary.nested(score, "selection", "wrong_family") is True
        and isinstance(serious_failures, list)
        and bool(serious_failures),
        "The latest attempt is not the stopped wrong-family response",
    )
    summary.require(
        summary.sha256_text(bound_attempt["response_text"])
        == bound_attempt["response_sha256"],
        "Bound response digest drift",
    )

    attempted_indices = {attempt["continuation_index"] for attempt in attempts}
    allowed = [
        entry
        for continuation_index, entry in sorted(schedule_by_index.items())
        if continuation_index > bound_attempt["continuation_index"]
        and continuation_index not in attempted_indices
    ]
    exact_words = f"continue final {len(allowed)}"
    summary.require(
        args.authorisation_text == exact_words,
        f"Authorisation must exactly match the bounded scope: {exact_words!r}",
    )
    summary.require(allowed, "There are no untouched suffix cases to authorise")

    checkpoint_snapshot_name = (
        f"resume-stop-checkpoint-{bound_attempt['continuation_index']:04d}.json"
    )
    checkpoint_snapshot_path = run_directory / checkpoint_snapshot_name
    checkpoint_bytes = checkpoint_path.read_bytes()
    exclusive_write(checkpoint_snapshot_path, checkpoint_bytes)

    recorded_at = datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace(
        "+00:00", "Z"
    )
    summary.require(
        recorded_at.startswith(args.authorised_on),
        "The supplied authorisation date differs from the recording date",
    )
    decision_id = f"resume-after-{bound_attempt['continuation_index']:04d}-user-confirmed-v1"
    decision = {
        "schema": summary.RESUME_DECISION_SCHEMA,
        "decision_id": decision_id,
        "run_id": run_directory.name,
        "action": summary.RESUME_DECISION_ACTION,
        "recorded_at": recorded_at,
        "authorisation": {
            "source": "user_in_current_codex_task",
            "exact_words": args.authorisation_text,
            "authorised_on": args.authorised_on,
            "scope": "continue_only_untouched_cases_after_bound_failure",
        },
        "continuation_schedule_sha256": schedule_sha256,
        "bound_stop": {
            "checkpoint_status": "stopped_serious_failure",
            "trigger": "serious_semantic_or_safety_failure",
            "continuation_index": bound_attempt["continuation_index"],
            "original_schedule_index": bound_attempt["original_schedule_index"],
            "attempt_id": bound_attempt["attempt_id"],
            "response_sha256": bound_attempt["response_sha256"],
            "serious_failures": serious_failures,
            "preserve_attempt_and_score_as_failure": True,
            "retry_bound_attempt": False,
        },
        "bindings": {
            "attempts_prefix": {
                "bytes": attempts_path.stat().st_size,
                "rows": len(attempts),
                "sha256": summary.sha256_file(attempts_path),
            },
            "browser_events_prefix": {
                "bytes": events_path.stat().st_size,
                "rows": rows(events_path),
                "sha256": summary.sha256_file(events_path),
            },
            "stopped_checkpoint": {
                "file": checkpoint_snapshot_name,
                "bytes": len(checkpoint_bytes),
                "sha256": summary.sha256_bytes(checkpoint_bytes),
            },
        },
        "allowed_untouched_continuation_indices": [
            entry["continuation_index"] for entry in allowed
        ],
        "allowed_untouched_original_schedule_indices": [
            entry["original_schedule_index"] for entry in allowed
        ],
    }
    decision_bytes = f"{json.dumps(decision, ensure_ascii=False)}\n".encode("utf-8")
    exclusive_write(decisions_path, decision_bytes)

    # Validate the newly recorded evidence before clearing the derived stop.
    summary.validate_resume_decisions(
        run_directory,
        [decision],
        attempts,
        schedule_by_index,
        schedule_sha256,
        attempts_path,
    )
    resumed_checkpoint = dict(checkpoint)
    resumed_checkpoint.update(
        {
            "status": "resume_authorised",
            "stop": None,
            "preserved_stop": decision["bound_stop"],
            "resume_decisions_sha256": summary.sha256_file(decisions_path),
            "resume_decisions_rows": 1,
            "active_resume_decision_id": decision_id,
            "updated_at": recorded_at,
        }
    )
    atomic_json(checkpoint_path, resumed_checkpoint)

    print(f"Recorded {decision_id}")
    print(
        "Bound stopped attempt: "
        f"continuation {bound_attempt['continuation_index']}, "
        f"response {bound_attempt['response_sha256']}"
    )
    print(
        "Authorised untouched continuation indices: "
        f"{allowed[0]['continuation_index']}-{allowed[-1]['continuation_index']}"
    )
    print(f"Attempts prefix SHA-256: {summary.sha256_file(attempts_path)}")
    print(f"Resume decision SHA-256: {summary.sha256_file(decisions_path)}")


if __name__ == "__main__":
    main()
