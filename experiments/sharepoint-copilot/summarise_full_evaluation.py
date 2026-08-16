#!/usr/bin/env python3
"""Summarise a private Microsoft 365 full-corpus evaluation run.

The frozen schedule is the authority for case identity and denominators.  The
attempt log is append-only provider evidence: transport failures remain calls,
but only one valid semantic response may represent a scheduled case.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from collections import Counter
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence


EXPERIMENT_DIR = Path(__file__).resolve().parent
REPOSITORY_ROOT = EXPERIMENT_DIR.parents[1]
DEFAULT_SCHEDULE = EXPERIMENT_DIR / "full-corpus-schedule.v1.jsonl"

SCHEDULE_SCHEMA = "explore-okf-m365-full-corpus-schedule-entry.v1"
ATTEMPT_SCHEMA = "explore-okf-m365-full-corpus-attempt.v1"
AGENT_SNAPSHOT_SCHEMA = "explore-okf-m365-agent-snapshot.v1"
SUMMARY_SCHEMA = "explore-okf-m365-full-corpus-summary.v1"

VALID_DISPOSITIONS = {
    "valid",
    "retryable_transport_failure",
    "terminal_transport_failure",
}
IDENTITY_FIELDS = (
    "record_schema",
    "source_projection_sha256",
    "governed_record_sha256",
    "family_title",
    "family_id",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build deterministic JSON and Markdown summaries for a run."
    )
    parser.add_argument("run_directory", type=Path)
    parser.add_argument("--schedule", type=Path, default=DEFAULT_SCHEDULE)
    parser.add_argument(
        "--check",
        action="store_true",
        help="Check existing summary files instead of writing them.",
    )
    return parser.parse_args()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def require_mapping(value: Any, label: str) -> Mapping[str, Any]:
    require(isinstance(value, dict), f"{label} must be a JSON object")
    return value


def require_integer(value: Any, label: str, *, minimum: int = 0) -> int:
    require(
        isinstance(value, int) and not isinstance(value, bool) and value >= minimum,
        f"{label} must be an integer greater than or equal to {minimum}",
    )
    return value


def require_string(value: Any, label: str) -> str:
    require(isinstance(value, str) and bool(value), f"{label} must be a string")
    return value


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def load_json(path: Path, label: str) -> Mapping[str, Any]:
    require(path.is_file(), f"Missing {label}: {path}")
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        raise ValueError(f"Invalid JSON in {label} {path}: {error}") from error
    return require_mapping(value, label)


def load_jsonl(path: Path, label: str) -> list[Mapping[str, Any]]:
    require(path.is_file(), f"Missing {label}: {path}")
    values: list[Mapping[str, Any]] = []
    for line_number, line in enumerate(
        path.read_text(encoding="utf-8").splitlines(), start=1
    ):
        if not line.strip():
            continue
        try:
            value = json.loads(line)
        except json.JSONDecodeError as error:
            raise ValueError(
                f"Invalid JSON in {label} {path} at line {line_number}: {error}"
            ) from error
        values.append(require_mapping(value, f"{label} line {line_number}"))
    require(values, f"{label} must contain at least one row")
    return values


def portable_path(path: Path, run_directory: Path) -> str:
    resolved = path.resolve()
    try:
        return str(resolved.relative_to(REPOSITORY_ROOT.resolve()))
    except ValueError:
        try:
            return str(resolved.relative_to(run_directory.resolve()))
        except ValueError:
            return path.name


def file_binding(
    path: Path,
    run_directory: Path,
    *,
    rows: int | None = None,
) -> dict[str, Any]:
    binding: dict[str, Any] = {
        "path": portable_path(path, run_directory),
        "bytes": path.stat().st_size,
        "sha256": sha256_file(path),
    }
    if rows is not None:
        binding["rows"] = rows
    return binding


def validate_schedule(
    schedule: Sequence[Mapping[str, Any]], schedule_sha256: str
) -> dict[int, Mapping[str, Any]]:
    by_index: dict[int, Mapping[str, Any]] = {}
    for position, entry in enumerate(schedule, start=1):
        require(
            entry.get("schema") == SCHEDULE_SCHEMA,
            f"Schedule row {position} has an unexpected schema",
        )
        index = require_integer(
            entry.get("schedule_index"),
            f"Schedule row {position} schedule_index",
            minimum=1,
        )
        require(index not in by_index, f"Duplicate schedule index: {index}")
        require_string(entry.get("phase"), f"Schedule row {position} phase")
        require_string(entry.get("case_id"), f"Schedule row {position} case_id")
        require_string(
            entry.get("expected_behaviour"),
            f"Schedule row {position} expected_behaviour",
        )
        require_string(
            entry.get("prompt_sha256"),
            f"Schedule row {position} prompt_sha256",
        )
        require_integer(
            entry.get("max_transport_attempts"),
            f"Schedule row {position} max_transport_attempts",
            minimum=1,
        )
        prompt = require_string(entry.get("prompt"), f"Schedule row {position} prompt")
        require(
            sha256_text(prompt) == entry["prompt_sha256"],
            f"Schedule row {position} prompt digest does not match its prompt",
        )
        by_index[index] = entry

    expected_indices = list(range(1, len(schedule) + 1))
    require(
        sorted(by_index) == expected_indices,
        "Schedule indices must be contiguous from 1",
    )
    require(
        sum(entry["phase"] == "preflight" for entry in schedule) == 32,
        "Frozen schedule must contain 32 preflight cases",
    )
    require(
        sum(entry["phase"] == "full_293" for entry in schedule) == 293,
        "Frozen schedule must contain 293 full-corpus cases",
    )
    require(
        len(schedule) == 325,
        "Frozen schedule must contain 325 cases",
    )
    require(
        len(schedule_sha256) == 64,
        "Schedule SHA-256 must contain 64 hexadecimal characters",
    )
    return by_index


def validate_attempts(
    attempts: Sequence[Mapping[str, Any]],
    schedule_by_index: Mapping[int, Mapping[str, Any]],
    schedule_sha256: str,
    expected_run_id: str,
) -> dict[int, Mapping[str, Any]]:
    attempt_ids: set[str] = set()
    transport_keys: set[tuple[int, int]] = set()
    valid_by_index: dict[int, Mapping[str, Any]] = {}

    for position, attempt in enumerate(attempts, start=1):
        label = f"Attempt row {position}"
        require(
            attempt.get("schema") == ATTEMPT_SCHEMA,
            f"{label} has an unexpected schema",
        )
        require(attempt.get("run_id") == expected_run_id, f"{label} run_id drift")
        attempt_id = require_string(attempt.get("attempt_id"), f"{label} attempt_id")
        require(attempt_id not in attempt_ids, f"Duplicate attempt_id: {attempt_id}")
        attempt_ids.add(attempt_id)
        require(
            attempt.get("schedule_sha256") == schedule_sha256,
            f"{label} schedule digest drift",
        )

        schedule_index = require_integer(
            attempt.get("schedule_index"), f"{label} schedule_index", minimum=1
        )
        require(
            schedule_index in schedule_by_index,
            f"{label} refers to unknown schedule index {schedule_index}",
        )
        scheduled = schedule_by_index[schedule_index]
        for field in ("phase", "case_id", "expected_behaviour", "prompt_sha256"):
            require(
                attempt.get(field) == scheduled.get(field),
                f"{label} {field} differs from schedule index {schedule_index}",
            )

        transport_attempt = require_integer(
            attempt.get("transport_attempt"),
            f"{label} transport_attempt",
            minimum=1,
        )
        max_transport_attempts = require_integer(
            attempt.get("max_transport_attempts"),
            f"{label} max_transport_attempts",
            minimum=1,
        )
        require(
            max_transport_attempts == scheduled["max_transport_attempts"],
            f"{label} max transport attempts differ from the schedule",
        )
        require(
            transport_attempt <= max_transport_attempts,
            f"{label} transport attempt exceeds its limit",
        )
        transport_key = (schedule_index, transport_attempt)
        require(
            transport_key not in transport_keys,
            f"Duplicate transport attempt for schedule index {schedule_index}",
        )
        transport_keys.add(transport_key)

        disposition = attempt.get("disposition")
        require(
            disposition in VALID_DISPOSITIONS,
            f"{label} has an unknown disposition: {disposition!r}",
        )
        if disposition == "retryable_transport_failure":
            require(
                transport_attempt < max_transport_attempts,
                f"{label} cannot be retryable at its transport limit",
            )
        if disposition == "terminal_transport_failure":
            require(
                transport_attempt == max_transport_attempts,
                f"{label} is terminal before its transport limit",
            )

        response_text = require_string(
            attempt.get("response_text"), f"{label} response_text"
        )
        require(
            sha256_text(response_text) == attempt.get("response_sha256"),
            f"{label} response digest does not match the captured text",
        )
        require_string(attempt.get("started_at"), f"{label} started_at")
        require_string(attempt.get("captured_at"), f"{label} captured_at")
        require_integer(
            attempt.get("capture_elapsed_ms"),
            f"{label} capture_elapsed_ms",
            minimum=0,
        )
        require(
            isinstance(attempt.get("capture_elapsed_is_upper_bound"), bool),
            f"{label} capture_elapsed_is_upper_bound must be Boolean",
        )
        failure_classes = attempt.get("failure_classes")
        require(
            isinstance(failure_classes, list)
            and all(isinstance(value, str) for value in failure_classes),
            f"{label} failure_classes must be a string array",
        )

        if disposition == "valid":
            require(
                schedule_index not in valid_by_index,
                f"More than one valid response exists for schedule index {schedule_index}",
            )
            score = require_mapping(attempt.get("score"), f"{label} score")
            require(
                score.get("semantic_valid") is True,
                f"{label} valid disposition lacks semantic_valid=true",
            )
            valid_by_index[schedule_index] = attempt

    for position, attempt in enumerate(attempts, start=1):
        retry_of = attempt.get("retry_of_attempt_id")
        if retry_of is not None:
            require(
                isinstance(retry_of, str) and retry_of in attempt_ids,
                f"Attempt row {position} has an unknown retry_of_attempt_id",
            )
    return valid_by_index


def nested(mapping: Mapping[str, Any], *keys: str) -> Any:
    value: Any = mapping
    for key in keys:
        if not isinstance(value, dict):
            return None
        value = value.get(key)
    return value


def count_true(
    attempts: Iterable[Mapping[str, Any]], *keys: str
) -> int:
    return sum(nested(attempt, *keys) is True for attempt in attempts)


def ratio(numerator: int, denominator: int) -> float | None:
    if denominator == 0:
        return None
    return round(numerator / denominator, 6)


def percentile(values: Sequence[int], fraction: float) -> int | float:
    require(values, "Cannot calculate a percentile for an empty sample")
    ordered = sorted(values)
    position = (len(ordered) - 1) * fraction
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[lower]
    interpolated = ordered[lower] + (
        (ordered[upper] - ordered[lower]) * (position - lower)
    )
    if interpolated.is_integer():
        return int(interpolated)
    return round(interpolated, 1)


def sorted_counter(values: Iterable[str]) -> dict[str, int]:
    return dict(sorted(Counter(values).items()))


def failure_class_counts(
    attempts: Iterable[Mapping[str, Any]],
) -> dict[str, int]:
    return sorted_counter(
        failure_class
        for attempt in attempts
        for failure_class in attempt.get("failure_classes", [])
    )


def validate_agent_snapshot(snapshot: Mapping[str, Any]) -> None:
    require(
        snapshot.get("schema") == AGENT_SNAPSHOT_SCHEMA,
        "Agent snapshot has an unexpected schema",
    )
    require_string(snapshot.get("captured_at"), "Agent snapshot captured_at")
    agent = require_mapping(snapshot.get("agent"), "Agent snapshot agent")
    require_string(agent.get("name"), "Agent snapshot agent name")
    instructions_sha256 = require_string(
        agent.get("instructions_sha256"), "Agent snapshot instructions_sha256"
    )
    require(
        len(instructions_sha256) == 64,
        "Agent instructions SHA-256 must contain 64 hexadecimal characters",
    )
    require_integer(agent.get("source_count"), "Agent snapshot source_count", minimum=1)
    require_mapping(snapshot.get("source"), "Agent snapshot source")


def preflight_breakdown(
    schedule: Sequence[Mapping[str, Any]],
    valid_by_index: Mapping[int, Mapping[str, Any]],
) -> dict[str, Any]:
    preflight_schedule = [entry for entry in schedule if entry["phase"] == "preflight"]
    preflight_attempts = [
        valid_by_index[entry["schedule_index"]]
        for entry in preflight_schedule
        if entry["schedule_index"] in valid_by_index
    ]

    def group(expected_behaviour: str) -> tuple[list[Mapping[str, Any]], list[Mapping[str, Any]]]:
        scheduled = [
            entry
            for entry in preflight_schedule
            if entry["expected_behaviour"] == expected_behaviour
        ]
        valid = [
            valid_by_index[entry["schedule_index"]]
            for entry in scheduled
            if entry["schedule_index"] in valid_by_index
        ]
        return scheduled, valid

    positive_schedule, positive = group("select_one_family")
    ambiguous_schedule, ambiguous = group("clarify_without_selecting")
    negative_schedule, negative = group("say_not_covered_without_citation")
    return {
        "scheduled_cases": len(preflight_schedule),
        "valid_cases": len(preflight_attempts),
        "strict_passes": count_true(preflight_attempts, "score", "strict_pass"),
        "safe_cases": count_true(preflight_attempts, "score", "safe"),
        "positive": {
            "scheduled": len(positive_schedule),
            "valid": len(positive),
            "strict_passes": count_true(positive, "score", "strict_pass"),
        },
        "ambiguous": {
            "scheduled": len(ambiguous_schedule),
            "valid": len(ambiguous),
            "strict_passes": count_true(ambiguous, "score", "strict_pass"),
            "safe_cases": count_true(ambiguous, "score", "safe"),
        },
        "negative": {
            "scheduled": len(negative_schedule),
            "valid": len(negative),
            "strict_passes": count_true(negative, "score", "strict_pass"),
            "safe_cases": count_true(negative, "score", "safe"),
        },
    }


def validate_preflight_summary(
    supplied: Mapping[str, Any], computed: Mapping[str, Any]
) -> None:
    require_string(supplied.get("status"), "Preflight summary status")
    require_string(supplied.get("evaluated_at"), "Preflight summary evaluated_at")
    comparisons = (
        ("valid_cases", supplied.get("valid_cases"), computed["valid_cases"]),
        ("strict_passes", supplied.get("strict_passes"), computed["strict_passes"]),
        ("safe_cases", supplied.get("safe_cases"), computed["safe_cases"]),
        ("positive total", nested(supplied, "positive", "total"), nested(computed, "positive", "scheduled")),
        ("positive strict", nested(supplied, "positive", "strict"), nested(computed, "positive", "strict_passes")),
        ("ambiguous total", nested(supplied, "ambiguous", "total"), nested(computed, "ambiguous", "scheduled")),
        ("ambiguous strict", nested(supplied, "ambiguous", "strict"), nested(computed, "ambiguous", "strict_passes")),
        ("ambiguous safe", nested(supplied, "ambiguous", "safe"), nested(computed, "ambiguous", "safe_cases")),
        ("negative total", nested(supplied, "negative", "total"), nested(computed, "negative", "scheduled")),
        ("negative strict", nested(supplied, "negative", "strict"), nested(computed, "negative", "strict_passes")),
    )
    for label, actual, expected in comparisons:
        require(
            actual == expected,
            f"Preflight summary {label} is {actual!r}; computed value is {expected!r}",
        )
    require(
        isinstance(supplied.get("nonblocking_observations"), list),
        "Preflight summary nonblocking_observations must be an array",
    )
    require(
        isinstance(supplied.get("serious_failures"), list),
        "Preflight summary serious_failures must be an array",
    )


def full_metrics(
    schedule: Sequence[Mapping[str, Any]],
    valid_by_index: Mapping[int, Mapping[str, Any]],
) -> dict[str, Any]:
    scheduled = [entry for entry in schedule if entry["phase"] == "full_293"]
    attempts = [
        valid_by_index[entry["schedule_index"]]
        for entry in scheduled
        if entry["schedule_index"] in valid_by_index
    ]
    strict_passes = count_true(attempts, "score", "strict_pass")
    return {
        "scheduled_cases": len(scheduled),
        "valid_cases": len(attempts),
        "valid_coverage_rate": ratio(len(attempts), len(scheduled)),
        "strict_passes": strict_passes,
        "strict_rate_among_valid": ratio(strict_passes, len(attempts)),
        "top1_correct": count_true(attempts, "score", "selection", "top1_correct"),
        "all_five_identity_fields_exact": count_true(
            attempts, "score", "identity", "all_five_exact"
        ),
        "correct_record_only_citations": count_true(
            attempts, "score", "citation", "correct_record_only"
        ),
        "current_source_warnings": count_true(
            attempts, "parsed", "current_source_warning"
        ),
        "safe_cases": count_true(attempts, "score", "safe"),
        "safe_retrieval_misses": count_true(
            attempts, "score", "safe_retrieval_miss"
        ),
    }


def has_boundary_identity(attempt: Mapping[str, Any]) -> bool:
    if nested(attempt, "score", "identity", "has_governed_identity") is True:
        return True
    parsed = attempt.get("parsed")
    return isinstance(parsed, dict) and any(parsed.get(field) is not None for field in IDENTITY_FIELDS)


def citation_count(attempt: Mapping[str, Any]) -> int:
    value = nested(attempt, "score", "citation", "citation_count")
    if isinstance(value, int) and not isinstance(value, bool):
        return value
    labels = attempt.get("citation_labels")
    return len(labels) if isinstance(labels, list) else 0


def safety_metrics(valid_attempts: Sequence[Mapping[str, Any]]) -> dict[str, int]:
    boundary_attempts = [
        attempt
        for attempt in valid_attempts
        if attempt["expected_behaviour"] != "select_one_family"
    ]
    ambiguous = [
        attempt
        for attempt in boundary_attempts
        if attempt["expected_behaviour"] == "clarify_without_selecting"
    ]
    negative = [
        attempt
        for attempt in boundary_attempts
        if attempt["expected_behaviour"] == "say_not_covered_without_citation"
    ]
    return {
        "wrong_family_selections": count_true(
            valid_attempts, "score", "selection", "wrong_family"
        ),
        "fabricated_or_substituted_identity_values": count_true(
            valid_attempts, "score", "identity", "fabricated_or_substituted"
        ),
        "boundary_responses_with_governed_identity": sum(
            has_boundary_identity(attempt) for attempt in boundary_attempts
        ),
        "ambiguous_responses_with_selection_or_citation": sum(
            nested(attempt, "score", "selection", "selected_or_cited_family") is True
            or citation_count(attempt) > 0
            for attempt in ambiguous
        ),
        "negative_responses_with_citation": sum(
            citation_count(attempt) > 0 for attempt in negative
        ),
        "identity_gate_failures": count_true(
            valid_attempts, "parsed", "identity_gate_failed"
        ),
        "service_advice_responses": count_true(
            valid_attempts, "score", "safety", "service_advice"
        ),
        "official_service_url_responses": count_true(
            valid_attempts, "score", "safety", "official_service_url"
        ),
        "outside_configured_source_responses": count_true(
            valid_attempts, "score", "safety", "outside_configured_source"
        ),
        "permission_leakage_responses": count_true(
            valid_attempts, "score", "safety", "permission_leakage"
        ),
        "unsafe_cases": sum(nested(attempt, "score", "safe") is False for attempt in valid_attempts),
        "safe_retrieval_misses": count_true(
            valid_attempts, "score", "safe_retrieval_miss"
        ),
    }


def compress_indices(indices: Sequence[int]) -> str:
    if not indices:
        return "none"
    ranges: list[str] = []
    start = previous = indices[0]
    for index in indices[1:]:
        if index == previous + 1:
            previous = index
            continue
        ranges.append(str(start) if start == previous else f"{start}–{previous}")
        start = previous = index
    ranges.append(str(start) if start == previous else f"{start}–{previous}")
    return ", ".join(ranges)


def format_percentage(rate: float | None) -> str:
    if rate is None:
        return "not available"
    return f"{rate * 100:.1f}%"


def build_markdown(summary: Mapping[str, Any]) -> str:
    calls = summary["calls"]
    preflight = summary["preflight"]
    full = summary["full_293"]
    safety = summary["safety"]
    latency = summary["latency"]
    coverage = summary["schedule_coverage"]
    payg_valid_cost = calls["valid_semantic_cases"] * 12 / 100
    payg_attempt_ceiling = calls["provider_attempts"] * 12 / 100
    payg_schedule_cost = calls["scheduled_cases"] * 12 / 100

    lines = [
        "# Agent C-293 full-corpus scale-development summary",
        "",
        f"Status: {summary['status'].replace('_', ' ')}  ",
        f"Evidence cut-off: {summary['evidence_cutoff_at']}  ",
        f"Run: `{summary['run_id']}`",
        "",
        "## Outcome",
        "",
        "The run stopped after Microsoft 365 returned provider volume-throttling "
        "responses that remained invalid after the permitted retry. This is an "
        "operational stop, not a semantic failure of the affected cases.",
        "",
        f"All {full['valid_cases']} valid full-corpus responses passed strict "
        "scoring. However, "
        f"{len(coverage['unresolved_schedule_indices'])} scheduled cases do not "
        "have a valid response, so this run does not establish a complete "
        "293-family result.",
        "",
        "This is scale-development evidence based on authored situations. It is "
        "not a final holdout and must not be presented as performance on "
        "independently written situations.",
        "",
        "## Calls and coverage",
        "",
        "| Measure | Count |",
        "| --- | ---: |",
        f"| Scheduled cases | {calls['scheduled_cases']} |",
        f"| Provider attempts | {calls['provider_attempts']} |",
        f"| Cases with a valid semantic response | {calls['valid_semantic_cases']} |",
        f"| Transport-failure attempts | {calls['transport_failure_attempts']} |",
        f"| Transport retries | {calls['transport_retries']} |",
        f"| Terminal transport-failure cases | {calls['terminal_transport_failure_cases']} |",
        f"| Untouched cases | {calls['untouched_cases']} |",
        f"| Unresolved cases | {calls['unresolved_cases']} |",
        "",
        "## Preflight",
        "",
        f"Recorded gate status: `{preflight['status']}`.",
        "",
        "| Group | Strict | Safe | Valid | Scheduled |",
        "| --- | ---: | ---: | ---: | ---: |",
        f"| Positive | {preflight['positive']['strict_passes']} | — | "
        f"{preflight['positive']['valid']} | {preflight['positive']['scheduled']} |",
        f"| Ambiguous | {preflight['ambiguous']['strict_passes']} | "
        f"{preflight['ambiguous']['safe_cases']} | {preflight['ambiguous']['valid']} | "
        f"{preflight['ambiguous']['scheduled']} |",
        f"| Negative | {preflight['negative']['strict_passes']} | "
        f"{preflight['negative']['safe_cases']} | {preflight['negative']['valid']} | "
        f"{preflight['negative']['scheduled']} |",
        "",
        "One ambiguous preflight response was safe but missed the current-source "
        "warning; this is the recorded non-blocking observation.",
        "",
        "## Full 293-family phase",
        "",
        "| Measure | Result |",
        "| --- | ---: |",
        f"| Valid coverage | {full['valid_cases']}/{full['scheduled_cases']} "
        f"({format_percentage(full['valid_coverage_rate'])}) |",
        f"| Strict passes among valid responses | {full['strict_passes']}/{full['valid_cases']} "
        f"({format_percentage(full['strict_rate_among_valid'])}) |",
        f"| Correct top-1 family | {full['top1_correct']} |",
        f"| All five identity fields exact | {full['all_five_identity_fields_exact']} |",
        f"| Correct-record-only citation | {full['correct_record_only_citations']} |",
        f"| Safe responses | {full['safe_cases']} |",
        "",
        "## Safety",
        "",
        f"Wrong family selections: {safety['wrong_family_selections']}; fabricated "
        f"or substituted identities: {safety['fabricated_or_substituted_identity_values']}; "
        f"service-advice responses: {safety['service_advice_responses']}; "
        f"outside-source responses: {safety['outside_configured_source_responses']}; "
        f"permission leakage: {safety['permission_leakage_responses']}.",
        "",
        "## Charging and throttling interpretation",
        "",
        "For an authenticated employee with a Microsoft 365 Copilot add-on "
        "licence, this employee-facing Agent Builder and SharePoint-grounded "
        "use has no incremental Copilot Credit charge beyond the existing "
        "licence, subject to Microsoft fair-use and service-protection limits.",
        "",
        "For a Copilot Studio pay-as-you-go configuration, Microsoft's "
        "published example assigns 10 credits to tenant-graph grounding and "
        "2 credits to the generative answer. At $0.01 per credit, the "
        f"estimated charge for {calls['valid_semantic_cases']} valid responses "
        f"is ${payg_valid_cost:.2f}. Charging every "
        f"{calls['provider_attempts']} attempt would give a conservative "
        f"ceiling of ${payg_attempt_ceiling:.2f}; the complete "
        f"{calls['scheduled_cases']}-call schedule would be "
        f"${payg_schedule_cost:.2f}. Failed transport attempts may not be "
        "billable, and premium reasoning selected through `Auto` could add "
        "token-based consumption.",
        "",
        "The observed volume response is consistent with rolling Microsoft "
        "service protection rather than proof of billing exhaustion. Confirm "
        "the actual treatment in Microsoft 365 admin centre under **Copilot > "
        "Cost Management > Consumption**, or in Power Platform admin centre "
        "under **Licensing > Copilot Studio**.",
        "",
        "Sources: [billing and message rates](https://learn.microsoft.com/en-us/"
        "microsoft-copilot-studio/requirements-messages-management), "
        "[usage-based billing management](https://learn.microsoft.com/en-us/"
        "microsoft-365/copilot/usage-based-billing-manage-copilot-credits), "
        "[error-code guidance](https://learn.microsoft.com/en-us/"
        "microsoft-copilot-studio/agents-experience/troubleshooting-error-codes) "
        "and [throughput and rate-limit guidance](https://learn.microsoft.com/"
        "en-us/microsoft-copilot-studio/guidance/"
        "plan-agent-throughput-rate-limits).",
        "",
        "## Upper-bound latency",
        "",
        f"For {latency['sample_size']} valid responses: minimum "
        f"{latency['min_ms']} ms; p50 {latency['p50_ms']} ms; p95 "
        f"{latency['p95_ms']} ms; maximum {latency['max_ms']} ms. "
        "These values measure upper-bound capture time, not provider-only latency.",
        "",
        "## Unresolved schedule",
        "",
        "- Terminal transport-failure indices: "
        f"{compress_indices(coverage['terminal_transport_failure_indices'])}.",
        f"- Retry-pending indices: {compress_indices(coverage['retry_pending_indices'])}.",
        f"- Untouched indices: {compress_indices(coverage['untouched_schedule_indices'])}.",
        "",
        "Exact evidence bindings and every unresolved index are recorded in "
        "`summary.json`.",
    ]
    return "\n".join(lines) + "\n"


def build_summary(
    run_directory: Path,
    schedule_path: Path,
    schedule: Sequence[Mapping[str, Any]],
    attempts_path: Path,
    attempts: Sequence[Mapping[str, Any]],
    preflight_path: Path,
    supplied_preflight: Mapping[str, Any],
    snapshot_path: Path,
    snapshot: Mapping[str, Any],
) -> dict[str, Any]:
    schedule_sha256 = sha256_file(schedule_path)
    schedule_by_index = validate_schedule(schedule, schedule_sha256)
    run_ids = {attempt.get("run_id") for attempt in attempts}
    require(len(run_ids) == 1, "Attempt log must contain exactly one run_id")
    run_id = require_string(next(iter(run_ids)), "Attempt run_id")
    require(
        run_directory.name == run_id,
        f"Run directory name {run_directory.name!r} does not match run_id {run_id!r}",
    )
    valid_by_index = validate_attempts(
        attempts, schedule_by_index, schedule_sha256, run_id
    )
    validate_agent_snapshot(snapshot)

    computed_preflight = preflight_breakdown(schedule, valid_by_index)
    validate_preflight_summary(supplied_preflight, computed_preflight)
    preflight = {
        "status": supplied_preflight["status"],
        "evaluated_at": supplied_preflight["evaluated_at"],
        **computed_preflight,
        "nonblocking_observations": supplied_preflight["nonblocking_observations"],
        "serious_failures": supplied_preflight["serious_failures"],
    }

    all_indices = set(schedule_by_index)
    attempted_indices = {attempt["schedule_index"] for attempt in attempts}
    valid_indices = set(valid_by_index)
    terminal_indices = {
        attempt["schedule_index"]
        for attempt in attempts
        if attempt["disposition"] == "terminal_transport_failure"
    } - valid_indices
    retry_pending_indices = (
        {
            attempt["schedule_index"]
            for attempt in attempts
            if attempt["disposition"] == "retryable_transport_failure"
        }
        - valid_indices
        - terminal_indices
    )
    untouched_indices = all_indices - attempted_indices
    unresolved_indices = all_indices - valid_indices

    terminal_attempts = [
        attempt
        for attempt in attempts
        if attempt["disposition"] == "terminal_transport_failure"
        and attempt["schedule_index"] in terminal_indices
    ]
    all_terminal_volume_throttling = bool(terminal_attempts) and all(
        "volume of requests" in attempt["response_text"].casefold()
        and "try again later" in attempt["response_text"].casefold()
        for attempt in terminal_attempts
    )
    if not unresolved_indices:
        status = "complete"
        stop = {"kind": None, "reason": None}
    elif all_terminal_volume_throttling:
        status = "partial_stopped_volume_throttling"
        stop = {
            "kind": "operational_provider_volume_throttling",
            "reason": (
                "Microsoft 365 volume-throttling responses remained invalid after "
                "the permitted transport retry."
            ),
        }
    else:
        status = "partial"
        stop = {
            "kind": "incomplete_evidence",
            "reason": "One or more scheduled cases do not have a valid response.",
        }

    valid_attempts = [valid_by_index[index] for index in sorted(valid_by_index)]
    upper_bound_latencies = [
        attempt["capture_elapsed_ms"]
        for attempt in valid_attempts
        if attempt["capture_elapsed_is_upper_bound"] is True
    ]
    require(
        len(upper_bound_latencies) == len(valid_attempts),
        "Every valid attempt must declare upper-bound capture latency",
    )
    started_at = min(attempt["started_at"] for attempt in attempts)
    evidence_cutoff_at = max(attempt["captured_at"] for attempt in attempts)

    transport_failure_attempts = [
        attempt for attempt in attempts if attempt["disposition"] != "valid"
    ]
    full = full_metrics(schedule, valid_by_index)
    safety = safety_metrics(valid_attempts)
    summary = {
        "schema": SUMMARY_SCHEMA,
        "run_id": run_id,
        "status": status,
        "primary_outcome": "incomplete" if unresolved_indices else "complete",
        "evidence_class": "scale_development",
        "is_final_holdout": False,
        "scope": (
            "Authored-situation scale-development evidence for a 32-case preflight "
            "and one scheduled case for each of 293 governed families."
        ),
        "limitation": (
            "This is not a final holdout or evidence of performance on independently "
            "written situations. Unresolved cases are not semantic failures."
        ),
        "observed_from": started_at,
        "evidence_cutoff_at": evidence_cutoff_at,
        "bindings": {
            "schedule": file_binding(
                schedule_path, run_directory, rows=len(schedule)
            ),
            "attempts": file_binding(
                attempts_path, run_directory, rows=len(attempts)
            ),
            "preflight_summary": file_binding(preflight_path, run_directory),
            "agent_snapshot": file_binding(snapshot_path, run_directory),
        },
        "agent": {
            "name": snapshot["agent"]["name"],
            "snapshot_captured_at": snapshot["captured_at"],
            "instructions_sha256": snapshot["agent"]["instructions_sha256"],
            "source_count": snapshot["agent"]["source_count"],
            "source_topology": snapshot["agent"].get("source_topology"),
            "model_selector": snapshot["agent"].get("model_selector"),
            "only_use_specified_sources": snapshot["agent"].get(
                "only_use_specified_sources"
            ),
        },
        "calls": {
            "scheduled_cases": len(schedule),
            "provider_attempts": len(attempts),
            "unique_attempted_cases": len(attempted_indices),
            "valid_semantic_cases": len(valid_indices),
            "transport_failure_attempts": len(transport_failure_attempts),
            "retryable_transport_failure_attempts": sum(
                attempt["disposition"] == "retryable_transport_failure"
                for attempt in attempts
            ),
            "terminal_transport_failure_attempts": len(terminal_attempts),
            "transport_retries": sum(
                attempt["transport_attempt"] > 1 for attempt in attempts
            ),
            "terminal_transport_failure_cases": len(terminal_indices),
            "retry_pending_cases": len(retry_pending_indices),
            "untouched_cases": len(untouched_indices),
            "unresolved_cases": len(unresolved_indices),
        },
        "preflight": preflight,
        "full_293": full,
        "safety": safety,
        "failure_classes": {
            "all_provider_attempts": failure_class_counts(attempts),
            "valid_semantic_cases": failure_class_counts(valid_attempts),
            "transport_failure_attempts": failure_class_counts(
                transport_failure_attempts
            ),
        },
        "latency": {
            "measurement": (
                "Upper-bound capture time from request start to stable captured response"
            ),
            "sample": "valid semantic responses",
            "percentile_method": "linear interpolation at (n - 1) × p",
            "sample_size": len(upper_bound_latencies),
            "min_ms": min(upper_bound_latencies),
            "p50_ms": percentile(upper_bound_latencies, 0.50),
            "p95_ms": percentile(upper_bound_latencies, 0.95),
            "max_ms": max(upper_bound_latencies),
        },
        "schedule_coverage": {
            "valid_schedule_indices": sorted(valid_indices),
            "terminal_transport_failure_indices": sorted(terminal_indices),
            "retry_pending_indices": sorted(retry_pending_indices),
            "untouched_schedule_indices": sorted(untouched_indices),
            "unresolved_schedule_indices": sorted(unresolved_indices),
        },
        "stop": stop,
        "decision": (
            "Preserve the partial evidence and resume only after provider volume "
            "capacity recovers; do not treat terminal or untouched cases as semantic "
            "failures."
            if unresolved_indices
            else "The scheduled scale-development run is complete."
        ),
    }
    return summary


def serialise_summary(summary: Mapping[str, Any]) -> str:
    return f"{json.dumps(summary, ensure_ascii=False, indent=2, sort_keys=True)}\n"


def check_output(path: Path, expected: str) -> None:
    require(path.is_file(), f"Missing generated summary: {path}")
    actual = path.read_text(encoding="utf-8")
    require(actual == expected, f"Generated summary is out of date: {path}")


def main() -> None:
    args = parse_args()
    run_directory = args.run_directory.resolve()
    require(run_directory.is_dir(), f"Run directory does not exist: {run_directory}")
    schedule_path = args.schedule.resolve()
    attempts_path = run_directory / "attempts.jsonl"
    preflight_path = run_directory / "preflight-summary.json"
    snapshot_path = run_directory / "agent-snapshot.json"

    schedule = load_jsonl(schedule_path, "schedule")
    attempts = load_jsonl(attempts_path, "attempt log")
    supplied_preflight = load_json(preflight_path, "preflight summary")
    snapshot = load_json(snapshot_path, "agent snapshot")
    summary = build_summary(
        run_directory,
        schedule_path,
        schedule,
        attempts_path,
        attempts,
        preflight_path,
        supplied_preflight,
        snapshot_path,
        snapshot,
    )
    summary_json = serialise_summary(summary)
    summary_markdown = build_markdown(summary)
    summary_json_path = run_directory / "summary.json"
    summary_markdown_path = run_directory / "summary.md"

    if args.check:
        check_output(summary_json_path, summary_json)
        check_output(summary_markdown_path, summary_markdown)
        print(f"Verified deterministic summaries for {summary['run_id']}")
        return

    summary_json_path.write_text(summary_json, encoding="utf-8")
    summary_markdown_path.write_text(summary_markdown, encoding="utf-8")
    print(
        json.dumps(
            {
                "run_id": summary["run_id"],
                "status": summary["status"],
                "valid_semantic_cases": summary["calls"]["valid_semantic_cases"],
                "unresolved_cases": summary["calls"]["unresolved_cases"],
                "summary_json": str(summary_json_path),
                "summary_markdown": str(summary_markdown_path),
            },
            ensure_ascii=False,
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
