"""Materialise a bounded subclass-only candidate with explicit derivation."""

from __future__ import annotations

import argparse
from collections import defaultdict, deque
from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path

if __package__:
    from .normalise_shacl_report import canonical_json, reference
else:
    from normalise_shacl_report import canonical_json, reference


RULE = "urn:okf:rule:subclass-transitive:v1"
SUBCLASS = "http://www.w3.org/2000/01/rdf-schema#subClassOf"
PROV = "http://www.w3.org/ns/prov#"
XSD_DATETIME = "http://www.w3.org/2001/XMLSchema#dateTime"
SOFTWARE = "urn:okf:software:subclass-materialiser:v1"
MAX_ASSERTIONS = 2048
MAX_VISITS = 20_000
MAX_SUPPORT_REFERENCES = 50_000
MAX_INPUT_BYTES = 2 * 1024 * 1024


def assertion_iri(identifier: str) -> str:
    try:
        return reference(identifier)
    except ValueError:
        return f"urn:okf:assertion-reference:{sha256(identifier.encode('utf-8')).hexdigest()}"


def provenance(activity: str, input_digest: str, inferred: list[dict]) -> list[dict]:
    input_iri = f"urn:okf:sha256:{input_digest}"
    return [
        {"@id": input_iri, "@type": f"{PROV}Entity"},
        {"@id": RULE, "@type": f"{PROV}Plan"},
        {
            "@id": activity,
            "@type": f"{PROV}Activity",
            f"{PROV}used": {"@id": input_iri},
            f"{PROV}qualifiedAssociation": {"@type": f"{PROV}Association", f"{PROV}hadPlan": {"@id": RULE}},
        },
        *[
            {
                "@id": edge["id"],
                "@type": f"{PROV}Entity",
                f"{PROV}wasGeneratedBy": {"@id": activity},
                f"{PROV}wasDerivedFrom": [
                    {"@id": assertion_iri(identifier)} for identifier in edge["supporting_assertions"]
                ],
            }
            for edge in inferred
        ],
    ]


def materialise(assertions: list[dict[str, str]], *, enabled: bool) -> dict[str, object]:
    if (
        not isinstance(assertions, list)
        or len(assertions) > MAX_ASSERTIONS
        or any(not isinstance(item, dict) for item in assertions)
    ):
        raise ValueError("Expected up to 2,048 assertions from one reviewed scope")
    selected = [
        item for item in assertions
        if item.get("predicate") == SUBCLASS and item.get("assertion_status") == "official"
    ]
    scopes = {item["assertion_scope"] for item in selected}
    if len(scopes) > 1 or scopes - {"real-world", "synthetic-fixture"}:
        raise ValueError("Subclass rules require a single assertion scope")

    edges: dict[str, list[tuple[str, str]]] = defaultdict(list)
    ids = set()
    for item in selected:
        identifier = item["id"]
        if not isinstance(identifier, str) or not identifier.strip() or identifier in ids:
            raise ValueError("Each supporting assertion needs a unique identity")
        ids.add(identifier)
        edges[reference(item["source_iri"])].append((reference(item["target_iri"]), identifier))
    for adjacent in edges.values():
        adjacent.sort()

    admitted = [
        [source, target, identifier] for source in sorted(edges) for target, identifier in edges[source]
    ]
    input_digest = sha256(canonical_json({"scopes": sorted(scopes), "edges": admitted})).hexdigest()
    identity = sha256(canonical_json({"rule": RULE, "admitted_assertions_sha256": input_digest})).hexdigest()
    activity = f"urn:okf:inference-activity:{identity}"
    output = {
        "schema": "okf-bounded-subclass-candidate.v1",
        "rule": RULE,
        "rule_manifest": {
            "schema": "okf-inference-rule.v1",
            "id": RULE,
            "predicate": SUBCLASS,
            "input_assertion_status": "official",
            "max_input_assertions": MAX_ASSERTIONS,
            "max_edge_visits": MAX_VISITS,
            "max_support_references": MAX_SUPPORT_REFERENCES,
        },
        "admitted_assertions_sha256": input_digest,
        "activity": activity if enabled else None,
        "assertions": [],
        "provenance": {"@graph": []},
    }
    if not enabled:
        return output

    inferred = []
    visits = 0
    supporting_references = 0
    for source in sorted(edges):
        direct = {target for target, _ in edges[source]}
        seen = {source}
        frontier: deque[tuple[str, tuple[str, ...]]] = deque([(source, ())])
        while frontier:
            current, supports = frontier.popleft()
            for target, identifier in edges.get(current, []):
                visits += 1
                if visits > MAX_VISITS:
                    raise ValueError("Bounded subclass inference exceeded its visit budget")
                if target in seen:
                    continue
                seen.add(target)
                path = (*supports, identifier)
                frontier.append((target, path))
                if target in direct:
                    continue
                supporting_references += len(path)
                if supporting_references > MAX_SUPPORT_REFERENCES:
                    raise ValueError("Bounded subclass inference exceeded its support budget")
                statement = {"source_iri": source, "predicate": SUBCLASS, "target_iri": target}
                digest = sha256(canonical_json({"statement": statement, "activity": activity})).hexdigest()
                inferred.append({
                    "id": f"urn:okf:inferred:{digest}", **statement,
                    "assertion_status": "inferred", "assertion_scope": next(iter(scopes)),
                    "derivation_activity": activity,
                    "rule": RULE,
                    "supporting_assertions": list(path),
                })
    output["assertions"] = inferred
    output["provenance"] = {"@graph": provenance(activity, input_digest, inferred)}
    return output


def execution_provenance(
    raw: bytes, result: dict[str, object], started_at: datetime, ended_at: datetime,
) -> dict[str, list[dict]]:
    logical_activity = result["activity"]
    if (
        not logical_activity
        or any(time.utcoffset() is None for time in (started_at, ended_at))
        or ended_at < started_at
    ):
        raise ValueError("Execution evidence requires enabled inference and ordered timestamps with time zones")
    start, end = started_at.isoformat(), ended_at.isoformat()
    source = f"urn:okf:sha256:{sha256(raw).hexdigest()}"
    output = f"urn:okf:sha256:{sha256(canonical_json(result)).hexdigest()}"
    identity = sha256(canonical_json([source, output, SOFTWARE, start, end])).hexdigest()
    execution = f"urn:okf:enrichment-execution:{identity}"
    return {"@graph": [
        {"@id": source, "@type": f"{PROV}Entity"},
        {"@id": output, "@type": f"{PROV}Entity", f"{PROV}wasGeneratedBy": {"@id": execution}},
        {"@id": SOFTWARE, "@type": f"{PROV}SoftwareAgent"},
        {
            "@id": execution, "@type": f"{PROV}Activity",
            f"{PROV}used": {"@id": source},
            f"{PROV}wasAssociatedWith": {"@id": SOFTWARE},
            "http://www.w3.org/2000/01/rdf-schema#seeAlso": {"@id": logical_activity},
            f"{PROV}startedAtTime": {"@value": start, "@type": XSD_DATETIME},
            f"{PROV}endedAtTime": {"@value": end, "@type": XSD_DATETIME},
            f"{PROV}qualifiedAssociation": {
                "@type": f"{PROV}Association",
                f"{PROV}agent": {"@id": SOFTWARE},
                f"{PROV}hadPlan": {"@id": RULE},
            },
        },
    ]}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--assertions", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--enable-subclass-transitivity", action="store_true")
    parser.add_argument("--record-execution", action="store_true",
                        help="Append observed provenance for this enrichment run")
    args = parser.parse_args()
    if args.record_execution and not args.enable_subclass_transitivity:
        parser.error("Recording enrichment execution requires enabled subclass inference")
    with args.assertions.open("rb") as stream:
        raw = stream.read(MAX_INPUT_BYTES + 1)
    if len(raw) > MAX_INPUT_BYTES:
        parser.error("Assertion input exceeds 2 MiB")
    try:
        started_at = datetime.now(timezone.utc) if args.record_execution else None
        result = materialise(json.loads(raw), enabled=args.enable_subclass_transitivity)
        if started_at is not None:
            result["execution_provenance"] = execution_provenance(raw, result, started_at, datetime.now(timezone.utc))
        with args.output.open("xb") as stream:
            stream.write(canonical_json(result))
    except (KeyError, OSError, TypeError, ValueError) as error:
        parser.exit(2, f"Subclass inference failed: {error}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
