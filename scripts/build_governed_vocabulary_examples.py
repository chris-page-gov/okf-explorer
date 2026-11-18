"""Build Reader and Validation examples from the exact governed vocabulary."""

from __future__ import annotations

import argparse
from hashlib import sha256
import json
from pathlib import Path

from rdflib import Graph, SKOS, URIRef

from scripts.build_ontology_navigation_index import build_index
from scripts.export_shacl_dqv import export_dqv
from scripts.normalise_shacl_report import canonical_json
from scripts.run_shacl_core import canonical_report, check_core, triples


PROFILE = Path(__file__).resolve().parents[1] / "profiles/governed-vocabulary/v1"
PUBLIC = "https://chris-page-gov.github.io/okf-explorer/profile/governed-vocabulary/v1/"


def binding(path: str, body: bytes) -> dict:
    return {"path": path, "bytes": len(body), "sha256": sha256(body).hexdigest()}


def reader_files(title: str, index: dict, records: list[dict], relationships: list[dict]) -> tuple[dict, dict]:
    routes = {record["id"]: f"dataset/{record['name']}" for record in records}
    for term in index["terms"]:
        term["route"] = routes[term["id"]]
    counts = {"records": len(records), "datasets": len(records), "resources": 0, "relationships": len(relationships)}
    return counts, {
        "data/records.json": canonical_json(records),
        "data/relationships.json": canonical_json(relationships),
        "data/overview.json": canonical_json({"title": title, "counts": counts, "recent_datasets": records}),
        "data/manifest.json": canonical_json({
            "title": title, "counts": counts, "indexes": {"overview": "data/overview.json"},
            "chunks": {"datasets": ["data/records.json"], "relationships": ["data/relationships.json"],
                       "publishers": [], "resources": []},
        }),
        "data/ontology.json": canonical_json(index),
    }


def example(graph: Graph, shapes: bytes, *, missing_label: bool) -> dict[str, bytes]:
    csv = URIRef(PUBLIC + "#csv")
    label = graph.value(csv, SKOS.prefLabel, any=False)
    if label is None:
        raise ValueError("The governed CSV concept needs its preferred label")
    if missing_label:
        graph.remove((csv, SKOS.prefLabel, label))
    raw = triples(graph)
    title = "CSV label validation exercise" if missing_label else "Governed vocabulary v1"
    bundle = "urn:okf:example:missing-csv-label" if missing_label else PUBLIC + "vocabulary.ttl"
    index = build_index(raw, bundle)
    report = check_core(raw, shapes, bundle, sha256(raw).hexdigest(), sha256(shapes).hexdigest())
    if report["conforms"] == missing_label or len(report["findings"]) != int(missing_label):
        raise ValueError("The vocabulary example produced an unexpected SHACL result")

    records = [
        {"id": term["id"], "name": term["id"].partition("#")[2], "url": term["id"],
         "ontology_term": term["id"],
         "title": next((label["value"] for label in term["labels"]), "CSV concept with a missing label"),
         "record_type": "Vocabulary term", "resource_count": 0}
        for term in index["terms"]
    ]
    routes = {record["id"]: f"dataset/{record['name']}" for record in records}
    relationships = [
        {"source": routes[edge["from"]], "target": routes[edge["to"]], "source_iri": edge["from"],
         "target_iri": edge["to"], "predicate": edge["predicate"], "kind": "belongs to concept scheme",
         "assertion_status": "normalized", "authority": "derived"}
        for edge in index["relationships"]
    ]
    counts, files = reader_files(title, index, records, relationships)
    files.update({
        "data/shacl.json": canonical_json(report),
        "source.nt": raw,
        "validation-report.nt": canonical_report(report),
    })
    example = "missing-csv-label" if missing_label else "vocabulary"
    example_url = PUBLIC + f"examples/{example}/"
    report_url = example_url + "validation-report.nt"
    files["quality.nt"] = export_dqv(files["validation-report.nt"], bundle, report_url=report_url)
    entrypoints = {
        "data_manifest": "data/manifest.json", "overview_index": "data/overview.json",
        "ontology_navigation": binding("data/ontology.json", files["data/ontology.json"]),
        "shacl_findings": binding("data/shacl.json", files["data/shacl.json"]),
    }
    if missing_label:
        review = canonical_json({
            "schema": "okf-shacl-review.v1",
            "findings_sha256": sha256(files["data/shacl.json"]).hexdigest(),
            "findings": [{
                "id": report["findings"][0]["id"],
                "remediation": "Restore the English preferred label from the versioned vocabulary, then rerun SHACL.",
                "sources": [
                    {"bundle": bundle, "descriptor": PUBLIC + "examples/missing-csv-label/okf-explorer.json",
                     "record_route": "dataset/csv", "evidence": PUBLIC + "examples/missing-csv-label/source.nt"},
                    {"bundle": PUBLIC + "vocabulary.ttl", "descriptor": PUBLIC + "examples/vocabulary/okf-explorer.json",
                     "record_route": "dataset/csv", "evidence": str(csv)},
                ],
            }],
        })
        files["data/review.json"] = review
        entrypoints["shacl_review"] = binding("data/review.json", review)
    files["okf-explorer.json"] = canonical_json({
        "@id": bundle, "title": title, "counts": counts, "kind": "okf-large-corpus",
        "schema": "okf-explorer-large-corpus.v1",
        "entrypoints": entrypoints,
        "related_links": [
            {"label": "Quality measurements and annotations", "kind": "dqv", "url": example_url + "quality.nt"},
            {"label": "Source SHACL report", "kind": "shacl", "url": report_url},
        ],
    })
    return files


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=PROFILE / "examples")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    registry = json.loads((PROFILE / "registry.json").read_bytes())
    data = (PROFILE / "vocabulary.ttl").read_bytes()
    if binding("vocabulary.ttl", data) != {key: registry[key] for key in ("path", "bytes", "sha256")}:
        parser.error("Vocabulary bytes differ from the registry")
    shapes = (PROFILE / "shapes.ttl").read_bytes()
    for name, missing_label in (("vocabulary", False), ("missing-csv-label", True)):
        graph = Graph().parse(data=data.decode("utf-8"), format="turtle")
        for path, body in example(graph, shapes, missing_label=missing_label).items():
            target = args.output / name / path
            if args.check:
                if not target.is_file() or target.read_bytes() != body:
                    parser.error(f"Example bytes differ at {target}")
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(body)
    print("Governed vocabulary and SHACL examples match the pinned source and shapes.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
