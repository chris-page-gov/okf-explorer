#!/usr/bin/env python3
"""YAML-LD and Markdown-frontmatter support for OKF bundle wikis."""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
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
