"""Validate pinned local RDF and shapes with a bounded SHACL Core profile."""

from __future__ import annotations

import argparse
from hashlib import sha256
from importlib.metadata import version
from pathlib import Path

from pyshacl import validate
from rdflib import BNode, Graph, Literal, OWL, RDF, SH, URIRef

if __package__:
    from .normalise_shacl_report import MAX_REPORT_BYTES, SEVERITIES, canonical_json, normalise_report
else:
    from normalise_shacl_report import MAX_REPORT_BYTES, SEVERITIES, canonical_json, normalise_report


MAX_GRAPH_BYTES = 2 * 1024 * 1024
MAX_SHAPES_BYTES = 64 * 1024
MAX_DATA_STATEMENTS = 3_000
MAX_SHAPE_STATEMENTS = 256
MAX_FINDINGS = 1_200
PROFILE = "okf-bounded-shacl-core.v1"
FORBIDDEN = {OWL.imports, SH.sparql, SH.js, SH.rule, SH.target, SH.validator}
RELATIVE_BASE = "https://relative-shape.invalid/"
REPORT_PROPERTIES = {RDF.type, SH.conforms, SH.result, SH.resultSeverity, SH.focusNode,
                     SH.sourceShape, SH.resultPath, SH.sourceConstraintComponent}


def pinned(raw: bytes, expected: str, limit: int, name: str) -> None:
    if not 0 < len(raw) <= limit or sha256(raw).hexdigest() != expected:
        raise ValueError(f"{name} does not match the declared digest and byte limit")


def triples(graph: Graph) -> bytes:
    return ("\n".join(sorted(graph.serialize(format="nt").splitlines())) + "\n").encode()


def canonical_report(findings: dict) -> bytes:
    graph = Graph()
    report = BNode("report")
    graph.add((report, RDF.type, SH.ValidationReport))
    graph.add((report, SH.conforms, Literal(findings["conforms"])))
    by_severity = {label: term for term, label in SEVERITIES.items()}
    for row in findings["findings"]:
        for occurrence in range(row["occurrences"]):
            result = BNode(f"finding{row['id']}-{occurrence}")
            graph.add((report, SH.result, result))
            graph.add((result, RDF.type, SH.ValidationResult))
            graph.add((result, SH.resultSeverity, by_severity[row["severity"]]))
            graph.add((result, SH.focusNode, URIRef(row["focus"])))
            graph.add((result, SH.sourceShape, URIRef(row["shape"])))
            graph.add((result, SH.sourceConstraintComponent, URIRef(row["constraint"])))
            if row["path"] is not None:
                graph.add((result, SH.resultPath, URIRef(row["path"])))
    return triples(graph)


def check_core(dataset: bytes, shapes: bytes, bundle: str, graph_sha256: str, shapes_sha256: str):
    pinned(dataset, graph_sha256, MAX_GRAPH_BYTES, "Data graph")
    pinned(shapes, shapes_sha256, MAX_SHAPES_BYTES, "Shapes graph")
    data_graph = Graph().parse(data=dataset.decode("utf-8"), format="nt")
    shape_graph = Graph().parse(data=shapes.decode("utf-8"), format="turtle", publicID=RELATIVE_BASE)
    if len(data_graph) > MAX_DATA_STATEMENTS or not 0 < len(shape_graph) <= MAX_SHAPE_STATEMENTS:
        raise ValueError("Graph or shape statement limit exceeded")
    if any(predicate in FORBIDDEN for _, predicate, _ in shape_graph):
        raise ValueError("This validator accepts local SHACL Core shapes with explicit Core targets")
    if any(isinstance(term, URIRef) and str(term).startswith(RELATIVE_BASE)
           for triple in shape_graph for term in triple):
        raise ValueError("Shapes and shape terms require absolute IRIs")
    if not {
        *shape_graph.subjects(RDF.type, SH.NodeShape),
        *shape_graph.subjects(RDF.type, SH.PropertyShape),
    }:
        raise ValueError("Expected an explicitly typed NodeShape or PropertyShape")
    conforms, raw_report, _ = validate(
        data_graph, shacl_graph=shape_graph, inference="none", advanced=False,
        js=False, do_owl_imports=False, inplace=False, allow_infos=False, allow_warnings=False,
    )
    if not isinstance(raw_report, Graph):
        raise ValueError("The validator did not return a SHACL report graph")
    if sum(1 for _ in raw_report.subjects(RDF.type, SH.ValidationResult)) > MAX_FINDINGS:
        raise ValueError("Validation result count exceeds the bounded profile")
    brief = Graph()
    for node, predicate, value in raw_report:
        if predicate in REPORT_PROPERTIES:
            brief.add((node, predicate, value))
    parsed = normalise_report(triples(brief), bundle)
    if parsed["conforms"] != conforms:
        raise ValueError("The validator outcome disagrees with its report")
    canonical = canonical_report(parsed)
    if len(canonical) > MAX_REPORT_BYTES:
        raise ValueError("Canonical SHACL report exceeds its byte limit")
    return {
        **parsed,
        "report_sha256": sha256(canonical).hexdigest(),
        "execution": {
            "profile": PROFILE,
            "validator": "pySHACL",
            "validator_version": version("pyshacl"),
            "graph_sha256": graph_sha256,
            "shapes_sha256": shapes_sha256,
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--graph", type=Path, required=True)
    parser.add_argument("--shapes", type=Path, required=True)
    parser.add_argument("--graph-sha256", required=True)
    parser.add_argument("--shapes-sha256", required=True)
    parser.add_argument("--bundle", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    try:
        with args.graph.open("rb") as graph, args.shapes.open("rb") as shapes:
            result = check_core(graph.read(MAX_GRAPH_BYTES + 1), shapes.read(MAX_SHAPES_BYTES + 1),
                                args.bundle, args.graph_sha256, args.shapes_sha256)
        with args.output.open("xb") as output:
            output.write(canonical_json(result))
    except (OSError, ValueError) as error:
        parser.exit(2, f"SHACL validation export failed: {error}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
