#!/usr/bin/env python3
"""Build the public heritage Evaluation Foundry engineering postmortem.

The builder has four explicit phases:

``collect``
    Extract visible prompt/response messages and relevant command events from
    the curated Codex rollout, and normalize private GitHub evidence.
``render``
    Write the public trace, registers and report pages without deleting or
    rewriting unchanged files.
``check``
    Validate generated links, redaction boundaries and register consistency.
``all``
    Run collect, render and check in sequence.

Raw Codex and GitHub logs remain beneath the ignored ``postmortem/`` tree.
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import os
import re
import subprocess
from collections import Counter
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
PUBLIC_ROOT = ROOT / "docs" / "postmortems" / "heritage-foundry-2026"
DATA_ROOT = PUBLIC_ROOT / "data"
EXCHANGES_ROOT = PUBLIC_ROOT / "exchanges"
READERS_ROOT = PUBLIC_ROOT / "readers"
SOURCES_ROOT = PUBLIC_ROOT / "sources"
PRIVATE_ROOT = ROOT / "postmortem" / "evidence"
CURRENT_PUBLICATION_EVIDENCE_PATH = (
    ROOT / "release-assurance" / "heritage-postmortem-publication-evidence.json"
)
RELEASE_ATTEMPTS_PATH = (
    ROOT / "release-assurance" / "heritage-postmortem-release-attempts.json"
)
SESSION_ID = "019fc471-90ec-7633-abde-8e72fcdd5280"
IMPLEMENTATION_TURN_ID = "019fc48a-bbbf-7630-9aad-3fa7f925a707"
BASE_URL = (
    "https://chris-page-gov.github.io/okf-explorer/"
    "docs/postmortems/heritage-foundry-2026"
)
CAPTURED_AT = "2026-08-04T13:16:54Z"

CURRENT_PUBLICATION_EVIDENCE_SPECS = (
    {
        "id": "PUBEV-001",
        "kind": "central-pull-request",
        "identity_keys": (
            "repository",
            "number",
            "head_commit",
            "merge_commit",
            "ci_run_id",
        ),
        "verified_identity_keys": ("repository", "number", "head_commit", "ci_run_id"),
        "required_claims": (
            "pull-request-head-observed",
            "required-checks-passed",
        ),
    },
    {
        "id": "PUBEV-002",
        "kind": "external-candidate",
        "identity_keys": (
            "repository",
            "source_commit",
            "publication_manifest_sha256",
            "site_tree_sha256",
        ),
        "verified_identity_keys": (
            "repository",
            "source_commit",
            "publication_manifest_sha256",
            "site_tree_sha256",
        ),
        "required_claims": (
            "candidate-commit-pushed",
            "publication-manifest-verified",
        ),
    },
    {
        "id": "PUBEV-003",
        "kind": "external-pages",
        "identity_keys": (
            "repository",
            "source_commit",
            "pages_run_id",
            "publication_manifest_sha256",
            "site_tree_sha256",
            "browser_receipt_sha256",
        ),
        "verified_identity_keys": (
            "repository",
            "source_commit",
            "pages_run_id",
            "publication_manifest_sha256",
            "site_tree_sha256",
            "browser_receipt_sha256",
        ),
        "required_claims": (
            "pages-deployment-succeeded",
            "real-browser-identity-journey-passed",
        ),
    },
    {
        "id": "PUBEV-004",
        "kind": "candidate-release-r1",
        "identity_keys": (
            "repository",
            "source_commit",
            "tag",
            "release_id",
            "archive_sha256",
            "attestation_digest",
        ),
        "verified_identity_keys": (
            "repository",
            "source_commit",
            "tag",
            "release_id",
            "archive_sha256",
            "attestation_digest",
        ),
        "required_claims": (
            "annotated-tag-verified",
            "archive-attestation-verified",
            "candidate-release-immutable",
            "exact-candidate-asset-closure-verified",
        ),
    },
    {
        "id": "PUBEV-005",
        "kind": "terminal-assurance",
        "identity_keys": (
            "repository",
            "source_commit",
            "candidate_tag",
            "workflow_run_id",
            "artifact_digest",
            "assurance_source_commit",
        ),
        "verified_identity_keys": (
            "repository",
            "source_commit",
            "candidate_tag",
            "workflow_run_id",
            "artifact_digest",
            "assurance_source_commit",
        ),
        "required_claims": (
            "exact-link-closure-passed",
            "protected-link-receipt-passed",
            "three-engine-journey-passed",
            "workflow-run-succeeded",
        ),
    },
    {
        "id": "PUBEV-006",
        "kind": "promotion-release-r2",
        "identity_keys": (
            "repository",
            "source_commit",
            "candidate_tag",
            "promotion_tag",
            "release_id",
            "envelope_sha256",
            "attestation_digest",
        ),
        "verified_identity_keys": (
            "repository",
            "source_commit",
            "candidate_tag",
            "promotion_tag",
            "release_id",
            "envelope_sha256",
            "attestation_digest",
        ),
        "required_claims": (
            "exact-promotion-asset-closure-verified",
            "promotion-envelope-attested",
            "promotion-release-immutable",
            "same-commit-promotion-tag-verified",
        ),
    },
)

PR_PHASES = {
    67: {
        "label": "Initial implementation",
        "feature_commit": "a9b36fab8ef11ddc469a2c75385da72379461a79",
        "merge_commit": "65e22ac68f007ca2aa75b6ab195c949f2939b210",
        "tree": "1f2d66d97e22236e500c08b2aa2f440c2ccabd6a",
        "ci_run": 30799819042,
        "pages_run": 30800609874,
    },
    68: {
        "label": "Late correction and completion",
        "feature_commit": "0a0653bfd4b07767cf2ca35ede8133ef6a159076",
        "merge_commit": "c8e8fac3ef2beddae7bdc99988ae9c5aac2431f2",
        "tree": "2298fba8404924c83ccc02612e44194ce2ea47fa",
        "ci_run": 30812594912,
        "pages_run": 30813485357,
    },
    69: {
        "label": "Promotion and terminal publication",
        "feature_commit": "0d377c917493460d7264eaecb9563a0ba0e91523",
        "merge_commit": "0b5d748dc13ed83134592fc0873a2ff25d83eada",
        "tree": "a5275f99343f939450272141319e4cf4bc933b12",
        "ci_run": 30818372899,
        "pages_run": 30819232224,
    },
}

SITE_IDENTITIES = {
    30800609874: {
        "site_files": 14007,
        "site_bytes": 987424628,
        "receipt_tree_sha256": "c7bc739c",
        "explorer_tree_sha256": "bdbcbf7c",
        "heritage_files": 2938,
        "heritage_tree_sha256": "18977e67",
        "artifact_id": 8850720016,
        "artifact_bytes": 209721634,
        "artifact_sha256": "86fbfd2b",
    },
    30813485357: {
        "site_files": 14010,
        "site_bytes": 987299117,
        "receipt_tree_sha256": "f43d0b52",
        "explorer_tree_sha256": "0cb83c10",
        "heritage_files": 2940,
        "heritage_tree_sha256": "5edff8fe",
        "artifact_id": 8855797237,
        "artifact_bytes": 209736536,
        "artifact_sha256": "f4ef8f29",
    },
    30819232224: {
        "site_files": 14010,
        "site_bytes": 987329754,
        "receipt_tree_sha256": "f6dee63c",
        "explorer_tree_sha256": "cfb3c2d1",
        "heritage_files": 2940,
        "heritage_tree_sha256": "2d11e52a",
        "artifact_id": 8858174199,
        "artifact_bytes": 209759834,
        "artifact_sha256": "c0bcf4b4",
    },
}

EXCHANGE_TITLES = (
    (
        "Review repo state",
        "Assess access and define the heritage Evaluation Foundry",
    ),
    (
        "Explain with a separate tiny assurance fixture",
        "Explain the separate tiny assurance fixture",
    ),
    (
        "Great, can you now set a goal",
        "Implement and publish the complete heritage exemplar",
    ),
    (
        "# Response annotations:",
        "Correct the GitHub authentication diagnosis",
    ),
    (
        "I opened the URL and clicked around the graph",
        "Confirm graph browsing cannot mutate the bundle",
    ),
    (
        "This still appeared inefficient",
        "Create the end-to-end engineering postmortem",
    ),
    (
        "Discuss the **Further questions**",
        "Resolve the postmortem architecture questions",
    ),
    (
        "Implement all the '**Recommended next steps**'",
        "Implement every recommended refactoring and publication control",
    ),
    (
        "Implement all the",
        "Implement every recommended refactoring and publication control",
    ),
)

LATE_FINDINGS = (
    (
        "2026-08-03T04:56:01Z",
        "Corpus integrity",
        "HAR resource routes and same-year continuity could produce invalid links.",
        "producer, faithful, tiny, synthetic, site, consumer",
    ),
    (
        "2026-08-03T05:35:17Z",
        "Explorer routing",
        "The selected-record loader assumed every route started with dataset/.",
        "app, browser journeys, site",
    ),
    (
        "2026-08-03T06:16:06Z",
        "Documentation and YAML",
        "YAML-LD keyword quoting and executable Links/Narrative coverage were incomplete.",
        "templates, corpora, docs, journeys, site",
    ),
    (
        "2026-08-03T07:14:26Z",
        "Publication capacity",
        "The assembled Site was about 989 MB, close to the 1 GB Pages limit.",
        "site assembly and publication",
    ),
    (
        "2026-08-03T07:15:45Z",
        "Build contamination",
        "Ignored evaluator results were copied into the Site and changed local-only counts.",
        "site discovery, receipts, published metrics",
    ),
    (
        "2026-08-03T07:43:56Z",
        "CRS provenance",
        "WGS84 source geometry was incorrectly labelled EPSG:27700.",
        "records, provenance, semantic graph, search, receipts",
    ),
    (
        "2026-08-03T08:05:11Z",
        "Geographic scope",
        "Twenty-five Cumbria HAR rows matched only because Warwick Bridge contained Warwick.",
        "source denominator and every downstream corpus plane",
    ),
    (
        "2026-08-03T09:22:05Z",
        "Public boot journey",
        "The first deployed candidate did not expose Search within the 30-second action bound.",
        "Pages-root routing, app shell, public journey",
    ),
    (
        "2026-08-03T09:50:51Z",
        "Project-root routing",
        "Reading links, slashless Pages roots and the 404 shell assumed account-root paths.",
        "site routes, evaluator, app shell, browser tests",
    ),
    (
        "2026-08-03T12:02:15Z",
        "Candidate binding",
        "A stable descriptor could hide a changed executable closure, requiring plane-root binding.",
        "release roots and public verification",
    ),
    (
        "2026-08-03T12:35:19Z",
        "Evidence recursion",
        "Putting terminal evidence in the Site would create a self-referential hash loop.",
        "promotion envelope and release assets",
    ),
    (
        "2026-08-03T12:53:13Z",
        "Registry synchronization",
        "Publishing the YAML-LD registry entry required three generated projections and a new app root.",
        "registry, app static, site, browser matrix",
    ),
    (
        "2026-08-03T13:48:57Z",
        "Release asset naming",
        "Generic results.json/results.md basenames collided during release upload.",
        "release evidence only",
    ),
)

FORBIDDEN_PUBLIC_PATTERNS = {
    "local-user-path": re.compile(r"/Users/"),
    "codex-session-path": re.compile(r"(?:\.codex/sessions|rollout-.*\.jsonl)"),
    "private-evidence-path": re.compile(r"postmortem/evidence/"),
    "github-classic-token": re.compile(r"\bgh[opusr]_[A-Za-z0-9_]{20,}\b"),
    "github-fine-grained-token": re.compile(r"\bgithub_pat_[A-Za-z0-9_]{20,}\b"),
    "openai-key": re.compile(r"\bsk-[A-Za-z0-9_-]{20,}\b"),
    "bearer-token": re.compile(r"\bBearer\s+[A-Za-z0-9._~+/-]{20,}", re.I),
}

FENCED_BLOCK = re.compile(
    r"(?ms)^[ \t]*(?P<fence>`{3,}|~{3,})[^\n]*\n.*?^[ \t]*(?P=fence)[ \t]*(?:\n|$)"
)
MARKDOWN_LINK = re.compile(r"\[[^\]]+\]\(([^)]+)\)")
ANSI_ESCAPE = re.compile(r"(?:\x1b|\^\[)\[[0-9;]*[A-Za-z]")
CMD_LITERAL = re.compile(r"\bcmd\s*:\s*(\"(?:\\.|[^\"\\])*\")", re.DOTALL)
IN_APP_CONTEXT_BLOCK = re.compile(
    r"(?ms)^\s*<in-app-browser-context\b.*?</in-app-browser-context>\s*"
)


@dataclass(frozen=True)
class Message:
    role: str
    timestamp: str
    text: str
    phase: str | None = None


@dataclass
class Exchange:
    sequence: int
    title: str
    slug: str
    user: Message
    responses: list[Message] = field(default_factory=list)

    @property
    def exchange_id(self) -> str:
        return f"EX-{self.sequence:04d}"


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def run_git(*args: str) -> str:
    try:
        return subprocess.check_output(
            ["git", *args], cwd=ROOT, text=True, stderr=subprocess.PIPE
        ).strip()
    except (FileNotFoundError, subprocess.CalledProcessError) as exc:
        raise SystemExit(f"Git evidence command failed: git {' '.join(args)}") from exc


def parse_timestamp(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def duration_seconds(start: str, end: str) -> int:
    return round((parse_timestamp(end) - parse_timestamp(start)).total_seconds())


def slugify(value: str) -> str:
    value = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return value[:96].strip("-") or "item"


def dedent_markdown(text: str) -> str:
    """Remove the template indent without disturbing zero-indent interpolations."""
    lines = text.splitlines()
    first = next((line for line in lines if line.strip()), "")
    indent = len(first) - len(first.lstrip(" "))
    prefix = " " * indent
    if indent:
        lines = [line[indent:] if line.startswith(prefix) else line for line in lines]
    return "\n".join(lines).rstrip() + "\n"


def is_injected_context(text: str) -> bool:
    stripped = text.strip()
    return bool(
        (stripped.startswith("<environment_context>") and stripped.endswith("</environment_context>"))
        or (stripped.startswith("<recommended_plugins>") and stripped.endswith("</recommended_plugins>"))
        or (
            stripped.startswith("<in-app-browser-context")
            and stripped.endswith("</in-app-browser-context>")
        )
        or stripped.startswith("# AGENTS.md instructions for ")
    )


def strip_injected_context_blocks(text: str) -> str:
    """Remove ambient UI context that is explicitly not part of a user request."""

    return IN_APP_CONTEXT_BLOCK.sub("", text).strip()


def normalized_content(content: Any, role: str) -> str:
    if isinstance(content, str):
        return content.strip()
    if not isinstance(content, list):
        return ""
    parts: list[str] = []
    for item in content:
        if not isinstance(item, dict):
            continue
        item_type = item.get("type")
        if item_type in {"input_text", "output_text", "text"}:
            text = str(item.get("text") or "").strip()
            if role == "user":
                text = strip_injected_context_blocks(text)
            if not text or (role == "user" and is_injected_context(text)):
                continue
            parts.append(text)
        elif item_type in {"input_image", "image"}:
            parts.append("[image attachment omitted from public trace]")
    return "\n\n".join(parts).strip()


def sanitize_public_text(text: str) -> str:
    replacements = [
        (str(ROOT), "[LOCAL_REPO]"),
        (str(Path.home() / ".codex"), "[LOCAL_ASSISTANT_HOME]"),
        (str(Path.home()), "[LOCAL_HOME]"),
    ]
    for before, after in sorted(replacements, key=lambda item: len(item[0]), reverse=True):
        text = text.replace(before, after)
    text = re.sub(r"/Users/[^\s`)]+", "[LOCAL_USER_PATH]", text)
    text = re.sub(r"file:///Users/[^\s`)]+", "[LOCAL_FILE_URL]", text)
    text = re.sub(r"/(?:private/)?tmp/[^\s`)]+", "[TEMP_PATH]", text)
    text = text.replace(".DS_Store", "[LOCAL_STATE_FILE]")
    for label, pattern in FORBIDDEN_PUBLIC_PATTERNS.items():
        if label in {"local-user-path", "codex-session-path", "private-evidence-path"}:
            continue
        text = pattern.sub("[REDACTED_SECRET]", text)
    return text


def find_session_path() -> Path:
    codex_home = Path.home() / ".codex"
    matches = sorted(
        [
            *codex_home.glob(f"sessions/**/rollout-*{SESSION_ID}.jsonl"),
            *codex_home.glob(f"archived_sessions/rollout-*{SESSION_ID}.jsonl"),
        ]
    )
    if len(matches) != 1:
        raise SystemExit(
            f"Expected one Codex rollout for {SESSION_ID}; found {len(matches)}."
        )
    return matches[0]


def title_for_prompt(text: str) -> str:
    for marker, title in EXCHANGE_TITLES:
        if marker in text:
            return title
    first = next((line.strip("# ") for line in text.splitlines() if line.strip()), "User prompt")
    return first[:96]


def extract_commands(script: str) -> list[str]:
    commands: list[str] = []
    for match in CMD_LITERAL.finditer(script):
        try:
            commands.append(json.loads(match.group(1)))
        except json.JSONDecodeError:
            continue
    return commands


def command_categories(command: str) -> list[str]:
    categories: list[str] = []
    executable = r"(?:\.venv/bin/python|python3?|uv\s+run(?:\s+--locked)?\s+python)"
    checks = (
        ("heritage-build", rf"(?:^|[;&\n])\s*{executable}\s+scripts/build_heritage_evaluation\.py\b"),
        ("site-build", rf"(?:^|[;&\n])\s*{executable}\s+scripts/build_site\.py\b"),
        ("foundry-check", rf"(?:^|[;&\n])\s*{executable}\s+scripts/check_evaluation_foundry\.py\b"),
        ("python-tests", rf"(?:^|[;&\n])\s*{executable}\s+-m\s+(?:unittest|pytest)\b"),
        ("explorer-evaluation", r"(?:^|[;&\n])\s*(?:node|pnpm\s+exec\s+node)\s+scripts/evaluate_okf_explorer\.mjs\b"),
        ("app-build", r"(?:^|[;&\n])\s*pnpm\s+build\b"),
        ("app-check", r"(?:^|[;&\n])\s*pnpm\s+check\b"),
        ("vitest", r"(?:^|[;&\n])\s*pnpm\s+(?:exec\s+)?vitest\b"),
        ("playwright", r"(?:^|[;&\n])\s*pnpm\s+(?:exec\s+)?playwright\s+test\b"),
        ("bundle-check", rf"(?:^|[;&\n])\s*{executable}\s+scripts/(?:build_okf_bundle|update_viewer|check_okf)\.py\b"),
        ("git-commit", r"(?:^|[;&\n])\s*git\s+commit\b"),
        ("git-push", r"(?:^|[;&\n])\s*git\s+push\b"),
        ("github-pr", r"(?:^|[;&\n])\s*gh\s+pr\s+(?:create|merge|view|checks)\b"),
        ("github-run", r"(?:^|[;&\n])\s*gh\s+run\s+(?:view|watch|list)\b"),
        ("github-release", r"(?:^|[;&\n])\s*gh\s+release\s+(?:create|upload|view|download)\b"),
    )
    for category, pattern in checks:
        if re.search(pattern, command):
            categories.append(category)
    return categories


def collect_session(session_path: Path) -> tuple[list[Exchange], list[dict[str, Any]], dict[str, Any]]:
    messages: list[Message] = []
    calls: dict[str, dict[str, Any]] = {}
    outputs: dict[str, dict[str, Any]] = {}
    event_counts: Counter[str] = Counter()
    session_meta: dict[str, Any] = {}

    with session_path.open(encoding="utf-8", errors="ignore") as handle:
        for line in handle:
            if not line.strip():
                continue
            record = json.loads(line)
            record_type = str(record.get("type") or "")
            payload = record.get("payload") or {}
            event_counts[record_type] += 1
            if record_type == "session_meta" and payload.get("id") == SESSION_ID:
                session_meta = payload
            if record_type != "response_item":
                continue
            payload_type = payload.get("type")
            if payload_type == "message" and payload.get("role") in {"user", "assistant"}:
                role = payload["role"]
                text = normalized_content(payload.get("content"), role)
                if text:
                    messages.append(
                        Message(
                            role=role,
                            timestamp=str(record.get("timestamp") or ""),
                            text=sanitize_public_text(text),
                            phase=payload.get("phase"),
                        )
                    )
            elif payload_type == "custom_tool_call" and payload.get("name") == "exec":
                metadata = payload.get("internal_chat_message_metadata_passthrough") or {}
                if metadata.get("turn_id") == IMPLEMENTATION_TURN_ID:
                    calls[payload["call_id"]] = {
                        "timestamp": record.get("timestamp"),
                        "script": str(payload.get("input") or ""),
                    }
            elif payload_type == "custom_tool_call_output":
                outputs[payload.get("call_id", "")] = {
                    "timestamp": record.get("timestamp"),
                    "text": normalized_content(payload.get("output"), "assistant"),
                }

    exchanges: list[Exchange] = []
    current: Exchange | None = None
    for message in messages:
        if message.role == "user":
            if current:
                exchanges.append(current)
            current = Exchange(
                sequence=len(exchanges) + 1,
                title=title_for_prompt(message.text),
                slug=slugify(title_for_prompt(message.text)),
                user=message,
            )
        elif current:
            current.responses.append(message)
    if current:
        exchanges.append(current)

    command_events: list[dict[str, Any]] = []
    for call_id, call in sorted(calls.items(), key=lambda item: item[1]["timestamp"] or ""):
        output = outputs.get(call_id, {})
        outer_duration = None
        match = re.search(r"Wall time ([0-9.]+) seconds", output.get("text", ""))
        if match:
            outer_duration = float(match.group(1))
        for command_index, command in enumerate(extract_commands(call["script"]), start=1):
            categories = command_categories(command)
            if not categories:
                continue
            for category in categories:
                command_events.append(
                    {
                        "event_id": f"CMD-{len(command_events) + 1:04d}",
                        "timestamp": call["timestamp"],
                        "category": category,
                        "command": sanitize_public_text(command),
                        "call_id_sha256": sha256_bytes(call_id.encode("utf-8")),
                        "command_index_in_call": command_index,
                        "outer_call_duration_seconds": outer_duration,
                        "duration_scope": (
                            "shared-orchestrator-call" if len(extract_commands(call["script"])) > 1 else "command-call"
                        ),
                    }
                )

    metadata = {
        "session_id": SESSION_ID,
        "title": "Draft Foundry evaluation process",
        "start_timestamp": session_meta.get("timestamp"),
        "cwd": "[LOCAL_REPO]",
        "source_sha256": sha256_file(session_path),
        "source_bytes": session_path.stat().st_size,
        "event_counts": dict(sorted(event_counts.items())),
        "visible_user_messages": sum(1 for item in messages if item.role == "user"),
        "visible_assistant_messages": sum(1 for item in messages if item.role == "assistant"),
        "exchange_count": len(exchanges),
        "relevant_command_event_count": len(command_events),
    }
    return exchanges, command_events, metadata


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def valid_public_evidence_url(value: Any) -> bool:
    if not isinstance(value, str) or not value or value != value.strip():
        return False
    try:
        parsed = urlsplit(value)
        _ = parsed.port
    except ValueError:
        return False
    return bool(
        parsed.scheme == "https"
        and parsed.hostname
        and parsed.username is None
        and parsed.password is None
    )


def normalize_current_publication_evidence(value: Any) -> dict[str, Any]:
    """Validate and canonicalize the current rollout without inferring success."""

    if not isinstance(value, dict) or set(value) != {"schema", "records"}:
        raise ValueError("current publication evidence must contain schema and records")
    if value.get("schema") != "okf-heritage-foundry-publication-evidence.v1":
        raise ValueError("current publication evidence has an unsupported schema")
    records = value.get("records")
    if not isinstance(records, list):
        raise ValueError("current publication evidence records must be an array")
    by_id: dict[str, dict[str, Any]] = {}
    required_record_keys = {
        "id",
        "kind",
        "status",
        "subject_url",
        "observed_at",
        "identities",
        "evidence_urls",
        "claims",
        "note",
    }
    for index, record in enumerate(records):
        if not isinstance(record, dict) or set(record) != required_record_keys:
            raise ValueError(f"current publication evidence record {index} has an invalid shape")
        record_id = record.get("id")
        if not isinstance(record_id, str) or record_id in by_id:
            raise ValueError(f"current publication evidence record {index} has a duplicate ID")
        by_id[record_id] = record

    normalized_records: list[dict[str, Any]] = []
    for spec in CURRENT_PUBLICATION_EVIDENCE_SPECS:
        record = by_id.pop(spec["id"], None)
        if record is None or record.get("kind") != spec["kind"]:
            raise ValueError(
                f"current publication evidence is missing {spec['id']} {spec['kind']}"
            )
        status = record.get("status")
        if status not in {"pending", "verified"}:
            raise ValueError(f"{spec['id']} has an invalid status")
        subject_url = record.get("subject_url")
        if subject_url is not None and not valid_public_evidence_url(subject_url):
            raise ValueError(f"{spec['id']} has an invalid subject URL")
        observed_at = record.get("observed_at")
        if observed_at is not None:
            if not isinstance(observed_at, str) or not observed_at.endswith("Z"):
                raise ValueError(f"{spec['id']} has an invalid observed_at")
            try:
                parse_timestamp(observed_at)
            except ValueError as error:
                raise ValueError(f"{spec['id']} has an invalid observed_at") from error
        identities = record.get("identities")
        if not isinstance(identities, dict) or set(identities) != set(spec["identity_keys"]):
            raise ValueError(f"{spec['id']} identities differ from the normalized contract")
        for key, identity in identities.items():
            if identity is None:
                continue
            if key in {"number", "ci_run_id", "pages_run_id", "release_id", "workflow_run_id"}:
                if isinstance(identity, bool) or not isinstance(identity, int) or identity < 1:
                    raise ValueError(f"{spec['id']} identity {key} is invalid")
            elif not isinstance(identity, str) or not identity or identity != identity.strip():
                raise ValueError(f"{spec['id']} identity {key} is invalid")
            if key in {"head_commit", "merge_commit", "source_commit", "assurance_source_commit"}:
                if not re.fullmatch(r"[0-9a-f]{40}", str(identity)):
                    raise ValueError(f"{spec['id']} identity {key} is not exact 40-hex")
            if key.endswith("_sha256") and not re.fullmatch(r"[0-9a-f]{64}", str(identity)):
                raise ValueError(f"{spec['id']} identity {key} is not exact SHA-256")
            if key in {"attestation_digest", "artifact_digest"} and not re.fullmatch(
                r"(?:sha256:)?[0-9a-f]{64}", str(identity)
            ):
                raise ValueError(f"{spec['id']} identity {key} is not an exact digest")
            if key == "repository" and not re.fullmatch(
                r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", str(identity)
            ):
                raise ValueError(f"{spec['id']} repository identity is invalid")
        evidence_urls = record.get("evidence_urls")
        if (
            not isinstance(evidence_urls, list)
            or any(not valid_public_evidence_url(url) for url in evidence_urls)
            or len(set(evidence_urls)) != len(evidence_urls)
        ):
            raise ValueError(f"{spec['id']} evidence URLs are invalid or duplicated")
        claims = record.get("claims")
        required_claims = set(spec["required_claims"])
        if (
            not isinstance(claims, list)
            or any(not isinstance(claim, str) for claim in claims)
            or len(set(claims)) != len(claims)
            or not set(claims) <= required_claims
        ):
            raise ValueError(f"{spec['id']} claims are invalid, duplicated or unrecognized")
        note = record.get("note")
        if not isinstance(note, str) or not note.strip() or note != note.strip():
            raise ValueError(f"{spec['id']} must contain a bounded note")
        if status == "verified":
            missing_identities = [
                key for key in spec["verified_identity_keys"] if identities.get(key) is None
            ]
            if (
                subject_url is None
                or observed_at is None
                or not evidence_urls
                or set(claims) != required_claims
                or missing_identities
            ):
                raise ValueError(
                    f"{spec['id']} cannot be verified without its exact identities, "
                    "claims, timestamp and public evidence URLs"
                )
        normalized_records.append(
            {
                "id": spec["id"],
                "kind": spec["kind"],
                "status": status,
                "subject_url": subject_url,
                "observed_at": observed_at,
                "identities": {
                    key: identities[key] for key in spec["identity_keys"]
                },
                "evidence_urls": sorted(evidence_urls),
                "claims": sorted(claims),
                "required_claims": sorted(required_claims),
                "note": note,
            }
        )
    if by_id:
        raise ValueError(
            "current publication evidence has unexpected records: "
            + ", ".join(sorted(by_id))
        )
    normalized_by_id = {record["id"]: record for record in normalized_records}
    if normalized_by_id["PUBEV-001"]["identities"]["repository"] != (
        "chris-page-gov/okf-explorer"
    ) or any(
        record["identities"]["repository"]
        != "chris-page-gov/okf-heritage-coventry-warwickshire"
        for record in normalized_records[1:]
    ):
        raise ValueError("current publication evidence names an unexpected repository")
    expected_subjects = {
        "PUBEV-001": "https://github.com/chris-page-gov/okf-explorer/pull/70",
        "PUBEV-002": (
            "https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire"
        ),
        "PUBEV-003": (
            "https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/"
        ),
    }
    for record_id, expected_subject in expected_subjects.items():
        subject = normalized_by_id[record_id]["subject_url"]
        if subject is not None and subject != expected_subject:
            raise ValueError(f"{record_id} subject URL differs from its governed identity")
    r1 = normalized_by_id["PUBEV-004"]
    terminal = normalized_by_id["PUBEV-005"]
    r2 = normalized_by_id["PUBEV-006"]
    bound_subjects = (
        (
            r1,
            r1["identities"]["tag"],
            lambda identity: (
                "https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/"
                f"releases/tag/{identity}"
            ),
        ),
        (
            terminal,
            terminal["identities"]["workflow_run_id"],
            lambda identity: (
                "https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/"
                f"actions/runs/{identity}"
            ),
        ),
        (
            r2,
            r2["identities"]["promotion_tag"],
            lambda identity: (
                "https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/"
                f"releases/tag/{identity}"
            ),
        ),
    )
    for record, identity, expected_url in bound_subjects:
        if identity is not None and record["subject_url"] not in {
            None,
            expected_url(identity),
        }:
            raise ValueError(
                f"{record['id']} subject URL does not bind its exact release/run identity"
            )
    source_commits = {
        record["identities"]["source_commit"]
        for record in normalized_records[1:]
        if record["identities"].get("source_commit") is not None
    }
    if len(source_commits) > 1:
        raise ValueError("external publication evidence names inconsistent source commits")
    candidate_tags = {
        value
        for value in (
            r1["identities"]["tag"],
            terminal["identities"]["candidate_tag"],
            r2["identities"]["candidate_tag"],
        )
        if value is not None
    }
    if len(candidate_tags) > 1:
        raise ValueError("R1, terminal and R2 evidence name inconsistent candidate tags")
    if (
        r2["identities"]["candidate_tag"] is not None
        and r2["identities"]["candidate_tag"] == r2["identities"]["promotion_tag"]
    ):
        raise ValueError("R2 promotion tag must differ from its R1 candidate tag")
    pr_head = normalized_by_id["PUBEV-001"]["identities"]["head_commit"]
    assurance_source = terminal["identities"]["assurance_source_commit"]
    if pr_head is not None and assurance_source is not None and pr_head != assurance_source:
        raise ValueError(
            "terminal assurance source commit differs from the assured PR #70 "
            "implementation-head snapshot"
        )
    return {
        "schema": "okf-heritage-foundry-publication-evidence-register.v1",
        "status": (
            "verified"
            if all(record["status"] == "verified" for record in normalized_records)
            else "pending"
        ),
        "source_path": CURRENT_PUBLICATION_EVIDENCE_PATH.relative_to(ROOT).as_posix(),
        "records": normalized_records,
    }


def load_current_publication_evidence() -> dict[str, Any]:
    normalized = normalize_current_publication_evidence(
        load_json(CURRENT_PUBLICATION_EVIDENCE_PATH)
    )
    normalized["source_sha256"] = sha256_file(CURRENT_PUBLICATION_EVIDENCE_PATH)
    return normalized


def load_release_attempt_register() -> dict[str, Any]:
    """Validate the bounded R1/terminal/R2 attempt history without live inference."""

    value = load_json(RELEASE_ATTEMPTS_PATH)
    expected_top = {
        "schema",
        "repository",
        "candidate_source_commit",
        "candidate_tag",
        "promotion_tag",
        "attempts",
    }
    if not isinstance(value, dict) or set(value) != expected_top:
        raise ValueError("release attempt register has an invalid top-level shape")
    if value["schema"] != "okf-heritage-foundry-release-attempt-register.v1":
        raise ValueError("release attempt register has an unsupported schema")
    if value["repository"] != "chris-page-gov/okf-heritage-coventry-warwickshire":
        raise ValueError("release attempt register names an unexpected repository")
    if not re.fullmatch(r"[0-9a-f]{40}", str(value["candidate_source_commit"])):
        raise ValueError("release attempt candidate commit is not exact 40-hex")
    if value["candidate_tag"] == value["promotion_tag"]:
        raise ValueError("release attempt tags must be distinct")
    attempts = value["attempts"]
    if not isinstance(attempts, list) or not attempts:
        raise ValueError("release attempt register must contain attempts")
    expected_attempt_keys = {
        "id",
        "stage",
        "run_id",
        "run_url",
        "started_at",
        "completed_at",
        "conclusion",
        "control_commit",
        "terminal_run_id",
        "artifact_id",
        "artifact_digest",
        "release_id",
        "failure_step",
        "finding",
        "correction",
        "candidate_bytes_changed",
        "site_bytes_changed",
    }
    seen_runs: set[int] = set()
    previous_started: datetime | None = None
    for index, attempt in enumerate(attempts, start=1):
        if not isinstance(attempt, dict) or set(attempt) != expected_attempt_keys:
            raise ValueError(f"release attempt {index} has an invalid shape")
        expected_id = f"RELATT-{index:03d}"
        if attempt["id"] != expected_id:
            raise ValueError(f"release attempt {index} must be {expected_id}")
        if attempt["stage"] not in {
            "candidate-release-r1",
            "terminal-assurance",
            "promotion-release-r2",
        }:
            raise ValueError(f"{expected_id} has an invalid stage")
        run_id = attempt["run_id"]
        if isinstance(run_id, bool) or not isinstance(run_id, int) or run_id < 1:
            raise ValueError(f"{expected_id} has an invalid run ID")
        if run_id in seen_runs:
            raise ValueError(f"{expected_id} duplicates a run ID")
        seen_runs.add(run_id)
        expected_url = (
            "https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/"
            f"actions/runs/{run_id}"
        )
        if attempt["run_url"] != expected_url:
            raise ValueError(f"{expected_id} run URL differs from its identity")
        try:
            started = parse_timestamp(attempt["started_at"])
            completed = parse_timestamp(attempt["completed_at"])
        except (TypeError, ValueError) as error:
            raise ValueError(f"{expected_id} has an invalid timestamp") from error
        if completed < started or (previous_started and started < previous_started):
            raise ValueError(f"{expected_id} has a non-monotonic timestamp")
        previous_started = started
        if attempt["conclusion"] not in {"success", "failure"}:
            raise ValueError(f"{expected_id} has an invalid conclusion")
        if not re.fullmatch(r"[0-9a-f]{40}", str(attempt["control_commit"])):
            raise ValueError(f"{expected_id} control commit is not exact 40-hex")
        for key in ("terminal_run_id", "artifact_id", "release_id"):
            identity = attempt[key]
            if identity is not None and (
                isinstance(identity, bool) or not isinstance(identity, int) or identity < 1
            ):
                raise ValueError(f"{expected_id} has an invalid {key}")
        digest = attempt["artifact_digest"]
        if digest is not None and not re.fullmatch(r"sha256:[0-9a-f]{64}", digest):
            raise ValueError(f"{expected_id} has an invalid artifact digest")
        if (attempt["artifact_id"] is None) != (digest is None):
            raise ValueError(f"{expected_id} artifact ID and digest must be paired")
        if attempt["conclusion"] == "failure" and not attempt["failure_step"]:
            raise ValueError(f"{expected_id} failure is missing its failed step")
        if attempt["conclusion"] == "success" and attempt["failure_step"] is not None:
            raise ValueError(f"{expected_id} success cannot name a failed step")
        for key in ("finding", "correction"):
            if not isinstance(attempt[key], str) or not attempt[key].strip():
                raise ValueError(f"{expected_id} is missing {key}")
        if attempt["candidate_bytes_changed"] is not False:
            raise ValueError(f"{expected_id} changed immutable candidate bytes")
        if attempt["site_bytes_changed"] is not False:
            raise ValueError(f"{expected_id} changed immutable Site bytes")
    normalized = dict(value)
    normalized["source_path"] = RELEASE_ATTEMPTS_PATH.relative_to(ROOT).as_posix()
    normalized["source_sha256"] = sha256_file(RELEASE_ATTEMPTS_PATH)
    return normalized


def current_evidence_record(
    publication_evidence: dict[str, Any], record_id: str
) -> dict[str, Any]:
    matches = [
        record
        for record in publication_evidence["records"]
        if record.get("id") == record_id
    ]
    if len(matches) != 1:
        raise ValueError(f"current publication evidence has no unique {record_id}")
    return matches[0]


def current_evidence_verified(
    publication_evidence: dict[str, Any], *record_ids: str
) -> bool:
    return all(
        current_evidence_record(publication_evidence, record_id)["status"] == "verified"
        for record_id in record_ids
    )


def public_current_evidence_records(
    publication_evidence: dict[str, Any], start_index: int
) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for offset, record in enumerate(publication_evidence["records"], start=1):
        records.append(
            {
                "evidence_id": f"EV-{start_index + offset:03d}",
                "kind": record["kind"],
                "source": record["subject_url"] or "pending-public-subject",
                "status": record["status"],
                "observed_at": record["observed_at"],
                "identities": record["identities"],
                "evidence_urls": record["evidence_urls"],
                "claims": record["claims"],
                "required_claims": record["required_claims"],
                "normalized_input_sha256": publication_evidence.get("source_sha256"),
                "publication_treatment": (
                    "Normalized public rollout evidence; pending is retained until "
                    "all policy-required identities, claims and URLs are supplied."
                ),
            }
        )
    return records


def normalize_github_runs() -> list[dict[str, Any]]:
    phase_by_run: dict[int, tuple[int, str]] = {}
    for number, phase in PR_PHASES.items():
        phase_by_run[phase["ci_run"]] = (number, "pull-request-ci")
        phase_by_run[phase["pages_run"]] = (number, "post-merge-pages")
    runs: list[dict[str, Any]] = []
    for run_id in sorted(phase_by_run):
        path = PRIVATE_ROOT / "github" / "actions" / str(run_id) / "run.json"
        if not path.exists():
            raise SystemExit(f"Missing private GitHub run evidence: {run_id}")
        raw = load_json(path)
        pr_number, phase = phase_by_run[run_id]
        jobs: list[dict[str, Any]] = []
        for job in raw.get("jobs", []):
            steps = []
            for step in job.get("steps", []):
                if not step.get("startedAt") or not step.get("completedAt"):
                    continue
                steps.append(
                    {
                        "number": step.get("number"),
                        "name": step.get("name"),
                        "conclusion": step.get("conclusion"),
                        "duration_seconds": duration_seconds(
                            step["startedAt"], step["completedAt"]
                        ),
                    }
                )
            jobs.append(
                {
                    "database_id": job.get("databaseId"),
                    "name": job.get("name"),
                    "conclusion": job.get("conclusion"),
                    "started_at": job.get("startedAt"),
                    "completed_at": job.get("completedAt"),
                    "duration_seconds": duration_seconds(
                        job["startedAt"], job["completedAt"]
                    ),
                    "steps": steps,
                }
            )
        record: dict[str, Any] = {
            "run_id": run_id,
            "pr_number": pr_number,
            "phase": phase,
            "workflow": raw.get("name"),
            "event": raw.get("event"),
            "attempt": raw.get("attempt"),
            "status": raw.get("status"),
            "conclusion": raw.get("conclusion"),
            "head_sha": raw.get("headSha"),
            "head_branch": raw.get("headBranch"),
            "started_at": raw.get("startedAt"),
            "completed_at": raw.get("updatedAt"),
            "duration_seconds": duration_seconds(raw["startedAt"], raw["updatedAt"]),
            "url": raw.get("url"),
            "jobs": jobs,
        }
        if phase == "pull-request-ci":
            log_path = PRIVATE_ROOT / "github" / "actions" / str(run_id) / "run.log.gz"
            with gzip.open(log_path, "rt", encoding="utf-8", errors="replace") as handle:
                log = ANSI_ESCAPE.sub("", handle.read())
            python_match = re.findall(r"Ran (\d+) tests in", log)
            vitest_match = re.findall(r"Tests\s+(\d+) passed", log)
            node_match = re.findall(r"ℹ tests (\d+)", log)
            browser_match = re.findall(r"\s(\d+) passed \([0-9.]+[ms]", log)
            record["test_counts"] = {
                "python": int(python_match[-1]) if python_match else None,
                "vitest": int(vitest_match[-1]) if vitest_match else None,
                "node": int(node_match[-1]) if node_match else None,
                "explorer_browser": int(browser_match[0]) if browser_match else None,
                "foundry_browser": int(browser_match[-1]) if browser_match else None,
            }
        else:
            record["site_identity"] = SITE_IDENTITIES[run_id]
        runs.append(record)
    return runs


def git_diff_record(number: int, before: str, after: str) -> dict[str, Any]:
    short = run_git("diff", "--shortstat", f"{before}..{after}")
    match = re.search(
        r"(?P<files>\d+) files? changed, (?P<additions>\d+) insertions?\(\+\)(?:, (?P<deletions>\d+) deletions?\(-\))?",
        short,
    )
    if not match:
        raise SystemExit(f"Could not parse git shortstat for PR #{number}: {short}")
    names = run_git("diff", "--name-only", f"{before}..{after}").splitlines()
    top_level = Counter(name.split("/", 1)[0] for name in names)
    return {
        "pr_number": number,
        "label": PR_PHASES[number]["label"],
        "before_commit": before,
        "after_commit": after,
        "feature_commit": PR_PHASES[number]["feature_commit"],
        "merge_commit": PR_PHASES[number]["merge_commit"],
        "tree_sha256": PR_PHASES[number]["tree"],
        "files_changed": int(match.group("files")),
        "insertions": int(match.group("additions")),
        "deletions": int(match.group("deletions") or 0),
        "top_level_file_counts": dict(sorted(top_level.items())),
        "url": f"https://github.com/chris-page-gov/okf-explorer/pull/{number}",
    }


def build_rebuild_cycles() -> list[dict[str, Any]]:
    cycles = [
        git_diff_record(67, "f5d38674", "65e22ac6"),
        git_diff_record(68, "65e22ac6", "c8e8fac3"),
        git_diff_record(69, "c8e8fac3", "0b5d748d"),
    ]
    cycles[0]["interpretation"] = (
        "Initial complete producer, app, evaluation and publication implementation."
    )
    cycles[1]["interpretation"] = (
        "Late source, provenance, topology, routing and publication corrections; "
        "354 of 382 touched files were generated heritage outputs."
    )
    cycles[1]["generated_heritage_files"] = 354
    cycles[1]["generated_binary_files"] = 273
    cycles[2]["interpretation"] = (
        "Status, registry, evidence and terminal-publication promotion; only one app "
        "file changed and no app source/test changed, but the whole CI matrix reran."
    )
    cycles[2]["generated_heritage_files"] = 9
    return cycles


def private_evidence_register() -> list[dict[str, Any]]:
    collection = load_json(PRIVATE_ROOT / "collection-register.json")
    records: list[dict[str, Any]] = []
    for index, source in enumerate(collection["records"], start=1):
        records.append(
            {
                "evidence_id": f"EV-{index:03d}",
                "kind": source["kind"],
                "source": source.get("source") or "local repository evidence",
                "private_copy_sha256": source["sha256"],
                "private_copy_bytes": source["bytes"],
                "publication_treatment": (
                    "Raw/private; only this normalized metadata and bounded findings are public."
                ),
            }
        )
    pages_manifest = load_json(PRIVATE_ROOT / "github" / "pages" / "archive-manifest.json")
    for item in pages_manifest:
        records.append(
            {
                "evidence_id": f"EV-{len(records) + 1:03d}",
                "kind": "preserved-pages-deployment-archive",
                "source": (
                    "https://github.com/chris-page-gov/okf-explorer/actions/runs/"
                    f"{item['run_id']}"
                ),
                "private_copy_sha256": item["stored_sha256"],
                "private_copy_bytes": item["stored_bytes"],
                "decompressed_tar_sha256": item["decompressed_tar_sha256"],
                "publication_treatment": (
                    "Ignored private archive; hash and byte count published before expiry."
                ),
            }
        )
    return records


def write_if_changed(path: Path, text: str) -> bool:
    if path.suffix == ".md":
        text = re.sub(r"[ \t]+$", "", text, flags=re.MULTILINE).rstrip() + "\n"
    path.parent.mkdir(parents=True, exist_ok=True)
    encoded = text.encode("utf-8")
    if path.exists() and path.read_bytes() == encoded:
        return False
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_bytes(encoded)
    temporary.replace(path)
    return True


def write_json_if_changed(path: Path, value: Any) -> bool:
    return write_if_changed(path, json.dumps(value, indent=2, ensure_ascii=False) + "\n")


def frontmatter(page_type: str, title: str, description: str, slug: str, tags: list[str]) -> str:
    lines = [
        "---",
        '"@context":',
        "  - https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/context.jsonld",
        "  - https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/semantic-context.jsonld",
        f'"@id": {BASE_URL}/{slug}.html',
        f'"@type": https://schema.org/{page_type.replace(" ", "")}',
        f"type: {page_type}",
        f"title: {json.dumps(title, ensure_ascii=False)}",
        f"description: {json.dumps(description, ensure_ascii=False)}",
        "generated:",
        "  by: process:heritage-foundry-postmortem-builder",
        f'  at: "{CAPTURED_AT}"',
        "assertion_status: normalized",
        "assertion_scope: real-world",
        "tags:",
    ]
    lines.extend(f"  - {tag}" for tag in tags)
    lines.extend(["---", ""])
    return "\n".join(lines)


def fenced_text(text: str) -> str:
    return "````text\n" + text.rstrip() + "\n````\n"


def exchange_filename(exchange: Exchange) -> str:
    return f"{exchange.sequence:04d}-{exchange.slug}.md"


def relative_link(source: Path, target: Path, label: str) -> str:
    return f"[{label}]({os.path.relpath(target, source.parent)})"


def contribution_summary(exchange: Exchange) -> tuple[str, str]:
    prompt = exchange.user.text.lower()
    responses = "\n".join(item.text for item in exchange.responses).lower()
    if "repo state" in prompt:
        user = "Set the evaluation goal, regional scope, source family and search-quality bar."
    elif "tiny assurance" in prompt:
        user = "Asked for the assurance fixture to be explained as a separate product."
    elif "set a goal" in prompt:
        user = "Authorized the full unattended build, YAML-LD extension, Site publication and Explorer changes."
    elif "response annotations" in prompt:
        user = "Corrected a sandbox-specific authentication diagnosis before it became a false blocker."
    elif "clicked around" in prompt:
        user = "Raised a data-integrity concern after interacting with the public graph."
    elif "further questions" in prompt:
        user = (
            "Asked for explicit decisions on candidate status, browser tiers, semantic "
            "canonicalization, link freshness and exemplar ownership."
        )
    elif "recommended next steps" in prompt:
        user = (
            "Authorized implementation of every postmortem recommendation, including "
            "the release-integrity and external-publication controls."
        )
    else:
        user = "Requested evidence collection, process analysis, refactoring options and a complete trace."
    if "further questions" in prompt:
        codex = (
            "Resolved the five architecture questions as one coherent candidate, "
            "assurance and publication model."
        )
    elif "recommended next steps" in prompt:
        codex = (
            "Implemented the v2 profile, planner, modular outputs, early fixtures, "
            "conditional assurance, external unit and release policy, then completed the "
            "public promotion through terminal verification."
        )
    elif "repository state" in responses or "main` is clean" in responses:
        codex = "Inspected repository, source, browser and geospatial evidence and bounded the unknowns."
    elif "tiny assurance fixture" in responses:
        codex = "Separated producer/consumer correctness evidence from regional completeness and synthetic illustration."
    elif "complete and published" in responses:
        codex = "Implemented, audited, corrected, published and terminally verified the exemplar."
    elif "sandbox-specific" in responses or "external context" in responses:
        codex = "Corrected the authentication model and used the approved external execution context."
    elif "read-only browser state" in responses:
        codex = "Explained and verified the static, read-only browser state boundary."
    else:
        codex = "Collected evidence and produced the engineering postmortem and selective-rerun design."
    return user, codex


def render_exchange(exchange: Exchange, exchanges: list[Exchange]) -> tuple[Path, str]:
    path = EXCHANGES_ROOT / exchange_filename(exchange)
    previous = exchanges[exchange.sequence - 2] if exchange.sequence > 1 else None
    following = exchanges[exchange.sequence] if exchange.sequence < len(exchanges) else None
    reader = READERS_ROOT / "conv-001-heritage-evaluation-foundry.md"
    nav: list[str] = []
    if previous:
        nav.append(relative_link(path, EXCHANGES_ROOT / exchange_filename(previous), previous.exchange_id))
    nav.append(relative_link(path, reader, "start-to-finish reader"))
    if following:
        nav.append(relative_link(path, EXCHANGES_ROOT / exchange_filename(following), following.exchange_id))
    user_contribution, codex_contribution = contribution_summary(exchange)
    parts = [
        frontmatter(
            "Conversation",
            exchange.title,
            f"Redacted prompt-response exchange {exchange.exchange_id} from the heritage Foundry task.",
            f"exchanges/{path.stem}",
            ["postmortem", "conversation", "heritage-evaluation-foundry"],
        ),
        f"# {exchange.exchange_id}: {exchange.title}\n\n",
        " | ".join(nav) + "\n\n",
        "## Publication Boundary\n\n",
        "This is a public-safe derivative of the visible task conversation. It excludes "
        "hidden instructions, private reasoning, tool arguments, tool outputs, credentials "
        "and local evidence paths. Commentary and final responses are preserved.\n\n",
        "## User Prompt\n\n",
        f"- Timestamp: `{exchange.user.timestamp}`\n\n",
        fenced_text(exchange.user.text),
        "\n## Codex Response\n\n",
    ]
    if exchange.responses:
        for number, response in enumerate(exchange.responses, start=1):
            phase = response.phase or "response"
            parts.extend(
                [
                    f"### Response {number} ({phase})\n\n",
                    f"- Timestamp: `{response.timestamp}`\n\n",
                    fenced_text(response.text),
                    "\n",
                ]
            )
    else:
        parts.append("No visible Codex response had been recorded at extraction time.\n\n")
    parts.extend(
        [
            "## Contribution Reading\n\n",
            f"- User contribution: {user_contribution}\n",
            f"- Codex contribution: {codex_contribution}\n\n",
            " | ".join(nav) + "\n",
        ]
    )
    return path, "".join(parts)


def render_reader(exchanges: list[Exchange]) -> tuple[Path, str]:
    path = READERS_ROOT / "conv-001-heritage-evaluation-foundry.md"
    parts = [
        frontmatter(
            "Conversation",
            "Heritage Evaluation Foundry task reader",
            "Complete redacted start-to-finish reader for the heritage Evaluation Foundry task.",
            "readers/conv-001-heritage-evaluation-foundry",
            ["postmortem", "conversation-reader", "heritage-evaluation-foundry"],
        ),
        "# Heritage Evaluation Foundry Task Reader\n\n",
        "This reader inlines every visible user prompt and Codex commentary/final response "
        "in chronological order. The extraction boundary is described in "
        "[Methodology](../methodology.md).\n\n",
        "## Exchange Map\n\n",
        "| Exchange | Prompt | Responses | Standalone note |\n",
        "|---|---|---:|---|\n",
    ]
    for exchange in exchanges:
        standalone = relative_link(path, EXCHANGES_ROOT / exchange_filename(exchange), "note")
        parts.append(
            f"| [{exchange.exchange_id}](#ex-{exchange.sequence:04d}) | "
            f"{exchange.title} | {len(exchange.responses)} | {standalone} |\n"
        )
    parts.append("\n## Conversation\n\n")
    for exchange in exchanges:
        standalone = relative_link(path, EXCHANGES_ROOT / exchange_filename(exchange), exchange.exchange_id)
        parts.extend(
            [
                f"### {exchange.exchange_id}\n\n",
                f"**Prompt:** {exchange.title}\n\n",
                f"- User timestamp: `{exchange.user.timestamp}`\n",
                f"- Standalone note: {standalone}\n\n",
                "#### User Prompt\n\n",
                fenced_text(exchange.user.text),
                "\n#### Codex Response\n\n",
            ]
        )
        if exchange.responses:
            for number, response in enumerate(exchange.responses, start=1):
                parts.extend(
                    [
                        f"##### Response {number} ({response.phase or 'response'})\n\n",
                        f"- Timestamp: `{response.timestamp}`\n\n",
                        fenced_text(response.text),
                        "\n",
                    ]
                )
        else:
            parts.append("No visible response was recorded at extraction time.\n\n")
        parts.append("[Back to exchange map](#exchange-map)\n\n")
    return path, "".join(parts)


def render_conversation_source(metadata: dict[str, Any], exchanges: list[Exchange]) -> tuple[Path, str]:
    path = SOURCES_ROOT / "conv-001-heritage-evaluation-foundry.md"
    parts = [
        frontmatter(
            "Conversation",
            "Heritage Evaluation Foundry task source",
            "Source note for the curated Codex task used by this postmortem.",
            "sources/conv-001-heritage-evaluation-foundry",
            ["postmortem", "source", "conversation"],
        ),
        "# Heritage Evaluation Foundry Task Source\n\n",
        "## Source Identity\n\n",
        "- Source: one curated local Codex rollout JSONL.\n",
        f"- SHA-256 at extraction: `{metadata['source_sha256']}`.\n",
        f"- Source bytes at extraction: `{metadata['source_bytes']}`.\n",
        f"- Visible exchanges: `{len(exchanges)}`.\n",
        f"- Visible user messages: `{metadata['visible_user_messages']}`.\n",
        f"- Visible assistant messages: `{metadata['visible_assistant_messages']}`.\n",
        "- Raw path: retained only in the ignored private evidence plane.\n\n",
        "## Reading Routes\n\n",
        f"- {relative_link(path, READERS_ROOT / 'conv-001-heritage-evaluation-foundry.md', 'start-to-finish reader')}\n",
    ]
    for exchange in exchanges:
        parts.append(
            f"- {relative_link(path, EXCHANGES_ROOT / exchange_filename(exchange), f'{exchange.exchange_id}: {exchange.title}')}\n"
        )
    return path, "".join(parts)


def markdown_table(rows: Iterable[Iterable[Any]], headers: Iterable[str]) -> str:
    header_list = list(headers)
    output = [
        "| " + " | ".join(header_list) + " |",
        "|" + "|".join("---" for _ in header_list) + "|",
    ]
    for row in rows:
        output.append("| " + " | ".join(str(value) for value in row) + " |")
    return "\n".join(output) + "\n"


def format_duration(seconds: int) -> str:
    minutes, remainder = divmod(seconds, 60)
    return f"{minutes}m {remainder:02d}s"


def local_command_counts(command_events: list[dict[str, Any]]) -> Counter[str]:
    return Counter(event["category"] for event in command_events)


def report_metrics(
    exchanges: list[Exchange],
    command_events: list[dict[str, Any]],
    runs: list[dict[str, Any]],
    cycles: list[dict[str, Any]],
    evidence: list[dict[str, Any]],
) -> dict[str, Any]:
    ci_runs = [item for item in runs if item["phase"] == "pull-request-ci"]
    pages_runs = [item for item in runs if item["phase"] == "post-merge-pages"]
    current_receipt = load_json(
        ROOT
        / "evaluation-foundry"
        / "fixtures"
        / "heritage-warwickshire"
        / "evidence"
        / "local-candidate-receipt.json"
    )
    current_candidate = current_receipt["candidate"]
    release_attempts = load_release_attempt_register()["attempts"]
    return {
        "conversation_exchanges": len(exchanges),
        "visible_assistant_messages": sum(len(item.responses) for item in exchanges),
        "relevant_local_command_events": len(command_events),
        "local_command_counts": dict(sorted(local_command_counts(command_events).items())),
        "pull_requests": len(cycles),
        "file_touches_across_prs": sum(item["files_changed"] for item in cycles),
        "unique_final_files_changed": int(
            run_git("diff", "--name-only", "f5d38674..0b5d748d").count("\n") + 1
        ),
        "ci_runs": len(ci_runs),
        "pages_runs": len(pages_runs),
        "failed_or_rerun_relevant_github_runs": sum(
            1 for item in runs if item["conclusion"] != "success" or item["attempt"] != 1
        ),
        "release_closure_attempts": len(release_attempts),
        "release_closure_successes": sum(
            item["conclusion"] == "success" for item in release_attempts
        ),
        "release_closure_failures": sum(
            item["conclusion"] == "failure" for item in release_attempts
        ),
        "ci_workflow_wall_seconds": sum(item["duration_seconds"] for item in ci_runs),
        "pages_workflow_wall_seconds": sum(item["duration_seconds"] for item in pages_runs),
        "all_workflow_wall_seconds": sum(item["duration_seconds"] for item in runs),
        "private_evidence_records": sum("status" not in item for item in evidence),
        "normalized_current_evidence_records": sum(
            "status" in item for item in evidence
        ),
        "late_findings": len(LATE_FINDINGS),
        "final_site_files": SITE_IDENTITIES[30819232224]["site_files"],
        "final_site_bytes": SITE_IDENTITIES[30819232224]["site_bytes"],
        "pages_limit_remaining_bytes": 1_000_000_000 - SITE_IDENTITIES[30819232224]["site_bytes"],
        "postmortem_site_reading_pages": current_candidate["site_reading_pages"],
        "postmortem_site_internal_references": current_candidate[
            "site_internal_references"
        ],
        "postmortem_site_files": current_candidate["site_file_count"] + 1,
        "postmortem_explorer_tree_sha256": current_candidate[
            "explorer_tree_sha256"
        ],
    }


def render_index(metrics: dict[str, Any], exchanges: list[Exchange]) -> tuple[Path, str]:
    path = PUBLIC_ROOT / "index.md"
    parts = [
        frontmatter(
            "Report",
            "Heritage Evaluation Foundry engineering postmortem",
            "Evidence-backed process analysis, complete trace and selective-rerun implementation register.",
            "index",
            ["postmortem", "evaluation-foundry", "process-improvement"],
        ),
        "# Heritage Evaluation Foundry Engineering Postmortem\n\n",
        "This package reconstructs the Coventry and Warwickshire heritage exemplar from "
        "the task conversation, local Git history, three pull requests, six GitHub Actions "
        "baseline runs, three retained Pages artifacts, nine R1/terminal/R2 closure runs "
        "and both immutable release closures.\n\n",
        "## Start Here\n\n",
        "- [Technical postmortem](postmortem.md)\n",
        "- [End-to-end process timeline](process-timeline.md)\n",
        "- [Implemented dependency and assurance architecture](architecture.md)\n",
        "- [Evidence and publication boundary](evidence.md)\n",
        "- [Methodology and metric definitions](methodology.md)\n",
        "- [Conversation summary](conversation-summary.md)\n",
        "- [Full prompt-response reader](readers/conv-001-heritage-evaluation-foundry.md)\n\n",
        "## Headline Measures\n\n",
        markdown_table(
            [
                ("Original PR/Pages runs", "6", "All successful, all attempt 1"),
                (
                    "R1/terminal/R2 attempts",
                    metrics["release_closure_attempts"],
                    f"{metrics['release_closure_successes']} passed; "
                    f"{metrics['release_closure_failures']} failed closed",
                ),
                ("GitHub workflow wall time", format_duration(metrics["all_workflow_wall_seconds"]), "Three CI plus three Pages runs"),
                ("PR file touches", f"{metrics['file_touches_across_prs']:,}", "Includes repeated generated files"),
                ("Late findings reconstructed", metrics["late_findings"], "Local audits and public gates"),
                ("Historical central Site", f"{metrics['final_site_files']:,} files", f"{metrics['final_site_bytes']:,} bytes at PR #69"),
                ("Visible prompt-response exchanges", metrics["conversation_exchanges"], f"{metrics['visible_assistant_messages']} Codex responses at extraction"),
            ],
            ("Measure", "Value", "Definition"),
        ),
        "\n## Prompt-Response Exchanges\n\n",
        "| Exchange | Prompt | Responses |\n",
        "|---|---|---:|\n",
    ]
    for exchange in exchanges:
        parts.append(
            f"| [{exchange.exchange_id}](exchanges/{exchange_filename(exchange)}) | "
            f"{exchange.title} | {len(exchange.responses)} |\n"
        )
    parts.extend(
        [
            "\n## Machine-Readable Registers\n\n",
            "- [Session register](data/session-register.json)\n",
            "- [Exchange register](data/exchange-register.json)\n",
            "- [Relevant local command events](data/command-event-register.json)\n",
            "- [GitHub run register](data/github-run-register.json)\n",
            "- [R1/terminal/R2 attempt register](data/publication-attempt-register.json)\n",
            "- [Rebuild-cycle register](data/rebuild-cycle-register.json)\n",
            "- [Evidence register](data/evidence-register.json)\n",
            "- [Current PR/publication/release evidence](data/current-publication-evidence.json)\n",
            "- [Report metrics](data/report-metrics.json)\n",
            "- [Implementation and acceptance register](data/implementation-acceptance-register.json)\n",
            "- [Architecture and release decisions](data/architecture-decisions.json)\n",
            "- [Publication decisions](data/publication-decisions.json)\n",
            "- [Publication lint](data/publication-lint-report.json)\n",
        ]
    )
    return path, "".join(parts)


def render_methodology(metadata: dict[str, Any], metrics: dict[str, Any]) -> tuple[Path, str]:
    path = PUBLIC_ROOT / "methodology.md"
    text = frontmatter(
        "Report",
        "Postmortem methodology and metric definitions",
        "Scope, extraction, evidence, measurement and limitation rules for the heritage Foundry postmortem.",
        "methodology",
        ["postmortem", "methodology", "evidence"],
    ) + dedent_markdown(
        f"""\
        # Postmortem Methodology And Metric Definitions

        ## Decision And Audience

        The report is for maintainers and technically interested reviewers deciding how
        to change the Evaluation Foundry so late errors invalidate only their dependency
        cone. It is not an assessment of Historic England, GitHub or the end user's
        browsing behaviour.

        ## Evidence Scope

        The collection boundary is the task from `2026-08-02T21:46:49Z` through the
        final publication-closure handoff, plus repository/GitHub evidence for PRs
        #67–#69. The private
        plane contains raw GitHub logs, structured PR/run metadata, release assets, Git
        outputs and three deployment archives. The public plane contains hashes,
        normalized registers, bounded excerpts and this analysis.

        The primary performance reconstruction ends at the terminal 3 August release.
        The 4 August postmortem publication is reported separately as a controlled
        documentation-only invalidation exercise; it is not added to the three historical
        PR totals or six GitHub workflow totals. Current PR #70 and the replacement
        external publication are recorded through the normalized
        [publication-evidence register](data/current-publication-evidence.json); pending
        records do not change historical timing metrics or imply success.

        The prior
        [hackathon postmortem pattern](https://github.com/chris-page-gov/ai-engineering-lab-hackathon-london-2026/tree/8418bce78496e36598b10d4562b1fb275ad610bb/postmortem-public)
        was reused: one exchange begins with a visible user prompt and contains every
        visible assistant commentary/final message until the next prompt. System and
        developer instructions, private reasoning, tool arguments and tool outputs are
        not part of a prompt-response trace. Publication-evidence records are never
        converted into conversation messages, so the same rollout bytes always produce
        the same full trace regardless of rollout milestone status.

        ## Metric Definitions

        - **Workflow wall time** is `updatedAt - startedAt` for a GitHub Actions run.
          Times across runs are additive resource/queue observations, not elapsed
          delivery latency when work overlaps.
        - **CI job time** is job completion minus job start. A step duration is computed
          from its GitHub job timestamps.
        - **File touch** is one path reported by `git diff --name-only` for one PR phase.
          A path changed in two PRs counts twice in the total `{metrics['file_touches_across_prs']:,}`.
        - **Generated amplification** is generated output touched because an upstream
          change invalidated broad output, compared with the number/type of substantive
          source changes. It is descriptive; no CPU cost per file is inferred.
        - **Late finding** is a defect, inconsistency or release risk first reported after
          full-corpus generation or during Site/browser/publication assurance.
        - **Dependency cone** is the changed input plus every transitively dependent
          producer plane, consumer test, Site component and promotion check.
        - **Outcome fingerprint** is a stable projection of semantic results with run
          timestamps and observation-only metadata removed.
        - **Reused gate** is a previously passed result whose declared inputs/roots are
          unchanged by the reviewed change class. The fresh Site-shell receipt names
          every reused and rerun gate; reuse is not inferred from a green final build.

        ## Conversation Extraction

        The curated source has SHA-256 `{metadata['source_sha256']}` and contained
        `{metadata['source_bytes']:,}` bytes at extraction. The public trace contains
        `{metrics['conversation_exchanges']}` user exchanges and
        `{metrics['visible_assistant_messages']}` visible Codex messages at extraction.
        Local paths and token-shaped strings are redacted. The public lint rejects local
        user paths, Codex rollout paths, private evidence paths and common token forms.

        ## Command Evidence

        The task runtime aggregates several nested commands into one orchestrator call.
        Therefore command **invocation counts** are exact for recognized executable
        command strings, while local per-command duration is unavailable when commands
        shared an outer call. GitHub job and step durations remain exact to the reported
        timestamp resolution. Raw command output stays private.

        ## Limitations And Uncertainty

        - This is one complex exemplar and three PRs, not a benchmark across projects.
        - The trace cannot expose hidden model reasoning and does not claim to do so.
        - Local tool calls made by subagents are represented through their visible
          summaries and repository results, not merged into the parent prompt trace.
        - GitHub does not report billable cost here, so the report uses wall time and
          file/byte amplification rather than money.
        - The release is digest-bound and frozen by policy, but GitHub reports
          `isImmutable: false`; this statement describes the historical 3 August
          release. The replacement policy is evaluated separately: the independently
          rooted 4 August R1 and R2 are counted as terminally passed only because the
          normalized evidence register supplies their exact immutable release identities,
          attestation URLs, asset digests and workflow runs.
        - The current final response is included through the handoff capture mechanism;
          rerunning after the task completes can verify it against the finalized rollout.
        """
    )
    return path, text


def render_timeline(cycles: list[dict[str, Any]], runs: list[dict[str, Any]]) -> tuple[Path, str]:
    path = PUBLIC_ROOT / "process-timeline.md"
    github_rows = []
    for run in runs:
        github_rows.append(
            (
                run["started_at"],
                f"PR #{run['pr_number']} {run['phase']}",
                f"[{run['run_id']}]({run['url']})",
                format_duration(run["duration_seconds"]),
                f"{run['conclusion']}, attempt {run['attempt']}",
            )
        )
    finding_rows = [
        (timestamp, category, finding, cone)
        for timestamp, category, finding, cone in LATE_FINDINGS
    ]
    release_attempt_rows = []
    for attempt in load_release_attempt_register()["attempts"]:
        started = parse_timestamp(attempt["started_at"])
        completed = parse_timestamp(attempt["completed_at"])
        release_attempt_rows.append(
            (
                attempt["started_at"],
                attempt["stage"],
                f"[{attempt['run_id']}]({attempt['run_url']})",
                format_duration(int((completed - started).total_seconds())),
                attempt["conclusion"],
                attempt["failure_step"] or attempt["finding"],
                "no / no",
            )
        )
    text = frontmatter(
        "Report",
        "Heritage Foundry end-to-end process timeline",
        "Chronology of implementation, late findings, pull requests, deployments and release assurance.",
        "process-timeline",
        ["postmortem", "timeline", "evaluation-foundry"],
    ) + dedent_markdown(
        f"""\
        # Heritage Foundry End-To-End Process Timeline

        ## Summary

        The work began with repository/source access review on 2 August. The full
        unattended implementation ran from the first feature commit at
        `2026-08-03T09:02:38Z` to the final release evidence uploads at about
        `2026-08-03T13:49:21Z`: 4h 46m 43s of publicly evidenced commit-to-release
        activity inside a much longer research/build task.

        The six original PR and Pages runs did not fail. The later cycle-free release
        closure deliberately failed closed four times while exercising previously
        untested link, genuine-Chrome and R2 contracts. Every correction changed only
        assurance/release controls: the candidate and deployed Site were never rebuilt.

        ## Late-Finding Chronology

        {markdown_table(finding_rows, ('First visible timestamp', 'Class', 'Finding', 'Actual invalidation'))}

        ## Pull-Request Phases

        {markdown_table(
            [
                (
                    f"[#{item['pr_number']}]({item['url']})",
                    item['label'],
                    f"{item['files_changed']:,}",
                    f"+{item['insertions']:,} / −{item['deletions']:,}",
                    item['interpretation'],
                )
                for item in cycles
            ],
            ('PR', 'Phase', 'Files touched', 'Line change', 'Meaning'),
        )}

        ## GitHub Run Chronology

        {markdown_table(github_rows, ('Start (UTC)', 'Phase', 'Run', 'Wall time', 'Result'))}

        ## R1, Terminal Assurance And R2 Closure

        {markdown_table(
            release_attempt_rows,
            ('Start (UTC)', 'Stage', 'Run', 'Wall time', 'Result', 'Finding or passed scope', 'Candidate / Site rebuilt'),
        )}

        The first two terminal failures exposed missing network retry semantics and a
        Chrome-process cleanup race. The next two promotion failures proved that a
        downstream semantic/release validator was not being exercised early enough.
        Those failures are the strongest direct evidence for the recommended shift-left
        microfixtures and shared contracts: the final candidate commit remained
        `51881ccc0ce1b77346b9cd8d4462c320bf203114` throughout all nine attempts.

        ## Publication Gates

        - `2026-08-03T11:45:45Z–11:47:43Z`: authenticated browser evidence was
          captured for eleven protected Historic England pages.
        - `2026-08-03T12:00:35Z`: the first local candidate receipt was fixed.
        - `2026-08-03T12:28:41Z`: PR #68 Pages deployment completed.
        - `2026-08-03T12:29:08Z`: the initial public journey passed 27/27 actions.
        - `2026-08-03T13:27:15Z`: the promoted local candidate receipt was fixed.
        - `2026-08-03T13:46:28Z`: PR #69 Pages deployment completed.
        - `2026-08-03T13:46:54Z`: the evidence release was published.
        - `2026-08-03T13:47:21Z`: the terminal public journey passed 32/32 actions.
        - `2026-08-03T13:48:17Z–13:49:21Z`: uniquely named release receipts were
          uploaded after basename collisions were corrected.
        - `2026-08-04T10:28:29Z`: the independently rooted heritage Pages deployment
          completed from the immutable candidate commit.
        - `2026-08-04T11:08:48Z`: immutable candidate release R1 was published.
        - `2026-08-04T12:27:11Z`: final terminal assurance completed with 13,548/13,548
          link identities, 11/11 protected pages and three 32-action browser journeys.
        - `2026-08-04T12:28:42Z`: immutable promotion release R2 was published; its
          ten-asset release attestation verified at `2026-08-04T12:28:43Z`.

        The 27-action candidate observation remains valid historical evidence, but the
        machine profile still names action 28 as the final gate while the terminal
        journey now has actions 29–32. Future profiles should derive stage counts and
        gate labels from immutable receipts rather than duplicate them manually.
        """
    )
    return path, text


def render_architecture(
    publication_evidence: dict[str, Any],
) -> tuple[Path, str]:
    path = PUBLIC_ROOT / "architecture.md"
    pending_kinds = [
        record["kind"]
        for record in publication_evidence["records"]
        if record["status"] != "verified"
    ]
    publication_state = (
        "The normalized current-publication register binds verified PR #70, external "
        "candidate, Pages, R1, terminal and R2 evidence. All terminal publication gates "
        "are independently recorded as verified."
        if not pending_kinds
        else (
            "The normalized current-publication register records PR #70 and every external "
            "candidate/Pages/R1/terminal/R2 milestone without inferring success. The stages "
            "still pending exact public evidence are: "
            + ", ".join(f"`{kind}`" for kind in pending_kinds)
            + "."
        )
    )
    release_state = (
        "The normalized evidence supplies exact public URLs, identities and required claims "
        "for both immutable releases and terminal assurance."
        if current_evidence_verified(
            publication_evidence, "PUBEV-004", "PUBEV-005", "PUBEV-006"
        )
        else (
            "This report does not claim the replacement release gates passed: a stage remains "
            "pending until its exact URL, identities, timestamp and complete required-claim "
            "set are present in the normalized evidence input."
        )
    )
    text = frontmatter(
        "TechArticle",
        "Implemented selective-rerun architecture for the Evaluation Foundry",
        "Implemented dependency graph, impact planner, assurance tiers and candidate/evidence separation.",
        "architecture",
        ["postmortem", "architecture", "dependency-graph", "evaluation-foundry"],
    ) + dedent_markdown(
        """\
        # Implemented Selective-Rerun Architecture For The Evaluation Foundry

        ## The Missing Control

        The parent [Foundry process](../../beginners/19-foundry-authoring-and-domain-profiles.md)
        already requires a consumer lock, dependency graph and transitive invalidation
        rules. Its [authoring profile schema](../../../profiles/authoring/v1/domain-profile.schema.json)
        provides those structures. The derivative
        [Evaluation Profile v1 schema](../../../evaluation-foundry/schemas/okf-evaluation-profile.v1.schema.json)
        reduces the consumer contract to a consumer name, journeys, deterministic-build
        count and compatibility list. Plane roots survived, but the executable graph
        that could use those roots did not.

        ## Historical Flow

        ```mermaid
        flowchart LR
          S["Frozen sources"] --> M["Monolithic build_corpus"]
          M --> P["All faithful, tiny and synthetic planes"]
          P --> W["Delete and rewrite complete outputs"]
          W --> B["Delete and rebuild complete Site"]
          B --> T["Full unit and browser matrix"]
          T --> E["Timestamped receipts inside Site closure"]
          E --> B
        ```

        The final edge is the observer effect: refreshing evidence changes the candidate
        being evidenced.

        ## Implemented Candidate Flow

        ```mermaid
        flowchart LR
          F["Source freeze"] --> N["Normalized core"]
          N --> D["Data shards"]
          N --> R["Resources"]
          N --> L["Relationships"]
          N --> X["Search"]
          L --> S["Semantic graph"]
          N --> P["Presentation"]
          D --> A["Descriptor and plane roots"]
          R --> A
          L --> A
          X --> A
          S --> A
          P --> A
          C["Changed inputs"] --> I["Impact planner"]
          I --> D
          I --> R
          I --> L
          I --> X
          I --> S
          I --> P
          A --> Q["Affected consumer tests"]
          A --> W["Component Site assembly"]
          W --> V["Public verification"]
          Q --> E["Independent evidence envelope"]
          V --> E
          E -. references .-> A
        ```

        The evidence envelope references the immutable candidate; it is not an input to
        the candidate root. The implementation is split across the
        [Evaluation Profile v2](../../../evaluation-foundry/fixtures/heritage-warwickshire/evaluation-profile.yaml),
        [impact planner](../../../scripts/plan_evaluation_foundry_impact.py),
        [plane writer](../../../scripts/heritage_build_io.py),
        [component Site cache](../../../scripts/site_component_cache.py) and
        [promotion-envelope validator](../../../scripts/check_promotion_envelope.py).

        ## Implemented Dependency Cones

        | Change class | Producer work | Consumer/publication work |
        |---|---|---|
        | Report copy or public link | Presentation and affected reading pages | Link check, Site component and relevant public actions |
        | Registry entry | Registry projections and Site manifest | Source-selection/federation smoke and public route check |
        | Search aliases or typo logic | Search plane only | Search worker tests and search-tagged questions |
        | Relationship predicate/mapping | Relationship and semantic planes | Graph/Links tests; Search only if aliases derive from relationships |
        | Geometry mapping | Affected record/map shards | Map tests and map-tagged questions |
        | Explorer TypeScript/CSS | App build | Component/affected journeys; no corpus rebuild when contracts are unchanged |
        | Protected-link observation | Evidence/freshness plane only | Scheduled receipt validation outside candidate and Site bytes; no candidate root change |
        | Source or normalized core | Complete transitive closure | All affected consumer tests and release composition |

        ## Browser Assurance Tiers

        The fail-closed impact plan and the 13-case adversarial gate are independent,
        cheap prerequisites. They run in parallel, but no selected Python, app,
        browser, Foundry, documentation, Site or release-policy job starts until both
        have passed. Those selected jobs then fan out in parallel. The Pages and
        nightly full-shadow workflows use the same adversarial prerequisite, so an
        already-reconstructed late-finding class cannot consume a full candidate build
        or three-engine run before it fails.

        The profile and CI now encode three review tiers:

        1. Explorer runtime, routing, workers, storage, graph, map, styles,
           accessibility, browser dependencies, journey-runner or unknown changes run
           Chrome, Firefox and WebKit on the pull request.
        2. Contract-preserving Data, Search, Semantic, registry and Presentation changes
           run deterministic contracts plus affected Chromium journeys on the pull
           request.
        3. The complete three-engine matrix and complete Foundry family run on the
           [nightly full-shadow workflow](../../../.github/workflows/foundry-full-shadow.yml)
           and again before terminal promotion, regardless of selective reuse.

        This is a risk classification, not a weakening of terminal assurance. The
        [pull-request workflow](../../../.github/workflows/okf-explorer-ci.yml) retains a
        stable aggregate required check and treats an unknown path or missing trusted
        root comparison as full invalidation.

        ## Semantic Canonicalization

        [YAML-LD](../../beginners/22-evaluation-foundry-and-yaml-ld.md) is the readable,
        human-maintained authoring form. The normalized graph and Semantic plane root
        define semantic equality. JSON-LD is a generated interchange representation
        whenever that plane changes and again at release; it is not a second hand-edited
        source. Semantic nodes and reified assertions are stable hash shards, and the old
        duplicate assertion materialization is removed.

        ## Link Freshness Boundary

        Candidate link intent is structural and stable: each shard is selected by
        `SHA-256(canonical URL)`. Live network observations and protected rich-page
        browser observations use the independent
        [link-observation workflow](../../../.github/workflows/link-observation.yml).
        Its timestamped receipts are workflow artifacts outside the candidate and Site,
        so refreshing a source URL cannot change the bytes being observed.

        ## Impact Plan Contract

        The [planner](../../../scripts/plan_evaluation_foundry_impact.py) produces a
        schema-validated `impact-plan.json` containing:

        - old and new input roots;
        - changed normalized entities or configuration paths;
        - affected producer nodes and the graph edge that selected each node;
        - roots eligible for reuse;
        - required validators, question tags, journey groups and public actions;
        - whether a full audit is mandatory;
        - an explanation suitable for review.

        Its executable interfaces are `--explain`, `--changed-from`, `--changed-path`,
        `--plane`, `--fixture`, `--test-tag` and `--journey-group`. The
        [impact tests](../../../tests/test_evaluation_foundry_impact.py) replay historical
        #68/#69 root receipts, exercise explicit selectors and require unknown or
        untrusted changes to fail closed.

        ## Publication And Release Boundary

        The independently rooted
        [`okf-heritage-coventry-warwickshire` publication unit](../../../publication-units/heritage-coventry-warwickshire/publication-unit.json)
        owns corpus/data/readers and release assets; the main repository retains the
        Explorer runtime, common schemas, registry and documentation shell. Export and
        local validation are implemented.

        CURRENT_PUBLICATION_STATE

        Terminal policy requires an annotated tag bound to the exact commit, a GitHub
        artifact attestation, platform immutable releases, draft-first attachment of all
        assets and a deterministic archive retained as an immutable release asset. The
        [policy](../../../release-assurance/release-policy.json),
        [validator](../../../scripts/check_release_policy.py) and
        [external promotion workflow template](../../../publication-units/heritage-coventry-warwickshire/repository-template/promotion-release.yml)
        implement those gates.

        CURRENT_RELEASE_STATE

        ## Acceptance Boundary

        Local tests and deterministic checks can accept implementation structure and
        candidate bytes. Only the eventual public identity journey, signed or attested
        promotion envelope and platform immutable release can change the external unit
        from pending to promoted. See the
        [implementation register](data/implementation-acceptance-register.json) and
        [decision register](data/architecture-decisions.json) and
        [current publication evidence](data/current-publication-evidence.json) for that
        state split.
        """
    ).replace("CURRENT_PUBLICATION_STATE", publication_state).replace(
        "CURRENT_RELEASE_STATE", release_state
    )
    return path, text


def render_evidence(
    evidence: list[dict[str, Any]],
    runs: list[dict[str, Any]],
    publication_evidence: dict[str, Any],
) -> tuple[Path, str]:
    path = PUBLIC_ROOT / "evidence.md"
    page_archives = [item for item in evidence if item["kind"] == "preserved-pages-deployment-archive"]
    archive_rows = []
    for item in page_archives:
        run_id = int(item["source"].rsplit("/", 1)[-1])
        archive_rows.append(
            (
                f"[{run_id}]({item['source']})",
                f"{item['private_copy_bytes']:,}",
                f"`{item['private_copy_sha256']}`",
                f"`{item['decompressed_tar_sha256']}`",
            )
        )
    current_rows = []
    for record in publication_evidence["records"]:
        subject = (
            f"[subject]({record['subject_url']})"
            if record["subject_url"]
            else "not supplied"
        )
        evidence_links = (
            "<br>".join(
                f"[evidence {index}]({url})"
                for index, url in enumerate(record["evidence_urls"], start=1)
            )
            or "none supplied"
        )
        current_rows.append(
            (
                record["id"],
                record["kind"],
                record["status"],
                subject,
                f"{len(record['claims'])}/{len(record['required_claims'])}",
                evidence_links,
            )
        )
    release_qualification = (
        "The normalized current-publication evidence records exact verified R1, terminal "
        "and R2 identities, claims and public evidence URLs."
        if current_evidence_verified(
            publication_evidence, "PUBEV-004", "PUBEV-005", "PUBEV-006"
        )
        else (
            "Those controls remain **terminally unverified for the new external unit**. "
            "A pending record may name its intended public subject, but it cannot become "
            "verified until every required identity, claim, timestamp and evidence URL is supplied."
        )
    )
    rollout_qualification = (
        "All six milestones are verified from exact public identities, timestamps, "
        "claims and URLs; no success state is inferred from local implementation."
        if publication_evidence["status"] == "verified"
        else (
            "Pending milestones remain pending rather than being derived from local "
            "implementation; each requires its complete public identity and claim set."
        )
    )
    text = frontmatter(
        "Report",
        "Heritage Foundry postmortem evidence",
        "Evidence inventory, retention boundary, hashes and release qualifications.",
        "evidence",
        ["postmortem", "evidence", "provenance"],
    ) + dedent_markdown(
        f"""\
        # Heritage Foundry Postmortem Evidence

        ## Collection Result

        The ignored private evidence plane contains structured PR/run metadata, six
        gzipped Actions logs, Git/reflog snapshots, all six release assets and three
        deployment archives captured before their one-day retention expired. The public
        [evidence register](data/evidence-register.json) publishes source URLs, byte
        counts, hashes and treatment decisions without publishing raw logs or local paths.

        The current rollout is a separate
        [normalized input](../../../release-assurance/heritage-postmortem-publication-evidence.json).
        It records PR #70, the external candidate and Pages deployment, R1, terminal
        assurance and R2. Its generated
        [current-publication register](data/current-publication-evidence.json) and the
        appended public records in the [evidence register](data/evidence-register.json)
        apply that fail-closed contract. {rollout_qualification}

        The separate [R1/terminal/R2 attempt register](data/publication-attempt-register.json)
        reconstructs all nine closure runs from their public workflow logs. It records the
        failed step, bounded correction, control commit and retained artifact digest where
        present. All nine records explicitly prove that neither candidate nor Site bytes
        changed during closure.

        {markdown_table(current_rows, ('ID', 'Milestone', 'State', 'Subject', 'Claims', 'Public evidence'))}

        ## Preserved Deployment Archives

        GitHub downloads the Pages artifact as an exact `artifact.tar`. The private copy
        is stored with lossless gzip compression. The last column proves that
        decompression reproduces the original downloaded tar bytes.

        {markdown_table(archive_rows, ('Pages run', 'Stored bytes', 'Stored gzip SHA-256', 'Decompressed tar SHA-256'))}

        ## GitHub Evidence Quality

        - All six relevant workflow runs were successful attempt 1 runs with no rerun.
        - PRs #67–#69 had no comments, reviews or review decision. Their required CI
          check was green.
        - Each feature commit tree exactly matches its squash-merge tree, so CI tested
          the exact tree later deployed.
        - The three Pages logs bind app, corpus, Site-tree and uploaded-artifact hashes.
        - The terminal release contains six uniquely named receipt assets with reported
          SHA-256 digests.
        - The independent R1 is immutable and retains five exact candidate assets; R2 is
          immutable and its GitHub Releases attestation binds all ten promotion assets.
        - The final terminal artifact is independently hashed as
          `sha256:2f9e5544a06bd143ab4f069c6cf65a4edf6f1c54a9fd88c0a7bfc74322f1447c`.

        ## Release Qualification

        The **historical 3 August release** is content-addressed and frozen by project
        policy, but it is not platform-enforced immutable. GitHub reports
        `isImmutable: false`, the tag is a lightweight commit tag, and neither the tag
        nor assets are protected from a privileged maintainer.

        The replacement policy is now implemented in
        [`release-policy.json`](../../../release-assurance/release-policy.json), its
        [validator](../../../scripts/check_release_policy.py) and the
        [external promotion workflow template](../../../publication-units/heritage-coventry-warwickshire/repository-template/promotion-release.yml).
        It requires an annotated tag, GitHub artifact attestation, immutable releases,
        draft-first asset attachment and a deterministic archive retained as a release
        asset.

        {release_qualification}

        ## Publication Boundary

        Public trace pages exclude hidden instructions, private reasoning, tool payloads,
        credentials and raw logs. Raw evidence remains ignored because it contains local
        paths and high-volume operational detail. Every public file is link-linted and
        scanned for forbidden local/token patterns.
        """
    )
    return path, text


def render_conversation_summary(exchanges: list[Exchange]) -> tuple[Path, str]:
    path = PUBLIC_ROOT / "conversation-summary.md"
    rows = []
    for exchange in exchanges:
        user, codex = contribution_summary(exchange)
        rows.append(
            (
                f"[{exchange.exchange_id}](exchanges/{exchange_filename(exchange)})",
                exchange.title,
                user,
                codex,
            )
        )
    text = frontmatter(
        "Report",
        "Heritage Foundry conversation contribution summary",
        "Exchange-level summary of user direction and Codex implementation contributions.",
        "conversation-summary",
        ["postmortem", "conversation", "contributions"],
    ) + dedent_markdown(
        f"""\
        # Heritage Foundry Conversation Contribution Summary

        The user supplied the outcome, source/geographic boundary, quality bar,
        unattended authority, correction of the sandbox authentication diagnosis and the
        postmortem/refactoring question. The user then required explicit answers to the
        architecture questions and authorized implementation of every recommendation.
        Codex inferred and implemented the detailed producer, Explorer, validation,
        selective-assurance and publication machinery, then exposed late findings and
        pending public-promotion gates through commentary rather than hiding them from
        the trace.

        {markdown_table(rows, ('Exchange', 'Prompt', 'User contribution', 'Codex contribution'))}

        Read the [complete start-to-finish trace](readers/conv-001-heritage-evaluation-foundry.md)
        for the actual prompts and responses rather than relying on this synthesis.
        """
    )
    return path, text


def find_step_seconds(runs: list[dict[str, Any]], run_id: int, name: str) -> int:
    run = next(item for item in runs if item["run_id"] == run_id)
    return sum(
        step["duration_seconds"]
        for job in run["jobs"]
        for step in job["steps"]
        if step["name"] == name
    )


def implementation_acceptance_register(
    publication_evidence: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    """Return the reviewable state of every original recommended next step.

    ``implemented-local`` means the implementation and its deterministic test
    contract are in the repository candidate.  It deliberately does not mean
    that an external deployment or terminal release has been promoted.
    """

    publication_evidence = publication_evidence or load_current_publication_evidence()
    items = [
        {
            "id": "IMP-001",
            "priority": "P0",
            "change": "Publish Evaluation Profile v2 using the parent Foundry dependency contract.",
            "status": "implemented-local",
            "artifacts": [
                "evaluation-foundry/schemas/okf-evaluation-profile.v2.schema.json",
                "evaluation-foundry/fixtures/heritage-warwickshire/evaluation-profile.yaml",
                "evaluation-foundry/fixtures/heritage-warwickshire/consumer-lock.json",
                "scripts/check_evaluation_foundry.py",
            ],
            "acceptance_tests": ["tests/test_evaluation_foundry_impact.py"],
            "remaining_gate": "Integrated candidate validation and terminal promotion.",
        },
        {
            "id": "IMP-002",
            "priority": "P0",
            "change": "Add a deterministic, explainable, fail-closed impact planner.",
            "status": "implemented-local",
            "artifacts": [
                "scripts/plan_evaluation_foundry_impact.py",
                "evaluation-foundry/schemas/okf-evaluation-impact-plan.v1.schema.json",
                "evaluation-foundry/fixtures/heritage-warwickshire/history/impact-shadow-cases.json",
            ],
            "acceptance_tests": ["tests/test_evaluation_foundry_impact.py"],
            "remaining_gate": "Run the complete shadow and mutation suite in integrated CI.",
        },
        {
            "id": "IMP-003",
            "priority": "P0",
            "change": "Keep mutable observations and promotion status outside candidate roots.",
            "status": "implemented-local",
            "artifacts": [
                "evaluation-foundry/schemas/okf-evaluation-promotion-envelope.v1.schema.json",
                "release-assurance/heritage-publication-envelope.json",
                "scripts/check_promotion_envelope.py",
            ],
            "acceptance_tests": ["tests/test_evaluation_foundry_impact.py"],
            "remaining_gate": "Populate, attest and verify the envelope only after exact public observation.",
        },
        {
            "id": "IMP-004",
            "priority": "P1",
            "change": "Split normalized-core and plane emitters with changed-only atomic writes.",
            "status": "implemented-local",
            "artifacts": [
                "scripts/build_heritage_evaluation.py",
                "scripts/heritage_build_io.py",
            ],
            "acceptance_tests": ["tests/test_build_heritage_evaluation.py"],
            "remaining_gate": "Complete integrated deterministic regeneration of faithful, tiny and synthetic products.",
        },
        {
            "id": "IMP-005",
            "priority": "P1",
            "change": "Run one adversarial microfixture per reconstructed late-finding class before large builds.",
            "status": "implemented-local",
            "artifacts": [
                "evaluation-foundry/fixtures/heritage-warwickshire/adversarial/microfixtures.json",
                "evaluation-foundry/schemas/heritage-adversarial-microfixtures.v1.schema.json",
                "scripts/check_heritage_adversarial.py",
                ".github/workflows/okf-explorer-ci.yml",
                ".github/workflows/pages.yml",
                ".github/workflows/foundry-full-shadow.yml",
            ],
            "acceptance_tests": [
                "tests/test_heritage_adversarial.py",
                "tests/test_ci_publication_topology.py",
            ],
            "remaining_gate": "Observe the first prerequisite receipt in pull-request, Pages and scheduled workflows.",
        },
        {
            "id": "IMP-006",
            "priority": "P1",
            "change": "Drive conditional parallel CI from the impact plan and retain a full shadow audit.",
            "status": "implemented-local",
            "artifacts": [
                ".github/workflows/okf-explorer-ci.yml",
                ".github/workflows/foundry-full-shadow.yml",
            ],
            "acceptance_tests": [
                "tests/test_evaluation_foundry_impact.py",
                "tests/test_ci_publication_topology.py",
            ],
            "remaining_gate": "Observe the first pull-request and scheduled workflow executions.",
        },
        {
            "id": "IMP-007",
            "priority": "P1",
            "change": "Assemble the Site from content-addressed components.",
            "status": "implemented-local",
            "artifacts": [
                "scripts/site_component_cache.py",
                "scripts/build_site.py",
                ".github/workflows/pages.yml",
            ],
            "acceptance_tests": [
                "tests/test_site_component_cache.py",
                "tests/test_build_site.py",
            ],
            "remaining_gate": "Measure changed-component reuse and the final published closure.",
        },
        {
            "id": "IMP-008",
            "priority": "P2",
            "change": "Hash-shard semantic and link-intent outputs and remove the duplicate graph materialization.",
            "status": "implemented-local",
            "artifacts": [
                "scripts/build_heritage_evaluation.py",
                "scripts/observe_link_intents.py",
                ".github/workflows/link-observation.yml",
            ],
            "acceptance_tests": [
                "tests/test_build_heritage_evaluation.py",
                "tests/test_observe_link_intents.py",
            ],
            "remaining_gate": "Observe the first scheduled freshness receipt outside candidate and Site bytes.",
        },
        {
            "id": "IMP-009",
            "priority": "P2",
            "change": "Move the large heritage pack to an independently rooted publication unit.",
            "status": "implemented-local-public-promotion-pending",
            "artifacts": [
                "publication-units/heritage-coventry-warwickshire/publication-unit.json",
                "scripts/export_publication_unit.py",
                "publication-units/heritage-coventry-warwickshire/repository-template/pages.yml",
                "release-assurance/heritage-postmortem-publication-evidence.json",
            ],
            "acceptance_tests": ["tests/test_publication_units.py"],
            "remaining_gate": "Create, publish and identity-check the external repository and exact Pages deployment before registry activation.",
        },
        {
            "id": "IMP-010",
            "priority": "P2",
            "change": "Require annotated tags, attestation, immutable releases and retained deterministic archives.",
            "status": "implemented-policy-terminal-release-pending",
            "artifacts": [
                "release-assurance/release-policy.json",
                "scripts/check_release_policy.py",
                "publication-units/heritage-coventry-warwickshire/repository-template/promotion-release.yml",
                "release-assurance/heritage-postmortem-publication-evidence.json",
            ],
            "acceptance_tests": [
                "tests/test_release_policy.py",
                "tests/test_ci_publication_topology.py",
            ],
            "remaining_gate": "Create and verify the annotated tag, attested envelope, immutable release and retained archive for the promoted external candidate.",
        },
    ]
    by_id = {item["id"]: item for item in items}
    if current_evidence_verified(publication_evidence, "PUBEV-001"):
        by_id["IMP-002"]["status"] = "implemented-and-pr-70-verified"
        by_id["IMP-002"]["remaining_gate"] = (
            "No implementation gate remains; the scheduled mutation shadow is an ongoing regression control."
        )
        for item_id in ("IMP-005", "IMP-006"):
            by_id[item_id]["status"] = "implemented-and-pr-70-verified"
            by_id[item_id]["remaining_gate"] = (
                "Nightly shadow evidence remains independent of the verified pull-request gate."
            )
    if current_evidence_verified(publication_evidence, "PUBEV-002"):
        for item_id in ("IMP-001", "IMP-004"):
            by_id[item_id]["status"] = "implemented-and-external-candidate-verified"
            by_id[item_id]["remaining_gate"] = "Terminal public assurance remains required."
    if current_evidence_verified(publication_evidence, "PUBEV-002", "PUBEV-003"):
        by_id["IMP-007"]["status"] = "implemented-and-external-pages-verified"
        by_id["IMP-007"]["remaining_gate"] = (
            "Retain terminal release evidence for the exact published closure."
        )
        by_id["IMP-009"]["status"] = "implemented-external-pages-verified-promotion-pending"
        by_id["IMP-009"]["remaining_gate"] = (
            "Complete R1, terminal assurance and R2 before registry activation."
        )
    if current_evidence_verified(publication_evidence, "PUBEV-005"):
        by_id["IMP-008"]["status"] = "implemented-and-terminal-link-closure-verified"
        by_id["IMP-008"]["remaining_gate"] = (
            "Scheduled freshness observations continue independently after promotion."
        )
    if current_evidence_verified(publication_evidence, "PUBEV-006"):
        by_id["IMP-003"]["status"] = "implemented-and-terminal-envelope-verified"
        by_id["IMP-003"]["remaining_gate"] = "No terminal promotion gate remains."
    if current_evidence_verified(
        publication_evidence, "PUBEV-002", "PUBEV-003", "PUBEV-004", "PUBEV-005", "PUBEV-006"
    ):
        for item_id in ("IMP-001", "IMP-004", "IMP-007"):
            by_id[item_id]["status"] = "implemented-and-terminal-publication-verified"
            by_id[item_id]["remaining_gate"] = "No terminal acceptance gate remains."
        by_id["IMP-009"]["status"] = "implemented-and-external-promotion-verified"
        by_id["IMP-009"]["remaining_gate"] = "No terminal publication gate remains."
        by_id["IMP-010"]["status"] = "implemented-and-terminal-release-verified"
        by_id["IMP-010"]["remaining_gate"] = "No terminal release-integrity gate remains."
    return items


def architecture_decisions(
    publication_evidence: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    """Resolve the earlier Further Questions with the implemented policy."""

    publication_evidence = publication_evidence or load_current_publication_evidence()
    items = [
        {
            "id": "ADR-001",
            "question": "Where should promotion/status metadata live?",
            "decision": (
                "Only immutable candidate self-facts and the stable promotion-policy reference "
                "belong in the candidate. Status, timestamps, runs and observations belong "
                "exclusively in a signed or GitHub-attested promotion envelope outside its roots."
            ),
            "status": "implemented-local; terminal envelope pending",
            "evidence": [
                "evaluation-foundry/schemas/okf-evaluation-profile.v2.schema.json",
                "evaluation-foundry/schemas/okf-evaluation-promotion-envelope.v1.schema.json",
                "scripts/check_promotion_envelope.py",
            ],
        },
        {
            "id": "ADR-002",
            "question": "Which browser changes require three engines on a pull request?",
            "decision": (
                "Runtime, routing, workers, storage, graph, map, CSS/accessibility, browser "
                "dependencies, journey-runner and unknown changes require Chrome, Firefox and "
                "WebKit on the pull request. Contract-preserving data, search, semantic, registry "
                "and presentation changes use targeted Chromium on the pull request; the full "
                "three-engine matrix remains nightly and mandatory at terminal release."
            ),
            "status": "implemented-local; first workflow observations pending",
            "evidence": [
                "evaluation-foundry/fixtures/heritage-warwickshire/evaluation-profile.yaml",
                "scripts/plan_evaluation_foundry_impact.py",
                ".github/workflows/okf-explorer-ci.yml",
                ".github/workflows/foundry-full-shadow.yml",
            ],
        },
        {
            "id": "ADR-003",
            "question": "Should YAML-LD or JSON-LD be canonical?",
            "decision": (
                "YAML-LD is the human-maintained authoring form; the normalized graph and its "
                "semantic plane root define semantic equality; JSON-LD is generated interchange "
                "whenever the semantic plane changes and again at release."
            ),
            "status": "implemented-local",
            "evidence": [
                "docs/beginners/22-evaluation-foundry-and-yaml-ld.md",
                "scripts/build_heritage_evaluation.py",
            ],
        },
        {
            "id": "ADR-004",
            "question": "How should link validation be sharded and refreshed?",
            "decision": (
                "Stable link intents are sharded by SHA-256 of the canonical URL. Timestamped "
                "network and protected-page observations run on their own freshness schedule and "
                "are uploaded outside candidate and Site bytes."
            ),
            "status": "implemented-local; first scheduled receipt pending",
            "evidence": [
                "scripts/build_heritage_evaluation.py",
                "scripts/observe_link_intents.py",
                ".github/workflows/link-observation.yml",
            ],
        },
        {
            "id": "ADR-005",
            "question": "Which publication unit should own future exemplars?",
            "decision": (
                "The dedicated chris-page-gov/okf-heritage-coventry-warwickshire unit owns the "
                "heritage corpus, tiny fixture, synthetic supplement, data readers and releases. "
                "OKF Explorer continues to own the runtime, shared schemas, registry and docs shell."
            ),
            "status": "implemented-local; external repository and public activation pending",
            "evidence": [
                "publication-units/heritage-coventry-warwickshire/publication-unit.json",
                "scripts/export_publication_unit.py",
                "release-assurance/heritage-postmortem-publication-evidence.json",
            ],
        },
        {
            "id": "ADR-006",
            "question": "What release-integrity policy should apply?",
            "decision": (
                "Use an annotated tag bound to the exact source commit, a GitHub artifact "
                "attestation for the external promotion envelope and archive, platform immutable "
                "releases, draft-first asset attachment, and a deterministic release archive "
                "retained as a release asset."
            ),
            "status": "policy implemented; terminal external release pending",
            "evidence": [
                "release-assurance/release-policy.json",
                "scripts/check_release_policy.py",
                "publication-units/heritage-coventry-warwickshire/repository-template/promotion-release.yml",
                "release-assurance/heritage-postmortem-publication-evidence.json",
            ],
        },
    ]
    by_id = {item["id"]: item for item in items}
    if current_evidence_verified(publication_evidence, "PUBEV-001"):
        by_id["ADR-002"]["status"] = "implemented; PR #70 workflow evidence verified"
    if current_evidence_verified(publication_evidence, "PUBEV-005"):
        by_id["ADR-004"]["status"] = "implemented; terminal link closure verified"
    if current_evidence_verified(publication_evidence, "PUBEV-002", "PUBEV-003"):
        by_id["ADR-005"]["status"] = (
            "implemented; external repository and Pages identity verified; promotion pending"
        )
    if current_evidence_verified(publication_evidence, "PUBEV-006"):
        by_id["ADR-001"]["status"] = "implemented; terminal envelope verified"
    if current_evidence_verified(
        publication_evidence, "PUBEV-004", "PUBEV-005", "PUBEV-006"
    ):
        by_id["ADR-005"]["status"] = "implemented; external publication promoted"
        by_id["ADR-006"]["status"] = "policy implemented; terminal releases verified"
    return items


def render_postmortem(
    metrics: dict[str, Any],
    command_events: list[dict[str, Any]],
    runs: list[dict[str, Any]],
    cycles: list[dict[str, Any]],
    publication_evidence: dict[str, Any],
) -> tuple[Path, str]:
    path = PUBLIC_ROOT / "postmortem.md"
    ci_runs = [item for item in runs if item["phase"] == "pull-request-ci"]
    run_rows = []
    for run in runs:
        tests = run.get("test_counts") or {}
        test_text = (
            f"{tests.get('python')} Python; {tests.get('vitest')} Vitest; "
            f"{tests.get('node')} Node; {tests.get('explorer_browser')} Explorer; "
            f"{tests.get('foundry_browser')} Foundry"
            if tests
            else "Site build, archive and deploy"
        )
        run_rows.append(
            (
                f"#{run['pr_number']}",
                run["workflow"],
                f"[{run['run_id']}]({run['url']})",
                format_duration(run["duration_seconds"]),
                test_text,
            )
        )
    command_counts = local_command_counts(command_events)
    command_rows = [
        (category, count)
        for category, count in sorted(command_counts.items(), key=lambda item: (-item[1], item[0]))
    ]
    acceptance_rows = []
    for item in implementation_acceptance_register(publication_evidence):
        artifacts = "<br>".join(
            f"[`{artifact}`](../../../{artifact})" for artifact in item["artifacts"]
        )
        tests = "<br>".join(
            f"[`{test}`](../../../{test})" for test in item["acceptance_tests"]
        )
        acceptance_rows.append(
            (
                item["id"],
                item["priority"],
                item["change"],
                item["status"],
                artifacts,
                tests,
                item["remaining_gate"],
            )
        )
    decision_rows = []
    for item in architecture_decisions(publication_evidence):
        evidence_links = "<br>".join(
            f"[`{artifact}`](../../../{artifact})" for artifact in item["evidence"]
        )
        decision_rows.append(
            (
                item["id"],
                item["question"],
                item["decision"],
                item["status"],
                evidence_links,
            )
        )
    release_attempts = load_release_attempt_register()["attempts"]
    release_attempt_rows = [
        (
            item["id"],
            item["stage"],
            f"[{item['run_id']}]({item['run_url']})",
            item["conclusion"],
            item["failure_step"] or "all declared gates",
            item["correction"],
            "no / no",
        )
        for item in release_attempts
    ]
    rollout_state = (
        "Public closure is now complete: the independently rooted Pages deployment, "
        "immutable R1, final terminal observations, attested promotion envelope and "
        "immutable R2 all bind candidate commit "
        "`51881ccc0ce1b77346b9cd8d4462c320bf203114`."
        if publication_evidence["status"] == "verified"
        else (
            "This remains local implementation acceptance rather than a public promotion "
            "claim; exact Pages, terminal, attestation and immutable-release evidence is "
            "still required."
        )
    )
    explorer_browser_seconds = sum(
        find_step_seconds(runs, item["run_id"], "Run Chrome, Firefox and WebKit browser tests")
        for item in ci_runs
    )
    browser_setup_seconds = sum(
        find_step_seconds(runs, item["run_id"], "Install Firefox and WebKit browser dependencies")
        for item in ci_runs
    )
    final_ci_job_seconds = next(
        job["duration_seconds"]
        for run in runs
        if run["run_id"] == 30818372899
        for job in run["jobs"]
        if job["name"] == "okf-explorer-ci"
    )
    final_browser_seconds = (
        find_step_seconds(runs, 30818372899, "Install Firefox and WebKit browser dependencies")
        + find_step_seconds(runs, 30818372899, "Run Chrome, Firefox and WebKit browser tests")
    )
    text = frontmatter(
        "TechArticle",
        "Heritage Evaluation Foundry engineering postmortem",
        "End-to-end evidence, late-finding analysis and implemented selective-rerun controls.",
        "postmortem",
        ["postmortem", "evaluation-foundry", "engineering", "process-improvement"],
    ) + dedent_markdown(
        f"""\
        # Heritage Evaluation Foundry Engineering Postmortem

        ## Technical Summary

        The heritage exemplar achieved its functional and publication objective, but the
        process was inefficient in exactly the way the user observed: late findings caused
        broad regeneration and complete green test cycles. The original six PR/Pages runs
        all succeeded on attempt 1; the later cycle-free R1/terminal/R2 closure then failed
        closed four times while exposing contracts that had not been exercised early enough.
        Crucially, those four corrections did **not** rebuild the candidate or Site.

        The principal root cause is not simply that the corpus is large. The parent Foundry
        already documents a producer→plane→consumer dependency graph and selective
        invalidation. The Evaluation Foundry derivative retained plane hashes but omitted
        that executable graph from its profile schema. Hashes could prove that bytes
        changed; nothing could turn that information into a minimal work plan.

        The clearest measured example is PR #69. It changed 30 files, no application source
        or application tests, and only one app-static registry projection. Data, Search,
        Semantic and Control roots stayed unchanged across faithful, tiny and synthetic
        products; only Presentation roots and publication envelopes changed. Nevertheless,
        CI reran all 153 Explorer cross-browser tests and all 63 Foundry browser tests, and
        the local process reran all 100 questions plus three journeys. The stable question
        projection hash was
        `69ed22171699643ba8c9ce56dff0a8545011faf117b7d01c8c8036f12c732b1e` before
        and after; the stable journey projection hash was
        `d14e77085b01ca688d185c84f6ccc2371f687cc272f0362d9a674be36d5b0e08`.

        That response is now implemented in the repository candidate: Evaluation Profile
        v2 shares the parent Foundry dependency contract; a deterministic impact planner
        selects separately owned plane emitters and assurance jobs; writes and Site
        components are content-addressed; and mutable evidence is outside the candidate
        hash closure. {rollout_state}

        ## Key Findings With Evidence

        ### 1. The derivative process dropped the control needed for selective reruns

        The [Foundry beginner process](../../beginners/19-foundry-authoring-and-domain-profiles.md)
        requires a consumer lock, producer/consumer dependency graph, invalidation rules
        and transitive reruns. The
        [authoring schema](../../../profiles/authoring/v1/domain-profile.schema.json)
        models them. The
        [Evaluation Profile v1 schema](../../../evaluation-foundry/schemas/okf-evaluation-profile.v1.schema.json)
        reduces `consumer_contract` to four descriptive fields and the exemplar profile
        therefore cannot answer: “which roots can I reuse, and which tests are required?”

        In plain language: the build wrote labels on five boxes, but did not retain the
        arrows between the boxes. When one label changed, the safest available choice was
        to reopen every box.

        ### 2. Generation and Site assembly are monolithic

        `build_corpus()` computes all output planes, while the inherited writer deletes
        and rewrites the complete output tree. `build_site.py` deletes `_site/`, recopies
        every public tree, then scans and hashes the assembled closure. The final corpus
        family contains 3,787 files and 173,587,798 bytes; a two-build determinism cycle
        writes roughly 347 MB before Site assembly.

        PR #68 illustrates generated fan-out: 382 changed files, 354 generated heritage
        artifacts (92.67%) and 273 generated binary files. The final semantic graph is
        repeated across JSON-LD, YAML-LD and assertion copies—94,853,568 bytes, 54.86% of
        the faithful corpus. `data/link-validation.json` is a separate 19,490,810-byte
        monolith. Those shapes make a small semantic or link change expensive.

        {markdown_table(
            [
                (f"[#{item['pr_number']}]({item['url']})", item['label'], f"{item['files_changed']:,}", f"+{item['insertions']:,} / −{item['deletions']:,}", item['interpretation'])
                for item in cycles
            ],
            ('PR', 'Phase', 'Files touched', 'Line change', 'Interpretation'),
        )}

        ### 3. Evidence changes the candidate it is meant to observe

        Question and journey receipts carry fresh timestamps and browser observations but
        are copied into the Site whose root they help assure. Refreshing evidence therefore
        changes the Site root even when logical outcomes do not. Protected-link evidence is
        also placed in the corpus Control plane. This creates an observation→candidate loop
        and explains why a release asset was introduced late to escape self-reference.

        Stable outcome fingerprints should live next to timestamped observations. The
        candidate should be immutable; an independent promotion/evidence envelope should
        reference its roots and attach freshness evidence without rewriting it.

        ### 4. CI is path-insensitive and serial

        Across three CI runs, workflow wall time was
        {format_duration(metrics['ci_workflow_wall_seconds'])}. The Explorer cross-browser
        step consumed about {format_duration(explorer_browser_seconds)} and browser setup
        another {format_duration(browser_setup_seconds)}. Those operations dominated work
        even when no app source changed.

        In PR #69, browser setup plus the 153-test Explorer matrix consumed
        {final_browser_seconds} of {final_ci_job_seconds} CI-job seconds
        ({100 * final_browser_seconds / final_ci_job_seconds:.1f}%). A dependency plan could
        have selected registry, Site, source-selection and terminal-publication checks,
        while retaining a periodic/full promotion audit as a backstop.

        {markdown_table(run_rows, ('PR', 'Workflow', 'Run', 'Wall time', 'Recorded work'))}

        All six runs were green, attempt 1. “Repeated full green validation” is the correct
        diagnosis; “CI failure churn” is not.

        ### 5. The Site is a capacity and coupling boundary

        The historical central Site at PR #69 has {metrics['final_site_files']:,} files and
        {metrics['final_site_bytes']:,} bytes, leaving only
        {metrics['pages_limit_remaining_bytes']:,} bytes ({100 * metrics['pages_limit_remaining_bytes'] / 1_000_000_000:.3f}%)
        below the configured one-billion-byte Pages limit. Every candidate rebuild scans,
        hashes, archives and uploads that closure. Another large exemplar should not be
        added to the same publication unit without separating independently rooted data
        packs from the Explorer/docs shell.

        ### 5a. Publishing this postmortem reproduced the coupling—and proved a bounded rerun

        On its first publication build, the postmortem passed its own generated-file and
        redaction lint, and all {metrics['postmortem_site_reading_pages']:,} rendered
        documentation pages with {metrics['postmortem_site_internal_references']:,}
        internal references resolved. The Site gate then stopped because the historical
        heritage receipt correctly described the earlier global Site tree rather than the
        new documentation closure. No heritage or application byte had changed.

        The correction used an explicit `documentation-only` shell rebind instead of a
        heritage rebuild. It reused the unchanged faithful, tiny, synthetic and Explorer
        roots; reran postmortem lint, bundle/viewer synchronization, OKF conformance,
        documentation links, Site inventory, capacity and tree identity; and did not
        rerun the 100-question suite or either browser matrix. That intermediate local Site
        contained {metrics['postmortem_site_files']:,} files and retained the unchanged
        Explorer root
        `{metrics['postmortem_explorer_tree_sha256']}`. The command trace recorded the
        explicit rerun and reuse sets at the time. Later full-candidate work superseded the
        tracked [local-candidate receipt](../../../evaluation-foundry/fixtures/heritage-warwickshire/evidence/local-candidate-receipt.json),
        so this report does not mislabel that current receipt as the historical rebind.
        Self-describing Site closure values remain outside the closure they identify.

        This documentation-only rebind preceded the general impact planner and its change
        class was reviewed manually. The now-implemented planner generalizes the same proof:
        unchanged roots plus an affected gate set can avoid a full corpus/evaluation/browser
        cycle without weakening the Site publication gate.

        ### 6. Late checks were valuable, but many belonged earlier

        The audits found substantive defects: same-year HAR continuity, a `dataset/` route
        assumption, YAML-LD quoting, missing presentation journeys, evaluator-output Site
        contamination, incorrect CRS provenance, 25 Warwick Bridge false positives,
        project-root routing, stable-descriptor/changed-closure ambiguity, registry drift
        and release basename collisions. Catching them before the terminal release was a
        success. Discovering them after full-corpus generation was the cost.

        Move adversarial microfixtures and schema/profile checks before the full build:

        - authority-field matching must reject locality-only “Warwick” substrings;
        - annual continuity must never link events inside one year;
        - source CRS and delivered CRS labels must agree;
        - arbitrary record routes must load without a `dataset/` prefix;
        - Pages-root, slashless-root and 404 assets must use the project base;
        - ephemeral results must be excluded from discovery;
        - YAML-LD keywords, registry projections and declared auxiliary bundles must be
          synchronized;
        - promotion action counts must be derived from receipts.

        ### 7. Plane ownership is too coarse and sometimes incorrect

        The classifier checks generic `data/` paths before semantic suffixes, so
        `data/semantic/*` is assigned to Data. Questions and protected-browser evidence are
        assigned to Control. The target graph needs explicit Data, Resource, Relationship,
        Search, Semantic, Presentation, Evaluation-Control, Evidence, App, Site-Reading,
        Site-Data and Promotion ownership rather than path-order heuristics.

        ### 8. The final closure proves that late errors can be corrected without rebuilding data

        The independently rooted candidate was fixed at commit
        `51881ccc0ce1b77346b9cd8d4462c320bf203114` before R1. Nine subsequent workflow
        attempts exercised candidate release, complete-link observation, genuine Chrome,
        three browser engines, envelope validation, attestation and immutable promotion.
        Four attempts failed closed; each correction was confined to assurance or release
        controls, and every row below records `no / no` for candidate and Site rebuild.

        {markdown_table(
            release_attempt_rows,
            ('Attempt', 'Stage', 'Run', 'Result', 'Failed/passed boundary', 'Bounded correction or outcome', 'Candidate / Site rebuilt'),
        )}

        The failures reveal where the refactored process should move checks earlier:

        - execute network retry/304 microfixtures before a 13,548-URL observation;
        - exercise Chrome signal-exit and profile-cleanup paths without a public run;
        - validate terminal artifacts with the exact downstream promotion loader before
          uploading them;
        - share the large-receipt loader between semantic and release-policy phases;
        - retain failed artifacts with `if: always()` so cleanup errors cannot erase the
          primary diagnostic.

        The final terminal artifact covers all 13,548 canonical URLs. Two transient ArcGIS
        calls succeeded on the single bounded retry; 6,685 protected-origin responses were
        accepted only under the exact identifier-binding policy; all 11 delegated pages
        passed in genuine Google Chrome; and Chromium, Firefox and WebKit each passed 32
        actions plus two assertions. R2 then bound all ten release assets in a GitHub
        Releases attestation and became platform-immutable.

        One human-readable ambiguity remains visible by design: the annotated promotion
        tag message names earlier successful terminal run `30907144661`, while the R2
        assets contain the receipt hashes produced by final run `30908844005`. The
        normalized publication register and retained R2 Actions artifact make that
        cross-walk explicit. Moving the published tag would weaken provenance, so the
        report records the discrepancy and treats the attested envelope plus exact
        evidence cross-walk, not tag prose, as authoritative status.

        The immutable R2 envelope does not itself carry the terminal run ID or terminal
        artifact digest. Those facts are retained in the central evidence register and in
        R2 Actions artifact `8892339639`, whose platform retention expires on 2 November
        2026. This satisfies the declared release policy, but a future envelope schema
        should include both fields so long-term provenance is self-contained after the
        workflow artifact expires.

        ### 8a. The final central audit caught two more shell defects before merge

        Exact-head PR run
        [30911393031](https://github.com/chris-page-gov/okf-explorer/actions/runs/30911393031)
        passed the impact, adversarial, Foundry, documentation, app, release-policy, Site
        and Python-contract jobs, then failed closed in one Firefox documentation test.
        The server returned HTTP 200 twice, but a zero-delay cross-origin meta refresh let
        Firefox replace the initial navigation before `page.goto()` could return its
        response. Chrome and WebKit passed. The correction now verifies the exact direct
        HTTP response separately and renders that same HTML without its navigation
        directive for deterministic three-engine body assertions.

        A concurrent least-privilege audit found that the central Pages workflow granted
        `pages: write` and `id-token: write` to every job. The corrected topology gives
        ordinary jobs only `contents: read`, gives the Site builder `pages: read`, and
        confines both write permissions to deployment. A machine test now rejects future
        permission widening. Neither correction touches the external candidate or its
        deployed Site; only a new exact-head central CI run is required.

        ## Local Build And Test Activity

        The curated task log yields the following recognized local invocation counts. A
        count is one executable command occurrence. When several commands shared an outer
        orchestrator call, their individual wall times cannot be separated and are not
        summed.

        {markdown_table(command_rows, ('Command category', 'Recognized invocations'))}

        Raw command and tool output remains in the private evidence plane; the
        [command-event register](data/command-event-register.json) contains sanitized
        commands, timestamps and hashed call identities.

        ## Scope, Data And Metric Definitions

        The scope is the single Codex task, repository history from `f5d38674` through
        PR #70's assured implementation head, PRs #67–#69, their three CI and three Pages
        runs, PR #70 CI, the independent Pages deployment, all nine R1/terminal/R2
        attempts, both immutable releases and their retained receipts. Definitions for
        workflow time, file touches, amplification, late findings, dependency cones and
        outcome projections are in [Methodology](methodology.md).

        The postmortem does not claim that every repeated check was worthless. Full
        promotion audits catch planner mistakes. It distinguishes **required assurance**
        from **work that could safely reuse content-addressed results after an explainable
        impact plan**.

        ## Implementation And Acceptance Register

        Every item from the earlier **Recommended Next Steps** list now has a concrete
        repository implementation and an executable acceptance contract. Status is derived
        from exact normalized PR, Pages, R1, terminal and R2 evidence; ongoing nightly or
        freshness checks remain regression controls rather than unclosed implementation.
        The same register is available as
        [machine-readable JSON](data/implementation-acceptance-register.json).

        {markdown_table(
            acceptance_rows,
            ('ID', 'Priority', 'Implemented change', 'State', 'Artifacts', 'Acceptance tests', 'Remaining terminal gate'),
        )}

        The [architecture page](architecture.md) describes the implemented graph and
        assurance tiers. Historical #68/#69 root comparisons and mutation tests remain
        shadow evidence: reuse stays fail-closed when a path or old/new root cannot be
        classified, while nightly and terminal full audits protect against planner error.

        ## Limitations, Uncertainty And Robustness

        - Results describe one large exemplar; expected savings need validation on more
          change classes.
        - GitHub timestamps are exact to their reported resolution; local nested-command
          durations are not available individually.
        - The additive 43m 41s historical PR/Pages workflow total is not end-user elapsed
          latency if runs or jobs overlap; the nine release-closure runs are reported
          separately because their failures are part of the analysis rather than the
          original repeated-green baseline.
        - The stable question/journey projections prove identical recorded outcomes for
          PR #68 versus #69; they do not prove every invisible browser state was identical.
        - Selective reruns introduce under-invalidation risk. A periodic full audit,
          promotion full matrix and shadow comparison are mandatory safeguards.
        - The public prompt trace is complete for visible messages only and intentionally
          excludes hidden reasoning and tool payloads.
        - The promotion tag is annotated but unsigned. Policy requires an annotated tag
          plus an attested promotion envelope; it does not claim a signed Git tag.
        - The immutable R2 envelope binds the terminal receipt hashes but does not embed
          the terminal run ID or artifact digest. The public evidence register preserves
          that cross-walk; a future envelope revision should make it self-contained.

        ## Resolved Architecture And Release Questions

        The five earlier **Further Questions** are decisions now, with release integrity
        made explicit as a sixth. Local policy/code acceptance and public terminal
        promotion are deliberately separate states. The records are also published as
        [machine-readable JSON](data/architecture-decisions.json).

        {markdown_table(
            decision_rows,
            ('Decision', 'Question', 'Resolution', 'State', 'Implementation evidence'),
        )}
        """
    )
    return path, text


def publication_decisions() -> list[dict[str, str]]:
    return [
        {
            "id": "PUB-001",
            "decision": "Keep raw Codex, GitHub and deployment evidence out of Git.",
            "status": "applied",
            "rationale": "Raw logs contain local paths and high-volume operational detail; public hashes preserve auditability.",
        },
        {
            "id": "PUB-002",
            "decision": "Publish all visible user prompts and assistant commentary/final responses.",
            "status": "applied",
            "rationale": "This is the requested contribution and process trace; hidden reasoning and tool payloads are not conversation output.",
        },
        {
            "id": "PUB-003",
            "decision": "Retain public GitHub PR, run, release and source URLs.",
            "status": "applied",
            "rationale": "They are the strongest independently inspectable timeline evidence.",
        },
        {
            "id": "PUB-004",
            "decision": "Correct the release description from immutable to digest-bound/frozen-by-policy.",
            "status": "applied",
            "rationale": "GitHub reports isImmutable=false and the tag is lightweight.",
        },
        {
            "id": "PUB-005",
            "decision": "Preserve exact deployment archives privately and publish two hashes for each.",
            "status": "applied",
            "rationale": "The one-day GitHub retention expired shortly after collection; gzip is lossless and the payload hash proves recovery.",
        },
        {
            "id": "PUB-006",
            "decision": "Use repository Markdown/YAML-LD as the canonical postmortem source.",
            "status": "applied",
            "rationale": "It follows repository source-of-truth rules and is rendered by the existing Site pipeline.",
        },
        {
            "id": "PUB-007",
            "decision": "Distinguish local implementation acceptance from public promotion.",
            "status": "applied",
            "rationale": "Unverified external URLs, observations, attestations and release metrics must not be inferred from local success.",
        },
        {
            "id": "PUB-008",
            "decision": "Record the five architecture resolutions and release policy as machine-readable decisions.",
            "status": "applied",
            "rationale": "The earlier open questions now control executable profile, CI, publication and release behavior.",
        },
        {
            "id": "PUB-009",
            "decision": "Derive current rollout status only from normalized exact public evidence.",
            "status": "applied",
            "rationale": (
                "PR #70, external Pages, R1, terminal and R2 remain pending until each "
                "record contains all required identities, claims, timestamps and URLs."
            ),
        },
    ]


def append_current_final(exchanges: list[Exchange], final_path: Path | None) -> None:
    if not final_path or not final_path.exists() or not exchanges:
        return
    final_exchange = exchanges[-1]
    if any(message.phase == "final_answer" for message in final_exchange.responses):
        return
    final_exchange.responses.append(
        Message(
            role="assistant",
            timestamp=CAPTURED_AT,
            text=sanitize_public_text(final_path.read_text(encoding="utf-8").strip()),
            phase="final_answer",
        )
    )


def write_public_package(
    exchanges: list[Exchange],
    command_events: list[dict[str, Any]],
    metadata: dict[str, Any],
    runs: list[dict[str, Any]],
    cycles: list[dict[str, Any]],
    evidence: list[dict[str, Any]],
    publication_evidence: dict[str, Any],
) -> list[Path]:
    metrics = report_metrics(exchanges, command_events, runs, cycles, evidence)
    release_attempts = load_release_attempt_register()
    expected: list[Path] = []

    session_record = {
        "source_id": "CONV-001",
        "title": metadata["title"],
        "start_timestamp": metadata["start_timestamp"],
        "private_evidence_sha256": metadata["source_sha256"],
        "private_evidence_bytes": metadata["source_bytes"],
        "user_message_count": len(exchanges),
        "assistant_message_count": sum(len(item.responses) for item in exchanges),
        "public_source_path": "../sources/conv-001-heritage-evaluation-foundry.md",
        "public_reader_path": "../readers/conv-001-heritage-evaluation-foundry.md",
    }
    exchange_records = []
    for exchange in exchanges:
        user, codex = contribution_summary(exchange)
        exchange_records.append(
            {
                "exchange_id": exchange.exchange_id,
                "global_sequence": exchange.sequence,
                "session_source_id": "CONV-001",
                "title": exchange.title,
                "user_timestamp": exchange.user.timestamp,
                "assistant_message_count": len(exchange.responses),
                "public_path": f"../exchanges/{exchange_filename(exchange)}",
                "user_contribution": user,
                "codex_contribution": codex,
            }
        )

    data_values = {
        "session-register.json": [session_record],
        "exchange-register.json": exchange_records,
        "command-event-register.json": command_events,
        "github-run-register.json": runs,
        "publication-attempt-register.json": release_attempts,
        "rebuild-cycle-register.json": cycles,
        "evidence-register.json": evidence,
        "current-publication-evidence.json": publication_evidence,
        "report-metrics.json": metrics,
        "implementation-acceptance-register.json": implementation_acceptance_register(
            publication_evidence
        ),
        "architecture-decisions.json": architecture_decisions(publication_evidence),
        "publication-decisions.json": publication_decisions(),
    }
    for filename, value in data_values.items():
        output = DATA_ROOT / filename
        write_json_if_changed(output, value)
        expected.append(output)

    pages = [
        render_index(metrics, exchanges),
        render_postmortem(metrics, command_events, runs, cycles, publication_evidence),
        render_timeline(cycles, runs),
        render_architecture(publication_evidence),
        render_evidence(evidence, runs, publication_evidence),
        render_methodology(metadata, metrics),
        render_conversation_summary(exchanges),
        render_reader(exchanges),
        render_conversation_source(metadata, exchanges),
    ]
    pages.extend(render_exchange(exchange, exchanges) for exchange in exchanges)
    for output, text in pages:
        write_if_changed(output, text)
        expected.append(output)

    manifest = {
        "schema": "okf-heritage-foundry-postmortem-generated-files.v1",
        "captured_at": CAPTURED_AT,
        "files": sorted(
            path.relative_to(PUBLIC_ROOT).as_posix()
            for path in [*expected, DATA_ROOT / "generated-file-manifest.json", DATA_ROOT / "publication-lint-report.json"]
        ),
    }
    manifest_path = DATA_ROOT / "generated-file-manifest.json"
    write_json_if_changed(manifest_path, manifest)
    expected.append(manifest_path)
    return expected


def strip_fenced_blocks(text: str) -> str:
    return FENCED_BLOCK.sub("\n", text)


def validate_public_package(expected: list[Path] | None = None) -> dict[str, Any]:
    broken_links: list[str] = []
    forbidden_hits: list[str] = []
    json_errors: list[str] = []
    unexpected_generated_files: list[str] = []

    if not PUBLIC_ROOT.exists():
        return {
            "captured_at": CAPTURED_AT,
            "broken_internal_links": ["public postmortem root is missing"],
            "forbidden_publication_hits": [],
            "json_errors": [],
            "unexpected_generated_files": [],
        }

    for markdown_path in sorted(PUBLIC_ROOT.rglob("*.md")):
        text = markdown_path.read_text(encoding="utf-8")
        scan_text = strip_fenced_blocks(text)
        for raw in MARKDOWN_LINK.findall(scan_text):
            parsed = urlsplit(raw)
            if parsed.scheme or parsed.netloc or raw.startswith(("#", "mailto:")):
                continue
            target = unquote(parsed.path)
            if not target:
                continue
            resolved = (markdown_path.parent / target).resolve()
            try:
                resolved.relative_to(ROOT.resolve())
            except ValueError:
                broken_links.append(f"{markdown_path.relative_to(ROOT)} -> {raw} (outside repository)")
                continue
            if not resolved.exists():
                broken_links.append(f"{markdown_path.relative_to(ROOT)} -> {raw}")

    for public_path in sorted(PUBLIC_ROOT.rglob("*")):
        if not public_path.is_file():
            continue
        if public_path.suffix == ".json":
            try:
                json.loads(public_path.read_text(encoding="utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError) as exc:
                json_errors.append(f"{public_path.relative_to(ROOT)}: {exc}")
        if public_path.suffix not in {".md", ".json"}:
            continue
        text = public_path.read_text(encoding="utf-8", errors="replace")
        for label, pattern in FORBIDDEN_PUBLIC_PATTERNS.items():
            if pattern.search(text):
                forbidden_hits.append(f"{public_path.relative_to(ROOT)}: {label}")

    current_register_path = DATA_ROOT / "current-publication-evidence.json"
    try:
        expected_current = load_current_publication_evidence()
        observed_current = load_json(current_register_path)
        if observed_current != expected_current:
            json_errors.append(
                "data/current-publication-evidence.json differs from its normalized input"
            )
    except (OSError, ValueError, json.JSONDecodeError) as error:
        json_errors.append(f"current publication evidence is invalid: {error}")

    manifest_path = DATA_ROOT / "generated-file-manifest.json"
    if manifest_path.exists():
        manifest = load_json(manifest_path)
        declared = set(manifest.get("files", []))
        actual = {
            path.relative_to(PUBLIC_ROOT).as_posix()
            for path in PUBLIC_ROOT.rglob("*")
            if path.is_file()
        }
        unexpected_generated_files = sorted(actual - declared)
        missing = sorted(declared - actual)
        broken_links.extend(f"generated manifest missing {item}" for item in missing)
    elif expected:
        broken_links.append("generated-file-manifest.json is missing")

    return {
        "captured_at": CAPTURED_AT,
        "broken_internal_links": sorted(set(broken_links)),
        "forbidden_publication_hits": sorted(set(forbidden_hits)),
        "json_errors": sorted(set(json_errors)),
        "unexpected_generated_files": unexpected_generated_files,
    }


def report_validation(validation: dict[str, Any]) -> None:
    issue_count = sum(
        len(validation[key])
        for key in (
            "broken_internal_links",
            "forbidden_publication_hits",
            "json_errors",
            "unexpected_generated_files",
        )
    )
    if issue_count:
        for key, values in validation.items():
            if key == "captured_at" or not values:
                continue
            for value in values:
                print(f"{key}: {value}")
        raise SystemExit(f"Postmortem validation failed with {issue_count} issue(s).")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "phase",
        nargs="?",
        choices=("collect", "render", "check", "all"),
        default="all",
    )
    parser.add_argument("--session-path", type=Path)
    parser.add_argument(
        "--current-final-response",
        type=Path,
        help="Append a predeclared final response while the current turn is active.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.phase == "check":
        validation = validate_public_package()
        report_validation(validation)
        stored_path = DATA_ROOT / "publication-lint-report.json"
        if not stored_path.exists() or load_json(stored_path) != validation:
            raise SystemExit(
                "Postmortem lint report is stale; run the builder in render/all mode."
            )
        print("Heritage Foundry postmortem validation passed.")
        return 0

    session_path = (args.session_path or find_session_path()).resolve()
    exchanges, command_events, metadata = collect_session(session_path)
    append_current_final(exchanges, args.current_final_response)
    runs = normalize_github_runs()
    cycles = build_rebuild_cycles()
    publication_evidence = load_current_publication_evidence()
    evidence = private_evidence_register()
    evidence.extend(public_current_evidence_records(publication_evidence, len(evidence)))

    if args.phase == "collect":
        print(
            f"Collected {len(exchanges)} exchanges, {len(command_events)} relevant "
            f"command events and {len(runs)} GitHub runs."
        )
        return 0

    expected = write_public_package(
        exchanges,
        command_events,
        metadata,
        runs,
        cycles,
        evidence,
        publication_evidence,
    )
    # The generated-file manifest deliberately declares its own lint result.  Seed
    # that file before validating so a clean first build has the same closure as
    # every subsequent content-addressed rebuild.
    write_json_if_changed(
        DATA_ROOT / "publication-lint-report.json",
        {
            "captured_at": CAPTURED_AT,
            "broken_internal_links": [],
            "forbidden_publication_hits": [],
            "json_errors": [],
            "unexpected_generated_files": [],
        },
    )
    validation = validate_public_package(expected)
    write_json_if_changed(DATA_ROOT / "publication-lint-report.json", validation)
    report_validation(validation)
    print(
        f"Built and validated {len(expected) + 1} public postmortem files with "
        f"{len(exchanges)} exchanges."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
