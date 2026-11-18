"""Export an explicitly mapped, source-linked DCAT-AP 3.0.1 catalogue."""

from __future__ import annotations

import argparse
from hashlib import sha256
import json
from pathlib import Path
import re
from urllib.parse import parse_qsl, urlsplit

from rdflib import DCAT, DCTERMS, FOAF, Graph, Literal, PROV, RDF, SKOS, URIRef, XSD

if __package__:
    from .normalise_shacl_report import reference
else:
    from normalise_shacl_report import reference


PROFILE = URIRef("https://semiceu.github.io/DCAT-AP/releases/3.0.1/")
MAX_INPUT_BYTES = 2 * 1024 * 1024
MAX_DATASETS = 2000
MAX_DISTRIBUTIONS = 4000
PRIVATE_QUERY_KEYS = {
    "api_key", "apikey", "access_token", "token", "client_secret", "password",
    "credential", "authorization", "signature", "sig", "x-amz-signature",
}


def object_record(value: object, required: set[str], optional: set[str] | None = None) -> dict:
    if not isinstance(value, dict) or not required <= value.keys() or value.keys() - required - (optional or set()):
        raise ValueError(f"Expected fields {', '.join(sorted(required))} and the documented optional fields")
    return value


def named(value: object, *, web: bool = False) -> URIRef:
    if not isinstance(value, str) or not value or len(value) > 2048 or re.search(r'[\x00-\x20\x7f<>"{}|\\^\x60]', value):
        raise ValueError("Expected a bounded, named IRI")
    iri = reference(value)
    parts = urlsplit(iri)
    if any(key.casefold() in PRIVATE_QUERY_KEYS for key, _ in parse_qsl(parts.query)):
        raise ValueError("Resource IRI contains a credential query field")
    if web and parts.scheme not in {"http", "https"}:
        raise ValueError("Expected an HTTP or HTTPS resource URL")
    return URIRef(iri)


def label(value: object, language: str) -> Literal:
    if not isinstance(value, str) or not value.strip() or len(value) > 4000 or "\x00" in value:
        raise ValueError("Expected a non-empty catalogue label or description")
    return Literal(value, lang=language)


def entries(value: object, limit: int, *, minimum: int = 0) -> list:
    if not isinstance(value, list) or not minimum <= len(value) <= limit:
        raise ValueError(f"Expected between {minimum} and {limit} entries")
    return value


def unique_identity(value: object, seen: set[URIRef]) -> URIRef:
    identity = named(value)
    if identity in seen:
        raise ValueError(f"Duplicate catalogue, dataset or distribution IRI: {identity}")
    seen.add(identity)
    return identity


def publisher(graph: Graph, value: object, language: str) -> URIRef:
    row = object_record(value, {"id", "name"})
    identity = named(row["id"])
    graph.add((identity, RDF.type, FOAF.Agent))
    graph.add((identity, FOAF.name, label(row["name"], language)))
    return identity


def export_catalogue(raw: bytes) -> bytes:
    if not 0 < len(raw) <= MAX_INPUT_BYTES:
        raise ValueError("Catalogue input must be between 1 byte and 2 MiB")
    doc = object_record(json.loads(raw), {"schema", "language", "catalogue", "datasets"})
    if doc["schema"] != "okf-dcat-ap-input.v1":
        raise ValueError("Unsupported catalogue input schema")
    language = doc["language"]
    if not isinstance(language, str) or not re.fullmatch(r"[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*", language):
        raise ValueError("Expected a catalogue language tag")
    cat = object_record(doc["catalogue"], {"id", "title", "description", "publisher", "source_record"})
    seen: set[URIRef] = set()
    catalog = unique_identity(cat["id"], seen)
    graph = Graph()
    input_iri = URIRef(f"urn:okf:sha256:{sha256(raw).hexdigest()}")
    for triple in (
        (catalog, RDF.type, DCAT.Catalog),
        (catalog, DCTERMS.conformsTo, PROFILE),
        (catalog, DCTERMS.title, label(cat["title"], language)),
        (catalog, DCTERMS.description, label(cat["description"], language)),
        (catalog, DCTERMS.publisher, publisher(graph, cat["publisher"], language)),
        (catalog, PROV.wasDerivedFrom, named(cat["source_record"])),
        (catalog, PROV.wasDerivedFrom, input_iri),
        (input_iri, RDF.type, PROV.Entity),
    ):
        graph.add(triple)

    distribution_count = 0
    for node in entries(doc["datasets"], MAX_DATASETS, minimum=1):
        row = object_record(node, {"id", "title", "description", "source_record", "themes", "distributions"}, {"publisher", "landing_page"})
        dataset = unique_identity(row["id"], seen)
        graph.add((catalog, DCAT.dataset, dataset))
        graph.add((dataset, RDF.type, DCAT.Dataset))
        graph.add((dataset, DCTERMS.title, label(row["title"], language)))
        graph.add((dataset, DCTERMS.description, label(row["description"], language)))
        graph.add((dataset, PROV.wasDerivedFrom, named(row["source_record"])))
        if "publisher" in row:
            graph.add((dataset, DCTERMS.publisher, publisher(graph, row["publisher"], language)))
        if "landing_page" in row:
            landing_page = named(row["landing_page"], web=True)
            graph.add((dataset, DCAT.landingPage, landing_page))
            graph.add((landing_page, RDF.type, FOAF.Document))
        for theme in entries(row["themes"], 64):
            tag = object_record(theme, {"id", "label"})
            concept = named(tag["id"])
            preferred = label(tag["label"], language)
            given_labels = set(graph.objects(concept, SKOS.prefLabel))
            if given_labels and given_labels != {preferred}:
                raise ValueError("Conflicting preferred labels for the same theme")
            graph.add((dataset, DCAT.theme, concept))
            graph.add((concept, RDF.type, SKOS.Concept))
            graph.add((concept, SKOS.prefLabel, preferred))
        distributions = entries(row["distributions"], MAX_DISTRIBUTIONS - distribution_count)
        distribution_count += len(distributions)
        for node in distributions:
            item = object_record(node, {"id", "title", "access_url", "source_record"}, {"licence", "download_url", "media_type", "bytes"})
            distribution = unique_identity(item["id"], seen)
            graph.add((dataset, DCAT.distribution, distribution))
            graph.add((distribution, RDF.type, DCAT.Distribution))
            graph.add((distribution, DCTERMS.title, label(item["title"], language)))
            graph.add((distribution, PROV.wasDerivedFrom, named(item["source_record"])))
            graph.add((distribution, DCAT.accessURL, named(item["access_url"], web=True)))
            if "licence" in item:
                licence = named(item["licence"])
                graph.add((distribution, DCTERMS.license, licence))
                graph.add((licence, RDF.type, DCTERMS.LicenseDocument))
            if "download_url" in item:
                graph.add((distribution, DCAT.downloadURL, named(item["download_url"], web=True)))
            if "media_type" in item:
                media_type = named(item["media_type"], web=True)
                graph.add((distribution, DCAT.mediaType, media_type))
                graph.add((media_type, RDF.type, DCTERMS.MediaType))
            if "bytes" in item:
                size = item["bytes"]
                if type(size) is not int or not 0 <= size <= (2**53 - 1):
                    raise ValueError("Distribution size must be a bounded non-negative integer")
                graph.add((distribution, DCAT.byteSize, Literal(size, datatype=XSD.nonNegativeInteger)))
    return ("\n".join(sorted(graph.serialize(format="nt").splitlines())) + "\n").encode("utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    try:
        with args.input.open("rb") as stream:
            triples = export_catalogue(stream.read(MAX_INPUT_BYTES + 1))
        with args.output.open("xb") as stream:
            stream.write(triples)
    except (OSError, ValueError) as error:
        parser.exit(2, f"Catalogue export failed: {error}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
