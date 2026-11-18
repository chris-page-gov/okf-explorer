"""Export bound SHACL Core outcomes as DQV measurements and annotations."""

from __future__ import annotations

import argparse
from collections import Counter
from hashlib import sha256
from pathlib import Path

from rdflib import DCTERMS, Graph, Literal, Namespace, PROV, RDF, RDFS, SH, URIRef, XSD

from scripts.export_dcat_ap import named
from scripts.normalise_shacl_report import MAX_REPORT_BYTES, SEVERITIES, canonical_json, normalise_report


DQV = Namespace("http://www.w3.org/ns/dqv#")
OA = Namespace("http://www.w3.org/ns/oa#")
PROFILE = URIRef("urn:okf:profile:dqv-shacl:v1")


def stable_id(kind: str, *identity: str) -> URIRef:
    return URIRef(f"urn:okf:{kind}:sha256:{sha256(canonical_json(identity)).hexdigest()}")


def export_dqv(raw: bytes, bundle: str, *, report_url: str | None = None) -> bytes:
    report = normalise_report(raw, bundle)
    dataset = URIRef(report["bundle"])
    digest = report["report_sha256"]
    source_report = URIRef(f"urn:okf:sha256:{digest}")
    activity = stable_id("dqv-shacl-projection", str(dataset), digest)
    graph = Graph()
    graph.add((activity, RDF.type, PROV.Activity))
    graph.add((activity, PROV.used, source_report))
    graph.add((activity, PROV.used, PROFILE))
    graph.add((source_report, RDF.type, PROV.Entity))
    if report_url is not None:
        graph.add((source_report, PROV.atLocation, named(report_url, web=True)))
    graph.add((PROFILE, DCTERMS.conformsTo, URIRef("https://www.w3.org/TR/2016/NOTE-vocab-dqv-20161215/")))

    counts = Counter()
    for finding in report["findings"]:
        counts[finding["severity"]] += finding["occurrences"]
    metrics = [("conforms", "SHACL Core validation conformance", report["conforms"], XSD.boolean)]
    metrics.extend(
        (f"{severity}-count", f"SHACL {severity} occurrences", counts[severity], XSD.nonNegativeInteger)
        for severity in SEVERITIES.values()
    )
    for name, label, value, datatype in metrics:
        metric = URIRef(f"{PROFILE}:{name}")
        measurement = stable_id("dqv-shacl-measurement", str(dataset), digest, name)
        graph.add((metric, RDF.type, DQV.Metric))
        graph.add((metric, RDFS.label, Literal(label, lang="en-GB")))
        graph.add((metric, DQV.expectedDataType, datatype))
        graph.add((dataset, DQV.hasQualityMeasurement, measurement))
        graph.add((measurement, RDF.type, DQV.QualityMeasurement))
        graph.add((measurement, DQV.isMeasurementOf, metric))
        graph.add((measurement, DQV.computedOn, dataset))
        graph.add((measurement, DQV.value, Literal(value, datatype=datatype)))
        graph.add((measurement, PROV.wasDerivedFrom, source_report))
        graph.add((measurement, PROV.wasGeneratedBy, activity))

    severities = {value: key for key, value in SEVERITIES.items()}
    for finding in report["findings"]:
        body = URIRef(f"urn:okf:shacl-finding:sha256:{finding['id']}")
        annotation = stable_id("dqv-shacl-annotation", str(dataset), digest, finding["id"])
        graph.add((dataset, DQV.hasQualityAnnotation, annotation))
        graph.add((annotation, RDF.type, DQV.QualityAnnotation))
        graph.add((annotation, OA.motivatedBy, DQV.qualityAssessment))
        graph.add((annotation, OA.hasTarget, dataset))
        graph.add((annotation, OA.hasBody, body))
        graph.add((annotation, PROV.wasDerivedFrom, source_report))
        graph.add((annotation, PROV.wasGeneratedBy, activity))
        graph.add((body, RDF.type, SH.ValidationResult))
        graph.add((body, SH.focusNode, URIRef(finding["focus"])))
        graph.add((body, SH.resultSeverity, severities[finding["severity"]]))
        graph.add((body, SH.sourceShape, URIRef(finding["shape"])))
        graph.add((body, SH.sourceConstraintComponent, URIRef(finding["constraint"])))
        if finding["path"] is not None:
            graph.add((body, SH.resultPath, URIRef(finding["path"])))

    return ("\n".join(sorted(graph.serialize(format="nt").splitlines())) + "\n").encode("utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--bundle", required=True)
    parser.add_argument("--report-url", help="Published location of the exact input report")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    with args.report.open("rb") as stream:
        content = export_dqv(stream.read(MAX_REPORT_BYTES + 1), args.bundle, report_url=args.report_url)
    with args.output.open("xb") as stream:
        stream.write(content)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
