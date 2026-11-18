"""Export the identity-bound Site assembly as a deterministic PROV-O graph."""

from __future__ import annotations

import argparse
from hashlib import sha256
import json
from pathlib import Path
import re

from rdflib import Graph, PROV, RDF, URIRef


REPOSITORY = "https://github.com/chris-page-gov/okf-explorer"
DIGEST = re.compile(r"[0-9a-f]{64}")


def artifact(digest: str) -> URIRef:
    if not isinstance(digest, str) or not DIGEST.fullmatch(digest):
        raise ValueError("Invalid SHA-256 in candidate evidence")
    return URIRef(f"urn:okf:sha256:{digest}")


def export_site_provenance(receipt_bytes: bytes, identity_bytes: bytes) -> bytes:
    receipt = json.loads(receipt_bytes)
    identity = json.loads(identity_bytes)
    if (
        receipt.get("schema") != "okf-site-candidate-receipt.v1"
        or identity.get("schema") != "okf-publication-deployment-identity.v1"
    ):
        raise ValueError("Unsupported candidate evidence schema")
    binding = receipt["publication_identity"]
    commit = binding["commit"]
    if (
        not isinstance(commit, str)
        or not re.fullmatch(r"[0-9a-f]{40}", commit)
        or identity["commit"] != commit
        or identity["repository"]["url"] != REPOSITORY
    ):
        raise ValueError("Candidate repository or commit identity does not match")
    if (
        binding["path"] != "okf-publication-identity.json"
        or binding["bytes"] != len(identity_bytes)
        or binding["sha256"] != sha256(identity_bytes).hexdigest()
    ):
        raise ValueError("Candidate receipt does not bind these publication identity bytes")
    contracts = [item for item in identity["materials"] if item["path"] == "okf.publication.json"]
    if len(contracts) != 1:
        raise ValueError("Expected one publication contract in the identity")

    activity = URIRef(f"urn:okf:site-assembly:{sha256(receipt_bytes).hexdigest()}")
    builder = URIRef(f"{REPOSITORY}/blob/{commit}/scripts/build_site.py")
    source = URIRef(f"{REPOSITORY}/commit/{commit}")
    configuration = artifact(contracts[0]["sha256"])
    app = artifact(receipt["explorer"]["manifest_sha256"])
    site = artifact(receipt["site"]["tree_sha256"])
    site_identity = artifact(binding["sha256"])

    graph = Graph()
    graph.add((activity, RDF.type, PROV.Activity))
    graph.add((builder, RDF.type, PROV.SoftwareAgent))
    graph.add((activity, PROV.wasAssociatedWith, builder))
    graph.add((activity, PROV.used, source))
    graph.add((activity, PROV.used, configuration))
    graph.add((activity, PROV.used, app))
    graph.add((site, PROV.wasGeneratedBy, activity))
    graph.add((site_identity, PROV.wasGeneratedBy, activity))
    for entity in (source, configuration, app, site, site_identity):
        graph.add((entity, RDF.type, PROV.Entity))
    statements = sorted(graph.serialize(format="nt").splitlines())
    return ("\n".join(statements) + "\n").encode("utf-8")


def read_evidence(path: Path) -> bytes:
    with path.open("rb") as stream:
        result = stream.read(65_537)
    if len(result) > 65_536:
        raise ValueError(f"Candidate evidence exceeds 64 KiB: {path.name}")
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--receipt", type=Path, required=True)
    parser.add_argument("--identity", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    try:
        content = export_site_provenance(read_evidence(args.receipt), read_evidence(args.identity))
        with args.output.open("xb") as stream:
            stream.write(content)
    except (AttributeError, KeyError, OSError, TypeError, ValueError) as error:
        parser.exit(2, f"PROV-O export failed: {error}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
