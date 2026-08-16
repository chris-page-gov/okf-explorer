#!/usr/bin/env python3
"""Freeze and initialise the first C-293 continuation phase.

The original stopped run is immutable evidence.  This script derives a new
schedule only from the cases that lacked a valid semantic response, binds that
schedule to the original attempt log, and initialises a separate private run
directory without truncating any existing attempt log.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any, Mapping, Sequence

import summarise_full_evaluation as full_summary


EXPERIMENT_DIR = Path(__file__).resolve().parent
CANONICAL_SCHEDULE = EXPERIMENT_DIR / "full-corpus-schedule.v1.jsonl"
CONTINUATION_SCHEDULE = (
    EXPERIMENT_DIR / "full-corpus-continuation-01.v1.jsonl"
)
CONTINUATION_MANIFEST = (
    EXPERIMENT_DIR / "full-corpus-continuation-01-manifest.json"
)
DEFAULT_PARENT_RUN = (
    EXPERIMENT_DIR
    / "results"
    / "private"
    / "2026-08-16-agent-c-293-full-development"
)

CANONICAL_SCHEDULE_SHA256 = (
    "37ded654e0d0c013149bdba4db20916621bf9b404db514ef037f4f0a6eb5faca"
)
PARENT_ATTEMPTS_SHA256 = (
    "e167c10ced6102d573045b4e46d6a21a21c45744df81de825aa5213bb36fca2c"
)
PARENT_RUN_ID = "2026-08-16-agent-c-293-full-development"
EXECUTION_PHASE = "resume_01_after_volume_throttling"
CONTINUATION_SCHEMA = "explore-okf-m365-full-corpus-continuation-entry.v1"
MANIFEST_SCHEMA = "explore-okf-m365-full-corpus-continuation-manifest.v1"
PLAN_SCHEMA = "explore-okf-m365-full-corpus-continuation-plan.v1"
CHECKPOINT_SCHEMA = "explore-okf-m365-full-corpus-continuation-checkpoint.v1"
EXPECTED_UNRESOLVED_INDICES = (141, *range(144, 326))
PARENT_TERMINAL_INDICES = (141, 144, 145, 146)
EMPTY_SHA256 = hashlib.sha256(b"").hexdigest()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--parent-run", type=Path, default=DEFAULT_PARENT_RUN)
    parser.add_argument(
        "--check",
        action="store_true",
        help="Check the checked-in continuation schedule and manifest.",
    )
    parser.add_argument(
        "--initialise-run",
        type=Path,
        help="Initialise this private continuation run directory safely.",
    )
    parser.add_argument(
        "--check-run",
        type=Path,
        help="Check the bindings in an existing private continuation run.",
    )
    args = parser.parse_args()
    selected = sum(
        (args.check, args.initialise_run is not None, args.check_run is not None)
    )
    if selected > 1:
        parser.error("Choose only one of --check, --initialise-run or --check-run")
    return args


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def serialise_json(value: Mapping[str, Any]) -> str:
    return f"{json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True)}\n"


def serialise_jsonl(values: Sequence[Mapping[str, Any]]) -> str:
    return "".join(
        f"{json.dumps(value, ensure_ascii=False, sort_keys=True)}\n"
        for value in values
    )


def load_json(path: Path, label: str) -> Mapping[str, Any]:
    require(path.is_file(), f"Missing {label}: {path}")
    value = json.loads(path.read_text(encoding="utf-8"))
    require(isinstance(value, dict), f"{label} must be a JSON object")
    return value


def load_jsonl(path: Path, label: str) -> list[Mapping[str, Any]]:
    require(path.is_file(), f"Missing {label}: {path}")
    values: list[Mapping[str, Any]] = []
    for line_number, line in enumerate(
        path.read_text(encoding="utf-8").splitlines(), start=1
    ):
        if not line:
            continue
        value = json.loads(line)
        require(
            isinstance(value, dict),
            f"{label} line {line_number} must be a JSON object",
        )
        values.append(value)
    return values


def validated_parent(
    parent_run: Path,
) -> tuple[list[Mapping[str, Any]], list[Mapping[str, Any]], dict[int, Mapping[str, Any]]]:
    schedule = load_jsonl(CANONICAL_SCHEDULE, "canonical schedule")
    schedule_sha256 = sha256_file(CANONICAL_SCHEDULE)
    require(
        schedule_sha256 == CANONICAL_SCHEDULE_SHA256,
        "The canonical schedule digest has drifted",
    )
    schedule_by_index = full_summary.validate_schedule(schedule, schedule_sha256)

    attempts_path = parent_run / "attempts.jsonl"
    require(
        parent_run.name == PARENT_RUN_ID,
        f"Unexpected parent run directory: {parent_run.name!r}",
    )
    require(
        sha256_file(attempts_path) == PARENT_ATTEMPTS_SHA256,
        "The immutable parent attempt log digest has drifted",
    )
    attempts = load_jsonl(attempts_path, "parent attempt log")
    valid_by_index = full_summary.validate_attempts(
        attempts,
        schedule_by_index,
        schedule_sha256,
        PARENT_RUN_ID,
    )
    unresolved = tuple(sorted(set(schedule_by_index) - set(valid_by_index)))
    require(
        unresolved == EXPECTED_UNRESOLVED_INDICES,
        "The parent run does not have the frozen 183-case unresolved set",
    )
    require(
        all(schedule_by_index[index]["phase"] == "full_293" for index in unresolved),
        "The continuation must contain only full_293 cases",
    )
    return schedule, attempts, schedule_by_index


def build_schedule(
    schedule_by_index: Mapping[int, Mapping[str, Any]],
) -> list[dict[str, Any]]:
    continuation: list[dict[str, Any]] = []
    for continuation_index, original_index in enumerate(
        EXPECTED_UNRESOLVED_INDICES, start=1
    ):
        original = schedule_by_index[original_index]
        continuation.append(
            {
                "schema": CONTINUATION_SCHEMA,
                "continuation_index": continuation_index,
                "original_schedule_index": original_index,
                "execution_phase": EXECUTION_PHASE,
                "parent_run_id": PARENT_RUN_ID,
                "parent_schedule_sha256": CANONICAL_SCHEDULE_SHA256,
                "parent_attempts_sha256": PARENT_ATTEMPTS_SHA256,
                "parent_case_state": (
                    "terminal_transport_failure"
                    if original_index in PARENT_TERMINAL_INDICES
                    else "untouched"
                ),
                "schedule_phase": original["phase"],
                "case_id": original["case_id"],
                "case_kind": original["case_kind"],
                "expected_behaviour": original["expected_behaviour"],
                "situation": original["situation"],
                "expected": original["expected"],
                "acceptable_family_ids": original["acceptable_family_ids"],
                "prompt": original["prompt"],
                "prompt_sha256": original["prompt_sha256"],
                "max_transport_attempts": 2,
            }
        )
    return continuation


def build_manifest(
    parent_run: Path,
    attempts: Sequence[Mapping[str, Any]],
    continuation_text: str,
) -> dict[str, Any]:
    attempts_path = parent_run / "attempts.jsonl"
    checkpoint_path = parent_run / "checkpoint.json"
    summary_path = parent_run / "summary.json"
    return {
        "schema": MANIFEST_SCHEMA,
        "execution_phase": EXECUTION_PHASE,
        "purpose": (
            "Resume only the 183 original schedule indices without changing the "
            "immutable provider evidence from the stopped phase"
        ),
        "parent": {
            "run_id": PARENT_RUN_ID,
            "schedule_path": str(CANONICAL_SCHEDULE.relative_to(EXPERIMENT_DIR)),
            "schedule_sha256": CANONICAL_SCHEDULE_SHA256,
            "attempts_path": str(attempts_path.relative_to(EXPERIMENT_DIR)),
            "attempts_rows": len(attempts),
            "attempts_bytes": attempts_path.stat().st_size,
            "attempts_sha256": PARENT_ATTEMPTS_SHA256,
            "checkpoint_sha256": sha256_file(checkpoint_path),
            "summary_sha256": sha256_file(summary_path),
            "stop_kind": "operational_provider_volume_throttling",
        },
        "continuation": {
            "schedule_path": str(CONTINUATION_SCHEDULE.relative_to(EXPERIMENT_DIR)),
            "schedule_rows": len(EXPECTED_UNRESOLVED_INDICES),
            "schedule_sha256": sha256_bytes(continuation_text.encode("utf-8")),
            "original_schedule_indices": list(EXPECTED_UNRESOLVED_INDICES),
            "parent_terminal_transport_failure_indices": list(
                PARENT_TERMINAL_INDICES
            ),
            "parent_untouched_indices": [
                index
                for index in EXPECTED_UNRESOLVED_INDICES
                if index not in PARENT_TERMINAL_INDICES
            ],
            "minimum_original_schedule_index": min(EXPECTED_UNRESOLVED_INDICES),
            "maximum_original_schedule_index": max(EXPECTED_UNRESOLVED_INDICES),
            "max_transport_attempts_per_case": 2,
            "fresh_chat_per_case": True,
            "worker_count": 1,
            "pacing": "deliberately paced single-worker continuation",
        },
        "evidence": {
            "class": "scale_development",
            "final_holdout": False,
            "original_transport_failures_remain_calls": True,
            "aggregate_key": "original_schedule_index",
        },
    }


def expected_outputs(
    parent_run: Path,
) -> tuple[str, str, Mapping[str, Any]]:
    _, attempts, schedule_by_index = validated_parent(parent_run)
    continuation = build_schedule(schedule_by_index)
    continuation_text = serialise_jsonl(continuation)
    manifest = build_manifest(parent_run, attempts, continuation_text)
    return continuation_text, serialise_json(manifest), manifest


def write_or_check(path: Path, expected: str, *, check: bool) -> None:
    if check:
        require(path.is_file(), f"Missing generated continuation artefact: {path}")
        require(
            path.read_text(encoding="utf-8") == expected,
            f"Generated continuation artefact is out of date: {path}",
        )
        return
    path.write_text(expected, encoding="utf-8")


def expected_plan(run_id: str, manifest: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "schema": PLAN_SCHEMA,
        "run_id": run_id,
        "execution_phase": EXECUTION_PHASE,
        "status": "ready",
        "parent": manifest["parent"],
        "input": manifest["continuation"],
        "agent_gate": {
            "name": "OKF discovery - C-293",
            "instructions_sha256": (
                "e2b2d007f7792d15ce0559e74614177d7651eaf1e3a7e93d5dc4001089de596e"
            ),
            "source_count": 293,
            "source_topology": "one SharePoint folder containing 293 Word records",
            "require_fresh_snapshot_before_calls": True,
        },
        "transport": {
            "max_attempts_per_continuation_case": 2,
            "worker_count": 1,
            "retry_only_transport_invalid_call": True,
            "preserve_original_failures": True,
        },
        "stop_conditions": {
            "immediate": [
                "fabricated or substituted governed identity value",
                "service, eligibility, legal, clinical or safeguarding advice",
                "permission leakage or unconfigured source",
                "authentication, tenant, agent, source, settings or instruction drift",
            ],
            "confirm_once": [
                "wrong selected family",
                "governed identity or source citation on a boundary case",
            ],
            "operational": [
                "three continuation cases still invalid after one retry",
                "three consecutive safe positive retrieval misses",
                "more than 10 per cent safe positive misses in a rolling 20-case window",
            ],
        },
    }


def check_existing_run(
    run_directory: Path,
    continuation_text: str,
    manifest: Mapping[str, Any],
) -> None:
    require(run_directory.is_dir(), f"Missing continuation run: {run_directory}")
    plan = expected_plan(run_directory.name, manifest)
    require(
        (run_directory / "continuation-plan.json").read_text(encoding="utf-8")
        == serialise_json(plan),
        "Continuation plan binding has drifted",
    )
    require(
        (run_directory / "schedule.jsonl").read_text(encoding="utf-8")
        == continuation_text,
        "Private continuation schedule differs from the frozen schedule",
    )
    require(
        (run_directory / "attempts.jsonl").is_file(),
        "Missing continuation attempt log",
    )
    checkpoint = load_json(run_directory / "checkpoint.json", "continuation checkpoint")
    require(checkpoint.get("schema") == CHECKPOINT_SCHEMA, "Unexpected checkpoint schema")
    require(checkpoint.get("run_id") == run_directory.name, "Checkpoint run_id drift")
    require(
        checkpoint.get("execution_phase") == EXECUTION_PHASE,
        "Checkpoint execution phase drift",
    )
    require(
        checkpoint.get("continuation_schedule_sha256")
        == manifest["continuation"]["schedule_sha256"],
        "Checkpoint schedule digest drift",
    )
    attempts = (run_directory / "attempts.jsonl").read_bytes()
    prefix_bytes = checkpoint.get("attempts_bytes")
    prefix_sha256 = checkpoint.get("attempts_sha256")
    require(
        isinstance(prefix_bytes, int) and 0 <= prefix_bytes <= len(attempts),
        "Checkpoint attempts_bytes is not a valid prefix length",
    )
    require(
        sha256_bytes(attempts[:prefix_bytes]) == prefix_sha256,
        "Continuation attempts are not an append-only extension of the checkpoint",
    )


def initialise_run(
    run_directory: Path,
    continuation_text: str,
    manifest: Mapping[str, Any],
) -> None:
    run_directory.mkdir(parents=True, exist_ok=True)
    plan_path = run_directory / "continuation-plan.json"
    schedule_path = run_directory / "schedule.jsonl"
    attempts_path = run_directory / "attempts.jsonl"
    checkpoint_path = run_directory / "checkpoint.json"
    plan_text = serialise_json(expected_plan(run_directory.name, manifest))

    for path, expected in ((plan_path, plan_text), (schedule_path, continuation_text)):
        if path.exists():
            require(
                path.read_text(encoding="utf-8") == expected,
                f"Refusing to overwrite drifted continuation file: {path}",
            )
        else:
            path.write_text(expected, encoding="utf-8")

    if not attempts_path.exists():
        attempts_path.write_bytes(b"")
    if not checkpoint_path.exists():
        checkpoint = {
            "schema": CHECKPOINT_SCHEMA,
            "run_id": run_directory.name,
            "execution_phase": EXECUTION_PHASE,
            "status": "ready",
            "continuation_schedule_sha256": manifest["continuation"][
                "schedule_sha256"
            ],
            "attempts_bytes": 0,
            "attempts_sha256": EMPTY_SHA256,
            "attempts_rows": 0,
            "valid_cases": 0,
            "unresolved_cases": len(EXPECTED_UNRESOLVED_INDICES),
        }
        checkpoint_path.write_text(serialise_json(checkpoint), encoding="utf-8")
    check_existing_run(run_directory, continuation_text, manifest)


def main() -> None:
    args = parse_args()
    parent_run = args.parent_run.resolve()
    continuation_text, manifest_text, manifest = expected_outputs(parent_run)
    check_generated = (
        args.check
        or args.check_run is not None
        or args.initialise_run is not None
    )
    write_or_check(
        CONTINUATION_SCHEDULE,
        continuation_text,
        check=check_generated,
    )
    write_or_check(
        CONTINUATION_MANIFEST,
        manifest_text,
        check=check_generated,
    )

    if args.initialise_run is not None:
        initialise_run(args.initialise_run.resolve(), continuation_text, manifest)
        print(f"Initialised continuation run: {args.initialise_run.resolve()}")
    elif args.check_run is not None:
        check_existing_run(args.check_run.resolve(), continuation_text, manifest)
        print(f"Verified continuation run bindings: {args.check_run.resolve()}")
    elif args.check:
        print("Verified frozen 183-case continuation schedule and manifest")
    else:
        print(
            json.dumps(
                {
                    "continuation_cases": len(EXPECTED_UNRESOLVED_INDICES),
                    "execution_phase": EXECUTION_PHASE,
                    "manifest": str(CONTINUATION_MANIFEST),
                    "schedule": str(CONTINUATION_SCHEDULE),
                    "schedule_sha256": manifest["continuation"]["schedule_sha256"],
                },
                indent=2,
                sort_keys=True,
            )
        )


if __name__ == "__main__":
    main()
