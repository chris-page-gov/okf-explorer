"""Build the bounded PROV-O inference example used in Explorer."""

from __future__ import annotations

import argparse
from pathlib import Path

from scripts.materialise_subclass_candidate import PROV, SUBCLASS, materialise
from scripts.normalise_shacl_report import canonical_json


OUTPUT = Path(__file__).resolve().parents[1] / "profiles/bounded-inference/v1"
SOURCE = "https://www.w3.org/TR/2013/REC-prov-o-20130430/#"
TERMS = {"Revision": "Revision", "Derivation": "Derivation", "EntityInfluence": "Entity influence"}


def example() -> dict[str, bytes]:
    asserted = [
        {
            "id": f"urn:okf:example:prov-o:{source}:{target}",
            "source_iri": PROV + source,
            "target_iri": PROV + target,
            "predicate": SUBCLASS,
            "assertion_status": "official",
            "assertion_scope": "real-world",
            "authority": {"class": "official", "label": "W3C PROV-O Recommendation"},
            "evidence": [SOURCE + source],
        }
        for source, target in (("Revision", "Derivation"), ("Derivation", "EntityInfluence"))
    ]
    result = materialise(asserted, enabled=True)
    inferred = [{**edge, "authority": {"class": "derived", "label": "Bounded subclass rule"}}
                for edge in result["assertions"]]
    nodes = {
        term: {"id": term, "title": title, "type": "PROV-O class", "source_url": SOURCE + term}
        for term, title in TERMS.items()
    }

    def bundle(assertions: list[dict], title: str) -> bytes:
        relationships = [
            {**edge, "source": edge["source_iri"].removeprefix(PROV),
             "target": edge["target_iri"].removeprefix(PROV), "kind": "subclass of"}
            for edge in assertions
        ]
        return canonical_json({"okf_version": "0.2", "title": title, "nodes": nodes,
                               "relationships": relationships})

    return {
        "asserted.json": bundle(asserted, "PROV-O source assertions"),
        "comparison.json": bundle(asserted + inferred, "PROV-O assertion comparison"),
        "derivation.json": canonical_json(result),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    for name, body in example().items():
        path = args.output / name
        if args.check:
            if not path.is_file() or path.read_bytes() != body:
                parser.error(f"Example bytes differ at {path}")
        else:
            args.output.mkdir(parents=True, exist_ok=True)
            path.write_bytes(body)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
