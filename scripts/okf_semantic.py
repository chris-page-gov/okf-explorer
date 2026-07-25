#!/usr/bin/env python3
"""YAML-LD and Markdown-frontmatter support for OKF bundle wikis."""

from __future__ import annotations

import json
import math
import re
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any, Callable

from jsonschema import Draft202012Validator, FormatChecker
from pyld import jsonld
from ruamel.yaml import YAML

ROOT = Path(__file__).resolve().parents[1]
PROFILE_ROOT = ROOT / "profiles" / "bundle-wiki" / "v1"
CONTEXT_PATH = PROFILE_ROOT / "context.jsonld"
CONTEXT_URL = "https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/context.jsonld"
PROFILE_URL = "https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/"


class SemanticError(ValueError):
    """Raised when structured OKF metadata is not safe or conformant."""


@dataclass(frozen=True)
class MarkdownDocument:
    metadata: dict[str, Any]
    body: str


def yaml_parser() -> YAML:
    """Return a safe YAML 1.2 parser that retains timestamps as strings."""
    parser = YAML(typ="safe", pure=True)
    parser.version = (1, 2)
    parser.allow_duplicate_keys = False
    parser.constructor.add_constructor(
        "tag:yaml.org,2002:timestamp",
        lambda constructor, node: constructor.construct_scalar(node),
    )
    return parser


def _validate_representation(value: Any, *, path: str = "$", active: set[int] | None = None) -> None:
    active = active or set()
    if isinstance(value, float) and not math.isfinite(value):
        raise SemanticError(f"{path}: non-finite numbers are not valid YAML-LD")
    if isinstance(value, dict):
        identity = id(value)
        if identity in active:
            raise SemanticError(f"{path}: YAML-LD representation graph contains a cycle")
        active.add(identity)
        for key, item in value.items():
            if not isinstance(key, str):
                raise SemanticError(f"{path}: YAML-LD mapping keys must be strings")
            _validate_representation(item, path=f"{path}.{key}", active=active)
        active.remove(identity)
    elif isinstance(value, list):
        identity = id(value)
        if identity in active:
            raise SemanticError(f"{path}: YAML-LD representation graph contains a cycle")
        active.add(identity)
        for index, item in enumerate(value):
            _validate_representation(item, path=f"{path}[{index}]", active=active)
        active.remove(identity)


def load_yaml_ld_text(text: str, *, source: str = "<string>", allow_stream: bool = False) -> dict[str, Any] | list[Any]:
    try:
        documents = list(yaml_parser().load_all(text))
    except Exception as exc:  # ruamel exposes several parser-specific error classes.
        raise SemanticError(f"{source}: invalid YAML-LD: {exc}") from exc
    documents = [document for document in documents if document is not None]
    if not documents:
        raise SemanticError(f"{source}: YAML-LD document is empty")
    if len(documents) > 1 and not allow_stream:
        raise SemanticError(f"{source}: OKF frontmatter and descriptors must contain one YAML-LD document")
    for index, document in enumerate(documents):
        if not isinstance(document, dict):
            raise SemanticError(f"{source}: document {index + 1} must be a mapping")
        _validate_representation(document)
    return documents if allow_stream else documents[0]


def load_yaml_ld(path: Path, *, allow_stream: bool = False) -> dict[str, Any] | list[Any]:
    try:
        text = path.read_bytes().decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        raise SemanticError(f"{path}: YAML-LD must be UTF-8") from exc
    return load_yaml_ld_text(text, source=path.as_posix(), allow_stream=allow_stream)


def parse_markdown(path: Path) -> MarkdownDocument:
    try:
        text = path.read_bytes().decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        raise SemanticError(f"{path}: Markdown must be UTF-8") from exc
    if not text.startswith("---\n"):
        raise SemanticError(f"{path}: missing YAML frontmatter")
    end = text.find("\n---", 4)
    if end == -1:
        raise SemanticError(f"{path}: unterminated YAML frontmatter")
    raw = text[4:end]
    body = text[end + 4 :].lstrip("\n").strip("\n")
    metadata = load_yaml_ld_text(raw, source=f"{path.as_posix()} frontmatter")
    assert isinstance(metadata, dict)
    return MarkdownDocument(metadata=metadata, body=body)


def parse_optional_frontmatter(path: Path) -> MarkdownDocument:
    """Parse a reserved OKF Markdown file, whose frontmatter is optional."""
    try:
        text = path.read_bytes().decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        raise SemanticError(f"{path}: Markdown must be UTF-8") from exc
    if not text.startswith("---\n"):
        return MarkdownDocument(metadata={}, body=text.strip("\n"))
    return parse_markdown(path)


def normalize_verified(metadata: dict[str, Any]) -> list[dict[str, Any]]:
    """Normalize the OKF v0.2 single-mapping shorthand to a list."""
    verified = metadata.get("verified")
    if isinstance(verified, dict):
        return [verified]
    if isinstance(verified, list):
        return [event for event in verified if isinstance(event, dict)]
    return []


def trust_tier(metadata: dict[str, Any]) -> str:
    """Derive the normative OKF v0.2 trust tier."""
    events = [
        event
        for event in normalize_verified(metadata)
        if _valid_actor(event.get("by")) and _valid_datetime(event.get("at"))
    ]
    if not events:
        return "unverified"
    return "human-reviewed" if any(str(event.get("by") or "").startswith("human:") for event in events) else "machine-confirmed"


def is_stale(metadata: dict[str, Any], *, today: date | None = None) -> bool:
    """Return whether today is on or after a valid `stale_after` date."""
    raw = metadata.get("stale_after")
    if not raw:
        return False
    try:
        if isinstance(raw, datetime):
            stale_after = raw.date()
        elif isinstance(raw, date):
            stale_after = raw
        else:
            stale_after = date.fromisoformat(str(raw)[:10])
    except ValueError:
        return False
    return (today or date.today()) >= stale_after


def generated_at(metadata: dict[str, Any]) -> str:
    """Read v0.2 `generated.at`, falling back to the v0.1 `timestamp`."""
    if "generated" in metadata:
        generated = metadata.get("generated")
        return legacy_scalar(generated.get("at")) if isinstance(generated, dict) else ""
    return legacy_scalar(metadata.get("timestamp"))


def generated_by(metadata: dict[str, Any]) -> str:
    generated = metadata.get("generated")
    return legacy_scalar(generated.get("by")) if isinstance(generated, dict) else ""


def _valid_datetime(value: Any) -> bool:
    candidate = str(value or "").strip()
    if "T" not in candidate:
        return False
    try:
        datetime.fromisoformat(candidate.replace("Z", "+00:00"))
    except ValueError:
        return False
    return True


def _valid_date(value: Any) -> bool:
    try:
        date.fromisoformat(str(value or ""))
    except ValueError:
        return False
    return True


def _valid_actor(value: Any) -> bool:
    candidate = str(value or "").strip()
    return bool(
        re.fullmatch(r"(?:human|process):[^\s:]+", candidate)
        or re.fullmatch(r"[^/\s:]+/[^/\s]+", candidate)
    )


def _validate_usage_window(value: Any, prefix: str) -> list[str]:
    if not isinstance(value, dict):
        return [f"{prefix} must be a mapping"]
    errors: list[str] = []
    for key in ("from", "to"):
        if value.get(key) and not _valid_date(value[key]):
            errors.append(f"{prefix}.{key} must be an ISO 8601 date")
    if value.get("from") and value.get("to") and not errors:
        if str(value["from"]) > str(value["to"]):
            errors.append(f"{prefix}.from must not be after {prefix}.to")
    return errors


def validate_v02_concept(metadata: dict[str, Any], body: str) -> list[str]:
    """Validate producer-side v0.2 families without rejecting extensions."""
    errors: list[str] = []
    if not str(metadata.get("type") or "").strip():
        errors.append("missing required frontmatter field type")

    generated = metadata.get("generated")
    if generated is not None:
        if not isinstance(generated, dict):
            errors.append("generated must be a mapping")
        else:
            if not str(generated.get("by") or "").strip():
                errors.append("generated.by is required when generated is present")
            elif not _valid_actor(generated["by"]):
                errors.append("generated.by must use the OKF actor convention")
            if generated.get("at") and not _valid_datetime(generated["at"]):
                errors.append("generated.at must be an ISO 8601 datetime")

    verified = metadata.get("verified")
    if verified is not None:
        if not isinstance(verified, (dict, list)):
            errors.append("verified must be a mapping or list of mappings")
        elif isinstance(verified, list) and any(not isinstance(event, dict) for event in verified):
            errors.append("verified list entries must be mappings")
        for index, event in enumerate(normalize_verified(metadata)):
            if not str(event.get("by") or "").strip():
                errors.append(f"verified[{index}].by is required")
            elif not _valid_actor(event["by"]):
                errors.append(f"verified[{index}].by must use the OKF actor convention")
            if not _valid_datetime(event.get("at")):
                errors.append(f"verified[{index}].at must be an ISO 8601 datetime")

    sources = metadata.get("sources")
    if sources is not None:
        if not isinstance(sources, list):
            errors.append("sources must be a list")
        else:
            for index, source in enumerate(sources):
                if not isinstance(source, dict):
                    errors.append(f"sources[{index}] must be a mapping")
                    continue
                if not str(source.get("resource") or "").strip():
                    errors.append(f"sources[{index}].resource is required")
                if source.get("author") and not _valid_actor(source["author"]):
                    errors.append(f"sources[{index}].author must use the OKF actor convention")
                usage_count = source.get("usage_count")
                if usage_count is not None and (
                    isinstance(usage_count, bool)
                    or not isinstance(usage_count, int)
                    or usage_count < 0
                ):
                    errors.append(f"sources[{index}].usage_count must be a non-negative integer")
                if source.get("last_modified") and not _valid_date(source["last_modified"]):
                    errors.append(f"sources[{index}].last_modified must be an ISO 8601 date")
                if "usage_window" in source:
                    errors.extend(_validate_usage_window(source["usage_window"], f"sources[{index}].usage_window"))

    usage_window = metadata.get("usage_window")
    if usage_window is not None:
        errors.extend(_validate_usage_window(usage_window, "usage_window"))

    status = metadata.get("status")
    if status is not None and status not in {"draft", "stable", "deprecated"}:
        errors.append("status must be draft, stable, or deprecated")
    if metadata.get("stale_after") and not _valid_date(metadata["stale_after"]):
        errors.append("stale_after must be an ISO 8601 date")

    if str(metadata.get("type") or "").strip().lower() == "attested computation":
        if not str(metadata.get("runtime") or "").strip():
            errors.append("Attested Computation requires runtime")
        parameters = metadata.get("parameters", [])
        if not isinstance(parameters, list):
            errors.append("parameters must be a list")
        else:
            for index, parameter in enumerate(parameters):
                if not isinstance(parameter, dict):
                    errors.append(f"parameters[{index}] must be a mapping")
                    continue
                for key in ("name", "type", "required"):
                    if key not in parameter:
                        errors.append(f"parameters[{index}].{key} is required")
                if "name" in parameter and not str(parameter["name"] or "").strip():
                    errors.append(f"parameters[{index}].name must be non-empty")
                if "type" in parameter and not str(parameter["type"] or "").strip():
                    errors.append(f"parameters[{index}].type must be non-empty")
                if "required" in parameter and not isinstance(parameter["required"], bool):
                    errors.append(f"parameters[{index}].required must be boolean")
        computation = str(metadata.get("computation") or "").strip()
        inline = bool(re.search(r"(?ims)^#\s+Computation\s*$.*?```.+?```", body))
        if not computation and not inline:
            errors.append("Attested Computation requires computation path or an inline Computation fence")
        if computation and inline:
            errors.append("Attested Computation must use a computation path or inline fence, not both")
        for key in ("executor", "attester"):
            contract = metadata.get(key)
            if not isinstance(contract, dict) or not str(contract.get("resource") or "").strip():
                errors.append(f"Attested Computation requires {key}.resource")
        executor = metadata.get("executor")
        if isinstance(executor, dict):
            receipt = executor.get("receipt")
            if not isinstance(receipt, list) or not receipt or any(not str(field or "").strip() for field in receipt):
                errors.append("Attested Computation requires a non-empty executor.receipt field list")
    return errors


def legacy_scalar(value: Any) -> str:
    """Project structured metadata into the legacy Explorer's string fields."""
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def legacy_frontmatter(metadata: dict[str, Any]) -> dict[str, str]:
    projected = {key: legacy_scalar(value) for key, value in metadata.items()}
    semantic_type = metadata.get("@type")
    if not projected.get("type") and semantic_type:
        if isinstance(semantic_type, list):
            semantic_type = semantic_type[0] if semantic_type else ""
        projected["type"] = str(semantic_type).rsplit("/", 1)[-1].rsplit("#", 1)[-1]
    if metadata.get("@id"):
        projected["semantic_id"] = str(metadata["@id"])
    if semantic_type:
        projected["semantic_type"] = legacy_scalar(semantic_type)
    return projected


def load_schema(name: str) -> dict[str, Any]:
    return json.loads((PROFILE_ROOT / name).read_text(encoding="utf-8"))


def schema_errors(document: dict[str, Any], schema_name: str) -> list[str]:
    validator = Draft202012Validator(load_schema(schema_name), format_checker=FormatChecker())
    return [f"{'.'.join(str(part) for part in error.absolute_path) or '$'}: {error.message}" for error in sorted(validator.iter_errors(document), key=lambda item: list(item.absolute_path))]


def pinned_document_loader(extra: dict[str, Any] | None = None) -> Callable[[str, dict[str, Any] | None], dict[str, Any]]:
    contexts: dict[str, Any] = {
        CONTEXT_URL: json.loads(CONTEXT_PATH.read_text(encoding="utf-8")),
    }
    contexts.update(extra or {})

    def load(url: str, _options: dict[str, Any] | None = None) -> dict[str, Any]:
        if url not in contexts:
            raise SemanticError(f"remote JSON-LD context is not allowlisted: {url}")
        return {
            "contextUrl": None,
            "documentUrl": url,
            "document": contexts[url],
            "contentType": "application/ld+json",
        }

    return load


def expand(document: dict[str, Any]) -> list[dict[str, Any]]:
    try:
        return jsonld.expand(document, options={"documentLoader": pinned_document_loader()})
    except Exception as exc:
        raise SemanticError(f"JSON-LD expansion failed: {exc}") from exc


def compact(document: dict[str, Any]) -> dict[str, Any]:
    try:
        return jsonld.compact(
            expand(document),
            CONTEXT_URL,
            options={"documentLoader": pinned_document_loader(), "compactArrays": False},
        )
    except Exception as exc:
        raise SemanticError(f"JSON-LD compaction failed: {exc}") from exc


def semantic_json(document: dict[str, Any]) -> str:
    return json.dumps(compact(document), ensure_ascii=False, indent=2, sort_keys=True) + "\n"
