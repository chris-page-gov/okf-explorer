#!/usr/bin/env python3
"""YAML-LD and Markdown-frontmatter support for OKF bundle wikis."""

from __future__ import annotations

import hashlib
import io
import json
import math
import re
from collections import Counter
from dataclasses import dataclass
from datetime import date, datetime
from functools import lru_cache
from pathlib import Path
from typing import Any, Callable
from urllib.parse import urlsplit

from jsonschema import Draft202012Validator, FormatChecker
from pyld import jsonld
from ruamel.yaml import YAML

ROOT = Path(__file__).resolve().parents[1]
PROFILE_ROOT = ROOT / "profiles" / "bundle-wiki" / "v1"
CONTEXT_PATH = PROFILE_ROOT / "context.jsonld"
CONTEXT_URL = "https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/context.jsonld"
SEMANTIC_CONTEXT_PATH = PROFILE_ROOT / "semantic-context.jsonld"
SEMANTIC_CONTEXT_URL = "https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/semantic-context.jsonld"
PROFILE_URL = "https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/"
PREDICATE_REGISTRY_V2_PROFILE_URL = (
    "https://chris-page-gov.github.io/okf-explorer/profile/predicate-registry/v2/"
)
PREDICATE_REGISTRY_V2_SCHEMA = (
    "predicate-registry/v2/predicate-registry.schema.json"
)
PREDICATE_IMPLEMENTATION_STATES = frozenset(
    {"active-emitted", "authorised-zero-evidence"}
)
PREDICATE_REGISTRY_V2_MAX_BYTES = 16 * 1024 * 1024
PREDICATE_REGISTRY_V2_MAX_PREDICATES = 4096
PREDICATE_REGISTRY_V2_MAX_IRI_ARRAY_ITEMS = 256
PREDICATE_REGISTRY_V2_MAX_EVIDENCE_FIELDS = 64
PREDICATE_REGISTRY_V2_MAX_STRING_LENGTH = 4096
PREDICATE_REGISTRY_V2_MAX_IRI_LENGTH = 4096
PREDICATE_REGISTRY_V2_MAX_ASSERTIONS = 100_000_000

RDF_TYPE = "@type"
RDF_STATEMENT = "http://www.w3.org/1999/02/22-rdf-syntax-ns#Statement"
RDF_SUBJECT = "http://www.w3.org/1999/02/22-rdf-syntax-ns#subject"
RDF_PREDICATE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#predicate"
RDF_OBJECT = "http://www.w3.org/1999/02/22-rdf-syntax-ns#object"
OKF_ASSERTION = "https://chris-page-gov.github.io/okf-explorer/ns#assertion"
OKF_RELATIONSHIP_ASSERTION = "https://chris-page-gov.github.io/okf-explorer/ns#RelationshipAssertion"
DCTERMS_REFERENCES = "http://purl.org/dc/terms/references"
ASSERTION_STATUSES = {"official", "normalized", "inferred", "model-derived"}
ASSERTION_SCOPES = {"real-world", "synthetic-fixture"}
AUTHORITY_CLASSES = {"official", "derived", "model-assisted", "synthetic", "unclassified"}


class SemanticError(ValueError):
    """Raised when structured OKF metadata is not safe or conformant."""


@dataclass(frozen=True)
class MarkdownDocument:
    metadata: dict[str, Any]
    body: str


@dataclass(frozen=True)
class SemanticMaterialization:
    """One parsed YAML-LD source and its deterministic interchange identity."""

    document: dict[str, Any]
    json_ld: str
    source_data_model_sha256: str
    normalized_graph_sha256: str
    normalized_statements: int


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


def render_yaml_ld(document: dict[str, Any]) -> str:
    """Render deterministic, human-readable YAML-LD authoring text.

    The renderer emits only the same JSON-compatible representation accepted by
    :func:`load_yaml_ld_text`.  It deliberately has no custom Python tags and
    disables aliases so the generated authoring source remains portable YAML.
    """

    _validate_representation(document)
    serializer = YAML(typ="safe", pure=True)
    serializer.default_flow_style = False
    serializer.allow_unicode = True
    serializer.sort_base_mapping_type_on_output = True
    serializer.width = 4096
    serializer.representer.ignore_aliases = lambda _value: True
    stream = io.StringIO()
    serializer.dump(document, stream)
    return stream.getvalue()


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


@lru_cache(maxsize=None)
def load_schema(name: str) -> dict[str, Any]:
    relative = Path(name)
    path = PROFILE_ROOT / relative
    if not path.is_file():
        path = ROOT / "profiles" / relative
    return json.loads(path.read_text(encoding="utf-8"))


@lru_cache(maxsize=None)
def schema_validator(name: str) -> Draft202012Validator:
    return Draft202012Validator(load_schema(name), format_checker=FormatChecker())


def schema_errors(document: dict[str, Any], schema_name: str) -> list[str]:
    validator = schema_validator(schema_name)
    return [f"{'.'.join(str(part) for part in error.absolute_path) or '$'}: {error.message}" for error in sorted(validator.iter_errors(document), key=lambda item: list(item.absolute_path))]


def canonical_json_bytes(document: Any) -> bytes:
    """Return the repository's deterministic JSON root material."""
    return (
        json.dumps(
            document,
            ensure_ascii=False,
            separators=(",", ":"),
            sort_keys=True,
        )
        + "\n"
    ).encode("utf-8")


def sha256_hex(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def _context_documents() -> dict[str, Any]:
    """Load repository-reviewed contexts without permitting network retrieval."""
    contexts: dict[str, Any] = {}
    profile_root = ROOT / "profiles"
    for path in sorted(profile_root.rglob("*.jsonld")):
        if "context" not in path.name.casefold():
            continue
        relative = path.relative_to(profile_root).as_posix()
        document = json.loads(path.read_text(encoding="utf-8"))
        for prefix in (
            "https://chris-page-gov.github.io/okf-explorer/profile/",
            "https://chris-page-gov.github.io/okf-explorer/profiles/",
        ):
            contexts[f"{prefix}{relative}"] = document
    # Retain these explicit aliases as a fail-safe if profile discovery changes.
    contexts.setdefault(
        CONTEXT_URL,
        json.loads(CONTEXT_PATH.read_text(encoding="utf-8")),
    )
    contexts.setdefault(
        SEMANTIC_CONTEXT_URL,
        json.loads(SEMANTIC_CONTEXT_PATH.read_text(encoding="utf-8")),
    )
    return contexts


def context_reference(url: str) -> dict[str, str]:
    """Return the local path and byte digest for a pinned public context URL."""
    prefixes = (
        "https://chris-page-gov.github.io/okf-explorer/profile/",
        "https://chris-page-gov.github.io/okf-explorer/profiles/",
    )
    relative = next((url.removeprefix(prefix) for prefix in prefixes if url.startswith(prefix)), "")
    profile_root = (ROOT / "profiles").resolve()
    path = (profile_root / relative).resolve()
    if (
        not relative
        or not path.is_relative_to(profile_root)
        or not path.is_file()
        or "context" not in path.name.casefold()
    ):
        raise SemanticError(f"pinned JSON-LD context has no reviewed local copy: {url}")
    return {
        "url": url,
        "path": path.relative_to(ROOT).as_posix(),
        "sha256": sha256_hex(path.read_bytes()),
        "media_type": "application/ld+json",
    }


def pinned_document_loader(extra: dict[str, Any] | None = None) -> Callable[[str, dict[str, Any] | None], dict[str, Any]]:
    contexts = _context_documents()
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


def expand(
    document: dict[str, Any],
    *,
    extra_contexts: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    try:
        return jsonld.expand(
            document,
            options={"documentLoader": pinned_document_loader(extra_contexts)},
        )
    except Exception as exc:
        raise SemanticError(f"JSON-LD expansion failed: {exc}") from exc


def normalize_json_ld(
    document: dict[str, Any],
    *,
    extra_contexts: dict[str, Any] | None = None,
) -> bytes:
    """Return the canonical RDF dataset for a JSON-LD document.

    URDNA2015 canonical N-Quads makes the result independent of YAML/JSON
    whitespace, mapping order, scalar quoting and JSON-LD blank-node labels.
    Remote contexts remain disabled; only repository-reviewed pinned contexts
    can participate in semantic identity.
    """

    try:
        normalized = jsonld.normalize(
            document,
            options={
                "algorithm": "URDNA2015",
                "format": "application/n-quads",
                "documentLoader": pinned_document_loader(extra_contexts),
            },
        )
    except Exception as exc:
        raise SemanticError(f"JSON-LD normalization failed: {exc}") from exc
    if not isinstance(normalized, str):
        raise SemanticError("JSON-LD normalization did not return canonical N-Quads")
    return normalized.encode("utf-8")


def semantic_graph_identity(
    document: dict[str, Any],
    *,
    extra_contexts: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Describe graph meaning independently of its YAML-LD/JSON-LD syntax."""

    normalized = normalize_json_ld(document, extra_contexts=extra_contexts)
    return {
        "algorithm": "URDNA2015",
        "media_type": "application/n-quads",
        "sha256": sha256_hex(normalized),
        "statements": sum(bool(line.strip()) for line in normalized.splitlines()),
    }


def materialize_yaml_ld(
    text: str,
    *,
    source: str = "<yaml-ld-authoring>",
    extra_contexts: dict[str, Any] | None = None,
) -> SemanticMaterialization:
    """Parse authored YAML-LD and deterministically materialize JSON-LD.

    JSON-LD is emitted from the parsed YAML data model, never from a parallel
    hand-maintained object.  Semantic equality is separately bound to the
    normalized RDF dataset so presentation formatting is not graph identity.
    """

    document = load_yaml_ld_text(text, source=source)
    if not isinstance(document, dict):  # Defensive: streams are disabled above.
        raise SemanticError(f"{source}: YAML-LD authoring source must be a mapping")
    identity = semantic_graph_identity(document, extra_contexts=extra_contexts)
    canonical_data_model = canonical_json_bytes(document)
    json_ld = canonical_data_model.decode("utf-8")
    projected = json.loads(json_ld)
    if projected != document:
        raise SemanticError(
            f"{source}: generated JSON-LD is not semantically equivalent to YAML-LD"
        )
    return SemanticMaterialization(
        document=document,
        json_ld=json_ld,
        source_data_model_sha256=sha256_hex(canonical_data_model),
        normalized_graph_sha256=identity["sha256"],
        normalized_statements=identity["statements"],
    )


def compact(
    document: dict[str, Any],
    *,
    extra_contexts: dict[str, Any] | None = None,
) -> dict[str, Any]:
    compacting_context: Any = document.get("@context") or CONTEXT_URL
    try:
        return jsonld.compact(
            expand(document, extra_contexts=extra_contexts),
            compacting_context,
            options={
                "documentLoader": pinned_document_loader(extra_contexts),
                "compactArrays": False,
            },
        )
    except Exception as exc:
        raise SemanticError(f"JSON-LD compaction failed: {exc}") from exc


def semantic_json(
    document: dict[str, Any],
    *,
    extra_contexts: dict[str, Any] | None = None,
) -> str:
    return (
        json.dumps(
            compact(document, extra_contexts=extra_contexts),
            ensure_ascii=False,
            indent=2,
            sort_keys=True,
        )
        + "\n"
    )


def _as_list(value: Any) -> list[Any]:
    if value is None:
        return []
    return value if isinstance(value, list) else [value]


def iri_value(value: Any) -> str:
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, dict):
        return str(value.get("@id") or "").strip()
    return ""


def _expanded_ids(node: dict[str, Any], predicate: str) -> list[str]:
    values: list[str] = []
    for value in _as_list(node.get(predicate)):
        if isinstance(value, dict) and str(value.get("@id") or "").strip():
            values.append(str(value["@id"]).strip())
    return values


def _expanded_assertion_nodes(expanded: list[dict[str, Any]]) -> list[dict[str, Any]]:
    assertions: list[dict[str, Any]] = []

    def visit(value: Any) -> None:
        if isinstance(value, list):
            for item in value:
                visit(item)
            return
        if not isinstance(value, dict):
            return
        for assertion in _as_list(value.get(OKF_ASSERTION)):
            if isinstance(assertion, dict):
                assertions.append(assertion)
        for key, item in value.items():
            if key != OKF_ASSERTION:
                visit(item)

    visit(expanded)
    return assertions


def _expanded_node_index(expanded: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    index: dict[str, list[dict[str, Any]]] = {}
    seen_objects: set[int] = set()

    def visit(value: Any) -> None:
        if isinstance(value, list):
            for item in value:
                visit(item)
            return
        if not isinstance(value, dict) or id(value) in seen_objects:
            return
        seen_objects.add(id(value))
        identifier = str(value.get("@id") or "").strip()
        if identifier:
            index.setdefault(identifier, []).append(value)
        for item in value.values():
            visit(item)

    visit(expanded)
    return index


def _expanded_assertion_rows_with_document(
    document: dict[str, Any],
    *,
    extra_contexts: dict[str, Any] | None = None,
) -> tuple[list[dict[str, Any]], list[str], list[dict[str, Any]] | None]:
    """Return authored assertions paired with their fully expanded RDF triple."""
    raw_assertions = document.get("assertions")
    if raw_assertions is None:
        return [], [], None
    if not isinstance(raw_assertions, list) or not raw_assertions:
        return [], ["assertions must be a non-empty list"], None

    errors: list[str] = []
    for index, assertion in enumerate(raw_assertions):
        if not isinstance(assertion, dict):
            errors.append(f"assertions[{index}] must be a mapping")
            continue
        errors.extend(
            f"assertions[{index}].{error}"
            for error in schema_errors(assertion, "semantic-assertion.schema.json")
        )
    if errors:
        return [], errors, None

    try:
        expanded = expand(document, extra_contexts=extra_contexts)
    except SemanticError as exc:
        return [], [str(exc)], None
    expanded_nodes = _expanded_assertion_nodes(expanded)
    expanded_by_id: dict[str, dict[str, Any]] = {}
    for node in expanded_nodes:
        identifier = str(node.get("@id") or "").strip()
        if not identifier:
            errors.append("expanded semantic assertion is missing @id")
        elif identifier in expanded_by_id:
            errors.append(f"duplicate expanded semantic assertion @id: {identifier}")
        else:
            expanded_by_id[identifier] = node

    rows: list[dict[str, Any]] = []
    for index, raw in enumerate(raw_assertions):
        assert isinstance(raw, dict)
        identifier = str(raw.get("@id") or "").strip()
        node = expanded_by_id.get(identifier)
        if node is None:
            errors.append(f"assertions[{index}] did not expand to okf:assertion: {identifier or '<missing @id>'}")
            continue
        types = {str(value) for value in _as_list(node.get(RDF_TYPE))}
        for required_type in (RDF_STATEMENT, OKF_RELATIONSHIP_ASSERTION):
            if required_type not in types:
                errors.append(
                    f"assertions[{index}] must expand @type to {required_type}"
                )
        triple: list[str] = []
        for label, predicate in (
            ("source", RDF_SUBJECT),
            ("predicate", RDF_PREDICATE),
            ("target", RDF_OBJECT),
        ):
            values = _expanded_ids(node, predicate)
            if len(values) != 1:
                errors.append(
                    f"assertions[{index}].{label} must expand to exactly one IRI"
                )
                triple.append("")
            else:
                triple.append(values[0])
        rows.append(
            {
                "id": identifier,
                "raw": raw,
                "expanded": node,
                "source_iri": triple[0],
                "predicate": triple[1],
                "target_iri": triple[2],
            }
        )
    return rows, errors, expanded


def expanded_assertion_rows(
    document: dict[str, Any],
    *,
    extra_contexts: dict[str, Any] | None = None,
) -> tuple[list[dict[str, Any]], list[str]]:
    """Return authored assertions paired with their fully expanded RDF triple."""
    rows, errors, _expanded = _expanded_assertion_rows_with_document(
        document,
        extra_contexts=extra_contexts,
    )
    return rows, errors


def _semantic_assertion_reconciliation_errors(
    rows: list[dict[str, Any]],
    expanded: list[dict[str, Any]],
) -> list[str]:
    errors: list[str] = []
    scopes = {
        str(row["raw"].get("assertion_scope") or "")
        for row in rows
    }
    if len(scopes) > 1:
        errors.append(
            "real-world and synthetic-fixture assertions must be published "
            "as separate semantic documents"
        )
    triples = [
        (row["source_iri"], row["predicate"], row["target_iri"])
        for row in rows
        if row["source_iri"] and row["predicate"] and row["target_iri"]
    ]
    duplicate_triples = sorted(
        triple for triple, count in Counter(triples).items() if count > 1
    )
    errors.extend(
        "more than one assertion reifies direct triple " + " → ".join(triple)
        for triple in duplicate_triples
    )
    node_index = _expanded_node_index(expanded)
    asserted_predicates = {predicate for _source, predicate, _target in triples}
    assertion_ids = {row["id"] for row in rows}
    direct_triples: set[tuple[str, str, str]] = set()
    for source, nodes in node_index.items():
        if source in assertion_ids:
            continue
        for node in nodes:
            types = {str(value) for value in _as_list(node.get(RDF_TYPE))}
            if RDF_STATEMENT in types or OKF_RELATIONSHIP_ASSERTION in types:
                continue
            for predicate in asserted_predicates:
                for target in _expanded_ids(node, predicate):
                    direct_triples.add((source, predicate, target))

    assertion_triples = set(triples)
    for triple in sorted(assertion_triples - direct_triples):
        errors.append(
            "reified assertion has no matching direct triple: "
            + " → ".join(triple)
        )
    for triple in sorted(direct_triples - assertion_triples):
        errors.append(
            "direct semantic triple has no matching reified assertion: "
            + " → ".join(triple)
        )
    return errors


def validate_semantic_assertions(
    document: dict[str, Any],
    *,
    extra_contexts: dict[str, Any] | None = None,
) -> list[str]:
    """Validate evidence-bearing assertions and their asserted direct triples."""
    rows, errors, expanded = _expanded_assertion_rows_with_document(
        document,
        extra_contexts=extra_contexts,
    )
    if errors or not rows or expanded is None:
        return errors
    return [
        *errors,
        *_semantic_assertion_reconciliation_errors(rows, expanded),
    ]


def _route_error(route: str) -> str:
    if not route:
        return "route must be non-empty"
    if route.startswith("/") or "\\" in route or "?" in route or "#" in route:
        return "route must be a relative path without query, fragment or backslash"
    if any(part in {"", ".", ".."} for part in route.split("/")):
        return "route contains an empty or dot path segment"
    if route.casefold().endswith(".md"):
        return "semantic routes must not expose Markdown filenames"
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._~/-]*", route):
        return "route contains unsupported characters"
    return ""


def _local_page_for_iri(iri: str) -> tuple[str, str]:
    parts = urlsplit(iri)
    if (
        parts.scheme in {"http", "https"}
        and parts.netloc == "chris-page-gov.github.io"
        and parts.path.startswith("/okf-explorer/")
        and parts.path.casefold().endswith(".html")
    ):
        return parts.path.removeprefix("/okf-explorer/"), parts.fragment
    return "", parts.fragment


def build_iri_route_registry(
    records: dict[str, dict[str, Any]],
    *,
    snapshot: str = "",
) -> dict[str, Any]:
    """Build a deterministic, integrity-bound semantic IRI-to-route registry."""
    entries_by_iri: dict[str, dict[str, str]] = {}
    iri_by_route: dict[str, str] = {}
    errors: list[str] = []

    def register(value: dict[str, Any], fallback_route: str = "") -> None:
        iri = str(value.get("@id") or "").strip()
        route = str(value.get("route") or fallback_route).strip()
        if not iri or not route:
            return
        parsed = urlsplit(iri)
        if not parsed.scheme:
            errors.append(f"semantic @id is not absolute: {iri}")
            return
        route_problem = _route_error(route)
        if route_problem:
            errors.append(f"{route}: {route_problem}")
            return
        page = str(value.get("page") or "").strip()
        derived_page, fragment = _local_page_for_iri(iri)
        if not page:
            page = derived_page
        fragment = str(value.get("fragment") or fragment).strip()
        semantic_type = value.get("@type")
        if isinstance(semantic_type, list):
            semantic_type = semantic_type[0] if semantic_type else ""
        entry = {
            "iri": iri,
            "route": route,
            **({"page": page} if page else {}),
            **({"fragment": fragment} if fragment else {}),
            **(
                {"kind": str(value.get("type") or semantic_type).strip()}
                if str(value.get("type") or semantic_type).strip()
                else {}
            ),
            **(
                {"title": str(value.get("title") or value.get("name")).strip()}
                if str(value.get("title") or value.get("name")).strip()
                else {}
            ),
        }
        existing = entries_by_iri.get(iri)
        if existing:
            for key in ("route", "page", "fragment", "kind", "title"):
                previous = str(existing.get(key) or "")
                candidate = str(entry.get(key) or "")
                if previous and candidate and previous != candidate:
                    errors.append(
                        f"semantic IRI maps inconsistently for {key}: {iri}"
                    )
                    return
                if candidate and not previous:
                    existing[key] = candidate
            entry = existing
        previous_iri = iri_by_route.get(route)
        if previous_iri and previous_iri != iri:
            errors.append(
                f"semantic route collision: {route} maps {previous_iri} and {iri}"
            )
            return
        entries_by_iri[iri] = entry
        iri_by_route[route] = iri

    def visit(value: Any) -> None:
        if isinstance(value, list):
            for item in value:
                visit(item)
            return
        if not isinstance(value, dict):
            return
        if value.get("route"):
            register(value)
        for key, item in value.items():
            if key != "assertions":
                visit(item)

    for fallback_route, metadata in sorted(records.items()):
        register(metadata, fallback_route)
        visit(metadata)
    if errors:
        raise SemanticError("invalid semantic IRI-to-route registry:\n- " + "\n- ".join(errors))
    if not entries_by_iri:
        raise SemanticError("semantic IRI-to-route registry has no entries")

    material: dict[str, Any] = {
        "schema": "okf-iri-route-registry.v1",
        **({"snapshot": snapshot} if snapshot else {}),
        "entries": sorted(
            entries_by_iri.values(),
            key=lambda entry: (entry["iri"], entry["route"]),
        ),
    }
    material["counts"] = {"entries": len(material["entries"])}
    registry = {
        **material,
        "root_sha256": sha256_hex(canonical_json_bytes(material)),
    }
    validation_errors = validate_iri_route_registry(registry)
    if validation_errors:
        raise SemanticError(
            "invalid semantic IRI-to-route registry:\n- "
            + "\n- ".join(validation_errors)
        )
    return registry


def validate_iri_route_registry(registry: dict[str, Any]) -> list[str]:
    errors = schema_errors(registry, "iri-route-registry.schema.json")
    entries = registry.get("entries")
    if not isinstance(entries, list):
        return errors
    iris: set[str] = set()
    routes: set[str] = set()
    for index, entry in enumerate(entries):
        if not isinstance(entry, dict):
            continue
        iri = str(entry.get("iri") or "")
        route = str(entry.get("route") or "")
        if iri in iris:
            errors.append(f"entries[{index}].iri is duplicated: {iri}")
        if route in routes:
            errors.append(f"entries[{index}].route is duplicated: {route}")
        iris.add(iri)
        routes.add(route)
        route_problem = _route_error(route)
        if route_problem:
            errors.append(f"entries[{index}].route: {route_problem}")
    if registry.get("counts", {}).get("entries") != len(entries):
        errors.append("counts.entries differs from entries length")
    material = {key: value for key, value in registry.items() if key != "root_sha256"}
    expected_root = sha256_hex(canonical_json_bytes(material))
    if registry.get("root_sha256") != expected_root:
        errors.append("root_sha256 does not bind the canonical registry material")
    return errors


def validate_predicate_registry_v1(registry: dict[str, Any]) -> list[str]:
    """Validate the frozen Bundle Wiki v1 predicate-registry contract."""
    errors = schema_errors(registry, "predicate-registry.schema.json")
    predicates = registry.get("predicates")
    if not isinstance(predicates, list):
        return errors
    iris: set[str] = set()
    for index, predicate in enumerate(predicates):
        if not isinstance(predicate, dict):
            continue
        iri = str(predicate.get("iri") or "")
        if iri in iris:
            errors.append(f"predicates[{index}].iri is duplicated: {iri}")
        iris.add(iri)
    if registry.get("counts", {}).get("predicates") != len(predicates):
        errors.append("counts.predicates differs from predicates length")
    material = {key: value for key, value in registry.items() if key != "root_sha256"}
    expected_root = sha256_hex(canonical_json_bytes(material))
    if registry.get("root_sha256") != expected_root:
        errors.append("root_sha256 does not bind the canonical predicate registry")
    return errors


def _emitted_predicate_counts(
    relationships: list[dict[str, Any]],
) -> tuple[Counter[str], list[str]]:
    counts: Counter[str] = Counter()
    errors: list[str] = []
    for index, relationship in enumerate(relationships):
        if not isinstance(relationship, dict):
            errors.append(f"relationships[{index}] must be an object")
            continue
        predicate = str(relationship.get("predicate") or "").strip()
        if not predicate:
            errors.append(f"relationships[{index}].predicate is required")
            continue
        counts[predicate] += 1
    return counts, errors


def validate_predicate_registry_v2(
    registry: dict[str, Any],
    *,
    relationships: list[dict[str, Any]] | None = None,
) -> list[str]:
    """Validate the additive capability/state registry and optional emissions."""
    errors = schema_errors(registry, PREDICATE_REGISTRY_V2_SCHEMA)
    canonical_size = len(canonical_json_bytes(registry))
    if canonical_size > PREDICATE_REGISTRY_V2_MAX_BYTES:
        errors.append(
            "predicate registry canonical JSON exceeds the "
            f"{PREDICATE_REGISTRY_V2_MAX_BYTES}-byte safety ceiling"
        )
    predicates = registry.get("predicates")
    if not isinstance(predicates, list):
        return errors

    iris: list[str] = []
    state_counts: Counter[str] = Counter()
    assertion_total = 0
    declared_counts: dict[str, int] = {}
    for index, predicate in enumerate(predicates):
        if not isinstance(predicate, dict):
            continue
        iri = str(predicate.get("iri") or "")
        if iri in iris:
            errors.append(f"predicates[{index}].iri is duplicated: {iri}")
        iris.append(iri)
        implementation = predicate.get("implementation")
        if not isinstance(implementation, dict):
            continue
        state = str(implementation.get("state") or "")
        emitted = implementation.get("assertions_emitted")
        if predicate.get("status") == "deprecated" and (
            state != "authorised-zero-evidence" or emitted != 0
        ):
            errors.append(
                f"predicates[{index}] is deprecated and must use "
                "authorised-zero-evidence with zero emitted assertions"
            )
        if state in PREDICATE_IMPLEMENTATION_STATES:
            state_counts[state] += 1
        if isinstance(emitted, int) and not isinstance(emitted, bool) and emitted >= 0:
            assertion_total += emitted
            declared_counts[iri] = emitted

    if iris != sorted(iris):
        errors.append("predicates must be sorted by canonical IRI")

    counts = registry.get("counts")
    if isinstance(counts, dict):
        expected_counts = {
            "predicates": len(predicates),
            "active_emitted": state_counts["active-emitted"],
            "authorised_zero_evidence": state_counts[
                "authorised-zero-evidence"
            ],
            "assertions_emitted": assertion_total,
        }
        for name, expected in expected_counts.items():
            if counts.get(name) != expected:
                errors.append(
                    f"counts.{name} differs from the governed predicate material"
                )

    material = {key: value for key, value in registry.items() if key != "root_sha256"}
    expected_root = sha256_hex(canonical_json_bytes(material))
    if registry.get("root_sha256") != expected_root:
        errors.append("root_sha256 does not bind the canonical predicate registry")

    if relationships is not None:
        observed_counts, relationship_errors = _emitted_predicate_counts(
            relationships
        )
        errors.extend(relationship_errors)
        declared = set(iris)
        for iri in sorted(set(observed_counts).difference(declared)):
            errors.append(f"emitted predicate is not a declared capability: {iri}")
        for iri in sorted(declared):
            observed = observed_counts[iri]
            declared_count = declared_counts.get(iri)
            if declared_count is not None and observed != declared_count:
                errors.append(
                    f"predicate {iri} declares {declared_count} emitted assertions "
                    f"but {observed} were supplied"
                )
    return errors


def load_predicate_registry_v2_bytes(
    data: bytes,
    *,
    source: str = "<predicate-registry-v2>",
    relationships: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Parse bounded v2 JSON and validate it before Reader consumption."""
    if not isinstance(data, bytes):
        raise SemanticError(f"{source}: predicate registry input must be bytes")
    if len(data) > PREDICATE_REGISTRY_V2_MAX_BYTES:
        raise SemanticError(
            f"{source}: predicate registry exceeds the "
            f"{PREDICATE_REGISTRY_V2_MAX_BYTES}-byte safety ceiling"
        )
    try:
        text = data.decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        raise SemanticError(f"{source}: predicate registry must be UTF-8") from exc

    def reject_duplicate_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
        document: dict[str, Any] = {}
        for key, value in pairs:
            if key in document:
                raise SemanticError(
                    f"{source}: predicate registry contains duplicate key {key!r}"
                )
            document[key] = value
        return document

    try:
        document = json.loads(text, object_pairs_hook=reject_duplicate_keys)
    except SemanticError:
        raise
    except (json.JSONDecodeError, ValueError, RecursionError) as exc:
        raise SemanticError(f"{source}: predicate registry is invalid JSON: {exc}") from exc
    if not isinstance(document, dict):
        raise SemanticError(f"{source}: predicate registry root must be an object")
    errors = validate_predicate_registry_v2(
        document,
        relationships=relationships,
    )
    if errors:
        raise SemanticError(
            f"{source}: invalid predicate capability registry:\n- "
            + "\n- ".join(errors)
        )
    return document


def validate_predicate_registry(
    registry: dict[str, Any],
    *,
    relationships: list[dict[str, Any]] | None = None,
) -> list[str]:
    """Validate either supported predicate-registry wire contract."""
    schema = registry.get("schema")
    if schema == "okf-predicate-registry.v2":
        return validate_predicate_registry_v2(
            registry,
            relationships=relationships,
        )
    return validate_predicate_registry_v1(registry)


def build_predicate_registry(
    predicates: list[dict[str, Any]],
    *,
    snapshot: str,
    generated_at_value: str,
) -> dict[str, Any]:
    material = {
        "schema": "okf-predicate-registry.v1",
        "snapshot": snapshot,
        "generated_at": generated_at_value,
        "predicates": sorted(
            predicates,
            key=lambda item: str(item.get("iri") or ""),
        ),
        "counts": {"predicates": len(predicates)},
    }
    registry = {
        **material,
        "root_sha256": sha256_hex(canonical_json_bytes(material)),
    }
    errors = validate_predicate_registry(registry)
    if errors:
        raise SemanticError(
            "invalid predicate registry:\n- " + "\n- ".join(errors)
        )
    return registry


def build_predicate_registry_v2(
    capabilities: list[dict[str, Any]],
    relationships: list[dict[str, Any]],
    *,
    snapshot: str,
    generated_at_value: str,
) -> dict[str, Any]:
    """Build a complete capability registry with evidence-derived states.

    ``capabilities`` is the producer-authorised set.  Every emitted relationship
    must use one of those exact predicate IRIs.  The generated implementation
    state is therefore auditable rather than a free-text producer claim.
    """
    emitted_counts, relationship_errors = _emitted_predicate_counts(relationships)
    if relationship_errors:
        raise SemanticError(
            "invalid predicate capability emissions:\n- "
            + "\n- ".join(relationship_errors)
        )

    capability_iris = {
        str(capability.get("iri") or "").strip()
        for capability in capabilities
        if isinstance(capability, dict)
    }
    undeclared = sorted(set(emitted_counts).difference(capability_iris))
    if undeclared:
        raise SemanticError(
            "emitted predicates are absent from the authorised capability set:\n- "
            + "\n- ".join(undeclared)
        )

    predicates: list[dict[str, Any]] = []
    for capability in capabilities:
        if not isinstance(capability, dict):
            predicates.append(capability)
            continue
        item = dict(capability)
        iri = str(item.get("iri") or "").strip()
        emitted = emitted_counts[iri]
        item["implementation"] = {
            "state": (
                "active-emitted" if emitted else "authorised-zero-evidence"
            ),
            "assertions_emitted": emitted,
        }
        predicates.append(item)

    state_counts = Counter(
        predicate.get("implementation", {}).get("state")
        for predicate in predicates
        if isinstance(predicate, dict)
    )
    material = {
        "schema": "okf-predicate-registry.v2",
        "profile": PREDICATE_REGISTRY_V2_PROFILE_URL,
        "snapshot": snapshot,
        "generated_at": generated_at_value,
        "predicates": sorted(
            predicates,
            key=lambda item: str(item.get("iri") or "")
            if isinstance(item, dict)
            else "",
        ),
        "counts": {
            "predicates": len(predicates),
            "active_emitted": state_counts["active-emitted"],
            "authorised_zero_evidence": state_counts[
                "authorised-zero-evidence"
            ],
            "assertions_emitted": sum(emitted_counts.values()),
        },
    }
    registry = {
        **material,
        "root_sha256": sha256_hex(canonical_json_bytes(material)),
    }
    errors = validate_predicate_registry_v2(
        registry,
        relationships=relationships,
    )
    if errors:
        raise SemanticError(
            "invalid predicate capability registry:\n- " + "\n- ".join(errors)
        )
    return registry


def predicate_registry_from_relationships(
    relationships: list[dict[str, Any]],
    *,
    snapshot: str,
    generated_at_value: str,
) -> dict[str, Any]:
    """Build the bounded predicate registry declared by authored assertions."""
    grouped: dict[str, list[dict[str, Any]]] = {}
    for relationship in relationships:
        predicate = str(relationship.get("predicate") or "").strip()
        if predicate:
            grouped.setdefault(predicate, []).append(relationship)
    predicates: list[dict[str, Any]] = []
    for predicate, rows in sorted(grouped.items()):
        labels = {str(row.get("kind") or row.get("label") or "").strip() for row in rows}
        inverse_labels = {str(row.get("inverse_label") or "").strip() for row in rows}
        if len(labels - {""}) != 1 or len(inverse_labels - {""}) != 1:
            raise SemanticError(
                f"predicate {predicate} has conflicting or missing preferred/inverse labels"
            )
        statuses = sorted(
            {
                str(row.get("assertion_status") or "")
                for row in rows
                if str(row.get("assertion_status") or "") in ASSERTION_STATUSES
            }
        )
        namespace = predicate.rsplit("#", 1)[0] if "#" in predicate else predicate.rsplit("/", 1)[0]
        predicates.append(
            {
                "iri": predicate,
                "preferred_label": next(iter(labels - {""})),
                "inverse_label": next(iter(inverse_labels - {""})),
                "description": "Relationship predicate declared by the authored YAML-LD assertions.",
                "domain": [],
                "range": [],
                "super_properties": [],
                "characteristics": [],
                "assertion_statuses": statuses or ["normalized"],
                "evidence_policy": {
                    "minimum_fields": ["source_field", "source_value_sha256"]
                },
                "source_vocabulary": {
                    "iri": namespace or predicate,
                    "version": snapshot,
                },
                "status": "active",
            }
        )
    if not predicates:
        raise SemanticError("cannot build a predicate registry without relationships")
    return build_predicate_registry(
        predicates,
        snapshot=snapshot,
        generated_at_value=generated_at_value,
    )


def semantic_model_extension(
    iri_route_registry: dict[str, Any],
    predicate_registry: dict[str, Any],
    *,
    status: str = "experimental",
    context_urls: list[str] | None = None,
) -> dict[str, Any]:
    """Build an additive semantic-model extension from inline registries or refs.

    Inline registries receive structural and integrity-root validation here.
    Resource references bind external registry bytes by SHA-256; callers must
    validate the referenced registry document before publishing the reference.
    """
    errors: list[str] = []
    if iri_route_registry.get("schema") == "okf-iri-route-registry.v1":
        errors.extend(validate_iri_route_registry(iri_route_registry))
    if predicate_registry.get("schema") in {
        "okf-predicate-registry.v1",
        "okf-predicate-registry.v2",
    }:
        errors.extend(validate_predicate_registry(predicate_registry))
    contexts = [
        context_reference(url)
        for url in (context_urls or [CONTEXT_URL, SEMANTIC_CONTEXT_URL])
    ]
    extension = {
        "schema": "okf-semantic-model.v1",
        "status": status,
        "contexts": contexts,
        "id_registry": iri_route_registry,
        "predicate_registry": predicate_registry,
    }
    errors.extend(schema_errors(extension, "semantic-model.schema.json"))
    if errors:
        raise SemanticError(
            "invalid semantic-model extension:\n- " + "\n- ".join(errors)
        )
    return extension


def compile_semantic_relationships(
    document: dict[str, Any],
    iri_route_registry: dict[str, Any],
    *,
    predicate_registry: dict[str, Any] | None = None,
    extra_contexts: dict[str, Any] | None = None,
) -> tuple[list[dict[str, Any]], list[str]]:
    """Compile YAML-LD assertions into Explorer-compatible relationship rows."""
    rows, errors, expanded = _expanded_assertion_rows_with_document(
        document,
        extra_contexts=extra_contexts,
    )
    if rows and expanded is not None:
        errors.extend(_semantic_assertion_reconciliation_errors(rows, expanded))
    errors.extend(validate_iri_route_registry(iri_route_registry))
    predicate_lookup: dict[str, dict[str, Any]] = {}
    if predicate_registry is not None:
        errors.extend(
            validate_predicate_registry(
                predicate_registry,
                relationships=[
                    {"predicate": str(row.get("predicate") or "")}
                    for row in rows
                ],
            )
        )
        predicate_lookup = {
            str(item.get("iri") or ""): item
            for item in predicate_registry.get("predicates", [])
            if isinstance(item, dict)
        }
    if errors:
        return [], sorted(set(errors))

    iri_routes = {
        str(entry["iri"]): str(entry["route"])
        for entry in iri_route_registry["entries"]
    }
    compiled: list[dict[str, Any]] = []
    for row in rows:
        raw = row["raw"]
        source_iri = str(row["source_iri"])
        target_iri = str(row["target_iri"])
        predicate = str(row["predicate"])
        source_route = iri_routes.get(source_iri, "")
        target_route = iri_routes.get(target_iri, "")
        if not source_route:
            errors.append(f"assertion {row['id']} source IRI has no registered route: {source_iri}")
        if not target_route:
            errors.append(f"assertion {row['id']} target IRI has no registered route: {target_iri}")
        governed = predicate_lookup.get(predicate)
        if predicate_registry is not None and governed is None:
            errors.append(f"assertion {row['id']} predicate is not governed: {predicate}")
        kind = str(
            (governed or {}).get("preferred_label")
            or raw.get("kind")
            or raw.get("label")
            or predicate.rsplit("/", 1)[-1].rsplit("#", 1)[-1]
        ).strip()
        inverse_label = str(
            (governed or {}).get("inverse_label")
            or raw.get("inverse_label")
            or ""
        ).strip()
        passthrough: dict[str, Any] = {
            key: value
            for key, value in raw.items()
            if key not in {"@id", "@type", "source", "predicate", "target", "kind", "label"}
        }
        for field in ("derivation", "derivation_activity", "rule"):
            if field in raw:
                passthrough[field] = iri_value(raw[field])
        if isinstance(raw.get("supporting_assertions"), list):
            passthrough["supporting_assertions"] = [
                iri_value(value)
                for value in raw["supporting_assertions"]
            ]
        relationship: dict[str, Any] = {
            **passthrough,
            "schema": "okf-relationship-assertion.v2",
            "id": str(row["id"]),
            "source": source_route,
            "target": target_route,
            "source_iri": source_iri,
            "target_iri": target_iri,
            "predicate": predicate,
            "kind": kind,
            "label": kind,
            **({"inverse_label": inverse_label} if inverse_label else {}),
        }
        if "confidence_score" in raw:
            relationship["confidence"] = raw["confidence_score"]
        errors.extend(
            f"assertion {row['id']} runtime projection {error}"
            for error in schema_errors(
                relationship,
                "federation/v1/relationship-assertion.schema.json",
            )
        )
        compiled.append(relationship)
    return (
        sorted(
            compiled,
            key=lambda item: (
                str(item.get("source") or ""),
                str(item.get("predicate") or ""),
                str(item.get("target") or ""),
                str(item.get("id") or ""),
            ),
        ),
        sorted(set(errors)),
    )
