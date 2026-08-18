#!/usr/bin/env python3
"""Synchronize viewer.html with the OKF Markdown corpus."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path, PurePosixPath
from typing import Any
from urllib.parse import quote, unquote

import okf_semantic

ROOT = Path(__file__).resolve().parents[1]
VIEWER = ROOT / "viewer.html"
CONFIG = ROOT / "okf.config.json"
OKF_ROOT_FILES = {"index.md", "sources-index.md", "log.md"}
OKF_DIRS = {
    "document",
    "federated",
    "frameworks",
    "glossary",
    "organisations",
    "research",
    "stack",
    "standards",
    "uk-government",
}
# The Explorer authoring profile is intentionally stricter than OKF core.
# Reserved index/log files are synthesized as Explorer nodes without changing
# their spec-defined Markdown representation.
PROFILE_REQUIRED_FIELDS = ("type", "title", "description")
LINK_RE = re.compile(r"(?<!!)\[[^\]]+\]\(([^)]+)\)")


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def semantic_markdown_exclusion_prefixes() -> tuple[tuple[str, ...], ...]:
    """Return validated repository-relative prefixes excluded from the graph."""

    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    declared = config.get("semanticMarkdownExclusions", [])
    if not isinstance(declared, list):
        raise ValueError("semanticMarkdownExclusions must be an array")
    prefixes: list[tuple[str, ...]] = []
    for value in declared:
        if not isinstance(value, str) or not value.strip():
            raise ValueError(
                "semanticMarkdownExclusions entries must be non-empty strings"
            )
        candidate = PurePosixPath(value.rstrip("/"))
        if candidate.is_absolute() or not candidate.parts or any(
            part in {".", ".."} for part in candidate.parts
        ):
            raise ValueError(
                "semanticMarkdownExclusions entries must be safe "
                "repository-relative prefixes"
            )
        prefixes.append(candidate.parts)
    return tuple(prefixes)


def is_semantic_markdown_excluded(
    path: Path,
    prefixes: tuple[tuple[str, ...], ...] | None = None,
) -> bool:
    """Return whether a Markdown path is outside the semantic corpus boundary."""

    try:
        parts = path.resolve().relative_to(ROOT.resolve()).parts
    except ValueError:
        return True
    configured = (
        prefixes
        if prefixes is not None
        else semantic_markdown_exclusion_prefixes()
    )
    return any(parts[: len(prefix)] == prefix for prefix in configured)


def iter_okf_markdown() -> list[Path]:
    paths: list[Path] = []
    exclusion_prefixes = semantic_markdown_exclusion_prefixes()
    for path in ROOT.rglob("*.md"):
        parts = path.relative_to(ROOT).parts
        if not parts or parts[0] in {"_site", "tmp"}:
            continue
        if is_semantic_markdown_excluded(path, exclusion_prefixes):
            continue
        if parts[0] in OKF_DIRS or (len(parts) == 1 and parts[0] in OKF_ROOT_FILES):
            paths.append(path)
    return sorted(paths, key=rel)


def parse_frontmatter(path: Path) -> tuple[dict[str, Any], str]:
    try:
        document = (
            okf_semantic.parse_optional_frontmatter(path)
            if path.name in {"index.md", "log.md"}
            else okf_semantic.parse_markdown(path)
        )
    except okf_semantic.SemanticError as exc:
        raise ValueError(str(exc).replace(str(ROOT) + "/", "")) from exc
    return document.metadata, document.body


def heading_title(body: str, fallback: str) -> str:
    match = re.search(r"^#\s+(.+?)\s*$", body, re.MULTILINE)
    return match.group(1).strip() if match else fallback


def introductory_description(body: str, fallback: str) -> str:
    for block in re.split(r"\n\s*\n", body):
        candidate = " ".join(line.strip() for line in block.splitlines()).strip()
        if candidate and not candidate.startswith(("#", "-", "*", "|", "```")):
            return candidate
    return fallback


def reserved_metadata(path_id: str, metadata: dict[str, Any], body: str) -> dict[str, Any]:
    path = Path(path_id)
    if path.name == "index.md":
        fallback = "Bundle index" if path_id == "index.md" else path.parent.name.replace("-", " ").title()
        return {
            **metadata,
            "type": "Index",
            "title": heading_title(body, fallback),
            "description": introductory_description(
                body,
                "Progressive-disclosure index represented as an Explorer navigation node.",
            ),
            "status": "stable",
        }
    if path.name == "log.md":
        return {
            **metadata,
            "type": "Log",
            "title": heading_title(body, "Change log"),
            "description": "Chronological OKF bundle update log.",
            "status": "stable",
        }
    return metadata


def validate_v02_core(path_id: str, metadata: dict[str, Any], body: str) -> list[str]:
    path = Path(path_id)
    errors: list[str] = []
    if path.name == "index.md":
        allowed = {"okf_version"} if path_id == "index.md" else set()
        unexpected = sorted(set(metadata) - allowed)
        if unexpected:
            errors.append(f"reserved index frontmatter contains unsupported keys: {', '.join(unexpected)}")
        if path_id == "index.md" and metadata.get("okf_version") != "0.2":
            errors.append('bundle-root index.md must declare okf_version: "0.2" for this exemplar')
        if not re.search(r"^#\s+\S", body, re.MULTILINE):
            errors.append("reserved index must contain a top-level heading")
        return errors
    if path.name == "log.md":
        if metadata:
            errors.append("reserved log.md must not contain frontmatter")
        headings = re.findall(r"^##\s+(\S+)\s*$", body, re.MULTILINE)
        invalid = [heading for heading in headings if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", heading)]
        if invalid:
            errors.append(f"log date headings must use YYYY-MM-DD: {', '.join(invalid)}")
        if headings != sorted(headings, reverse=True):
            errors.append("log date headings must be newest first")
        return errors
    return okf_semantic.validate_v02_concept(metadata, body)


def section_for(path_id: str) -> str:
    first = path_id.split("/", 1)[0]
    return first if first in OKF_DIRS else "root"


def resolve_link(source_id: str, href: str) -> str | None:
    href = href.strip()
    if not href or href.startswith("#"):
        return None
    if re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:", href):
        return None
    href = href.split("#", 1)[0].split("?", 1)[0]
    if not href:
        return None
    href = unquote(href)
    if href.startswith("/"):
        target = Path(href.lstrip("/"))
    else:
        target = Path(source_id).parent / href
    normalized = os.path.normpath(target.as_posix())
    return normalized.replace("\\", "/")


def find_edges(path_id: str, body: str, known_ids: set[str]) -> tuple[list[tuple[str, str]], list[str]]:
    edges: set[tuple[str, str]] = set()
    errors: list[str] = []
    for match in LINK_RE.finditer(body):
        target = resolve_link(path_id, match.group(1))
        if not target:
            continue
        if target.endswith(".md"):
            if target in known_ids:
                edges.add((path_id, target))
            else:
                errors.append(f"{path_id} links to missing Markdown file {target}")
    return sorted(edges), errors


def semantic_entities(metadata: dict[str, Any]) -> list[dict[str, Any]]:
    entities: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()

    def visit(value: Any) -> None:
        if isinstance(value, list):
            for item in value:
                visit(item)
            return
        if not isinstance(value, dict):
            return
        iri = str(value.get("@id") or "").strip()
        route = str(value.get("route") or "").strip()
        if iri and route and (iri, route) not in seen:
            seen.add((iri, route))
            entities.append(value)
        for key, item in value.items():
            if key != "assertions":
                visit(item)

    visit(metadata)
    return entities


def _reference_relationship(
    source_id: str,
    target_id: str,
    nodes: dict[str, dict[str, Any]],
    route_iris: dict[str, str],
    assertion_scope: str,
    markdown_paths: list[tuple[str, str]],
) -> dict[str, Any]:
    source = nodes[source_id]
    identity_material = f"{source_id}\n{target_id}\n{okf_semantic.DCTERMS_REFERENCES}\n"
    identifier = okf_semantic.sha256_hex(identity_material.encode("utf-8"))
    observed_at = str(source.get("timestamp") or "").strip()
    if observed_at and not okf_semantic._valid_datetime(observed_at):
        observed_at = ""
    evidence: list[dict[str, Any]] = []
    for source_path, target_path in markdown_paths:
        source_file = ROOT / source_path
        item: dict[str, Any] = {
            "url": (
                "https://github.com/chris-page-gov/okf-explorer/blob/main/"
                + quote(source_path, safe="/")
            ),
            "type": "markdown-link",
            "source_artifact": source_path,
            **(
                {"source_sha256": okf_semantic.sha256_hex(source_file.read_bytes())}
                if source_file.is_file()
                else {}
            ),
            "source_field": "Markdown body",
            "source_value": target_path,
            "source_value_sha256": okf_semantic.sha256_hex(
                target_path.encode("utf-8")
            ),
            "source_value_hash_canonicalization": "utf8-verbatim-resolved-path",
            "locator": f"Markdown link resolving to {target_path}",
        }
        if observed_at:
            item["retrieved_at"] = observed_at
        evidence.append(item)
    return {
        "schema": "okf-relationship-assertion.v2",
        "id": f"urn:okf:markdown-reference:{identifier}",
        "source": source_id,
        "target": target_id,
        **(
            {"source_iri": route_iris[source_id]}
            if source_id in route_iris
            else {}
        ),
        **(
            {"target_iri": route_iris[target_id]}
            if target_id in route_iris
            else {}
        ),
        "predicate": okf_semantic.DCTERMS_REFERENCES,
        "kind": "references",
        "label": "references",
        "inverse_label": "referenced by",
        "assertion_status": "normalized",
        "assertion_scope": assertion_scope,
        "authority": {
            "class": "synthetic" if assertion_scope == "synthetic-fixture" else "derived",
            "label": (
                "Synthetic fixture Markdown link projection"
                if assertion_scope == "synthetic-fixture"
                else "Deterministic Markdown link projection"
            ),
            "source": "https://github.com/chris-page-gov/okf-explorer",
        },
        "derivation": (
            "https://chris-page-gov.github.io/okf-explorer/"
            "profile/bundle-wiki/v1/rules/markdown-link-v1"
        ),
        **({"observed_at": observed_at} if observed_at else {}),
        "evidence": evidence,
        "rights": {
            "source": "https://github.com/chris-page-gov/okf-explorer/blob/main/LICENSE.md",
            "assertion": "navigation-only",
        },
    }


def build_graph() -> tuple[dict[str, object], list[str]]:
    nodes: dict[str, dict[str, Any]] = {}
    errors: list[str] = []
    parsed: dict[str, tuple[dict[str, Any], str]] = {}

    for path in iter_okf_markdown():
        path_id = rel(path)
        try:
            meta, body = parse_frontmatter(path)
        except ValueError as exc:
            errors.append(f"OKF v0.2 core: {exc}")
            continue
        parsed[path_id] = (meta, body)
        core_errors = validate_v02_core(path_id, meta, body)
        errors.extend(f"{path_id}: OKF v0.2 core: {error}" for error in core_errors)
        display_meta = reserved_metadata(path_id, meta, body)
        if path.name not in {"index.md", "log.md"}:
            for field in PROFILE_REQUIRED_FIELDS:
                if not display_meta.get(field):
                    errors.append(f"{path_id}: Explorer profile requires frontmatter field {field}")
            if not okf_semantic.generated_at(display_meta):
                errors.append(f"{path_id}: Explorer profile requires generated.at")
        effective_timestamp = okf_semantic.generated_at(display_meta)
        nodes[path_id] = {
            **display_meta,
            "type": display_meta.get("type", ""),
            "title": display_meta.get("title", path_id),
            "description": display_meta.get("description", ""),
            "resource": display_meta.get("resource", ""),
            # Compatibility projection for the classic viewer and v0.1-aware
            # clients. `generated` remains intact and has precedence.
            "timestamp": effective_timestamp,
            "aliases": display_meta.get("aliases", []),
            "section": section_for(path_id),
            "body": body,
            "trust_tier": okf_semantic.trust_tier(display_meta),
            "stale": okf_semantic.is_stale(display_meta),
        }

    assertion_records = {
        path_id: metadata
        for path_id, (metadata, _body) in parsed.items()
        if metadata.get("assertions") is not None
    }
    semantic_records = (
        {
            path_id: metadata
            for path_id, (metadata, _body) in parsed.items()
            if path_id in assertion_records
            or (
                str(metadata.get("@id") or "").strip()
                and str(metadata.get("route") or "").strip()
            )
        }
        if assertion_records
        else {}
    )
    semantic_registry: dict[str, Any] | None = None
    semantic_relationships: list[dict[str, Any]] = []
    semantic_scope = "real-world"
    path_routes: dict[str, str] = {}
    if semantic_records:
        generated_values = sorted(
            value
            for value in (
                okf_semantic.generated_at(metadata)
                for metadata in semantic_records.values()
            )
            if value
        )
        semantic_snapshot = generated_values[-1] if generated_values else "semantic-snapshot"
        scopes = {
            str(assertion.get("assertion_scope") or "")
            for metadata in assertion_records.values()
            for assertion in (
                metadata.get("assertions")
                if isinstance(metadata.get("assertions"), list)
                else []
            )
            if isinstance(assertion, dict)
        }
        invalid_scopes = sorted(scopes - okf_semantic.ASSERTION_SCOPES)
        if invalid_scopes:
            errors.append(
                "Semantic profile: unsupported assertion scopes: "
                + ", ".join(invalid_scopes)
            )
        if len(scopes) > 1:
            errors.append(
                "Semantic profile: real-world and synthetic-fixture assertions "
                "must be published as separate corpora"
            )
        elif scopes:
            semantic_scope = next(iter(scopes))
        try:
            semantic_registry = okf_semantic.build_iri_route_registry(
                semantic_records,
                snapshot=semantic_snapshot,
            )
        except okf_semantic.SemanticError as exc:
            errors.extend(
                f"Semantic profile: {line}"
                for line in str(exc).splitlines()
                if line
            )
        if semantic_registry is not None:
            routes_by_iri = {
                str(entry["iri"]): str(entry["route"])
                for entry in semantic_registry["entries"]
            }
            route_owners: dict[str, str] = {}
            for path_id, metadata in semantic_records.items():
                top_iri = str(metadata.get("@id") or "")
                top_route = routes_by_iri.get(top_iri, "")
                if not top_route:
                    errors.append(
                        f"{path_id}: Semantic profile: top-level @id has no route"
                    )
                    continue
                owner = route_owners.get(top_route)
                if owner and owner != path_id:
                    errors.append(
                        f"{path_id}: Semantic profile: top-level route is also used by {owner}: {top_route}"
                    )
                    continue
                route_owners[top_route] = path_id
                path_routes[path_id] = top_route

            for path_id, top_route in list(path_routes.items()):
                if top_route in nodes and top_route != path_id:
                    # A semantic source path may be vacated by its own route remap.
                    occupying_route = path_routes.get(top_route)
                    if not occupying_route or occupying_route == top_route:
                        errors.append(
                            f"{path_id}: Semantic profile: route collides with an existing node: {top_route}"
                        )
                        path_routes.pop(path_id)

            top_nodes = {
                path_id: nodes.pop(path_id)
                for path_id in path_routes
            }
            for path_id, top_route in path_routes.items():
                metadata = semantic_records[path_id]
                top_iri = str(metadata.get("@id") or "")
                top_node = top_nodes[path_id]
                top_node["source_path"] = path_id
                top_node["semantic_id"] = top_iri
                top_node["assertion_scope"] = semantic_scope
                nodes[top_route] = top_node

            for path_id, metadata in semantic_records.items():
                top_route = path_routes.get(path_id, "")
                if not top_route:
                    continue
                for entity in semantic_entities(metadata):
                    route = str(entity.get("route") or "")
                    iri = str(entity.get("@id") or "")
                    if not route or route == top_route:
                        continue
                    if route in nodes:
                        if str(nodes[route].get("semantic_id") or "") != iri:
                            errors.append(
                                f"{path_id}: Semantic profile: nested route collides with an existing node: {route}"
                            )
                        continue
                    semantic_type = entity.get("@type")
                    if isinstance(semantic_type, list):
                        semantic_type = semantic_type[0] if semantic_type else ""
                    effective_timestamp = okf_semantic.generated_at(metadata)
                    nodes[route] = {
                        **entity,
                        "id": route,
                        "type": str(entity.get("type") or semantic_type or "Semantic entity"),
                        "title": str(entity.get("title") or entity.get("name") or route),
                        "description": str(entity.get("description") or ""),
                        "resource": str(entity.get("resource") or ""),
                        "timestamp": effective_timestamp,
                        "aliases": entity.get("aliases", []),
                        "section": route.split("/", 1)[0],
                        "body": "",
                        "trust_tier": okf_semantic.trust_tier(metadata),
                        "stale": okf_semantic.is_stale(metadata),
                        "source_path": path_id,
                        "semantic_id": iri,
                        "assertion_scope": semantic_scope,
                    }

            for path_id, metadata in assertion_records.items():
                compiled, semantic_errors = okf_semantic.compile_semantic_relationships(
                    metadata,
                    semantic_registry,
                )
                semantic_relationships.extend(compiled)
                errors.extend(
                    f"{path_id}: Semantic profile: {error}"
                    for error in semantic_errors
                )

    known_ids = set(nodes)
    known_source_ids = set(parsed)
    edge_set: set[tuple[str, str]] = set()
    markdown_edge_sources: dict[
        tuple[str, str], set[tuple[str, str]]
    ] = {}
    for path_id, (_meta, body) in parsed.items():
        edges, link_errors = find_edges(path_id, body, known_source_ids)
        transformed_edges: set[tuple[str, str]] = set()
        for source, target in edges:
            transformed = (
                path_routes.get(source, source),
                path_routes.get(target, target),
            )
            transformed_edges.add(transformed)
            markdown_edge_sources.setdefault(transformed, set()).add(
                (source, target)
            )
        edge_set.update(transformed_edges)
        errors.extend(f"Explorer profile: {error}" for error in link_errors)

    for relationship in semantic_relationships:
        source = str(relationship.get("source") or "")
        target = str(relationship.get("target") or "")
        if source not in known_ids:
            errors.append(
                f"Semantic profile: relationship source route is not a node: {source}"
            )
        if target not in known_ids:
            errors.append(
                f"Semantic profile: relationship target route is not a node: {target}"
            )
        if source in known_ids and target in known_ids:
            edge_set.add((source, target))

    graph: dict[str, object] = {
        "nodes": nodes,
        "edges": [list(edge) for edge in sorted(edge_set)],
    }
    if semantic_registry is not None:
        route_iris = {
            str(entry["route"]): str(entry["iri"])
            for entry in semantic_registry["entries"]
        }
        reference_relationships = [
            _reference_relationship(
                source,
                target,
                nodes,
                route_iris,
                semantic_scope,
                sorted(markdown_edge_sources[(source, target)]),
            )
            for source, target in sorted(markdown_edge_sources)
            if not any(
                relationship.get("source") == source
                and relationship.get("target") == target
                and relationship.get("predicate") == okf_semantic.DCTERMS_REFERENCES
                for relationship in semantic_relationships
            )
        ]
        all_relationships = [*semantic_relationships, *reference_relationships]
        for relationship in all_relationships:
            errors.extend(
                "Semantic profile: runtime relationship "
                f"{relationship.get('id') or '<missing id>'} {error}"
                for error in okf_semantic.schema_errors(
                    relationship,
                    "federation/v1/relationship-assertion.schema.json",
                )
            )
        try:
            predicate_registry = okf_semantic.predicate_registry_from_relationships(
                all_relationships,
                snapshot=str(semantic_registry.get("snapshot") or "semantic-snapshot"),
                generated_at_value=(
                    str(semantic_registry.get("snapshot"))
                    if "T" in str(semantic_registry.get("snapshot") or "")
                    else "1970-01-01T00:00:00Z"
                ),
            )
            graph["semantic_model"] = okf_semantic.semantic_model_extension(
                semantic_registry,
                predicate_registry,
            )
        except okf_semantic.SemanticError as exc:
            errors.extend(
                f"Semantic profile: {line}"
                for line in str(exc).splitlines()
                if line
            )
        graph["relationships"] = sorted(
            all_relationships,
            key=lambda relationship: (
                str(relationship.get("source") or ""),
                str(relationship.get("predicate") or ""),
                str(relationship.get("target") or ""),
                str(relationship.get("id") or ""),
            ),
        )
        graph["assertion_scope"] = semantic_scope
        if semantic_scope == "synthetic-fixture":
            graph["default_loaded"] = False
    return graph, errors


def rendered_viewer(graph: dict[str, object]) -> str:
    text = VIEWER.read_text(encoding="utf-8")
    start_marker = "const G="
    end_marker = ";\nconst COL="
    start = text.find(start_marker)
    if start == -1:
        raise ValueError("viewer.html does not contain const G=")
    start += len(start_marker)
    end = text.find(end_marker, start)
    if end == -1:
        raise ValueError("viewer.html does not contain const COL= after const G")
    graph_json = json.dumps(graph, ensure_ascii=False, separators=(",", ":"))
    return text[:start] + graph_json + text[end:]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="fail if viewer.html is not synchronised")
    args = parser.parse_args(argv)

    graph, errors = build_graph()
    if errors:
        for error in errors:
            print(error, file=sys.stderr)
        return 1

    updated = rendered_viewer(graph)
    current = VIEWER.read_text(encoding="utf-8")
    if args.check:
        if updated != current:
            print(
                "viewer.html is not synchronised; run "
                "uv run --locked python scripts/update_viewer.py",
                file=sys.stderr,
            )
            return 1
        print(f"viewer.html is synchronised with {len(graph['nodes'])} nodes and {len(graph['edges'])} edges")
        return 0

    if updated != current:
        VIEWER.write_text(updated, encoding="utf-8")
        print(f"updated viewer.html with {len(graph['nodes'])} nodes and {len(graph['edges'])} edges")
    else:
        print(f"viewer.html already synchronized with {len(graph['nodes'])} nodes and {len(graph['edges'])} edges")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
