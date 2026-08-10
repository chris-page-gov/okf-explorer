#!/usr/bin/env python3
"""Build the normalized OKF Explorer bundle from the local Markdown corpus."""

from __future__ import annotations

import argparse
import difflib
import json
import re
import sys
from pathlib import Path
from typing import Any
from urllib.parse import quote, urlsplit

import okf_semantic
import update_viewer

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "okf.config.json"
DEFAULT_OUTPUT = ROOT / "okf-bundle.json"
DEFAULT_YAML_LD_OUTPUT = ROOT / "okf-bundle.yamlld"
DEFAULT_JSON_LD_OUTPUT = ROOT / "okf-bundle.jsonld"
PUBLIC_BASE = "https://chris-page-gov.github.io/okf-explorer/"
SEMANTIC_ID_BASE = PUBLIC_BASE + "id/"
REPOSITORY_URL = "https://github.com/chris-page-gov/okf-explorer"
LICENSE_URL = REPOSITORY_URL + "/blob/main/LICENSE.md"
MARKDOWN_REFERENCE_RULE = PUBLIC_BASE + "profile/bundle-wiki/v1/rules/markdown-link-v1"


RELATIONSHIP_TYPE_CONTEXT: dict[str, Any] = {
    "@id": "okf:RelationshipAssertion",
    "@context": {
        "source": {"@id": "rdf:subject", "@type": "@id"},
        "predicate": {"@id": "rdf:predicate", "@type": "@id"},
        "target": {"@id": "rdf:object", "@type": "@id"},
        "kind": "rdfs:label",
        "label": "rdfs:label",
        "inverse_label": "okf:inverseLabel",
        "assertion_status": {"@id": "okf:assertionStatus", "@type": "@vocab"},
        "assertion_scope": {"@id": "okf:assertionScope", "@type": "@vocab"},
        "official": "okf:OfficialAssertion",
        "normalized": "okf:NormalizedAssertion",
        "inferred": "okf:InferredAssertion",
        "model-derived": "okf:ModelDerivedAssertion",
        "real-world": "okf:RealWorldScope",
        "synthetic-fixture": "okf:SyntheticFixtureScope",
        "authority": {
            "@id": "okf:authority",
            "@context": {
                "class": {"@id": "okf:authorityClass", "@type": "@vocab"},
                "official": "okf:OfficialAuthority",
                "derived": "okf:DerivedAuthority",
                "model-assisted": "okf:ModelAssistedAuthority",
                "synthetic": "okf:SyntheticAuthority",
                "unclassified": "okf:UnclassifiedAuthority",
                "label": "rdfs:label",
                "source": {"@id": "dcterms:source", "@type": "@id"},
            },
        },
        "derivation": {"@id": "okf:derivationMethod", "@type": "@id"},
        "derivation_activity": {"@id": "prov:wasGeneratedBy", "@type": "@id"},
        "rule": {"@id": "okf:rule", "@type": "@id"},
        "supporting_assertions": {
            "@id": "prov:wasDerivedFrom",
            "@type": "@id",
            "@container": "@set",
        },
        "confidence_score": {"@id": "okf:confidenceScore", "@type": "xsd:decimal"},
        "strength": {"@id": "okf:strength", "@type": "xsd:decimal"},
        "count": {"@id": "okf:count", "@type": "xsd:integer"},
        "observed_at": {"@id": "prov:generatedAtTime", "@type": "xsd:dateTime"},
        "stale_after": {"@id": "okf:staleAfter", "@type": "xsd:dateTime"},
        "review_status": "okf:reviewStatus",
        "evidence": {
            "@id": "prov:hadPrimarySource",
            "@container": "@set",
            "@context": {
                "type": "okf:evidenceType",
                "url": {"@id": "schema:url", "@type": "@id"},
                "resource": {"@id": "dcterms:source", "@type": "@id"},
                "source_artifact": "okf:sourceArtifact",
                "source_sha256": "okf:sourceSha256",
                "source_field": "okf:sourceField",
                "source_value": "okf:sourceValue",
                "source_value_sha256": "okf:sourceValueSha256",
                "source_value_hash_canonicalization": "okf:sourceValueHashCanonicalization",
                "locator": "okf:sourceLocator",
                "retrieved_at": {"@id": "prov:generatedAtTime", "@type": "xsd:dateTime"},
            },
        },
        "rights": {
            "@id": "okf:rights",
            "@context": {
                "source": {"@id": "dcterms:license", "@type": "@id"},
                "assertion": "okf:assertionRights",
            },
        },
        "source_route": "okf:sourceRoute",
        "target_route": "okf:targetRoute",
    },
}


def route_slug(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "index"


def semantic_route(path_id: str, node: dict[str, Any]) -> str:
    declared = str(node.get("route") or "").strip()
    if declared:
        route = declared
    else:
        route = path_id.removesuffix(".md")
        if route == "":
            route = "index"
    problem = okf_semantic._route_error(route)
    if problem:
        raise ValueError(f"{path_id}: invalid semantic route {route!r}: {problem}")
    return route


def semantic_iri(path_id: str, node: dict[str, Any], route: str) -> str:
    identifier = str(node.get("semantic_id") or node.get("@id") or "").strip()
    if not identifier:
        identifier = SEMANTIC_ID_BASE + quote(route, safe="/")
    if not urlsplit(identifier).scheme:
        raise ValueError(f"{path_id}: semantic identifier is not absolute: {identifier}")
    return identifier


def route_aliases(path_id: str, node: dict[str, Any]) -> list[str]:
    aliases = {
        route_slug(Path(path_id).with_suffix("").as_posix()),
        path_id.lower(),
        path_id.removesuffix(".md").lower(),
    }
    if "/" not in path_id:
        aliases.add(route_slug(Path(path_id).stem))
    if path_id == "index.md":
        aliases.add("index")
    raw_aliases = node.get("aliases") or []
    alias_values = raw_aliases if isinstance(raw_aliases, list) else str(raw_aliases).split(";")
    for alias in alias_values:
        alias = str(alias).strip()
        if alias:
            aliases.add(route_slug(alias))
    return sorted(aliases)


def edge_kind(source: dict[str, Any], target: dict[str, Any]) -> str:
    source_section = source.get("section", "root")
    target_section = target.get("section", "root")
    if target_section in {"document"} and target.get("type", "").lower().startswith("source"):
        return "source evidence"
    if target_section == "glossary":
        return "defines term"
    if source_section == "root" or source.get("type") == "Index":
        return "lists"
    if source_section == target_section:
        return "related"
    return "links to"


def ordered_sections(nodes: dict[str, dict[str, Any]], preferred: list[str]) -> list[str]:
    sections = sorted({node.get("section", "root") for node in nodes.values()})
    ordered = [section for section in preferred if section in sections]
    ordered.extend(section for section in sections if section not in ordered)
    return ordered


def bundle_generated_at(nodes: dict[str, dict[str, Any]]) -> str:
    timestamps = sorted(str(node.get("timestamp", "")) for node in nodes.values() if node.get("timestamp"))
    return timestamps[-1] if timestamps else ""


def normalized_nodes(nodes: dict[str, dict[str, Any]], source_root: str) -> dict[str, dict[str, Any]]:
    normalized: dict[str, dict[str, Any]] = {}
    prefix = "" if source_root in {"", "."} else f"{source_root.rstrip('/')}/"
    seen_routes: dict[str, str] = {}
    seen_iris: dict[str, str] = {}
    for path_id, node in nodes.items():
        source_path = str(node.get("source_path") or path_id)
        route = semantic_route(path_id, node)
        identifier = semantic_iri(path_id, node, route)
        if route in seen_routes and seen_routes[route] != path_id:
            raise ValueError(
                f"semantic route collision: {route} maps {seen_routes[route]} and {path_id}"
            )
        if identifier in seen_iris and seen_iris[identifier] != path_id:
            raise ValueError(
                f"semantic IRI collision: {identifier} maps {seen_iris[identifier]} and {path_id}"
            )
        seen_routes[route] = path_id
        seen_iris[identifier] = path_id
        normalized[path_id] = {
            **node,
            "id": path_id,
            "route": route,
            "semantic_id": identifier,
            "type": node.get("type", ""),
            "title": node.get("title", path_id),
            "description": node.get("description", ""),
            "timestamp": node.get("timestamp", ""),
            "resource": node.get("resource", ""),
            "aliases": node.get("aliases", []),
            "route_aliases": route_aliases(path_id, node),
            "section": node.get("section", "root"),
            "source": f"{prefix}{source_path}",
            "body": node.get("body", ""),
        }
    return normalized


def _relationship_observed_at(source: dict[str, Any], generated_at_value: str) -> str:
    candidate = str(source.get("timestamp") or generated_at_value).strip()
    if okf_semantic._valid_datetime(candidate):
        return candidate
    raise ValueError("cannot project a relationship without a deterministic observation datetime")


def markdown_reference_relationship(
    source_id: str,
    target_id: str,
    nodes: dict[str, dict[str, Any]],
    generated_at_value: str,
) -> dict[str, Any]:
    source = nodes[source_id]
    target = nodes[target_id]
    source_iri = str(source["semantic_id"])
    target_iri = str(target["semantic_id"])
    predicate = okf_semantic.DCTERMS_REFERENCES
    identity_material = f"{source_iri}\n{predicate}\n{target_iri}\n"
    digest = okf_semantic.sha256_hex(identity_material.encode("utf-8"))
    source_artifact = str(source.get("source") or source_id)
    source_path = ROOT / source_artifact
    observed_at = _relationship_observed_at(source, generated_at_value)
    evidence = {
        "@id": SEMANTIC_ID_BASE + f"evidence/markdown-reference/{digest}",
        "type": "markdown-link",
        "url": REPOSITORY_URL + "/blob/main/" + quote(source_artifact, safe="/"),
        "source_artifact": source_artifact,
        **(
            {"source_sha256": okf_semantic.sha256_hex(source_path.read_bytes())}
            if source_path.is_file()
            else {}
        ),
        "source_field": "Markdown body",
        "source_value": str(target.get("source") or target_id),
        "source_value_sha256": okf_semantic.sha256_hex(
            str(target.get("source") or target_id).encode("utf-8")
        ),
        "source_value_hash_canonicalization": "utf8-verbatim-resolved-path",
        "locator": f"Markdown link resolving to {target.get('source') or target_id}",
        "retrieved_at": observed_at,
    }
    return {
        "schema": "okf-relationship-assertion.v2",
        "id": SEMANTIC_ID_BASE + f"assertion/markdown-reference/{digest}",
        "source": source_id,
        "target": target_id,
        "source_route": str(source["route"]),
        "target_route": str(target["route"]),
        "source_iri": source_iri,
        "target_iri": target_iri,
        "predicate": predicate,
        "kind": "references",
        "label": "references",
        "inverse_label": "referenced by",
        "assertion_status": "normalized",
        "assertion_scope": "real-world",
        "authority": {
            "class": "derived",
            "label": "Deterministic Markdown link projection",
            "source": REPOSITORY_URL,
        },
        "derivation": MARKDOWN_REFERENCE_RULE,
        "observed_at": observed_at,
        "evidence": [evidence],
        "rights": {
            "source": LICENSE_URL,
            "assertion": "navigation-only",
        },
    }


def normalized_relationships(
    graph: dict[str, Any],
    nodes: dict[str, dict[str, Any]],
    generated_at_value: str,
) -> tuple[list[dict[str, Any]], list[str]]:
    declared = graph.get("relationships")
    if isinstance(declared, list):
        relationships = [dict(item) for item in declared if isinstance(item, dict)]
        for relationship in relationships:
            source_id = str(relationship.get("source") or "")
            target_id = str(relationship.get("target") or "")
            if source_id in nodes:
                relationship.setdefault("source_route", str(nodes[source_id]["route"]))
                relationship.setdefault("source_iri", str(nodes[source_id]["semantic_id"]))
            if target_id in nodes:
                relationship.setdefault("target_route", str(nodes[target_id]["route"]))
                relationship.setdefault("target_iri", str(nodes[target_id]["semantic_id"]))
    else:
        relationships = [
            markdown_reference_relationship(source, target, nodes, generated_at_value)
            for source, target in graph["edges"]
        ]

    errors: list[str] = []
    for relationship in relationships:
        errors.extend(
            f"relationship {relationship.get('id') or '<missing id>'} {error}"
            for error in okf_semantic.schema_errors(
                relationship,
                "federation/v1/relationship-assertion.schema.json",
            )
        )
    return (
        sorted(
            relationships,
            key=lambda item: (
                str(item.get("source") or ""),
                str(item.get("predicate") or ""),
                str(item.get("target") or ""),
                str(item.get("id") or ""),
            ),
        ),
        sorted(set(errors)),
    )


def normalized_edges(graph: dict[str, Any]) -> list[dict[str, str]]:
    nodes = graph["nodes"]
    edges: list[dict[str, str]] = []
    for source_id, target_id in graph["edges"]:
        source = nodes[source_id]
        target = nodes[target_id]
        kind = edge_kind(source, target)
        edges.append(
            {
                "source": source_id,
                "target": target_id,
                "kind": kind,
                "label": kind,
            }
        )
    return edges


def load_config() -> dict[str, Any]:
    return json.loads(CONFIG.read_text(encoding="utf-8"))


def build_bundle() -> tuple[dict[str, Any], list[str]]:
    config = load_config()
    graph, errors = update_viewer.build_graph()
    if errors:
        return {}, errors

    corpus_config = config["corpora"][0]
    graph_nodes = graph["nodes"]
    corpus_id = corpus_config["id"]
    generated_at_value = bundle_generated_at(graph_nodes)
    try:
        nodes = normalized_nodes(graph_nodes, corpus_config["sourceRoot"])
        relationships, relationship_errors = normalized_relationships(
            graph,
            nodes,
            generated_at_value,
        )
    except ValueError as exc:
        return {}, [str(exc)]
    if relationship_errors:
        return {}, relationship_errors
    corpus = {
        "id": corpus_id,
        "label": corpus_config["label"],
        "title": corpus_config["title"],
        "subtitle": corpus_config["subtitle"],
        "root": corpus_config["root"],
        "source_root": corpus_config["sourceRoot"],
        "markdown_url": corpus_config["markdownUrl"],
        "sections": ordered_sections(graph_nodes, corpus_config.get("sectionOrder", [])),
        "nodes": nodes,
        "edges": normalized_edges(graph),
        "relationships": relationships,
        "assertion_scope": str(graph.get("assertion_scope") or "real-world"),
    }
    if graph.get("default_loaded") is False:
        corpus["default_loaded"] = False
        corpus["include_in_counts"] = False
        corpus["include_in_search"] = False
    bundle = {
        "schema": "okf-explorer-bundle.v0",
        "kind": "okf-bundle",
        "okf_version": "0.2",
        "generated_by": "scripts/build_okf_bundle.py",
        "generated_at": generated_at_value,
        "meta": {
            "title": config["siteTitle"],
            "description": corpus_config["subtitle"],
            "default_corpus": corpus_id,
            "corpus_order": [corpus_id],
            "core_conformance": "OKF v0.2",
            "profile": "https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/",
            "semantic_descriptor": "okf-bundle.yamlld",
            "semantic_alternates": ["okf-bundle.yamlld", "okf-bundle.jsonld"],
            "extensions": [
                "YAML-LD",
                "federation",
                "Explorer presentation",
                "integrity metadata",
            ],
        },
        "corpora": {corpus_id: corpus},
    }
    try:
        semantic_model = graph.get("semantic_model")
        if not isinstance(semantic_model, dict):
            iri_registry = okf_semantic.build_iri_route_registry(
                {
                    str(node["route"]): {
                        "@id": node["semantic_id"],
                        "route": node["route"],
                        "type": node.get("type") or "Concept",
                        "title": node.get("title") or node["route"],
                    }
                    for node in nodes.values()
                },
                snapshot=generated_at_value or "semantic-snapshot",
            )
            predicate_registry = okf_semantic.predicate_registry_from_relationships(
                relationships,
                snapshot=generated_at_value or "semantic-snapshot",
                generated_at_value=generated_at_value or "1970-01-01T00:00:00Z",
            )
            semantic_model = okf_semantic.semantic_model_extension(
                iri_registry,
                predicate_registry,
            )
        bundle["extensions"] = {"okf-semantic-model.v1": semantic_model}
    except okf_semantic.SemanticError as exc:
        return {}, [str(exc)]
    return bundle, []


def render_bundle(bundle: dict[str, Any]) -> str:
    return json.dumps(bundle, ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def _semantic_type(node: dict[str, Any]) -> str:
    value: Any = node.get("semantic_type") or node.get("@type")
    if isinstance(value, str) and value.startswith("["):
        try:
            value = json.loads(value)
        except json.JSONDecodeError:
            value = ""
    if isinstance(value, list):
        value = next((item for item in value if isinstance(item, str)), "")
    candidate = str(value or "").strip()
    if candidate.startswith(("http://", "https://", "urn:", "okf:")):
        return candidate
    return "okf:Concept"


def semantic_assertion(relationship: dict[str, Any]) -> dict[str, Any]:
    assertion: dict[str, Any] = {
        "@id": str(relationship.get("id") or ""),
        "@type": ["rdf:Statement", "RelationshipAssertion"],
        "source": {"@id": str(relationship.get("source_iri") or "")},
        "predicate": {"@id": str(relationship.get("predicate") or "")},
        "target": {"@id": str(relationship.get("target_iri") or "")},
        "source_route": str(
            relationship.get("source_route") or relationship.get("source") or ""
        ),
        "target_route": str(
            relationship.get("target_route") or relationship.get("target") or ""
        ),
        "kind": str(relationship.get("kind") or relationship.get("label") or ""),
        "label": str(relationship.get("label") or relationship.get("kind") or ""),
        "inverse_label": str(relationship.get("inverse_label") or ""),
        "assertion_status": str(relationship.get("assertion_status") or ""),
        "assertion_scope": str(relationship.get("assertion_scope") or ""),
        "authority": relationship.get("authority"),
        "derivation": str(relationship.get("derivation") or ""),
        "observed_at": str(relationship.get("observed_at") or ""),
        "evidence": relationship.get("evidence"),
        "rights": relationship.get("rights"),
    }
    for field in (
        "derivation_activity",
        "rule",
        "supporting_assertions",
        "confidence_score",
        "strength",
        "count",
        "stale_after",
        "review_status",
    ):
        if relationship.get(field) not in (None, "", []):
            assertion[field] = relationship[field]
    if "confidence_score" not in assertion and isinstance(
        relationship.get("confidence"), (int, float)
    ):
        assertion["confidence_score"] = relationship["confidence"]
    return assertion


def build_semantic_document(bundle: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    corpora = bundle.get("corpora") or {}
    corpus = next(iter(corpora.values()), None)
    if not isinstance(corpus, dict):
        return {}, ["runtime bundle has no corpus to project semantically"]
    nodes = corpus.get("nodes")
    relationships = corpus.get("relationships")
    if not isinstance(nodes, dict) or not isinstance(relationships, list):
        return {}, ["runtime corpus must contain nodes and rich relationships"]

    direct_targets: dict[str, dict[str, list[str]]] = {}
    assertions: list[dict[str, Any]] = []
    errors: list[str] = []
    for relationship in relationships:
        if not isinstance(relationship, dict):
            errors.append("runtime relationship must be an object")
            continue
        assertion = semantic_assertion(relationship)
        errors.extend(
            f"semantic assertion {assertion.get('@id') or '<missing id>'} {error}"
            for error in okf_semantic.schema_errors(
                assertion,
                "semantic-assertion.schema.json",
            )
        )
        assertions.append(assertion)
        source_iri = okf_semantic.iri_value(assertion["source"])
        predicate = okf_semantic.iri_value(assertion["predicate"])
        target_iri = okf_semantic.iri_value(assertion["target"])
        direct_targets.setdefault(source_iri, {}).setdefault(predicate, []).append(
            target_iri
        )

    entities: list[dict[str, Any]] = []
    seen_iris: set[str] = set()
    seen_routes: set[str] = set()
    for node_id, node in sorted(nodes.items()):
        if not isinstance(node, dict):
            errors.append(f"runtime node {node_id} must be an object")
            continue
        iri = str(node.get("semantic_id") or "").strip()
        route = str(node.get("route") or "").strip()
        if not iri or not urlsplit(iri).scheme:
            errors.append(f"runtime node {node_id} has no absolute semantic identity")
        if not route or okf_semantic._route_error(route):
            errors.append(f"runtime node {node_id} has no validated semantic route")
        if iri in seen_iris:
            errors.append(f"semantic entity IRI is duplicated: {iri}")
        if route in seen_routes:
            errors.append(f"semantic entity route is duplicated: {route}")
        seen_iris.add(iri)
        seen_routes.add(route)
        entity: dict[str, Any] = {
            "@id": iri,
            "@type": _semantic_type(node),
            "route": route,
            "type": str(node.get("type") or "Concept"),
            "title": str(node.get("title") or route),
            "description": str(node.get("description") or ""),
            "section": str(node.get("section") or "root"),
            "source_path": str(node.get("source") or node_id),
        }
        aliases = node.get("aliases")
        if isinstance(aliases, list) and aliases:
            entity["aliases"] = aliases
        timestamp = str(node.get("timestamp") or "")
        if timestamp:
            entity["timestamp"] = timestamp
        resource = str(node.get("resource") or "")
        if resource:
            entity["resource"] = resource
        for predicate, targets in sorted(direct_targets.get(iri, {}).items()):
            values = [{"@id": target} for target in sorted(set(targets))]
            entity[predicate] = values[0] if len(values) == 1 else values
        entities.append(entity)

    package = json.loads(
        (ROOT / "apps" / "okf-explorer" / "package.json").read_text(encoding="utf-8")
    )
    document: dict[str, Any] = {
        "@context": [
            okf_semantic.CONTEXT_URL,
            okf_semantic.SEMANTIC_CONTEXT_URL,
            {
                "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
                "okf": "https://chris-page-gov.github.io/okf-explorer/ns#",
                "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
                "dcterms": "http://purl.org/dc/terms/",
                "prov": "http://www.w3.org/ns/prov#",
                "schema": "https://schema.org/",
                "xsd": "http://www.w3.org/2001/XMLSchema#",
                "RelationshipAssertion": RELATIONSHIP_TYPE_CONTEXT,
                "section": "okf:section",
                "source_path": "okf:sourceArtifact",
                "aliases": {"@id": "skos:altLabel", "@container": "@set"},
                "assertion_scope": "okf:assertionScope",
            },
        ],
        "@id": SEMANTIC_ID_BASE + "bundle/ai-infrastructure-wiki",
        "@type": "okf:Bundle",
        "okf_version": "0.2",
        "title": str(corpus.get("title") or bundle.get("meta", {}).get("title") or "OKF bundle"),
        "description": str(corpus.get("subtitle") or bundle.get("meta", {}).get("description") or ""),
        "version": str(package["version"]),
        "status": "experimental",
        "descriptor": {"@id": PUBLIC_BASE + "okf-bundle.json"},
        "semanticDescriptor": {"@id": PUBLIC_BASE + "okf-bundle.yamlld"},
        "home": {"@id": PUBLIC_BASE},
        "profile": {"@id": okf_semantic.PROFILE_URL},
        "publisher": {"@id": "https://github.com/chris-page-gov"},
        "license": {"@id": LICENSE_URL},
        "route": "index",
        "assertion_scope": str(corpus.get("assertion_scope") or "real-world"),
        "generated": {
            "by": "process:build-okf-bundle",
            "at": str(bundle.get("generated_at") or ""),
        },
        "counts": {"entities": len(entities), "assertions": len(assertions)},
        "@graph": [*entities, *assertions],
    }
    errors.extend(okf_semantic.schema_errors(document, "bundle.schema.json"))
    validation_document = {
        **{key: value for key, value in document.items() if key != "@graph"},
        "@graph": entities,
        "assertions": assertions,
    }
    errors.extend(okf_semantic.validate_semantic_assertions(validation_document))
    try:
        okf_semantic.semantic_graph_identity(document)
    except okf_semantic.SemanticError as exc:
        errors.append(str(exc))
    return document, sorted(set(errors))


def render_semantic_outputs(document: dict[str, Any]) -> tuple[str, str]:
    yaml_ld = okf_semantic.render_yaml_ld(document)
    materialized = okf_semantic.materialize_yaml_ld(
        yaml_ld,
        source="generated:okf-bundle.yamlld",
    )
    if materialized.document != document:
        raise okf_semantic.SemanticError(
            "generated YAML-LD does not preserve the semantic source data model"
        )
    json_ld = json.dumps(document, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    if okf_semantic.semantic_graph_identity(json.loads(json_ld)) != okf_semantic.semantic_graph_identity(document):
        raise okf_semantic.SemanticError(
            "generated JSON-LD does not preserve YAML-LD graph identity"
        )
    return yaml_ld, json_ld


def check_output(path: Path, content: str) -> list[str]:
    if not path.exists():
        return [f"{path.relative_to(ROOT)} is missing; regenerate it"]
    existing = path.read_text(encoding="utf-8")
    if existing == content:
        return []
    diff = "\n".join(
        difflib.unified_diff(
            existing.splitlines(),
            content.splitlines(),
            fromfile=f"{path.relative_to(ROOT)} (current)",
            tofile=f"{path.relative_to(ROOT)} (generated)",
            lineterm="",
            n=3,
        )
    )
    return [f"{path.relative_to(ROOT)} is out of date:\n{diff}"]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--semantic-yaml-output", type=Path, default=DEFAULT_YAML_LD_OUTPUT)
    parser.add_argument("--semantic-json-output", type=Path, default=DEFAULT_JSON_LD_OUTPUT)
    parser.add_argument("--check", action="store_true", help="fail if the bundle is not synchronized")
    args = parser.parse_args(argv)

    output = args.output if args.output.is_absolute() else ROOT / args.output
    yaml_output = (
        args.semantic_yaml_output
        if args.semantic_yaml_output.is_absolute()
        else ROOT / args.semantic_yaml_output
    )
    json_ld_output = (
        args.semantic_json_output
        if args.semantic_json_output.is_absolute()
        else ROOT / args.semantic_json_output
    )
    bundle, errors = build_bundle()
    if errors:
        for error in errors:
            print(error, file=sys.stderr)
        return 1

    semantic, semantic_errors = build_semantic_document(bundle)
    if semantic_errors:
        print("OKF semantic build failed:", file=sys.stderr)
        for error in semantic_errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    try:
        yaml_ld, json_ld = render_semantic_outputs(semantic)
    except okf_semantic.SemanticError as exc:
        print(f"OKF semantic build failed: {exc}", file=sys.stderr)
        return 1
    content = render_bundle(bundle)
    if args.check:
        errors = [
            *check_output(output, content),
            *check_output(yaml_output, yaml_ld),
            *check_output(json_ld_output, json_ld),
        ]
        if errors:
            print("OKF bundle check failed:", file=sys.stderr)
            for error in errors:
                print(f"- {error}", file=sys.stderr)
            return 1
        corpus = next(iter(bundle["corpora"].values()))
        print(
            "OKF runtime and semantic bundles are synchronized with "
            f"{len(corpus['nodes'])} nodes and {len(corpus['relationships'])} assertions"
        )
        return 0

    output.write_text(content, encoding="utf-8")
    yaml_output.write_text(yaml_ld, encoding="utf-8")
    json_ld_output.write_text(json_ld, encoding="utf-8")
    print(
        "wrote "
        + ", ".join(
            path.relative_to(ROOT).as_posix()
            for path in (output, yaml_output, json_ld_output)
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
