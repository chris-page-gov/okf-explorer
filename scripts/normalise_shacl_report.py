"""Project a named-shape SHACL Core report into stable OKF findings."""

from __future__ import annotations

import argparse
from hashlib import sha256
import json
from pathlib import Path
from urllib.parse import urlsplit

from rdflib import Graph, Literal, RDF, SH, URIRef, XSD
from rdflib.term import IdentifiedNode


SEVERITIES = {SH.Violation: "violation", SH.Warning: "warning", SH.Info: "info"}
MAX_REPORT_BYTES = 2 * 1024 * 1024


def reference(value: str) -> str:
    if not isinstance(value, str) or any(character.isspace() for character in value):
        raise ValueError("A named IRI is required")
    parts = urlsplit(value)
    if parts.scheme == "urn" and parts.path and not parts.netloc:
        return str(value)
    if parts.scheme in {"https", "http"} and parts.hostname and parts.username is None:
        return str(value)
    raise ValueError("An HTTP, HTTPS or URN IRI is required")


def report_iri(graph: Graph, result: IdentifiedNode, predicate: URIRef) -> str:
    values = list(graph.objects(result, predicate))
    if len(values) != 1 or not isinstance(values[0], URIRef):
        raise ValueError(f"Expected one named IRI for {predicate}")
    return reference(values[0])


def canonical_json(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def normalise_report(raw: bytes, bundle: str) -> dict[str, object]:
    if not raw or len(raw) > MAX_REPORT_BYTES:
        raise ValueError("SHACL report must be between 1 byte and 2 MiB")
    bundle = reference(bundle)
    graph = Graph().parse(data=raw.decode("utf-8"), format="nt")
    reports = list(graph.subjects(RDF.type, SH.ValidationReport))
    if len(reports) != 1:
        raise ValueError("Expected one SHACL validation report")
    outcome = list(graph.objects(reports[0], SH.conforms))
    if len(outcome) != 1 or not isinstance(outcome[0], Literal) or outcome[0].datatype != XSD.boolean:
        raise ValueError("SHACL report needs a single boolean conformance outcome")
    conforms = outcome[0].toPython()
    if not isinstance(conforms, bool):
        raise ValueError("Invalid SHACL conformance outcome")

    results = set(graph.objects(reports[0], SH.result))
    if results != set(graph.subjects(RDF.type, SH.ValidationResult)):
        raise ValueError("Every finding must be typed and linked to the report")
    if conforms == bool(results):
        raise ValueError("SHACL Core conformance outcome disagrees with result count")

    findings: dict[str, dict[str, object]] = {}
    occurrences: dict[str, int] = {}
    for result in results:
        severity = SEVERITIES.get(URIRef(report_iri(graph, result, SH.resultSeverity)))
        if severity is None:
            raise ValueError("Expected a supported SHACL Core severity")
        fields = {
            "bundle": bundle,
            "severity": severity,
            "focus": report_iri(graph, result, SH.focusNode),
            "shape": report_iri(graph, result, SH.sourceShape),
            "path": report_iri(graph, result, SH.resultPath) if (result, SH.resultPath, None) in graph else None,
            "constraint": report_iri(graph, result, SH.sourceConstraintComponent),
        }
        identifier = sha256(canonical_json(fields)).hexdigest()
        findings[identifier] = {"id": identifier, **fields}
        occurrences[identifier] = occurrences.get(identifier, 0) + 1
    return {
        "schema": "okf-shacl-findings.v1",
        "conforms": conforms,
        "bundle": bundle,
        "report_sha256": sha256(raw).hexdigest(),
        "findings": [{**findings[key], "occurrences": occurrences[key]} for key in sorted(findings)],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--bundle", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    with args.report.open("rb") as stream:
        report = normalise_report(stream.read(MAX_REPORT_BYTES + 1), args.bundle)
    with args.output.open("xb") as stream:
        stream.write(canonical_json(report))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
