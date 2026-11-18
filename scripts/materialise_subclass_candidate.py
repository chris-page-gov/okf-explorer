"""Materialise a bounded subclass-only candidate with explicit derivation."""

from __future__ import annotations

import argparse
from collections import defaultdict, deque
from hashlib import sha256
import json
from pathlib import Path

from normalise_shacl_report import canonical_json, reference


RULE = "urn:okf:rule:subclass-transitive:v1"
SUBCLASS = "http://www.w3.org/2000/01/rdf-schema#subClassOf"
MAX_ASSERTIONS = 2048
MAX_VISITS = 20_000
MAX_INPUT_BYTES = 2 * 1024 * 1024


def materialise(assertions: list[dict[str, str]], *, enabled: bool) -> dict[str, object]:
    if (
        not isinstance(assertions, list)
        or len(assertions) > MAX_ASSERTIONS
        or any(not isinstance(item, dict) for item in assertions)
    ):
        raise ValueError("Expected up to 2,048 assertions from one reviewed scope")
    selected = [
        item for item in assertions
        if item.get("predicate") == SUBCLASS and item.get("assertion_status") == "asserted"
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
        "admitted_assertions_sha256": input_digest,
        "activity": activity if enabled else None,
        "assertions": [],
    }
    if not enabled:
        return output

    inferred = []
    visits = 0
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
                statement = {"source_iri": source, "predicate": SUBCLASS, "target_iri": target}
                digest = sha256(canonical_json({"statement": statement, "activity": activity})).hexdigest()
                inferred.append({
                    "id": f"urn:okf:inferred:{digest}", **statement,
                    "assertion_status": "inferred", "assertion_scope": next(iter(scopes)),
                    "derivation": {"rule": RULE, "activity": activity, "supporting_assertions": list(path)},
                })
    output["assertions"] = inferred
    return output


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--assertions", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--enable-subclass-transitivity", action="store_true")
    args = parser.parse_args()
    with args.assertions.open("rb") as stream:
        raw = stream.read(MAX_INPUT_BYTES + 1)
    if len(raw) > MAX_INPUT_BYTES:
        parser.error("Assertion input exceeds 2 MiB")
    try:
        result = materialise(json.loads(raw), enabled=args.enable_subclass_transitivity)
        with args.output.open("xb") as stream:
            stream.write(canonical_json(result))
    except (KeyError, OSError, TypeError, ValueError) as error:
        parser.exit(2, f"Subclass inference failed: {error}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
